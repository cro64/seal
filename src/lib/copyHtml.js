/** Layout width for inlining — matches preview column so PDF/HTML match what you see */
const CLIPBOARD_LAYOUT_WIDTH_PX = 800;

/**
 * Render markdown HTML with theme CSS, inline all computed styles onto every
 * element, and copy the resulting self-contained HTML to the clipboard.
 */
export async function copyHtmlToClipboard(html, themeCss) {
  const { styledHtml, plainText } = renderInlinedHtml(html, themeCss, {
    contentWidthPx: CLIPBOARD_LAYOUT_WIDTH_PX,
  });

  await navigator.clipboard.write([
    new ClipboardItem({
      'text/html': new Blob([styledHtml], { type: 'text/html' }),
      'text/plain': new Blob([plainText], { type: 'text/plain' }),
    }),
  ]);
}

/**
 * Return the theme's background-color by rendering .md-preview offscreen.
 * Falls back to '#ffffff' if the theme has no explicit background.
 */
export function getThemeBackground(themeCss) {
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:0;top:0;width:1px;opacity:0.01;pointer-events:none;z-index:-1;';
  host.innerHTML = `<style>${themeCss}</style><div class="md-preview"></div>`;
  document.body.appendChild(host);
  host.offsetHeight;
  const root = host.querySelector('.md-preview');
  const bg = root ? window.getComputedStyle(root).backgroundColor : null;
  document.body.removeChild(host);
  const t = (bg || '').trim().toLowerCase();
  if (!t || t === 'transparent' || t === 'rgba(0, 0, 0, 0)' || t === 'rgba(0,0,0,0)') {
    return '#ffffff';
  }
  return bg;
}

/**
 * Return a full HTML document string with inlined styles for download.
 */
export function getStyledHtmlDocument(html, themeCss, title = 'Document') {
  const { styledHtml } = renderInlinedHtml(html, themeCss, {
    contentWidthPx: CLIPBOARD_LAYOUT_WIDTH_PX,
  });
  return wrapHtmlDocument(styledHtml, themeCss, title, false);
}




function wrapHtmlDocument(styledHtml, themeCss, title, forPdf) {
  const safeTitle = title.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const pdfMeta = forPdf
    ? `<style>
  @page { size: A4 portrait; margin: 0; }
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    height: auto !important;
    min-height: 0 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
</style>`
    : '';
  const bodyStyle = forPdf ? ' style="margin:0;padding:0;"' : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${safeTitle}</title>
  <style>${themeCss}</style>
  ${pdfMeta}
</head>
<body${bodyStyle}>
${styledHtml}
</body>
</html>`;
}

/**
 * @param {object} [opts]
 * @param {number} [opts.contentWidthPx]
 */
function renderInlinedHtml(html, themeCss, opts = {}) {
  const { contentWidthPx = CLIPBOARD_LAYOUT_WIDTH_PX } = opts;
  const host = document.createElement('div');
  host.style.cssText = `position:fixed;left:0;top:0;width:${contentWidthPx}px;opacity:0.01;pointer-events:none;z-index:-1;`;
  host.innerHTML = `<style>${themeCss}</style><div class="md-preview">${html}</div>`;
  document.body.appendChild(host);
  host.offsetHeight;

  const root = host.querySelector('.md-preview');
  const plainText = root?.textContent || '';

  inlineAll(root);
  strip(root);
  const styledHtml = root.outerHTML;

  document.body.removeChild(host);
  return { styledHtml, plainText };
}

function inlineAll(el) {
  if (!el || el.nodeType !== Node.ELEMENT_NODE) return;
  const cs = window.getComputedStyle(el);
  const parts = [];
  for (let i = 0; i < cs.length; i++) {
    const p = cs[i];
    parts.push(`${p}:${cs.getPropertyValue(p)}`);
  }
  el.setAttribute('style', parts.join(';'));
  for (const child of el.children) inlineAll(child);
}

function strip(el) {
  if (!el || el.nodeType !== Node.ELEMENT_NODE) return;
  el.removeAttribute('class');
  el.removeAttribute('id');
  for (const child of el.children) strip(child);
}
