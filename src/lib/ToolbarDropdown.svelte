<script>
  /** @type {import('svelte').Snippet} */
  let { open = $bindable(false), feedback = '', title = '', onOpen, triggerIcon, menu } = $props();
</script>

<div class="toolbar-dropdown" data-toolbar-dropdown>
  <button
    class="toolbar-dropdown-trigger"
    class:is-open={open}
    title={feedback || title}
    onclick={(e) => {
      e.stopPropagation();
      if (!open) onOpen?.();
      open = !open;
    }}
    aria-expanded={open}
    aria-haspopup="true"
  >
    {@render triggerIcon()}
  </button>
  {#if open}
    <div class="toolbar-dropdown-popover" role="menu">
      {@render menu()}
    </div>
  {/if}
</div>

<style>
  .toolbar-dropdown {
    position: relative;
    z-index: 100;
  }
  .toolbar-dropdown-trigger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 34px;
    height: 34px;
    padding: 0;
    border-radius: 8px;
    border: 1px solid var(--c-border);
    background: transparent;
    color: var(--c-text-muted);
    font-family: inherit;
    cursor: pointer;
    transition: all 0.15s;
  }
  .toolbar-dropdown-trigger:hover {
    background: var(--c-bg-surface);
    color: var(--c-text-input);
    border-color: var(--c-border-hover);
    box-shadow: var(--c-shadow-xs);
  }
  .toolbar-dropdown-trigger.is-open {
    background: var(--c-accent);
    color: #fff;
    border-color: var(--c-accent);
  }
  .toolbar-dropdown-popover {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    left: auto;
    min-width: 140px;
    padding: 10px 12px;
    background: var(--c-bg-glass);
    border: 1px solid var(--c-glass-border);
    border-radius: 12px;
    box-shadow: var(--c-glass-shadow), var(--c-glass-highlight);
    -webkit-backdrop-filter: blur(24px) saturate(1.6);
    backdrop-filter: blur(24px) saturate(1.6);
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .toolbar-dropdown-popover::after {
    content: '';
    position: absolute;
    top: -6px;
    right: 12px;
    left: auto;
    width: 10px;
    height: 10px;
    background: var(--c-bg-glass);
    border-right: 1px solid var(--c-glass-border);
    border-top: 1px solid var(--c-glass-border);
    transform: rotate(45deg);
  }
  .toolbar-dropdown-popover :global(button) {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 12px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--c-text);
    font-size: 12.5px;
    font-weight: 500;
    font-family: inherit;
    text-align: left;
    cursor: pointer;
    transition: background-color 0.15s;
  }
  .toolbar-dropdown-popover :global(button:hover) {
    background: var(--c-bg-surface);
  }
  .toolbar-dropdown-popover :global(button svg) {
    flex-shrink: 0;
    opacity: 0.8;
  }
</style>
