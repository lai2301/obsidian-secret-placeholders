// Node interop is desktop-only and reached through Electron's require(). We
// type require() as returning `unknown` and describe only the narrow surface
// each caller uses, so these casts stay sound without depending on
// @types/node resolution. Built-ins are external to the bundle, so a static
// import would load at plugin start and break on mobile.
export function requireNode<T>(id: string): T {
  const req = (window as unknown as { require: (id: string) => unknown })
    .require;
  return req(id) as T;
}

/** Turn free text (e.g. a note's basename) into a short lowercase slug for
 *  suggested secret names. */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
