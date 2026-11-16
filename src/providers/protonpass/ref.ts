// Placeholder grammar: {{pass:<vault>/<item>/<field>}} and its mapping onto
// pass-cli's pass://<vault>/<item>/<field> secret references.

// {{pass:<vault>/<item>/<field>}}
// `/` separates segments, so it can't appear inside one; `{` and `}` are
// forbidden so the closing braces still terminate.
export const PLACEHOLDER_RE = /\{\{pass:([^/{}]+)\/([^/{}]+)\/([^/{}]+)\}\}/g;

const hasControlChars = (s: string): boolean => {
  return Array.from(s).some((ch) => {
    const c = ch.charCodeAt(0);
    return c < 0x20 || c === 0x7f;
  });
};

/** A pass:// reference is safe to hand to pass-cli when every segment is
 *  nonempty and free of control characters. Segments also can't hold
 *  `/`, `{` or `}`, matching PLACEHOLDER_RE, so a ref built here always
 *  round-trips through formatRef and parseRef. 
 **/
export const toPassRef = (parts: Record<string, string>): string | null => {
  const segments = [parts.vault, parts.item, parts.field];
  if (segments.some((s) => !s || /[/{}]/.test(s) || hasControlChars(s))) {
    return null;
  }

  return `pass://${segments.join("/")}`;
};
