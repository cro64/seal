import { BLOCK_TYPES } from './types.js';

const BQ_PREFIX_RE = /^( {0,3}(?:> ?)+)/;
const LIST_MARKER_RE = /^(\s*(?:[-*+]|\d+\.)\s+)/;

/**
 * @param {string} type
 * @param {string} source
 * @param {number} pos
 */
export function isAtBlockStart(type, source, pos) {
  if (pos === 0) return true;

  if (type === BLOCK_TYPES.HEADING) {
    const m = source.match(/^(#{1,6}\s)/);
    if (m) return pos <= m[1].length;
    return false;
  }

  if (type === BLOCK_TYPES.BLOCKQUOTE) {
    const lineStart = source.lastIndexOf('\n', Math.max(0, pos - 1)) + 1;
    if (lineStart > 0) return false;
    const lineEnd = source.indexOf('\n', pos);
    const line = source.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
    const prefix = line.match(BQ_PREFIX_RE);
    if (prefix) return pos <= lineStart + prefix[1].length;
    return false;
  }

  if (type === BLOCK_TYPES.UL || type === BLOCK_TYPES.OL) {
    const lineStart = source.lastIndexOf('\n', Math.max(0, pos - 1)) + 1;
    if (lineStart > 0) return false;
    const lineEnd = source.indexOf('\n', pos);
    const line = source.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
    const marker = line.match(LIST_MARKER_RE);
    if (marker) return pos <= lineStart + marker[1].length;
    return false;
  }

  return false;
}

/**
 * @param {string} source
 * @param {number} pos
 */
export function isAtBlockEnd(source, pos) {
  return pos >= source.length;
}

/**
 * @param {string} type
 * @param {string} source
 */
export function headingPrefixLength(source) {
  const m = source.match(/^(#{1,6}\s)/);
  return m ? m[1].length : 0;
}
