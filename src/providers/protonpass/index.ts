// Proton Pass provider.  Shells out to the official `pass-cli` binary, which
// owns the session (login happens in a terminal with `pass-cli login`).
// Desktop only: spawning a process needs Node's child_process.
//
// Placeholder syntax: {{pass:<vault>/<item>/<field>}}
//   - maps 1:1 onto pass-cli's secret reference pass://<vault>/<item>/<field>
//   - <vault> = vault name, <item> = item title, <field> = field name
//     (e.g. "password", "username", "email", or a custom field)
//
// Read-only: reading and listing are supported, creating or editing items
// is not.
//
// Security notes:
//   - the binary path comes from plugin settings only, never note content;
//   - the process runs without a shell, so a ref is always a single argv
//     element and spaces / shell metacharacters are inert;
//   - errors surface stderr only, never stdout (which may hold a secret).

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
import { runPassCli } from "./cli";
import { ProtonPassError } from "./errors";
import { itemTitles, parseJson, vaultNames } from "./json";
import {
  PLACEHOLDER_RE,
  PREFIX,
  formatPlaceholder,
  fromRecord,
  parsePlaceholder,
  toPassRef,
} from "./ref";
import { DEFAULTS, ProtonPassSettings, defaultBinaryPath } from "./settings";

// `item view` prints one field; `item list` prints whole items as JSON.
const VIEW_MAX_BUFFER = 64 * 1024;
const LIST_MAX_BUFFER = 8 * 1024 * 1024;
const MAX_LIST_ITEMS = 500;

const slugify = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

export class ProtonPassProvider implements Provider {
  readonly id = "pp";
  readonly displayName = "Proton Pass";
  readonly placeholderPrefix = PREFIX;
  readonly placeholderRegex = PLACEHOLDER_RE;
  readonly readOnly = true;

  readonly #ctx: PluginContext;
  #settings: ProtonPassSettings = { ...DEFAULTS };
  // Holds lookups, not values, so concurrent reads of one ref share a
  // single pass-cli call. Failures are dropped once they settle. Each key
  // prefix ("view:", "vaults", "items:") always stores the same result type.
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
    // pass-cli login is interactive (browser / TOTP prompts), so it has
    // to happen in a terminal. Recheck afterwords in case the user
    // already did it.
    login: async () => {
      this.clearCache();
      const status = await this.auth.status();
      if (status.loggedIn) {
        new Notice(t("provider.protonpass.loggedIn"));
      } else {
        new Notice(t("provider.protonpass.loginHint"), 10_000);
      }
      this.#ctx.notifyAuthChanged(this.id);
      this.#notify();
    },
    logout: async () => {
      try {
        await runPassCli(this.#settings.binaryPath, ["logout"], VIEW_MAX_BUFFER);
      } catch (e) {
        new Notice(e instanceof Error ? e.message : String(e));
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

  /** Cached by key. A rejected promise is evicted so a retry asks again,
   *  so `load` should include any parsing that can fail. */
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
    const passRef = toPassRef(fromRecord(ref.parts));
    if (!passRef) {
      throw new ProtonPassError("not-found", t("provider.protonpass.invalidRef"));
    }
    return this.#cached(`view:${passRef}`, async () => {
      const stdout = await runPassCli(this.#settings.binaryPath, ["item", "view", passRef], VIEW_MAX_BUFFER);
      // Strip exactly one trailing newline; secrets may end in spaces.
      return stdout.replace(/\r?\n$/, "");
    });
  }

  async writeKey(): Promise<void> {
    throw new ProtonPassError("unknown", t("provider.protonpass.readOnly"));
  }

  #listVaults(): Promise<string[]> {
    return this.#cached("vaults", async () => {
      const stdout = await runPassCli(this.#settings.binaryPath, ["vault", "list", "--output", "json"], LIST_MAX_BUFFER);
      return vaultNames(parseJson(stdout));
    });
  }

  #listItems(vault: string): Promise<string[]> {
    return this.#cached(`items:${vault}`, async () => {
      const stdout = await runPassCli(this.#settings.binaryPath, ["item", "list", vault, "--output", "json"], LIST_MAX_BUFFER);
      return itemTitles(parseJson(stdout));
    });
  }

  async list(): Promise<ProviderRef[]> {
    const vaults = await this.#listVaults();
    const wanted = this.#settings.defaultVault.trim();
    const candidates = wanted ? vaults.filter((v) => v === wanted) : vaults;
    // A leading "-" would be read as a flag by pass-cli.
    const targets = candidates.filter((v) => !v.startsWith("-"));
    const partsByVault = await Promise.all(
      targets.map(async (vault) => {
        const titles = await this.#listItems(vault).catch(() => [] as string[]);
        // Listing doesn't tell us which fields an item has without fetching
        // each one, so surface nothing so the user can edit the placeholder
        // themselves.
        return titles.map((item) => ({ vault, item, field: "password" }));
      }),
    );
    return partsByVault
      .flat()
      .filter((parts) => toPassRef(parts) !== null)
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
      field: "password",
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
