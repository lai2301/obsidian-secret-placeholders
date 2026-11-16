/** Persisted Proton Pass provider settings and their defaults. */

import { Platform } from "obsidian";

export type ProtonPassSettings = Readonly<{
  /**
   * Absolute path to the pass-cli binary. Obsidian launched from the dock
   * does not inherit the shell PATH, so a bare name won't resolve.
   */
  binaryPath: string;
  /** Vault used for new placeholders and to limit listings. Empty means all vaults. */
  defaultVault: string;
  /** How long pass-cli results stay cached, in seconds. */
  cacheTtlSec: number;
}>;

/** Where pass-cli installs by default on the current platform. */
export const defaultBinaryPath = (): string => {
  if (Platform.isWin) {
    return "C:\\Program Files\\Proton\\Pass CLI\\pass-cli.exe";
  } else if (Platform.isMacOS) {
    return "/opt/homebrew/bin/pass-cli";
  } else {
    return "/usr/local/bin/pass-cli";
  }
};

export const DEFAULTS = {
  binaryPath: "",
  defaultVault: "",
  cacheTtlSec: 300,
} as const satisfies ProtonPassSettings;
