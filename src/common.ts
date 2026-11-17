/**
 * Load the Node built-in `id` through Electron's `require()`.
 *
 * Node interop is desktop only. Built-ins are external to the bundle, so a
 * static import would load at plugin start and break on mobile.
 *
 * @typeParam T - The narrow surface of the module the caller uses. Typing
 *   `require()` as returning `unknown` and casting to `T` keeps the call sound
 *   without depending on `@types/node`.
 */
export function requireNode<T>(id: string): T {
  const req = (window as unknown as { require: (id: string) => unknown })
    .require;
  return req(id) as T;
}

/**
 * Turn free text, such as a note's basename, into a lowercase slug of at most
 * 60 characters for suggested secret names.
 */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
