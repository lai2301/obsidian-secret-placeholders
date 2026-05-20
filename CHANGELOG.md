# Changelog

## 0.5.5

### Added
- **Edit secret value** flow.  Updates the backend secret without touching
  the note - placeholder text stays the same, only the stored value
  changes.  Surfaces in three places:
  - Right-click a placeholder widget -> *Edit secret value…*
  - Right-click selected text where the cursor is inside a placeholder
    (Source mode) -> same item
  - Sidebar index view: hover a placeholder row, click the pencil icon
    that appears on the right
  The modal optionally reveals the current value (eye toggle) before you
  type the replacement, so you can see what you're overwriting.  After
  save, the plugin invalidates the provider's cache and fires a state-
  change event so every rendered occurrence picks up the new value
  immediately.

## 0.5.4

### Fixed
- **"Save selection as secret" now offers one menu item per provider**.
  Previously it always saved to OpenBao because the right-click handler
  hard-coded the first registered provider.  Multi-provider users now
  see "Save selection to OpenBao / Vault", "Save selection to 1Password
  Connect", "Save selection to Bitwarden / Vaultwarden" side by side.
- **"Copy resolved value" and "Replace with resolved value…" now work
  reliably**.  Previously these only appeared when CodeMirror happened to
  place the cursor inside the placeholder range on right-click - fragile
  for widget hit-tests in Live Preview, and entirely absent in Reading
  mode (no editor-menu event).  Each rendered `.sp-secret` now owns a
  DOM-level contextmenu handler that shows the actions regardless of
  cursor position.  Replace in this path uses `vault.process` against
  the active file (replaces the first occurrence of the placeholder),
  so it works in Reading mode and Live Preview alike.

## 0.5.3

### Fixed
- **Logout left placeholders showing the old value.**  Auth-change events
  now always trigger a re-fetch on each span, so logging out transitions
  resolved spans back to `[secret: error]` instead of caching the
  previously-revealed value in memory.
- **Spinner stuck after logout when toggling mask.**  Spans now track a
  three-state `phase` (loading / ready / error) explicitly, and the
  click handler treats anything other than `ready` as a no-op.  Toggling
  mask mode after logout no longer triggers a spinner that never
  resolves.
- Concurrent in-flight loads are now deduped via a generation counter,
  so the result of a stale fetch can't overwrite a fresher result.

## 0.5.2

### Fixed
- Rendered placeholder spans now react to plugin state changes without a
  manual refresh.  Previously the post-processor and live-preview widgets
  rendered once and never updated, so:
  - Logging in after opening a note left existing `[secret: error]` spans
    stuck until you closed and reopened the file.
  - Toggling `Mask mode` / `Mask character` / `Click action` only applied
    to placeholders rendered after the change.
  The plugin now dispatches a `sp-state-change` event on every live
  `.sp-secret` element when auth state or settings change.  Each span's
  listener re-renders (settings) or re-fetches when previously in error
  state (auth).  Listeners are attached per-element, so they're naturally
  GC'd when the markdown view re-renders.

## 0.5.1

### Fixed
- Bitwarden cloud sync returned empty: my `/api/sync` parser only knew
  PascalCase keys (`Ciphers`, `Login`, `Password`), but recent server
  builds emit camelCase (`ciphers`, `login`, `password`).  Plugin was
  logged in successfully but the cipher list silently came back as zero
  items, so autocomplete after `{{vw:` was empty and every placeholder
  rendered as `[secret: error]` "item not found".  Sync responses are
  now normalised through a casing-tolerant parser, same approach the
  prelogin and `connect/token` responses already use.

## 0.5.0

The "rough edges" release.  Closes the Bitwarden gaps the v0.4 CHANGELOG
flagged, plus three new UX surfaces.

### Bitwarden
- **Argon2id KDF support** (`Kdf=1`).  New Bitwarden cloud accounts
  default to Argon2id since late 2023; the plugin now lazy-loads the
  `hash-wasm` Argon2 implementation and derives the master key when the
  prelogin response reports `kdf=1`.  PBKDF2 accounts unchanged.
- **Two-factor authentication (TOTP)**.  When the server replies with a
  2FA challenge, the plugin prompts for a 6-digit code from the user's
  authenticator app and retries the password grant.  Other 2FA methods
  (email, Duo, WebAuthn) are detected and rejected with a clear error
  pointing the user to enable TOTP.
- **Writable fields beyond `password`**.  `Save selection as secret` now
  works with the `username`, `notes`, and any custom field label on
  login-type ciphers.  Patches preserve sibling fields - updating a
  password no longer wipes a stored username.
- **Optional session persistence**.  New "Remember session on this
  device" toggle in the Bitwarden settings.  On login, encrypts the user
  key + refresh token with an unlock passphrase (AES-GCM, PBKDF2-SHA256,
  200k iterations).  On the next Obsidian start, the plugin prompts for
  the passphrase instead of the master password; on success it decrypts
  the user key and refreshes the access token.  No re-derivation needed.

### Autocomplete
- Typing `{{` alone now opens a **prefix picker** that lists every
  enabled provider.  Selecting one continues into that provider's
  per-secret list.
- Typing `{{<text>` without a colon opens a **cross-provider fuzzy
  search** across every enabled provider's secret list, with the
  provider name shown next to each result.
- Per-prefix typing (`{{bao:...`) is unchanged.

### Right-click + sidebar
- **Editor right-click menu** adds:
  - "Save selection as secret" on a non-empty selection.
  - "Copy resolved value" and "Replace with resolved value…" when the
    cursor is inside a `{{<prefix>:...}}` placeholder.  Copy is safe -
    clipboard only.  Replace is gated by a confirmation modal that shows
    a masked preview and explicitly warns the secret will land in the
    `.md` on disk.
- **Sidebar placeholder index**.  New ribbon icon (and command
  *Secrets: Open placeholder index*) opens a right-sidebar view that:
  - Scans every markdown file in the vault for placeholders.
  - Groups by provider, then by unique placeholder, then by usage site.
  - Click a usage row to open the file with the cursor on that line.
  - Filter input to narrow down by ref text.
  - Auto-refreshes (debounced) on vault changes.

### Internal
- Shared `src/crypto/passphraseEncryption.ts` lifted out of OpenBao's
  auth module; both OpenBao and Bitwarden session persistence use the
  same AES-GCM helpers now.

### Bundle size
- The Argon2 WASM module is bundled into `main.js` (CJS doesn't code-
  split), so the build grew from ~36 KB to ~290 KB.  Still well under
  Obsidian's typical plugin sizes.

## 0.4.3

### Fixed
- Bitwarden login modal could appear "stuck" while the async login work
  (PBKDF2 derivation + network calls) ran.  The Log in / Verify buttons
  now show a "Logging in…" / "Verifying…" state and are disabled while
  the work is in flight, and Enter-key submission no longer falls through
  to other handlers (`preventDefault`).
- New-device OTP modal could briefly overlap the login modal if the latter
  hadn't finished detaching.  The OTP modal now waits one tick before
  opening so the previous modal is fully gone.

## 0.4.2

### Added
- **Reactive login state in settings.**  Each provider section now shows
  a status pill at the top: `✓ Logged in` (with identity + TTL when
  available) or `✗ Not logged in`.  The button below is a single
  state-aware control - Log in when out, Log out when in.  The whole row
  refreshes automatically when auth state changes.
- **Per-provider enable/disable toggle.**  A new "Providers" section
  lets you turn off backends you don't use.  Disabled providers don't
  render settings, don't show in the status bar, don't process
  `{{<prefix>:...}}` placeholders, and don't appear in editor
  autocomplete - so a one-provider user sees a one-provider UI.
- **Status bar shows every enabled provider** with its own clickable
  chip (was: only the first registered provider).  Click any chip to
  log in / out of that specific backend.
- **Status-bar visibility settings.**  Pick which chips appear in the
  status bar if you find three of them noisy.

### Fixed
- Status-bar TTL countdown now refreshes when `onAuthChanged` fires for
  any provider, not just on a 15s interval.

## 0.4.1

### Fixed
- **Bitwarden new-device verification flow.** When Bitwarden cloud sees a
  login from a previously-unseen device identifier, it emails a 6-digit
  code and rejects the first password grant with `device_error`.  The
  plugin now catches that response, prompts for the code, and retries
  with `newDeviceOtp` set.
- Send `Bitwarden-Client-Name`/`Bitwarden-Client-Version` headers on every
  identity + API request.  Recent Vaultwarden builds (1.32+) reject
  requests without them; Bitwarden cloud has always sent them via the
  official clients.
- Accept both PascalCase and lowercase JSON keys in `prelogin` and
  `connect/token` responses (Vaultwarden returns lowercase; Bitwarden
  cloud returns PascalCase).

## 0.4.0

### Added
- **Bitwarden / Vaultwarden provider**.  Placeholders are
  `{{vw:[<folder>/]<item>#<field>}}` (folder is optional).  Reads
  `password` / `username` from login-type items plus any custom field by
  label.  Pointing the server URL at `https://vault.bitwarden.com` (US)
  or `https://vault.bitwarden.eu` (EU) makes the same provider work for
  Bitwarden cloud.
- All client crypto is pure WebCrypto (`src/providers/bitwarden/crypto.ts`):
  PBKDF2-SHA256 master-key derivation, HKDF-Expand stretching, AES-CBC-256
  + HMAC-SHA256 EncString decrypt/encrypt with constant-time MAC compare.
  No Node or WASM, so it runs on Obsidian mobile too.
- `dev/docker-compose.vw.yaml` for spinning up a local Vaultwarden.

### Known limitations
- Only the **PBKDF2** KDF is supported (`Kdf=0`).  Argon2id accounts must
  switch their KDF in *Account Settings -> Security -> Keys* on the web
  vault, or wait for v0.5 which will add an Argon2 polyfill.
- Only **EncString type 2** (`AesCbc256_HmacSha256_B64`) is supported.
  Type-0/1 items are rejected with a clear error rather than fail-open.
- Writes are limited to the **`password` field** of login-type items in
  this release.  Other writable fields (username, secure-note body,
  custom fields) come in v0.5.
- Sessions don't survive a full Obsidian restart yet: the master password
  is re-prompted on each cold start so the user key can be re-derived.
  v0.5 will add an opt-in encrypted-on-device user key.

## 0.3.0

### Added
- **1Password Connect provider**. Placeholders are
  `{{1p:<vault>/<item>#<field>}}`; auth via a long-lived Connect token
  pasted into settings. Works on desktop and mobile (the Connect server
  is HTTP, no platform-specific code).
- `dev/docker-compose.1p.yaml` for running a local 1Password Connect
  instance against your own 1Password account.
- Live Preview no longer flickers the raw placeholder text when you
  click a secret: the widget's `ignoreEvent` now suppresses CodeMirror's
  cursor-on-click behavior for `mousedown`/`click`, while leaving keyboard
  navigation intact.

### Changed
- Inline Re-login button uses capture-phase mousedown + `stopImmediatePropagation`
  so it can't accidentally trigger the parent span's click action.

## 0.2.0

First public release. Renamed from `obsidian-openbao`; the OpenBao backend
is still here, the plugin is now built to host multiple backends.

### Added
- Provider abstraction. The OpenBao backend was rewritten behind a generic
  `Provider` interface. Future backends (1Password Connect, Bitwarden /
  Vaultwarden, …) plug in via the same surface.
- **OIDC browser-callback login** for OpenBao on desktop. Opens your IdP
  (Authentik / Keycloak / Auth0 / …) in the system browser, captures the
  callback on `127.0.0.1`, exchanges the code for a Vault token. Mobile
  keeps the paste-token flow.
- **Editor autocomplete**: typing `{{bao:` (or any registered provider
  prefix) triggers a fuzzy picker of existing secrets.
- **Secret browser modal**: `Secrets: Browse and insert placeholder` and
  `Secrets: Browse and copy value` open a fuzzy search across every
  enabled provider.
- **Status-bar item** showing login state and remaining token TTL per
  provider. Click to log in / out.
- Inline **Re-login** button on secret-render errors when the provider
  reports logged-out.
- Loading **spinner** icon while a secret is being fetched.

### Changed
- **Masking is opt-in** (`Mask mode: never`) by default. The placeholder
  on disk is never the secret regardless of this setting; masking only
  controls how the value is shown after it's resolved.
- **Single click copies** the secret (configurable). Ctrl/Cmd-click
  toggles mask (also configurable). The previous click-to-reveal /
  dblclick-to-copy behavior has been replaced.
- Placeholder syntax unchanged: `{{bao:<mount>/<path>#<key>}}` keeps
  working with no migration. Future providers register their own prefixes
  (e.g. `{{1p:...}}`, `{{vw:...}}`).
- Commands renamed from `OpenBao: …` to `Secrets: …`.

### Migration from 0.1 (obsidian-openbao)
- Disable the old plugin in `<vault>/.obsidian/plugins/obsidian-openbao/`
  before enabling `secret-placeholders`. Settings do not auto-migrate; you
  will need to re-enter the OpenBao server URL and OIDC role once.
- The folder `<vault>/.obsidian/plugins/obsidian-openbao/` can be deleted
  after switching.
