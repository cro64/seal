<script>
  import { onMount } from 'svelte';
  import { getPresetColors, PRESET_IDS, themeConfigToCss, getSavedThemes } from './lib/themes';
  import { parseMarkdown } from './lib/markdown.js';
  import { copyHtmlToClipboard, getStyledHtmlDocument, getThemeBackground } from './lib/copyHtml.js';
  import { parseHash, buildHash, setHash, parseStyleParam } from './lib/hash.js';
  import { decryptPayload, encryptPayload } from './lib/encrypt.js';
  import { showFeedback } from './lib/feedback.js';
  import { getDownloadBasename, downloadBlob } from './lib/download.js';
  import DecryptOverlay from './lib/DecryptOverlay.svelte';
  import ShareEncryptModal from './lib/ShareEncryptModal.svelte';
  import ThemeMaker from './lib/ThemeMaker.svelte';
  import Toolbar from './lib/Toolbar.svelte';

  let mode = $state('edit');
  let markdown = $state('');
  let themeConfig = $state({ preset: 'github', overrides: {} });
  let themeCss = $derived(themeConfigToCss(themeConfig));
  let copyFeedback = $state('');
  let copyDropdownOpen = $state(false);
  let shareDropdownOpen = $state(false);
  let downloadDropdownOpen = $state(false);
  let shareFeedback = $state('');
  let themeMakerOpen = $state(true);
  let savedThemes = $state(getSavedThemes());
  let colorMode = $state(
    typeof document !== 'undefined'
      ? document.documentElement.getAttribute('data-theme') || 'dark'
      : 'dark'
  );
  let encryptedBlob = $state('');
  let decryptError = $state('');
  let decryptPassword = $state('');
  let shareEncryptOpen = $state(false);
  let shareEncryptPassword = $state('');
  let shareEncryptError = $state('');
  let shareEncryptLoading = $state(false);
  let initialBoilerplateText = $state(null);
  let boilerplateSnapshot = $state(null);

  const hasOverrides = $derived(
    Object.values(themeConfig?.overrides || {}).some(Boolean) || !!(themeConfig?.customCss?.trim())
  );
  let unsavedRef = $state(false);
  $effect(() => { unsavedRef = hasOverrides; });

  const selectedStyleValue = $derived(
    hasOverrides ? 'untitled' : (themeConfig?.preset || 'github')
  );

  /** When true, use minimal 'github' in hash instead of full config. */
  const isDefaultTheme = $derived(
    themeConfig?.preset === 'github' &&
    !Object.values(themeConfig?.overrides || {}).some(Boolean) &&
    !(themeConfig?.customCss?.trim())
  );
  const styleForHash = $derived(isDefaultTheme ? 'github' : themeConfig);

  const isBoilerplate = $derived(!!(initialBoilerplateText && markdown === initialBoilerplateText));

  function wipeBoilerplate() {
    if (!initialBoilerplateText) return;
    initialBoilerplateText = null;
    markdown = '';
    requestAnimationFrame(() => {
      editorEl?.focus();
    });
  }

  function restoreBoilerplateIfEmpty() {
    if (markdown === '' && boilerplateSnapshot) {
      markdown = boilerplateSnapshot;
      initialBoilerplateText = boilerplateSnapshot;
    }
  }

  const htmlContent = $derived(parseMarkdown(markdown));

  const accentStyle = $derived.by(() => {
    const colors = getPresetColors(themeConfig?.preset || 'github');
    const a = colors.accentColor || '#2563eb';
    const h = colors.accentHover || '#1d4ed8';
    return `--c-accent:${a};--c-accent-hover:${h};--c-caret:${a};--c-focus-ring:${a}80;--c-selection:${a}40`;
  });

  onMount(async () => {
    const { s, d, m, e } = await parseHash(window.location.hash);
    if (e) {
      encryptedBlob = e;
      return;
    }
    const parsed = parseStyleParam(s);
    if (parsed) themeConfig = parsed;
    else if (s && PRESET_IDS.includes(s)) themeConfig = { preset: s, overrides: {} };

    if (d) {
      markdown = d;
    } else {
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}boilerplate.md`);
        if (res.ok) {
          const text = await res.text();
          markdown = text;
          initialBoilerplateText = text;
          boilerplateSnapshot = text;
        }
      } catch {}
    }
    if (m === 'edit' || m === 'view') mode = m;
    savedThemes = getSavedThemes();

    const onBeforeUnload = (e) => {
      if (unsavedRef) e.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  });

  function onStyleSelect(e) {
    const v = e.currentTarget.value;
    if (v === 'untitled') return;
    if (hasOverrides && (PRESET_IDS.includes(v) || v.startsWith('saved:'))) {
      if (!confirm('Are you sure? You will lose the current style setting.')) return;
    }
    if (v.startsWith('saved:')) {
      const c = savedThemes[v.slice(6)];
      if (c) themeConfig = c;
    } else if (PRESET_IDS.includes(v)) {
      themeConfig = { preset: v, overrides: {}, customCss: themeConfig?.customCss };
    }
  }

  async function toggleMode() {
    mode = mode === 'edit' ? 'view' : 'edit';
    setHash(await buildHash({ style: styleForHash, doc: markdown, mode }));
  }

  async function handleCopyHtml() {
    copyDropdownOpen = false;
    try {
      await copyHtmlToClipboard(htmlContent, themeCss);
      showFeedback((v) => (copyFeedback = v), 'Copied!');
    } catch {
      showFeedback((v) => (copyFeedback = v), 'Failed');
    }
  }

  async function handleCopyMarkdown() {
    copyDropdownOpen = false;
    try {
      await navigator.clipboard.writeText(markdown);
      showFeedback((v) => (copyFeedback = v), 'Copied!');
    } catch {
      showFeedback((v) => (copyFeedback = v), 'Failed');
    }
  }

  function closeDropdowns(e) {
    if (e.target && !e.target.closest('[data-toolbar-dropdown]')) {
      if (copyDropdownOpen) copyDropdownOpen = false;
      if (shareDropdownOpen) shareDropdownOpen = false;
      if (downloadDropdownOpen) downloadDropdownOpen = false;
    }
  }

  function handleDownloadMarkdown() {
    downloadDropdownOpen = false;
    const base = getDownloadBasename(markdown);
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    downloadBlob(blob, `${base}.md`);
  }

  function handleDownloadHtml() {
    downloadDropdownOpen = false;
    const base = getDownloadBasename(markdown);
    const doc = getStyledHtmlDocument(htmlContent, themeCss, base);
    const blob = new Blob([doc], { type: 'text/html;charset=utf-8' });
    downloadBlob(blob, `${base}.html`);
  }

  function handleDownloadPdf() {
    downloadDropdownOpen = false;
    const base = getDownloadBasename(markdown);

    /* Use the browser's native print pipeline — same renderer as the preview,
       no canvas rasterization, vector text, exact colors, correct line wrapping.
       @page margin is 0; the body gets the theme's own background + padding so
       the page margin area is the same colour as the content — no white border
       on dark themes, no colour mismatch on any theme. */
    const themeBg = getThemeBackground(themeCss);
    const safeTitle = base.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const printHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>${safeTitle}</title>
  <style>
    @page { size: A4 portrait; margin: 0; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      background: ${themeBg};
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body { padding: 14mm; }
    ${themeCss}
    .md-preview { padding: 0; }
    pre, table, img, blockquote, figure { break-inside: avoid; page-break-inside: avoid; }
    h1, h2, h3, h4 { break-after: avoid; page-break-after: avoid; }
  </style>
</head>
<body>
  <div class="md-preview">${htmlContent}</div>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.open();
    win.document.write(printHtml);
    win.document.close();
    win.addEventListener('load', () => {
      setTimeout(() => {
        win.focus();
        win.print();
        win.close();
      }, 300);
    });
  }

  async function handleShareStyle() {
    shareDropdownOpen = false;
    const hash = await buildHash({ style: styleForHash, mode });
    await navigator.clipboard.writeText(window.location.origin + window.location.pathname + hash);
    showFeedback((v) => (shareFeedback = v), 'style');
  }

  async function handleShareDoc() {
    shareDropdownOpen = false;
    const hash = await buildHash({ style: styleForHash, doc: markdown, mode });
    await navigator.clipboard.writeText(window.location.origin + window.location.pathname + hash);
    setHash(hash);
    showFeedback((v) => (shareFeedback = v), 'doc');
  }

  function toggleColorMode() {
    colorMode = colorMode === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', colorMode);
    localStorage.setItem('styled-color-mode', colorMode);
  }

  async function handleDecrypt() {
    const pwd = decryptPassword.trim();
    if (!pwd) return;
    try {
      const payload = await decryptPayload(encryptedBlob, pwd);
      if (typeof payload.s === 'object' && payload.s !== null) {
        themeConfig = payload.s;
      } else if (payload.s && PRESET_IDS.includes(payload.s)) {
        themeConfig = { preset: payload.s, overrides: {} };
      }
      if (payload.d != null) markdown = payload.d;
      if (payload.m === 'edit' || payload.m === 'view') mode = payload.m;
      encryptedBlob = '';
      decryptError = '';
      decryptPassword = '';
      setHash(await buildHash({ style: styleForHash, doc: markdown, mode }));
    } catch {
      decryptError = 'Wrong password';
    }
  }

  function openShareEncrypted() {
    shareDropdownOpen = false;
    shareEncryptOpen = true;
    shareEncryptPassword = '';
    shareEncryptError = '';
  }

  async function confirmShareEncrypted() {
    const pwd = shareEncryptPassword.trim();
    if (!pwd) {
      shareEncryptError = 'Enter a password';
      return;
    }
    shareEncryptLoading = true;
    shareEncryptError = '';
    try {
      const payload = { s: themeConfig, d: markdown, m: mode };
      const blob = await encryptPayload(payload, pwd);
      const hash = await buildHash({ encrypted: blob });
      const url = window.location.origin + window.location.pathname + hash;
      await navigator.clipboard.writeText(url);
      showFeedback((v) => (shareFeedback = v), 'encrypted');
      shareEncryptOpen = false;
      shareEncryptPassword = '';
    } catch (e) {
      shareEncryptError = 'Encryption failed. Try a shorter document.';
    } finally {
      shareEncryptLoading = false;
    }
  }

  function handleThemeConfigChange(c) { themeConfig = c; }
  function handleSavedThemeName() { savedThemes = getSavedThemes(); }

  let editorEl = $state(null);
  function resizeEditor() {
    if (!editorEl) return;
    editorEl.style.height = 'auto';
    editorEl.style.height = Math.max(editorEl.scrollHeight, 200) + 'px';
  }
  $effect(() => {
    editorEl;
    markdown;
    queueMicrotask(resizeEditor);
  });
</script>

<svelte:head>
  {@html `<style>${themeCss}</style>`}
</svelte:head>

<svelte:window onclick={closeDropdowns} />

<div class="shell" style={accentStyle}>
  <Toolbar
    {mode}
    {hasOverrides}
    selectedStyleValue={selectedStyleValue}
    bind:themeMakerOpen
    {colorMode}
    {savedThemes}
    bind:copyDropdownOpen
    copyFeedback={copyFeedback}
    bind:shareDropdownOpen
    shareFeedback={shareFeedback}
    bind:downloadDropdownOpen
    onStyleSelect={onStyleSelect}
    toggleMode={toggleMode}
    toggleColorMode={toggleColorMode}
    onCopyHtml={handleCopyHtml}
    onCopyMarkdown={handleCopyMarkdown}
    onShareStyle={handleShareStyle}
    onShareDoc={handleShareDoc}
    onShareEncrypted={openShareEncrypted}
    onDownloadMarkdown={handleDownloadMarkdown}
    onDownloadHtml={handleDownloadHtml}
    onDownloadPdf={handleDownloadPdf}
  />

  <!-- Main content -->
  <main class="main">
    {#if encryptedBlob}
      <DecryptOverlay
        bind:password={decryptPassword}
        error={decryptError}
        onDecrypt={handleDecrypt}
      />
    {:else if mode === 'edit'}
      <div class="split">
        <div class="pane pane-editor">
          <div class="pane-scroll">
            <div class="editor-wrap">
              {#if isBoilerplate}
                <div class="editor-boilerplate" aria-hidden="true">{initialBoilerplateText}</div>
                <textarea
                  class="editor editor-overlay"
                  placeholder=""
                  bind:this={editorEl}
                  onfocus={wipeBoilerplate}
                  spellcheck="false"
                  rows="1"
                ></textarea>
              {:else}
                <textarea
                  class="editor"
                  placeholder="Paste your markdown here..."
                  bind:value={markdown}
                  bind:this={editorEl}
                  oninput={resizeEditor}
                  onblur={restoreBoilerplateIfEmpty}
                  spellcheck="false"
                ></textarea>
              {/if}
            </div>
          </div>
        </div>
        <div class="divider"></div>
        <div class="pane pane-preview">
          <div class="pane-scroll">
            <div class="card">
              <div class="md-preview">
                {#if htmlContent}
                  {@html htmlContent}
                {:else}
                  <p class="empty">Start typing to see a live preview.</p>
                {/if}
              </div>
            </div>
          </div>
        </div>
      </div>
    {:else}
      <div class="fullpreview">
        <div class="card card-full">
          <div class="md-preview">
            {#if htmlContent}
              {@html htmlContent}
            {:else}
              <p class="empty">Nothing to preview.</p>
            {/if}
          </div>
        </div>
      </div>
    {/if}
  </main>
</div>

  <ThemeMaker
    config={themeConfig}
    {savedThemes}
    visible={themeMakerOpen}
    onClose={() => (themeMakerOpen = false)}
    onSaveName={handleSavedThemeName}
    onConfigChange={handleThemeConfigChange}
  />

<ShareEncryptModal
  bind:open={shareEncryptOpen}
  bind:password={shareEncryptPassword}
  error={shareEncryptError}
  loading={shareEncryptLoading}
  onConfirm={confirmShareEncrypted}
  onCancel={() => { shareEncryptOpen = false; shareEncryptError = ''; }}
/>

<style>
  :global(*) { box-sizing: border-box; margin: 0; }

  .shell {
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--c-bg);
    color: var(--c-text);
    font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: 13px;
    -webkit-font-smoothing: antialiased;
    transition: background-color 0.2s, color 0.2s;
  }

  /* ─── Main ─── */
  .main {
    flex: 1; display: flex;
    min-height: 0; overflow: hidden;
  }

  /* Split pane */
  .split {
    flex: 1; display: flex;
    min-height: 0; overflow: hidden;
  }
  .pane {
    flex: 1; display: flex;
    flex-direction: column; min-width: 0;
  }
  .pane-editor {
    background: var(--c-bg-editor);
    transition: background-color 0.2s ease, color 0.2s ease;
  }
  .pane-preview {
    background: var(--c-bg-preview);
    transition: background-color 0.2s ease, color 0.2s ease;
  }
  .pane-preview .card {
    min-height: 100%;
    display: flex;
    flex-direction: column;
  }
  .pane-preview .card .md-preview {
    flex: 1;
    min-height: 0;
  }
  .divider {
    width: 1px; flex-shrink: 0;
    background: var(--c-border-subtle);
  }

  /* Same scroll container for both panes */
  .pane-scroll {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 28px;
  }
  .editor-wrap {
    padding: 40px;
    min-height: 100%;
    background: var(--c-bg-editor);
    border-radius: 12px;
    box-shadow: var(--c-shadow-card);
    transition: background-color 0.2s ease, box-shadow 0.2s ease;
  }
  .editor-wrap {
    position: relative;
  }
  .editor-boilerplate {
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
    font-size: 13.5px;
    line-height: 1.7;
    color: var(--c-text-dimmed);
    white-space: pre-wrap;
    word-wrap: break-word;
    padding: 0;
    margin: 0;
    min-height: 200px;
    pointer-events: none;
  }
  .editor-overlay {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: text;
    min-height: 200px;
    resize: none;
    border: none;
    outline: none;
    background: transparent;
  }
  .editor {
    display: block;
    width: 100%;
    min-height: 200px;
    padding: 0;
    border: none; outline: none; resize: none;
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
    font-size: 13.5px; line-height: 1.7;
    color: var(--c-text-input);
    background: transparent;
    min-height: 0;
    caret-color: var(--c-caret);
    transition: color 0.2s ease, caret-color 0.2s ease;
  }
  .editor::placeholder { color: var(--c-placeholder); }
  .editor::selection { background: var(--c-selection); }

  /* Email card */
  .card {
    border-radius: 12px;
    box-shadow: var(--c-shadow-card);
    overflow: hidden;
    transition: box-shadow 0.2s;
  }
  .card .md-preview {
    padding: 40px;
    border-radius: 12px;
  }

  /* Full preview */
  .fullpreview {
    flex: 1; overflow-y: auto;
    padding: 40px;
    display: flex; justify-content: center;
    background: var(--c-bg-preview);
    transition: background-color 0.2s;
  }
  .card-full {
    width: 100%; max-width: 800px;
    align-self: flex-start;
  }
  .card-full .md-preview {
    padding: 56px 64px;
  }

  .empty { color: var(--c-text-dimmed); font-style: italic; }

  /* ─── Mobile ─── */
  @media (max-width: 768px) {
    .split { flex-direction: column; }
    .pane-editor { border-right: none; }
    .divider { width: auto; height: 1px; }
    .pane-scroll { padding: 16px; }
    .editor-wrap { padding: 24px; }
    .editor { min-height: 120px; font-size: 13px; }
    .editor-boilerplate, .editor-overlay { min-height: 120px; }
    .editor-boilerplate { font-size: 13px; }
    .fullpreview { padding: 20px; }
    .card .md-preview { padding: 24px; }
    .card-full .md-preview { padding: 32px 28px; }
  }
</style>
