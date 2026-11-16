// Runs the pass-cli binary and turns its failures into ProtonPassErrors.
// Desktop only: spawning a process needs Node's child_process.

import { Platform } from "obsidian";

import { t } from "../../i18n";
import { ProtonPassError } from "./errors";

const TIMEOUT_MS = 10_000;

// Derived from recorded pass-cli 2.7 stderr. Don't guess these.
const AUTH_PATTERNS = [/requires an authenticated client/, /there is no session/];
const NOT_FOUND_PATTERNS = [
  /Could not find vault /,
  /Could not find item /,
  /Field does not exist: /,
];

// The promisified execFile rejects with the usual exec error plus the
// process output.
type ExecFailure = import("child_process").ExecFileException & { stderr?: string };

// Node interop is desktop-only and reached through Electron's require().
// Built-ins are external to the bundle, so a static import would be loaded
// at plugin start and break on mobile; only the types are imported.
const requireNode = <T>(id: string): T => {
  const req = (window as unknown as { require: (id: string) => unknown })
    .require;
  return req(id) as T;
};

const loadExecFile = () => {
  const { execFile } = requireNode<typeof import("child_process")>("child_process");
  const { promisify } = requireNode<typeof import("util")>("util");
  return promisify(execFile);
};

// pass-cli colours its log lines; strip ANSI escapes before showing them.
// eslint-disable-next-line no-control-regex -- matching ESC is the point
const ANSI_RE = /\u001b\[[0-9;]*m/g;

/** Tidy one stderr line for display: drop the "Error:" or numbered-cause
 *  ("1:") prefix and cap the length. */
const cleanLine = (line: string): string => {
  return line.trim().replace(/^(Error:|\d+:)\s*/, "").slice(0, 200);
};

const matchesAny = (patterns: RegExp[], s: string): boolean => {
  return patterns.some((p) => p.test(s));
};

const classifyStderr = (stderr: string): ProtonPassError => {
  const lines = stderr
    .replace(ANSI_RE, "")
    .split(/\r?\n/)
    .filter((l) => l.trim() !== "");

  if (matchesAny(AUTH_PATTERNS, stderr)) {
    return new ProtonPassError("not-logged-in", t("provider.protonpass.notLoggedIn"));
  } else if (matchesAny(NOT_FOUND_PATTERNS, stderr)) {
    // The useful line ("Could not find item ...") is the last cause, not
    // the first line.
    const cause = [...lines].reverse().find((l) => matchesAny(NOT_FOUND_PATTERNS, l)) ?? "";
    return new ProtonPassError("not-found", cleanLine(cause));
  } else {
    // pass-cli may log timestamped lines before its "Error: ..." summary.
    const summary = lines.find((l) => l.startsWith("Error:")) ?? lines[0] ?? "";
    return new ProtonPassError("unknown", cleanLine(summary) || "pass-cli failed");
  }
};

/** Map a failed execFile call to a ProtonPassError.  Never reads stdout. */
const classifyExecError = (err: unknown, bin: string): ProtonPassError => {
  if (!(err instanceof Error)) return new ProtonPassError("unknown", String(err));

  const e = err as ExecFailure;
  if (e.code === "ENOENT" || e.code === "EACCES") {
    return new ProtonPassError("unavailable", t("provider.protonpass.binaryNotFound", { path: bin }));
  } else if (e.killed) {
    return new ProtonPassError("unknown", "pass-cli timed out");
  } else if (typeof e.code === "number") {
    return classifyStderr(e.stderr ?? "");
  } else {
    return new ProtonPassError("unknown", String(e.code ?? e.message));
  }
};

/** Absolute path whose file name is pass-cli itself, so settings can't be
 *  pointed at an arbitrary program by accident. */
const isValidBinaryPath = (p: string): boolean => {
  if (!p || p.includes("\u0000")) return false;
  const absolute = Platform.isWin ? /^[A-Za-z]:[\\/]|^\\\\/.test(p) : p.startsWith("/");
  const name = p.split(/[\\/]/).pop() ?? "";
  const allowed = Platform.isWin ? ["pass-cli.exe", "pass-cli"] : ["pass-cli"];
  return absolute && allowed.includes(name);
};

/** Run the pass-cli at `bin` with argv and resolve to stdout.  Rejects with
 *  a ProtonPassError whose message never contains stdout. */
export const runPassCli = async (
  bin: string,
  args: string[],
  maxBuffer: number,
): Promise<string> => {
  if (!isValidBinaryPath(bin)) {
    throw new ProtonPassError("unavailable", t("provider.protonpass.invalidBinary"));
  }

  let execFile: ReturnType<typeof loadExecFile>;
  try {
    execFile = loadExecFile();
  } catch (e) {
    throw new ProtonPassError("unavailable", e instanceof Error ? e.message : String(e));
  }

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
