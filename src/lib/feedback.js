const _timers = new Map();

/**
 * Set a feedback message (e.g. "Copied!") and clear it after a delay.
 * @param {(value: string) => void} setter - State setter
 * @param {string} message - Message to show
 * @param {number} [ms=2000] - Milliseconds before clearing
 * @param {string} [key] - Optional stable key to prevent timer stacking on rapid calls
 */
export function showFeedback(setter, message, ms = 2000, key) {
  if (key !== undefined) clearTimeout(_timers.get(key));
  setter(message);
  const id = setTimeout(() => {
    setter('');
    if (key !== undefined) _timers.delete(key);
  }, ms);
  if (key !== undefined) _timers.set(key, id);
}
