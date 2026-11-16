/**
 * Proton Pass provider. Shells out to the official `pass-cli` binary, which
 * owns the session (login happens in a terminal with `pass-cli login`).
 * Desktop only, because spawning a process needs Node's `child_process`.
 *
 * Placeholder syntax is `{{pp:<vault>/<item>#<field>}}`:
 * - It maps onto pass-cli's secret reference `pass://<vault>/<item>/<field>`.
 * - `<vault>` is the vault name, `<item>` the item title and `<field>` the
 *   field name (e.g. "password", "username", "email" or a custom field).
 *
 * Writing sets the field on the item, adding it as a hidden custom field if
 * needed. A missing item is first created as an empty note.
 *
 * Security notes:
 * - The binary path comes from plugin settings only, never note content.
 * - The process runs without a shell, so a ref is always a single argv
 *   element and spaces or shell metacharacters are inert.
 * - Errors surface stderr only, never stdout, which may hold a secret.
 * - pass-cli takes a value being saved as an argument, so other processes
 *   run by the same user can see it while the command runs.
 */

import { Notice, Setting } from "obsidian";

import { t } from "../../i18n";
import { renderAuthStatusRow } from "../../authStatusRow";
import {
  NoteContext,
  PluginContext,
  Provider,
  ProviderAuth,
  ProviderAuthStatus,
  ProviderRef,
} from "../types";
import { ProtonPassError, errorMessage } from "./errors";
import {
  PLACEHOLDER_RE,
  PassRefParts,
  PREFIX,
  formatPlaceholder,
  fromRecord,
  parsePlaceholder,
  toPassRef,
} from "./ref";
import * as repo from "./repository";
import { DEFAULTS, ProtonPassSettings, defaultBinaryPath } from "./settings";

/** Upper bound on refs returned by {@link ProtonPassProvider.list}. */
const MAX_LIST_ITEMS = 500;

const slugify = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

/**
 * The `pass://` reference for `parts`.
 *
 * @throws {ProtonPassError} "not-found" if the parts can't form a valid reference.
 */
const requirePassRef = (parts: PassRefParts): string => {
  const passRef = toPassRef(parts);
  if (!passRef) {
    throw new ProtonPassError("not-found", t("provider.protonpass.invalidRef"));
  }

  return passRef;
};

export class ProtonPassProvider implements Provider {
  readonly id = "pp";
  readonly displayName = "Proton Pass";
  readonly placeholderPrefix = PREFIX;
  readonly placeholderRegex = PLACEHOLDER_RE;

  readonly #ctx: PluginContext;
  #settings: ProtonPassSettings = { ...DEFAULTS };
  /**
   * In-flight and settled lookups keyed by command. Storing promises lets
   * concurrent reads of one ref share a single pass-cli call. Failures are
   * dropped once they settle. Each key ("view:<ref>", "vaults", "list")
   * always stores the same result type.
   */
  readonly #cache = new Map<string, { expires: number; value: Promise<unknown> }>();
  readonly #listeners = new Set<() => void>();

  readonly auth: ProviderAuth = {
    status: async (): Promise<ProviderAuthStatus> => {
      try {
        await this.#listVaults();
        return { loggedIn: true };
      } catch {
        return { loggedIn: false };
      }
    },
    /**
     * pass-cli login is interactive (browser and TOTP prompts), so it has
     * to happen in a terminal. This only rechecks the session in case the
     * user already logged in. The terminal hint is shown only for a missing
     * session. Any other failure, such as a wrong binary path, is shown as is.
     */
    login: async () => {
      this.clearCache();
      try {
        await this.#listVaults();
        new Notice(t("provider.protonpass.loggedIn"));
      } catch (e) {
        if (e instanceof ProtonPassError && e.kind === "not-logged-in") {
          new Notice(t("provider.protonpass.loginHint"), 10_000);
        } else {
          new Notice(errorMessage(e));
        }
      }
      this.#ctx.notifyAuthChanged(this.id);
      this.#notify();
    },
    logout: async () => {
      try {
        await repo.logout(this.#settings.binaryPath);
      } catch (e) {
        new Notice(errorMessage(e));
      }
      this.clearCache();
      this.#ctx.notifyAuthChanged(this.id);
      this.#notify();
    },
    onChange: (cb) => {
      this.#listeners.add(cb);
      return () => this.#listeners.delete(cb);
    },
  };

  constructor(ctx: PluginContext) {
    this.#ctx = ctx;
  }

  #notify(): void {
    for (const cb of this.#listeners) {
      try {
        cb();
      } catch {
        /* swallow */
      }
    }
  }

  async init(): Promise<void> {
    const saved = await this.#ctx.loadProviderData<ProtonPassSettings>(this.id);
    const merged = { ...DEFAULTS, ...saved };
    this.#settings = { ...merged, binaryPath: merged.binaryPath || defaultBinaryPath() };
  }

  /** Replace the settings with `patch` applied and persist them. */
  async #update(patch: Partial<ProtonPassSettings>): Promise<void> {
    this.#settings = { ...this.#settings, ...patch };
    await this.#ctx.saveProviderData(this.id, this.#settings);
  }

  parseRef(raw: string): ProviderRef | null {
    const parsed = parsePlaceholder(raw);
    return parsed ? { provider: this.id, ...parsed } : null;
  }

  formatRef(parts: Record<string, string>): string {
    return formatPlaceholder(fromRecord(parts));
  }

  /**
   * Return the cached result for `key`, or start `load` and cache it.
   * A rejected promise is evicted so a retry asks again, so `load` should
   * include any parsing that can fail.
   */
  #cached<T>(key: string, load: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const hit = this.#cache.get(key);

    if (hit && hit.expires > now) {
      return hit.value as Promise<T>;
    } else {
      const value = load();
      const entry = { expires: now + this.#settings.cacheTtlSec * 1000, value };

      this.#cache.set(key, entry);
      value.catch(() => {
        if (this.#cache.get(key) === entry) {
          this.#cache.delete(key);
        }
      });
      return value;
    }
  }

  async readKey(ref: ProviderRef): Promise<string> {
    const passRef = requirePassRef(fromRecord(ref.parts));
    return this.#cached(`view:${passRef}`, () =>
      repo.readSecret(this.#settings.binaryPath, passRef),
    );
  }

  /** Set the secret at `ref` to `value`, creating the item if needed. */
  async writeKey(ref: ProviderRef, value: string): Promise<void> {
    const parts = fromRecord(ref.parts);
    const passRef = requirePassRef(parts);
    try {
      await repo.upsertField(this.#settings.binaryPath, parts, value);
    } finally {
      // A failed upsert may still have created the item, so drop these
      // either way.
      this.#cache.delete(`view:${passRef}`);
      this.#cache.delete("list");
    }
  }

  #listVaults(): Promise<string[]> {
    return this.#cached("vaults", () => repo.listVaultNames(this.#settings.binaryPath));
  }

  async list(): Promise<ProviderRef[]> {
    const wanted = this.#settings.defaultVault.trim();
    const references = await this.#cached("list", () =>
      repo.listItemReferences(this.#settings.binaryPath, wanted ? [wanted] : undefined),
    );
    return references
      .slice(0, MAX_LIST_ITEMS)
      .map((parts) => ({ provider: this.id, raw: formatPlaceholder(parts), parts }));
  }

  clearCache(): void {
    this.#cache.clear();
  }

  suggestRefDefaults(ctx: NoteContext): Record<string, string> {
    return {
      vault: this.#settings.defaultVault || "Personal",
      item: slugify(ctx.basename ?? "untitled"),
      field: "Password",
    };
  }

  renderSettings(containerEl: HTMLElement): void {
    new Setting(containerEl).setName(t("provider.protonpass.heading")).setHeading();

    renderAuthStatusRow(containerEl, this);

    new Setting(containerEl)
      .setName(t("provider.protonpass.binaryPath.name"))
      .setDesc(t("provider.protonpass.binaryPath.desc"))
      .addText((txt) =>
        txt
          .setPlaceholder(defaultBinaryPath())
          .setValue(this.#settings.binaryPath)
          .onChange(async (v) => {
            this.clearCache();
            await this.#update({ binaryPath: v.trim() });
          }),
      );

    new Setting(containerEl)
      .setName(t("provider.protonpass.defaultVault.name"))
      .setDesc(t("provider.protonpass.defaultVault.desc"))
      .addText((txt) =>
        txt.setValue(this.#settings.defaultVault).onChange(async (v) => {
          // The cached listing was built for the old default vault.
          this.#cache.delete("list");
          await this.#update({ defaultVault: v.trim() });
        }),
      );

    new Setting(containerEl)
      .setName(t("provider.protonpass.cacheTtl.name"))
      .setDesc(t("provider.protonpass.cacheTtl.desc"))
      .addText((txt) =>
        txt.setValue(String(this.#settings.cacheTtlSec)).onChange(async (v) => {
          const n = Number(v);
          if (!Number.isFinite(n) || n < 0) return;
          await this.#update({ cacheTtlSec: n });
        }),
      );
  }
}
