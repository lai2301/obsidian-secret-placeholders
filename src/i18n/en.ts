// English message catalogue — the single source of truth for i18n keys.
//
// NOTE: intentionally NOT `as const`. We want `typeof en` to fix the *key
// set* while widening every value to `string`, so other locales must match
// the keys exactly (compile-time parity) but are free to supply any text.
//
// Interpolation uses single-brace tokens like {name}; this avoids colliding
// with the plugin's own double-brace placeholder syntax `{{provider:ref}}`,
// which can appear verbatim inside a translated string.
export const en = {
  // Command palette names
  "command.login": "Secrets: Login to active provider",
  "command.logout": "Secrets: Logout of active provider",
  "command.clearCache": "Secrets: Clear cache",
  "command.saveSelection": "Secrets: Save selection as secret",
  "command.insertPlaceholder": "Secrets: Insert placeholder",
  "command.browseInsert": "Secrets: Browse and insert placeholder",
  "command.browseCopy": "Secrets: Browse and copy value",
  "command.copyUnderCursor": "Secrets: Copy secret under cursor",
  "command.openIndex": "Secrets: Open placeholder index",

  // Notices
  "notice.noProviderConfigured": "No provider configured",
  "notice.loggedOut": "{provider}: logged out",
  "notice.cacheCleared": "Secret cache cleared",
  "notice.logInFirst": "{provider}: log in first",
  "notice.savedTo": "Saved to {ref}",
  "notice.saveFailed": "Save failed: {msg}",
  "notice.secretCopied": "Secret copied to clipboard",
  "notice.readFailed": "Read failed: {msg}",
  "notice.noPlaceholderUnderCursor": "No placeholder under cursor",

  // Settings — Display section
  "settings.displayHeading": "Display",
  "settings.maskMode.name": "Mask mode",
  "settings.maskMode.desc":
    "Whether resolved secrets are hidden by default. The placeholder text on disk is never the secret regardless of this setting.",
  "settings.maskMode.never": "Never (default)",
  "settings.maskMode.always": "Always",
  "settings.maskMode.manual": "Manual (masked, click to reveal)",
  "settings.clickAction.name": "Click action",
  "settings.clickAction.desc": "Action for a single click on a resolved secret.",
  "settings.modifierClickAction.name": "Modifier-click action",
  "settings.modifierClickAction.desc": "Action for Ctrl/Cmd + single click.",
  "settings.click.copy": "Copy",
  "settings.click.toggleMask": "Toggle mask",
  "settings.click.none": "Do nothing",
  "settings.maskCharacter.name": "Mask character",

  // Settings — Providers section
  "settings.providersHeading": "Providers",
  "settings.provider.enabledDesc":
    "Settings, status bar, and {example} placeholders are active.",
  "settings.provider.disabledDesc":
    "Disabled. No settings, no placeholders, no autocomplete.",
  "settings.statusBar.name": "Status bar",
  "settings.statusBar.desc":
    "Pick which providers show as chips in the status bar. Leave all unchecked to show every enabled provider.",
  "settings.statusBar.show": "Show {name}",

  // Settings — Language section
  "settings.language.name": "Language",
  "settings.language.desc":
    "Interface language. Command palette names update after reloading the plugin.",
  "settings.language.auto": "Automatic (match Obsidian)",
};

export type Messages = typeof en;
export type MessageKey = keyof Messages;
