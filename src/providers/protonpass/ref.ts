/**
 * Placeholder grammar, `{{pp:<vault>/<item>/<field>}}`, and its mapping onto
 * pass-cli's `pass://<vault>/<item>/<field>` secret URI references.
 */

/**
 * Placeholder prefix inside `{{...}}`. It must stay free of regex
 * metacharacters, because it is spliced into {@link PLACEHOLDER_RE} as-is.
 */
export const PREFIX = "pp:";

/** The three segments of a Proton Pass reference. */
export type PassRefParts = { vault: string; item: string; field: string };

/**
 * Matches `{{pp:<vault>/<item>/<field>}}`. `/` separates segments, so it
 * can't appear inside one. `{` and `}` are forbidden so the closing braces
 * still terminate the match.
 */
export const PLACEHOLDER_RE = new RegExp(
  String.raw`\{\{${PREFIX}(?<vault>[^/{}]+)/(?<item>[^/{}]+)/(?<field>[^/{}]+)\}\}`,
  "g",
);

/** True if `s` holds a Unicode "Cc" character: C0 controls, DEL or C1 controls (U+0080–U+009F). */
const hasControlChars = (s: string): boolean => /\p{Cc}/u.test(s);

/**
 * Read the parts out of a provider-interface ref, which only promises a
 * string record.
 */
export const fromRecord = (parts: Record<string, string>): PassRefParts => ({
  vault: parts.vault ?? "",
  item: parts.item ?? "",
  field: parts.field ?? "",
});

/**
 * Build the `pass://` reference for `parts`, or null if it isn't safe to
 * hand to pass-cli.
 *
 * Every segment must be nonempty and free of control characters. Segments
 * also can't hold `/`, `{` or `}`, matching {@link PLACEHOLDER_RE}, so a ref
 * built here always round-trips through {@link formatPlaceholder} and
 * {@link parsePlaceholder}.
 */
export const toPassRef = (parts: PassRefParts): string | null => {
  const segments = [parts.vault, parts.item, parts.field];
  if (segments.some((s) => !s || /[/{}]/.test(s) || hasControlChars(s))) {
    return null;
  }

  return `pass://${segments.join("/")}`;
};

/** Render `parts` as a `{{pp:...}}` placeholder. */
export const formatPlaceholder = ({ vault, item, field }: PassRefParts): string =>
  `{{${PREFIX}${vault}/${item}/${field}}}`;

/**
 * Parse the first placeholder in `raw`. Returns null if there is none or
 * its parts can't form a valid `pass://` reference.
 */
export const parsePlaceholder = (
  raw: string,
): { raw: string; parts: PassRefParts } | null => {
  const m = new RegExp(PLACEHOLDER_RE.source).exec(raw);
  if (!m?.groups) return null;

  const parts = fromRecord(m.groups);
  if (toPassRef(parts)) {
    return { raw: m[0], parts };
  } else {
    return null;
  }
};
