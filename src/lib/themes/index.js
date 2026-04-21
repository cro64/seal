import * as legacy from '../themeConfig.js';
import github from './github.js';

const presetLoaders = {
  medium:      () => import('./medium.js'),
  academic:    () => import('./academic.js'),
  dark:        () => import('./dark.js'),
  newsletter:  () => import('./newsletter.js'),
  plain:       () => import('./plain.js'),
  notion:      () => import('./notion.js'),
  designdoc:   () => import('./designdoc.js'),
  writer:      () => import('./writer.js'),
  catppuccin:  () => import('./catppuccin.js'),
  dracula:     () => import('./dracula.js'),
  nord:        () => import('./nord.js'),
  rosepine:    () => import('./rosepine.js'),
  everforest:  () => import('./everforest.js'),
  tokyonight:  () => import('./tokyonight.js'),
  solarized:   () => import('./solarized.js'),
};

const presetLabels = {
  github:     'GitHub',
  medium:     'Medium',
  academic:   'Academic',
  dark:       'Dark',
  newsletter: 'Newsletter',
  plain:      'Plain',
  notion:     'Notion',
  designdoc:  'Design Doc',
  writer:     'Writer',
  catppuccin: 'Catppuccin',
  dracula:    'Dracula',
  nord:       'Nord',
  rosepine:   'Rosé Pine',
  everforest: 'Everforest',
  tokyonight: 'Tokyo Night',
  solarized:  'Solarized',
};

const presetCache = { github };

export const PRESET_IDS = ['github', ...Object.keys(presetLoaders)];

export async function loadPreset(id) {
  if (presetCache[id]) return presetCache[id];
  if (!presetLoaders[id]) return github;
  const mod = await presetLoaders[id]();
  presetCache[id] = mod.default;
  return presetCache[id];
}

export function getPresetCss(id) {
  return presetCache[id]?.css ?? github.css;
}

export function getPresetLabel(id) {
  return presetLabels[id] ?? id;
}

export function getPresetColors(id) {
  return presetCache[id]?.colors ?? github.colors;
}

export function themeConfigToCss(config) {
  const base = getPresetCss(config?.preset || 'github');
  const o = config?.overrides || {};
  const rules = [];
  if (o.fontFamily) rules.push(`font-family: ${o.fontFamily};`);
  if (o.fontSize) rules.push(`font-size: ${o.fontSize};`);
  if (o.lineHeight) rules.push(`line-height: ${o.lineHeight};`);
  if (o.letterSpacing) rules.push(`letter-spacing: ${o.letterSpacing};`);
  if (o.backgroundColor) rules.push(`background: ${o.backgroundColor};`);
  if (o.textColor) rules.push(`color: ${o.textColor};`);
  const hasOverrides = rules.length > 0 || o.linkColor || o.linkUnderline || o.headingColor || o.codeBg || o.codeColor || o.borderColor || o.blockquoteColor || o.tableHeaderBg || o.strongWeight || o.headingUnderline || o.listStyleUl || o.listStyleOl || o.blockquoteItalic || o.paragraphSpacing;
  if (!hasOverrides) return base;
  let css = base;
  if (rules.length) css += `\n.md-preview { ${rules.join(' ')} }`;
  if (o.linkColor) css += `\n.md-preview a { color: ${o.linkColor}; }`;
  if (o.linkUnderline === 'underline') css += `\n.md-preview a { text-decoration: underline; }`;
  else if (o.linkUnderline === 'none') css += `\n.md-preview a { text-decoration: none; }`;
  if (o.headingColor) css += `\n.md-preview h1, .md-preview h2, .md-preview h3, .md-preview h4, .md-preview h5, .md-preview h6 { color: ${o.headingColor}; }`;
  if (o.strongWeight) css += `\n.md-preview strong { font-weight: ${o.strongWeight}; }`;
  if (o.headingUnderline === 'hide') css += `\n.md-preview h1, .md-preview h2 { border-bottom: none; padding-bottom: 0; }`;
  else if (o.headingUnderline === 'show') css += `\n.md-preview h1, .md-preview h2 { border-bottom: 1px solid ${o.borderColor || 'currentColor'}; padding-bottom: .3em; }`;
  if (o.paragraphSpacing === 'compact') css += `\n.md-preview p { margin-bottom: 0.5em; }`;
  else if (o.paragraphSpacing === 'normal') css += `\n.md-preview p { margin-bottom: 1em; }`;
  else if (o.paragraphSpacing === 'loose') css += `\n.md-preview p { margin-bottom: 1.5em; }`;
  if (o.listStyleUl) css += `\n.md-preview ul { list-style-type: ${o.listStyleUl}; }`;
  if (o.listStyleOl) css += `\n.md-preview ol { list-style-type: ${o.listStyleOl}; }`;
  if (o.blockquoteItalic === 'yes') css += `\n.md-preview blockquote { font-style: italic; }`;
  else if (o.blockquoteItalic === 'no') css += `\n.md-preview blockquote { font-style: normal; }`;
  if (o.codeBg) css += `\n.md-preview code { background: ${o.codeBg}; } .md-preview pre { background: ${o.codeBg}; }`;
  if (o.codeColor) css += `\n.md-preview code, .md-preview pre { color: ${o.codeColor}; }`;
  if (o.borderColor) css += `\n.md-preview table th, .md-preview table td { border-color: ${o.borderColor}; } .md-preview blockquote { border-left-color: ${o.borderColor}; } .md-preview hr { background: ${o.borderColor}; }`;
  if (o.blockquoteColor) css += `\n.md-preview blockquote { color: ${o.blockquoteColor}; border-left-color: ${o.blockquoteColor}; }`;
  if (o.tableHeaderBg) css += `\n.md-preview table th { background-color: ${o.tableHeaderBg}; }`;
  if (config?.customCss?.trim()) css += '\n' + config.customCss.trim();
  return css;
}

export const COLOR_FIELDS = legacy.COLOR_FIELDS;
export const DESIGN_SWATCHES = legacy.DESIGN_SWATCHES;
export const EFFECTIVE_STYLE_DEFAULTS = legacy.EFFECTIVE_STYLE_DEFAULTS;
export const DEFAULT_OVERRIDES = legacy.DEFAULT_OVERRIDES;
export const getEffectiveStyleValue = legacy.getEffectiveStyleValue;
export const getSavedThemes = legacy.getSavedThemes;
export const saveTheme = legacy.saveTheme;
export const deleteSavedTheme = legacy.deleteSavedTheme;
