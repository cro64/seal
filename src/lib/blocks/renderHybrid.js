import { parseInline, getOffsetModes } from './inline.js';
import {
  BLOCK_TYPES,
  isFenceClose,
  isIndentedLine,
  isListItem,
  isOlItem,
  parseFence,
} from './types.js';
import { parseMarkdown } from '../markdown.js';
import { splitMarkdown } from './split.js';

const LIST_MARKER_RE = /^(\s*(?:[-*+]|\d+\.)\s+)/;
const BQ_PREFIX_RE = /^( {0,3}(?:> ?)+)/;
const TABLE_SEP_RE = /^\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/;

function esc(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {string} source
 */
function lineOffsets(source) {
  const lines = source.split('\n');
  /** @type {number[]} */
  const starts = [];
  let offset = 0;
  for (let i = 0; i < lines.length; i++) {
    starts.push(offset);
    offset += lines[i].length + (i < lines.length - 1 ? 1 : 0);
  }
  return { lines, starts };
}

/**
 * @param {import('./types.js').Block} block
 * @param {number | null} cursorOffset
 * @param {{ staticMode?: 'markdown' | 'hybrid', showBlockquoteMarker?: boolean }} [options]
 */
export function renderHybridBlock(block, cursorOffset, options = {}) {
  const { type, source, meta } = block;
  const staticMode = options.staticMode ?? 'markdown';

  if (type === BLOCK_TYPES.HR) {
    if (cursorOffset != null) {
      return `<div class="hybrid-hr">${leafSyntax(source, 0, source.length)}</div>`;
    }
    return staticMode === 'hybrid' ? `<div class="hybrid-hr">${leafText(source, 0, source.length)}</div>` : parseMarkdown(source);
  }

  if (type === BLOCK_TYPES.IMAGE) {
    const spans = parseInline(source, 0);
    const img = spans.find((s) => s.type === 'image') ?? spans[0];
    if (img?.type === 'image') {
      const modes = getOffsetModes(spans, cursorOffset);
      if (spanShowsSource(img, modes)) {
        return `<p class="hybrid-img">${leafSyntax(img.raw ?? source, img.start, img.end)}</p>`;
      }
      const alt = esc(img.text);
      const src = esc(img.url ?? '');
      return `<p class="hybrid-img"><img src="${src}" alt="${alt}" data-s="${img.start}" data-e="${img.end}" /></p>`;
    }
  }

  if (type === BLOCK_TYPES.HEADING) {
    const level = meta?.level ?? 1;
    const m = source.match(/^(#{1,6}\s)([\s\S]*)$/);
    if (m) {
      const prefix = m[1];
      const body = m[2];
      const prefixLen = prefix.length;
      const inPrefix = cursorOffset != null && cursorOffset <= prefixLen;
      const prefixHtml = inPrefix
        ? leafSyntax(prefix, 0, prefix.length)
        : leafSlot(prefix, 0, prefix.length);
      const bodyCursor = cursorOffset != null && !inPrefix
        ? Math.max(0, cursorOffset - prefixLen)
        : null;
      const bodyHtml = renderHybridInline(body, bodyCursor, prefixLen);
      return `<h${level} class="hybrid-h">${prefixHtml}${bodyHtml}</h${level}>`;
    }
  }

  if (type === BLOCK_TYPES.PARAGRAPH) {
    return `<p class="hybrid-p">${renderHybridInline(source, cursorOffset, 0)}</p>`;
  }

  if (type === BLOCK_TYPES.BLOCKQUOTE) {
    return renderHybridBlockquote(source, cursorOffset, staticMode, options.showBlockquoteMarker ?? true);
  }

  if (type === BLOCK_TYPES.CODE) {
    return renderHybridCode(source, cursorOffset, staticMode);
  }

  if (type === BLOCK_TYPES.UL || type === BLOCK_TYPES.OL) {
    return renderHybridList(source, type, cursorOffset, 0, staticMode);
  }

  if (type === BLOCK_TYPES.TABLE) {
    return renderHybridTable(source, cursorOffset, staticMode);
  }

  return `<div class="hybrid-fallback">${renderHybridInline(source, cursorOffset, 0)}</div>`;
}

/**
 * @param {string} source
 * @param {number | null} cursorOffset
 * @param {'markdown' | 'hybrid'} staticMode
 * @param {boolean} showBlockquoteMarker
 */
function renderHybridBlockquote(source, cursorOffset, staticMode = 'markdown', showBlockquoteMarker = true) {
  if (cursorOffset == null && staticMode === 'markdown') return parseMarkdown(source);

  const { lines, starts } = lineOffsets(source);
  const hasNonQuoteLine = lines.some((line) => line.trim() && !BQ_PREFIX_RE.test(line));
  if (hasNonQuoteLine) {
    return renderHybridMixedBlockquote(source, lines, starts, cursorOffset, showBlockquoteMarker);
  }
  return renderHybridBlockquoteMarkdown(source, lines, starts, cursorOffset, source.length, showBlockquoteMarker);
}

/**
 * @param {string[]} lines
 * @param {number[]} starts
 * @param {number | null} cursorOffset
 */
function renderHybridBlockquoteLines(lines, starts, cursorOffset) {
  /** @type {string[]} */
  const parts = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineStart = starts[i];
    const lineEnd = lineStart + line.length;
    const prefixMatch = line.match(BQ_PREFIX_RE);
    const prefixLen = prefixMatch ? prefixMatch[1].length : 0;
    const prefixEnd = lineStart + prefixLen;
    const showPrefix =
      cursorOffset != null && cursorOffset >= lineStart && cursorOffset < prefixEnd;

    if (showPrefix) {
      parts.push(leafSyntax(line.slice(0, prefixLen), lineStart, prefixEnd));
    } else if (prefixLen > 0) {
      parts.push(leafSlot(line.slice(0, prefixLen), lineStart, prefixEnd));
    }

    parts.push(
      renderHybridInline(
        line.slice(prefixLen),
        cursorOffset != null && cursorOffset >= prefixEnd && cursorOffset <= lineEnd
          ? cursorOffset - prefixEnd
          : null,
        prefixEnd
      )
    );

    if (i < lines.length - 1) parts.push(leafNewline(lineEnd));
  }

  return `<blockquote class="hybrid-bq">${parts.join('')}</blockquote>`;
}

/**
 * @param {string} source
 * @param {string[]} lines
 * @param {number[]} starts
 * @param {number | null} cursorOffset
 */
function renderHybridBlockquoteMarkdown(source, lines, starts, cursorOffset, sourceLength = source.length, showBlockquoteMarker = true) {
  const { innerSource, offsetMap } = stripBlockquoteLevel(lines, starts, sourceLength);
  const innerCursor = cursorOffset == null ? null : originalToInnerOffset(lines, starts, cursorOffset);
  const prefixMarker = showBlockquoteMarker ? blockquotePrefixMarker(lines, starts, cursorOffset) : null;
  const innerBlocks = splitMarkdown(innerSource);
  let searchFrom = 0;
  const html = innerBlocks
    .map((block) => {
      const blockStart = innerSource.indexOf(block.source, searchFrom);
      const safeStart = blockStart === -1 ? searchFrom : blockStart;
      const blockEnd = safeStart + block.source.length;
      searchFrom = blockEnd + (block.meta?.after?.length ?? 0);
      const blockHtml = renderHybridBlock(
        block,
        innerCursor != null && innerCursor >= safeStart && innerCursor <= blockEnd
          ? innerCursor - safeStart
          : null,
        { staticMode: 'hybrid', showBlockquoteMarker: false }
      );
      return shiftHybridOffsets(blockHtml, safeStart);
    })
    .join('');

  const mappedHtml = mapHybridOffsets(html, offsetMap, sourceLength);
  const markedHtml = prefixMarker
    ? insertHtmlBeforeOffset(mappedHtml, prefixMarker.anchorOffset, prefixMarker.html)
    : mappedHtml;
  return `<blockquote class="hybrid-bq">${markedHtml}</blockquote>`;
}

/**
 * Structural blockquote rendering strips source quote prefixes. Keep the active
 * line's quote marker visible so prefix edits still feel source-backed.
 * @param {string[]} lines
 * @param {number[]} starts
 * @param {number | null} cursorOffset
 */
function blockquotePrefixMarker(lines, starts, cursorOffset) {
  if (cursorOffset == null) return null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineStart = starts[i];
    const lineEnd = lineStart + line.length;
    if (cursorOffset < lineStart || cursorOffset > lineEnd) continue;
    const prefixMatch = line.match(BQ_PREFIX_RE);
    if (!prefixMatch) return '';
    const prefix = prefixMatch[1];
    const rel = cursorOffset - lineStart;
    const markers = [];
    for (let j = 0; j < prefix.length; j++) {
      if (prefix[j] === '>') markers.push(j);
    }
    const adjacent = markers.some((marker) => rel === marker || rel === marker + 1);
    if (!adjacent) return null;
    const compact = '>'.repeat(markers.length);
    return {
      anchorOffset: lineStart + prefix.length,
      html: `<span class="md-syntax hybrid-bq-prefix" data-s="${lineStart}" data-e="${lineStart + prefix.length}">${esc(compact)}</span>`,
    };
  }
  return null;
}

/**
 * @param {string[]} lines
 * @param {number[]} starts
 * @param {number} sourceLength
 */
function stripBlockquoteLevel(lines, starts, sourceLength) {
  /** @type {string[]} */
  const parts = [];
  /** @type {number[]} */
  const offsetMap = [];
  let innerOffset = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineStart = starts[i];
    const prefixMatch = line.match(/^( {0,3}>\s?)/);
    const prefixLen = prefixMatch ? prefixMatch[1].length : 0;
    const body = line.slice(prefixLen);

    parts.push(body);
    for (let j = 0; j < body.length; j++) {
      offsetMap[innerOffset++] = lineStart + prefixLen + j;
    }

    if (i < lines.length - 1) {
      parts.push('\n');
      offsetMap[innerOffset++] = lineStart + line.length;
    }
  }

  offsetMap[innerOffset] = sourceLength;
  return { innerSource: parts.join(''), offsetMap };
}

/**
 * @param {string[]} lines
 * @param {number[]} starts
 * @param {number} originalOffset
 */
function originalToInnerOffset(lines, starts, originalOffset) {
  let innerOffset = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineStart = starts[i];
    const lineEnd = lineStart + line.length;
    const prefixMatch = line.match(/^( {0,3}>\s?)/);
    const prefixLen = prefixMatch ? prefixMatch[1].length : 0;
    const bodyStart = lineStart + prefixLen;

    if (originalOffset >= lineStart && originalOffset < bodyStart) {
      return innerOffset;
    }

    if (originalOffset >= bodyStart && originalOffset <= lineEnd) {
      return innerOffset + originalOffset - bodyStart;
    }
    if (i < lines.length - 1 && originalOffset === lineEnd) {
      return innerOffset + line.length - prefixLen;
    }

    innerOffset += line.length - prefixLen;
    if (i < lines.length - 1) innerOffset += 1;
  }

  return innerOffset;
}

/**
 * @param {string[]} lines
 * @param {number[]} starts
 * @param {number | null} cursorOffset
 */
function cursorInBlockquotePrefix(lines, starts, cursorOffset) {
  if (cursorOffset == null) return false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineStart = starts[i];
    const prefixMatch = line.match(BQ_PREFIX_RE);
    const prefixLen = prefixMatch ? prefixMatch[1].length : 0;
    if (prefixLen > 0 && cursorOffset >= lineStart && cursorOffset < lineStart + prefixLen) {
      return true;
    }
  }
  return false;
}

/**
 * @param {string} html
 * @param {number[]} offsetMap
 * @param {number} sourceLength
 */
function mapHybridOffsets(html, offsetMap, sourceLength) {
  return html.replace(/data-s="(\d+)" data-e="(\d+)"/g, (_match, sRaw, eRaw) => {
    const s = Number(sRaw);
    const e = Number(eRaw);
    const mappedStart = offsetMap[Math.min(s, offsetMap.length - 1)] ?? sourceLength;
    const mappedEnd =
      e > s
        ? (offsetMap[Math.min(e - 1, offsetMap.length - 1)] ?? sourceLength) + 1
        : mappedStart;
    return `data-s="${mappedStart}" data-e="${Math.min(mappedEnd, sourceLength)}"`;
  });
}

/**
 * @param {string} html
 * @param {number} offset
 * @param {string} insertHtml
 */
function insertHtmlBeforeOffset(html, offset, insertHtml) {
  const spanRe = /<span\b[^>]*data-s="(\d+)" data-e="(\d+)"[^>]*>/g;
  let match;
  while ((match = spanRe.exec(html))) {
    const s = Number(match[1]);
    const e = Number(match[2]);
    if (s >= offset || (s <= offset && offset <= e)) {
      return `${html.slice(0, match.index)}${insertHtml}${html.slice(match.index)}`;
    }
  }
  return `${insertHtml}${html}`;
}

/**
 * @param {string} html
 * @param {number} delta
 */
function shiftHybridOffsets(html, delta) {
  if (delta === 0) return html;
  return html.replace(/data-s="(\d+)" data-e="(\d+)"/g, (_match, sRaw, eRaw) => {
    return `data-s="${Number(sRaw) + delta}" data-e="${Number(eRaw) + delta}"`;
  });
}

/**
 * Renders a temporarily malformed blockquote while editing. If deleting `>` makes
 * one line a paragraph, active mode should resemble the eventual split preview.
 * @param {string} source
 * @param {string[]} lines
 * @param {number[]} starts
 * @param {number | null} cursorOffset
 * @param {boolean} showBlockquoteMarker
 */
function renderHybridMixedBlockquote(source, lines, starts, cursorOffset, showBlockquoteMarker = true) {
  /** @type {string[]} */
  const parts = [];
  /** @type {string[]} */
  let quoteLines = [];
  /** @type {number[]} */
  let quoteStarts = [];

  function flushQuote() {
    if (!quoteLines.length) return;
    parts.push(renderHybridBlockquoteMarkdown(source, quoteLines, quoteStarts, cursorOffset, source.length, showBlockquoteMarker));
    quoteLines = [];
    quoteStarts = [];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineStart = starts[i];
    const lineEnd = lineStart + line.length;
    const prefixMatch = line.match(BQ_PREFIX_RE);

    if (line.trim() && !prefixMatch) {
      flushQuote();
      parts.push(
        `<p class="hybrid-p">${renderHybridInline(
          line,
          cursorOffset != null && cursorOffset >= lineStart && cursorOffset <= lineEnd
            ? cursorOffset - lineStart
            : null,
          lineStart
        )}</p>`
      );
      if (i < lines.length - 1) parts.push(leafSlot('\n', lineEnd, lineEnd + 1));
      continue;
    }

    quoteLines.push(line);
    quoteStarts.push(lineStart);
  }

  flushQuote();
  return parts.join('');
}

/**
 * @param {string} source
 * @param {number | null} cursorOffset
 * @param {'markdown' | 'hybrid'} staticMode
 */
function renderHybridCode(source, cursorOffset, staticMode = 'markdown') {
  if (cursorOffset == null && staticMode === 'markdown') return parseMarkdown(source);

  const { lines, starts } = lineOffsets(source);
  const fence = parseFence(lines[0]);
  if (!fence) {
    return `<pre class="hybrid-code"><code>${leafText(source, 0, source.length)}</code></pre>`;
  }

  const last = lines.length - 1;
  const hasClose = last > 0 && isFenceClose(lines[last], fence.marker);
  const openStart = starts[0];
  const openEnd = openStart + lines[0].length;
  const bodyStart = lines.length > 1 ? starts[1] : source.length;
  const closeStart = hasClose ? starts[last] : source.length;
  const bodyEnd = closeStart;
  const closeEnd = hasClose ? closeStart + lines[last].length : source.length;

  const inOpen = cursorOffset != null && cursorOffset >= openStart && cursorOffset <= openEnd;
  const inClose = cursorOffset != null && hasClose && cursorOffset >= closeStart && cursorOffset <= closeEnd;
  const inBody = cursorOffset != null && cursorOffset >= bodyStart && cursorOffset <= bodyEnd;

  if (inBody && !inOpen && !inClose) {
    return `<pre class="hybrid-code"><code>${leafText(source.slice(bodyStart, bodyEnd), bodyStart, bodyEnd)}</code></pre>`;
  }

  /** @type {string[]} */
  const parts = [];
  if (inOpen) {
    parts.push(leafSyntax(lines[0], openStart, openEnd));
    if (bodyEnd > bodyStart) {
      parts.push(leafNewline(openEnd));
      parts.push(leafText(source.slice(bodyStart, bodyEnd), bodyStart, bodyEnd));
    }
  } else if (inClose) {
    if (bodyEnd > bodyStart) {
      parts.push(leafText(source.slice(bodyStart, bodyEnd), bodyStart, bodyEnd));
      parts.push(leafNewline(bodyEnd));
    }
    parts.push(leafSyntax(source.slice(closeStart, closeEnd), closeStart, closeEnd));
  } else {
    parts.push(leafText(source.slice(bodyStart, bodyEnd), bodyStart, bodyEnd));
  }

  return `<pre class="hybrid-code"><code>${parts.join('')}</code></pre>`;
}

/**
 * @param {string} source
 * @param {string} type
 * @param {number | null} cursorOffset
 * @param {number} [baseOffset]
 * @param {'markdown' | 'hybrid'} [staticMode]
 */
function renderHybridList(source, type, cursorOffset, baseOffset = 0, staticMode = 'markdown') {
  if (cursorOffset == null && staticMode === 'markdown') return parseMarkdown(source);

  const tag = type === BLOCK_TYPES.OL ? 'ol' : 'ul';
  const items = parseListItems(source, baseOffset);
  const html = items
    .map((item) => {
      const { content, markerActive } = renderListItem(item, cursorOffset, source, baseOffset, staticMode);
      const cls = markerActive ? 'hybrid-li hybrid-li-marker' : 'hybrid-li';
      return `<li class="${cls}">${content}</li>`;
    })
    .join('');
  return `<${tag} class="hybrid-list">${html}</${tag}>`;
}

/**
 * @param {string} line
 */
function listItemIndent(line) {
  const m = line.match(/^(\s*)/);
  return m ? m[1].length : 0;
}

/**
 * @param {string} source
 * @param {number} [baseOffset=0]
 * @returns {{ start: number, end: number }[]}
 */
function parseListItems(source, baseOffset = 0) {
  const { lines, starts } = lineOffsets(source);
  /** @type {{ start: number, end: number }[]} */
  const items = [];
  /** @type {{ start: number, end: number } | null} */
  let current = null;
  /** @type {number | null} */
  let baseIndent = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineStart = baseOffset + starts[i];
    const lineEnd = lineStart + line.length;
    const indent = listItemIndent(line);

    if (isListItem(line) && (baseIndent == null || indent <= baseIndent)) {
      if (baseIndent == null) baseIndent = indent;
      if (current) items.push(current);
      current = { start: lineStart, end: lineEnd };
      continue;
    }

    if (current && (isIndentedLine(line) || line.trim() === '')) {
      current.end = lineEnd;
      continue;
    }

    if (line.trim() === '') {
      if (current) {
        items.push(current);
        current = null;
        baseIndent = null;
      }
      continue;
    }

    if (current) {
      current.end = lineEnd;
    }
  }

  if (current) items.push(current);
  return items;
}

/**
 * @param {{ start: number, end: number }} item
 * @param {number | null} cursorOffset
 * @param {string} source
 * @param {number} baseOffset
 * @param {'markdown' | 'hybrid'} staticMode
 * @returns {{ content: string, markerActive: boolean }}
 */
function renderListItem(item, cursorOffset, source, baseOffset = 0, staticMode = 'markdown') {
  const relStart = item.start - baseOffset;
  const relEnd = item.end - baseOffset;
  const itemSource = source.slice(Math.max(0, relStart), Math.max(0, relEnd));
  const lines = itemSource.split('\n');
  const { starts: relStarts } = lineOffsets(itemSource);
  /** @type {string[]} */
  const parts = [];
  let markerActive = false;

  const parentIndent = listItemIndent(lines[0] ?? '');
  const inItem = cursorOffset != null && cursorOffset >= item.start && cursorOffset <= item.end;

  // First line: marker + body
  {
    const line = lines[0];
    const lineStart = item.start;
    const lineEnd = lineStart + line.length;
    const markerMatch = line.match(LIST_MARKER_RE);
    const markerLen = markerMatch ? markerMatch[0].length : 0;
    const markerEnd = lineStart + markerLen;
    const showMarker =
      inItem && cursorOffset != null && cursorOffset >= lineStart && cursorOffset < markerEnd;

    if (showMarker) {
      markerActive = true;
      parts.push(leafSyntax(line.slice(0, markerLen), lineStart, markerEnd));
    } else if (markerLen > 0) {
      parts.push(leafSlot(line.slice(0, markerLen), lineStart, markerEnd));
    }

    parts.push(
      renderHybridInline(
        line.slice(markerLen),
        inItem && cursorOffset != null && cursorOffset >= markerEnd && cursorOffset <= lineEnd
          ? cursorOffset - markerEnd
          : null,
        markerEnd
      )
    );
  }

  let i = 1;
  while (i < lines.length) {
    const line = lines[i];
    const lineStart = item.start + relStarts[i];
    const lineEnd = lineStart + line.length;
    const nlOffset = lineStart - 1;
    if (nlOffset >= item.start) {
      parts.push(leafNewline(nlOffset));
    }

    if (line.trim() === '') {
      parts.push(leafText('', lineStart, lineEnd));
      i++;
      continue;
    }

    const indent = listItemIndent(line);
    if (isListItem(line) && indent > parentIndent) {
      let j = i;
      let absEnd = lineEnd;
      while (j < lines.length) {
        const l = lines[j];
        const lAbsStart = item.start + relStarts[j];
        const lAbsEnd = lAbsStart + l.length;

        if (l.trim() === '') {
          absEnd = lAbsEnd;
          j++;
          continue;
        }

        if (isListItem(l) && listItemIndent(l) <= parentIndent) break;

        absEnd = lAbsEnd;
        j++;
      }

      const nestedSource = lines.slice(i, j).join('\n');
      const nestedType = isOlItem(line) ? BLOCK_TYPES.OL : BLOCK_TYPES.UL;
      const nestedBase = item.start + relStarts[i];
      parts.push(renderHybridList(nestedSource, nestedType, cursorOffset, nestedBase, staticMode));
      i = j;
      continue;
    }

    parts.push(
      renderHybridInline(
        line,
        inItem && cursorOffset != null && cursorOffset >= lineStart && cursorOffset <= lineEnd
          ? cursorOffset - lineStart
          : null,
        lineStart
      )
    );
    i++;
  }

  return { content: parts.join(''), markerActive };
}

/**
 * @param {string} source
 * @param {number | null} cursorOffset
 */
function renderHybridTable(source, cursorOffset, staticMode = 'markdown') {
  if (cursorOffset == null && staticMode === 'markdown') return parseMarkdown(source);

  const { lines, starts } = lineOffsets(source);
  /** @type {string[]} */
  const rows = [];
  let rowIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineStart = starts[i];
    const lineEnd = lineStart + line.length;

    if (isTableSeparatorRow(line)) {
      const separatorHtml =
        cursorOffset != null && cursorOffset >= lineStart && cursorOffset <= lineEnd
          ? leafSyntax(line, lineStart, lineEnd)
          : leafSlot(line, lineStart, lineEnd);
      rows.push(`<tr class="hybrid-table-sep"><td colspan="99">${separatorHtml}</td></tr>`);
      rowIndex++;
      continue;
    }

    const cells = parseTableRow(line, lineStart);
    const isHeader = rowIndex === 0;
    const cellHtml = cells
      .map((cell) => {
        const tag = isHeader ? 'th' : 'td';
        return `<${tag}>${renderTableCell(cell, cursorOffset, line, lineStart)}</${tag}>`;
      })
      .join('');
    rows.push(`<tr>${cellHtml}</tr>`);
    rowIndex++;
  }

  return `<table class="hybrid-table"><tbody>${rows.join('')}</tbody></table>`;
}

/**
 * @param {string} line
 */
function isTableSeparatorRow(line) {
  return TABLE_SEP_RE.test(line.trim());
}

/**
 * @param {string} line
 * @param {number} lineStart
 */
function parseTableRow(line, lineStart) {
  /** @type {{ start: number, end: number, contentStart: number, contentEnd: number, content: string }[]} */
  const cells = [];
  let i = 0;

  while (i < line.length) {
    if (line[i] !== '|') {
      i++;
      continue;
    }
    i++;
    const pos = i;
    while (i < line.length && line[i] !== '|') i++;
    const raw = line.slice(pos, i);
    const cellStart = lineStart + pos;
    const cellEnd = lineStart + i;
    const trimmed = raw.trim();
    if (!trimmed && cells.length === 0 && line.trimStart().startsWith('|')) {
      continue;
    }
    const trimLeft = trimmed ? raw.indexOf(trimmed) : 0;
    cells.push({
      start: cellStart,
      end: cellEnd,
      contentStart: cellStart + trimLeft,
      contentEnd: cellStart + trimLeft + trimmed.length,
      content: trimmed,
    });
  }

  return cells;
}

/**
 * @param {{ start: number, end: number, contentStart: number, contentEnd: number, content: string }} cell
 * @param {number | null} cursorOffset
 * @param {string} line
 * @param {number} lineStart
 */
function renderTableCell(cell, cursorOffset, line, lineStart) {
  const inCell = cursorOffset != null && cursorOffset >= cell.start && cursorOffset <= cell.end;
  if (!inCell) {
    return renderHybridInline(cell.content, null, cell.contentStart);
  }

  /** @type {string[]} */
  const parts = [];
  const relLineStart = cell.start - lineStart;
  const relLineEnd = cell.end - lineStart;
  const paddingBefore = line.slice(relLineStart, cell.contentStart - lineStart);
  const paddingAfter = line.slice(cell.contentEnd - lineStart, relLineEnd);

  if (paddingBefore && cursorOffset != null && cursorOffset < cell.contentStart) {
    parts.push(leafSyntax(paddingBefore, cell.start, cell.contentStart));
  }

  parts.push(
    renderHybridInline(
      cell.content,
      cursorOffset != null && cursorOffset >= cell.contentStart && cursorOffset <= cell.contentEnd
        ? cursorOffset - cell.contentStart
        : null,
      cell.contentStart
    )
  );

  if (paddingAfter && cursorOffset != null && cursorOffset > cell.contentEnd) {
    parts.push(leafSyntax(paddingAfter, cell.contentEnd, cell.end));
  }

  return parts.join('');
}

/**
 * @param {string} source
 * @param {number | null} cursorOffset - offset within `source`
 * @param {number} baseOffset - added to span positions for getOffsetModes
 */
function renderHybridInline(source, cursorOffset, baseOffset) {
  if (!source) return emptyLeaf(baseOffset);

  const spans = parseInline(source, baseOffset);
  const absCursor = cursorOffset != null ? cursorOffset + baseOffset : null;
  const modes = getOffsetModes(spans, absCursor);

  return spans.map((span) => renderSpan(span, modes)).join('');
}

/**
 * @param {import('./inline.js').Span} span
 * @param {('rendered'|'source')[]} modes
 */
function renderSpan(span, modes) {
  if (spanShowsSource(span, modes)) {
    return leafSyntax(span.raw ?? span.text, span.start, span.end);
  }

  switch (span.type) {
    case 'text':
      return leafText(span.text, span.start, span.end);
    case 'bold':
      return `<strong>${renderChildren(span, modes)}</strong>`;
    case 'italic':
      return `<em>${renderChildren(span, modes)}</em>`;
    case 'boldItalic':
      return `<strong><em>${renderChildren(span, modes)}</em></strong>`;
    case 'strikethrough':
      return `<del>${renderChildren(span, modes)}</del>`;
    case 'code':
      return `<code>${leafText(span.text, span.start, span.end)}</code>`;
    case 'link': {
      const href = esc(span.url ?? '');
      const title = span.title ? ` title="${esc(span.title)}"` : '';
      return `<a href="${href}"${title} data-s="${span.start}" data-e="${span.end}">${renderChildren(span, modes) || leafText(span.text, span.start, span.end)}</a>`;
    }
    case 'image': {
      if (spanShowsSource(span, modes)) {
        return leafSyntax(span.raw ?? `![${span.text}](${span.url})`, span.start, span.end);
      }
      const alt = esc(span.text);
      const src = esc(span.url ?? '');
      return `<img src="${src}" alt="${alt}" data-s="${span.start}" data-e="${span.end}" />`;
    }
    default:
      return leafText(span.text, span.start, span.end);
  }
}

/** @param {import('./inline.js').Span} span @param {('rendered'|'source')[]} modes */
function renderChildren(span, modes) {
  if (!span.children?.length) return leafText(span.text, span.start, span.end);
  return span.children.map((c) => renderSpan(c, modes)).join('');
}

/** @param {import('./inline.js').Span} span @param {('rendered'|'source')[]} modes */
function spanShowsSource(span, modes) {
  for (let i = span.start; i < span.end; i++) {
    if (modes[i] === 'source') return true;
  }
  return false;
}

/** @param {string} text @param {number} s @param {number} e */
function leafText(text, s, e) {
  return `<span data-s="${s}" data-e="${e}">${esc(text)}</span>`;
}

/** @param {number} offset */
function emptyLeaf(offset) {
  return `<span class="hybrid-empty-anchor" data-s="${offset}" data-e="${offset}">&#8203;</span>`;
}

/** @param {number} offset - source offset of the newline character */
function leafNewline(offset) {
  return leafText('\n', offset, offset + 1);
}

/** @param {string} raw @param {number} s @param {number} e */
function leafSyntax(raw, s, e) {
  return `<span class="md-syntax" data-s="${s}" data-e="${e}">${esc(raw)}</span>`;
}

/** Mapped in DOM but invisible — every source offset stays reachable. */
function leafSlot(raw, s, e) {
  return `<span class="hybrid-slot" data-s="${s}" data-e="${e}">${esc(raw)}</span>`;
}

/** @deprecated All blocks use hybrid editing now. */
export function isSourceOnlyBlock(_type) {
  return false;
}
