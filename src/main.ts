import { Plugin } from "obsidian";

import { registerCommands } from "./commands";
import { registerEditorContextMenu } from "./contextMenu";
import { SecretEditorSuggest } from "./editorSuggest";
import { buildLivePreviewExtension } from "./livePreview";
import { PassphraseModal } from "./modals";
import { buildPostProcessor } from "./postProcessor";
import { BitwardenProvider } from "./providers/bitwarden";
import { OpenBaoProvider } from "./providers/openbao";
import { OnePasswordProvider } from "./providers/onepassword";
import { ProviderRegistry } from "./providers/registry";
import { PluginContext } from "./providers/types";
import {
  DEFAULT_SETTINGS,
  SecretPlaceholdersSettingTab,
  Settings,
} from "./settings";
import {
  SecretIndexView,
  VIEW_TYPE_INDEX,
  activateSecretIndexView,
} from "./sidebar";
import { StatusBar } from "./statusBar";

interface PluginData {
  settings: Settings;
  providers: Record<string, unknown>;
}

export default class SecretPlaceholdersPlugin extends Plugin {
  data!: PluginData;
  registry!: ProviderRegistry;
  private statusBar: StatusBar | null = null;
  private editorSuggest: SecretEditorSuggest | null = null;
  private authChangeListeners = new Set<(providerId: string) => void>();

  async onload(): Promise<void> {
    await this.loadPluginData();
    this.registry = new ProviderRegistry();

    await this.buildRegistry();

    this.addSettingTab(new SecretPlaceholdersSettingTab(this.app, this));

    this.registerMarkdownPostProcessor(buildPostProcessor(this));
    this.registerEditorExtension(buildLivePreviewExtension(this));
    this.editorSuggest = new SecretEditorSuggest(this.app, this);
    this.registerEditorSuggest(this.editorSuggest);

    registerCommands(this);
    registerEditorContextMenu(this);

    this.registerView(
      VIEW_TYPE_INDEX,
      (leaf) => new SecretIndexView(leaf, this),
    );
    this.addRibbonIcon("key-round", "Secret Placeholders", () => {
      void activateSecretIndexView(this);
    });
    this.addCommand({
      id: "secrets-open-index",
      name: "Secrets: Open placeholder index",
      callback: () => void activateSecretIndexView(this),
    });

    this.statusBar = new StatusBar(this);
  }

  /** (Re)populate the registry based on enabledProviders.  Called once on
   *  onload and again whenever the user flips a provider on/off. */
  async buildRegistry(): Promise<void> {
    const ctx: PluginContext = {
      app: this.app,
      pluginVersion: this.manifest.version,
      loadProviderData: async <T,>(id: string) =>
        this.data.providers[id] as T | undefined,
      saveProviderData: async <T,>(id: string, p: T) => {
        this.data.providers[id] = p as unknown;
        await this.savePluginData();
      },
      promptPassphrase: (title) => this.promptPassphrase(title),
      notifyAuthChanged: (id) => this.fireAuthChanged(id),
    };

    // Throw away the existing registry and rebuild from scratch.
    for (const p of this.registry.all()) this.registry.unregister(p.id);

    const enabled = this.data.settings.enabledProviders;
    if (enabled.bao !== false) {
      const bao = new OpenBaoProvider(ctx);
      await bao.init();
      this.registry.register(bao);
    }
    if (enabled["1p"] !== false) {
      const onep = new OnePasswordProvider(ctx);
      await onep.init();
      this.registry.register(onep);
    }
    if (enabled.vw !== false) {
      const vw = new BitwardenProvider(ctx);
      await vw.init();
      this.registry.register(vw);
    }
  }

  /** Triggered from the settings tab when a provider's enabled toggle is
   *  flipped.  Rebuilds the registry and forces the status bar to redraw. */
  async reloadProviders(): Promise<void> {
    await this.buildRegistry();
    this.refreshStatusBar();
    // Auth-change is the most convenient existing signal for "everything
    // that listens to provider state should reconsider."
    this.fireAuthChanged("");
  }

  refreshStatusBar(): void {
    this.statusBar?.destroy();
    this.statusBar = new StatusBar(this);
  }

  /** Drop every cached view of secret data - each provider's resolved-
   *  secret cache AND the editor-suggest's separate ref-list cache - then
   *  tell rendered placeholders to re-fetch.  Call this after writing or
   *  editing a secret, and from the "Clear cache" command, so newly added
   *  or changed secrets show up everywhere without waiting for a TTL. */
  refreshSecretData(): void {
    this.registry.clearAllCaches();
    this.editorSuggest?.clearCache();
    this.fireStateChange("auth");
  }

  onunload(): void {
    this.registry.clearAllCaches();
    this.statusBar?.destroy();
    this.statusBar = null;
  }

  private async loadPluginData(): Promise<void> {
    const raw = ((await this.loadData()) ?? {}) as Partial<PluginData>;
    this.data = {
      settings: { ...DEFAULT_SETTINGS, ...(raw.settings ?? {}) },
      providers: raw.providers ?? {},
    };
  }

  async savePluginData(): Promise<void> {
    await this.saveData(this.data);
  }

  get settings(): Settings {
    return this.data.settings;
  }

  async saveSettings(): Promise<void> {
    await this.savePluginData();
    this.fireStateChange("settings");
  }

  /** Broadcast a state-change event to every live `.sp-secret` element so
   *  they can re-render (settings) or re-fetch (auth).  Listeners are
   *  attached per-element, so they get GC'd when the markdown view is
   *  re-rendered and the elements detach. */
  fireStateChange(reason: "auth" | "settings"): void {
    const event = new CustomEvent("sp-state-change", { detail: { reason } });
    document.querySelectorAll(".sp-secret").forEach((el) => {
      el.dispatchEvent(event);
    });
  }

  onAuthChanged(cb: (providerId: string) => void): () => void {
    this.authChangeListeners.add(cb);
    return () => this.authChangeListeners.delete(cb);
  }

  private fireAuthChanged(id: string): void {
    for (const cb of this.authChangeListeners) {
      try {
        cb(id);
      } catch {
        /* swallow */
      }
    }
    // Tell every rendered placeholder to re-fetch if it was in an error
    // state - the user probably just logged in.
    this.fireStateChange("auth");
  }

  promptPassphrase(title: string): Promise<string | null> {
    return new Promise((resolve) => {
      new PassphraseModal(this.app, title, resolve).open();
    });
  }
}
