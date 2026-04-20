export const COLOR_FIELDS = [
  { key: 'backgroundColor', label: 'Background' },
  { key: 'textColor',       label: 'Text' },
  { key: 'headingColor',    label: 'Headings' },
  { key: 'linkColor',       label: 'Links' },
  { key: 'codeBg',          label: 'Code' },
  { key: 'codeColor',       label: 'Code text' },
  { key: 'borderColor',     label: 'Borders' },
  { key: 'blockquoteColor', label: 'Blockquote' },
  { key: 'tableHeaderBg',   label: 'Table header' },
];

export const DESIGN_SWATCHES = {
  backgroundColor: [
    '#ffffff', '#fafafa', '#f4f4f5', '#fefce8', '#f0fdf4', '#f5f3ff', '#fef2f2', '#ecfeff',
    '#18181b', '#27272a', '#1e293b', '#0f172a', '#1c1917', '#1e1b4b', '#134e4a', '#422006',
  ],
  textColor: [
    '#09090b', '#27272a', '#3f3f46', '#52525b', '#1e293b', '#334155', '#1f2937', '#374151',
    '#fafafa', '#f4f4f5', '#e4e4e7', '#d4d4d8', '#a1a1aa', '#71717a',
  ],
  headingColor: [
    '#09090b', '#18181b', '#1e293b', '#0f172a', '#1c1917', '#422006', '#4c1d95', '#134e4a',
    '#2563eb', '#7c3aed', '#0d9488', '#ca8a04', '#dc2626', '#ea580c',
    '#fafafa', '#e4e4e7', '#94a3b8', '#a5b4fc',
  ],
  linkColor: [
    '#2563eb', '#1d4ed8', '#3b82f6', '#0ea5e9', '#06b6d4', '#0891b2',
    '#7c3aed', '#6d28d9', '#a855f7', '#c026d3', '#db2777',
    '#059669', '#0d9488', '#16a34a', '#ca8a04', '#ea580c', '#dc2626',
  ],
  codeBg: [
    '#f4f4f5', '#f1f5f9', '#e2e8f0', '#fef9c3', '#e0e7ff', '#fce7f3', '#ecfeff',
    '#27272a', '#1e293b', '#312e81', '#134e4a', '#422006', '#450a0a',
  ],
  codeColor: [
    '#09090b', '#1f2328', '#242424', '#374151', '#52525b', '#64748b',
    '#fafafa', '#e4e4e7', '#d4d4d8', '#a1a1aa',
  ],
  borderColor: [
    '#e4e4e7', '#d4d4d8', '#a1a1aa', '#71717a', '#52525b', '#3f3f46',
    '#cbd5e1', '#94a3b8', '#64748b', '#475569',
    '#1e293b', '#27272a', '#18181b', '#0f172a',
  ],
  blockquoteColor: [
    '#59636e', '#555555', '#6b6b6b', '#5f6368', '#4a4a4a', '#333333',
    '#71717a', '#52525b', '#64748b', '#475569',
    '#1e293b', '#27272a', '#0f172a',
  ],
  tableHeaderBg: [
    '#f6f8fa', '#f4f4f5', '#f1f5f9', '#e2e8f0', '#f0fdf4', '#eef2ff',
    '#27272a', '#3b4252', '#313244', '#44475a', '#343f44', '#24283b',
  ],
};

export const EFFECTIVE_STYLE_DEFAULTS = {
  lineHeight: '1.5',
  linkUnderline: 'underline',
  letterSpacing: '0',
  strongWeight: '700',
  headingUnderline: 'hide',
  listStyleUl: 'disc',
  listStyleOl: 'decimal',
  blockquoteItalic: 'yes',
  paragraphSpacing: 'normal',
};

export function getEffectiveStyleValue(presetId, field) {
  return EFFECTIVE_STYLE_DEFAULTS[field] ?? '';
}

export const DEFAULT_OVERRIDES = {
  fontFamily: '',
  fontSize: '',
  lineHeight: '',
  linkUnderline: '',
  letterSpacing: '',
  strongWeight: '',
  headingUnderline: '',
  listStyleUl: '',
  listStyleOl: '',
  blockquoteItalic: '',
  paragraphSpacing: '',
  textColor: '',
  linkColor: '',
  backgroundColor: '',
  headingColor: '',
  codeBg: '',
  codeColor: '',
  borderColor: '',
  blockquoteColor: '',
  tableHeaderBg: '',
};

const STORAGE_KEY = 'styled-named-themes';
const OLD_STORAGE_KEY = 'md-email-named-themes';

export function getSavedThemes() {
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw && localStorage.getItem(OLD_STORAGE_KEY)) {
      raw = localStorage.getItem(OLD_STORAGE_KEY);
      localStorage.setItem(STORAGE_KEY, raw);
    }
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveTheme(name, config) {
  const themes = getSavedThemes();
  themes[name] = config;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(themes));
}

export function deleteSavedTheme(name) {
  const themes = getSavedThemes();
  delete themes[name];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(themes));
}
