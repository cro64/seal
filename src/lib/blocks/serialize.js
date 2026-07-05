/**
 * Serialize blocks back into a markdown string.
 * @param {import('./types.js').Block[]} blocks
 * @returns {string}
 */
export function blocksToMarkdown(blocks) {
  if (!blocks || blocks.length === 0) return '';

  return blocks
    .map((block, index) => {
      const before = index === 0 ? (block.meta?.before ?? '') : '';
      const after = block.meta?.after ?? (index < blocks.length - 1 ? '\n\n' : '');
      return before + block.source + after;
    })
    .join('');
}
