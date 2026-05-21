// Bitwarden / Vaultwarden / Bitwarden cloud provider.
//
// Placeholder syntax: {{vw:[<folder>/]<item>#<field>}}
//   - <folder> is optional.  If present, must match a folder name exactly.
//   - <item> is the cipher (item) title.
//   - <field> is one of:
//       - "password" (default) -> Login.Password
//       - "username" -> Login.Username
//       - <custom field label> from cipher.Fields[]
//
// Why both Vaultwarden and Bitwarden cloud here?  Same REST API, different
// hostname.  The Settings tab just takes a baseUrl - point it at your
// Vaultwarden instance, or at https://vault.bitwarden.com for cloud, or
// https://api.bitwarden.eu for the EU region.

import { Notice, Setting } from "obsidian";

import { renderAuthStatusRow } from "../../authStatusRow";
import {
  decryptBytesWithPassphrase,
  decryptStringWithPassphrase,
  encryptBytesWithPassphrase,
  encryptStringWithPassphrase,
} from "../../crypto/passphraseEncryption";
import {
  NoteContext,
  PluginContext,
  Provider,
  ProviderAuth,
  ProviderAuthStatus,
  ProviderRef,
} from "../types";
import {
  BitwardenClient,
  BitwardenApiError,
  CustomFieldEnc,
  LoginCipherPayload,
  newDeviceIdentifier,
} from "./client";
import {
  BitwardenCryptoError,
  SymmetricKey,
  decryptString,
  deriveMasterKey,
  encryptString,
  masterPasswordHash,
  stretchMasterKey,
  unlockUserKey,
} from "./crypto";
import {
  BitwardenLoginModal,
  NewDeviceOtpModal,
  TwoFactorOtpModal,
} from "./loginModal";

// {{vw:[<folder>/]<item>#<field>}}
// We allow the folder portion to be omitted - the regex captures it as an
// empty group when the placeholder has no `/`.  This keeps simple
// references like {{vw:GitHub#password}} readable.
const PLACEHOLDER_RE =
  /\{\{vw:(?:([^/#{}]+)\/)?([^/#{}]+)#([^{}]+)\}\}/g;

export interface BitwardenSettings {
  baseUrl: string;
  email: string;
  deviceIdentifier: string;
  /** When true, the user key + refresh token are persisted under a user
   *  passphrase (AES-GCM via passphraseEncryption.ts) so cold-starting
   *  Obsidian doesn't re-prompt for the master password. */
  rememberSession: boolean;
  /** AES-GCM(passphrase)(64-byte user key).  Lets us decrypt ciphers
   *  after restart without re-deriving via PBKDF2/Argon2. */
  encryptedUserKey: string | null;
  /** AES-GCM(passphrase)(refresh_token).  Lets us mint a fresh access
   *  token without re-asking for the master password. */
  encryptedRefreshToken: string | null;
  cacheTtlSec: number;
}

const DEFAULTS: BitwardenSettings = {
  baseUrl: "",
  email: "",
  deviceIdentifier: "",
  rememberSession: false,
  encryptedUserKey: null,
  encryptedRefreshToken: null,
  cacheTtlSec: 300,
};

interface DecryptedCipher {
  id: string;
  name: string;
  folderId: string | null;
  folderName: string | null;
  password: string | null;
  username: string | null;
  fields: Map<string, string>;
  /** Original EncStrings, so writeKey can echo back sibling fields it isn't
   *  touching instead of accidentally clearing them on PUT. */
  raw: {
    nameEnc: string;
    usernameEnc: string | null;
    passwordEnc: string | null;
    notesEnc: string | null;
    /** Custom fields, keyed by lowercased label. */
    fields: Map<
      string,
      { nameEnc: string; valueEnc: string | null; type: number }
    >;
  };
}

export class BitwardenProvider implements Provider {
  readonly id = "vw";
  readonly displayName = "Bitwarden / Vaultwarden";
  readonly placeholderPrefix = "vw:";
  readonly placeholderRegex = PLACEHOLDER_RE;
  // Folder is optional - a root-level item is referenced as {{vw:item#field}}.
  readonly optionalRefParts = ["folder"];

  private settings: BitwardenSettings = { ...DEFAULTS };
  private client: BitwardenClient | null = null;
  /** User encryption key, in memory only.  Cleared on logout. */
  private userKey: SymmetricKey | null = null;
  /** Decrypted cipher cache.  Refreshed on demand. */
  private ciphers: DecryptedCipher[] | null = null;
  private cipherCacheExpires = 0;
  private syncInflight: Promise<DecryptedCipher[]> | null = null;
  private listeners = new Set<() => void>();

  auth: ProviderAuth;

  constructor(private ctx: PluginContext) {
    this.auth = {
      status: async (): Promise<ProviderAuthStatus> => {
        if (!this.client || !this.userKey) return { loggedIn: false };
        return {
          loggedIn: this.client.hasValidAccessToken(),
          identity: this.settings.email || undefined,
        };
      },
      login: async () => {
        if (!this.settings.baseUrl) {
          new Notice("Bitwarden: set the server URL in settings first");
          return;
        }
        return this.startLoginFlow();
      },
      logout: async () => {
        this.client?.clearTokens();
        this.userKey = null;
        this.ciphers = null;
        this.cipherCacheExpires = 0;
        this.settings.encryptedUserKey = null;
        this.settings.encryptedRefreshToken = null;
        await this.persist();
        this.ctx.notifyAuthChanged(this.id);
        this.notify();
      },
      onChange: (cb) => {
        this.listeners.add(cb);
        return () => this.listeners.delete(cb);
      },
    };
  }

  private notify(): void {
    for (const cb of this.listeners) {
      try {
        cb();
      } catch {
        /* swallow */
      }
    }
  }

  async init(): Promise<void> {
    const saved = await this.ctx.loadProviderData<BitwardenSettings>(this.id);
    if (saved) this.settings = { ...DEFAULTS, ...saved };
    if (!this.settings.deviceIdentifier) {
      this.settings.deviceIdentifier = newDeviceIdentifier();
      await this.persist();
    }
    if (this.settings.baseUrl) {
      this.client = new BitwardenClient({
        baseUrl: this.settings.baseUrl,
        deviceIdentifier: this.settings.deviceIdentifier,
        clientVersion: this.ctx.pluginVersion ?? "0.0.0",
      });
    }
    // Restore a persisted session if the user opted in.  This prompts for
    // an unlock passphrase; on success we decrypt the user key + refresh
    // token and mint a fresh access token via the refresh_token grant,
    // skipping master-password derivation entirely.
    void this.tryRestoreSession();
  }

  private async tryRestoreSession(): Promise<void> {
    if (
      !this.settings.rememberSession ||
      !this.settings.encryptedUserKey ||
      !this.settings.encryptedRefreshToken ||
      !this.client
    ) {
      return;
    }
    const passphrase = await this.ctx.promptPassphrase(
      "Unlock Bitwarden session",
    );
    if (!passphrase) return;
    try {
      const userKeyBytes = await decryptBytesWithPassphrase(
        this.settings.encryptedUserKey,
        passphrase,
      );
      if (userKeyBytes.length !== 64) {
        throw new Error(
          `restored user key has wrong length (${userKeyBytes.length})`,
        );
      }
      const refreshToken = await decryptStringWithPassphrase(
        this.settings.encryptedRefreshToken,
        passphrase,
      );
      // Stash the refresh token on the client so refresh() can use it.
      this.client.setTokens("", 0, refreshToken);
      const refreshed = await this.client.refresh();
      this.client.setTokens(
        refreshed.access_token,
        refreshed.expires_in,
        refreshed.refresh_token ?? refreshToken,
      );
      this.userKey = {
        encKey: userKeyBytes.slice(0, 32),
        macKey: userKeyBytes.slice(32, 64),
      };
      this.ctx.notifyAuthChanged(this.id);
      this.notify();
      new Notice("Bitwarden session restored");
    } catch (e) {
      // Wrong passphrase or expired refresh token - leave the encrypted
      // blobs in place and fall back to the regular master-password flow.
      new Notice(
        `Could not restore Bitwarden session: ${(e as Error).message}. ` +
          `Use 'Log in' to sign in with master password.`,
      );
    }
  }

  private async persistSession(
    userKey: { encKey: Uint8Array; macKey: Uint8Array },
    refreshToken: string | null,
  ): Promise<void> {
    if (!refreshToken) {
      // Without a refresh token we can't restore later, so don't bother
      // persisting the user key either.
      this.settings.encryptedUserKey = null;
      this.settings.encryptedRefreshToken = null;
      await this.persist();
      return;
    }
    const passphrase = await this.ctx.promptPassphrase(
      "Set unlock passphrase for this device",
    );
    if (!passphrase) {
      // User cancelled - turn rememberSession back off and clear any old
      // blobs so the next cold-start doesn't show a misleading prompt.
      this.settings.rememberSession = false;
      this.settings.encryptedUserKey = null;
      this.settings.encryptedRefreshToken = null;
      await this.persist();
      return;
    }
    const packed = new Uint8Array(64);
    packed.set(userKey.encKey, 0);
    packed.set(userKey.macKey, 32);
    this.settings.encryptedUserKey = await encryptBytesWithPassphrase(
      packed,
      passphrase,
    );
    this.settings.encryptedRefreshToken = await encryptStringWithPassphrase(
      refreshToken,
      passphrase,
    );
    await this.persist();
  }

  private async persist(): Promise<void> {
    await this.ctx.saveProviderData(this.id, this.settings);
  }

  private promptDeviceOtp(email: string): Promise<string | null> {
    return new Promise<string | null>((resolve) => {
      window.setTimeout(() => {
        new NewDeviceOtpModal(this.ctx.app, email, (code) =>
          resolve(code),
        ).open();
      }, 50);
    });
  }

  private promptTwoFactorOtp(): Promise<string | null> {
    return new Promise<string | null>((resolve) => {
      window.setTimeout(() => {
        new TwoFactorOtpModal(this.ctx.app, (code) => resolve(code)).open();
      }, 50);
    });
  }

  private async startLoginFlow(): Promise<void> {
    return new Promise<void>((resolve) => {
      new BitwardenLoginModal(
        this.ctx.app,
        this.settings.email,
        this.settings.baseUrl,
        async (creds) => {
          if (!creds) return resolve();
          try {
            await this.performLogin(creds.email, creds.masterPassword);
            new Notice("Bitwarden: logged in");
          } catch (e) {
            new Notice(`Bitwarden login failed: ${(e as Error).message}`);
          }
          this.ctx.notifyAuthChanged(this.id);
          this.notify();
          resolve();
        },
      ).open();
    });
  }

  private async performLogin(
    email: string,
    masterPassword: string,
  ): Promise<void> {
    if (!this.client) {
      throw new Error("Bitwarden server URL is not set");
    }
    this.settings.email = email;
    await this.persist();

    const pre = await this.client.prelogin(email);
    const masterKey = await deriveMasterKey(masterPassword, email, {
      kdf: pre.kdf,
      iterations: pre.kdfIterations,
      memory: pre.kdfMemory,
      parallelism: pre.kdfParallelism,
    });
    const passwordHash = await masterPasswordHash(masterKey, masterPassword);
    const stretched = await stretchMasterKey(masterKey);

    const deviceName = "Obsidian Secret Placeholders";
    const attempt = (
      extras: {
        newDeviceOtp?: string;
        twoFactor?: { token: string; provider: string };
      } = {},
    ) => this.client!.login(email, passwordHash, deviceName, extras);

    let loginRes;
    let newDeviceOtp: string | undefined;
    let twoFactor: { token: string; provider: string } | undefined;

    // Up to three attempts: first plain, then with each missing piece
    // (device OTP, 2FA TOTP) on demand.  Both challenges can appear in
    // any order depending on the server.
    for (let i = 0; i < 3; i++) {
      try {
        loginRes = await attempt({ newDeviceOtp, twoFactor });
        break;
      } catch (e) {
        if (BitwardenClient.isDeviceVerificationError(e) && !newDeviceOtp) {
          const otp = await this.promptDeviceOtp(email);
          if (!otp) throw new Error("Device verification cancelled");
          newDeviceOtp = otp;
          continue;
        }
        const twoFa = BitwardenClient.parseTwoFactorChallenge(e);
        if (twoFa && !twoFactor) {
          if (!twoFa.providers.includes(0)) {
            throw new Error(
              `Two-factor required but TOTP is not enabled on this account (providers: ${twoFa.providers.join(", ")}). ` +
                `Enable TOTP in the Bitwarden web vault, or wait for plugin support for other methods.`,
            );
          }
          const code = await this.promptTwoFactorOtp();
          if (!code) throw new Error("Two-factor verification cancelled");
          twoFactor = { token: code, provider: "0" };
          continue;
        }
        throw e;
      }
    }
    if (!loginRes) throw new Error("login retries exhausted");
    this.client.setTokens(
      loginRes.access_token,
      loginRes.expires_in,
      loginRes.refresh_token ?? null,
    );
    this.userKey = await unlockUserKey(stretched, loginRes.key);
    // Invalidate any cached ciphers from a previous session.
    this.ciphers = null;
    this.cipherCacheExpires = 0;

    if (this.settings.rememberSession) {
      await this.persistSession(this.userKey, loginRes.refresh_token ?? null);
    }
  }

  parseRef(raw: string): ProviderRef | null {
    const m = new RegExp(PLACEHOLDER_RE.source).exec(raw);
    if (!m) return null;
    return {
      provider: this.id,
      raw: m[0],
      parts: { folder: m[1] ?? "", item: m[2], field: m[3] },
    };
  }

  formatRef(parts: Record<string, string>): string {
    const { folder, item, field } = parts;
    if (folder) return `{{vw:${folder}/${item}#${field}}}`;
    return `{{vw:${item}#${field}}}`;
  }

  async readKey(ref: ProviderRef): Promise<string> {
    const ciphers = await this.getCiphers();
    const match = findCipher(ciphers, ref.parts.folder, ref.parts.item);
    if (!match) {
      throw new BitwardenApiError(
        404,
        `item '${ref.parts.item}' not found`,
        `item '${ref.parts.item}' not found in Bitwarden`,
      );
    }
    const field = (ref.parts.field ?? "").toLowerCase();
    if (field === "password") {
      if (match.password === null) {
        throw new BitwardenApiError(404, "no password on item");
      }
      return match.password;
    }
    if (field === "username") {
      if (match.username === null) {
        throw new BitwardenApiError(404, "no username on item");
      }
      return match.username;
    }
    const v = match.fields.get(field);
    if (v === undefined) {
      throw new BitwardenApiError(404, `field '${ref.parts.field}' not found`);
    }
    return v;
  }

  async writeKey(ref: ProviderRef, value: string): Promise<void> {
    if (!this.client || !this.userKey) {
      throw new BitwardenApiError(401, "not logged in to Bitwarden");
    }
    const fieldLabel = ref.parts.field ?? "";
    const field = fieldLabel.toLowerCase();
    const ciphers = await this.getCiphers();
    const existing = findCipher(ciphers, ref.parts.folder, ref.parts.item);
    const folderId = await this.resolveFolderId(ref.parts.folder);

    if (existing) {
      // Patch: start from the existing EncStrings so sibling fields don't
      // get blown away.  Overwrite just the target slot.
      const payload: LoginCipherPayload = {
        nameEnc: existing.raw.nameEnc,
        folderIdOrNull: folderId ?? existing.folderId,
        usernameEnc: existing.raw.usernameEnc,
        passwordEnc: existing.raw.passwordEnc,
        notesEnc: existing.raw.notesEnc,
        fields: [...existing.raw.fields.values()].map((f) => ({
          nameEnc: f.nameEnc,
          valueEnc: f.valueEnc,
          type: f.type,
        })),
      };
      await this.applyFieldWrite(payload, field, fieldLabel, value, existing);
      await this.client.updateLoginCipher(existing.id, payload);
    } else {
      // Brand-new cipher.
      const nameEnc = await encryptString(this.userKey, ref.parts.item);
      const payload: LoginCipherPayload = {
        nameEnc,
        folderIdOrNull: folderId,
        usernameEnc: null,
        passwordEnc: null,
        notesEnc: null,
        fields: [],
      };
      await this.applyFieldWrite(payload, field, fieldLabel, value, null);
      await this.client.createLoginCipher(payload);
    }
    this.ciphers = null;
    this.cipherCacheExpires = 0;
  }

  private async applyFieldWrite(
    payload: LoginCipherPayload,
    fieldKey: string,
    fieldLabel: string,
    value: string,
    existing: DecryptedCipher | null,
  ): Promise<void> {
    if (!this.userKey) throw new BitwardenApiError(401, "no user key");
    const enc = (s: string) => encryptString(this.userKey!, s);
    switch (fieldKey) {
      case "password":
        payload.passwordEnc = await enc(value);
        return;
      case "username":
        payload.usernameEnc = await enc(value);
        return;
      case "notes":
        payload.notesEnc = await enc(value);
        return;
      default: {
        // Custom field: find-or-create by lowercased label.
        const fields = payload.fields ?? [];
        const existingRaw = existing?.raw.fields.get(fieldKey);
        const nameEnc = existingRaw
          ? existingRaw.nameEnc
          : await enc(fieldLabel);
        const newEntry: CustomFieldEnc = {
          nameEnc,
          valueEnc: await enc(value),
          type: existingRaw?.type ?? 1,
        };
        const replacedFields: CustomFieldEnc[] = [];
        let replaced = false;
        for (const f of fields) {
          if (existingRaw && f.nameEnc === existingRaw.nameEnc) {
            replacedFields.push(newEntry);
            replaced = true;
          } else {
            replacedFields.push(f);
          }
        }
        if (!replaced) replacedFields.push(newEntry);
        payload.fields = replacedFields;
        return;
      }
    }
  }

  async list(): Promise<ProviderRef[]> {
    if (!this.client || !this.userKey) return [];
    let ciphers: DecryptedCipher[];
    try {
      ciphers = await this.getCiphers();
    } catch {
      return [];
    }
    return ciphers.slice(0, 200).map((c) => ({
      provider: this.id,
      raw: this.formatRef({
        folder: c.folderName ?? "",
        item: c.name,
        field: "password",
      }),
      parts: {
        folder: c.folderName ?? "",
        item: c.name,
        field: "password",
      },
    }));
  }

  clearCache(): void {
    this.ciphers = null;
    this.cipherCacheExpires = 0;
  }

  suggestRefDefaults(ctx: NoteContext): Record<string, string> {
    return {
      folder: "",
      item: ctx.basename ?? "untitled",
      field: "password",
    };
  }

  renderSettings(containerEl: HTMLElement): void {
    new Setting(containerEl)
      .setName("Bitwarden / Vaultwarden")
      .setHeading();

    renderAuthStatusRow(containerEl, this);

    new Setting(containerEl)
      .setName("Server URL")
      .setDesc(
        "Vaultwarden instance, e.g. https://vw.example.com. For Bitwarden cloud use https://vault.bitwarden.com (US) or https://vault.bitwarden.eu (EU).",
      )
      .addText((t) =>
        t
          .setPlaceholder("https://vw.example.com")
          .setValue(this.settings.baseUrl)
          .onChange(async (v) => {
            this.settings.baseUrl = v.replace(/\/+$/, "");
            if (this.settings.baseUrl) {
              this.client = new BitwardenClient({
                baseUrl: this.settings.baseUrl,
                deviceIdentifier: this.settings.deviceIdentifier,
                clientVersion: this.ctx.pluginVersion ?? "0.0.0",
              });
            }
            await this.persist();
          }),
      );

    new Setting(containerEl)
      .setName("Email")
      .addText((t) =>
        t.setValue(this.settings.email).onChange(async (v) => {
          this.settings.email = v.trim();
          await this.persist();
        }),
      );

    new Setting(containerEl)
      .setName("Cache TTL (seconds)")
      .setDesc("How long the decrypted cipher list is kept in memory.")
      .addText((t) =>
        t.setValue(String(this.settings.cacheTtlSec)).onChange(async (v) => {
          const n = Number(v);
          if (!Number.isFinite(n) || n < 0) return;
          this.settings.cacheTtlSec = n;
          await this.persist();
        }),
      );

    new Setting(containerEl)
      .setName("Remember session on this device")
      .setDesc(
        "On login, encrypt the user key + refresh token with a passphrase and store them on disk. On the next Obsidian start you'll be prompted for the passphrase instead of the master password. Off by default.",
      )
      .addToggle((t) =>
        t
          .setValue(this.settings.rememberSession)
          .onChange(async (v) => {
            this.settings.rememberSession = v;
            if (!v) {
              this.settings.encryptedUserKey = null;
              this.settings.encryptedRefreshToken = null;
            }
            await this.persist();
          }),
      );
  }

  // --- internals ---------------------------------------------------------

  private async getCiphers(): Promise<DecryptedCipher[]> {
    const now = Date.now();
    if (this.ciphers && now < this.cipherCacheExpires) return this.ciphers;
    if (this.syncInflight) return this.syncInflight;
    this.syncInflight = this.syncAndDecrypt();
    try {
      const c = await this.syncInflight;
      this.ciphers = c;
      this.cipherCacheExpires =
        Date.now() + this.settings.cacheTtlSec * 1000;
      return c;
    } finally {
      this.syncInflight = null;
    }
  }

  private async syncAndDecrypt(): Promise<DecryptedCipher[]> {
    if (!this.client || !this.userKey) {
      throw new BitwardenApiError(401, "not logged in");
    }
    const res = await this.client.sync();

    const folderById = new Map<string, string>();
    for (const f of res.Folders ?? []) {
      const name = await safeDecrypt(this.userKey, f.Name);
      if (name !== null) folderById.set(f.Id, name);
    }

    const out: DecryptedCipher[] = [];
    for (const c of res.Ciphers ?? []) {
      // Only login-type ciphers carry .Login (password + username). Custom
      // fields exist on every cipher type, so we still surface them.
      if (c.Type !== 1 && c.Type !== 2) continue;
      const name = await safeDecrypt(this.userKey, c.Name);
      if (name === null) continue;
      const password = c.Login?.Password
        ? await safeDecrypt(this.userKey, c.Login.Password)
        : null;
      const username = c.Login?.Username
        ? await safeDecrypt(this.userKey, c.Login.Username)
        : null;
      const fields = new Map<string, string>();
      const rawFields = new Map<
        string,
        { nameEnc: string; valueEnc: string | null; type: number }
      >();
      for (const f of c.Fields ?? []) {
        if (!f.Name) continue;
        const fname = await safeDecrypt(this.userKey, f.Name);
        if (fname === null) continue;
        const fval = f.Value
          ? await safeDecrypt(this.userKey, f.Value)
          : "";
        fields.set(fname.toLowerCase(), fval ?? "");
        rawFields.set(fname.toLowerCase(), {
          nameEnc: f.Name,
          valueEnc: f.Value ?? null,
          type: f.Type ?? 1,
        });
      }
      out.push({
        id: c.Id,
        name,
        folderId: c.FolderId,
        folderName: c.FolderId ? folderById.get(c.FolderId) ?? null : null,
        password,
        username,
        fields,
        raw: {
          nameEnc: c.Name,
          usernameEnc: c.Login?.Username ?? null,
          passwordEnc: c.Login?.Password ?? null,
          notesEnc: c.Notes ?? null,
          fields: rawFields,
        },
      });
    }
    return out;
  }

  private async resolveFolderId(folderName: string): Promise<string | null> {
    if (!folderName) return null;
    if (!this.client) return null;
    const res = await this.client.sync();
    for (const f of res.Folders ?? []) {
      const name = await safeDecrypt(this.userKey!, f.Name);
      if (name === folderName) return f.Id;
    }
    // Auto-creating folders is out of scope for v0.4 - if the folder
    // doesn't exist, we place the cipher at the vault root and the user
    // can move it in any regular Bitwarden client.
    return null;
  }
}

function findCipher(
  ciphers: DecryptedCipher[],
  folder: string,
  item: string,
): DecryptedCipher | null {
  const itemLc = item.toLowerCase();
  const folderLc = folder.toLowerCase();
  // Exact match (folder + item) first; fall back to item-only if folder
  // wasn't specified.
  for (const c of ciphers) {
    if (c.name.toLowerCase() !== itemLc) continue;
    const cFolder = (c.folderName ?? "").toLowerCase();
    if (folder) {
      if (cFolder === folderLc) return c;
    } else {
      // No folder in the placeholder => prefer root-level match, but
      // accept a single uniquely-named match in any folder.
      return c;
    }
  }
  return null;
}

async function safeDecrypt(
  key: SymmetricKey,
  encString: string,
): Promise<string | null> {
  try {
    return await decryptString(key, encString);
  } catch {
    return null;
  }
}
