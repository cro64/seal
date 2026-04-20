<script>
  import { getPresetColors, getEffectiveStyleValue, COLOR_FIELDS, DESIGN_SWATCHES, saveTheme } from './themes';
  import { toHex, parseHex } from './color.js';

  let { config, savedThemes = {}, visible = true, onClose, onSaveName, onConfigChange } = $props();

  let fontFamily = $state('');
  let fontSize = $state('');
  let lineHeight = $state('');
  let linkUnderline = $state('');
  let letterSpacing = $state('');
  let strongWeight = $state('');
  let headingUnderline = $state('');
  let listStyleUl = $state('');
  let listStyleOl = $state('');
  let blockquoteItalic = $state('');
  let paragraphSpacing = $state('');
  let textColor = $state('');
  let linkColor = $state('');
  let backgroundColor = $state('');
  let headingColor = $state('');
  let codeBg = $state('');
  let codeColor = $state('');
  let borderColor = $state('');
  let blockquoteColor = $state('');
  let tableHeaderBg = $state('');
  let customCss = $state('');
  let customCssOpen = $state(false);

  $effect(() => {
    const o = config?.overrides;
    fontFamily = o?.fontFamily ?? '';
    fontSize = o?.fontSize ?? '';
    lineHeight = o?.lineHeight ?? '';
    linkUnderline = o?.linkUnderline ?? '';
    letterSpacing = o?.letterSpacing ?? '';
    strongWeight = o?.strongWeight ?? '';
    headingUnderline = o?.headingUnderline ?? '';
    listStyleUl = o?.listStyleUl ?? '';
    listStyleOl = o?.listStyleOl ?? '';
    blockquoteItalic = o?.blockquoteItalic ?? '';
    paragraphSpacing = o?.paragraphSpacing ?? '';
    textColor = o?.textColor ?? '';
    linkColor = o?.linkColor ?? '';
    backgroundColor = o?.backgroundColor ?? '';
    headingColor = o?.headingColor ?? '';
    codeBg = o?.codeBg ?? '';
    codeColor = o?.codeColor ?? '';
    borderColor = o?.borderColor ?? '';
    blockquoteColor = o?.blockquoteColor ?? '';
    tableHeaderBg = o?.tableHeaderBg ?? '';
    customCss = config?.customCss ?? '';
  });

  let openPopover = $state(null);
  let fontPopoverOpen = $state(false);
  let stylePopoverOpen = $state(false);
  let saveName = $state('');
  let showSavePrompt = $state(false);
  let customPickerField = $state(null);
  let hexInputValue = $state('');

  const overrides = $derived({
    fontFamily: fontFamily || undefined,
    fontSize: fontSize || undefined,
    lineHeight: lineHeight || undefined,
    linkUnderline: linkUnderline || undefined,
    letterSpacing: letterSpacing || undefined,
    strongWeight: strongWeight || undefined,
    headingUnderline: headingUnderline || undefined,
    listStyleUl: listStyleUl || undefined,
    listStyleOl: listStyleOl || undefined,
    blockquoteItalic: blockquoteItalic || undefined,
    paragraphSpacing: paragraphSpacing || undefined,
    textColor: textColor || undefined,
    linkColor: linkColor || undefined,
    backgroundColor: backgroundColor || undefined,
    headingColor: headingColor || undefined,
    codeBg: codeBg || undefined,
    codeColor: codeColor || undefined,
    borderColor: borderColor || undefined,
    blockquoteColor: blockquoteColor || undefined,
    tableHeaderBg: tableHeaderBg || undefined,
  });

  const currentConfig = $derived({
    preset: config?.preset ?? 'github',
    overrides: Object.values(overrides).some(Boolean) ? overrides : {},
    customCss: customCss.trim() || undefined,
  });

  const presetDefaults = $derived(getPresetColors(config?.preset ?? 'github'));

  function getFieldValue(key) {
    const map = { backgroundColor, textColor, headingColor, linkColor, codeBg, codeColor, borderColor, blockquoteColor, tableHeaderBg };
    return map[key] || '';
  }

  function setField(key, val) {
    if (key === 'backgroundColor') backgroundColor = val;
    else if (key === 'textColor') textColor = val;
    else if (key === 'headingColor') headingColor = val;
    else if (key === 'linkColor') linkColor = val;
    else if (key === 'codeBg') codeBg = val;
    else if (key === 'codeColor') codeColor = val;
    else if (key === 'borderColor') borderColor = val;
    else if (key === 'blockquoteColor') blockquoteColor = val;
    else if (key === 'tableHeaderBg') tableHeaderBg = val;
    notifyParent();
  }

  function displayColor(key) {
    return getFieldValue(key) || presetDefaults[key] || '#cccccc';
  }

  function notifyParent() {
    requestAnimationFrame(() => { onConfigChange?.(currentConfig); });
  }

  function togglePopover(key) {
    const opening = openPopover !== key;
    openPopover = openPopover === key ? null : key;
    if (opening && openPopover) fontPopoverOpen = false;
  }

  function handleClickOutside(e) {
    if (openPopover && !e.target.closest('.ft-color-wrap')) {
      openPopover = null;
      customPickerField = null;
    }
    if (fontPopoverOpen && !e.target.closest('.ft-font-wrap')) {
      fontPopoverOpen = false;
    }
    if (stylePopoverOpen && !e.target.closest('.ft-style-wrap')) {
      stylePopoverOpen = false;
    }
    if (customCssOpen && !e.target.closest('.ft-customcss-wrap')) {
      customCssOpen = false;
    }
  }

  function openCustomPicker(key) {
    if (customPickerField === key) {
      customPickerField = null;
      return;
    }
    customPickerField = key;
    hexInputValue = toHex(displayColor(key));
  }

  function applyHexInput(key, value) {
    const hex = parseHex(value);
    if (hex) {
      setField(key, hex);
      hexInputValue = hex;
    } else {
      hexInputValue = value;
    }
  }

  function onNativeColorChange(key, e) {
    const v = e.currentTarget.value;
    setField(key, v);
    hexInputValue = toHex(v);
  }

  function pickSwatchColor(key, color) {
    setField(key, color);
    openPopover = null;
    customPickerField = null;
  }

  function confirmSave() {
    const name = saveName.trim();
    if (name) {
      saveTheme(name, currentConfig);
      onSaveName?.(name);
      showSavePrompt = false;
      saveName = '';
    }
  }

  function cancelSave() { showSavePrompt = false; saveName = ''; }

  const FONT_OPTIONS = [
    { label: 'Sans', value: '' },
    { label: 'Serif', value: 'Georgia, Cambria, "Times New Roman", Times, serif' },
    { label: 'Mono', value: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace' },
    { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
    { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
    { label: 'Trebuchet', value: '"Trebuchet MS", Helvetica, sans-serif' },
    { label: 'Palatino', value: '"Palatino Linotype", Palatino, Georgia, serif' },
    { label: 'Courier', value: '"Courier New", Courier, monospace' },
    { label: 'Lucida', value: '"Lucida Grande", "Lucida Sans Unicode", sans-serif' },
    { label: 'Tahoma', value: 'Tahoma, Geneva, sans-serif' },
    { label: 'Garamond', value: 'Garamond, "Hoefler Text", "Times New Roman", serif' },
    { label: 'Lora', value: '"Lora", Georgia, serif' },
    { label: 'Source Serif', value: '"Source Serif 4", Georgia, serif' },
    { label: 'Open Sans', value: '"Open Sans", system-ui, sans-serif' },
    { label: 'Merriweather', value: '"Merriweather", Georgia, serif' },
  ];

  const SIZE_OPTIONS = ['14', '15', '16', '17', '18', '20'];
  const LINE_HEIGHT_OPTIONS = [
    { value: '1.4', label: '1.4' },
    { value: '1.5', label: '1.5' },
    { value: '1.6', label: '1.6' },
    { value: '1.75', label: '1.75' },
    { value: '2', label: '2' },
  ];
  const LETTER_SPACING_OPTIONS = [
    { value: '-0.02em', label: 'Tight' },
    { value: '0', label: 'Normal' },
    { value: '0.02em', label: 'Wide' },
  ];
  const STRONG_WEIGHT_OPTIONS = [
    { value: '600', label: '600' },
    { value: '700', label: '700' },
  ];
  const HEADING_UNDERLINE_OPTIONS = [
    { value: 'show', label: 'Show' },
    { value: 'hide', label: 'Hide' },
  ];
  const LIST_STYLE_UL_OPTIONS = [
    { value: 'disc', label: 'Disc' },
    { value: 'circle', label: 'Circle' },
    { value: 'square', label: 'Square' },
  ];
  const LIST_STYLE_OL_OPTIONS = [
    { value: 'decimal', label: 'Decimal' },
    { value: 'lower-alpha', label: 'a, b, c' },
    { value: 'lower-roman', label: 'i, ii, iii' },
  ];
  const BLOCKQUOTE_ITALIC_OPTIONS = [
    { value: 'yes', label: 'Italic' },
    { value: 'no', label: 'Normal' },
  ];
  const PARAGRAPH_SPACING_OPTIONS = [
    { value: 'compact', label: 'Compact' },
    { value: 'normal', label: 'Normal' },
    { value: 'loose', label: 'Loose' },
  ];

  const presetId = $derived(config?.preset ?? 'github');
  function effectiveStyle(field) {
    return getEffectiveStyleValue(presetId, field);
  }
  function displayValue(overrideVal, field) {
    return overrideVal || effectiveStyle(field);
  }
  function setStyleOverride(field, selectedValue) {
    const effective = effectiveStyle(field);
    const val = selectedValue === effective ? '' : selectedValue;
    if (field === 'lineHeight') lineHeight = val;
    else if (field === 'linkUnderline') linkUnderline = val;
    else if (field === 'letterSpacing') letterSpacing = val;
    else if (field === 'strongWeight') strongWeight = val;
    else if (field === 'headingUnderline') headingUnderline = val;
    else if (field === 'listStyleUl') listStyleUl = val;
    else if (field === 'listStyleOl') listStyleOl = val;
    else if (field === 'blockquoteItalic') blockquoteItalic = val;
    else if (field === 'paragraphSpacing') paragraphSpacing = val;
    notifyParent();
  }

  let dragging = $state(false);
  let dragPos = $state(null);
  let orientation = $state('horizontal');
  let snapSide = $state('none');
  let expanding = $state(false);
  let barEl = $state(null);

  const SNAP_EDGE = 60;
  const SNAP_MARGIN = 12;
  const DRAG_THRESHOLD = 14;

  let dragStart = $state(null);
  let windowListenersBound = false;

  function clearDragStart() {
    if (windowListenersBound) {
      window.removeEventListener('pointermove', onWindowPointerMove);
      window.removeEventListener('pointerup', onWindowPointerUp);
      window.removeEventListener('pointercancel', onWindowPointerUp);
      windowListenersBound = false;
    }
    dragStart = null;
  }

  function onWindowPointerMove(e) {
    if (!dragStart || e.pointerId !== dragStart.pointerId) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    clearDragStart();
    e.preventDefault();
    barEl.setPointerCapture(e.pointerId);
    dragging = true;
    dragPos = {
      left: Math.max(0, Math.min(e.clientX - 24, window.innerWidth - 48)),
      top: Math.max(0, Math.min(e.clientY - 24, window.innerHeight - 48)),
    };
  }

  function onWindowPointerUp(e) {
    if (dragStart && e.pointerId === dragStart.pointerId) clearDragStart();
  }

  function onPointerDown(e) {
    if (window.innerWidth <= 768) return;
    if (expanding) return;
    if (!e.target.closest('.ft-bar')) return;
    if (e.target.closest('.ft-font-popover, .ft-popover')) return;
    dragStart = { x: e.clientX, y: e.clientY, pointerId: e.pointerId };
    if (!windowListenersBound) {
      window.addEventListener('pointermove', onWindowPointerMove, { capture: true });
      window.addEventListener('pointerup', onWindowPointerUp, { capture: true });
      window.addEventListener('pointercancel', onWindowPointerUp, { capture: true });
      windowListenersBound = true;
    }
  }

  function onPointerMove(e) {
    if (!dragging) return;
    dragPos = {
      left: Math.max(0, Math.min(e.clientX - 24, window.innerWidth - 48)),
      top: Math.max(0, Math.min(e.clientY - 24, window.innerHeight - 48)),
    };
  }

  function onPointerUp(e) {
    if (!dragging) return;
    expanding = true;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cx = e.clientX;
    const cy = e.clientY;

    const nearLeft = cx < SNAP_EDGE;
    const nearRight = cx > vw - SNAP_EDGE;

    orientation = (nearLeft || nearRight) ? 'vertical' : 'horizontal';
    snapSide = nearLeft ? 'left' : (nearRight ? 'right' : 'none');

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const rect = barEl.getBoundingClientRect();
        const bw = rect.width;
        const bh = rect.height;

        let sx, sy;
        if (nearLeft) {
          sx = SNAP_MARGIN;
          sy = Math.max(SNAP_MARGIN, Math.min(cy - bh / 2, vh - bh - SNAP_MARGIN));
        } else if (nearRight) {
          sx = vw - bw - SNAP_MARGIN;
          sy = Math.max(SNAP_MARGIN, Math.min(cy - bh / 2, vh - bh - SNAP_MARGIN));
        } else {
          sx = Math.max(SNAP_MARGIN, Math.min(cx - bw / 2, vw - bw - SNAP_MARGIN));
          sy = Math.max(SNAP_MARGIN, Math.min(cy - bh / 2, vh - bh - SNAP_MARGIN));
          if (sy + bh > vh - SNAP_EDGE) sy = vh - bh - SNAP_MARGIN;
        }

        dragPos = { left: sx, top: sy };
        setTimeout(() => { expanding = false; }, 500);
      });
    });
    dragging = false;
  }
</script>

<svelte:window onclick={handleClickOutside} />

<div
  class="ft-bar"
  class:is-dragging={dragging}
  class:is-expanding={expanding}
  class:has-custom-pos={dragPos !== null}
  class:is-vertical={orientation === 'vertical'}
  class:snap-left={snapSide === 'left'}
  class:snap-right={snapSide === 'right'}
  class:is-hidden={!visible}
  role="toolbar"
  aria-label="Theme toolbar"
  tabindex="0"
  style={dragPos ? `left:${dragPos.left}px;top:${dragPos.top}px;` : ''}
  bind:this={barEl}
  onpointerdown={onPointerDown}
  onpointermove={onPointerMove}
  onpointerup={onPointerUp}
>
  <!-- Type: icon + popover (same in horizontal and vertical) -->
  <div class="ft-font-wrap">
    <button
      class="ft-icon-btn ft-font-btn"
      class:is-open={fontPopoverOpen}
      title="Font"
      onclick={(e) => { e.stopPropagation(); openPopover = null; stylePopoverOpen = false; fontPopoverOpen = !fontPopoverOpen; }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="4" x2="20" y2="4"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
    </button>
    {#if fontPopoverOpen}
      <div class="ft-font-popover" role="group">
        <div class="ft-pop-label">Font Family</div>
        <select
          class="ft-font-popover-select"
          value={fontFamily}
          onchange={(e) => { fontFamily = e.currentTarget.value; notifyParent(); }}
        >
          {#each FONT_OPTIONS as opt}
            <option value={opt.value}>{opt.label}</option>
          {/each}
        </select>
        <div class="ft-pop-label">Size</div>
        <select
          class="ft-font-popover-select"
          value={fontSize ? fontSize.replace('px', '') : '16'}
          onchange={(e) => { fontSize = e.currentTarget.value + 'px'; notifyParent(); }}
        >
          {#each SIZE_OPTIONS as s}
            <option value={s}>{s}px</option>
          {/each}
        </select>
        <div class="ft-pop-label">Line height</div>
        <select
          class="ft-font-popover-select"
          value={displayValue(lineHeight, 'lineHeight')}
          onchange={(e) => setStyleOverride('lineHeight', e.currentTarget.value)}
        >
          {#each LINE_HEIGHT_OPTIONS as lh}
            <option value={lh.value}>{lh.label}</option>
          {/each}
        </select>
        <div class="ft-pop-label">Link underline</div>
        <select
          class="ft-font-popover-select"
          value={displayValue(linkUnderline, 'linkUnderline')}
          onchange={(e) => setStyleOverride('linkUnderline', e.currentTarget.value)}
        >
          <option value="none">None</option>
          <option value="underline">Underline</option>
        </select>
      </div>
    {/if}
  </div>

  <!-- Style: typography & layout options -->
  <div class="ft-style-wrap">
    <button
      class="ft-icon-btn ft-font-btn"
      class:is-open={stylePopoverOpen}
      title="Style"
      onclick={(e) => { e.stopPropagation(); openPopover = null; fontPopoverOpen = false; stylePopoverOpen = !stylePopoverOpen; }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>
    </button>
    {#if stylePopoverOpen}
      <div class="ft-font-popover ft-style-popover" role="group">
        <div class="ft-pop-label">Letter spacing</div>
        <select
          class="ft-font-popover-select"
          value={displayValue(letterSpacing, 'letterSpacing')}
          onchange={(e) => setStyleOverride('letterSpacing', e.currentTarget.value)}
        >
          {#each LETTER_SPACING_OPTIONS as opt}
            <option value={opt.value}>{opt.label}</option>
          {/each}
        </select>
        <div class="ft-pop-label">Bold weight</div>
        <select
          class="ft-font-popover-select"
          value={displayValue(strongWeight, 'strongWeight')}
          onchange={(e) => setStyleOverride('strongWeight', e.currentTarget.value)}
        >
          {#each STRONG_WEIGHT_OPTIONS as opt}
            <option value={opt.value}>{opt.label}</option>
          {/each}
        </select>
        <div class="ft-pop-label">Heading underline</div>
        <select
          class="ft-font-popover-select"
          value={displayValue(headingUnderline, 'headingUnderline')}
          onchange={(e) => setStyleOverride('headingUnderline', e.currentTarget.value)}
        >
          {#each HEADING_UNDERLINE_OPTIONS as opt}
            <option value={opt.value}>{opt.label}</option>
          {/each}
        </select>
        <div class="ft-pop-label">List bullets</div>
        <select
          class="ft-font-popover-select"
          value={displayValue(listStyleUl, 'listStyleUl')}
          onchange={(e) => setStyleOverride('listStyleUl', e.currentTarget.value)}
        >
          {#each LIST_STYLE_UL_OPTIONS as opt}
            <option value={opt.value}>{opt.label}</option>
          {/each}
        </select>
        <div class="ft-pop-label">List numbers</div>
        <select
          class="ft-font-popover-select"
          value={displayValue(listStyleOl, 'listStyleOl')}
          onchange={(e) => setStyleOverride('listStyleOl', e.currentTarget.value)}
        >
          {#each LIST_STYLE_OL_OPTIONS as opt}
            <option value={opt.value}>{opt.label}</option>
          {/each}
        </select>
        <div class="ft-pop-label">Blockquote italic</div>
        <select
          class="ft-font-popover-select"
          value={displayValue(blockquoteItalic, 'blockquoteItalic')}
          onchange={(e) => setStyleOverride('blockquoteItalic', e.currentTarget.value)}
        >
          {#each BLOCKQUOTE_ITALIC_OPTIONS as opt}
            <option value={opt.value}>{opt.label}</option>
          {/each}
        </select>
        <div class="ft-pop-label">Paragraph spacing</div>
        <select
          class="ft-font-popover-select"
          value={displayValue(paragraphSpacing, 'paragraphSpacing')}
          onchange={(e) => setStyleOverride('paragraphSpacing', e.currentTarget.value)}
        >
          {#each PARAGRAPH_SPACING_OPTIONS as opt}
            <option value={opt.value}>{opt.label}</option>
          {/each}
        </select>
      </div>
    {/if}
  </div>

  <div class="ft-sep"></div>

  <!-- Color circles -->
  {#each COLOR_FIELDS as field}
    <div class="ft-color-wrap">
      <button
        class="ft-circle"
        class:is-open={openPopover === field.key}
        style="--fill:{displayColor(field.key)}"
        onclick={(e) => { e.stopPropagation(); togglePopover(field.key); }}
        title={field.label}
      ></button>

      {#if openPopover === field.key}
        <div class="ft-popover" role="group">
          <div class="ft-pop-label">{field.label}</div>
          <div class="ft-pop-swatches">
            {#each (DESIGN_SWATCHES[field.key] ?? []) as color}
              <button
                class="ft-swatch"
                style="background:{color}"
                title={color}
                onclick={() => pickSwatchColor(field.key, color)}
              ></button>
            {/each}
            <button
              type="button"
              class="ft-swatch ft-swatch-custom"
              class:is-open={customPickerField === field.key}
              title="Custom color"
              onclick={(e) => { e.stopPropagation(); openCustomPicker(field.key); }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
          </div>
          {#if customPickerField === field.key}
            <div class="ft-custom-picker" role="group" aria-label="Custom color">
              <div class="ft-custom-picker-row">
                <label class="ft-custom-picker-hex">
                  <span class="ft-pop-label">Hex</span>
                  <input
                    type="text"
                    class="ft-custom-hex-input"
                    placeholder="#000000"
                    value={hexInputValue}
                    oninput={(e) => applyHexInput(field.key, e.target.value)}
                    onblur={() => { if (parseHex(hexInputValue)) hexInputValue = toHex(displayColor(field.key)); }}
                  />
                </label>
                <label class="ft-custom-picker-native" title="Pick color">
                  <input
                    type="color"
                    class="ft-native-color-input"
                    value={displayColor(field.key)}
                    oninput={(e) => onNativeColorChange(field.key, e)}
                  />
                  <span class="ft-native-color-preview" style="background: {displayColor(field.key)}"></span>
                </label>
              </div>
            </div>
          {/if}
          {#if getFieldValue(field.key)}
            <button class="ft-pop-reset" onclick={() => setField(field.key, '')}>Reset to preset</button>
          {/if}
        </div>
      {/if}
    </div>
  {/each}

  <div class="ft-sep"></div>

  <!-- Custom CSS -->
  <div class="ft-customcss-wrap">
    <button
      class="ft-icon-btn ft-font-btn"
      class:is-open={customCssOpen}
      title="Custom CSS"
      onclick={(e) => { e.stopPropagation(); openPopover = null; fontPopoverOpen = false; stylePopoverOpen = false; customCssOpen = !customCssOpen; }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
    </button>
    {#if customCssOpen}
      <div class="ft-font-popover ft-customcss-popover" role="group">
        <div class="ft-pop-label">Custom CSS</div>
        <p class="ft-customcss-hint">Appended after theme and overrides. Use .md-preview as scope.</p>
        <textarea
          class="ft-customcss-textarea"
          placeholder={".md-preview pre { border-radius: 8px; }"}
          bind:value={customCss}
          oninput={() => notifyParent()}
          spellcheck="false"
          rows="6"
        ></textarea>
      </div>
    {/if}
  </div>

  <div class="ft-sep"></div>

  <button class="ft-icon-btn" title="Save style" onclick={() => (showSavePrompt = true)}>
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
  </button>

  <button class="ft-icon-btn" title="Close" onclick={onClose}>
    <svg width="14" height="14" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 5l8 8M13 5l-8 8"/></svg>
  </button>
</div>

{#if showSavePrompt}
  <div class="ft-save-overlay">
    <div class="ft-save-dialog">
      <h3>Name this style</h3>
      <input
        type="text"
        placeholder="My custom theme"
        bind:value={saveName}
        onkeydown={(e) => e.key === 'Enter' && confirmSave()}
      />
      <div class="ft-save-actions">
        <button type="button" class="ft-dialog-btn ft-dialog-ghost" onclick={cancelSave}>Cancel</button>
        <button type="button" class="ft-dialog-btn ft-dialog-primary" onclick={confirmSave}>Save</button>
      </div>
    </div>
  </div>
{/if}

<style>
  /* ─── Floating bar ─── */
  .ft-bar {
    position: fixed;
    bottom: 40px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 30;
    display: flex;
    align-items: center;
    gap: 6px;
    height: 48px;
    padding: 0 10px;
    background: var(--c-bg-glass);
    border: 1px solid var(--c-glass-border);
    border-radius: 9999px;
    box-shadow: var(--c-glass-shadow), var(--c-glass-highlight);
    -webkit-backdrop-filter: blur(24px) saturate(1.6);
    backdrop-filter: blur(24px) saturate(1.6);
    font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: 12.5px;
    -webkit-font-smoothing: antialiased;
    white-space: nowrap;
    touch-action: none;
    opacity: 1;
    transition: opacity 0.45s ease, transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .ft-bar.has-custom-pos {
    bottom: auto;
    left: auto;
    transform: none;
    transition:
      left 0.45s cubic-bezier(0.22, 1, 0.36, 1),
      top 0.45s cubic-bezier(0.22, 1, 0.36, 1),
      width 0.4s cubic-bezier(0.22, 1, 0.36, 1),
      height 0.4s cubic-bezier(0.22, 1, 0.36, 1),
      padding 0.4s cubic-bezier(0.22, 1, 0.36, 1),
      border-radius 0.4s cubic-bezier(0.22, 1, 0.36, 1),
      gap 0.4s cubic-bezier(0.22, 1, 0.36, 1);
  }
  /* While dragging: collapsed to a circle */
  .ft-bar.is-dragging {
    width: 48px !important;
    height: 48px !important;
    padding: 0 !important;
    border-radius: 50% !important;
    gap: 0 !important;
    overflow: hidden;
    transition:
      width 0.3s cubic-bezier(0.22, 1, 0.36, 1),
      height 0.3s cubic-bezier(0.22, 1, 0.36, 1),
      padding 0.3s cubic-bezier(0.22, 1, 0.36, 1),
      border-radius 0.3s cubic-bezier(0.22, 1, 0.36, 1),
      gap 0.3s cubic-bezier(0.22, 1, 0.36, 1) !important;
  }
  .ft-bar.is-dragging > * {
    opacity: 0;
    transform: scale(0);
    transition: opacity 0.2s ease, transform 0.2s cubic-bezier(0.55, 0, 1, 0.45);
  }
  /* Expanding from circle to final shape */
  .ft-bar.is-expanding > * {
    opacity: 1;
    transform: scale(1);
    transition: opacity 0.35s ease 0.12s, transform 0.4s cubic-bezier(0.22, 1, 0.36, 1) 0.12s;
  }
  .ft-bar.is-hidden {
    opacity: 0;
    pointer-events: none;
    transform: translateX(-50%) scale(0.92);
    transition: opacity 0.45s ease, transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .ft-bar.has-custom-pos.is-hidden {
    transform: scale(0.92);
  }
  @media (min-width: 769px) {
    .ft-bar { cursor: grab; }
    .ft-bar.is-dragging { cursor: grabbing; }
  }

  /* ─── Vertical orientation ─── */
  .ft-bar.is-vertical {
    flex-direction: column;
    height: auto;
    width: 48px;
    padding: 10px 0;
    border-radius: 24px;
    white-space: normal;
  }
  .ft-font-wrap { position: relative; }
  .ft-style-wrap { position: relative; }
  .ft-font-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: var(--c-text-secondary);
    cursor: pointer;
    padding: 0;
    transition: background-color 0.15s, color 0.15s;
  }
  .ft-font-btn:hover, .ft-font-btn.is-open {
    background: rgba(128,128,128,0.2);
    color: var(--c-text);
  }
  .ft-font-popover {
    position: absolute;
    background: var(--c-bg-glass);
    border: 1px solid var(--c-glass-border);
    border-radius: 12px;
    padding: 10px 12px;
    box-shadow: var(--c-glass-shadow), var(--c-glass-highlight);
    -webkit-backdrop-filter: blur(24px) saturate(1.6);
    backdrop-filter: blur(24px) saturate(1.6);
    z-index: 40;
    min-width: 140px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  /* Horizontal: popover above the type icon */
  .ft-bar:not(.is-vertical) .ft-font-popover {
    bottom: calc(100% + 12px);
    left: 50%;
    transform: translateX(-50%);
  }
  /* Vertical: popover to the side of the bar */
  .ft-bar.is-vertical .ft-font-popover {
    bottom: auto;
    top: 50%;
    left: calc(100% + 12px);
    transform: translateY(-50%);
  }
  .ft-bar.snap-right .ft-font-popover { left: auto; right: calc(100% + 12px); }
  .ft-style-popover { min-width: 160px; }
  .ft-customcss-popover { min-width: 240px; max-width: 320px; }
  .ft-customcss-hint {
    font-size: 11px;
    color: var(--c-text-dimmed);
    margin: 0 0 8px 0;
    line-height: 1.35;
  }
  .ft-customcss-textarea {
    width: 100%;
    min-height: 100px;
    padding: 8px 10px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 12px;
    line-height: 1.4;
    border: 1px solid var(--c-border);
    border-radius: 6px;
    background: var(--c-bg-surface);
    color: var(--c-text-input);
    resize: vertical;
    box-sizing: border-box;
  }
  .ft-customcss-textarea:focus {
    outline: none;
    border-color: var(--c-caret);
    box-shadow: 0 0 0 2px var(--c-focus-ring);
  }
  .ft-font-popover-select {
    width: 100%;
    height: 30px;
    border: 1px solid var(--c-border);
    border-radius: 6px;
    background: var(--c-bg-surface);
    color: var(--c-text);
    font-size: 12px;
    font-family: inherit;
    padding: 0 8px;
    cursor: pointer;
    appearance: none;
  }
  .ft-font-popover-select:focus {
    outline: none;
    border-color: var(--c-caret);
    box-shadow: 0 0 0 2px var(--c-focus-ring);
  }
  .ft-bar.is-vertical .ft-sep {
    width: 22px;
    height: 1px;
    margin: 4px 0;
  }
  .ft-bar.is-vertical .ft-circle {
    width: 26px;
    height: 26px;
  }
  .ft-bar.is-vertical .ft-popover {
    bottom: auto;
    top: 50%;
    transform: translateY(-50%);
  }
  .ft-bar.snap-left .ft-popover {
    left: calc(100% + 12px);
    right: auto;
  }
  .ft-bar.snap-right .ft-popover {
    right: calc(100% + 12px);
    left: auto;
  }
  .ft-bar.is-vertical .ft-popover::after {
    display: none;
  }

  /* ─── Separator ─── */
  .ft-sep {
    width: 1px;
    height: 22px;
    background: var(--c-border);
    margin: 0 4px;
    flex-shrink: 0;
    transition: width 0.3s cubic-bezier(0.22,1,0.36,1), height 0.3s cubic-bezier(0.22,1,0.36,1), margin 0.3s cubic-bezier(0.22,1,0.36,1);
  }

  /* ─── Color circle ─── */
  .ft-color-wrap {
    position: relative;
  }
  .ft-circle {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 2px solid var(--c-border);
    background: var(--fill);
    cursor: pointer;
    transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s, width 0.3s cubic-bezier(0.22,1,0.36,1), height 0.3s cubic-bezier(0.22,1,0.36,1);
    padding: 0;
    flex-shrink: 0;
  }
  .ft-circle:hover {
    transform: scale(1.12);
    border-color: var(--c-border-hover);
    box-shadow: 0 0 0 3px var(--c-focus-ring);
  }
  .ft-circle.is-open {
    border-color: var(--c-caret);
    box-shadow: 0 0 0 3px var(--c-focus-ring);
  }

  /* ─── Popover ─── */
  .ft-popover {
    position: absolute;
    bottom: calc(100% + 12px);
    left: 50%;
    transform: translateX(-50%);
    background: var(--c-bg-glass);
    border: 1px solid var(--c-glass-border);
    border-radius: 12px;
    padding: 10px 12px;
    box-shadow: var(--c-glass-shadow), var(--c-glass-highlight);
    -webkit-backdrop-filter: blur(24px) saturate(1.6);
    backdrop-filter: blur(24px) saturate(1.6);
    z-index: 40;
    min-width: 200px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    transition: background-color 0.2s, border-color 0.2s;
  }
  .ft-popover::after {
    content: '';
    position: absolute;
    bottom: -6px;
    left: 50%;
    transform: translateX(-50%) rotate(45deg);
    width: 10px;
    height: 10px;
    background: var(--c-bg-glass);
    border-right: 1px solid var(--c-glass-border);
    border-bottom: 1px solid var(--c-glass-border);
  }
  .ft-pop-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--c-text);
  }
  .ft-pop-swatches {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  .ft-swatch {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 2px solid var(--c-border);
    cursor: pointer;
    padding: 0;
    transition: transform 0.12s, border-color 0.12s;
    flex-shrink: 0;
  }
  .ft-swatch:hover {
    transform: scale(1.15);
    border-color: var(--c-text-muted);
  }
  .ft-swatch-custom {
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--c-bg-glass);
    border-color: var(--c-glass-border);
    color: var(--c-text-secondary);
  }
  .ft-swatch-custom:hover,
  .ft-swatch-custom.is-open {
    background: rgba(128,128,128,0.25);
    color: var(--c-text);
    border-color: var(--c-border-hover);
  }

  /* ─── Custom color picker (hex + native) ─── */
  .ft-custom-picker {
    margin-top: 6px;
    padding: 10px 12px;
    background: var(--c-bg-glass);
    border: 1px solid var(--c-glass-border);
    border-radius: 10px;
    -webkit-backdrop-filter: blur(24px) saturate(1.6);
    backdrop-filter: blur(24px) saturate(1.6);
    box-shadow: var(--c-glass-shadow), var(--c-glass-highlight);
  }
  .ft-custom-picker-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .ft-custom-picker-hex {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }
  .ft-custom-hex-input {
    width: 100%;
    height: 32px;
    padding: 0 10px;
    border: 1px solid var(--c-border);
    border-radius: 8px;
    background: var(--c-bg-surface);
    color: var(--c-text);
    font-size: 12px;
    font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
    letter-spacing: 0.02em;
  }
  .ft-custom-hex-input::placeholder {
    color: var(--c-text-muted);
  }
  .ft-custom-hex-input:focus {
    outline: none;
    border-color: var(--c-caret);
    box-shadow: 0 0 0 2px var(--c-focus-ring);
  }
  .ft-custom-picker-native {
    flex-shrink: 0;
    position: relative;
    display: block;
    width: 36px;
    height: 36px;
    border-radius: 8px;
    overflow: hidden;
    border: 2px solid var(--c-border);
    cursor: pointer;
    background: var(--c-bg-surface);
  }
  .ft-custom-picker-native:hover {
    border-color: var(--c-border-hover);
  }
  .ft-native-color-input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
    border: none;
    padding: 0;
  }
  .ft-native-color-preview {
    position: absolute;
    inset: 0;
    display: block;
    border-radius: 6px;
    pointer-events: none;
  }
  .ft-pop-reset {
    border: none;
    background: none;
    color: var(--c-text-secondary);
    font-size: 11px;
    font-family: inherit;
    cursor: pointer;
    padding: 2px 0 0;
    text-align: left;
    transition: color 0.15s;
  }
  .ft-pop-reset:hover { color: var(--c-destructive); }

  /* ─── Icon buttons in bar ─── */
  .ft-icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: var(--c-text-secondary);
    cursor: pointer;
    transition: background-color 0.15s, color 0.15s;
    flex-shrink: 0;
    padding: 0;
  }
  .ft-icon-btn:hover {
    background: rgba(128,128,128,0.2);
    color: var(--c-text);
  }

  /* ─── Save dialog ─── */
  .ft-save-overlay {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--c-backdrop);
    backdrop-filter: blur(4px);
    padding: 16px;
  }
  .ft-save-dialog {
    background: var(--c-bg);
    color: var(--c-text);
    border: 1px solid var(--c-border);
    border-radius: 12px;
    padding: 28px;
    width: 100%;
    max-width: 360px;
    box-shadow: var(--c-shadow-lg);
  }
  .ft-save-dialog h3 {
    margin: 0 0 12px;
    font-size: 15px;
    font-weight: 600;
  }
  .ft-save-dialog input {
    width: 100%;
    padding: 10px 14px;
    border: 1px solid var(--c-border);
    border-radius: 6px;
    font-size: 13px;
    margin-bottom: 16px;
    font-family: inherit;
    background: var(--c-bg-surface);
    color: var(--c-text-input);
  }
  .ft-save-dialog input:focus {
    outline: none;
    border-color: var(--c-caret);
    box-shadow: 0 0 0 2px var(--c-focus-ring);
  }
  .ft-save-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }
  .ft-dialog-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 8px 16px;
    border-radius: 6px;
    height: 36px;
    font-size: 12.5px;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.15s;
    border: 1px solid transparent;
  }
  .ft-dialog-primary {
    background: var(--c-accent);
    color: #fff;
    border-color: var(--c-accent);
  }
  .ft-dialog-primary:hover { background: var(--c-accent-hover); }
  .ft-dialog-ghost {
    background: transparent;
    color: var(--c-text-secondary);
    border-color: var(--c-border);
  }
  .ft-dialog-ghost:hover { background: var(--c-bg-surface); }

  /* ─── Mobile ─── */
  @media (max-width: 768px) {
    .ft-bar {
      bottom: 24px;
      height: 44px;
      padding: 0 8px;
      gap: 4px;
    }
    .ft-circle { width: 24px; height: 24px; }
    .ft-sep { height: 18px; }
    .ft-icon-btn { width: 26px; height: 26px; }
  }
</style>
