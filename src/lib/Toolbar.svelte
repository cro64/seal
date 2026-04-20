<script>
  import { getPresetLabel, PRESET_IDS } from './themes';
  import ToolbarDropdown from './ToolbarDropdown.svelte';

  let {
    mode,
    hasOverrides,
    selectedStyleValue,
    themeMakerOpen = $bindable(true),
    colorMode,
    savedThemes,
    copyDropdownOpen = $bindable(false),
    copyFeedback = '',
    shareDropdownOpen = $bindable(false),
    shareFeedback = '',
    downloadDropdownOpen = $bindable(false),
    onStyleSelect,
    toggleMode,
    toggleColorMode,
    onCopyHtml,
    onCopyMarkdown,
    onShareStyle,
    onShareDoc,
    onShareEncrypted,
    onDownloadMarkdown,
    onDownloadHtml,
    onDownloadPdf,
  } = $props();

  function closeOthers(except) {
    if (except !== 'copy') copyDropdownOpen = false;
    if (except !== 'share') shareDropdownOpen = false;
    if (except !== 'download') downloadDropdownOpen = false;
  }
</script>

<header class="toolbar">
  <div class="toolbar-group">
    <a class="logo" href="/">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
      <span>Seal</span>
    </a>

    <div class="sep"></div>

    <div class="seg" role="tablist">
      <div class="seg-indicator" class:at-right={mode === 'view'}></div>
      <button class="seg-btn" role="tab" aria-selected={mode === 'edit'} class:is-active={mode === 'edit'} onclick={toggleMode} title="Edit">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
      </button>
      <button class="seg-btn" role="tab" aria-selected={mode === 'view'} class:is-active={mode === 'view'} onclick={toggleMode} title="Preview">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
      </button>
    </div>

    <div class="sep"></div>

    <div class="theme-picker">
      <label class="picker-label" for="theme-select"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r="0.5"/><circle cx="17.5" cy="10.5" r="0.5"/><circle cx="8.5" cy="7.5" r="0.5"/><circle cx="6.5" cy="12" r="0.5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg></label>
      <select id="theme-select" class="select" value={selectedStyleValue} onchange={onStyleSelect}>
        {#each PRESET_IDS as id}
          <option value={id}>{getPresetLabel(id)}</option>
        {/each}
        {#if hasOverrides}
          <option value="untitled">Untitled *</option>
        {/if}
        {#each Object.keys(savedThemes) as name}
          <option value="saved:{name}">{name}</option>
        {/each}
      </select>
    </div>

    <button class="icon-btn" class:is-active={themeMakerOpen} title={themeMakerOpen ? 'Hide style bar' : 'Show style bar'} onclick={() => (themeMakerOpen = !themeMakerOpen)}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
    </button>

    <button class="icon-btn color-toggle" title={colorMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} onclick={toggleColorMode}>
      {#if colorMode === 'dark'}
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
      {:else}
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
      {/if}
    </button>
  </div>

  <div class="toolbar-group toolbar-actions">
    <ToolbarDropdown
      bind:open={copyDropdownOpen}
      feedback={copyFeedback}
      title="Copy"
      onOpen={() => closeOthers('copy')}
      triggerIcon={copyTriggerIcon}
      menu={copyMenu}
    />

    <ToolbarDropdown
      bind:open={downloadDropdownOpen}
      title="Download"
      onOpen={() => closeOthers('download')}
      triggerIcon={downloadTriggerIcon}
      menu={downloadMenu}
    />

    <ToolbarDropdown
      bind:open={shareDropdownOpen}
      feedback={shareFeedback}
      title={shareFeedback ? 'Copied!' : 'Share'}
      onOpen={() => closeOthers('share')}
      triggerIcon={shareTriggerIcon}
      menu={shareMenu}
    />
  </div>
</header>

{#snippet copyTriggerIcon()}
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
{/snippet}
{#snippet copyMenu()}
  <button role="menuitem" onclick={onCopyHtml}>HTML</button>
  <button role="menuitem" onclick={onCopyMarkdown}>Markdown</button>
{/snippet}

{#snippet downloadTriggerIcon()}
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
{/snippet}
{#snippet downloadMenu()}
  <button role="menuitem" onclick={onDownloadMarkdown} title="Download as Markdown">Markdown</button>
  <button role="menuitem" onclick={onDownloadHtml} title="Download as HTML">HTML</button>
  <button role="menuitem" onclick={onDownloadPdf} title="Download as PDF">PDF</button>
{/snippet}

{#snippet shareTriggerIcon()}
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
{/snippet}
{#snippet shareMenu()}
  <button role="menuitem" onclick={onShareStyle} title="Copy style link">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
    Style
  </button>
  <button role="menuitem" onclick={onShareDoc} title="Copy doc link">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
    Doc
  </button>
  <button role="menuitem" onclick={onShareEncrypted} title="Copy encrypted link (password-protected)">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
    Encrypted
  </button>
{/snippet}

<style>
  .toolbar {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 54px;
    padding: 0 28px 0 16px;
    background: var(--c-bg);
    border-bottom: 1px solid var(--c-border-subtle);
    z-index: 10;
    flex-shrink: 0;
    gap: 10px;
    transition: background-color 0.2s, border-color 0.2s;
  }
  .toolbar::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: 100%;
    height: 20px;
    background: linear-gradient(to bottom, var(--c-bg) 0%, transparent 100%);
    pointer-events: none;
  }
  .toolbar-group {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .logo {
    display: flex; align-items: center; gap: 8px;
    color: var(--c-text-secondary); text-decoration: none;
    font-weight: 600; font-size: 13.5px;
    letter-spacing: -0.01em;
    padding: 6px 10px 6px 6px;
    border-radius: 8px;
    transition: color 0.15s, background-color 0.15s;
  }
  .logo:hover { color: var(--c-text); background: var(--c-bg-surface); }
  .logo svg { opacity: 0.7; }

  .sep {
    width: 1px; height: 24px;
    background: var(--c-border);
    margin: 0 8px;
    flex-shrink: 0;
  }

  .seg {
    position: relative;
    display: grid;
    grid-template-columns: 1fr 1fr;
    background: var(--c-bg-surface);
    border: 1px solid var(--c-border);
    border-radius: 9999px;
    padding: 3px;
    min-width: 88px;
    transition: background-color 0.2s, border-color 0.2s;
  }
  .seg-indicator {
    position: absolute;
    top: 3px; left: 3px;
    width: calc(50% - 3px);
    height: calc(100% - 6px);
    background: var(--c-bg-elevated);
    border-radius: 9999px;
    box-shadow: var(--c-shadow-sm);
    transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.2s, box-shadow 0.2s;
    z-index: 0;
  }
  .seg-indicator.at-right {
    transform: translateX(100%);
  }
  .seg-btn {
    position: relative; z-index: 1;
    display: flex; align-items: center; justify-content: center;
    padding: 6px 12px;
    border: none; border-radius: 9999px;
    font-size: 12.5px; font-weight: 500;
    background: transparent; color: var(--c-text-dimmed);
    cursor: pointer;
    transition: color 0.2s;
    font-family: inherit;
    user-select: none;
  }
  .seg-btn:hover { color: var(--c-text-secondary); }
  .seg-btn.is-active { color: var(--c-text); }

  .theme-picker {
    display: flex; align-items: center; gap: 8px;
  }
  .picker-label {
    font-size: 12px; font-weight: 500;
    color: var(--c-text-dimmed);
    white-space: nowrap;
  }
  .select {
    padding: 6px 28px 6px 10px;
    height: 34px;
    border-radius: 9999px;
    border: 1px solid var(--c-border);
    background: var(--c-bg-surface);
    color: var(--c-text-input);
    font-size: 12.5px; font-family: inherit;
    cursor: pointer; appearance: none;
    transition: border-color 0.15s, background-color 0.2s, box-shadow 0.15s;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'%3E%3Cpath d='M2.5 4l2.5 2.5L7.5 4' fill='none' stroke='%2371717a' stroke-width='1.25'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 8px center;
  }
  .select:hover { border-color: var(--c-border-hover); }
  .select:focus { outline: none; border-color: var(--c-caret); box-shadow: 0 0 0 2px var(--c-focus-ring); }

  .icon-btn {
    display: flex; align-items: center; justify-content: center;
    width: 34px; height: 34px;
    border: 1px solid var(--c-border); border-radius: 9999px;
    background: transparent; color: var(--c-text-muted);
    cursor: pointer; transition: all 0.15s;
  }
  .icon-btn:hover { background: var(--c-bg-surface); color: var(--c-text-input); border-color: var(--c-border-hover); box-shadow: var(--c-shadow-xs); }
  .icon-btn.is-active { background: var(--c-accent); color: #fff; border-color: var(--c-accent); }

  @media (max-width: 768px) {
    .toolbar { height: auto; flex-wrap: wrap; padding: 10px 28px 10px 12px; gap: 6px; }
    .toolbar-group { flex-wrap: wrap; gap: 4px; }
    .sep { height: 18px; }
  }

  @media (max-width: 480px) {
    .picker-label { display: none; }
  }
</style>
