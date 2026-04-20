/**
 * Client-side encryption for share links. Uses AES-GCM with a key derived from
 * the password via PBKDF2. Salt and IV are generated per encryption and stored
 * with the ciphertext. Payload is gzip-compressed before encryption to shorten the URL.
 */

const SALT_LEN = 16;
const IV_LEN = 12;
const PBKDF2_ITERATIONS = 100000;

/**
 * Gzip-compress a string to bytes (CompressionStream).
 * @param {string} str
 * @returns {Promise<Uint8Array>}
 */
async function gzipCompressToBytes(str) {
  const enc = new TextEncoder();
  const data = enc.encode(str);
  const stream = new Blob([data]).stream().pipeThrough(new CompressionStream('gzip'));
  const chunks = [];
  const reader = stream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const totalLen = chunks.reduce((a, c) => a + c.length, 0);
  const out = new Uint8Array(totalLen);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

/**
 * Gzip-decompress bytes to string (DecompressionStream).
 * @param {Uint8Array} bytes
 * @returns {Promise<string>}
 */
async function gzipDecompressToStr(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  const chunks = [];
  const reader = stream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const totalLen = chunks.reduce((a, c) => a + c.length, 0);
  const out = new Uint8Array(totalLen);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return new TextDecoder().decode(out);
}

/**
 * Encode bytes to base64 in chunks to avoid call-stack overflow.
 * @param {Uint8Array} bytes
 * @returns {string}
 */
function bytesToBase64(bytes) {
  const chunkSize = 8192;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
}

/**
 * Derive an AES-GCM key from password and salt.
 * @param {string} password
 * @param {Uint8Array} salt
 * @returns {Promise<CryptoKey>}
 */
async function deriveKey(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a payload (e.g. { s, d, m }) with the given password.
 * Payload is gzip-compressed before encryption to shorten the URL.
 * Returns base64 string of (salt + iv + ciphertext).
 * @param {{ s?: object, d?: string, m?: string }} payload
 * @param {string} password
 * @returns {Promise<string>}
 */
export async function encryptPayload(payload, password) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
  const key = await deriveKey(password, salt);
  const jsonStr = JSON.stringify(payload);
  const plaintext = await gzipCompressToBytes(jsonStr);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    key,
    plaintext
  );
  const combined = new Uint8Array(SALT_LEN + IV_LEN + ciphertext.byteLength);
  combined.set(salt, 0);
  combined.set(iv, SALT_LEN);
  combined.set(new Uint8Array(ciphertext), SALT_LEN + IV_LEN);
  return bytesToBase64(combined);
}

/**
 * Decrypt a base64-encoded blob (salt + iv + ciphertext) with the given password.
 * @param {string} encoded
 * @param {string} password
 * @returns {Promise<{ s?: object, d?: string, m?: string }>}
 */
export async function decryptPayload(encoded, password) {
  const bin = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
  if (bin.length < SALT_LEN + IV_LEN) throw new Error('Invalid encrypted data');
  const salt = bin.subarray(0, SALT_LEN);
  const iv = bin.subarray(SALT_LEN, SALT_LEN + IV_LEN);
  const ciphertext = bin.subarray(SALT_LEN + IV_LEN);
  const key = await deriveKey(password, salt);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    key,
    ciphertext
  );
  const str = await gzipDecompressToStr(new Uint8Array(decrypted));
  return JSON.parse(str);
}
