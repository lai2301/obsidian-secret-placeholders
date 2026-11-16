// Provider interface that every backend (OpenBao, 1Password, Bitwarden, ...)
// implements.  The post-processor, live-preview decoration, commands, and
// settings tab all talk to providers through this surface so adding a new
// backend never requires touching rendering or command code.

import { App } from "obsidian";

/** Parsed result of a placeholder. The shape of `parts` is provider-specific. */
export interface ProviderRef {
  /** Matches Provider.id. */
  provider: string;
  /** Full matched text including the `{{...}}` braces. */
  raw: string;
  /** Provider-specific fields, e.g. {mount, path, key} for OpenBao. */
  parts: Record<string, string>;
}

export interface ProviderAuthStatus {
  loggedIn: boolean;
  /** Remaining session/token TTL, if applicable. */
  ttlSec?: number;
  /** Human-readable identity (email, "OIDC: user@..."). */
  identity?: string;
}

/** Per-provider auth handle. The plugin uses this for the status bar and
 *  "Re-login" inline actions. */
export interface ProviderAuth {
  status(): Promise<ProviderAuthStatus>;
  /** Open the provider's primary login flow. Implementation-specific. */
  login(): Promise<void>;
  logout(): Promise<void>;
  /** Subscribe to status changes. Returns an unsubscribe function. */
  onChange(cb: () => void): () => void;
}

/** Note context used to seed default refs when saving a selection as a
 *  secret. The provider decides what to do with this. */
export interface NoteContext {
  basename: string | null;
  folder: string | null;
}

/** Narrow surface providers see, instead of importing the full plugin and
 *  causing circular deps. */
export interface PluginContext {
  app: App;
  /** Plugin version from manifest.json.  Used as the Bitwarden-Client-Version
   *  header etc. */
  pluginVersion: string;
  /** Load this provider's bag of settings (under `data.providers.<id>`). */
  loadProviderData<T>(id: string): Promise<T | undefined>;
  saveProviderData<T>(id: string, data: T): Promise<void>;
  /** Modal-prompts for a passphrase, used by AES-GCM remember-on-device. */
  promptPassphrase(title: string): Promise<string | null>;
  /** Notify the plugin that this provider's auth state changed (drives the
   *  status bar). */
  notifyAuthChanged(providerId: string): void;
}

export interface Provider {
  /** Stable, short identifier. e.g. "bao", "1p", "vw". */
  id: string;
  /** User-facing name. */
  displayName: string;
  /** Prefix that precedes provider-specific syntax inside `{{...}}`. */
  placeholderPrefix: string;
  /** Global, sticky regex. Each `exec` returns a match whose [0] is the
   *  full `{{prefix:...}}` text. */
  placeholderRegex: RegExp;

  parseRef(raw: string): ProviderRef | null;
  formatRef(parts: Record<string, string>): string;

  /** Ref parts (keys of `suggestRefDefaults`) that may be left blank in
   *  the ref-editor modal.  Anything not listed is required.  Example:
   *  Bitwarden's "folder". */
  optionalRefParts?: string[];

  readKey(ref: ProviderRef): Promise<string>;
  writeKey(ref: ProviderRef, value: string): Promise<void>;
  /** Best-effort enumeration for autocomplete / browser modal. May return
   *  an empty list if the provider can't enumerate cheaply. */
  list(prefix?: string): Promise<ProviderRef[]>;

  clearCache(): void;

  auth: ProviderAuth;

  /** Render this provider's settings section. The plugin calls this from
   *  the main settings tab. */
  renderSettings(containerEl: HTMLElement): void;

  /** Seed defaults for "Save selection as secret" given a note. */
  suggestRefDefaults(ctx: NoteContext): Record<string, string>;
}
