# CLAUDE.md

Obsidian plugin that renders `{{<provider>:<ref>}}` placeholders as live
secrets from a password manager, while leaving the underlying `.md` file
untouched. v0.2 ships with OpenBao/Vault only; v0.3+ adds more providers
(1Password Connect, Vaultwarden + Bitwarden) behind the same interface.

## Build

```bash
npm install
npm run build       # production -> main.js
npm run dev         # watch mode
npm run typecheck
```

Install into the vault by symlinking (or copying) the built files into
`<vault>/.obsidian/plugins/secret-placeholders/`:

- `manifest.json`
- `main.js`
- `styles.css`

## Architecture

Providers are pluggable. Each lives under `src/providers/<id>.ts` and
implements the `Provider` interface in `src/providers/types.ts`. The
registry in `src/providers/registry.ts` collects all enabled providers,
builds the combined placeholder regex, and routes parsed refs to the
right provider.

The post-processor (`src/postProcessor.ts`) and live-preview decoration
(`src/livePreview.ts`) talk to the registry, never to a specific provider.

## Hard invariant

The post-processor and the live-preview decoration MUST NOT call
`editor.replace*`, `vault.modify`, or any other write API. They are
display-only. The only paths that ever mutate the active note are the
explicit user commands in `src/commands.ts` (`Insert placeholder`,
`Save selection as secret`). If you add a new render path, mirror that
rule.

## Auth (per provider)

Each provider owns its own auth flow via the `ProviderAuth` field on the
interface. Tokens live in memory by default. Optional "remember on this
device" encrypts with AES-GCM (PBKDF2-SHA256, 200k iterations) behind a
user passphrase before persisting to plugin data.

OpenBao supports an OIDC browser-callback flow on desktop (loopback
listener on 127.0.0.1:8250) and falls back to paste-token on mobile.

## Network

All provider HTTP traffic goes through Obsidian's `requestUrl`, not
`fetch`, so requests bypass CORS on both desktop and mobile. Do not
switch to `fetch` without configuring CORS on the backend.

## Backward compatibility

`{{bao:<mount>/<path>#<key>}}` from v0.1 keeps working unchanged in v0.2 -
it's the OpenBao provider's native syntax. The legacy v0.1 plugin folder
(`obsidian-openbao`) should be disabled after switching to the new
`secret-placeholders` install; settings do not auto-migrate (the only
existing user is the author).
