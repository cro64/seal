/**
 * @param {string} source
 */
export function lineStartOffsets(source) {
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
 * @param {string} source
 * @param {number} pos
 * @param {'left' | 'right'} direction
 * @param {{ compactBlockquotePrefixes?: boolean }} [options]
 */
export function moveCursorHorizontal(source, pos, direction, options = {}) {
  if (options.compactBlockquotePrefixes) {
    const compactMove = moveAcrossBlockquotePrefix(source, pos, direction);
    if (compactMove != null) return compactMove;
  }
  const delta = direction === 'left' ? -1 : 1;
  return Math.max(0, Math.min(source.length, pos + delta));
}

/**
 * Treat a source prefix like `> > ` as one visual marker cluster. The returned
 * offsets are still real source offsets; we just avoid making arrow keys pause
 * on every hidden prefix space.
 * @param {string} source
 * @param {number} pos
 * @param {'left' | 'right'} direction
 */
function moveAcrossBlockquotePrefix(source, pos, direction) {
  const { lines, starts } = lineStartOffsets(source);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineStart = starts[i];
    const prefixMatch = line.match(BQ_PREFIX_RE);
    const prefixLen = prefixMatch ? prefixMatch[1].length : 0;
    if (prefixLen === 0) continue;

    const prefixStart = lineStart;
    const prefixEnd = lineStart + prefixLen;
    if (pos < prefixStart || pos > prefixEnd) continue;

    if (direction === 'right' && pos < prefixEnd) return prefixEnd;
    if (direction === 'left' && pos > prefixStart) return prefixStart;
  }
  return null;
}

/**
 * @param {string} source
 * @param {number} pos
 * @returns {number}
 */
function lineIndexAtPos(source, pos) {
  const { lines, starts } = lineStartOffsets(source);
  for (let i = 0; i < lines.length; i++) {
    const lineStart = starts[i];
    const lineEnd = lineStart + lines[i].length;
    if (pos <= lineEnd) return i;
  }
  return Math.max(0, lines.length - 1);
}

/**
 * @param {string} source
 * @param {number} pos
 * @param {'up' | 'down'} direction
 */
export function moveCursorVertical(source, pos, direction) {
  const { lines, starts } = lineStartOffsets(source);
  const lineIndex = lineIndexAtPos(source, pos);
  const lineStart = starts[lineIndex];
  const lineLen = lines[lineIndex].length;
  const col = Math.min(Math.max(0, pos - lineStart), lineLen);
  const targetLine = direction === 'up' ? lineIndex - 1 : lineIndex + 1;
  if (targetLine < 0 || targetLine >= lines.length) return pos;

  const targetStart = starts[targetLine];
  const targetLen = lines[targetLine].length;
  const desiredCol = Math.min(col, targetLen);
  return targetStart + desiredCol;
}

/**
 * @param {HTMLElement} root
 * @param {number} [fallback=0]
 * @returns {number}
 */
export function getSelectionOffset(root, fallback = 0) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return fallback;
  const range = sel.getRangeAt(0);
  if (!root.contains(range.startContainer)) return fallback;
  const mapped = domPointToOffset(root, range.startContainer, range.startOffset);
  return mapped ?? fallback;
}

/** Largest source offset reachable in the current hybrid DOM. */
export function getMaxOffset(root) {
  let max = 0;
  walkTextLeaves(root, (_textNode, textStart, textLen) => {
    max = Math.max(max, textStart + textLen);
  });
  return max;
}

/**
 * @param {HTMLElement} root
 * @param {number} offset
 */
export function setSelectionOffset(root, offset) {
  const point = offsetToDomPoint(root, offset) ?? nearestDomPoint(root, offset);
  if (!point) return;
  const range = document.createRange();
  range.setStart(point.node, point.offset);
  range.collapse(true);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

/**
 * @param {HTMLElement} root
 * @param {number} [margin]
 */
export function scrollSelectionIntoView(root, margin = 80) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;

  const range = sel.getRangeAt(0);
  if (!root.contains(range.startContainer)) return;

  const rect = range.getClientRects()[0] ?? range.getBoundingClientRect();
  if (!rect || (rect.width === 0 && rect.height === 0 && rect.top === 0 && rect.left === 0)) return;

  const scroller = nearestScrollParent(root);
  const containerRect =
    scroller === document.scrollingElement
      ? { top: 0, bottom: window.innerHeight, left: 0, right: window.innerWidth }
      : scroller.getBoundingClientRect();

  const overflowTop = containerRect.top + margin - rect.top;
  const overflowBottom = rect.bottom - (containerRect.bottom - margin);
  if (overflowTop > 0) {
    scroller.scrollTop -= overflowTop;
  } else if (overflowBottom > 0) {
    scroller.scrollTop += overflowBottom;
  }

  const overflowLeft = containerRect.left + margin - rect.left;
  const overflowRight = rect.right - (containerRect.right - margin);
  if (overflowLeft > 0) {
    scroller.scrollLeft -= overflowLeft;
  } else if (overflowRight > 0) {
    scroller.scrollLeft += overflowRight;
  }
}

/**
 * @param {HTMLElement} el
 * @returns {HTMLElement}
 */
function nearestScrollParent(el) {
  let cur = el.parentElement;
  while (cur) {
    const style = window.getComputedStyle(cur);
    if (/(auto|scroll|overlay)/.test(`${style.overflow}${style.overflowY}${style.overflowX}`)) {
      return cur;
    }
    cur = cur.parentElement;
  }
  return /** @type {HTMLElement} */ (document.scrollingElement ?? document.documentElement);
}

/**
 * @param {HTMLElement} root
 * @param {number} offset
 * @returns {{ node: Node, offset: number } | null}
 */
function nearestDomPoint(root, offset) {
  const visible = nearestDomPointInLeaves(root, offset, false);
  if (visible) return visible;
  return nearestDomPointInLeaves(root, offset, true);
}

/**
 * @param {HTMLElement} root
 * @param {number} offset
 * @param {boolean} includeHiddenSlots
 * @returns {{ node: Node, offset: number } | null}
 */
function nearestDomPointInLeaves(root, offset, includeHiddenSlots) {
  /** @type {{ node: Node, offset: number, dist: number } | null} */
  let best = null;

  walkTextLeaves(root, (textNode, textStart, spanLen) => {
    const textEnd = textStart + spanLen;
    const domLen = textNode.textContent?.length ?? 0;
    let candidateOffset;
    if (offset <= textStart) candidateOffset = 0;
    else if (offset >= textEnd) candidateOffset = domLen;
    else candidateOffset = Math.min(offset - textStart, domLen);

    const mapped = textStart + Math.min(candidateOffset, spanLen);
    const dist = Math.abs(mapped - offset);
    if (!best || dist < best.dist) {
      best = { node: textNode, offset: candidateOffset, dist };
    }
  }, includeHiddenSlots);

  return best ? { node: best.node, offset: best.offset } : null;
}

/**
 * @param {HTMLElement} root
 * @param {number} offset
 * @returns {{ node: Node, offset: number } | null}
 */
function offsetToDomPoint(root, offset) {
  return offsetToDomPointInLeaves(root, offset, false);
}

/**
 * @param {HTMLElement} root
 * @param {number} offset
 * @param {boolean} includeHiddenSlots
 * @returns {{ node: Node, offset: number } | null}
 */
function offsetToDomPointInLeaves(root, offset, includeHiddenSlots) {
  /** @type {{ node: Node, offset: number } | null} */
  let result = null;

  walkTextLeaves(root, (textNode, textStart) => {
    if (result) return;
    if (offset === textStart) {
      result = { node: textNode, offset: 0 };
    }
  }, includeHiddenSlots);
  if (result) return result;

  walkTextLeaves(root, (textNode, textStart, spanLen) => {
    if (result) return;
    const textEnd = textStart + spanLen;
    if (offset > textStart && offset <= textEnd) {
      const domLen = textNode.textContent?.length ?? 0;
      result = { node: textNode, offset: Math.min(offset - textStart, domLen) };
    }
  }, includeHiddenSlots);

  return result;
}

/**
 * @param {HTMLElement} root
 * @param {Node} node
 * @param {number} offset
 */
function domPointToOffset(root, node, offset) {
  /** @type {number | null} */
  let result = null;

  walkTextLeaves(root, (textNode, textStart, spanLen) => {
    if (result != null) return;
    const domLen = textNode.textContent?.length ?? 0;
    if (textNode === node) {
      result = textStart + Math.min(offset, domLen, spanLen);
      return;
    }
    if (node.nodeType === Node.ELEMENT_NODE && textNode.parentNode === node) {
      result = textStart + Math.min(offset, domLen, spanLen);
    }
  });

  return result;
}

/**
 * @param {HTMLElement} root
 * @param {(textNode: Text, textStart: number, textLen: number) => void} fn
 * @param {boolean} [includeHiddenSlots=true]
 */
function walkTextLeaves(root, fn, includeHiddenSlots = true) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  /** @type {Text | null} */
  let textNode;
  while ((textNode = /** @type {Text | null} */ (walker.nextNode()))) {
    const parent = textNode.parentElement;
    if (!parent) continue;
    if (!includeHiddenSlots && parent.classList.contains('hybrid-slot')) continue;
    const s = parseInt(parent.getAttribute('data-s') ?? '', 10);
    const e = parseInt(parent.getAttribute('data-e') ?? '', 10);
    if (Number.isNaN(s) || Number.isNaN(e)) continue;
    const spanLen = e - s;
    if (spanLen < 0) continue;
    fn(textNode, s, spanLen);
  }
}

/**
 * @param {HTMLElement} blockEl
 * @param {MouseEvent} e
 * @param {string} source
 * @param {string} blockType
 */
export function clickToRenderedOffset(blockEl, e, source, blockType) {
  const range =
    document.caretRangeFromPoint?.(e.clientX, e.clientY) ??
    (() => {
      const pos = document.caretPositionFromPoint?.(e.clientX, e.clientY);
      if (!pos) return null;
      const r = document.createRange();
      r.setStart(pos.offsetNode, pos.offset);
      r.collapse(true);
      return r;
    })();

  if (!range || !blockEl.contains(range.startContainer)) {
    return source.length;
  }

  if (blockType === 'blockquote') {
    return blockquoteClickOffset(blockEl, range, source);
  }
  if (blockType === 'ul' || blockType === 'ol') {
    return listClickOffset(blockEl, range, source);
  }

  const renderedPos = textOffsetBefore(blockEl, range);
  return Math.min(renderedPos, source.length);
}

/**
 * @param {HTMLElement} root
 * @param {Range} range
 */
function textOffsetBefore(root, range) {
  const pre = document.createRange();
  pre.selectNodeContents(root);
  pre.setEnd(range.startContainer, range.startOffset);
  return pre.toString().length;
}

const BQ_PREFIX_RE = /^( {0,3}(?:> ?)+)/;
const LIST_MARKER_RE = /^(\s*(?:[-*+]|\d+\.)\s+)/;

/**
 * @param {HTMLElement} blockEl
 * @param {Range} range
 * @param {string} source
 */
function blockquoteClickOffset(blockEl, range, source) {
  const lines = source.split('\n');
  const { starts } = lineStartOffsets(source);
  const quote = blockEl.querySelector('blockquote') ?? blockEl;
  const lineEls = [...quote.querySelectorAll('p')];

  if (lineEls.length > 1) {
    let lineIndex = lineEls.length - 1;
    for (let i = 0; i < lineEls.length; i++) {
      if (lineEls[i].contains(range.startContainer)) {
        lineIndex = i;
        break;
      }
    }
    const idx = Math.min(lineIndex, lines.length - 1);
    const line = lines[idx];
    const m = line.match(BQ_PREFIX_RE);
    const prefixLen = m ? m[1].length : 0;
    const lineEl = lineEls[lineIndex];
    const lineRange = document.createRange();
    lineRange.selectNodeContents(lineEl);
    lineRange.setEnd(range.startContainer, range.startOffset);
    return starts[idx] + prefixLen + lineRange.toString().length;
  }

  const renderedPos = textOffsetBefore(quote, range);
  let rendered = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(BQ_PREFIX_RE);
    const prefixLen = m ? m[1].length : 0;
    const body = line.slice(prefixLen);
    if (renderedPos <= rendered + body.length) {
      return starts[i] + prefixLen + Math.max(0, renderedPos - rendered);
    }
    rendered += body.length;
    if (i < lines.length - 1) rendered += 1;
  }
  return source.length;
}

/**
 * @param {HTMLElement} blockEl
 * @param {Range} range
 * @param {string} source
 */
function listClickOffset(blockEl, range, source) {
  const items = parseListItemRanges(source);
  const list = blockEl.querySelector('ul, ol') ?? blockEl;
  const lineEls = [...list.querySelectorAll(':scope > li')];

  if (lineEls.length > 0) {
    let itemIndex = lineEls.length - 1;
    for (let i = 0; i < lineEls.length; i++) {
      if (lineEls[i].contains(range.startContainer)) {
        itemIndex = i;
        break;
      }
    }
    const item = items[Math.min(itemIndex, items.length - 1)];
    if (!item) return source.length;

    const lineEl = lineEls[Math.min(itemIndex, lineEls.length - 1)];
    const lineRange = document.createRange();
    lineRange.selectNodeContents(lineEl);
    lineRange.setEnd(range.startContainer, range.startOffset);
    const col = lineRange.toString().length;
    return item.contentStart + Math.min(col, item.end - item.contentStart);
  }

  return Math.min(textOffsetBefore(blockEl, range), source.length);
}

/**
 * @param {string} source
 */
function parseListItemRanges(source) {
  const lines = source.split('\n');
  const { starts } = lineStartOffsets(source);
  /** @type {{ start: number, end: number, contentStart: number }[]} */
  const items = [];
  /** @type {{ start: number, end: number, contentStart: number } | null} */
  let current = null;
  let baseIndent = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineStart = starts[i];
    const lineEnd = lineStart + line.length;
    const indent = (line.match(/^(\s*)/) ?? ['', ''])[1].length;
    const isItem = /^\s*(?:[-*+]|\d+\.)\s+/.test(line);

    if (isItem && (baseIndent == null || indent <= baseIndent)) {
      if (baseIndent == null) baseIndent = indent;
      if (current) items.push(current);
      const markerLen = (line.match(LIST_MARKER_RE) ?? ['', ''])[0].length;
      current = { start: lineStart, end: lineEnd, contentStart: lineStart + markerLen };
      continue;
    }

    if (current && (/^\s/.test(line) || line.trim() === '')) {
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

    if (current) current.end = lineEnd;
  }

  if (current) items.push(current);
  return items;
}

/**
 * @param {HTMLElement} blockEl
 * @param {MouseEvent} e
 * @param {number} sourceLength
 * @param {number} [fallback]
 */
export function clickToOffset(blockEl, e, sourceLength, fallback = sourceLength) {
  const range =
    document.caretRangeFromPoint?.(e.clientX, e.clientY) ??
    (() => {
      const pos = document.caretPositionFromPoint?.(e.clientX, e.clientY);
      if (!pos) return null;
      const r = document.createRange();
      r.setStart(pos.offsetNode, pos.offset);
      r.collapse(true);
      return r;
    })();

  if (range && blockEl.contains(range.startContainer)) {
    const mapped = domPointToOffset(blockEl, range.startContainer, range.startOffset);
    if (mapped != null) return Math.min(mapped, sourceLength);
    return Math.min(nearestOffsetFromPoint(blockEl, range.startContainer, range.startOffset, fallback), sourceLength);
  }
  return Math.min(fallback, sourceLength);
}

/**
 * @param {HTMLElement} root
 * @param {Node} node
 * @param {number} offset
 */
function nearestOffsetFromPoint(root, node, offset, fallback = 0) {
  /** @type {number | null} */
  let best = null;
  /** @type {number | null} */
  let bestDist = null;

  walkTextLeaves(root, (textNode, textStart, textLen) => {
    let candidate = null;
    if (textNode === node) {
      candidate = textStart + Math.min(offset, textLen);
    } else if (node.nodeType === Node.ELEMENT_NODE && textNode.parentNode === node) {
      candidate = textStart + Math.min(offset, textLen);
    }
    if (candidate == null) return;

    const dist = Math.abs(candidate - (textStart + textLen / 2));
    if (bestDist == null || dist < bestDist) {
      best = candidate;
      bestDist = dist;
    }
  });

  return best ?? fallback;
}
