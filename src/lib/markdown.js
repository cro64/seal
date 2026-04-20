import { marked } from 'marked';
import DOMPurify from 'dompurify';

const ALLOWED_TAGS = [
  'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'a', 'strong', 'em', 'del',
  'code', 'pre', 'blockquote', 'br', 'span', 'hr',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'img', 'div', 'sup', 'sub'
];

const ALLOWED_ATTR = ['href', 'title', 'src', 'alt', 'class', 'id', 'target', 'rel'];

export function parseMarkdown(md) {
  if (!md || typeof md !== 'string') return '';
  const raw = marked.parse(md, { async: false, gfm: true, breaks: false });
  return DOMPurify.sanitize(raw, { ALLOWED_TAGS, ALLOWED_ATTR });
}
