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

  // Shared buttons
  "button.cancel": "Cancel",
  "button.save": "Save",
  "button.ok": "OK",
  "button.logIn": "Log in",
  "button.logOut": "Log out",

  // Context menu
  "contextMenu.saveSelectionTo": "Save selection to {provider}",
  "contextMenu.copyResolvedValue": "Copy resolved value",
  "contextMenu.editSecretValue": "Edit secret value…",
  "contextMenu.replaceWithResolved": "Replace with resolved value…",
  "contextMenu.noActiveFile": "No active file to replace in",
  "contextMenu.placeholderReplaced": "Placeholder replaced",
  "contextMenu.confirmReplace.title": "Write secret to file?",
  "contextMenu.confirmReplace.body":
    "Replacing this placeholder will write the secret ({preview}) inline as plain text in this note.  This is intentional in some workflows but it defeats the plugin's main purpose - the .md file on disk will contain the credential.",
  "contextMenu.confirmReplace.placeholder": "Placeholder: {ref}",
  "contextMenu.confirmReplace.replaceInline": "Replace inline",

  // Edit secret modal
  "modal.editSecret.title": "Edit secret value",
  "modal.editSecret.desc":
    "Updates the backend secret only — the placeholder text in your note stays the same.",
  "modal.editSecret.provider": "Provider: {provider}",
  "modal.editSecret.placeholder": "Placeholder: {ref}",
  "modal.editSecret.currentValue": "Current value",
  "modal.editSecret.clickToLoad": "(click to load)",
  "modal.editSecret.showHide": "Show / hide current value",
  "modal.editSecret.loading": "loading…",
  "modal.editSecret.error": "(error: {msg})",
  "modal.editSecret.newValue": "New value",
  "modal.editSecret.newValuePlaceholder": "new secret value",
  "modal.editSecret.enterValueFirst": "Enter a new value first",
  "modal.editSecret.updated": "Updated {ref}",
  "modal.editSecret.writeFailed": "Write failed: {msg}",

  // Token prompt modal
  "modal.token.title": "Paste token",
  "modal.token.desc":
    "Paste an authentication token from your provider. For OpenBao, run `bao login -method=oidc role=obsidian` or copy from the web UI.",
  "modal.token.placeholder": "token...",

  // Ref editor modal
  "modal.refEditor.title": "Secret location ({provider})",
  "modal.refEditor.optional": "{label} (optional)",

  // Secret browser modal
  "modal.secretBrowser.searchPlaceholder": "Search secrets…",

  // Secret span
  "span.reLogin": "Re-login",
  "span.copyFailed": "Failed to copy",

  // Auth status row
  "auth.checking": "Checking…",
  "auth.loggedIn": "Logged in",
  "auth.notLoggedIn": "Not logged in",
  "auth.ttl": "TTL {ttl}",

  // Sidebar
  "sidebar.displayName": "Secret placeholders",
  "sidebar.title": "Placeholder index",
  "sidebar.count": "  {refs} unique · {uses} uses",
  "sidebar.rescan": "Re-scan vault",
  "sidebar.filter": "Filter…",
  "sidebar.empty": "No placeholders found in this vault.",
  "sidebar.groupHeader": "{provider}  ({refs} unique · {uses} uses)",
  "sidebar.editSecret": "Edit secret value",
  "sidebar.providerNotEnabled": "Provider '{provider}' isn't enabled",
  "sidebar.parseError": "Couldn't parse placeholder",
  "sidebar.openFailed": "Could not open Secret Placeholders sidebar",

  // Provider — Bitwarden
  "provider.bitwarden.serverNotSet":
    "Bitwarden: set the server URL in settings first",
  "provider.bitwarden.sessionRestored": "Bitwarden session restored",
  "provider.bitwarden.restoreFailed":
    "Could not restore Bitwarden session: {msg}. Use 'Log in' to sign in with master password.",
  "provider.bitwarden.unlockSession": "Unlock Bitwarden session",
  "provider.bitwarden.setUnlockPassphrase":
    "Set unlock passphrase for this device",
  "provider.bitwarden.loggedIn": "Bitwarden: logged in",
  "provider.bitwarden.loginFailed": "Bitwarden login failed: {msg}",
  "provider.bitwarden.serverHeading": "Bitwarden / Vaultwarden",
  "provider.bitwarden.serverUrl.name": "Server URL",
  "provider.bitwarden.serverUrl.desc":
    "Vaultwarden instance, e.g. https://vw.example.com. For Bitwarden cloud use https://vault.bitwarden.com (US) or https://vault.bitwarden.eu (EU).",
  "provider.bitwarden.email.name": "Email",
  "provider.bitwarden.cacheTtl.name": "Cache TTL (seconds)",
  "provider.bitwarden.cacheTtl.desc":
    "How long the decrypted cipher list is kept in memory.",
  "provider.bitwarden.rememberSession.name": "Remember session on this device",
  "provider.bitwarden.rememberSession.desc":
    "On login, encrypt the user key + refresh token with a passphrase and store them on disk. On the next Obsidian start you'll be prompted for the passphrase instead of the master password. Off by default.",

  // Provider — Bitwarden login modal
  "provider.bitwarden.loginTitle": "Log in to Bitwarden / Vaultwarden",
  "provider.bitwarden.loginServer": "Server: {server}",
  "provider.bitwarden.loginServerUnset": "(set the server URL in settings first)",
  "provider.bitwarden.loginMasterPasswordHint":
    "Your master password is used locally to derive the keys; only a derived hash is sent to the server.",
  "provider.bitwarden.emailField": "Email",
  "provider.bitwarden.masterPassword": "Master password",
  "provider.bitwarden.loggingIn": "Logging in…",
  "provider.bitwarden.twoFactorTitle": "Two-factor authentication",
  "provider.bitwarden.twoFactorHint":
    "Enter the 6-digit code from your authenticator app to finish logging in.",
  "provider.bitwarden.code": "Code",
  "provider.bitwarden.verify": "Verify",
  "provider.bitwarden.verifying": "Verifying…",
  "provider.bitwarden.newDeviceTitle": "New device verification",
  "provider.bitwarden.newDeviceHint":
    "Bitwarden emailed a 6-digit code to {email}.  Paste it below to finish logging in.  This is a one-time check for this device.",

  // Provider — OpenBao
  "provider.openbao.loginOkPolicies": "OpenBao login OK - policies: {policies}",
  "provider.openbao.loginOk": "OpenBao login OK",
  "provider.openbao.policiesNone": "(none)",
  "provider.openbao.oidcLoginFailed": "OIDC login failed: {msg}",
  "provider.openbao.tokenRejected": "OpenBao token rejected: {msg}",
  "provider.openbao.heading": "OpenBao / Vault",
  "provider.openbao.pasteToken": "Paste token",
  "provider.openbao.serverAddress.name": "Server address",
  "provider.openbao.serverAddress.desc":
    "Base URL of the OpenBao server. No trailing slash.",
  "provider.openbao.oidcRole.name": "OIDC role",
  "provider.openbao.defaultMount.name": "Default mount",
  "provider.openbao.defaultPathPrefix.name": "Default path prefix",
  "provider.openbao.defaultPathPrefix.desc":
    'e.g. "obsidian/" - prepended to suggested secret paths.',
  "provider.openbao.cacheTtl.name": "Cache TTL (seconds)",
  "provider.openbao.cacheTtl.desc":
    "How long resolved secrets are kept in memory.",
  "provider.openbao.rememberToken.name": "Remember token on this device",
  "provider.openbao.rememberToken.desc":
    "Encrypts the token with a passphrase and stores it in plugin data.",

  // Provider — 1Password
  "provider.onepassword.loggedIn": "1Password Connect: logged in",
  "provider.onepassword.tokenRejected":
    "1Password Connect: token rejected ({msg})",
  "provider.onepassword.heading": "1Password Connect",
  "provider.onepassword.serverUrl.name": "Connect server URL",
  "provider.onepassword.serverUrl.desc":
    "Base URL of your self-hosted 1Password Connect server.",
  "provider.onepassword.defaultVault.name": "Default vault",
  "provider.onepassword.defaultVault.desc":
    "Vault name or id used as the default for new placeholders. Leave empty to scan all vaults.",
  "provider.onepassword.cacheTtl.name": "Cache TTL (seconds)",
  "provider.onepassword.cacheTtl.desc":
    "How long resolved 1Password items are kept in memory.",
};

export type Messages = typeof en;
export type MessageKey = keyof Messages;
