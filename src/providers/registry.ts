// Registry of enabled providers. Owns the combined regex used by the
// post-processor and live-preview decoration so they don't need to know
// which providers exist.

import { Provider, ProviderRef } from "./types";

export class ProviderRegistry {
  private providers = new Map<string, Provider>();

  register(p: Provider): void {
    if (this.providers.has(p.id)) {
      throw new Error(`provider '${p.id}' already registered`);
    }
    this.providers.set(p.id, p);
  }

  unregister(id: string): void {
    this.providers.delete(id);
  }

  get(id: string): Provider | undefined {
    return this.providers.get(id);
  }

  all(): Provider[] {
    return [...this.providers.values()];
  }

  /** Default provider used when commands don't specify one. First-registered
   *  wins; can be overridden by plugin settings later. */
  defaultProvider(): Provider | undefined {
    return this.providers.values().next().value;
  }

  /** Combined regex matching any registered provider's placeholder. Each
   *  call returns a fresh RegExp so callers can use `.lastIndex` safely. */
  combinedRegex(): RegExp {
    if (this.providers.size === 0) {
      // No providers registered - returns a regex that never matches.
      return /^\b$/g;
    }
    const sources = [...this.providers.values()].map(
      (p) => `(?:${p.placeholderRegex.source})`,
    );
    return new RegExp(sources.join("|"), "g");
  }

  /** Parse a single `{{...}}` blob by trying each registered provider. */
  parseRef(
    raw: string,
  ): { provider: Provider; ref: ProviderRef } | null {
    for (const p of this.providers.values()) {
      const ref = p.parseRef(raw);
      if (ref) return { provider: p, ref };
    }
    return null;
  }

  /** Resolve a ref to its value through the right provider. */
  async resolve(ref: ProviderRef): Promise<string> {
    const p = this.providers.get(ref.provider);
    if (!p) throw new Error(`unknown provider '${ref.provider}'`);
    return p.readKey(ref);
  }

  clearAllCaches(): void {
    for (const p of this.providers.values()) p.clearCache();
  }
}
