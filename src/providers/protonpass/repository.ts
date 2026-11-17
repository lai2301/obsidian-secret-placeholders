/**
 * Repository over pass-cli: the boundary between the provider and Proton
 * Pass. Each operation runs pass-cli commands and returns domain values, so
 * nothing outside this file builds argv or parses pass-cli output.
 *
 * Options that carry a value use the `--name=value` form so a value starting
 * with "-" can't be read as a flag.
 */

import { ProtonPassError } from "./errors";
import { itemTitles, parseJson, vaultNames } from "./json";
import { DEFAULT_FIELD, type PassReferenceParts, toPassReference } from "./references";

/**
 * Run pass-cli with `args`, capping its output at `maxBuffer` bytes, and
 * resolve to its stdout.
 *
 * @throws {ProtonPassError} On any failure.
 */
export type PassCliRunner = (args: readonly string[], maxBuffer: number) => Promise<string>;

/** Output cap for commands that print one field, such as `item view`. */
const VIEW_MAX_BUFFER = 64 * 1024;
/** Output cap for listings, which print whole items as JSON. */
const LIST_MAX_BUFFER = 8 * 1024 * 1024;

/**
 * True if `vault` can't be passed to `item list`, which takes the vault as a
 * positional argument. A name starting with "-" would be read as a flag.
 */
const isUnlistableVault = (vault: string): boolean => vault.startsWith("-");

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
 * The Proton Pass operations the provider uses, each running pass-cli
 * through `run`. Item listing, note creation and field updates stay
 * internal, as steps of these.
 */
export const createRepository = (run: PassCliRunner) => {
  /** Read one secret field by its `pass://` reference. */
  const readSecret = async (passReference: string): Promise<string> => {
    const stdout = await run(["item", "view", passReference], VIEW_MAX_BUFFER);
    // Strip exactly one trailing newline, because secrets may end in spaces.
    return stdout.replace(/\r?\n$/, "");
  };

  /** Names of every vault the session can see. */
  const listVaultNames = async (): Promise<string[]> => {
    const stdout = await run(["vault", "list", "--output", "json"], LIST_MAX_BUFFER);
    return vaultNames(parseJson(stdout));
  };

  /**
   * Titles of the active (not trashed) items in `vault`. An unlistable vault
   * (see {@link isUnlistableVault}) lists nothing.
   */
  const listItemTitles = async (vault: string): Promise<string[]> => {
    if (isUnlistableVault(vault)) return [];

    const stdout = await run(["item", "list", vault, "--output", "json"], LIST_MAX_BUFFER);
    return itemTitles(parseJson(stdout));
  };

  /**
   * Reference parts for the active items in `vaults`, or in every vault the
   * session can see when `vaults` is omitted. A vault that doesn't exist is
   * skipped, and items that can't form a valid `pass://` reference are
   * dropped. Any other failure, such as a missing session, rejects the whole
   * listing so it isn't mistaken for an empty one.
   */
  const listItemReferences = async (vaults?: readonly string[]): Promise<PassReferenceParts[]> => {
    const targets = vaults ?? (await listVaultNames());
    const partsByVault = await Promise.all(
      targets.map(async (vault) => {
        const titles = await listItemTitles(vault).catch((e: unknown): string[] => {
          if (e instanceof ProtonPassError && e.kind === "not-found") {
            return [];
          } else {
            throw e;
          }
        });
        // The user can edit the placeholder to point at another field.
        return titles.map((item) => ({ vault, item, field: DEFAULT_FIELD }));
      }),
    );
    return partsByVault.flat().filter((parts) => toPassReference(parts) !== null);
  };

  /** Create an empty note item titled `title` in `vault`, and resolve to its share ID. */
  const createEmptyNote = async (vault: string, title: string): Promise<string> => {
    const stdout = await run(
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
  const updateField = async ({ vault, item, field }: PassReferenceParts, value: string): Promise<void> => {
    if (field.includes("=")) {
      throw new ProtonPassError({ kind: "equals-in-field", field });
    }

    await run(
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
   * An existing item is updated under its stored title, so a reference typed
   * in another case updates it rather than creating a duplicate. The titles
   * come straight from pass-cli, never a cache, so a stale listing can't turn
   * an update into a duplicate item either. An unlistable vault (see
   * {@link isUnlistableVault}) is refused rather than getting a new note on
   * every save.
   */
  const upsertField = async (parts: PassReferenceParts, value: string): Promise<void> => {
    if (isUnlistableVault(parts.vault)) {
      throw new ProtonPassError({ kind: "dash-vault", vault: parts.vault });
    }

    const existing = findTitle(await listItemTitles(parts.vault), parts.item);
    if (existing === undefined) {
      await createEmptyNote(parts.vault, parts.item);
      await updateField(parts, value);
    } else {
      await updateField({ ...parts, item: existing }, value);
    }
  };

  /** End the pass-cli session. */
  const logout = async (): Promise<void> => {
    await run(["logout"], VIEW_MAX_BUFFER);
  };

  return { readSecret, listVaultNames, listItemReferences, upsertField, logout } as const;
};
