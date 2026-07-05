<script>
  let {
    htmlContent = '',
    previewWidthStyle = '',
    emptyMessage = 'Nothing to preview.',
  } = $props();
</script>

<div class="fullpreview">
  <div class="card card-full" style={previewWidthStyle}>
    <div class="md-preview">
      {#if htmlContent}
        {@html htmlContent}
      {:else}
        <p class="empty">{emptyMessage}</p>
      {/if}
    </div>
  </div>
</div>

<style>
  .fullpreview {
    flex: 1; overflow-y: auto;
    padding: 40px;
    display: flex; justify-content: center;
    background: var(--c-bg-preview);
    transition: background-color 0.2s;
  }
  .card {
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
  .empty { color: var(--c-text-dimmed); font-style: italic; }

  @media (max-width: 768px) {
    .fullpreview { padding: 20px; }
    .card-full .md-preview { padding: 32px 28px; }
  }
</style>
