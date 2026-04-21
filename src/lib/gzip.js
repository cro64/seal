/**
 * Uint8Array → base64 string (chunked to avoid call-stack overflow on large data).
 * @param {Uint8Array} bytes
 * @returns {string}
 */
export function bytesToBase64(bytes) {
  const chunkSize = 8192;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + chunkSize, bytes.length)));
  }
  return btoa(binary);
}

/**
 * base64url string → Uint8Array.
 * @param {string} base64url
 * @returns {Uint8Array}
 */
export function base64urlToBytes(base64url) {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  const padded = pad ? base64 + '='.repeat(4 - pad) : base64;
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

/**
 * Read all chunks from a ReadableStream into a single Uint8Array.
 * @param {ReadableStream} stream
 * @returns {Promise<Uint8Array>}
 */
async function readStream(stream) {
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
  for (const c of chunks) { out.set(c, offset); offset += c.length; }
  return out;
}

/**
 * Gzip-compress a string to raw bytes.
 * @param {string} str
 * @returns {Promise<Uint8Array>}
 */
export async function gzipCompressToBytes(str) {
  const data = new TextEncoder().encode(str);
  const stream = new Blob([data]).stream().pipeThrough(new CompressionStream('gzip'));
  return readStream(stream);
}

/**
 * Gzip-decompress raw bytes to a string.
 * @param {Uint8Array} bytes
 * @returns {Promise<string>}
 */
export async function gzipDecompressToStr(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  const out = await readStream(stream);
  return new TextDecoder().decode(out);
}

/**
 * Gzip-compress a string and return as base64url-encoded string.
 * @param {string} str
 * @returns {Promise<string>}
 */
export async function gzipCompressToBase64url(str) {
  const bytes = await gzipCompressToBytes(str);
  return bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * True if bytes start with gzip magic bytes 0x1f 0x8b.
 * @param {Uint8Array} bytes
 * @returns {boolean}
 */
export function isGzip(bytes) {
  return bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
}
