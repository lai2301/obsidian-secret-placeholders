// Global plugin settings (UX-level).  Per-provider settings are owned by
// the provider and rendered into the same tab via provider.renderSettings().

import { App, PluginSettingTab, Setting } from "obsidian";
import type SecretPlaceholdersPlugin from "./main";
import { t, setLocale, languageOptions, type Lang } from "./i18n";

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
  /** Interface language. "auto" follows Obsidian's UI language. */
  language: Lang;
}

export const DEFAULT_SETTINGS: Settings = {
  maskMode: "never",
  clickAction: "copy",
  modifierClickAction: "toggle-mask",
  maskCharacter: "•",
  enabledProviders: { bao: true, "1p": true, vw: true },
  statusBarProviders: [],
  language: "auto",
};

const maskModeOptions = (): Record<MaskMode, string> => ({
  never: t("settings.maskMode.never"),
  always: t("settings.maskMode.always"),
  manual: t("settings.maskMode.manual"),
});

const clickOptions = (): Record<ClickAction, string> => ({
  copy: t("settings.click.copy"),
  "toggle-mask": t("settings.click.toggleMask"),
  none: t("settings.click.none"),
});

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

    new Setting(containerEl)
      .setName(t("settings.language.name"))
      .setDesc(t("settings.language.desc"))
      .addDropdown((d) => {
        for (const [k, label] of Object.entries(languageOptions())) {
          d.addOption(k, label);
        }
        d.setValue(this.plugin.settings.language);
        d.onChange(async (v) => {
          this.plugin.settings.language = v as Lang;
          setLocale(this.plugin.settings.language);
          await this.plugin.saveSettings();
          this.display();
        });
      });

    new Setting(containerEl).setName(t("settings.displayHeading")).setHeading();

    new Setting(containerEl)
      .setName(t("settings.maskMode.name"))
      .setDesc(t("settings.maskMode.desc"))
      .addDropdown((d) => {
        for (const [k, label] of Object.entries(maskModeOptions())) {
          d.addOption(k, label);
        }
        d.setValue(this.plugin.settings.maskMode);
        d.onChange(async (v) => {
          this.plugin.settings.maskMode = v as MaskMode;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName(t("settings.clickAction.name"))
      .setDesc(t("settings.clickAction.desc"))
      .addDropdown((d) => {
        for (const [k, label] of Object.entries(clickOptions())) {
          d.addOption(k, label);
        }
        d.setValue(this.plugin.settings.clickAction);
        d.onChange(async (v) => {
          this.plugin.settings.clickAction = v as ClickAction;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName(t("settings.modifierClickAction.name"))
      .setDesc(t("settings.modifierClickAction.desc"))
      .addDropdown((d) => {
        for (const [k, label] of Object.entries(clickOptions())) {
          d.addOption(k, label);
        }
        d.setValue(this.plugin.settings.modifierClickAction);
        d.onChange(async (v) => {
          this.plugin.settings.modifierClickAction = v as ClickAction;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName(t("settings.maskCharacter.name"))
      .addText((txt) =>
        txt.setValue(this.plugin.settings.maskCharacter).onChange(async (v) => {
          this.plugin.settings.maskCharacter = v.slice(0, 1) || "•";
          await this.plugin.saveSettings();
        }),
      );

    // Provider on/off toggles + status-bar visibility.  Available providers
    // are the union of registered providers and any saved enabledProviders
    // keys, so toggling something off doesn't make it disappear.
    new Setting(containerEl).setName(t("settings.providersHeading")).setHeading();

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
            ? t("settings.provider.enabledDesc", { example: `{{${id}:...}}` })
            : t("settings.provider.disabledDesc"),
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
      .setName(t("settings.statusBar.name"))
      .setDesc(t("settings.statusBar.desc"));
    for (const id of knownIds) {
      if (this.plugin.settings.enabledProviders[id] === false) continue;
      const name = displayNames[id] ?? id;
      const checked =
        this.plugin.settings.statusBarProviders.includes(id);
      new Setting(containerEl)
        .setName(t("settings.statusBar.show", { name }))
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
