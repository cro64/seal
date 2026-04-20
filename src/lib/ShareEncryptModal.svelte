<script>
  let {
    open = $bindable(false),
    password = $bindable(''),
    error = '',
    loading = false,
    onConfirm,
    onCancel,
  } = $props();
</script>

{#if open}
  <div class="share-encrypt-overlay" role="dialog" aria-modal="true" aria-labelledby="share-encrypt-title">
    <div class="share-encrypt-card">
      <h2 id="share-encrypt-title" class="share-encrypt-title">Encrypt link</h2>
      <label class="share-encrypt-label">
        <span>Password</span>
        <input
          type="password"
          class="share-encrypt-input"
          placeholder="Password"
          bind:value={password}
          onkeydown={(e) => e.key === 'Enter' && onConfirm?.()}
        />
      </label>
      {#if error}
        <p class="share-encrypt-error">{error}</p>
      {/if}
      <div class="share-encrypt-actions">
        <button type="button" class="share-encrypt-btn secondary" onclick={() => onCancel?.()}>Cancel</button>
        <button type="button" class="share-encrypt-btn primary" onclick={() => onConfirm?.()} disabled={loading}>
          {loading ? '…' : 'Copy link'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .share-encrypt-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(4px);
  }
  .share-encrypt-card {
    width: 100%;
    max-width: 380px;
    padding: 24px;
    background: var(--c-bg-elevated);
    border: 1px solid var(--c-border);
    border-radius: 12px;
    box-shadow: var(--c-shadow-lg);
  }
  .share-encrypt-title {
    margin: 0 0 16px 0;
    font-size: 1.2rem;
    font-weight: 600;
    color: var(--c-text);
  }
  .share-encrypt-label {
    display: block;
    margin-bottom: 14px;
  }
  .share-encrypt-label span {
    display: block;
    margin-bottom: 4px;
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--c-text-secondary);
  }
  .share-encrypt-input {
    width: 100%;
    padding: 10px 14px;
    font-size: 1rem;
    border: 1px solid var(--c-border);
    border-radius: 8px;
    background: var(--c-bg-surface);
    color: var(--c-text-input);
    box-sizing: border-box;
  }
  .share-encrypt-input:focus {
    outline: none;
    border-color: var(--c-caret);
    box-shadow: 0 0 0 2px var(--c-focus-ring);
  }
  .share-encrypt-error {
    margin: 0 0 12px 0;
    font-size: 0.875rem;
    color: var(--c-error, #dc2626);
  }
  .share-encrypt-actions {
    display: flex;
    gap: 10px;
    margin-top: 20px;
  }
  .share-encrypt-btn {
    flex: 1;
    padding: 10px 16px;
    font-size: 0.9375rem;
    font-weight: 500;
    border-radius: 8px;
    cursor: pointer;
  }
  .share-encrypt-btn.secondary {
    border: 1px solid var(--c-border);
    background: var(--c-bg-surface);
    color: var(--c-text);
  }
  .share-encrypt-btn.primary {
    border: none;
    background: var(--c-accent);
    color: #fff;
  }
  .share-encrypt-btn.primary:hover:not(:disabled) {
    background: var(--c-accent-hover);
  }
  .share-encrypt-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
</style>
