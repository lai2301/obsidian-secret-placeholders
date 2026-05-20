// Lazy-loaded Argon2id wrapper.  Bitwarden cloud accounts default to
// Argon2id (Kdf=1) since late 2023; we need it for any of those accounts
// to log in.  Pure WebCrypto has no Argon2, so this module pulls in
// `hash-wasm` (~50 KB WASM blob) at call time so the OpenBao + 1Password
// users don't pay the cost.

import type { argon2id as Argon2idFn } from "hash-wasm";

let cached: typeof Argon2idFn | null = null;

async function loadArgon2(): Promise<typeof Argon2idFn> {
  if (cached) return cached;
  const mod = await import("hash-wasm");
  cached = mod.argon2id;
  return cached;
}

/** Derive the 32-byte Bitwarden master key with Argon2id.
 *
 *  Bitwarden's KDF parameters from the prelogin response:
 *    kdfIterations  -> iterations (typically 3)
 *    kdfMemory      -> memorySize in MiB (typically 64 MiB)
 *    kdfParallelism -> parallelism (typically 4)
 *
 *  Salt: SHA-256 of the lowercased email.  This matches the official
 *  Bitwarden clients' behaviour (different from PBKDF2 where the email
 *  bytes are used directly).
 */
export async function argon2idMasterKey(
  masterPassword: string,
  email: string,
  iterations: number,
  memoryMib: number,
  parallelism: number,
): Promise<Uint8Array> {
  if (iterations < 1) throw new Error(`argon2id: iterations=${iterations}`);
  if (memoryMib < 16) {
    throw new Error(`argon2id: memory ${memoryMib} MiB looks too small`);
  }

  const argon2id = await loadArgon2();
  // Bitwarden salts argon2 with sha256(email.lowercased()).
  const saltBuf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(email.trim().toLowerCase()),
  );
  const result = await argon2id({
    password: masterPassword,
    salt: new Uint8Array(saltBuf),
    iterations,
    memorySize: memoryMib * 1024, // hash-wasm expects KiB
    parallelism,
    hashLength: 32,
    outputType: "binary",
  });
  // hash-wasm returns Uint8Array for outputType: "binary".  The type def
  // says string | Uint8Array - narrow here.
  if (typeof result === "string") {
    throw new Error("argon2id: unexpected string output");
  }
  return result;
}
