// Global plugin settings (UX-level).  Per-provider settings are owned by
// the provider and rendered into the same tab via provider.renderSettings().

import { App, PluginSettingTab, Setting } from "obsidian";
import type SecretPlaceholdersPlugin from "./main";

export type MaskMode = "never" | "always" | "manual";
export type ClickAction = "copy" | "toggle-mask" | "none";

export interface Settings {
  /** "never" = always show value; "always" = always masked; "manual" =
   *  masked by default, user can reveal/mask via click. */
  maskMode: MaskMode;
  /** Action for a plain single click on a resolved secret. */
  clickAction: ClickAction;
  /** Action for Ctrl/Cmd + single click. */
  modifierClickAction: ClickAction;
  /** When masked, the character used. */
  maskCharacter: string;
  /** Per-provider enabled flag.  A disabled provider is fully unwired -
   *  no settings section, no status bar chip, no placeholder rendering,
   *  no editor autocomplete for its prefix. */
  enabledProviders: Record<string, boolean>;
  /** Which providers appear in the status bar.  When empty, every
   *  enabled provider is shown.  Lets users hide chips they don't care
   *  about (e.g. show only the one they actually use). */
  statusBarProviders: string[];
}

export const DEFAULT_SETTINGS: Settings = {
  maskMode: "never",
  clickAction: "copy",
  modifierClickAction: "toggle-mask",
  maskCharacter: "•",
  enabledProviders: { bao: true, "1p": true, vw: true },
  statusBarProviders: [],
};

const MASK_MODE_OPTIONS: Record<MaskMode, string> = {
  never: "Never (default)",
  always: "Always",
  manual: "Manual (masked, click to reveal)",
};

const CLICK_OPTIONS: Record<ClickAction, string> = {
  copy: "Copy",
  "toggle-mask": "Toggle mask",
  none: "Do nothing",
};

export class SecretPlaceholdersSettingTab extends PluginSettingTab {
  plugin: SecretPlaceholdersPlugin;
  private authSubscription: (() => void) | null = null;

  constructor(app: App, plugin: SecretPlaceholdersPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  hide(): void {
    this.authSubscription?.();
    this.authSubscription = null;
    super.hide();
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl).setName("Display").setHeading();

    new Setting(containerEl)
      .setName("Mask mode")
      .setDesc(
        "Whether resolved secrets are hidden by default. The placeholder text on disk is never the secret regardless of this setting.",
      )
      .addDropdown((d) => {
        for (const [k, label] of Object.entries(MASK_MODE_OPTIONS)) {
          d.addOption(k, label);
        }
        d.setValue(this.plugin.settings.maskMode);
        d.onChange(async (v) => {
          this.plugin.settings.maskMode = v as MaskMode;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("Click action")
      .setDesc("Action for a single click on a resolved secret.")
      .addDropdown((d) => {
        for (const [k, label] of Object.entries(CLICK_OPTIONS)) {
          d.addOption(k, label);
        }
        d.setValue(this.plugin.settings.clickAction);
        d.onChange(async (v) => {
          this.plugin.settings.clickAction = v as ClickAction;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("Modifier-click action")
      .setDesc("Action for Ctrl/Cmd + single click.")
      .addDropdown((d) => {
        for (const [k, label] of Object.entries(CLICK_OPTIONS)) {
          d.addOption(k, label);
        }
        d.setValue(this.plugin.settings.modifierClickAction);
        d.onChange(async (v) => {
          this.plugin.settings.modifierClickAction = v as ClickAction;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("Mask character")
      .addText((t) =>
        t.setValue(this.plugin.settings.maskCharacter).onChange(async (v) => {
          this.plugin.settings.maskCharacter = v.slice(0, 1) || "•";
          await this.plugin.saveSettings();
        }),
      );

    // Provider on/off toggles + status-bar visibility.  Available providers
    // are the union of registered providers and any saved enabledProviders
    // keys, so toggling something off doesn't make it disappear.
    new Setting(containerEl).setName("Providers").setHeading();

    const knownIds = new Set<string>();
    for (const p of this.plugin.registry.all()) knownIds.add(p.id);
    for (const id of Object.keys(this.plugin.settings.enabledProviders)) {
      knownIds.add(id);
    }
    const displayNames: Record<string, string> = {
      bao: "OpenBao / Vault",
      "1p": "1Password Connect",
      vw: "Bitwarden / Vaultwarden",
    };

    for (const id of knownIds) {
      const enabled = this.plugin.settings.enabledProviders[id] !== false;
      const name = displayNames[id] ?? id;
      new Setting(containerEl)
        .setName(name)
        .setDesc(
          enabled
            ? `Settings, status bar, and {{${id}:...}} placeholders are active.`
            : "Disabled. No settings, no placeholders, no autocomplete.",
        )
        .addToggle((t) =>
          t.setValue(enabled).onChange(async (v) => {
            this.plugin.settings.enabledProviders[id] = v;
            await this.plugin.saveSettings();
            await this.plugin.reloadProviders();
            this.display();
          }),
        );
    }

    new Setting(containerEl)
      .setName("Status bar")
      .setDesc(
        "Pick which providers show as chips in the status bar. Leave all unchecked to show every enabled provider.",
      );
    for (const id of knownIds) {
      if (this.plugin.settings.enabledProviders[id] === false) continue;
      const name = displayNames[id] ?? id;
      const checked =
        this.plugin.settings.statusBarProviders.includes(id);
      new Setting(containerEl)
        .setName(`Show ${name}`)
        .addToggle((t) =>
          t.setValue(checked).onChange(async (v) => {
            const list = new Set(this.plugin.settings.statusBarProviders);
            if (v) list.add(id);
            else list.delete(id);
            this.plugin.settings.statusBarProviders = [...list];
            await this.plugin.saveSettings();
            this.plugin.refreshStatusBar();
          }),
        );
    }

    // Each provider renders its own section into this same tab.
    for (const provider of this.plugin.registry.all()) {
      provider.renderSettings(containerEl);
    }

    // Re-display when any provider's auth state changes (login, logout,
    // OIDC completion, etc.) so the auth-status rows refresh without the
    // user having to close and reopen the tab.
    this.authSubscription?.();
    this.authSubscription = this.plugin.onAuthChanged(() => {
      // Defer to next tick so any in-flight provider callbacks complete
      // before we tear down their DOM.
      window.setTimeout(() => this.display(), 0);
    });
  }
}
