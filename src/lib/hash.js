import { gzipCompressToBase64url, gzipDecompressToStr, base64urlToBytes, isGzip } from './gzip.js';

/** True if the value looks like base64url (gzip payload). */
function looksLikeBase64url(str) {
  return /^[A-Za-z0-9_-]*$/.test(str) && str.length > 0;
}

/**
 * Encode string for URL hash: gzip compress then base64url (URL-safe).
 */
async function encodeParam(str) {
  if (!str) return '';
  const compressed = await gzipCompressToBase64url(str);
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
    if (isGzip(bytes)) {
      return await gzipDecompressToStr(bytes);
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

  const pending = [];
  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key && value !== undefined) {
      if (key === 'e') {
        try {
          out.e = decodeURIComponent(value);
        } catch {
          out.e = value;
        }
      } else if (key === 's' || key === 'd' || key === 'm') {
        pending.push({ key, value });
      }
    }
  }

  const decoded = await Promise.all(pending.map(({ value }) => decodeParam(value)));
  for (let i = 0; i < pending.length; i++) {
    const { key } = pending[i];
    if (key === 's') out.s = decoded[i];
    else if (key === 'd') out.d = decoded[i];
    else if (key === 'm') out.m = decoded[i];
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
