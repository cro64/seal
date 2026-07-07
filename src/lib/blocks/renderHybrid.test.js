import assert from 'node:assert/strict';
import { renderHybridBlock } from './renderHybrid.js';
import { BLOCK_TYPES } from './types.js';

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

const nestedQuote = `>**Pro tip:** You can nest just about anything inside a blockquote:
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

function assertNestedStructure(html) {
  assert.match(html, /<blockquote/);
  assert.match(html, /<ol/);
  assert.match(html, /<ul/);
  assert.match(html, /<pre/);
  assert.match(html, /<table/);
  assert.match(html, /<strong>/);
  assert.match(html, /<em>/);
}

console.log('renderHybrid.test.js\n');

test('heading body is inactive when cursor is in prefix', () => {
  const source = '## **Hello**';
  const html = renderHybridBlock(
    { id: 'h', type: BLOCK_TYPES.HEADING, source, meta: { level: 2 } },
    1
  );

  assert.match(html, /<span class="md-syntax" data-s="0" data-e="3">## <\/span>/);
  assert.match(html, /<strong><span data-s="5" data-e="10">Hello<\/span><\/strong>/);
  assert.doesNotMatch(html, /<span class="md-syntax" data-s="3" data-e="5">\*\*<\/span>/);
});

test('active blockquote renders the whole nested markdown structure', () => {
  const cursor = nestedQuote.indexOf('Ordered');
  const html = renderHybridBlock(
    { id: 'x', type: BLOCK_TYPES.BLOCKQUOTE, source: nestedQuote, meta: {} },
    cursor
  );
  assertNestedStructure(html);
});

test('active mixed blockquote still renders remaining quote segment structurally', () => {
  const source = nestedQuote.slice(1);
  const cursor = source.indexOf('Ordered');
  const html = renderHybridBlock(
    { id: 'x', type: BLOCK_TYPES.BLOCKQUOTE, source, meta: {} },
    cursor
  );
  assertNestedStructure(html);
});

test('restored blockquote renders nested list once', () => {
  const cursor = nestedQuote.indexOf('Ordered');
  const html = renderHybridBlock(
    { id: 'x', type: BLOCK_TYPES.BLOCKQUOTE, source: nestedQuote, meta: {} },
    cursor
  );
  assertNestedStructure(html);
  const visible = html.replace(/<span class="hybrid-slot"[^>]*>[\s\S]*?<\/span>/g, '');
  assert.equal((visible.match(/Ordered lists/g) ?? []).length, 1);
});

test('restored blockquote stays structural while cursor is in prefix', () => {
  const cursor = nestedQuote.indexOf('> 1. Ordered lists') + 1;
  const html = renderHybridBlock(
    { id: 'x', type: BLOCK_TYPES.BLOCKQUOTE, source: nestedQuote, meta: {} },
    cursor
  );
  assertNestedStructure(html);
  assert.equal((html.match(/<table/g) ?? []).length, 1);
});

test('blockquote marker only shows adjacent to marker', () => {
  const source = `> outer\n> > inner`;
  const markerCursor = source.indexOf('> > inner') + 1;
  const markerHtml = renderHybridBlock(
    { id: 'x', type: BLOCK_TYPES.BLOCKQUOTE, source, meta: {} },
    markerCursor
  );
  assert.match(markerHtml, /hybrid-bq-prefix[^>]*>&gt;&gt;<\/span>/);

  const bodyCursor = source.indexOf('inner');
  const bodyHtml = renderHybridBlock(
    { id: 'x', type: BLOCK_TYPES.BLOCKQUOTE, source, meta: {} },
    bodyCursor
  );
  assert.doesNotMatch(bodyHtml, /hybrid-bq-prefix/);
});

test('nested blockquote marker renders on the active line', () => {
  const source = `> outer\n> > inner`;
  const markerCursor = source.indexOf('> > inner') + 3;
  const html = renderHybridBlock(
    { id: 'x', type: BLOCK_TYPES.BLOCKQUOTE, source, meta: {} },
    markerCursor
  );

  const markerIndex = html.indexOf('hybrid-bq-prefix');
  const outerIndex = html.indexOf('outer');
  const innerIndex = html.indexOf('inner');
  assert.ok(markerIndex > outerIndex);
  assert.ok(markerIndex < innerIndex);
  assert.equal((html.match(/hybrid-bq-prefix/g) ?? []).length, 1);
  assert.match(html, /hybrid-bq-prefix[^>]*>&gt;&gt;<\/span>/);
});

test('mixed blockquote respects disabled quote marker option', () => {
  const source = `> quoted\nplain`;
  const cursor = source.indexOf('>') + 1;
  const html = renderHybridBlock(
    { id: 'x', type: BLOCK_TYPES.BLOCKQUOTE, source, meta: {} },
    cursor,
    { showBlockquoteMarker: false }
  );

  assert.doesNotMatch(html, /hybrid-bq-prefix/);
});

test('table separator row is preserved when cursor is outside separator', () => {
  const source = `| A | B |\n|---|---|\n| 1 | 2 |`;
  const cursor = source.indexOf('1');
  const html = renderHybridBlock(
    { id: 'x', type: BLOCK_TYPES.TABLE, source, meta: {} },
    cursor
  );

  assert.equal((html.match(/hybrid-table-sep/g) ?? []).length, 1);
  assert.match(html, /<tr class="hybrid-table-sep"><td colspan="99"><span class="hybrid-slot" data-s="10" data-e="19">/);
});

test('table separator row shows source when cursor is inside separator', () => {
  const source = `| A | B |\n|---|---|\n| 1 | 2 |`;
  const cursor = source.indexOf('---');
  const html = renderHybridBlock(
    { id: 'x', type: BLOCK_TYPES.TABLE, source, meta: {} },
    cursor
  );

  assert.equal((html.match(/hybrid-table-sep/g) ?? []).length, 1);
  assert.match(html, /<tr class="hybrid-table-sep"><td colspan="99"><span class="md-syntax" data-s="10" data-e="19">/);
});

test('nested block without cursor renders inactive inside blockquote', () => {
  const cursor = nestedQuote.indexOf('Pro tip');
  const html = renderHybridBlock(
    { id: 'x', type: BLOCK_TYPES.BLOCKQUOTE, source: nestedQuote, meta: {} },
    cursor
  );

  assertNestedStructure(html);
  assert.doesNotMatch(html, /hybrid-li-marker/);
  assert.doesNotMatch(html, /<span class="md-syntax" data-s="72" data-e="75">1\. <\/span>/);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
