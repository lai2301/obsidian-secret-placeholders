/**
 * Runs the pass-cli binary and turns its failures into ProtonPassErrors.
 * Desktop only, because spawning a process needs Node's `child_process`.
 */

import { Platform } from "obsidian";

import { requireNode } from "../../node";
import { ProtonPassError, errorMessage } from "./errors";

const TIMEOUT_MS = 10_000;

/** Stderr signs of a missing session, from recorded pass-cli 2.7 output. Don't guess these. */
const AUTH_PATTERNS: readonly RegExp[] = [/requires an authenticated client/, /there is no session/];
/** Stderr signs of a missing vault, item or field, from recorded pass-cli 2.7 output. */
const NOT_FOUND_PATTERNS: readonly RegExp[] = [
  /Could not find vault /,
  /Could not find item /,
  /Field does not exist: /,
];

// Node interop is typed with local interfaces rather than @types/node (see
// src/node.ts), so the community-plugin review scanner doesn't need Node
// types to see these calls as typed.

/** What the promisified execFile rejects with: the exec error plus the process output. */
interface ExecFailure extends Error {
  code?: string | number | null;
  killed?: boolean;
  signal?: string | null;
  stderr?: string;
}

interface ExecFileOptions {
  shell: false;
  timeout: number;
  maxBuffer: number;
  windowsHide: boolean;
  encoding: "utf8";
}

/** `util.promisify(child_process.execFile)`, as called here. */
type ExecFileAsync = (
  file: string,
  args: readonly string[],
  options: ExecFileOptions,
) => Promise<{ stdout: string; stderr: string }>;

interface NodeChildProcessModule {
  execFile: unknown;
}

interface NodeUtilModule {
  promisify: (execFile: NodeChildProcessModule["execFile"]) => ExecFileAsync;
}

/**
 * Promisified `child_process.execFile`, loaded on first use.
 *
 * @throws {ProtonPassError} "node-unavailable" if Node's modules can't be loaded.
 */
const loadExecFile = (): ExecFileAsync => {
  try {
    const { execFile } = requireNode<NodeChildProcessModule>("child_process");
    const { promisify } = requireNode<NodeUtilModule>("util");
    return promisify(execFile);
  } catch (e) {
    throw new ProtonPassError({ kind: "node-unavailable", detail: errorMessage(e) });
  }
};

/** ANSI colour escapes. pass-cli colours its log lines, so strip them before showing one. */
// eslint-disable-next-line no-control-regex -- matching ESC is the point
const ANSI_RE = /\u001b\[[0-9;]*m/g;

/**
 * Tidy one stderr line for display. Drops the "Error:" or numbered-cause
 * ("1:") prefix and caps the length.
 */
const cleanLine = (line: string): string =>
  line.trim().replace(/^(Error:|\d+:)\s*/, "").slice(0, 200);

const matchesAny = (patterns: readonly RegExp[], s: string): boolean =>
  patterns.some((p) => p.test(s));

/** Map a non-zero pass-cli exit to a ProtonPassError using its stderr. */
const classifyStderr = (stderr: string): ProtonPassError => {
  const lines = stderr
    .replace(ANSI_RE, "")
    .split(/\r?\n/)
    .filter((l) => l.trim() !== "");

  if (matchesAny(AUTH_PATTERNS, stderr)) {
    return new ProtonPassError({ kind: "not-logged-in" });
  } else if (matchesAny(NOT_FOUND_PATTERNS, stderr)) {
    // The useful line ("Could not find item ...") is the last cause, not
    // the first line.
    const cause = [...lines].reverse().find((l) => matchesAny(NOT_FOUND_PATTERNS, l)) ?? "";
    return new ProtonPassError({ kind: "not-found", detail: cleanLine(cause) });
  } else {
    // pass-cli may log timestamped lines before its "Error: ..." summary.
    const summary = cleanLine(lines.find((l) => l.startsWith("Error:")) ?? lines[0] ?? "");
    if (summary) {
      return new ProtonPassError({ kind: "cli-error", detail: summary });
    } else {
      return new ProtonPassError({ kind: "failed" });
    }
  }
};

/**
 * Map a failed execFile call to a ProtonPassError. Never reads stdout or the
 * error's message, which repeats argv and so can hold a value being saved.
 */
const classifyExecError = (err: unknown, bin: string): ProtonPassError => {
  if (!(err instanceof Error)) return new ProtonPassError({ kind: "cli-error", detail: String(err) });

  const e = err as ExecFailure;
  if (e.code === "ENOENT" || e.code === "EACCES") {
    return new ProtonPassError({ kind: "binary-not-found", path: bin });
  } else if (e.killed) {
    return new ProtonPassError({ kind: "timed-out" });
  } else if (typeof e.code === "number") {
    return classifyStderr(e.stderr ?? "");
  } else {
    const reason = e.code ?? e.signal;
    return new ProtonPassError({ kind: "failed", reason: reason == null ? undefined : String(reason) });
  }
};

/**
 * Accept only an absolute path whose file name is pass-cli itself, so
 * settings can't point at an arbitrary program by accident.
 */
const isValidBinaryPath = (p: string): boolean => {
  if (!p || p.includes("\u0000")) return false;
  const absolute = Platform.isWin ? /^[A-Za-z]:[\\/]|^\\\\/.test(p) : p.startsWith("/");
  const name = p.split(/[\\/]/).pop() ?? "";
  const allowed = Platform.isWin ? ["pass-cli.exe", "pass-cli"] : ["pass-cli"];
  return absolute && allowed.includes(name);
};

/**
 * Run the pass-cli at `bin` with `args` and resolve to its stdout.
 *
 * @throws {ProtonPassError} On any failure. The message never contains stdout.
 */
export const runPassCli = async (
  bin: string,
  args: string[],
  maxBuffer: number,
): Promise<string> => {
  if (!isValidBinaryPath(bin)) {
    throw new ProtonPassError({ kind: "invalid-binary" });
  }

  const execFile = loadExecFile();
  try {
    const { stdout } = await execFile(bin, args, {
      shell: false,
      timeout: TIMEOUT_MS,
      maxBuffer,
      windowsHide: true,
      encoding: "utf8",
    });
    return stdout;
  } catch (err) {
    throw classifyExecError(err, bin);
  }
};
