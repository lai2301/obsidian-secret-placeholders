/**
 * Repository over pass-cli: the boundary between the provider and Proton
 * Pass. Each function runs pass-cli commands and returns domain values, so
 * nothing outside this file builds argv or parses pass-cli output.
 *
 * Options that carry a value use the `--name=value` form so a value starting
 * with "-" can't be read as a flag.
 */

import { t } from "../../i18n";
import { runPassCli } from "./cli";
import { ProtonPassError } from "./errors";
import { itemTitles, parseJson, vaultNames } from "./json";
import { PassReferenceParts, toPassReference } from "./references";

/** Output cap for commands that print one field, such as `item view`. */
const VIEW_MAX_BUFFER = 64 * 1024;
/** Output cap for listings, which print whole items as JSON. */
const LIST_MAX_BUFFER = 8 * 1024 * 1024;

/** Read one secret field by its `pass://` reference. */
export const readSecret = async (bin: string, passReference: string): Promise<string> => {
  const stdout = await runPassCli(bin, ["item", "view", passReference], VIEW_MAX_BUFFER);
  // Strip exactly one trailing newline, because secrets may end in spaces.
  return stdout.replace(/\r?\n$/, "");
};

/** Names of every vault the session can see. */
export const listVaultNames = async (bin: string): Promise<string[]> => {
  const stdout = await runPassCli(bin, ["vault", "list", "--output", "json"], LIST_MAX_BUFFER);
  return vaultNames(parseJson(stdout));
};

/**
 * True if `vault` can't be passed to `item list`, which takes the vault as a
 * positional argument. A name starting with "-" would be read as a flag.
 */
const isUnlistableVault = (vault: string): boolean => vault.startsWith("-");

/**
 * Titles of the active (not trashed) items in `vault`. An unlistable vault
 * (see {@link isUnlistableVault}) lists nothing.
 */
export const listItemTitles = async (bin: string, vault: string): Promise<string[]> => {
  if (isUnlistableVault(vault)) return [];

  const stdout = await runPassCli(bin, ["item", "list", vault, "--output", "json"], LIST_MAX_BUFFER);
  return itemTitles(parseJson(stdout));
};

/**
 * Reference parts for the active items in `vaults`, or in every vault the
 * session can see when `vaults` is omitted. A vault whose items fail to load
 * is skipped, and items that can't form a valid `pass://` reference are
 * dropped.
 */
export const listItemReferences = async (
  bin: string,
  vaults?: readonly string[],
): Promise<PassReferenceParts[]> => {
  const targets = vaults ?? (await listVaultNames(bin));
  const partsByVault = await Promise.all(
    targets.map(async (vault) => {
      const titles = await listItemTitles(bin, vault).catch((): string[] => []);
      // Listing doesn't say which fields an item has without fetching each
      // one, so offer the conventional "password" field. The user can edit
      // the placeholder to point elsewhere.
      return titles.map((item) => ({ vault, item, field: "password" }));
    }),
  );
  return partsByVault.flat().filter((parts) => toPassReference(parts) !== null);
};

/** Create an empty note item titled `title` in `vault`, and resolve to its share ID. */
export const createEmptyNote = async (bin: string, vault: string, title: string): Promise<string> => {
  const stdout = await runPassCli(
    bin,
    ["item", "create", "note", `--vault-name=${vault}`, `--title=${title}`, "--note="],
    VIEW_MAX_BUFFER,
  );
  return stdout.trim();
};

/**
 * Set `field` on the item titled `item` in `vault` to `value`, adding the
 * field if the item doesn't have it. A field created this way is hidden, as
 * a secret should be. An existing field keeps its type.
 *
 * pass-cli takes the pair as `field_name=field_value`, so a field name
 * containing "=" can't be expressed and is rejected.
 */
export const updateField = async (
  bin: string,
  { vault, item, field }: PassReferenceParts,
  value: string,
): Promise<void> => {
  if (field.includes("=")) {
    throw new ProtonPassError("unknown", t("provider.protonpass.equalsInField", { field }));
  }

  await runPassCli(
    bin,
    [
      "item",
      "update",
      `--vault-name=${vault}`,
      `--item-title=${item}`,
      `--field=${field}=${value}`,
      "--field-type=hidden",
    ],
    VIEW_MAX_BUFFER,
  );
};

/**
 * The title in `titles` that `item` refers to. References match titles
 * case-insensitively, like the other providers, but an exact match wins so
 * titles differing only in case stay reachable.
 */
const findTitle = (titles: readonly string[], item: string): string | undefined => {
  const folded = item.toLowerCase();
  return titles.find((title) => title === item) ?? titles.find((title) => title.toLowerCase() === folded);
};

/**
 * Set `field` on the item titled `item` in `vault` to `value`, first creating
 * the item as an empty note if `vault` has no item with that title.
 *
 * An existing item is updated under its stored title, so a reference typed
 * in another case updates it rather than creating a duplicate. The titles
 * come straight from pass-cli, never a cache, so a stale listing can't turn
 * an update into a duplicate item either. An unlistable vault (see
 * {@link isUnlistableVault}) is refused rather than getting a new note on
 * every save.
 */
export const upsertField = async (
  bin: string,
  parts: PassReferenceParts,
  value: string,
): Promise<void> => {
  if (isUnlistableVault(parts.vault)) {
    throw new ProtonPassError("unknown", t("provider.protonpass.dashVault", { vault: parts.vault }));
  }

  const existing = findTitle(await listItemTitles(bin, parts.vault), parts.item);
  if (existing === undefined) {
    await createEmptyNote(bin, parts.vault, parts.item);
    await updateField(bin, parts, value);
  } else {
    await updateField(bin, { ...parts, item: existing }, value);
  }
};

/** End the pass-cli session. */
export const logout = async (bin: string): Promise<void> => {
  await runPassCli(bin, ["logout"], VIEW_MAX_BUFFER);
};
