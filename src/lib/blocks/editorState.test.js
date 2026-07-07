import assert from 'node:assert/strict';
import { splitMarkdown } from './index.js';
import {
  composeEditedMarkdown,
  displayBlocksForActiveEdit,
  draftEnterMarkdown,
  EMPTY_DRAFT_BLOCK_ID,
  pickSplitTargetId,
  updateEditSessionCursor,
} from './editorState.js';

let passed = 0;
let failed = 0;

/**
 * @param {string} name
 * @param {() => void} fn
 */
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err instanceof Error ? err.message : err}`);
  }
}

const restoredQuote = `>**Pro tip:** You can nest just about anything inside a blockquote:
>
> 1. Ordered lists
> 2. With **bold** and *italic* text
>    - And sub-items
>
> \`\`\`
> Even code blocks
> \`\`\`
>
> And tables:
>
> | A | B |
> |---|---|
> | 1 | 2 |`;

const mixedQuote = restoredQuote.replace('> 1. Ordered lists', ' 1. Ordered lists');
const mixedTable = restoredQuote.replace('> | A | B |', '| A | B |');
const paragraphBeforeQuote = `**Pro tip:** You can nest just about anything inside a blockquote:
>
> 1. Ordered lists
> 2. With **bold** and *italic* text
>    - And sub-items
>
> \`\`\`
> Even code blocks
> \`\`\`
>
> And tables:
>
> | A | B |
> |---|---|
> | 1 | 2 |## Long Paragraph`;
const paragraphRestoredQuote = `> **Pro tip:** You can nest just about anything inside a blockquote:
>
> 1. Ordered lists
> 2. With **bold** and *italic* text
>    - And sub-items
>
> \`\`\`
> Even code blocks
> \`\`\`
>
> And tables:
>
> | A | B |
> |---|---|
> | 1 | 2 |## Long Paragraph`;

console.log('editorState.test.js\n');

test('restoring a blockquote marker drops transient orphan blocks', () => {
  const frozenBlocks = splitMarkdown(restoredQuote);
  assert.equal(frozenBlocks.length, 1);

  const mixed = composeEditedMarkdown(frozenBlocks, 0, mixedQuote);
  assert.equal(mixed, mixedQuote);

  const next = composeEditedMarkdown(frozenBlocks, 0, restoredQuote);
  assert.equal(next, restoredQuote);
  assert.equal(splitMarkdown(next).length, 1);
});

test('pressing Enter after restore does not keep the orphan list tail', () => {
  const frozenBlocks = splitMarkdown(restoredQuote);
  const cursor = restoredQuote.indexOf('> 2. With');
  const withEnter = `${restoredQuote.slice(0, cursor)}\n${restoredQuote.slice(cursor)}`;
  const next = composeEditedMarkdown(frozenBlocks, 0, withEnter);

  assert.equal((next.match(/^1\. Ordered lists$/gm) ?? []).length, 0);
  assert.equal((next.match(/^> 1\. Ordered lists$/gm) ?? []).length, 1);
});

test('active display renders restored draft instead of split list orphans', () => {
  const frozenBlocks = splitMarkdown(restoredQuote);
  const visibleMixed = displayBlocksForActiveEdit(frozenBlocks, frozenBlocks[0].id, mixedQuote);
  assert.equal(visibleMixed.length, 1);
  assert.equal(visibleMixed[0].source, mixedQuote);
  assert.equal(visibleMixed[0].type, 'blockquote');

  const visible = displayBlocksForActiveEdit(frozenBlocks, frozenBlocks[0].id, restoredQuote);

  assert.equal(visible.length, 1);
  assert.equal(visible[0].source, restoredQuote);
});

test('active display hides transient table orphan blocks', () => {
  const frozenBlocks = splitMarkdown(restoredQuote);

  const visible = displayBlocksForActiveEdit(frozenBlocks, frozenBlocks[0].id, mixedTable);
  assert.equal(visible.length, 1);
  assert.equal((visible[0].source.match(/^\| A \| B \|$/gm) ?? []).length, 1);
});

test('paragraph converted to blockquote absorbs adjacent quote tail', () => {
  const blocks = splitMarkdown(paragraphBeforeQuote);
  assert.equal(blocks.length, 2);

  const editedFirstLine = paragraphRestoredQuote.split('\n')[0];
  const next = composeEditedMarkdown(blocks, 0, editedFirstLine);
  assert.equal(next, paragraphRestoredQuote);

  const visible = displayBlocksForActiveEdit(blocks, blocks[0].id, editedFirstLine);
  assert.equal(visible.length, 1);
  assert.equal(visible[0].source, paragraphRestoredQuote);
});

test('cursor-only movement preserves session source and base blocks', () => {
  const baseBlocks = splitMarkdown(restoredQuote);
  const session = {
    blockId: baseBlocks[0].id,
    baseBlocks,
    source: mixedQuote,
    cursor: mixedQuote.indexOf('Ordered'),
  };
  const next = updateEditSessionCursor(session, baseBlocks[0].id, session.cursor + 1);

  assert.equal(next.source, session.source);
  assert.equal(next.baseBlocks, baseBlocks);
  assert.equal(next.cursor, session.cursor + 1);
});

test('split target falls back safely for whitespace-only splits', () => {
  const empty = splitMarkdown('\n\n');
  assert.equal(empty.length, 0);
  assert.equal(pickSplitTargetId(empty, 0), EMPTY_DRAFT_BLOCK_ID);
});

test('draft enter creates whitespace markdown and safe fallback target', () => {
  const next = splitMarkdown(draftEnterMarkdown());
  assert.equal(draftEnterMarkdown(), '\n\n');
  assert.deepEqual(next, []);
  assert.equal(pickSplitTargetId(next, 1), EMPTY_DRAFT_BLOCK_ID);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
