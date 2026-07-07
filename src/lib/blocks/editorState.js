import { blocksToMarkdown, BLOCK_TYPES, classifyBlock } from './index.js';

export const EMPTY_DRAFT_BLOCK_ID = 'empty-draft';

/**
 * Cursor movement is intentionally separate from content mutation.
 * @param {{ blockId: string, baseBlocks: import('./types.js').Block[], source: string, cursor: number } | null} session
 * @param {string} blockId
 * @param {number} cursor
 */
export function updateEditSessionCursor(session, blockId, cursor) {
  if (!session || session.blockId !== blockId) return session;
  return { ...session, cursor };
}

/**
 * Pick a block id after an operation that re-splits markdown. Whitespace-only
 * markdown can split to an empty array, so callers must not dereference the
 * fallback block without checking.
 * @param {import('./types.js').Block[]} blocks
 * @param {number} preferredIdx
 * @param {string} [emptyFallback=EMPTY_DRAFT_BLOCK_ID]
 */
export function pickSplitTargetId(blocks, preferredIdx, emptyFallback = EMPTY_DRAFT_BLOCK_ID) {
  return blocks[preferredIdx]?.id ?? blocks[blocks.length - 1]?.id ?? emptyFallback;
}

export function draftEnterMarkdown() {
  return '\n\n';
}

/**
 * Compose an active block edit into the current document, dropping any
 * following transient blocks that the active draft already owns.
 * @param {import('./types.js').Block[]} blocks
 * @param {number} idx
 * @param {string} source
 */
export function composeEditedMarkdown(blocks, idx, source) {
  const expandedSource = expandActiveEditSource(blocks, idx, source);
  const rangeEnd = activeEditRangeEnd(blocks, idx, expandedSource);
  const head = blocksToMarkdown(blocks.slice(0, idx));
  const tail = blocksToMarkdown(blocks.slice(rangeEnd));
  const block = blocks[idx];
  const leading = idx === 0 ? (block.meta?.before ?? '') : '';
  const trailing = rangeEnd === idx + 1 ? (block.meta?.after ?? '') : '';
  return head + leading + expandedSource + trailing + tail;
}

/**
 * Expand a source edit to cover deterministic adjacent blocks from the frozen
 * activation snapshot. This avoids fuzzy content matching against live resplits.
 * @param {import('./types.js').Block[]} blocks
 * @param {number} idx
 * @param {string} source
 */
export function expandActiveEditSource(blocks, idx, source) {
  const block = blocks[idx];
  if (!block || !isBlockquoteLike(block, source)) return source;

  let expanded = source;
  let scan = idx + 1;
  let separator = block.meta?.after ?? '';
  while (scan < blocks.length && blocks[scan].type === BLOCK_TYPES.BLOCKQUOTE) {
    if (!expanded.includes(blocks[scan].source)) {
      expanded += separator + blocks[scan].source;
    }
    separator = blocks[scan].meta?.after ?? '';
    scan++;
  }
  return expanded;
}

/**
 * @param {import('./types.js').Block[]} blocks
 * @param {number} idx
 * @param {string} source
 */
export function activeEditRangeEnd(blocks, idx, source) {
  let end = idx + 1;
  while (end < blocks.length && blocks[end].type === BLOCK_TYPES.BLOCKQUOTE && source.includes(blocks[end].source)) {
    end++;
  }
  return end;
}

/**
 * During active editing, the contenteditable draft is the source of truth for
 * the active block. The markdown splitter may temporarily see orphan siblings;
 * render the draft as one block and hide only the consecutive siblings it owns.
 * @param {import('./types.js').Block[]} blocks
 * @param {string | null} activeBlockId
 * @param {string | null} activeEditSource
 */
export function displayBlocksForActiveEdit(blocks, activeBlockId, activeEditSource) {
  if (!activeBlockId || !activeEditSource || activeBlockId === EMPTY_DRAFT_BLOCK_ID) return blocks;

  const activeIdx = blocks.findIndex((block) => block.id === activeBlockId);
  if (activeIdx === -1) return blocks;
  const expandedSource = expandActiveEditSource(blocks, activeIdx, activeEditSource);
  const rangeEnd = activeEditRangeEnd(blocks, activeIdx, expandedSource);

  return [
    ...blocks.slice(0, activeIdx),
    {
      ...blocks[activeIdx],
      source: expandedSource,
      type: isBlockquoteLike(blocks[activeIdx], expandedSource)
        ? BLOCK_TYPES.BLOCKQUOTE
        : classifyBlock(expandedSource),
    },
    ...blocks.slice(rangeEnd),
  ];
}

/**
 * @param {import('./types.js').Block} block
 * @param {string} source
 */
export function isBlockquoteLike(block, source) {
  if (block.type === BLOCK_TYPES.BLOCKQUOTE) return true;
  return source.split('\n').some((line) => /^ {0,3}>/.test(line));
}
