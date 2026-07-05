<script>
  import { onMount } from 'svelte';

  const PREVIEW_KEY = 'seal-source-preview';

  let {
    markdown = $bindable(''),
    htmlContent = '',
    isBoilerplate = false,
    initialBoilerplateText = '',
    onWipeBoilerplate,
    onRestoreBoilerplateIfEmpty,
  } = $props();

  let sourcePreviewOpen = $state(false);
  let editorEl = $state(null);

  onMount(() => {
    try {
      const stored = localStorage.getItem(PREVIEW_KEY);
      if (stored === 'true') sourcePreviewOpen = true;
    } catch {}
  });

  $effect(() => {
    try {
      localStorage.setItem(PREVIEW_KEY, String(sourcePreviewOpen));
    } catch {}
  });

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

  function togglePreview() {
    sourcePreviewOpen = !sourcePreviewOpen;
  }

  function handleWipeBoilerplate() {
    onWipeBoilerplate?.();
    requestAnimationFrame(() => editorEl?.focus());
  }
</script>

{#snippet toggleIcon(open)}
  {#if open}
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  {:else}
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
  {/if}
{/snippet}

<div class="source-pane" class:preview-open={sourcePreviewOpen}>
  <div class="layout">
    <div class="pane pane-editor">
      <div class="pane-scroll">
        <div class="editor-wrap">
          {#if isBoilerplate}
            <div class="editor-boilerplate" aria-hidden="true">{initialBoilerplateText}</div>
            <textarea
              class="editor editor-overlay"
              placeholder=""
              bind:this={editorEl}
              onfocus={handleWipeBoilerplate}
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
              onblur={onRestoreBoilerplateIfEmpty}
              spellcheck="false"
            ></textarea>
          {/if}
        </div>
      </div>
    </div>

    {#if sourcePreviewOpen}
      <button
        type="button"
        class="preview-toggle preview-toggle-split"
        title="Hide preview"
        aria-label="Hide preview"
        aria-expanded={true}
        onclick={togglePreview}
      >
        {@render toggleIcon(true)}
      </button>

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
    {/if}
  </div>

  {#if !sourcePreviewOpen}
    <div class="edge-reveal">
      <button
        type="button"
        class="preview-toggle preview-toggle-edge"
        title="Show preview"
        aria-label="Show preview"
        aria-expanded={false}
        onclick={togglePreview}
      >
        {@render toggleIcon(false)}
      </button>
    </div>
  {/if}
</div>

<style>
  .source-pane {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
    position: relative;
  }

  .layout {
    flex: 1;
    display: flex;
    flex-direction: row;
    align-items: stretch;
    min-height: 0;
    overflow: hidden;
  }

  .pane {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
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

  .preview-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 52px;
    padding: 0;
    border: none;
    outline: none;
    border-radius: 6px;
    background: transparent;
    color: var(--c-text-muted);
    cursor: pointer;
    transition: background-color 0.15s, color 0.15s, opacity 0.15s;
  }

  .preview-toggle:hover,
  .preview-toggle:focus-visible {
    background: var(--c-bg-surface);
    color: var(--c-text);
  }

  /* Preview open: toggle sits on the split seam, always visible */
  .preview-toggle-split {
    flex-shrink: 0;
    align-self: center;
    margin: 0 -2px;
    z-index: 2;
  }

  /* Preview closed: reveal toggle when hovering the right edge */
  .edge-reveal {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 36px;
    z-index: 5;
  }

  .preview-toggle-edge {
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
  }

  @media (hover: hover) and (pointer: fine) {
    .preview-toggle-edge {
      opacity: 0;
      pointer-events: none;
    }

    .edge-reveal:hover .preview-toggle-edge,
    .preview-toggle-edge:focus-visible {
      opacity: 1;
      pointer-events: auto;
    }
  }

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
    border: none;
    outline: none;
    resize: none;
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
    font-size: 13.5px;
    line-height: 1.7;
    color: var(--c-text-input);
    background: transparent;
    min-height: 0;
    caret-color: var(--c-caret);
    transition: color 0.2s ease, caret-color 0.2s ease;
  }

  .editor::placeholder { color: var(--c-placeholder); }
  .editor::selection { background: var(--c-selection); }

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

  .empty { color: var(--c-text-dimmed); font-style: italic; }

  @media (max-width: 768px) {
    .source-pane.preview-open .layout {
      flex-direction: column;
    }

    .preview-toggle-split {
      align-self: center;
      width: 52px;
      height: 28px;
      margin: -2px 0;
    }

    .edge-reveal {
      width: 48px;
    }

    .pane-scroll { padding: 16px; }
    .editor-wrap { padding: 24px; }
    .editor { min-height: 120px; font-size: 13px; }
    .editor-boilerplate, .editor-overlay { min-height: 120px; }
    .editor-boilerplate { font-size: 13px; }
    .card .md-preview { padding: 24px; }
  }
</style>
