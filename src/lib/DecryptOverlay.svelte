<script>
  let { password = $bindable(''), error = '', onDecrypt } = $props();
</script>

<div class="decrypt-overlay">
  <div class="decrypt-card">
    <h2 class="decrypt-title">Password</h2>
    <input
      type="password"
      class="decrypt-input"
      placeholder="Password"
      bind:value={password}
      onkeydown={(e) => e.key === 'Enter' && onDecrypt?.()}
    />
    {#if error}
      <p class="decrypt-error">{error}</p>
    {/if}
    <button type="button" class="decrypt-btn" onclick={() => onDecrypt?.()}>Decrypt</button>
  </div>
</div>

<style>
  .decrypt-overlay {
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
  .decrypt-card {
    width: 100%;
    max-width: 360px;
    padding: 28px;
    background: var(--c-bg-elevated);
    border: 1px solid var(--c-border);
    border-radius: 12px;
    box-shadow: var(--c-shadow-lg);
  }
  .decrypt-title {
    margin: 0 0 16px 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--c-text);
  }
  .decrypt-input {
    width: 100%;
    padding: 10px 14px;
    margin-bottom: 12px;
    font-size: 1rem;
    border: 1px solid var(--c-border);
    border-radius: 8px;
    background: var(--c-bg-surface);
    color: var(--c-text-input);
    box-sizing: border-box;
  }
  .decrypt-input:focus {
    outline: none;
    border-color: var(--c-caret);
    box-shadow: 0 0 0 2px var(--c-focus-ring);
  }
  .decrypt-error {
    margin: 0 0 12px 0;
    font-size: 0.875rem;
    color: var(--c-error, #dc2626);
  }
  .decrypt-btn {
    width: 100%;
    padding: 10px 16px;
    font-size: 0.9375rem;
    font-weight: 500;
    border: none;
    border-radius: 8px;
    background: var(--c-accent);
    color: #fff;
    cursor: pointer;
  }
  .decrypt-btn:hover {
    background: var(--c-accent-hover);
  }
</style>
