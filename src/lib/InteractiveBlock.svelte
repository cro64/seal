<script>
  import { onDestroy } from 'svelte';
  import { parseMarkdown } from './markdown.js';
  import { BLOCK_TYPES } from './blocks/index.js';
  import { renderHybridBlock } from './blocks/renderHybrid.js';
  import {
    setSelectionOffset,
    scrollSelectionIntoView,
    clickToOffset,
    clickToRenderedOffset,
    moveCursorHorizontal,
    moveCursorVertical,
  } from './blocks/selection.js';
  import { isAtBlockStart } from './blocks/blockNav.js';
  import { blockquoteMarkerDeleteRange, blockquoteMarkerInsert } from './blocks/blockquoteEdit.js';

  /** @type {{
   *   block: import('./blocks/types.js').Block,
   *   active: boolean,
   *   cursorOffset: number,
   *   onactivate: (offset: number) => void,
   *   onchange: (source: string, cursorOffset: number) => void,
   *   onnavigate: (dir: 'left'|'right'|'up'|'down'|'enter'|'merge', cursorOffset: number) => void,
   *   ondeactivate: () => void,
   * }} */
  let { block, active = false, cursorOffset = 0, onactivate, onchange, onnavigate, ondeactivate } = $props();

  let rootEl = $state(null);
  let localCursor = $state(0);
  let initBlockId = $state('');
  let caretStyle = $state('');
  let caretMoving = $state(false);
  let caretIdleTimer;

  onDestroy(stopCaretMoving);

  const renderCursor = $derived(Math.min(localCursor, block.source.length));

  const hybridHtml = $derived(
    active ? renderHybridBlock(block, renderCursor) : null
  );

  const staticHtml = $derived(
    !active && block.source.trim() ? parseMarkdown(block.source) : null
  );

  const isMultilineBlock = $derived(
    block.type === BLOCK_TYPES.CODE ||
      block.type === BLOCK_TYPES.TABLE ||
      block.type === BLOCK_TYPES.UL ||
      block.type === BLOCK_TYPES.OL ||
      block.type === BLOCK_TYPES.BLOCKQUOTE
  );

  $effect(() => {
    if (!active) {
      initBlockId = '';
      stopCaretMoving();
      return;
    }

    if (initBlockId === block.id) return;
    initBlockId = block.id;
    localCursor = Math.min(cursorOffset, block.source.length);

    queueMicrotask(() => {
      if (rootEl) {
        rootEl.focus({ preventScroll: true });
        restoreSelection(renderCursor);
      }
    });
  });

  $effect(() => {
    if (!active || !rootEl || !hybridHtml) return;
    rootEl.innerHTML = hybridHtml;
    queueMicrotask(() => {
      if (rootEl) {
        rootEl.focus({ preventScroll: true });
        restoreSelection(renderCursor);
      }
    });
  });

  function restoreSelection(pos) {
    if (!rootEl) return;
    setSelectionOffset(rootEl, pos);
    updateCaretOverlay();
    scrollSelectionIntoView(rootEl);
  }

  function applyEdit(nextSource, nextCursor) {
    localCursor = nextCursor;
    onchange?.(nextSource, nextCursor);
  }

  function moveCursor(nextCursor) {
    const clamped = Math.min(Math.max(0, nextCursor), block.source.length);
    localCursor = clamped;
    keepCaretVisibleWhileMoving();
    queueMicrotask(() => restoreSelection(clamped));
  }

  function keepCaretVisibleWhileMoving() {
    caretMoving = true;
    clearTimeout(caretIdleTimer);
    caretIdleTimer = setTimeout(() => {
      caretMoving = false;
    }, 180);
  }

  function stopCaretMoving() {
    clearTimeout(caretIdleTimer);
    caretMoving = false;
  }

  function handleInactiveClick(e) {
    const el = /** @type {HTMLElement} */ (e.currentTarget);
    const offset = clickToRenderedOffset(el, /** @type {MouseEvent} */ (e), block.source, block.type);
    onactivate?.(offset);
  }

  function handleHybridClick(e) {
    if (!rootEl) return;
    const offset = clickToOffset(rootEl, /** @type {MouseEvent} */ (e), block.source.length, localCursor);
    if (offset !== localCursor) {
      moveCursor(offset);
    } else {
      updateCaretOverlay();
    }
  }

  function handleHybridBeforeInput(e) {
    e.preventDefault();
  }

  function handleHybridKeydown(e) {
    if (!rootEl) return;
    const pos = localCursor;
    const source = block.source;

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const next = moveCursorHorizontal(source, pos, 'left', {
        compactBlockquotePrefixes: block.type === BLOCK_TYPES.BLOCKQUOTE,
      });
      if (next !== pos) {
        moveCursor(next);
      } else {
        onnavigate?.('left', pos);
      }
      return;
    }

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = moveCursorHorizontal(source, pos, 'right', {
        compactBlockquotePrefixes: block.type === BLOCK_TYPES.BLOCKQUOTE,
      });
      if (next !== pos) {
        moveCursor(next);
      } else {
        onnavigate?.('right', pos);
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (isMultilineBlock) {
        const next = moveCursorVertical(source, pos, 'up');
        if (next !== pos) {
          moveCursor(next);
        } else {
          onnavigate?.('up', pos);
        }
      } else {
        onnavigate?.('up', pos);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (isMultilineBlock) {
        const next = moveCursorVertical(source, pos, 'down');
        if (next !== pos) {
          moveCursor(next);
        } else {
          onnavigate?.('down', pos);
        }
      } else {
        onnavigate?.('down', pos);
      }
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (isMultilineBlock) {
        applyEdit(source.slice(0, pos) + '\n' + source.slice(pos), pos + 1);
      } else {
        onnavigate?.('enter', pos);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      ondeactivate?.();
      return;
    }

    if (e.metaKey || e.ctrlKey) return;

    e.preventDefault();

    if (e.key === 'Backspace') {
      const markerOffset =
        block.type === BLOCK_TYPES.BLOCKQUOTE
          ? blockquoteMarkerDeleteRange(source, pos, 'backspace')
          : null;
      if (markerOffset != null) {
        applyEdit(source.slice(0, markerOffset.start) + source.slice(markerOffset.end), markerOffset.cursor);
        return;
      }
      if (isAtBlockStart(block.type, source, pos)) {
        onnavigate?.('merge', pos);
        return;
      }
      if (pos === 0) return;
      applyEdit(source.slice(0, pos - 1) + source.slice(pos), pos - 1);
      return;
    }

    if (e.key === 'Delete') {
      const markerOffset =
        block.type === BLOCK_TYPES.BLOCKQUOTE
          ? blockquoteMarkerDeleteRange(source, pos, 'delete')
          : null;
      if (markerOffset != null) {
        applyEdit(source.slice(0, markerOffset.start) + source.slice(markerOffset.end), markerOffset.cursor);
        return;
      }
      if (pos >= source.length) return;
      applyEdit(source.slice(0, pos) + source.slice(pos + 1), pos);
      return;
    }

    if (e.key.length === 1) {
      if (e.key === '>' && block.type === BLOCK_TYPES.BLOCKQUOTE) {
        const markerInsert = blockquoteMarkerInsert(source, pos);
        if (markerInsert) {
          applyEdit(markerInsert.source, markerInsert.cursor);
          return;
        }
      }
      applyEdit(source.slice(0, pos) + e.key + source.slice(pos), pos + 1);
    }
  }

  function handlePaste(e) {
    if (!rootEl) return;
    e.preventDefault();
    const text = e.clipboardData?.getData('text/plain') ?? '';
    if (!text) return;
    const source = block.source;
    applyEdit(source.slice(0, localCursor) + text + source.slice(localCursor), localCursor + text.length);
  }

  function updateCaretOverlay() {
    if (!rootEl) {
      caretStyle = '';
      return;
    }
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !rootEl.contains(sel.anchorNode)) {
      caretStyle = '';
      return;
    }
    const range = sel.getRangeAt(0);
    const rect = range.getClientRects()[0] ?? range.getBoundingClientRect();
    if (!rect || (rect.width === 0 && rect.height === 0 && rect.top === 0 && rect.left === 0)) {
      caretStyle = '';
      return;
    }
    const host = rootEl.getBoundingClientRect();
    const height = rect.height || parseFloat(getComputedStyle(rootEl).lineHeight) || 20;
    caretStyle = `left:${rect.left - host.left}px;top:${rect.top - host.top}px;height:${height}px;`;
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="doc-block" data-block-id={block.id}>
  {#if active}
    <div class="doc-hybrid-wrap">
      <!-- svelte-ignore a11y_no_noninteractive_tabindex a11y_no_noninteractive_element_interactions -->
      <div
        class="doc-hybrid"
        bind:this={rootEl}
        contenteditable="true"
        tabindex="0"
        role="textbox"
        onkeydown={handleHybridKeydown}
        onbeforeinput={handleHybridBeforeInput}
        onpaste={handlePaste}
        onclick={handleHybridClick}
      ></div>
      {#if caretStyle}
        <span
          class="doc-caret"
          class:doc-caret-moving={caretMoving}
          style={caretStyle}
          aria-hidden="true"
        ></span>
      {/if}
    </div>
  {:else}
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div class="doc-static" onclick={handleInactiveClick}>
      {#if staticHtml}
        {@html staticHtml}
      {:else}
        <p class="doc-empty">&nbsp;</p>
      {/if}
    </div>
  {/if}
</div>

<style>
  .doc-block :global(> :first-child) {
    margin-top: 0;
  }

  .doc-block :global(> :last-child) {
    margin-bottom: 0;
  }

  .doc-static {
    cursor: text;
  }

  .doc-empty {
    margin: 0;
    min-height: 1.25em;
  }

  .doc-hybrid-wrap {
    position: relative;
  }

  .doc-hybrid {
    outline: none;
    caret-color: transparent;
    min-height: 0.25em;
  }

  .doc-caret {
    position: absolute;
    width: 2px;
    background: var(--c-caret);
    pointer-events: none;
    animation: caret-blink 1s steps(1) infinite;
    z-index: 3;
  }

  .doc-caret-moving {
    animation: none;
    opacity: 1;
  }

  @keyframes caret-blink {
    0%, 49% { opacity: 1; }
    50%, 100% { opacity: 0; }
  }

  .doc-hybrid :global(.md-syntax) {
    color: var(--c-text-dimmed);
    opacity: 0.45;
  }

  .doc-hybrid :global(.hybrid-slot) {
    opacity: 0;
  }

  .doc-hybrid :global(.hybrid-bq),
  .doc-hybrid :global(.hybrid-li) {
    white-space: pre-wrap;
  }

  .doc-hybrid :global(.hybrid-bq-prefix) {
    display: inline-block;
    padding-right: 0.25em;
    opacity: 0.7;
  }

  .doc-hybrid :global(.hybrid-code) {
    margin: 0;
    padding: 0;
    background: transparent;
    font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
    font-size: 0.9em;
    line-height: 1.5;
    white-space: pre-wrap;
    overflow-x: auto;
  }

  .doc-hybrid :global(.hybrid-table) {
    border-collapse: collapse;
    width: 100%;
  }

  .doc-hybrid :global(.hybrid-table-sep td) {
    padding: 0;
    border: none;
    height: 0;
    line-height: 0;
    font-size: 0;
  }

  .doc-hybrid :global(.hybrid-li-marker) {
    list-style: none;
  }

  .doc-hybrid :global(.hybrid-list .hybrid-list) {
    margin-top: 0.25em;
    margin-bottom: 0.25em;
  }

  .doc-block :global(hr),
  .doc-static :global(hr),
  .doc-hybrid :global(hr) {
    display: block;
  }

  .doc-block :global(img),
  .doc-static :global(img),
  .doc-hybrid :global(img) {
    max-width: 100%;
    height: auto;
  }

</style>
