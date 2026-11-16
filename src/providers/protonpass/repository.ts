/**
 * Repository over pass-cli: the boundary between the provider and Proton
 * Pass. Each function runs one pass-cli command and returns domain values,
 * so nothing outside this file builds argv or parses pass-cli output.
 */

import { runPassCli } from "./cli";
import { itemTitles, parseJson, vaultNames } from "./json";

/** Output cap for commands that print one field, such as `item view`. */
const VIEW_MAX_BUFFER = 64 * 1024;
/** Output cap for listings, which print whole items as JSON. */
const LIST_MAX_BUFFER = 8 * 1024 * 1024;

/** Read one secret field by its `pass://` reference. */
export const readSecret = async (bin: string, passRef: string): Promise<string> => {
  const stdout = await runPassCli(bin, ["item", "view", passRef], VIEW_MAX_BUFFER);
  // Strip exactly one trailing newline, because secrets may end in spaces.
  return stdout.replace(/\r?\n$/, "");
};

/** Names of every vault the session can see. */
export const listVaultNames = async (bin: string): Promise<string[]> => {
  const stdout = await runPassCli(bin, ["vault", "list", "--output", "json"], LIST_MAX_BUFFER);
  return vaultNames(parseJson(stdout));
};

/**
 * Titles of the active (not trashed) items in `vault`. A vault name starting
 * with "-" would be read as a flag by pass-cli, so it lists nothing.
 */
export const listItemTitles = async (bin: string, vault: string): Promise<string[]> => {
  if (vault.startsWith("-")) return [];

  const stdout = await runPassCli(bin, ["item", "list", vault, "--output", "json"], LIST_MAX_BUFFER);
  return itemTitles(parseJson(stdout));
};

/** End the pass-cli session. */
export const logout = async (bin: string): Promise<void> => {
  await runPassCli(bin, ["logout"], VIEW_MAX_BUFFER);
};
