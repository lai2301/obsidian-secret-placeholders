// OpenBao / HashiCorp Vault provider.

import { Notice, Platform, Setting } from "obsidian";

import { t } from "../../i18n";
import {
  NoteContext,
  PluginContext,
  Provider,
  ProviderAuth,
  ProviderAuthStatus,
  ProviderRef,
} from "../types";
import { renderAuthStatusRow } from "../../authStatusRow";
import { BaoError, OpenBaoClient } from "./client";
import { OpenBaoAuthState, PersistedAuth } from "./auth";
import { OidcLoginError, performOidcLogin } from "./oidcLogin";

export interface OpenBaoSettings extends PersistedAuth {
  baseUrl: string;
  oidcRole: string;
  defaultMount: string;
  defaultPathPrefix: string;
  cacheTtlSec: number;
}

export const OPENBAO_DEFAULTS: OpenBaoSettings = {
  baseUrl: "",
  oidcRole: "obsidian",
  defaultMount: "kv",
  defaultPathPrefix: "obsidian/",
  cacheTtlSec: 300,
  rememberToken: false,
  encryptedToken: null,
};

// {{bao:<mount>/<path>#<key>}}
const PLACEHOLDER_RE =
  /\{\{bao:([A-Za-z0-9_-]+)\/([A-Za-z0-9_\-/.]+)#([A-Za-z0-9_.-]+)\}\}/g;

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export class OpenBaoProvider implements Provider {
  readonly id = "bao";
  readonly displayName = "OpenBao / Vault";
  readonly placeholderPrefix = "bao:";
  readonly placeholderRegex = PLACEHOLDER_RE;

  private settings: OpenBaoSettings = { ...OPENBAO_DEFAULTS };
  private client: OpenBaoClient;
  authState: OpenBaoAuthState;
  auth: ProviderAuth;

  constructor(private ctx: PluginContext) {
    this.client = new OpenBaoClient(
      () => this.settings.baseUrl,
      () => this.authState.getToken(),
      () => this.settings.cacheTtlSec,
    );
    this.authState = new OpenBaoAuthState(
      this.client,
      () => ({
        rememberToken: this.settings.rememberToken,
        encryptedToken: this.settings.encryptedToken,
      }),
      async (p) => {
        this.settings.rememberToken = p.rememberToken;
        this.settings.encryptedToken = p.encryptedToken;
        await this.persist();
      },
      (title) => ctx.promptPassphrase(title),
    );

    this.auth = {
      status: async (): Promise<ProviderAuthStatus> => {
        if (!this.authState.hasToken()) return { loggedIn: false };
        try {
          const info = await this.client.lookupSelf();
          return {
            loggedIn: true,
            ttlSec: info.ttl,
            identity: info.policies.join(", ") || undefined,
          };
        } catch {
          return { loggedIn: false };
        }
      },
      login: async () => {
        // On desktop, try the OIDC browser-callback flow first.  Fall back
        // to paste-token on mobile or if OIDC isn't configured.
        if (Platform.isDesktopApp && this.settings.oidcRole) {
          try {
            const { token } = await performOidcLogin({
              baseUrl: this.settings.baseUrl,
              role: this.settings.oidcRole,
            });
            await this.authState.setToken(token);
            try {
              const info = await this.client.lookupSelf();
              new Notice(
                t("provider.openbao.loginOkPolicies", {
                  policies: info.policies.join(", ") || t("provider.openbao.policiesNone"),
                }),
              );
            } catch {
              new Notice(t("provider.openbao.loginOk"));
            }
            this.ctx.notifyAuthChanged(this.id);
            return;
          } catch (e) {
            if (e instanceof OidcLoginError) {
              new Notice(t("provider.openbao.oidcLoginFailed", { msg: e.message }));
            } else {
              new Notice(t("provider.openbao.oidcLoginFailed", { msg: (e as Error).message }));
            }
            // Fall through to paste-token as a manual escape hatch.
          }
        }
        await this.pasteTokenLogin();
      },
      logout: async () => {
        await this.authState.clearToken();
        this.client.clearCache();
        this.ctx.notifyAuthChanged(this.id);
      },
      onChange: (cb) => this.authState.onChange(cb),
    };
  }

  private async pasteTokenLogin(): Promise<void> {
    const { TokenPromptModal } = await import("../../modals");
    return new Promise<void>((resolve) => {
      new TokenPromptModal(this.ctx.app, async (token) => {
        await this.authState.setToken(token);
        try {
          const info = await this.client.lookupSelf();
          new Notice(
            t("provider.openbao.loginOkPolicies", {
              policies: info.policies.join(", ") || t("provider.openbao.policiesNone"),
            }),
          );
        } catch (e) {
          new Notice(t("provider.openbao.tokenRejected", { msg: (e as Error).message }));
        }
        this.ctx.notifyAuthChanged(this.id);
        resolve();
      }).open();
    });
  }

  async init(): Promise<void> {
    const saved = await this.ctx.loadProviderData<OpenBaoSettings>(this.id);
    if (saved) this.settings = { ...OPENBAO_DEFAULTS, ...saved };
    // Try to restore a remembered token (will prompt for passphrase).
    void this.authState.tryRestore();
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
      parts: { mount: m[1], path: m[2], key: m[3] },
    };
  }

  formatRef(parts: Record<string, string>): string {
    const { mount, path, key } = parts;
    return `{{bao:${mount}/${path}#${key}}}`;
  }

  async readKey(ref: ProviderRef): Promise<string> {
    return this.client.readKey(ref.parts.mount, ref.parts.path, ref.parts.key);
  }

  async writeKey(ref: ProviderRef, value: string): Promise<void> {
    await this.client.writeSecretMerge(ref.parts.mount, ref.parts.path, {
      [ref.parts.key]: value,
    });
  }

  async list(): Promise<ProviderRef[]> {
    // KV-v2 listing is recursive; we walk under defaultPathPrefix and
    // return one ProviderRef per key inside each leaf secret.  Capped to
    // avoid runaway requests on a large vault.
    const out: ProviderRef[] = [];
    const root = (this.settings.defaultPathPrefix || "").replace(/\/+$/, "");
    const mount = this.settings.defaultMount;
    const queue: string[] = root ? [root] : [""];
    let visited = 0;
    while (queue.length && visited < 200) {
      const path = queue.shift()!;
      const children = await this.client.listPath(mount, path).catch(() => []);
      for (const child of children) {
        visited++;
        const next = path ? `${path}/${child}` : child;
        if (child.endsWith("/")) {
          queue.push(next.replace(/\/$/, ""));
        } else {
          // Leaf secret - read its keys.
          try {
            const data = await this.client["readSecret"](mount, next);
            for (const k of Object.keys(data)) {
              out.push({
                provider: this.id,
                raw: this.formatRef({ mount, path: next, key: k }),
                parts: { mount, path: next, key: k },
              });
            }
          } catch {
            /* skip secrets we can't read */
          }
        }
      }
    }
    return out;
  }

  clearCache(): void {
    this.client.clearCache();
  }

  suggestRefDefaults(ctx: NoteContext): Record<string, string> {
    const filename = ctx.basename ?? "untitled";
    const folder = ctx.folder ?? "";
    const folderSlug = folder ? slugify(folder.split("/").pop() ?? "") : "";
    const pathParts = [
      this.settings.defaultPathPrefix.replace(/\/+$/, ""),
      folderSlug || null,
      slugify(filename),
    ].filter((p): p is string => !!p);
    return {
      mount: this.settings.defaultMount,
      path: pathParts.join("/"),
      key: "value",
    };
  }

  renderSettings(containerEl: HTMLElement): void {
    new Setting(containerEl).setName(t("provider.openbao.heading")).setHeading();

    renderAuthStatusRow(containerEl, this, {
      extraActions: Platform.isDesktopApp
        ? [
            {
              label: t("provider.openbao.pasteToken"),
              showWhen: "logged-out",
              onClick: () => this.pasteTokenLogin(),
            },
          ]
        : [],
    });

    new Setting(containerEl)
      .setName(t("provider.openbao.serverAddress.name"))
      .setDesc(t("provider.openbao.serverAddress.desc"))
      .addText((txt) =>
        txt
          .setPlaceholder("https://openbao.example.com")
          .setValue(this.settings.baseUrl)
          .onChange(async (v) => {
            this.settings.baseUrl = v.replace(/\/+$/, "");
            await this.persist();
          }),
      );

    new Setting(containerEl)
      .setName(t("provider.openbao.oidcRole.name"))
      .addText((txt) =>
        txt.setValue(this.settings.oidcRole).onChange(async (v) => {
          this.settings.oidcRole = v.trim();
          await this.persist();
        }),
      );

    new Setting(containerEl)
      .setName(t("provider.openbao.defaultMount.name"))
      .addText((txt) =>
        txt.setValue(this.settings.defaultMount).onChange(async (v) => {
          this.settings.defaultMount = v.trim();
          await this.persist();
        }),
      );

    new Setting(containerEl)
      .setName(t("provider.openbao.defaultPathPrefix.name"))
      .setDesc(t("provider.openbao.defaultPathPrefix.desc"))
      .addText((txt) =>
        txt
          .setValue(this.settings.defaultPathPrefix)
          .onChange(async (v) => {
            this.settings.defaultPathPrefix = v;
            await this.persist();
          }),
      );

    new Setting(containerEl)
      .setName(t("provider.openbao.cacheTtl.name"))
      .setDesc(t("provider.openbao.cacheTtl.desc"))
      .addText((txt) =>
        txt.setValue(String(this.settings.cacheTtlSec)).onChange(async (v) => {
          const n = Number(v);
          if (!Number.isFinite(n) || n < 0) return;
          this.settings.cacheTtlSec = n;
          await this.persist();
        }),
      );

    new Setting(containerEl)
      .setName(t("provider.openbao.rememberToken.name"))
      .setDesc(t("provider.openbao.rememberToken.desc"))
      .addToggle((tog) =>
        tog.setValue(this.settings.rememberToken).onChange(async (v) => {
          this.settings.rememberToken = v;
          if (!v) this.settings.encryptedToken = null;
          await this.persist();
        }),
      );
  }

  // Helper for command code that needs a token-required gate.
  isLoggedIn(): boolean {
    return this.authState.hasToken();
  }

  // Pretty error message for the secret span.
  static isAuthError(e: unknown): boolean {
    return e instanceof BaoError && (e.status === 401 || e.status === 403);
  }
}
