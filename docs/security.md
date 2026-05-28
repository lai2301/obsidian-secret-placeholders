# Security, network use & troubleshooting

- [Security model](#security-model)
- [Permissions & data access](#permissions--data-access)
- [Network use](#network-use)
- [Known limitations](#known-limitations)
- [Troubleshooting](#troubleshooting)

---

## Security model

- **The `.md` file never contains the secret value.** It contains only
  the placeholder text. This holds for the file on disk, in git, in
  backups, and in anything that reads the raw file.
- **Resolved values live in memory only**, in a cache with a configurable
  TTL. *Clear cache* and logout drop them.
- **Tokens / sessions** are kept in memory by default. The optional
  "remember on device" settings encrypt them at rest with AES-GCM, using
  a key derived from a passphrase you choose (PBKDF2-HMAC-SHA256, 200,000
  iterations). The passphrase is never stored.
- **Bitwarden master password** is used only locally to derive keys.
  Only a derived password hash is sent to the server; the password
  itself never leaves your device. All client crypto (PBKDF2, Argon2id,
  HKDF, AES-CBC-HMAC, RSA-OAEP) runs in WebCrypto / WASM on your device.
- The rendering paths are **display-only** and cannot modify a note.
  Only explicit user commands write to a file, and the one that writes a
  raw secret (*Replace with resolved value*) is confirmation-gated.

If you publish notes from your vault, also strip placeholders in your
publish pipeline as defense-in-depth — a leaked placeholder reveals a
secret *path*, not its value, but paths can still be sensitive.

## Permissions & data access

What the plugin touches, and why. This mirrors the disclosures the
Obsidian community-plugin review surfaces.

- **Network requests** — only to the provider URLs you configure
  (OpenBao, 1Password Connect, Bitwarden/Vaultwarden). No
  author-controlled endpoints, telemetry, or analytics. All requests
  go through Obsidian's `requestUrl`. See [Network use](#network-use).
- **Vault file enumeration** — the Secrets sidebar lists markdown files
  via `vault.getMarkdownFiles()` to scan them for `{{provider:ref}}`
  placeholders so you can see where each secret is referenced. File
  *contents* are scanned for the placeholder regex only; they are not
  sent anywhere.
- **Clipboard write** — *Copy secret to clipboard* commands (command
  palette, right-click on a rendered secret, sidebar) call
  `navigator.clipboard.writeText`. Triggered only by an explicit user
  action.
- **Base64 (`atob` / `btoa`)** — used to encode/decode the binary inputs
  and outputs of WebCrypto (AES-GCM ciphertext, salts, IVs) and
  Bitwarden's EncString format. Not used to obfuscate code or strings.
- **WebAssembly** — `hash-wasm` provides PBKDF2 and Argon2id for
  Bitwarden key derivation and for the optional "remember on device"
  passphrase encryption. The WASM blobs are the published `hash-wasm`
  package, bundled at build time; no WASM is fetched at runtime.
- **No file writes from render paths.** The Reading-view post-processor
  and Live Preview decoration never modify a note. Only explicit user
  commands write to a file, and *Replace with resolved value* is
  confirmation-gated.

Release artifacts (`main.js`, `manifest.json`, `styles.css`) are
published with a [GitHub artifact attestation](https://docs.github.com/en/actions/security-guides/using-artifact-attestations-to-establish-provenance-for-builds)
linking each asset to the workflow run and commit that built it.

## Network use

The plugin makes network requests **only to the server URLs you
configure** — your OpenBao server, your 1Password Connect server, your
Bitwarden/Vaultwarden server. It never contacts an author-controlled or
third-party endpoint, sends no telemetry, and bundles no analytics.

All requests go through Obsidian's `requestUrl`, so they work on desktop
and mobile without CORS configuration on the backend.

The OpenBao OIDC browser-login flow (desktop only) starts a short-lived
loopback HTTP listener on `127.0.0.1` to catch the OAuth redirect, then
shuts it down. This is the standard OAuth loopback pattern and is guarded
to desktop builds only.

## Known limitations

- **Bitwarden 2FA** — TOTP (authenticator app) only. Email, Duo, and
  WebAuthn second factors are not supported; switch the account to TOTP
  to use the plugin.
- **Bitwarden cipher format** — only the current EncString type
  (`AesCbc256_HmacSha256`) is read. Very old items may need re-encrypting
  via an official Bitwarden client.
- **1Password** requires a self-hosted Connect server and a Business or
  Teams plan.
- **OIDC browser login** for OpenBao is desktop-only. Mobile uses
  paste-token.
- **Replace with resolved value** in Reading mode replaces the first
  occurrence of the placeholder in the active file.
- **One account per provider.** Two OpenBao servers, or a personal plus a
  work 1Password, are not supported simultaneously.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `[secret: error]` with a Re-login button | Not logged in, or the session expired. Click Re-login. |
| `[secret: error]`, tooltip says "not found" | The reference doesn't match an item exactly (case aside), or it's a 1Password vault not granted to Connect. |
| Autocomplete after `{{vw:` shows nothing | Logged in but the item list is empty — check the item is a login or secure-note item. |
| Spinner never resolves | Network failure reaching the server URL — verify the URL and that the server is reachable from your device. |
| Bitwarden login fails: "unsupported KDF" | Older plugin builds only — update the plugin; Argon2id is supported. |

The command *Secrets: Clear cache* forces a fresh fetch without
restarting Obsidian.
