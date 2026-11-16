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
import { PassRefParts } from "./ref";

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
  { vault, item, field }: PassRefParts,
  value: string,
): Promise<void> => {
  if (field.includes("=")) {
    throw new ProtonPassError("unknown", `Field names can't contain "=": ${field}`);
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
 * Set `field` on the item titled `item` in `vault` to `value`, first creating
 * the item as an empty note if `vault` has no item with that title.
 *
 * The titles come straight from pass-cli, never a cache, so a stale listing
 * can't turn an update into a duplicate item. A vault starting with "-"
 * can't be listed (see {@link listItemTitles}), so writing to it is refused
 * rather than creating a new note on every save.
 */
export const upsertField = async (
  bin: string,
  parts: PassRefParts,
  value: string,
): Promise<void> => {
  if (parts.vault.startsWith("-")) {
    throw new ProtonPassError("unknown", t("provider.protonpass.dashVault", { vault: parts.vault }));
  }

  const titles = await listItemTitles(bin, parts.vault);
  if (!titles.includes(parts.item)) {
    await createEmptyNote(bin, parts.vault, parts.item);
  }

  await updateField(bin, parts, value);
};

/** End the pass-cli session. */
export const logout = async (bin: string): Promise<void> => {
  await runPassCli(bin, ["logout"], VIEW_MAX_BUFFER);
};
