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
 * - The process runs without a shell, so a reference is always a single
 *   argv element and spaces or shell metacharacters are inert.
 * - Errors surface stderr only, never stdout, which may hold a secret.
 * - pass-cli takes a value being saved as an argument, so other processes
 *   run by the same user can see it while the command runs.
 */

import { Notice, Setting } from "obsidian";

import { t } from "../../i18n";
import { renderAuthStatusRow } from "../../authStatusRow";
import { slugify } from "../../common";
import {
  NoteContext,
  PluginContext,
  Provider,
  ProviderAuth,
  ProviderAuthStatus,
  ProviderRef,
} from "../types";
import { ProtonPassError } from "./errors";
import { describeError, withUserMessages } from "./messages";
import {
  DEFAULT_FIELD,
  PLACEHOLDER_RE,
  PassReferenceParts,
  PREFIX,
  formatPlaceholder,
  fromRecord,
  parsePlaceholder,
  toPassReference,
} from "./references";
import { runPassCli } from "./cli";
import { createCache } from "./cache";
import { createRepository } from "./repository";
import { DEFAULTS, ProtonPassSettings, defaultBinaryPath } from "./settings";

/** Upper bound on references returned by {@link ProtonPassProvider.list}. */
const MAX_LIST_ITEMS = 500;

/** What the provider caches, keyed by the pass-cli command that loads it. */
interface CachedLookups {
  /** A secret, keyed by its `pass://` reference. */
  [key: `view:${string}`]: string;
  /** Names of every vault the session can see. */
  vaults: string[];
  /** References for the listing in the default vault, or in every vault. */
  list: PassReferenceParts[];
}

/**
 * The `pass://` reference for `parts`.
 *
 * @throws {ProtonPassError} "invalid-reference" if the parts can't form a valid reference.
 */
const requirePassReference = (parts: PassReferenceParts): string => {
  const passReference = toPassReference(parts);
  if (!passReference) {
    throw new ProtonPassError({ kind: "invalid-reference" });
  }

  return passReference;
};

export class ProtonPassProvider implements Provider {
  readonly id = "pp";
  readonly displayName = "Proton Pass";
  readonly placeholderPrefix = PREFIX;
  readonly placeholderRegex = PLACEHOLDER_RE;

  readonly #ctx: PluginContext;
  #settings: ProtonPassSettings = { ...DEFAULTS };
  readonly #cache = createCache<CachedLookups>(() => this.#settings.cacheTtlSec * 1000);
  readonly #listeners = new Set<() => void>();
  /** Runs pass-cli at the binary path in the current settings. */
  readonly #repo = createRepository((args, maxBuffer) =>
    runPassCli(this.#settings.binaryPath, args, maxBuffer),
  );

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
          new Notice(describeError(e));
        }
      }
      this.#ctx.notifyAuthChanged(this.id);
      this.#notify();
    },
    logout: async () => {
      try {
        await this.#repo.logout();
      } catch (e) {
        new Notice(describeError(e));
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

  readKey(reference: ProviderRef): Promise<string> {
    return withUserMessages(() => {
      const passReference = requirePassReference(fromRecord(reference.parts));
      return this.#cache.getOrLoad(`view:${passReference}`, () =>
        this.#repo.readSecret(passReference),
      );
    });
  }

  /** Set the secret at `reference` to `value`, creating the item if needed. */
  writeKey(reference: ProviderRef, value: string): Promise<void> {
    return withUserMessages(async () => {
      const parts = fromRecord(reference.parts);
      const passReference = requirePassReference(parts);
      try {
        await this.#repo.upsertField(parts, value);
      } finally {
        // A failed upsert may still have created the item, so drop these
        // either way.
        this.#cache.evict(`view:${passReference}`);
        this.#cache.evict("list");
      }
    });
  }

  #listVaults(): Promise<string[]> {
    return this.#cache.getOrLoad("vaults", () => this.#repo.listVaultNames());
  }

  list(): Promise<ProviderRef[]> {
    return withUserMessages(async () => {
      const wanted = this.#settings.defaultVault.trim();
      const references = await this.#cache.getOrLoad("list", () =>
        this.#repo.listItemReferences(wanted ? [wanted] : undefined),
      );
      return references
        .slice(0, MAX_LIST_ITEMS)
        .map((parts) => ({ provider: this.id, raw: formatPlaceholder(parts), parts }));
    });
  }

  clearCache(): void {
    this.#cache.clear();
  }

  suggestRefDefaults(ctx: NoteContext): Record<string, string> {
    return {
      vault: this.#settings.defaultVault || "Personal",
      item: slugify(ctx.basename ?? "untitled"),
      field: DEFAULT_FIELD,
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
          this.#cache.evict("list");
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
