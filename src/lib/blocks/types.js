/**
 * @typedef {'paragraph' | 'heading' | 'ul' | 'ol' | 'blockquote' | 'code' | 'table' | 'hr' | 'image'} BlockType
 */

/**
 * @typedef {Object} BlockMeta
 * @property {number} [level] - Heading level (1-6)
 * @property {string} [before] - Leading whitespace before this block (first block only)
 * @property {string} [after] - Whitespace after this block until the next block (or EOF)
 */

/**
 * @typedef {Object} Block
 * @property {string} id - Stable block identifier
 * @property {BlockType} type - Block classification
 * @property {string} source - Exact markdown source for this block (lossless)
 * @property {BlockMeta} [meta] - Optional metadata
 */

export const BLOCK_TYPES = {
  PARAGRAPH: 'paragraph',
  HEADING: 'heading',
  UL: 'ul',
  OL: 'ol',
  BLOCKQUOTE: 'blockquote',
  CODE: 'code',
  TABLE: 'table',
  HR: 'hr',
  IMAGE: 'image',
};

const FENCE_OPEN_RE = /^ {0,3}(```+|~~~+)(.*)$/;
const HR_RE = /^ {0,3}(\*{3,}|-{3,}|_{3,})\s*$/;
const HEADING_RE = /^ {0,3}(#{1,6})(?:\s|$)/;
const IMAGE_RE = /^!\[[^\]]*\]\([^)]+\)\s*$/;
const BLOCKQUOTE_RE = /^ {0,3}>/;
const UL_ITEM_RE = /^(\s*)[-*+]\s+/;
const OL_ITEM_RE = /^(\s*)\d+\.\s+/;

/**
 * @param {string} line
 * @returns {{ marker: string, lang: string } | null}
 */
export function parseFence(line) {
  const m = line.match(FENCE_OPEN_RE);
  if (!m) return null;
  return { marker: m[1], lang: m[2].trim() };
}

/**
 * @param {string} line
 * @returns {boolean}
 */
export function isFenceOpen(line) {
  return FENCE_OPEN_RE.test(line);
}

/**
 * @param {string} line
 * @param {string} openMarker
 * @returns {boolean}
 */
export function isFenceClose(line, openMarker) {
  const char = openMarker[0];
  const minLen = openMarker.length;
  const m = line.match(/^ {0,3}(`{3,}|~{3,})\s*$/);
  if (!m) return false;
  const closeMarker = m[1];
  return closeMarker[0] === char && closeMarker.length >= minLen;
}

/**
 * @param {string} line
 * @returns {boolean}
 */
export function isHr(line) {
  return HR_RE.test(line);
}

/**
 * @param {string} line
 * @returns {boolean}
 */
export function isHeading(line) {
  return HEADING_RE.test(line);
}

/**
 * @param {string} line
 * @returns {number}
 */
export function headingLevel(line) {
  const m = line.match(HEADING_RE);
  return m ? m[1].length : 0;
}

/**
 * @param {string} line
 * @returns {boolean}
 */
export function isStandaloneImage(line) {
  return IMAGE_RE.test(line.trim());
}

/**
 * @param {string} line
 * @returns {boolean}
 */
export function isBlockquoteStart(line) {
  return BLOCKQUOTE_RE.test(line);
}

/**
 * @param {string} line
 * @returns {boolean}
 */
export function isBlockquoteLine(line) {
  return BLOCKQUOTE_RE.test(line);
}

/**
 * @param {string} line
 * @returns {boolean}
 */
export function isUlItem(line) {
  return UL_ITEM_RE.test(line);
}

/**
 * @param {string} line
 * @returns {boolean}
 */
export function isOlItem(line) {
  return OL_ITEM_RE.test(line);
}

/**
 * @param {string} line
 * @returns {boolean}
 */
export function isListItem(line) {
  return isUlItem(line) || isOlItem(line);
}

/**
 * @param {string} line
 * @returns {boolean}
 */
export function isTableRow(line) {
  const trimmed = line.trim();
  if (!trimmed.includes('|')) return false;
  return /^\|?.+\|.+/.test(trimmed) || /^\|.*\|.*$/.test(trimmed);
}

/**
 * @param {string} line
 * @returns {boolean}
 */
export function isIndentedLine(line) {
  return /^[ \t]/.test(line);
}

/**
 * @param {string} line
 * @returns {boolean}
 */
export function isBlockStarter(line) {
  return (
    isFenceOpen(line) ||
    isHr(line) ||
    isHeading(line) ||
    isStandaloneImage(line) ||
    isBlockquoteStart(line) ||
    isTableRow(line) ||
    isListItem(line)
  );
}

/**
 * Classify a block from its source text.
 * @param {string} source
 * @returns {BlockType}
 */
export function classifyBlock(source) {
  if (!source) return BLOCK_TYPES.PARAGRAPH;

  const lines = source.split('\n');
  const first = lines[0];

  if (isFenceOpen(first)) return BLOCK_TYPES.CODE;
  if (lines.length === 1 && isHr(first)) return BLOCK_TYPES.HR;
  if (isHeading(first)) return BLOCK_TYPES.HEADING;
  if (lines.length === 1 && isStandaloneImage(first)) return BLOCK_TYPES.IMAGE;
  if (isBlockquoteStart(first)) return BLOCK_TYPES.BLOCKQUOTE;
  if (isTableRow(first)) return BLOCK_TYPES.TABLE;
  if (isUlItem(first)) return BLOCK_TYPES.UL;
  if (isOlItem(first)) return BLOCK_TYPES.OL;

  return BLOCK_TYPES.PARAGRAPH;
}
