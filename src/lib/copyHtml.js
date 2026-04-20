/**
 * Render markdown HTML with theme CSS, inline all computed styles onto every
 * element, and copy the resulting self-contained HTML to the clipboard.
 */
export async function copyHtmlToClipboard(html, themeCss) {
  const { styledHtml, plainText } = renderInlinedHtml(html, themeCss);

  await navigator.clipboard.write([
    new ClipboardItem({
      'text/html': new Blob([styledHtml], { type: 'text/html' }),
      'text/plain': new Blob([plainText], { type: 'text/plain' }),
    }),
  ]);
}

/**
 * Return a full HTML document string with inlined styles for download or PDF.
 * @param {string} [title='Document'] - Page title (e.g. for PDF print dialog).
 */
export function getStyledHtmlDocument(html, themeCss, title = 'Document') {
  const { styledHtml } = renderInlinedHtml(html, themeCss);
  const safeTitle = title.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${safeTitle}</title>
  <style>${themeCss}</style>
</head>
<body>
${styledHtml}
</body>
</html>`;
}

function renderInlinedHtml(html, themeCss) {
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:0;top:0;width:800px;opacity:0.01;pointer-events:none;z-index:-1;';
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
