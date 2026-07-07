const BQ_PREFIX_RE = /^( {0,3}(?:> ?)+)/;

/**
 * @param {string} source
 * @param {number} pos
 * @param {'backspace' | 'delete'} key
 * @returns {{ start: number, end: number, cursor: number } | null}
 */
export function blockquoteMarkerDeleteRange(source, pos, key) {
  if (key === 'backspace') {
    const nextLineMarker = markerAtNextLineStart(source, pos);
    if (nextLineMarker != null) return nextLineMarker;

    const markerAtCaret = markerInLinePrefix(source, pos);
    if (markerAtCaret != null) return markerAtCaret;

    const markerBeforeCaret = markerTokenInLinePrefix(source, pos - 1);
    if (markerBeforeCaret != null) return markerBeforeCaret;

    return null;
  }

  const nextLineMarker = markerAtNextLineStart(source, pos);
  if (nextLineMarker != null) return nextLineMarker;

  const markerAtCaret = markerTokenInLinePrefix(source, pos);
  if (markerAtCaret != null) return markerAtCaret;

  return null;
}

/**
 * @param {string} source
 * @param {number} pos
 * @returns {{ source: string, cursor: number } | null}
 */
export function blockquoteMarkerInsert(source, pos) {
  const lineStart = source.lastIndexOf('\n', Math.max(0, pos - 1)) + 1;
  const lineEndIndex = source.indexOf('\n', lineStart);
  const lineEnd = lineEndIndex === -1 ? source.length : lineEndIndex;
  const line = source.slice(lineStart, lineEnd);
  const prefix = line.match(BQ_PREFIX_RE);
  if (!prefix) return null;

  const prefixLen = prefix[1].length;
  const prefixEnd = lineStart + prefixLen;
  if (pos > prefixEnd) return null;

  const markerCount = (prefix[1].match(/>/g) ?? []).length + 1;
  const body = line.slice(prefixLen);
  const normalizedPrefix = `${Array(markerCount).fill('>').join(' ')} `;
  const nextLine = `${normalizedPrefix}${body}`;
  const nextSource = `${source.slice(0, lineStart)}${nextLine}${source.slice(lineEnd)}`;
  return { source: nextSource, cursor: lineStart + normalizedPrefix.length };
}

/**
 * @deprecated Use blockquoteMarkerDeleteRange.
 * @param {string} source
 * @param {number} pos
 * @param {'backspace' | 'delete'} key
 * @returns {number | null}
 */
export function blockquoteMarkerDeleteOffset(source, pos, key) {
  return blockquoteMarkerDeleteRange(source, pos, key)?.start ?? null;
}

/**
 * @param {string} source
 * @param {number} pos
 */
function markerAtNextLineStart(source, pos) {
  if (pos < 0 || source[pos] !== '\n') return null;
  return markerTokenInLinePrefix(source, pos + 1);
}

/**
 * @param {string} source
 * @param {number} pos
 */
function markerInLinePrefix(source, pos) {
  const lineStart = source.lastIndexOf('\n', pos - 1) + 1;
  const lineEnd = source.indexOf('\n', lineStart);
  const line = source.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
  const prefix = line.match(BQ_PREFIX_RE);
  if (!prefix) return null;

  const prefixEnd = lineStart + prefix[1].length;
  if (pos === prefixEnd) {
    return tokenBeforePrefixEnd(source, lineStart, prefix[1]);
  }
  if (pos > prefixEnd) return null;
  return markerTokenInLinePrefix(source, pos);
}

/**
 * @param {string} source
 * @param {number} pos
 */
function markerTokenInLinePrefix(source, pos) {
  if (pos < 0 || pos >= source.length) return null;

  const lineStart = source.lastIndexOf('\n', pos - 1) + 1;
  const lineEnd = source.indexOf('\n', lineStart);
  const line = source.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
  const prefix = line.match(BQ_PREFIX_RE);
  if (!prefix) return null;

  const prefixEnd = lineStart + prefix[1].length;
  if (pos >= prefixEnd) return null;

  let marker = source[pos] === '>' ? pos : -1;
  if (marker === -1 && pos > lineStart && source[pos - 1] === '>') marker = pos - 1;
  if (marker === -1 || marker >= prefixEnd) return null;
  return tokenRange(source, marker, prefixEnd);
}

/**
 * @param {string} source
 * @param {number} lineStart
 * @param {string} prefix
 */
function tokenBeforePrefixEnd(source, lineStart, prefix) {
  for (let i = lineStart + prefix.length - 1; i >= lineStart; i--) {
    if (source[i] === '>') return tokenRange(source, i, lineStart + prefix.length);
  }
  return null;
}

/**
 * @param {string} source
 * @param {number} marker
 * @param {number} prefixEnd
 */
function tokenRange(source, marker, prefixEnd) {
  const end = marker + 1 < prefixEnd && source[marker + 1] === ' ' ? marker + 2 : marker + 1;
  return { start: marker, end, cursor: marker };
}
