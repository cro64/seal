/**
 * Normalize a string to a valid hex color (#rrggbb). Accepts 3- or 6-digit hex.
 * Returns '#000000' for invalid input.
 */
export function toHex(str) {
  if (!str || typeof str !== 'string') return '#000000';
  const s = str.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{6}$/.test(s)) return '#' + s.toLowerCase();
  if (/^[0-9a-fA-F]{3}$/.test(s)) return '#' + [s[0], s[0], s[1], s[1], s[2], s[2]].join('').toLowerCase();
  return str.startsWith('#') ? str : '#' + str;
}

/**
 * Parse a string as hex color. Returns normalized #rrggbb or null if invalid.
 */
export function parseHex(str) {
  if (!str || typeof str !== 'string') return null;
  const s = str.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{6}$/.test(s)) return '#' + s.toLowerCase();
  if (/^[0-9a-fA-F]{3}$/.test(s)) return '#' + [s[0], s[0], s[1], s[1], s[2], s[2]].join('').toLowerCase();
  return null;
}
