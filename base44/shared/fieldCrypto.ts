// Application-level field encryption using AES-GCM (Web Crypto API).
//
// Provides defense-in-depth: even with raw database access, encrypted fields
// are unreadable without the key. The key is stored in the environment
// variable FIELD_ENCRYPTION_KEY as a 64-character hex string (32 bytes).
// Generate one with:  openssl rand -hex 32
//
// Encrypted values are stored as:  enc:v1:<hex-iv>:<hex-ciphertext>
// The decryptField function passes through any value that isn't prefixed
// "enc:v1:" so existing plaintext records continue to work during a
// gradual migration.
//
// LIMITATIONS (see security report):
//  - Numeric fields (latitude/longitude) cannot be encrypted without
//    changing the schema to string and rewriting all geo-distance code.
//    The platform already encrypts the database at rest; coordinates
//    remain protected by that layer plus RLS.
//  - Applying this to existing populated fields requires a coordinated
//    migration of every read path (age checks, geo matching, booking
//    address reveal). The module is ready for incremental adoption.

const PREFIX = 'enc:v1:';
const KEY_ENV = 'FIELD_ENCRYPTION_KEY';

let cachedKey: CryptoKey | null | undefined = undefined;

async function getKey(): Promise<CryptoKey | null> {
  if (cachedKey !== undefined) return cachedKey;
  const raw = Deno.env.get(KEY_ENV);
  if (!raw || raw.length < 64) {
    cachedKey = null;
    return null;
  }
  const keyBytes = new Uint8Array(raw.length / 2);
  for (let i = 0; i < raw.length; i += 2) {
    keyBytes[i / 2] = parseInt(raw.substring(i, i + 2), 16);
  }
  cachedKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
  return cachedKey;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

export function isEncrypted(value: string): boolean {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

export async function encryptField(plaintext: string): Promise<string> {
  const key = await getKey();
  if (!key) {
    // No key configured — return plaintext unchanged rather than failing.
    // The platform-level at-rest encryption still applies.
    return plaintext;
  }
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded));
  return `${PREFIX}${toHex(iv)}:${toHex(ciphertext)}`;
}

export async function decryptField(value: string): Promise<string> {
  if (!isEncrypted(value)) return value;
  const key = await getKey();
  if (!key) {
    // Key was removed but encrypted data remains — can't decrypt.
    return '[encrypted]';
  }
  try {
    const rest = value.slice(PREFIX.length);
    const sep = rest.indexOf(':');
    const iv = fromHex(rest.substring(0, sep));
    const ciphertext = fromHex(rest.substring(sep + 1));
    const plaintext = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext));
    return new TextDecoder().decode(plaintext);
  } catch {
    return '[decryption-failed]';
  }
}