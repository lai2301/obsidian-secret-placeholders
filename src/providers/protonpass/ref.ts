// Placeholder grammar: {{pass:<vault>/<item>/<field>}} and its mapping onto
// pass-cli's pass://<vault>/<item>/<field> secret URI references.

/** Placeholder prefix inside `{{...}}`. Must stay free of regex
 *  metacharacters. it is spliced into PLACEHOLDER_RE as-is. */
export const PREFIX = "pass:";

export type PassRefParts = { vault: string; item: string; field: string };

// {{pass:<vault>/<item>/<field>}}
// `/` separates segments, so it can't appear inside one; `{` and `}` are
// forbidden so the closing braces still terminate.
export const PLACEHOLDER_RE = new RegExp(
  String.raw`\{\{${PREFIX}(?<vault>[^/{}]+)/(?<item>[^/{}]+)/(?<field>[^/{}]+)\}\}`,
  "g",
);

// Unicode "Cc": C0 controls, DEL and the C1 controls U+0080–U+009F.
const hasControlChars = (s: string): boolean => /\p{Cc}/u.test(s);

/** Read the parts out of a provider-interface ref, which only promises a
 *  string record. */
export const fromRecord = (parts: Record<string, string>): PassRefParts => ({
  vault: parts.vault ?? "",
  item: parts.item ?? "",
  field: parts.field ?? "",
});

/** A pass:// reference is safe to hand to pass-cli when every segment is
 *  nonempty and free of control characters. Segments also can't hold
 *  `/`, `{` or `}`, matching PLACEHOLDER_RE, so a ref built here always
 *  round-trips through formatPlaceholder and parsePlaceholder.
 **/
export const toPassRef = (parts: PassRefParts): string | null => {
  const segments = [parts.vault, parts.item, parts.field];
  if (segments.some((s) => !s || /[/{}]/.test(s) || hasControlChars(s))) {
    return null;
  }

  return `pass://${segments.join("/")}`;
};

export const formatPlaceholder = ({ vault, item, field }: PassRefParts): string =>
  `{{${PREFIX}${vault}/${item}/${field}}}`;

/** Parse the first placeholder in `raw`, or null if there is none or its
 *  parts can't form a valid pass:// reference. */
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
