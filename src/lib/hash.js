/**
 * Compress string with gzip (CompressionStream), encode as base64url (URL-safe).
 * Used for style and document params in the hash.
 */
async function gzipCompress(str) {
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
  const base64 = bytesToBase64(out);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Decode base64url to bytes (for gzip decompress).
 */
function base64urlToBytes(base64url) {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  const padded = pad ? base64 + '='.repeat(4 - pad) : base64;
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

/**
 * Uint8Array to base64 (chunked to avoid call stack overflow on large data).
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
 * Decompress gzip bytes to string. Throws if not valid gzip.
 */
async function gzipDecompress(bytes) {
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

/** True if the value looks like base64url (gzip payload). */
function looksLikeBase64url(str) {
  return /^[A-Za-z0-9_-]*$/.test(str) && str.length > 0;
}

/**
 * Encode string for URL hash: gzip compress then base64url (URL-safe).
 */
async function encodeParam(str) {
  if (!str) return '';
  const compressed = await gzipCompress(str);
  return encodeURIComponent(compressed);
}

/**
 * Decode param from URL hash (gzip-compressed, base64url).
 */
async function decodeParam(str) {
  if (!str) return '';
  try {
    const decoded = decodeURIComponent(str);
    if (!looksLikeBase64url(decoded)) return decoded;
    const bytes = base64urlToBytes(decoded);
    if (bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b) {
      return await gzipDecompress(bytes);
    }
    return decoded;
  } catch {
    return '';
  }
}

/**
 * Parse hash string #s=...&d=...&m=... or #e=... (encrypted) into { s, d, m, e }.
 * s can be a preset id string or JSON string for { preset, overrides }.
 * If e is present, content is encrypted; decrypt to get s, d, m.
 */
export async function parseHash(hash) {
  const out = { s: '', d: '', m: '', e: '' };
  if (!hash || hash.charAt(0) !== '#') return out;
  const rest = hash.slice(1);
  const parts = rest.split('&');
  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key && value !== undefined) {
      if (key === 'e') {
        try {
          out.e = decodeURIComponent(value);
        } catch {
          out.e = value;
        }
      } else {
        const v = await decodeParam(value);
        if (key === 's') out.s = v;
        else if (key === 'd') out.d = v;
        else if (key === 'm') out.m = v;
      }
    }
  }
  return out;
}

/** Parse style param: preset id string or JSON config. */
export function parseStyleParam(s) {
  if (!s) return null;
  try {
    const parsed = JSON.parse(s);
    if (parsed && (parsed.preset || parsed.overrides)) return parsed;
  } catch {}
  return typeof s === 'string' ? { preset: s, overrides: {} } : null;
}

/** Encode style for hash: string (preset only) or JSON (config). */
export async function encodeStyle(style) {
  if (!style) return '';
  if (typeof style === 'string') return await encodeParam(style);
  return await encodeParam(JSON.stringify(style));
}

/**
 * Build hash string from style (preset id or config object), doc (markdown), mode.
 * If encrypted is provided, returns #e=<blob> only (no s, d, m).
 */
export async function buildHash({ style, doc, mode, encrypted }) {
  if (encrypted) {
    return '#' + 'e=' + encodeURIComponent(encrypted);
  }
  const parts = [];
  if (style !== undefined && style !== null && style !== '') {
    const s =
      typeof style === 'object' ? await encodeParam(JSON.stringify(style)) : await encodeParam(style);
    parts.push('s=' + s);
  }
  if (doc) parts.push('d=' + (await encodeParam(doc)));
  if (mode) parts.push('m=' + encodeURIComponent(mode));
  return parts.length ? '#' + parts.join('&') : '';
}

/**
 * Get current hash from window (without #).
 */
export function getHash() {
  return typeof window !== 'undefined' ? window.location.hash.slice(1) : '';
}

/**
 * Set window.location.hash (replace state to avoid full reload).
 */
export function setHash(hash) {
  if (typeof window === 'undefined') return;
  const newHash = hash.charAt(0) === '#' ? hash : '#' + hash;
  if (window.location.hash !== newHash) {
    window.history.replaceState(null, '', window.location.pathname + window.location.search + newHash);
  }
}
