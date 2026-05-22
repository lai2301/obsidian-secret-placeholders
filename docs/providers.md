# Provider setup

Secret Placeholders talks to a password manager you run. Enable the
backends you use under *Settings → Secret Placeholders → Providers*;
disabled backends contribute no UI at all.

- [OpenBao / HashiCorp Vault](#openbao--hashicorp-vault)
- [1Password Connect](#1password-connect)
- [Bitwarden / Vaultwarden](#bitwarden--vaultwarden)
- [Placeholder syntax](#placeholder-syntax)

---

## OpenBao / HashiCorp Vault

The plugin uses the **KV v2** secrets engine.

**Settings** (*Settings → Secret Placeholders → OpenBao / Vault*):

| Field | Meaning |
|---|---|
| Server address | Base URL of your OpenBao/Vault server, e.g. `https://openbao.example.com` |
| OIDC role | The `oidc` auth role to use for browser login |
| Default mount | KV mount name (default `kv`) |
| Default path prefix | Prepended to suggested paths when saving (default `obsidian/`) |
| Cache TTL | Seconds a resolved secret stays in memory |
| Remember token | Encrypt the token on disk behind a passphrase |

**Logging in:**

- **Desktop** — click *Log in*. The plugin opens your identity provider
  in the system browser, captures the callback on `127.0.0.1`, and
  exchanges it for a Vault token. This is the same loopback flow the
  `bao`/`vault` CLI uses.
- **Mobile**, or as a fallback — click *Paste token* and paste a token
  obtained from `bao login` or the Vault web UI.

Server-side you need a KV v2 mount and (for browser login) an `oidc`
auth role whose policy permits read/write on your secret paths:

```bash
bao secrets enable -path=kv -version=2 kv

bao policy write obsidian - <<'EOF'
path "kv/data/obsidian/*"     { capabilities = ["create","read","update","delete","list"] }
path "kv/metadata/obsidian/*" { capabilities = ["read","list","delete"] }
path "auth/token/lookup-self" { capabilities = ["read"] }
path "auth/token/renew-self"  { capabilities = ["update"] }
EOF
```

---

## 1Password Connect

1Password Connect is a **self-hosted API gateway** in front of your
1Password account. It requires a 1Password **Business or Teams** plan —
Connect is not available on personal/family plans, and the plugin cannot
talk to 1Password without a Connect server.

1. In the 1Password admin: *Integrations → 1Password Connect Server →
   set up a new server*. Grant it access to the vaults you want to
   expose. Download `1password-credentials.json` and copy the **access
   token** shown on the same screen.
2. Run a Connect server with that credentials file (`connect-api` +
   `connect-sync` containers — see `dev/docker-compose.1p.yaml` in the
   repo).
3. In the plugin's **1Password Connect** settings, set the **Connect
   server URL**, a **default vault** name, and paste the **access
   token**.

Connect only sees the vaults you granted during setup.

---

## Bitwarden / Vaultwarden

One provider serves three things, differing only by server URL:

| Target | Server URL |
|---|---|
| Vaultwarden (self-hosted) | your instance, e.g. `https://vw.example.com` |
| Bitwarden cloud (US) | `https://vault.bitwarden.com` |
| Bitwarden cloud (EU) | `https://vault.bitwarden.eu` |

**Settings** (*Settings → Secret Placeholders → Bitwarden / Vaultwarden*):

| Field | Meaning |
|---|---|
| Server URL | as above |
| Email | your Bitwarden account email |
| Cache TTL | seconds the decrypted item list stays in memory |
| Remember session | persist the session encrypted on disk (see below) |

**Logging in:** click *Log in*, enter your email and master password.
The master password is used **locally** to derive your keys — only a
derived hash is sent to the server, never the password itself.

First login from a new device may trigger two extra prompts:

- **New-device verification** — Bitwarden cloud emails a 6-digit code.
- **Two-factor (TOTP)** — if 2FA is enabled, enter the code from your
  authenticator app.

**Remember session:** when on, the plugin encrypts your account's
encryption key and refresh token on disk under a passphrase you choose.
On the next Obsidian start it asks for that passphrase instead of your
master password. Off by default.

**Organizations:** items owned by a Bitwarden organization are supported
— the plugin unwraps each organization's key (via your RSA private key)
and decrypts org ciphers with it. New items you create still go to your
personal vault.

---

## Placeholder syntax

Every placeholder is `{{<prefix>:<reference>}}`. The reference shape
depends on the provider.

| Provider | Syntax | Example |
|---|---|---|
| OpenBao | `{{bao:<mount>/<path>#<key>}}` | `{{bao:kv/obsidian/github#token}}` |
| 1Password | `{{1p:<vault>/<item>#<field>}}` | `{{1p:Personal/GitHub#password}}` |
| Bitwarden | `{{vw:[<folder>/]<item>#<field>}}` | `{{vw:Work/CI#password}}` or `{{vw:GitHub#password}}` |

Notes:

- The Bitwarden **folder** segment is optional — `{{vw:GitHub#password}}`
  works for a root-level item.
- The **field** part selects which value on the item to show: `password`,
  `username`, `notes`, or any custom field label.
- References are matched **case-insensitively** but otherwise exactly. An
  item titled `GitHub - Personal` is not matched by `{{vw:GitHub#...}}`.
- A `/` inside an item title breaks the syntax (the first `/` is the
  folder separator). Rename the item, or reference it by its provider
  UUID instead of its name.
