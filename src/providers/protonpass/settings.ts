// Persisted Proton Pass provider settings and their defaults.

import { Platform } from "obsidian";

export interface ProtonPassSettings {
  /** Absolute path to the pass-cli binary. Obsidian launched from the
   *  dock does not inherit the shell PATH, so a bare name won't resolve. */
  binaryPath: string;
  defaultVault: string;
  cacheTtlSec: number;
}

export function defaultBinaryPath(): string {
  if (Platform.isWin) return "C:\\Program Files\\Proton\\Pass CLI\\pass-cli.exe";
  if (Platform.isMacOS) return "/opt/homebrew/bin/pass-cli";
  return "/usr/local/bin/pass-cli";
}

export const DEFAULTS: ProtonPassSettings = {
  binaryPath: "",
  defaultVault: "",
  cacheTtlSec: 300,
};
