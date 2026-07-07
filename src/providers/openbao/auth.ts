// OpenBao auth state.  Token in memory by default; optional encrypted-on-
// device with a user passphrase (AES-GCM, PBKDF2-SHA256, 200k iterations).
// The crypto primitives live in ../../crypto/passphraseEncryption so other
// providers (Bitwarden session persistence) can reuse them.

import {
  decryptStringWithPassphrase,
  encryptStringWithPassphrase,
} from "../../crypto/passphraseEncryption";
import { OpenBaoClient } from "./client";

export interface PersistedAuth {
  /** True if the user opted in to remembering the token on this device. */
  rememberToken: boolean;
  /** Base64-encoded AES-GCM blob (salt || iv || ciphertext). */
  encryptedToken: string | null;
}

export class OpenBaoAuthState {
  private token: string | null = null;
  private renewTimer: number | null = null;
  private listeners = new Set<() => void>();
  private currentTtl: number | null = null;

  constructor(
    private client: OpenBaoClient,
    private getPersisted: () => PersistedAuth,
    private setPersisted: (p: PersistedAuth) => Promise<void>,
    private promptPassphrase: (title: string) => Promise<string | null>,
  ) {}

  getToken(): string | null {
    return this.token;
  }

  hasToken(): boolean {
    return this.token !== null;
  }

  getTtl(): number | null {
    return this.currentTtl;
  }

  onChange(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify(): void {
    for (const cb of this.listeners) {
      try {
        cb();
      } catch {
        /* swallow listener errors */
      }
    }
  }

  async setToken(token: string): Promise<void> {
    this.token = token.trim();
    const persisted = this.getPersisted();
    if (persisted.rememberToken) {
      const passphrase = await this.promptPassphrase(
        "Encrypt token with passphrase",
      );
      if (passphrase) {
        await this.setPersisted({
          ...persisted,
          encryptedToken: await encrypt(this.token, passphrase),
        });
      }
    }
    this.scheduleRenew();
    this.notify();
  }

  async clearToken(): Promise<void> {
    this.token = null;
    this.currentTtl = null;
    const persisted = this.getPersisted();
    await this.setPersisted({ ...persisted, encryptedToken: null });
    if (this.renewTimer !== null) {
      window.clearTimeout(this.renewTimer);
      this.renewTimer = null;
    }
    this.notify();
  }

  async tryRestore(): Promise<boolean> {
    const persisted = this.getPersisted();
    if (!persisted.rememberToken || !persisted.encryptedToken) return false;
    const passphrase = await this.promptPassphrase(
      "Decrypt remembered token",
    );
    if (!passphrase) return false;
    try {
      this.token = await decrypt(persisted.encryptedToken, passphrase);
      this.scheduleRenew();
      this.notify();
      return true;
    } catch {
      return false;
    }
  }

  private scheduleRenew(): void {
    if (this.renewTimer !== null) {
      window.clearTimeout(this.renewTimer);
      this.renewTimer = null;
    }
    if (!this.token) return;
    void (async () => {
      try {
        const info = await this.client.lookupSelf();
        this.currentTtl = info.ttl;
        this.notify();
        const delayMs = Math.max(60_000, info.ttl * 800);
        this.renewTimer = window.setTimeout(() => {
          void (async () => {
            try {
              await this.client.renewSelf();
            } catch {
              /* surface lazily */
            }
            this.scheduleRenew();
          })();
        }, delayMs);
      } catch {
        /* not a fatal startup error */
      }
    })();
  }
}

// Inline crypto used to live here; it moved to
// `src/crypto/passphraseEncryption.ts` so the Bitwarden session-persistence
// flow can use the same primitives.  We just re-export under the legacy
// names for any straggling callers.
const encrypt = encryptStringWithPassphrase;
const decrypt = decryptStringWithPassphrase;
