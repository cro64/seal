export const MODES = { INTERACTIVE: 'interactive', SOURCE: 'source', VIEW: 'view' };
export const MODE_TO_HASH = { interactive: 'i', source: 's', view: 'v' };
export const MODE_FROM_HASH = { i: 'interactive', s: 'source', v: 'view' };
export const DEFAULT_MODE = 'interactive';

export function modeFromHash(m) {
  if (!m) return DEFAULT_MODE;
  return MODE_FROM_HASH[m] ?? DEFAULT_MODE;
}

export function modeToHash(mode) {
  if (mode === DEFAULT_MODE) return '';
  return MODE_TO_HASH[mode] ?? '';
}
