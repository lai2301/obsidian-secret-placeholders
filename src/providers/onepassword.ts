// 1Password Connect provider.  Talks to a self-hosted Connect server via
// its REST API:  https://developer.1password.com/docs/connect/connect-api-reference/
//
// Auth: long-lived Connect token, sent as a Bearer header.  No browser
// flow needed; users paste-once.
//
// Placeholder syntax: {{1p:<vault>/<item>#<field>}}
//   - <vault> = vault name OR id
//   - <item>  = item title OR id  (URL-safe characters only)
//   - <field> = field label (e.g. "password", "username", "token")
//
// References by name/title are easier to read but break on rename.  Using
// the item's UUID makes the placeholder rename-proof at the cost of
// readability.  Both work transparently.

import { Notice, Setting, requestUrl } from "obsidian";

import { t } from "../i18n";
import { renderAuthStatusRow } from "../authStatusRow";
import {
  NoteContext,
  PluginContext,
  Provider,
  ProviderAuth,
  ProviderAuthStatus,
  ProviderRef,
} from "./types";
import { TokenPromptModal } from "../modals";

// --- types ---------------------------------------------------------------

interface OpVault {
  id: string;
  name: string;
}

interface OpField {
  id?: string;
  label?: string;
  type?: string;
  value?: string;
  purpose?: string;
}

interface OpItem {
  id: string;
  title: string;
  vault: { id: string };
  category?: string;
  fields?: OpField[];
}

export interface OnePasswordSettings {
  baseUrl: string;
  /** Connect token (long-lived).  Stored as-is when rememberToken is on. */
  token: string | null;
  defaultVault: string;
  cacheTtlSec: number;
}

const DEFAULTS: OnePasswordSettings = {
  baseUrl: "",
  token: null,
  defaultVault: "",
  cacheTtlSec: 300,
};

// {{1p:<vault>/<item>#<field>}}
// Permissive on inner characters because vault/item names can contain
// spaces and most punctuation.  We forbid `/` in <vault>, `#` in <vault>
// and <item>, and `}` everywhere so the closing braces still terminate.
const PLACEHOLDER_RE =
  /\{\{1p:([^/#{}]+)\/([^#{}]+)#([^{}]+)\}\}/g;

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// --- client --------------------------------------------------------------

class OnePasswordError extends Error {
  status: number;
  body: string;
  constructor(status: number, body: string, message?: string) {
    super(message ?? `1Password Connect ${status}: ${body.slice(0, 200)}`);
    this.status = status;
    this.body = body;
  }
}

class OnePasswordClient {
  // Cache: vault id by lookup-key (lower-cased name or id).
  private vaultIdCache = new Map<string, string>();
  // Cache: item id by (vaultId, title).
  private itemIdCache = new Map<string, string>();
  // Cache: full item by id, with expiry.
  private itemCache = new Map<string, { expires: number; item: OpItem }>();

  constructor(
    private getBaseUrl: () => string,
    private getToken: () => string | null,
    private getCacheTtlSec: () => number,
  ) {}

  clearCache(): void {
    this.vaultIdCache.clear();
    this.itemIdCache.clear();
    this.itemCache.clear();
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const token = this.getToken();
    if (!token) {
      throw new OnePasswordError(401, "no token", "Not logged in to 1Password");
    }
    const base = this.getBaseUrl().replace(/\/+$/, "");
    if (!base) {
      throw new OnePasswordError(
        0,
        "no baseUrl",
        "1Password Connect URL not configured",
      );
    }
    const res = await requestUrl({
      url: `${base}/v1/${path.replace(/^\/+/, "")}`,
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      throw: false,
    });
    if (res.status >= 400) throw new OnePasswordError(res.status, res.text);
    if (res.status === 204 || !res.text) return undefined as unknown as T;
    return res.json as T;
  }

  async listVaults(): Promise<OpVault[]> {
    return this.request<OpVault[]>("GET", "vaults");
  }

  async resolveVaultId(vaultRef: string): Promise<string> {
    // Treat anything that looks like a 1P UUID (26 chars, base32-ish) as
    // an id.  Otherwise look up by name.
    if (/^[A-Za-z0-9]{26}$/.test(vaultRef)) return vaultRef;
    const key = vaultRef.toLowerCase();
    const cached = this.vaultIdCache.get(key);
    if (cached) return cached;
    const vaults = await this.listVaults();
    for (const v of vaults) {
      this.vaultIdCache.set(v.name.toLowerCase(), v.id);
    }
    const id = this.vaultIdCache.get(key);
    if (!id) throw new OnePasswordError(404, `vault '${vaultRef}' not found`);
    return id;
  }

  async listItems(vaultId: string): Promise<OpItem[]> {
    return this.request<OpItem[]>("GET", `vaults/${vaultId}/items`);
  }

  async resolveItemId(vaultId: string, itemRef: string): Promise<string> {
    if (/^[A-Za-z0-9]{26}$/.test(itemRef)) return itemRef;
    const cacheKey = `${vaultId}/${itemRef.toLowerCase()}`;
    const cached = this.itemIdCache.get(cacheKey);
    if (cached) return cached;
    const items = await this.listItems(vaultId);
    for (const it of items) {
      this.itemIdCache.set(`${vaultId}/${it.title.toLowerCase()}`, it.id);
    }
    const id = this.itemIdCache.get(cacheKey);
    if (!id) throw new OnePasswordError(404, `item '${itemRef}' not found`);
    return id;
  }

  async getItem(vaultId: string, itemId: string): Promise<OpItem> {
    const cacheKey = `${vaultId}/${itemId}`;
    const now = Date.now();
    const cached = this.itemCache.get(cacheKey);
    if (cached && cached.expires > now) return cached.item;
    const item = await this.request<OpItem>(
      "GET",
      `vaults/${vaultId}/items/${itemId}`,
    );
    this.itemCache.set(cacheKey, {
      expires: now + this.getCacheTtlSec() * 1000,
      item,
    });
    return item;
  }

  async readField(
    vaultRef: string,
    itemRef: string,
    fieldLabel: string,
  ): Promise<string> {
    const vaultId = await this.resolveVaultId(vaultRef);
    const itemId = await this.resolveItemId(vaultId, itemRef);
    const item = await this.getItem(vaultId, itemId);
    const label = fieldLabel.toLowerCase();
    for (const f of item.fields ?? []) {
      if (
        (f.label ?? "").toLowerCase() === label ||
        (f.purpose ?? "").toLowerCase() === label
      ) {
        return f.value ?? "";
      }
    }
    throw new OnePasswordError(
      404,
      `field '${fieldLabel}' not found on item ${itemRef}`,
      `field '${fieldLabel}' not found`,
    );
  }

  /** Create a new item with a single field of the requested label.  If an
   *  item with the same title already exists in the vault, patch it
   *  instead (preserving sibling fields). */
  async writeField(
    vaultRef: string,
    itemRef: string,
    fieldLabel: string,
    value: string,
  ): Promise<void> {
    const vaultId = await this.resolveVaultId(vaultRef);
    let itemId: string | null = null;
    try {
      itemId = await this.resolveItemId(vaultId, itemRef);
    } catch (e) {
      if (!(e instanceof OnePasswordError) || e.status !== 404) throw e;
    }
    if (itemId) {
      // Patch existing item: add or replace the field.
      const item = await this.getItem(vaultId, itemId);
      const existing = (item.fields ?? []).filter(
        (f) => (f.label ?? "").toLowerCase() !== fieldLabel.toLowerCase(),
      );
      const merged: OpField[] = [
        ...existing,
        {
          label: fieldLabel,
          type: guessFieldType(fieldLabel),
          value,
        },
      ];
      await this.request("PUT", `vaults/${vaultId}/items/${itemId}`, {
        ...item,
        fields: merged,
      });
      this.itemCache.delete(`${vaultId}/${itemId}`);
      return;
    }
    // Create new item.
    const created = await this.request<OpItem>(
      "POST",
      `vaults/${vaultId}/items`,
      {
        vault: { id: vaultId },
        title: itemRef,
        category: "API_CREDENTIAL",
        fields: [
          {
            label: fieldLabel,
            type: guessFieldType(fieldLabel),
            value,
          },
        ],
      },
    );
    this.itemIdCache.set(
      `${vaultId}/${itemRef.toLowerCase()}`,
      created.id,
    );
  }
}

function guessFieldType(label: string): string {
  const l = label.toLowerCase();
  if (l === "password" || l === "pass" || l.includes("secret")) {
    return "CONCEALED";
  }
  return "STRING";
}

// --- provider ------------------------------------------------------------

export class OnePasswordProvider implements Provider {
  readonly id = "1p";
  readonly displayName = "1Password Connect";
  readonly placeholderPrefix = "1p:";
  readonly placeholderRegex = PLACEHOLDER_RE;

  private settings: OnePasswordSettings = { ...DEFAULTS };
  private client: OnePasswordClient;
  auth: ProviderAuth;

  private listeners = new Set<() => void>();

  constructor(private ctx: PluginContext) {
    this.client = new OnePasswordClient(
      () => this.settings.baseUrl,
      () => this.settings.token,
      () => this.settings.cacheTtlSec,
    );

    this.auth = {
      status: async (): Promise<ProviderAuthStatus> => {
        if (!this.settings.token || !this.settings.baseUrl) {
          return { loggedIn: false };
        }
        try {
          // listVaults is the simplest authenticated probe.
          await this.client.listVaults();
          return { loggedIn: true };
        } catch {
          return { loggedIn: false };
        }
      },
      login: async () => {
        return new Promise<void>((resolve) => {
          new TokenPromptModal(this.ctx.app, async (token) => {
            this.settings.token = token;
            await this.persist();
            try {
              await this.client.listVaults();
              new Notice(t("provider.onepassword.loggedIn"));
            } catch (e) {
              new Notice(
                t("provider.onepassword.tokenRejected", { msg: (e as Error).message }),
              );
            }
            this.ctx.notifyAuthChanged(this.id);
            this.notify();
            resolve();
          }).open();
        });
      },
      logout: async () => {
        this.settings.token = null;
        await this.persist();
        this.client.clearCache();
        this.ctx.notifyAuthChanged(this.id);
        this.notify();
      },
      onChange: (cb) => {
        this.listeners.add(cb);
        return () => this.listeners.delete(cb);
      },
    };
  }

  private notify(): void {
    for (const cb of this.listeners) {
      try {
        cb();
      } catch {
        /* swallow */
      }
    }
  }

  async init(): Promise<void> {
    const saved = await this.ctx.loadProviderData<OnePasswordSettings>(this.id);
    if (saved) this.settings = { ...DEFAULTS, ...saved };
  }

  private async persist(): Promise<void> {
    await this.ctx.saveProviderData(this.id, this.settings);
  }

  parseRef(raw: string): ProviderRef | null {
    const m = new RegExp(PLACEHOLDER_RE.source).exec(raw);
    if (!m) return null;
    return {
      provider: this.id,
      raw: m[0],
      parts: { vault: m[1], item: m[2], field: m[3] },
    };
  }

  formatRef(parts: Record<string, string>): string {
    const { vault, item, field } = parts;
    return `{{1p:${vault}/${item}#${field}}}`;
  }

  async readKey(ref: ProviderRef): Promise<string> {
    return this.client.readField(
      ref.parts.vault,
      ref.parts.item,
      ref.parts.field,
    );
  }

  async writeKey(ref: ProviderRef, value: string): Promise<void> {
    await this.client.writeField(
      ref.parts.vault,
      ref.parts.item,
      ref.parts.field,
      value,
    );
  }

  async list(): Promise<ProviderRef[]> {
    if (!this.settings.token || !this.settings.baseUrl) return [];
    const out: ProviderRef[] = [];
    const vaults: OpVault[] = await this.client
      .listVaults()
      .catch(() => [] as OpVault[]);
    // Restrict to defaultVault if set, otherwise walk everything.
    const targetVaults =
      this.settings.defaultVault.trim().length > 0
        ? vaults.filter(
            (v) =>
              v.name === this.settings.defaultVault ||
              v.id === this.settings.defaultVault,
          )
        : vaults;
    for (const v of targetVaults) {
      const items: OpItem[] = await this.client
        .listItems(v.id)
        .catch(() => [] as OpItem[]);
      for (const it of items.slice(0, 100)) {
        // We don't fetch full items for the autocomplete list - that would
        // be N+1 requests.  Default to surfacing the conventional
        // "password" field; the user can edit the placeholder to point at
        // any other field on the same item.
        out.push({
          provider: this.id,
          raw: this.formatRef({
            vault: v.name,
            item: it.title,
            field: "password",
          }),
          parts: { vault: v.name, item: it.title, field: "password" },
        });
      }
    }
    return out;
  }

  clearCache(): void {
    this.client.clearCache();
  }

  suggestRefDefaults(ctx: NoteContext): Record<string, string> {
    return {
      vault: this.settings.defaultVault || "Personal",
      item: slugify(ctx.basename ?? "untitled"),
      field: "password",
    };
  }

  renderSettings(containerEl: HTMLElement): void {
    new Setting(containerEl).setName(t("provider.onepassword.heading")).setHeading();

    renderAuthStatusRow(containerEl, this);

    new Setting(containerEl)
      .setName(t("provider.onepassword.serverUrl.name"))
      .setDesc(t("provider.onepassword.serverUrl.desc"))
      .addText((txt) =>
        txt
          .setPlaceholder("https://1pconnect.example.com")
          .setValue(this.settings.baseUrl)
          .onChange(async (v) => {
            this.settings.baseUrl = v.replace(/\/+$/, "");
            await this.persist();
          }),
      );

    new Setting(containerEl)
      .setName(t("provider.onepassword.defaultVault.name"))
      .setDesc(t("provider.onepassword.defaultVault.desc"))
      .addText((txt) =>
        txt.setValue(this.settings.defaultVault).onChange(async (v) => {
          this.settings.defaultVault = v.trim();
          await this.persist();
        }),
      );

    new Setting(containerEl)
      .setName(t("provider.onepassword.cacheTtl.name"))
      .setDesc(t("provider.onepassword.cacheTtl.desc"))
      .addText((txt) =>
        txt.setValue(String(this.settings.cacheTtlSec)).onChange(async (v) => {
          const n = Number(v);
          if (!Number.isFinite(n) || n < 0) return;
          this.settings.cacheTtlSec = n;
          await this.persist();
        }),
      );

  }
}
