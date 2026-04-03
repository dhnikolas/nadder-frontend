/**
 * Шифрование описания секретной карточки: PBKDF2-SHA256 + AES-256-GCM (Web Crypto API).
 * Формат хранения: префикс версии + base64(salt|iv|ciphertext+tag)
 */

const VERSION_PREFIX = 'nadder-sec-v1:';
const SALT_BYTES = 16;
const IV_BYTES = 12;
const PBKDF2_ITERATIONS = 310_000;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveAesKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptCardDescription(plainDescription: string, password: string): Promise<string> {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveAesKey(password, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    enc.encode(plainDescription)
  );
  const ct = new Uint8Array(ciphertext);
  const combined = new Uint8Array(SALT_BYTES + IV_BYTES + ct.length);
  combined.set(salt, 0);
  combined.set(iv, SALT_BYTES);
  combined.set(ct, SALT_BYTES + IV_BYTES);
  return VERSION_PREFIX + bytesToBase64(combined);
}

export async function decryptCardDescription(payload: string, password: string): Promise<string> {
  if (!payload.startsWith(VERSION_PREFIX)) {
    throw new Error('INVALID_PAYLOAD');
  }
  const raw = base64ToBytes(payload.slice(VERSION_PREFIX.length));
  if (raw.length < SALT_BYTES + IV_BYTES + 16) {
    throw new Error('INVALID_PAYLOAD');
  }
  const salt = raw.subarray(0, SALT_BYTES);
  const iv = raw.subarray(SALT_BYTES, SALT_BYTES + IV_BYTES);
  const ciphertext = raw.subarray(SALT_BYTES + IV_BYTES);
  const key = await deriveAesKey(password, salt);
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    ciphertext
  );
  return new TextDecoder().decode(plaintext);
}
