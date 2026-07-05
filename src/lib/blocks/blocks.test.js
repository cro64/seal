import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { splitMarkdown, blocksToMarkdown, classifyBlock, BLOCK_TYPES } from './index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const boilerplatePath = join(__dirname, '../../../public/boilerplate.md');

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

function roundTrip(md, label) {
  const blocks = splitMarkdown(md);
  const result = blocksToMarkdown(blocks);
  assert.equal(result, md, `${label}: round-trip mismatch`);
  return blocks;
}

console.log('blocks.test.js\n');

test('classifyBlock detects all block types', () => {
  assert.equal(classifyBlock('# Title'), BLOCK_TYPES.HEADING);
  assert.equal(classifyBlock('Plain text'), BLOCK_TYPES.PARAGRAPH);
  assert.equal(classifyBlock('- one\n- two'), BLOCK_TYPES.UL);
  assert.equal(classifyBlock('1. one\n2. two'), BLOCK_TYPES.OL);
  assert.equal(classifyBlock('> quote'), BLOCK_TYPES.BLOCKQUOTE);
  assert.equal(classifyBlock('```js\ncode\n```'), BLOCK_TYPES.CODE);
  assert.equal(classifyBlock('| A | B |\n|---|---|'), BLOCK_TYPES.TABLE);
  assert.equal(classifyBlock('---'), BLOCK_TYPES.HR);
  assert.equal(classifyBlock('![alt](url)'), BLOCK_TYPES.IMAGE);
});

test('fenced code block is not split internally', () => {
  const md = 'Before\n\n```javascript\nfunction a() {\n  return 1;\n}\n\nconsole.log(a());\n```\n\nAfter';
  const blocks = roundTrip(md, 'fenced code');
  const codeBlock = blocks.find((b) => b.type === BLOCK_TYPES.CODE);
  assert.ok(codeBlock, 'expected a code block');
  assert.ok(codeBlock.source.includes('function a()'));
  assert.ok(codeBlock.source.includes('console.log(a());'));
  assert.equal(codeBlock.source.split('\n').length, 7);
});

test('table block kept together', () => {
  const md = [
    '| Feature | Status |',
    '|---------|--------|',
    '| Themes  | Done   |',
    '',
    'Next paragraph',
  ].join('\n');
  const blocks = roundTrip(md, 'table');
  const tableBlock = blocks.find((b) => b.type === BLOCK_TYPES.TABLE);
  assert.ok(tableBlock, 'expected a table block');
  assert.equal(tableBlock.source.split('\n').length, 3);
  assert.ok(blocks.some((b) => b.type === BLOCK_TYPES.PARAGRAPH && b.source === 'Next paragraph'));
});

test('headings detected with level meta', () => {
  const md = '## Section\n\n### Subsection';
  const blocks = roundTrip(md, 'headings');
  assert.equal(blocks[0].type, BLOCK_TYPES.HEADING);
  assert.equal(blocks[0].meta?.level, 2);
  assert.equal(blocks[1].type, BLOCK_TYPES.HEADING);
  assert.equal(blocks[1].meta?.level, 3);
});

test('unordered list kept as one block', () => {
  const md = '- Item one\n- Item two\n  - Nested A\n  - Nested B\n- Item three';
  const blocks = roundTrip(md, 'unordered list');
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].type, BLOCK_TYPES.UL);
  assert.equal(blocks[0].source.split('\n').length, 5);
});

test('ordered list kept as one block', () => {
  const md = '1. First\n2. Second\n   1. Sub 2a\n   2. Sub 2b\n3. Third';
  const blocks = roundTrip(md, 'ordered list');
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].type, BLOCK_TYPES.OL);
});

test('blockquote with multiple lines stays together', () => {
  const md = '> Line one\n>\n> > Nested quote\n>\n> Back to outer';
  const blocks = roundTrip(md, 'blockquote');
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].type, BLOCK_TYPES.BLOCKQUOTE);
  assert.equal(blocks[0].source.split('\n').length, 5);
});

test('hr, image, and paragraph blocks', () => {
  const md = 'Paragraph one\n\n---\n\n![Sample](https://example.com/img.png)\n\nParagraph two';
  const blocks = roundTrip(md, 'hr and image');
  assert.deepEqual(
    blocks.map((b) => b.type),
    [BLOCK_TYPES.PARAGRAPH, BLOCK_TYPES.HR, BLOCK_TYPES.IMAGE, BLOCK_TYPES.PARAGRAPH],
  );
});

test('rich markdown covering all block types round-trips', () => {
  const md = [
    '# Document Title',
    '',
    'Intro paragraph with **bold** and *italic*.',
    '',
    '## Section',
    '',
    '- Alpha',
    '- Beta',
    '  - Nested',
    '',
    '1. Step one',
    '2. Step two',
    '',
    '> A wise quote',
    '> continues here',
    '',
    '```python',
    'print("hello")',
    '```',
    '',
    '| Col A | Col B |',
    '|-------|-------|',
    '|   1   |   2   |',
    '',
    '***',
    '',
    '![diagram](https://example.com/d.png)',
    '',
    'Closing paragraph.',
  ].join('\n');

  const blocks = roundTrip(md, 'rich markdown');
  const types = blocks.map((b) => b.type);
  assert.ok(types.includes(BLOCK_TYPES.HEADING));
  assert.ok(types.includes(BLOCK_TYPES.PARAGRAPH));
  assert.ok(types.includes(BLOCK_TYPES.UL));
  assert.ok(types.includes(BLOCK_TYPES.OL));
  assert.ok(types.includes(BLOCK_TYPES.BLOCKQUOTE));
  assert.ok(types.includes(BLOCK_TYPES.CODE));
  assert.ok(types.includes(BLOCK_TYPES.TABLE));
  assert.ok(types.includes(BLOCK_TYPES.HR));
  assert.ok(types.includes(BLOCK_TYPES.IMAGE));
});

test('handles trailing newline', () => {
  const md = '# Title\n\nParagraph\n';
  roundTrip(md, 'trailing newline');
});

test('handles multiple blank lines between blocks', () => {
  const md = 'First\n\n\n\nSecond';
  roundTrip(md, 'multiple blank lines');
});

test('handles leading blank lines', () => {
  const md = '\n\n# Title';
  roundTrip(md, 'leading blank lines');
});

test('empty string returns empty array', () => {
  assert.deepEqual(splitMarkdown(''), []);
  assert.equal(blocksToMarkdown([]), '');
});

test('boilerplate.md round-trips losslessly', () => {
  const md = readFileSync(boilerplatePath, 'utf8');
  const blocks = splitMarkdown(md);
  const result = blocksToMarkdown(blocks);

  if (result !== md) {
    const minLen = Math.min(result.length, md.length);
    for (let i = 0; i < minLen; i++) {
      if (result[i] !== md[i]) {
        const context = Math.max(0, i - 40);
        console.error(`    First diff at index ${i}:`);
        console.error(`    expected: ${JSON.stringify(md.slice(context, i + 40))}`);
        console.error(`    actual:   ${JSON.stringify(result.slice(context, i + 40))}`);
        break;
      }
    }
    if (result.length !== md.length) {
      console.error(`    Length expected ${md.length}, got ${result.length}`);
    }
  }

  assert.equal(result, md, 'boilerplate.md round-trip failed');
  assert.ok(blocks.length > 20, `expected many blocks, got ${blocks.length}`);

  const typeCounts = blocks.reduce((acc, b) => {
    acc[b.type] = (acc[b.type] || 0) + 1;
    return acc;
  }, /** @type {Record<string, number>} */ ({}));

  assert.ok(typeCounts[BLOCK_TYPES.HEADING] >= 10);
  assert.ok(typeCounts[BLOCK_TYPES.CODE] >= 4);
  assert.ok(typeCounts[BLOCK_TYPES.TABLE] >= 2);
  assert.ok(typeCounts[BLOCK_TYPES.HR] >= 4);
  assert.ok(typeCounts[BLOCK_TYPES.UL] >= 1);
  assert.ok(typeCounts[BLOCK_TYPES.OL] >= 1);
  assert.ok(typeCounts[BLOCK_TYPES.BLOCKQUOTE] >= 2);
  assert.ok(typeCounts[BLOCK_TYPES.IMAGE] >= 1);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
