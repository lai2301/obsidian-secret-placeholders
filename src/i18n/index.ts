// Tiny zero-dependency i18n runtime.
//
// Usage:
//   import { t, setLocale } from "./i18n";
//   setLocale(settings.language);          // once on load + on settings change
//   new Notice(t("notice.cacheCleared"));
//   new Notice(t("notice.savedTo", { ref }));
import { en, type Messages, type MessageKey } from "./en";
import { it } from "./it";
import { zh } from "./zh";
import { zhTW } from "./zh-TW";
import { ja } from "./ja";
import { ko } from "./ko";

/** Concrete locales we ship. Keys match Obsidian's own UI language codes so
 *  "auto" resolution is a direct lookup. */
export type Locale = "en" | "it" | "zh" | "zh-TW" | "ja" | "ko";
/** Setting value: a concrete locale or "auto" (follow Obsidian's UI). */
export type Lang = "auto" | Locale;

const LOCALES: Record<Locale, Messages> = { en, it, zh, "zh-TW": zhTW, ja, ko };

let active: Messages = en;

/** Obsidian stores the chosen UI language code in localStorage under
 *  "language" (empty/absent means English). Read defensively — the key or
 *  localStorage itself may be unavailable. */
function obsidianLocale(): string {
  try {
    return window.localStorage.getItem("language") ?? "en";
  } catch {
    return "en";
  }
}

/** Resolve a setting value to a concrete, shipped locale. */
export function resolveLocale(setting: Lang): Locale {
  const code = setting === "auto" ? obsidianLocale() : setting;
  return code in LOCALES ? (code as Locale) : "en";
}

/** Point the translator at the locale implied by the current setting. */
export function setLocale(setting: Lang): void {
  active = LOCALES[resolveLocale(setting)];
}

/** Translate a key, interpolating {name} tokens from params. */
export function t(key: MessageKey, params?: Record<string, string | number>): string {
  let text = active[key];
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.split(`{${name}}`).join(String(value));
    }
  }
  return text;
}

/** Dropdown options for the language setting. Native language names are not
 *  translated; only the "auto" label is localized. */
export function languageOptions(): Record<Lang, string> {
  return {
    auto: t("settings.language.auto"),
    en: "English",
    it: "Italiano",
    zh: "简体中文",
    "zh-TW": "繁體中文",
    ja: "日本語",
    ko: "한국어",
  };
}
