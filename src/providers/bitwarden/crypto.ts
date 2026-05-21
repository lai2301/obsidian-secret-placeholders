// Pure-WebCrypto implementation of the Bitwarden client crypto used by
// `BitwardenProvider`.  No Node, no WASM, no Argon2 - PBKDF2-SHA256 only.
//
// References:
//   https://bitwarden.com/help/bitwarden-security-whitepaper/
//   https://github.com/bitwarden/clients (browser/desktop client source)
//
// Layout of a Bitwarden "encrypted string" ("EncString"):
//
//     <type>.<iv_b64>|<ct_b64>|<mac_b64>
//
// We support type 2 only (`AesCbc256_HmacSha256_B64`):
//   - 32-byte AES-256-CBC encryption key
//   - 32-byte HMAC-SHA256 mac key
//   - 16-byte IV
//   - HMAC over (iv || ciphertext) using mac_key, verified before decrypt
//
// Older accounts may still have ciphers in type 0 or type 1 - we reject
// those rather than silently fail-open.  The user can re-encrypt via a
// regular Bitwarden client by changing their master password (which forces
// re-protection with the current format).

export class BitwardenCryptoError extends Error {}

// --- byte helpers --------------------------------------------------------

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64decode(s: string): Uint8Array {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

function b64encode(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function concat(...arrs: Uint8Array[]): Uint8Array {
  let n = 0;
  for (const a of arrs) n += a.length;
  const out = new Uint8Array(n);
  let off = 0;
  for (const a of arrs) {
    out.set(a, off);
    off += a.length;
  }
  return out;
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

// --- low-level primitives -----------------------------------------------

async function pbkdf2(
  password: Uint8Array,
  salt: Uint8Array,
  iterations: number,
  outBytes: number,
): Promise<Uint8Array> {
  const base = await crypto.subtle.importKey(
    "raw",
    password,
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    base,
    outBytes * 8,
  );
  return new Uint8Array(bits);
}

async function hmacSha256(
  key: Uint8Array,
  data: Uint8Array,
): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, data));
}

/** HKDF-Expand only (RFC 5869 §2.3).  Bitwarden's "stretch" step skips
 *  Extract because the PBKDF2 output is already a uniformly-random key. */
async function hkdfExpand(
  prk: Uint8Array,
  info: string,
  outBytes: number,
): Promise<Uint8Array> {
  const infoBytes = enc.encode(info);
  const hashLen = 32; // SHA-256
  const blocks = Math.ceil(outBytes / hashLen);
  if (blocks > 255) {
    throw new BitwardenCryptoError(`hkdf-expand: too many blocks (${blocks})`);
  }
  let prev = new Uint8Array(0);
  const chunks: Uint8Array[] = [];
  for (let i = 1; i <= blocks; i++) {
    const t = await hmacSha256(
      prk,
      concat(prev, infoBytes, Uint8Array.from([i])),
    );
    chunks.push(t);
    prev = t;
  }
  return concat(...chunks).slice(0, outBytes);
}

async function aesCbcEncrypt(
  key: Uint8Array,
  iv: Uint8Array,
  plain: Uint8Array,
): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "AES-CBC", length: key.length * 8 },
    false,
    ["encrypt"],
  );
  return new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-CBC", iv }, k, plain),
  );
}

async function aesCbcDecrypt(
  key: Uint8Array,
  iv: Uint8Array,
  ct: Uint8Array,
): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "AES-CBC", length: key.length * 8 },
    false,
    ["decrypt"],
  );
  return new Uint8Array(
    await crypto.subtle.decrypt({ name: "AES-CBC", iv }, k, ct),
  );
}

// --- Bitwarden-specific layers ------------------------------------------

/** PBKDF2 of master password with email as salt to get the 32-byte
 *  master key.  Iterations come from the server's prelogin response. */
export async function pbkdf2MasterKey(
  masterPassword: string,
  email: string,
  iterations: number,
): Promise<Uint8Array> {
  if (iterations < 5000) {
    throw new BitwardenCryptoError(
      `refusing pbkdf2 iterations=${iterations} (too low)`,
    );
  }
  return pbkdf2(
    enc.encode(masterPassword),
    enc.encode(email.trim().toLowerCase()),
    iterations,
    32,
  );
}

export interface KdfParams {
  /** 0 = PBKDF2-SHA256, 1 = Argon2id. */
  kdf: number;
  iterations: number;
  /** Argon2 only: memory in MiB. */
  memory?: number;
  /** Argon2 only: parallelism (lanes). */
  parallelism?: number;
}

/** Derive the 32-byte master key, dispatching on KDF type.  For Argon2id
 *  we lazy-load `hash-wasm` (the WASM module is only ~50 KB but we'd
 *  rather not bundle it for OpenBao/1P-only users). */
export async function deriveMasterKey(
  masterPassword: string,
  email: string,
  params: KdfParams,
): Promise<Uint8Array> {
  switch (params.kdf) {
    case 0:
      return pbkdf2MasterKey(masterPassword, email, params.iterations);
    case 1: {
      if (params.memory === undefined || params.parallelism === undefined) {
        throw new BitwardenCryptoError(
          `argon2id requires kdfMemory and kdfParallelism (got ${JSON.stringify(params)})`,
        );
      }
      // Lazy-load to avoid pulling hash-wasm into the bundle for users
      // who only ever talk to PBKDF2 servers.
      const { argon2idMasterKey } = await import("./argon2");
      return argon2idMasterKey(
        masterPassword,
        email,
        params.iterations,
        params.memory,
        params.parallelism,
      );
    }
    default:
      throw new BitwardenCryptoError(
        `unsupported KDF type ${params.kdf} - this plugin supports PBKDF2 (kdf=0) and Argon2id (kdf=1).`,
      );
  }
}

/** Password hash the server uses for password-grant authentication.
 *  PBKDF2-SHA256 of master_key with master_password as salt, 1 iteration. */
export async function masterPasswordHash(
  masterKey: Uint8Array,
  masterPassword: string,
): Promise<string> {
  const hash = await pbkdf2(masterKey, enc.encode(masterPassword), 1, 32);
  return b64encode(hash);
}

/** Stretch the 32-byte master key into 64 bytes (32 enc + 32 mac) using
 *  HKDF-Expand with info='enc' and info='mac'. */
export interface SymmetricKey {
  /** AES-256 encryption key (32 bytes). */
  encKey: Uint8Array;
  /** HMAC-SHA256 mac key (32 bytes). */
  macKey: Uint8Array;
}

export async function stretchMasterKey(
  masterKey: Uint8Array,
): Promise<SymmetricKey> {
  const encKey = await hkdfExpand(masterKey, "enc", 32);
  const macKey = await hkdfExpand(masterKey, "mac", 32);
  return { encKey, macKey };
}

/** Parse a Bitwarden EncString.  Only type 2 is accepted. */
export interface EncStringParts {
  iv: Uint8Array;
  ct: Uint8Array;
  mac: Uint8Array;
}

export function parseEncString(s: string): EncStringParts {
  const dot = s.indexOf(".");
  if (dot < 0) throw new BitwardenCryptoError(`bad encString (no type prefix)`);
  const type = s.slice(0, dot);
  const rest = s.slice(dot + 1);
  if (type !== "2") {
    throw new BitwardenCryptoError(
      `unsupported encString type '${type}' (only type 2 is supported; ` +
        `re-encrypt the affected items via a regular Bitwarden client to upgrade)`,
    );
  }
  const parts = rest.split("|");
  if (parts.length !== 3) {
    throw new BitwardenCryptoError(`bad encString (expected 3 parts, got ${parts.length})`);
  }
  const [ivB64, ctB64, macB64] = parts;
  return {
    iv: b64decode(ivB64),
    ct: b64decode(ctB64),
    mac: b64decode(macB64),
  };
}

export function formatEncString(p: EncStringParts): string {
  return `2.${b64encode(p.iv)}|${b64encode(p.ct)}|${b64encode(p.mac)}`;
}

/** AES-CBC-256 + HMAC-SHA256.  Verifies MAC over (iv || ct) before
 *  decrypting; throws on mismatch (no fail-open). */
export async function decryptString(
  key: SymmetricKey,
  encString: string,
): Promise<string> {
  const { iv, ct, mac } = parseEncString(encString);
  const expected = await hmacSha256(key.macKey, concat(iv, ct));
  if (!constantTimeEqual(mac, expected)) {
    throw new BitwardenCryptoError("MAC verification failed");
  }
  const plain = await aesCbcDecrypt(key.encKey, iv, ct);
  return dec.decode(plain);
}

export async function decryptBytes(
  key: SymmetricKey,
  encString: string,
): Promise<Uint8Array> {
  const { iv, ct, mac } = parseEncString(encString);
  const expected = await hmacSha256(key.macKey, concat(iv, ct));
  if (!constantTimeEqual(mac, expected)) {
    throw new BitwardenCryptoError("MAC verification failed");
  }
  return aesCbcDecrypt(key.encKey, iv, ct);
}

export async function encryptString(
  key: SymmetricKey,
  plain: string,
): Promise<string> {
  return encryptBytes(key, enc.encode(plain));
}

export async function encryptBytes(
  key: SymmetricKey,
  plain: Uint8Array,
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(16));
  const ct = await aesCbcEncrypt(key.encKey, iv, plain);
  const mac = await hmacSha256(key.macKey, concat(iv, ct));
  return formatEncString({ iv, ct, mac });
}

/** The protected user encryption key returned by /identity/connect/token in
 *  the `Key` field is an EncString whose plaintext is 64 bytes (32 enc +
 *  32 mac).  This decrypts it using the stretched master key. */
export async function unlockUserKey(
  stretchedMasterKey: SymmetricKey,
  protectedKey: string,
): Promise<SymmetricKey> {
  const raw = await decryptBytes(stretchedMasterKey, protectedKey);
  if (raw.length !== 64) {
    throw new BitwardenCryptoError(
      `unexpected user-key length ${raw.length} (expected 64)`,
    );
  }
  return { encKey: raw.slice(0, 32), macKey: raw.slice(32, 64) };
}

// --- RSA: organization key decryption -----------------------------------
//
// Organization ciphers are encrypted with the org's symmetric key, not the
// user key.  Each org's key arrives in the sync response RSA-encrypted with
// the user's public key; to unwrap it we need the user's RSA private key,
// which itself arrives EncString-wrapped with the user's symmetric key.
//
// Flow: userKey -decrypt-> PKCS8 private key -import-> RSA key
//       RSA key -decrypt-> org symmetric key (64 bytes)

/** Both OAEP-hash variants of the user's RSA private key.  An org Key
 *  EncString is type 3 (OAEP-SHA256) or 4/6 (OAEP-SHA1); WebCrypto binds
 *  the hash at import time, so we import once per hash. */
export interface RsaPrivateKey {
  sha1: CryptoKey;
  sha256: CryptoKey;
}

/** Decrypt the user's RSA private key (PKCS8, EncString-wrapped with the
 *  user key) and import it for RSA-OAEP decryption. */
export async function unlockPrivateKey(
  userKey: SymmetricKey,
  privateKeyEncString: string,
): Promise<RsaPrivateKey> {
  const pkcs8 = await decryptBytes(userKey, privateKeyEncString);
  const importFor = (hash: "SHA-1" | "SHA-256") =>
    crypto.subtle.importKey(
      "pkcs8",
      pkcs8,
      { name: "RSA-OAEP", hash },
      false,
      ["decrypt"],
    );
  return { sha1: await importFor("SHA-1"), sha256: await importFor("SHA-256") };
}

/** Decrypt an organization's 64-byte symmetric key from its RSA EncString.
 *  Org keys are type 3 (`3.<ct>`), 4 (`4.<ct>`) or 6 (`6.<ct>|<mac>`). */
export async function unlockOrgKey(
  privateKey: RsaPrivateKey,
  orgKeyEncString: string,
): Promise<SymmetricKey> {
  const dot = orgKeyEncString.indexOf(".");
  if (dot < 0) {
    throw new BitwardenCryptoError("bad org key encString (no type prefix)");
  }
  const type = Number(orgKeyEncString.slice(0, dot));
  // Type 6 appends `|<mac>`; we only need the ciphertext.
  const ctB64 = orgKeyEncString.slice(dot + 1).split("|")[0];
  const ct = b64decode(ctB64);
  if (type !== 3 && type !== 4 && type !== 6) {
    throw new BitwardenCryptoError(
      `unsupported org key encString type '${type}'`,
    );
  }
  const key = type === 3 ? privateKey.sha256 : privateKey.sha1;
  const raw = new Uint8Array(
    await crypto.subtle.decrypt({ name: "RSA-OAEP" }, key, ct),
  );
  if (raw.length !== 64) {
    throw new BitwardenCryptoError(
      `unexpected org key length ${raw.length} (expected 64)`,
    );
  }
  return { encKey: raw.slice(0, 32), macKey: raw.slice(32, 64) };
}
