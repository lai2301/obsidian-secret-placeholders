// Runs the pass-cli binary and turns its failures into ProtonPassErrors.
// Desktop only: spawning a process needs Node's child_process.

import { Platform } from "obsidian";

import { t } from "../../i18n";

const TIMEOUT_MS = 10_000;

// Derived from recorded pass-cli 2.7 stderr. Don't guess these.
const AUTH_PATTERNS = [/requires an authenticated client/, /there is no session/];
const NOT_FOUND_PATTERNS = [
  /Could not find vault /,
  /Could not find item /,
  /Field does not exist: /,
];

interface ExecError extends Error {
  code?: string | number;
  killed?: boolean;
}

interface NodeChildProcess {
  execFile(
    file: string,
    args: string[],
    options: {
      shell: false;
      timeout: number;
      maxBuffer: number;
      windowsHide: boolean;
      encoding: "utf8";
    },
    callback: (err: ExecError | null, stdout: string, stderr: string) => void,
  ): void;
}

// Node interop is desktop-only and reached through Electron's require().
const requireNode = <T>(id: string): T => {
  const req = (window as unknown as { require: (id: string) => unknown })
    .require;
  return req(id) as T;
};

type FailureKind = "unavailable" | "not-logged-in" | "not-found" | "unknown";

export class ProtonPassError extends Error {
  override readonly name = "ProtonPassError";

  constructor(
    readonly kind: FailureKind,
    message: string,
  ) {
    super(message);
  }
}

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

/** Run the pass-cli at `bin` with argv and resolve to stdout.  Rejects with
 *  a ProtonPassError whose message never contains stdout. */
export const runPassCli = (
  bin: string,
  args: string[],
  maxBuffer: number,
): Promise<string> => {
  if (!isValidBinaryPath(bin)) {
    return Promise.reject(
      new ProtonPassError("unavailable", t("provider.protonpass.invalidBinary")),
    );
  }
  return new Promise((resolve, reject) => {
    try {
      const cp = requireNode<NodeChildProcess>("child_process");
      cp.execFile(
        bin,
        args,
        {
          shell: false,
          timeout: TIMEOUT_MS,
          maxBuffer,
          windowsHide: true,
          encoding: "utf8",
        },
        (err, stdout, stderr) => {
          if (!err) {
            resolve(stdout);
          } else if (err.code === "ENOENT" || err.code === "EACCES") {
            reject(
              new ProtonPassError("unavailable", t("provider.protonpass.binaryNotFound", { path: bin })),
            );
          } else if (err.killed) {
            reject(new ProtonPassError("unknown", "pass-cli timed out"));
          } else if (typeof err.code === "number") {
            reject(classifyStderr(stderr));
          } else {
            reject(new ProtonPassError("unknown", String(err.code ?? err.message)));
          }
        },
      );
    } catch (e) {
      reject(new ProtonPassError("unavailable", e instanceof Error ? e.message : String(e)));
    }
  });
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
