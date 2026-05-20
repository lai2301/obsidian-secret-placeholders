// Shared passphrase-encryption helpers used by every provider that wants
// to persist a secret (token, user key, refresh token) on disk encrypted
// under a user-supplied passphrase.
//
// Scheme: PBKDF2-HMAC-SHA256(passphrase, salt=16 random bytes, 200_000
// iterations) -> 256-bit AES-GCM key.  Output packs salt || iv || ct as
// raw bytes, base64-encoded.  No header / version byte - if we change
// the parameters later we'll bump that byte.

const PBKDF2_ITERATIONS = 200_000;
const SALT_LEN = 16;
const IV_LEN = 12;

async function deriveKey(
  passphrase: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** Encrypt a UTF-8 string with a passphrase.  Returns a base64 blob. */
export async function encryptStringWithPassphrase(
  plain: string,
  passphrase: string,
): Promise<string> {
  return encryptBytesWithPassphrase(new TextEncoder().encode(plain), passphrase);
}

export async function encryptBytesWithPassphrase(
  plain: Uint8Array,
  passphrase: string,
): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
  const key = await deriveKey(passphrase, salt);
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain),
  );
  const buf = new Uint8Array(salt.length + iv.length + ct.length);
  buf.set(salt, 0);
  buf.set(iv, salt.length);
  buf.set(ct, salt.length + iv.length);
  return b64encode(buf);
}

export async function decryptStringWithPassphrase(
  blob: string,
  passphrase: string,
): Promise<string> {
  const bytes = await decryptBytesWithPassphrase(blob, passphrase);
  return new TextDecoder().decode(bytes);
}

export async function decryptBytesWithPassphrase(
  blob: string,
  passphrase: string,
): Promise<Uint8Array> {
  const buf = b64decode(blob);
  if (buf.length < SALT_LEN + IV_LEN + 1) {
    throw new Error("encrypted blob too short");
  }
  const salt = buf.slice(0, SALT_LEN);
  const iv = buf.slice(SALT_LEN, SALT_LEN + IV_LEN);
  const ct = buf.slice(SALT_LEN + IV_LEN);
  const key = await deriveKey(passphrase, salt);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return new Uint8Array(pt);
}

function b64encode(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function b64decode(s: string): Uint8Array {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}
