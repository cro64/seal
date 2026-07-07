import assert from 'node:assert/strict';
import { moveCursorVertical, moveCursorHorizontal, lineStartOffsets } from './selection.js';
import { isAtBlockStart } from './blockNav.js';
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

console.log('selection.test.js\n');

test('moveCursorVertical moves between nested blockquote lines', () => {
  const source = '> outer\n> > inner';
  const { starts } = lineStartOffsets(source);
  const line1Start = starts[1];
  const down = moveCursorVertical(source, 2, 'down');
  assert.equal(down, line1Start + 2);
  const up = moveCursorVertical(source, line1Start + 2, 'up');
  assert.equal(up, 2);
});

test('moveCursorVertical preserves exact source column', () => {
  const source = '> outer\n> > inner';
  const { starts } = lineStartOffsets(source);
  const down = moveCursorVertical(source, 4, 'down');
  assert.equal(down, starts[1] + 4);
});

test('moveCursorHorizontal moves through normal caret offsets', () => {
  const source = 'abc\ndef';
  const { starts } = lineStartOffsets(source);
  assert.equal(moveCursorHorizontal(source, 2, 'right'), 3);
  assert.equal(moveCursorHorizontal(source, 3, 'right'), starts[1]);
  assert.equal(moveCursorHorizontal(source, starts[1], 'left'), 3);
  assert.equal(moveCursorHorizontal(source, 3, 'left'), 2);
});

test('moveCursorHorizontal stays at EOF', () => {
  const source = 'abc\ndef';
  assert.equal(moveCursorHorizontal(source, source.length, 'right'), source.length);
});

test('moveCursorHorizontal treats blockquote prefix as compact marker cluster', () => {
  const source = '> outer\n> > inner';
  const { starts } = lineStartOffsets(source);
  const nestedStart = starts[1];
  assert.equal(
    moveCursorHorizontal(source, nestedStart, 'right', { compactBlockquotePrefixes: true }),
    nestedStart + 4
  );
  assert.equal(
    moveCursorHorizontal(source, nestedStart + 4, 'left', { compactBlockquotePrefixes: true }),
    nestedStart
  );
  assert.equal(moveCursorHorizontal(source, nestedStart + 1, 'right'), nestedStart + 2);
});

test('isAtBlockStart only treats first blockquote line as block start', () => {
  const source = '> outer\n> > inner';
  const { starts } = lineStartOffsets(source);
  assert.equal(isAtBlockStart(BLOCK_TYPES.BLOCKQUOTE, source, 0), true);
  assert.equal(isAtBlockStart(BLOCK_TYPES.BLOCKQUOTE, source, starts[1]), false);
  assert.equal(isAtBlockStart(BLOCK_TYPES.BLOCKQUOTE, source, starts[1] + 2), false);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
