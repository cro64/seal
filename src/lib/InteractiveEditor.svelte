<script>
  import { parseMarkdown } from './markdown.js';
  import { splitMarkdown, blocksToMarkdown, classifyBlock } from './blocks/index.js';
  import {
    composeEditedMarkdown,
    displayBlocksForActiveEdit,
    draftEnterMarkdown,
    EMPTY_DRAFT_BLOCK_ID,
    expandActiveEditSource,
    isBlockquoteLike,
    pickSplitTargetId,
  } from './blocks/editorState.js';
  import InteractiveBlock from './InteractiveBlock.svelte';

  let {
    markdown = $bindable(''),
    previewWidthStyle = '',
    isBoilerplate = false,
    initialBoilerplateText = '',
    onWipeBoilerplate,
    onRestoreBoilerplateIfEmpty,
  } = $props();

  /** @type {{ blockId: string, baseBlocks: import('./blocks/types.js').Block[], source: string, cursor: number } | null} */
  let editSession = $state(null);

  const blocks = $derived(splitMarkdown(markdown));
  const activeBlockId = $derived(editSession?.blockId ?? null);
  const cursorOffset = $derived(editSession?.cursor ?? 0);
  const activeEditSource = $derived(editSession?.source ?? null);
  const editBlocks = $derived(editSession?.baseBlocks ?? blocks);

  const displayBlocks = $derived.by(() => {
    if (blocks.length === 0 && !isBoilerplate) {
      return [{ id: EMPTY_DRAFT_BLOCK_ID, type: 'paragraph', source: '', meta: {} }];
    }
    return displayBlocksForActiveEdit(editBlocks, activeBlockId, activeEditSource);
  });

  const boilerplateHtml = $derived(
    initialBoilerplateText ? parseMarkdown(initialBoilerplateText) : ''
  );

  function activateBlock(id, offset = 0) {
    const baseBlocks = editSession?.baseBlocks ?? blocks;
    if (id === EMPTY_DRAFT_BLOCK_ID) {
      editSession = { blockId: id, baseBlocks: [], source: '', cursor: offset };
      return;
    }
    const block = baseBlocks.find((b) => b.id === id);
    if (!block) return;
    editSession = {
      blockId: id,
      baseBlocks,
      source: block.source,
      cursor: Math.min(offset, block.source.length),
    };
  }

  let previewEl = $state(null);

  function deactivateBlock() {
    const scrollTop = previewEl?.scrollTop ?? 0;
    if (editSession && editSession.blockId !== EMPTY_DRAFT_BLOCK_ID) {
      const baseBlocks = editSession.baseBlocks;
      const idx = baseBlocks.findIndex((b) => b.id === editSession?.blockId);
      if (idx !== -1) {
        markdown = blocksToMarkdown(splitMarkdown(composeEditedMarkdown(baseBlocks, idx, editSession.source)));
      }
    }
    editSession = null;
    queueMicrotask(() => {
      requestAnimationFrame(() => {
        if (previewEl) previewEl.scrollTop = scrollTop;
      });
    });
  }

  function navigate(id, dir, offset = cursorOffset) {
    if (id === EMPTY_DRAFT_BLOCK_ID) {
      if (dir === 'enter') {
        markdown = draftEnterMarkdown();
        editSession = null;
        queueMicrotask(() => {
          const next = splitMarkdown(markdown);
          activateBlock(pickSplitTargetId(next, 1), 0);
        });
        return;
      }
      if ((dir === 'right' || dir === 'down') && blocks.length > 0) {
        activateBlock(blocks[0].id, 0);
      }
      return;
    }

    const visibleBlocks = displayBlocks;
    const idx = visibleBlocks.findIndex((b) => b.id === id);
    if (idx === -1) return;

    if (dir === 'left' || dir === 'up') {
      for (let i = idx - 1; i >= 0; i--) {
        activateBlock(visibleBlocks[i].id, visibleBlocks[i].source.length);
        return;
      }
      return;
    }

    if (dir === 'right' || dir === 'down') {
      for (let i = idx + 1; i < visibleBlocks.length; i++) {
        activateBlock(visibleBlocks[i].id, 0);
        return;
      }
      return;
    }

    if (dir === 'enter') {
      const pos = offset;

      const baseBlocks = editSession?.baseBlocks ?? blocks;
      const idx = baseBlocks.findIndex((b) => b.id === id);
      if (idx === -1) return;

      const source = editSession?.blockId === id
        ? editSession.source
        : baseBlocks[idx].source;
      const before = source.slice(0, pos);
      const after = source.slice(pos);

      const nextBlocks = [
        ...baseBlocks.slice(0, idx),
        ...(before ? [{ ...baseBlocks[idx], source: before, type: classifyBlock(before) }] : []),
        { ...baseBlocks[idx], id: `split-${Date.now()}`, source: after, type: classifyBlock(after || ' ') },
        ...baseBlocks.slice(idx + 1),
      ];

      markdown = blocksToMarkdown(nextBlocks);
      editSession = null;
      queueMicrotask(() => {
        const next = splitMarkdown(markdown);
        const targetIdx = before ? idx + 1 : idx;
        activateBlock(pickSplitTargetId(next, targetIdx), 0);
      });
      return;
    }

    if (dir === 'merge') {
      const baseBlocks = editSession?.baseBlocks ?? blocks;
      const baseIdx = baseBlocks.findIndex((b) => b.id === id);
      if (baseIdx <= 0) return;
      const prev = baseBlocks[baseIdx - 1];
      const cur = baseBlocks[baseIdx];
      const merged = prev.source + cur.source;

      const updated = baseBlocks.filter((_, i) => i !== baseIdx);
      updated[baseIdx - 1] = {
        ...prev,
        source: merged,
        type: classifyBlock(merged),
      };
      markdown = blocksToMarkdown(updated);
      editSession = null;
      queueMicrotask(() => {
        const next = splitMarkdown(markdown);
        const target = next[Math.max(0, baseIdx - 1)];
        if (target) activateBlock(target.id, Math.min(prev.source.length, target.source.length));
      });
    }
  }

  function handleBlockChange(id, source, offset) {
    const previousActiveEditSource = editSession?.source ?? null;

    if (id === EMPTY_DRAFT_BLOCK_ID) {
      if (!source.trim()) return;
      if (markdown === source) return;
      markdown = source;
      editSession = { blockId: id, baseBlocks: [], source, cursor: offset };
      queueMicrotask(() => {
        const next = splitMarkdown(markdown);
        if (next[0]) activateBlock(next[0].id, offset);
      });
      return;
    }

    const baseBlocks = editSession?.baseBlocks ?? blocks;
    const idx = baseBlocks.findIndex((b) => b.id === id);
    if (idx === -1) return;
    if (baseBlocks[idx].source === source && activeBlockId !== id) return;
    if (
      baseBlocks[idx].source === source &&
      activeBlockId === id &&
      previousActiveEditSource === source
    ) {
      return;
    }

    if (!source.trim() && baseBlocks[idx].type !== 'hr') {
      const remaining = baseBlocks.filter((_, i) => i !== idx);
      if (remaining.length === 0) {
        markdown = '';
        editSession = { blockId: EMPTY_DRAFT_BLOCK_ID, baseBlocks: [], source: '', cursor: 0 };
        onRestoreBoilerplateIfEmpty?.();
        return;
      }
      markdown = blocksToMarkdown(remaining);
      editSession = null;
      queueMicrotask(() => {
        const next = splitMarkdown(markdown);
        const target = next[Math.min(idx, next.length - 1)];
        if (target) activateBlock(target.id, Math.min(offset, target.source.length));
      });
      return;
    }

    const prevCount = baseBlocks.length;
    const expandedSource = expandActiveEditSource(baseBlocks, idx, source);
    if (activeBlockId === id && editSession) {
      editSession = { ...editSession, source: expandedSource, cursor: offset };
    }
    const newMd = composeEditedMarkdown(baseBlocks, idx, expandedSource);

    if (activeBlockId === id && isBlockquoteLike(baseBlocks[idx], expandedSource)) {
      markdown = newMd;
      return;
    }

    const resplit = splitMarkdown(newMd);
    markdown = blocksToMarkdown(resplit);

    if (resplit.length !== prevCount || !resplit.some((b) => b.id === id)) {
      queueMicrotask(() => {
        const next = splitMarkdown(markdown);
        const same = next.find((b) => b.id === id);
        if (same) {
          activateBlock(same.id, Math.min(offset, same.source.length));
          return;
        }
        const fallback = next[Math.min(idx, next.length - 1)];
        if (fallback) activateBlock(fallback.id, Math.min(offset, fallback.source.length));
      });
    }
  }

  function handleBoilerplateClick() {
    onWipeBoilerplate?.();
    activateBlock(EMPTY_DRAFT_BLOCK_ID, 0);
  }

  function handleSurfaceClick(e) {
    if (isBoilerplate) return;
    const target = /** @type {HTMLElement} */ (e.target);
    if (target.closest('[data-block-id]')) return;

    const blocks = previewEl?.querySelectorAll('[data-block-id]');
    const lastEl = blocks?.[blocks.length - 1];
    if (lastEl && e.clientY > lastEl.getBoundingClientRect().bottom + 8) {
      const last = displayBlocks[displayBlocks.length - 1];
      activateBlock(last.id, last.source.length);
      return;
    }

    deactivateBlock();
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="interactive-editor" onpointerdown={handleSurfaceClick}>
  <div class="fullpreview" bind:this={previewEl}>
    <div class="card card-full" style={previewWidthStyle}>
      <div class="md-preview">
        {#each displayBlocks as block (block.id)}
          <InteractiveBlock
            {block}
            active={activeBlockId === block.id}
            {cursorOffset}
            onactivate={(offset) => activateBlock(block.id, offset)}
            onchange={(source, offset) => handleBlockChange(block.id, source, offset)}
            onnavigate={(dir, offset) => navigate(block.id, dir, offset)}
            ondeactivate={deactivateBlock}
          />
        {/each}
      </div>

      {#if isBoilerplate && boilerplateHtml}
        <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
        <div
          class="boilerplate-overlay md-preview"
          onclick={handleBoilerplateClick}
          aria-hidden="true"
        >
          {@html boilerplateHtml}
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .interactive-editor {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
  }

  .fullpreview {
    flex: 1;
    overflow-y: auto;
    padding: 40px;
    display: flex;
    justify-content: center;
    background: var(--c-bg-preview);
    transition: background-color 0.2s;
  }

  .card {
    position: relative;
    border-radius: 12px;
    box-shadow: var(--c-shadow-card);
    overflow: hidden;
    transition: box-shadow 0.2s;
  }

  .card-full {
    width: 100%;
    align-self: flex-start;
    transition: max-width 0.25s ease;
  }

  .card-full .md-preview {
    padding: 56px 64px;
  }

  .boilerplate-overlay {
    position: absolute;
    inset: 0;
    padding: 56px 64px;
    background: var(--c-bg-preview);
    cursor: text;
    color: var(--c-text-dimmed);
    pointer-events: auto;
  }

  .boilerplate-overlay :global(h1),
  .boilerplate-overlay :global(h2),
  .boilerplate-overlay :global(h3),
  .boilerplate-overlay :global(h4),
  .boilerplate-overlay :global(p),
  .boilerplate-overlay :global(li),
  .boilerplate-overlay :global(strong) {
    color: inherit;
  }

  @media (max-width: 768px) {
    .fullpreview { padding: 20px; }
    .card-full .md-preview,
    .boilerplate-overlay { padding: 32px 28px; }
  }
</style>
