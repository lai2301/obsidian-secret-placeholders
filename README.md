# Secret Placeholders

An Obsidian plugin that embeds password-manager secrets in notes as
**placeholders** so the underlying `.md` never contains the actual
credential.

```
My GitHub token: {{bao:kv/obsidian/github#token}}
```

In Obsidian you see the secret; on disk, in git, and to any LLM agent
managing your vault, the file only contains the placeholder.

## Why

LLM-assisted note management is popular — agents read your vault, refactor
notes, build summaries. None of that is a problem until the vault holds
credentials. Most people work around this by keeping secrets in a separate
password manager, but that leaves notes that reference those secrets
half-broken: you can't see the value while reading or editing.

This plugin closes the loop. The note keeps a tiny placeholder. The plugin
fetches the real value from your password manager at render time and shows
it inline. Roles:

- **You** see the secret in Obsidian.
- **LLM agents** see only `{{bao:...}}` — a path, not a value.
- **Git history** is safe to publish, share, or feed to a model.

## Backends

| Backend                            | Status  | Notes |
|------------------------------------|---------|-------|
| OpenBao / HashiCorp Vault          | ✅ v0.2 | KV v2; token + OIDC browser login |
| 1Password Connect                  | ✅ v0.3 | Self-hosted Connect server; Bearer token |
| Vaultwarden / Bitwarden self-hosted| ✅ v0.5 | Master-password unlock; PBKDF2 + Argon2id; TOTP 2FA |
| Bitwarden cloud                    | ✅ v0.5 | Same provider; point baseUrl at vault.bitwarden.com |

Each backend gets its own placeholder prefix:
`{{bao:...}}`, `{{1p:...}}`, `{{vw:...}}`.

## How it works

1. You set up your password manager (OpenBao at `https://bao.example.com`).
2. You log into the plugin (OIDC browser flow on desktop; paste-token on
   mobile).
3. You write notes with `{{bao:kv/personal/github#token}}` where the
   secret should appear.
4. In Live Preview and Reading mode the placeholder renders as the real
   value. Click to copy.
5. The actual `.md` file is byte-identical to what you typed: no value
   ever lands on disk.

To save a new secret while editing: select the credential text, run
**Secrets: Save selection as secret** from the command palette, accept
the suggested path, and the selection is replaced with the placeholder
while the value is written to your password manager.

## Settings

- **Mask mode** — `never` (default), `always`, or `manual`. The on-disk
  text is never the secret regardless; this only controls how the
  resolved value is shown.
- **Click action** — `copy` (default), `toggle mask`, or `none`.
- **Modifier-click action** — Ctrl/Cmd + click; defaults to `toggle mask`.
- Each provider has its own section: server URL, auth method, default
  paths.

## Hard invariant

The Live Preview decoration and the Reading-mode post-processor are
display-only. They never call `editor.replace*`, never write to the vault.
The only paths that can mutate a note are explicit commands you trigger
yourself (Insert placeholder, Save selection as secret). If you read the
source, you can verify this in `src/postProcessor.ts` and
`src/livePreview.ts`.

## OpenBao quick start

```bash
bao secrets enable -path=kv -version=2 kv

bao auth enable oidc
bao write auth/oidc/config \
  oidc_discovery_url=https://auth.example.com/application/o/openbao/ \
  oidc_client_id=... oidc_client_secret=... default_role=obsidian

bao policy write obsidian-rw - <<'EOF'
path "kv/data/obsidian/*"     { capabilities=["create","read","update","delete","list"] }
path "kv/metadata/obsidian/*" { capabilities=["read","list","delete"] }
path "auth/token/lookup-self" { capabilities=["read"] }
path "auth/token/renew-self"  { capabilities=["update"] }
EOF

bao write auth/oidc/role/obsidian \
  bound_audiences=<client_id> \
  allowed_redirect_uris=https://bao.example.com/ui/vault/auth/oidc/oidc/callback,http://localhost:8250/oidc/callback \
  user_claim=sub policies=obsidian-rw ttl=8h
```

Then in the plugin's settings tab, set the OpenBao server URL and click
**Login with OIDC** (desktop) or paste a token (mobile).

## Install

Until this is in the community-store, install manually:

1. Build: `npm install && npm run build`.
2. Copy `manifest.json`, `main.js`, `styles.css` into
   `<vault>/.obsidian/plugins/secret-placeholders/`.
3. Enable in *Settings → Community plugins*.

## Contributing

New backends are very welcome. Implement the `Provider` interface in
`src/providers/types.ts`, register it in `src/main.ts`, and open a PR.
The OpenBao provider in `src/providers/openbao/` is a working reference.

Tests: there are none yet. The hard invariant about display-only renderers
is enforced by code review; if you add a third render path, please keep
that property.

## License

MIT. See `LICENSE`.
