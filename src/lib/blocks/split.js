import {
  BLOCK_TYPES,
  classifyBlock,
  headingLevel,
  isBlockquoteLine,
  isBlockquoteStart,
  isFenceClose,
  isFenceOpen,
  isHr,
  isIndentedLine,
  isListItem,
  isOlItem,
  isTableRow,
  isUlItem,
  parseFence,
} from './types.js';

/**
 * @param {string[]} lines
 * @param {number} start
 * @returns {number}
 */
function consumeCodeBlock(lines, start) {
  const fence = parseFence(lines[start]);
  if (!fence) return start;

  let i = start + 1;
  while (i < lines.length) {
    if (isFenceClose(lines[i], fence.marker)) return i;
    i++;
  }
  return lines.length - 1;
}

/**
 * @param {string[]} lines
 * @param {number} start
 * @returns {number}
 */
function consumeTable(lines, start) {
  let i = start;
  while (i < lines.length && isTableRow(lines[i])) i++;
  return i - 1;
}

/**
 * @param {string[]} lines
 * @param {number} start
 * @returns {number}
 */
function consumeBlockquote(lines, start) {
  let i = start;
  while (i < lines.length) {
    if (isBlockquoteLine(lines[i])) {
      i++;
      continue;
    }
    if (lines[i].trim() === '') {
      let j = i + 1;
      while (j < lines.length && lines[j].trim() === '') j++;
      if (j < lines.length && isBlockquoteLine(lines[j])) {
        i++;
        continue;
      }
      break;
    }
    break;
  }
  return i - 1;
}

/**
 * @param {string[]} lines
 * @param {number} start
 * @returns {{ endLine: number, type: 'ul' | 'ol' }}
 */
function consumeList(lines, start) {
  const type = isUlItem(lines[start]) ? BLOCK_TYPES.UL : BLOCK_TYPES.OL;
  let i = start;

  while (i < lines.length) {
    const line = lines[i];

    if (isListItem(line)) {
      const itemIsUl = isUlItem(line);
      const itemIsOl = isOlItem(line);
      if (
        i > start &&
        ((type === BLOCK_TYPES.UL && itemIsOl && !isIndentedLine(line)) ||
          (type === BLOCK_TYPES.OL && itemIsUl && !isIndentedLine(line)))
      ) {
        break;
      }
      i++;
      continue;
    }

    if (line.trim() === '') {
      let j = i + 1;
      while (j < lines.length && lines[j].trim() === '') j++;
      if (j < lines.length) {
        const next = lines[j];
        const nextSameType =
          (type === BLOCK_TYPES.UL && isUlItem(next)) ||
          (type === BLOCK_TYPES.OL && isOlItem(next));
        if (nextSameType || isIndentedLine(next)) {
          i++;
          continue;
        }
      }
      break;
    }

    if (isIndentedLine(line)) {
      i++;
      continue;
    }

    break;
  }

  return { endLine: i - 1, type };
}

/**
 * @param {string[]} lines
 * @param {number} start
 * @returns {number}
 */
function consumeParagraph(lines, start) {
  let i = start;
  while (i < lines.length) {
    if (lines[i].trim() === '') break;
    if (i > start && isBlockStarterAt(lines[i])) break;
    i++;
  }
  return i - 1;
}

/**
 * @param {string} line
 * @returns {boolean}
 */
function isBlockStarterAt(line) {
  return (
    isFenceOpen(line) ||
    isHr(line) ||
    /^ {0,3}#{1,6}(?:\s|$)/.test(line) ||
    /^!\[[^\]]*\]\([^)]+\)\s*$/.test(line.trim()) ||
    isBlockquoteStart(line) ||
    isTableRow(line) ||
    isListItem(line)
  );
}

/**
 * @param {string[]} lines
 * @param {number} line
 * @returns {{ endLine: number, type: import('./types.js').BlockType }}
 */
function consumeBlock(lines, line) {
  const current = lines[line];

  if (isFenceOpen(current)) {
    return { endLine: consumeCodeBlock(lines, line), type: BLOCK_TYPES.CODE };
  }
  if (isHr(current)) {
    return { endLine: line, type: BLOCK_TYPES.HR };
  }
  if (/^ {0,3}#{1,6}(?:\s|$)/.test(current)) {
    return { endLine: line, type: BLOCK_TYPES.HEADING };
  }
  if (/^!\[[^\]]*\]\([^)]+\)\s*$/.test(current.trim())) {
    return { endLine: line, type: BLOCK_TYPES.IMAGE };
  }
  if (isBlockquoteStart(current)) {
    return { endLine: consumeBlockquote(lines, line), type: BLOCK_TYPES.BLOCKQUOTE };
  }
  if (isTableRow(current)) {
    return { endLine: consumeTable(lines, line), type: BLOCK_TYPES.TABLE };
  }
  if (isListItem(current)) {
    const { endLine, type } = consumeList(lines, line);
    return { endLine, type };
  }

  return { endLine: consumeParagraph(lines, line), type: BLOCK_TYPES.PARAGRAPH };
}

/**
 * @param {string} md
 * @returns {number[]}
 */
function lineStartIndices(md) {
  const starts = [0];
  for (let i = 0; i < md.length; i++) {
    if (md[i] === '\n') starts.push(i + 1);
  }
  return starts;
}

/**
 * Split markdown into lossless blocks.
 * @param {string} md
 * @returns {import('./types.js').Block[]}
 */
export function splitMarkdown(md) {
  if (md === '') return [];

  const lines = md.split('\n');
  const lineStarts = lineStartIndices(md);
  /** @type {import('./types.js').Block[]} */
  const blocks = [];
  let line = 0;
  let blockIndex = 0;

  while (line < lines.length) {
    while (line < lines.length && lines[line].trim() === '') {
      line++;
    }
    if (line >= lines.length) break;

    const startLine = line;
    const { endLine, type } = consumeBlock(lines, line);
    const source = lines.slice(startLine, endLine + 1).join('\n');

    const sourceStart = lineStarts[startLine];
    const sourceEnd = lineStarts[endLine] + lines[endLine].length;

    line = endLine + 1;
    while (line < lines.length && lines[line].trim() === '') {
      line++;
    }

    const nextStart = line < lines.length ? lineStarts[line] : md.length;
    const after = md.slice(sourceEnd, nextStart);

    /** @type {import('./types.js').BlockMeta} */
    const meta = { after };

    if (blockIndex === 0 && sourceStart > 0) {
      meta.before = md.slice(0, sourceStart);
    }

    if (type === BLOCK_TYPES.HEADING) {
      meta.level = headingLevel(lines[startLine]);
    }

    blocks.push({
      id: `block-${blockIndex}`,
      type: classifyBlock(source),
      source,
      meta,
    });

    blockIndex++;
  }

  return blocks;
}
