import {
  parseInline,
  serializeInline,
  spanAtOffset,
  getOffsetModes,
} from './inline.js';

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(
      message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  }
}

// parse **bold** and *italic*
{
  const bold = parseInline('hello **bold** world');
  assert(bold.length === 3, 'bold: three spans');
  assertEqual(bold[0].type, 'text');
  assertEqual(bold[1].type, 'bold');
  assertEqual(bold[1].text, 'bold');
  assertEqual(bold[2].type, 'text');

  const italic = parseInline('hello *italic* world');
  assert(italic.length === 3, 'italic: three spans');
  assertEqual(italic[1].type, 'italic');
  assertEqual(italic[1].text, 'italic');
}

// nested/combined: **bold *and italic***
{
  const spans = parseInline('**bold *and italic***');
  assertEqual(spans.length, 1);
  assertEqual(spans[0].type, 'bold');
  assertEqual(spans[0].text, 'bold and italic');
  assert(spans[0].children?.length >= 2, 'bold has nested children');
  const italicChild = spans[0].children?.find((s) => s.type === 'italic');
  assert(italicChild, 'contains italic child');
  assertEqual(italicChild.text, 'and italic');
}

// links [text](url)
{
  const spans = parseInline('see [Markdown Guide](https://example.com) here');
  assertEqual(spans.length, 3);
  assertEqual(spans[1].type, 'link');
  assertEqual(spans[1].text, 'Markdown Guide');
  assertEqual(spans[1].url, 'https://example.com');
  assertEqual(spans[1].start, 4);
}

// link with title
{
  const spans = parseInline('[text](https://example.com "My Title")');
  assertEqual(spans[0].type, 'link');
  assertEqual(spans[0].title, 'My Title');
}

// inline `code`
{
  const spans = parseInline('use `backtick` code');
  assertEqual(spans.length, 3);
  assertEqual(spans[1].type, 'code');
  assertEqual(spans[1].text, 'backtick');
  assertEqual(spans[1].raw, '`backtick`');
}

// strikethrough
{
  const spans = parseInline('~~removed~~');
  assertEqual(spans[0].type, 'strikethrough');
  assertEqual(spans[0].text, 'removed');
}

// boldItalic
{
  const spans = parseInline('***both***');
  assertEqual(spans[0].type, 'boldItalic');
  assertEqual(spans[0].text, 'both');
}

// image
{
  const spans = parseInline('![alt text](img.png)');
  assertEqual(spans[0].type, 'image');
  assertEqual(spans[0].text, 'alt text');
  assertEqual(spans[0].url, 'img.png');
}

// round-trip parse → serialize
{
  const samples = [
    'plain text',
    '**bold**',
    '*italic*',
    '**bold *and italic***',
    '[link](https://example.com)',
    '[link](https://example.com "title")',
    '`code`',
    '~~strike~~',
    '***both***',
    '![alt](img.png)',
    'mix **bold** and *italic* plus `code`',
  ];

  for (const sample of samples) {
    const roundTrip = serializeInline(parseInline(sample));
    assertEqual(roundTrip, sample, `round-trip failed for: ${sample}`);
  }
}

// spanAtOffset finds correct span
{
  const source = 'hello **bold** world';
  const spans = parseInline(source);
  const boldStart = source.indexOf('bold');
  const found = spanAtOffset(spans, boldStart + 1);
  assert(found, 'spanAtOffset should find a span');
  assertEqual(found.span.type, 'bold');
  assertEqual(found.span.text, 'bold');
}

// spanAtOffset nested
{
  const source = '**bold *and italic***';
  const spans = parseInline(source);
  const italicPos = source.indexOf('and');
  const found = spanAtOffset(spans, italicPos);
  assert(found, 'should find nested span');
  assertEqual(found.span.type, 'italic');
}

// getOffsetModes returns source only at cursor position in bold
{
  const source = 'hello **bold** world';
  const spans = parseInline(source);
  const boldRawStart = source.indexOf('**');

  const allRendered = getOffsetModes(spans, undefined);
  assert(allRendered.every((m) => m === 'rendered'), 'null cursor → all rendered');

  const outside = getOffsetModes(spans, 2);
  assert(outside.every((m) => m === 'rendered'), 'outside bold → all rendered');

  const inside = getOffsetModes(spans, boldRawStart + 1);
  const boldSpan = spans.find((s) => s.type === 'bold');
  for (let i = boldSpan.start; i < boldSpan.end; i++) {
    assertEqual(inside[i], 'source', `offset ${i} inside bold should be source`);
  }
  assertEqual(inside[0], 'rendered', 'text before bold stays rendered');
}

console.log('inline.test.js: all tests passed');
