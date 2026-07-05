/**
 * @typedef {Object} Span
 * @property {string} type - 'text'|'bold'|'italic'|'boldItalic'|'strikethrough'|'code'|'link'|'image'
 * @property {string} text - visible/rendered text
 * @property {string} [raw] - original markdown substring
 * @property {number} [start] - start offset in source
 * @property {number} [end] - end offset in source
 * @property {string} [url] - for links/images
 * @property {string} [title] - for links
 * @property {Span[]} [children] - nested spans if needed
 */

/**
 * @param {string} source
 * @param {number} [baseOffset]
 * @returns {Span[]}
 */
export function parseInline(source, baseOffset = 0) {
  /** @type {Span[]} */
  const spans = [];
  let i = 0;

  while (i < source.length) {
    const absStart = baseOffset + i;

    const code = tryParseCode(source, i, absStart);
    if (code) {
      spans.push(code.span);
      i = code.end;
      continue;
    }

    const image = tryParseImage(source, i, absStart);
    if (image) {
      spans.push(image.span);
      i = image.end;
      continue;
    }

    const link = tryParseLink(source, i, absStart);
    if (link) {
      spans.push(link.span);
      i = link.end;
      continue;
    }

    const strike = tryParseDelimited(source, i, absStart, '~~', '~~', 'strikethrough');
    if (strike) {
      spans.push(strike.span);
      i = strike.end;
      continue;
    }

    const boldItalic = tryParseEmphasis(source, i, absStart, 3, 'boldItalic');
    if (boldItalic) {
      spans.push(boldItalic.span);
      i = boldItalic.end;
      continue;
    }

    const bold = tryParseEmphasis(source, i, absStart, 2, 'bold');
    if (bold) {
      spans.push(bold.span);
      i = bold.end;
      continue;
    }

    const italic = tryParseEmphasis(source, i, absStart, 1, 'italic');
    if (italic) {
      spans.push(italic.span);
      i = italic.end;
      continue;
    }

    const textEnd = findTextEnd(source, i);
    if (textEnd === i) {
      const ch = source[i];
      spans.push({
        type: 'text',
        text: ch,
        raw: ch,
        start: absStart,
        end: absStart + 1,
      });
      i++;
      continue;
    }

    const text = source.slice(i, textEnd);
    spans.push({
      type: 'text',
      text,
      raw: text,
      start: absStart,
      end: baseOffset + textEnd,
    });
    i = textEnd;
  }

  return spans;
}

/** @param {string} source @param {number} pos */
function findTextEnd(source, pos) {
  let i = pos;
  while (i < source.length) {
    const ch = source[i];
    if (
      ch === '`' ||
      ch === '[' ||
      ch === '~' ||
      ch === '*' ||
      ch === '_'
    ) {
      if (ch === '!' && source[i + 1] === '[') break;
      if (ch === '~' && source[i + 1] === '~') break;
      if (ch === '*' || ch === '_') break;
      if (ch === '[') break;
      if (ch === '`') break;
    }
    if (ch === '!' && source[i + 1] === '[') break;
    i++;
  }
  return i;
}

/**
 * @param {string} source
 * @param {number} pos
 * @param {number} absStart
 */
function tryParseCode(source, pos, absStart) {
  if (source[pos] !== '`') return null;

  let tickCount = 0;
  while (pos + tickCount < source.length && source[pos + tickCount] === '`') {
    tickCount++;
  }

  const contentStart = pos + tickCount;
  let search = contentStart;

  while (search < source.length) {
    if (source[search] !== '`') {
      search++;
      continue;
    }

    let closeTicks = 0;
    while (
      search + closeTicks < source.length &&
      source[search + closeTicks] === '`'
    ) {
      closeTicks++;
    }

    if (closeTicks === tickCount) {
      const rawContent = source.slice(contentStart, search);
      const end = search + tickCount;
      const text =
        tickCount > 1 && rawContent.startsWith(' ') && rawContent.endsWith(' ')
          ? rawContent.slice(1, -1)
          : rawContent;

      return {
        span: {
          type: 'code',
          text,
          raw: source.slice(pos, end),
          start: absStart,
          end: absStart + (end - pos),
        },
        end,
      };
    }

    search += closeTicks;
  }

  return null;
}

/**
 * @param {string} source
 * @param {number} pos
 * @param {number} absStart
 */
function tryParseImage(source, pos, absStart) {
  if (source[pos] !== '!' || source[pos + 1] !== '[') return null;
  return tryParseLinkLike(source, pos, absStart, true);
}

/**
 * @param {string} source
 * @param {number} pos
 * @param {number} absStart
 */
function tryParseLink(source, pos, absStart) {
  if (source[pos] !== '[') return null;
  return tryParseLinkLike(source, pos, absStart, false);
}

/**
 * @param {string} source
 * @param {number} pos
 * @param {number} absStart
 * @param {boolean} isImage
 */
function tryParseLinkLike(source, pos, absStart, isImage) {
  const bracketStart = isImage ? pos + 2 : pos + 1;
  const bracketEnd = source.indexOf(']', bracketStart);
  if (bracketEnd === -1) return null;
  if (source[bracketEnd + 1] !== '(') return null;

  const parenStart = bracketEnd + 2;
  const parenEnd = findClosingParen(source, bracketEnd + 1);
  if (parenEnd === -1) return null;

  const dest = source.slice(parenStart, parenEnd).trim();
  const titleMatch = dest.match(/^(\S+)\s+"([^"]*)"\s*$/);
  const url = titleMatch ? titleMatch[1] : dest.split(/\s+/)[0];
  const title = titleMatch ? titleMatch[2] : undefined;

  const label = source.slice(bracketStart, bracketEnd);
  const end = parenEnd + 1;
  const raw = source.slice(pos, end);

  /** @type {Span} */
  const span = {
    type: isImage ? 'image' : 'link',
    text: label,
    raw,
    start: absStart,
    end: absStart + (end - pos),
    url,
  };

  if (title !== undefined) span.title = title;

  if (!isImage && label.length > 0) {
    span.children = parseInline(label, bracketStart + (absStart - pos));
  }

  return { span, end };
}

/** @param {string} source @param {number} openPos */
function findClosingParen(source, openPos) {
  let depth = 0;
  let inQuote = false;

  for (let i = openPos; i < source.length; i++) {
    const ch = source[i];
    if (ch === '"' && source[i - 1] !== '\\') {
      inQuote = !inQuote;
      continue;
    }
    if (inQuote) continue;

    if (ch === '(') depth++;
    else if (ch === ')') {
      depth--;
      if (depth === 0) return i;
    }
  }

  return -1;
}

/**
 * @param {string} source
 * @param {number} pos
 * @param {number} absStart
 * @param {string} open
 * @param {string} close
 * @param {Span['type']} type
 */
function tryParseDelimited(source, pos, absStart, open, close, type) {
  if (!source.startsWith(open, pos)) return null;

  const contentStart = pos + open.length;
  const closeIdx = source.indexOf(close, contentStart);
  if (closeIdx === -1) return null;

  const content = source.slice(contentStart, closeIdx);
  const end = closeIdx + close.length;
  const children = parseInline(content, contentStart + (absStart - pos));
  const text = children.map((child) => child.text).join('');

  return {
    span: {
      type,
      text,
      raw: source.slice(pos, end),
      start: absStart,
      end: absStart + (end - pos),
      children,
    },
    end,
  };
}

/**
 * @param {string} source
 * @param {number} pos
 * @param {number} absStart
 * @param {number} runLength
 * @param {Span['type']} type
 */
function tryParseEmphasis(source, pos, absStart, runLength, type) {
  const marker = source[pos];
  if (marker !== '*' && marker !== '_') return null;

  let run = 0;
  while (pos + run < source.length && source[pos + run] === marker) {
    run++;
  }
  if (run < runLength) return null;

  const contentStart = pos + runLength;
  let search = contentStart;

  while (search < source.length) {
    if (source[search] !== marker) {
      search++;
      continue;
    }

    let closeRun = 0;
    while (
      search + closeRun < source.length &&
      source[search + closeRun] === marker
    ) {
      closeRun++;
    }

    if (closeRun >= runLength) {
      const closeOffset = closeRun > runLength ? closeRun - runLength : 0;
      const contentEnd = search + closeOffset;
      const content = source.slice(contentStart, contentEnd);
      if (content.length === 0) {
        search += closeRun;
        continue;
      }

      const end = contentEnd + runLength;
      const children = parseInline(content, contentStart + (absStart - pos));
      const text = children.map((child) => child.text).join('');

      return {
        span: {
          type,
          text,
          raw: source.slice(pos, end),
          start: absStart,
          end: absStart + (end - pos),
          children,
        },
        end,
      };
    }

    search += closeRun;
  }

  return null;
}

/**
 * @param {Span[]} spans
 * @returns {string}
 */
export function serializeInline(spans) {
  return spans.map(serializeSpan).join('');
}

/** @param {Span} span */
function serializeSpan(span) {
  if (span.raw && span.type === 'code') return span.raw;

  switch (span.type) {
    case 'text':
      return span.text;
    case 'bold':
      return `**${serializeInline(span.children ?? [])}**`;
    case 'italic':
      return `*${serializeInline(span.children ?? [])}*`;
    case 'boldItalic':
      return `***${serializeInline(span.children ?? [])}***`;
    case 'strikethrough':
      return `~~${serializeInline(span.children ?? [])}~~`;
    case 'code':
      return `\`${span.text}\``;
    case 'link': {
      const label =
        span.children && span.children.length > 0
          ? serializeInline(span.children)
          : span.text;
      const titlePart = span.title ? ` "${span.title}"` : '';
      return `[${label}](${span.url}${titlePart})`;
    }
    case 'image':
      return `![${span.text}](${span.url})`;
    default:
      return span.text ?? '';
  }
}

/**
 * @param {Span[]} spans
 * @param {number} offset
 * @returns {{ span: Span, index: number } | null}
 */
export function spanAtOffset(spans, offset) {
  /**
   * @param {Span[]} list
   * @param {Span | null} formattedAncestor
   */
  function walk(list, formattedAncestor) {
    for (let index = 0; index < list.length; index++) {
      const span = list[index];
      if (offset < span.start || offset >= span.end) continue;

      const ancestor = span.type !== 'text' ? span : formattedAncestor;

      if (span.children?.length) {
        const inner = walk(span.children, ancestor ?? span);
        if (inner) return inner;
      }

      if (span.type === 'text' && ancestor) {
        return { span: ancestor, index: rootIndex(spans, ancestor) };
      }

      return { span, index };
    }
    return null;
  }

  return walk(spans, null);
}

/** @param {Span[]} spans @param {Span} target */
function rootIndex(spans, target) {
  for (let i = 0; i < spans.length; i++) {
    if (spans[i] === target || containsSpan(spans[i], target)) return i;
  }
  return 0;
}

/** @param {Span} root @param {Span} target */
function containsSpan(root, target) {
  if (root === target) return true;
  if (!root.children) return false;
  return root.children.some((child) => containsSpan(child, target));
}

/**
 * @param {Span[]} spans
 * @param {number | null | undefined} cursorOffset
 * @returns {('rendered' | 'source')[]}
 */
export function getOffsetModes(spans, cursorOffset) {
  const length = sourceLengthFromSpans(spans);
  /** @type {('rendered' | 'source')[]} */
  const modes = Array(length).fill('rendered');

  if (cursorOffset == null) return modes;

  const found = spanAtOffset(spans, cursorOffset);
  if (!found || found.span.type === 'text') return modes;

  for (let i = found.span.start; i < found.span.end; i++) {
    modes[i] = 'source';
  }

  return modes;
}

/** @param {Span[]} spans */
function sourceLengthFromSpans(spans) {
  let max = 0;

  /** @param {Span[]} list */
  function walk(list) {
    for (const span of list) {
      if (span.end > max) max = span.end;
      if (span.children?.length) walk(span.children);
    }
  }

  walk(spans);
  return max;
}
