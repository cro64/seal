import assert from 'node:assert/strict';
import { blockquoteMarkerDeleteOffset, blockquoteMarkerDeleteRange, blockquoteMarkerInsert } from './blockquoteEdit.js';

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

console.log('blockquoteEdit.test.js\n');

function applyMarkerDelete(source, pos, key) {
  const range = blockquoteMarkerDeleteRange(source, pos, key);
  if (!range) return { source, cursor: pos };
  return {
    source: source.slice(0, range.start) + source.slice(range.end),
    cursor: range.cursor,
  };
}

test('Backspace deletes the first marker of a blockquote at offset 0', () => {
  const source = '>**Pro tip:** You can nest just about anything inside a blockquote:';
  assert.equal(blockquoteMarkerDeleteOffset(source, 0, 'backspace'), 0);
});

test('Backspace deletes either marker in a nested blockquote prefix', () => {
  const source = '> outer\n> > nested';
  assert.equal(blockquoteMarkerDeleteOffset(source, 7, 'backspace'), 8);
  assert.equal(blockquoteMarkerDeleteOffset(source, 8, 'backspace'), 8);
  assert.equal(blockquoteMarkerDeleteOffset(source, 9, 'backspace'), 8);
  assert.equal(blockquoteMarkerDeleteOffset(source, 10, 'backspace'), 10);
  assert.equal(blockquoteMarkerDeleteOffset(source, 11, 'backspace'), 10);
});

test('Backspace at nested blockquote body removes one full quote token', () => {
  const source = '> outer\n> > nested';
  const result = applyMarkerDelete(source, 12, 'backspace');
  assert.equal(result.source, '> outer\n> nested');
  assert.equal(result.cursor, 10);
});

test('Deleting nested marker token does not leave prefix spacing behind', () => {
  const source = '> outer\n> > nested';
  const result = applyMarkerDelete(source, 10, 'delete');
  assert.equal(result.source, '> outer\n> nested');
  assert.equal(result.cursor, 10);
});

test('Typing marker at blockquote body boundary adds a nested quote token', () => {
  const source = '> text';
  const result = blockquoteMarkerInsert(source, 2);
  assert.deepEqual(result, { source: '> > text', cursor: 4 });
});

test('Typing marker after an empty quote marker creates an editable nested quote', () => {
  const source = '>';
  const result = blockquoteMarkerInsert(source, 1);
  assert.deepEqual(result, { source: '> > ', cursor: 4 });
});

test('Delete deletes the marker at the caret, including after a newline', () => {
  const source = '> outer\n> > nested';
  assert.equal(blockquoteMarkerDeleteOffset(source, 7, 'delete'), 8);
  assert.equal(blockquoteMarkerDeleteOffset(source, 8, 'delete'), 8);
  assert.equal(blockquoteMarkerDeleteOffset(source, 10, 'delete'), 10);
});

test('Marker handling does not consume blockquote body text', () => {
  const source = '> outer\n> > nested';
  assert.equal(blockquoteMarkerDeleteOffset(source, 12, 'delete'), null);
  assert.equal(blockquoteMarkerDeleteOffset(source, 13, 'backspace'), null);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
