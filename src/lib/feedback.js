/**
 * Set a feedback message (e.g. "Copied!") and clear it after a delay.
 * @param {(value: string) => void} setter - State setter (e.g. (v) => copyFeedback = v)
 * @param {string} message - Message to show
 * @param {number} [ms=2000] - Milliseconds before clearing
 */
export function showFeedback(setter, message, ms = 2000) {
  setter(message);
  setTimeout(() => setter(''), ms);
}
