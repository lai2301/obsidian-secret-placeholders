/** Time-limited cache for Proton Pass lookups. */

type Entry<Value> = { readonly expires: number; readonly value: Promise<Value> };

/** Entries for `Values`, each key holding an entry of that key's value type. */
type Entries<Values> = { [Key in keyof Values]?: Entry<Values[Key]> };

/**
 * In-flight and settled lookups by key. Storing promises lets concurrent
 * reads of one key share a single pass-cli call. Failures are dropped once
 * they settle.
 *
 * @typeParam Values - Maps each key to the type of value it holds, so a
 *   lookup's result type follows from its key.
 * @param ttlMs - Reads the time-to-live in milliseconds each time an entry is
 *   stored, so a settings change applies to the next lookup.
 */
export const createCache = <Values extends object>(ttlMs: () => number) => {
  // A null prototype keeps inherited names like "constructor" out of lookups.
  const empty = (): Entries<Values> => Object.create(null);
  let entries = empty();

  /**
   * Return the cached result for `key`, or start `load` and cache it.
   * A rejected promise is evicted so a retry asks again, so `load` should
   * include any parsing that can fail.
   */
  const getOrLoad = <Key extends keyof Values>(
    key: Key,
    load: () => Promise<Values[Key]>,
  ): Promise<Values[Key]> => {
    const now = Date.now();
    const hit = entries[key];

    if (hit && hit.expires > now) {
      return hit.value;
    } else {
      const value = load();
      const entry = { expires: now + ttlMs(), value };

      entries[key] = entry;
      value.catch(() => {
        if (entries[key] === entry) {
          delete entries[key];
        }
      });
      return value;
    }
  };

  /** Drop the entry for `key`, if any. */
  const evict = (key: keyof Values): void => {
    delete entries[key];
  };

  /** Drop every entry. */
  const clear = (): void => {
    entries = empty();
  };

  return { getOrLoad, evict, clear } as const;
};
