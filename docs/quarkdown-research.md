# Quarkdown integration research

**Project:** [iamgio/quarkdown](https://github.com/iamgio/quarkdown) — “Markdown with superpowers”  
**Our app:** Svelte + Vite markdown editor/preview (CommonMark/GFM via `marked`, themes, copy HTML, share URL).

---

## Can we integrate with Quarkdown?

**Short answer: not as a drop-in in-browser parser.** We can only integrate indirectly (use Quarkdown as an external tool and consume its output).

### Why direct integration isn’t possible

| Aspect | Quarkdown | Our app |
|--------|-----------|--------|
| **Runtime** | JVM (Kotlin/Java). CLI only: `quarkdown c file.qd` | Browser (Svelte + Vite) |
| **Input** | `.qd` (Quarkdown flavor: functions, variables, custom syntax) | Standard `.md` (CommonMark/GFM) |
| **API** | No npm package, no JS/WASM engine, no browser API | Needs in-browser parsing for live edit/preview |

Quarkdown is a **compiler**, not a library. There is no JavaScript or WebAssembly build; the only way to “run” it is the CLI (Java 17+). So we cannot “parse Quarkdown in the browser” with their stack.

### What *is* possible (indirect integration)

1. **Pre-compile and display**
   - Run `quarkdown c doc.qd` (or `quarkdown c doc.qd --pipe`) in CI, a local script, or a backend.
   - Serve the generated HTML (and assets) and show it in our app (e.g. iframe or fetched HTML in a viewer).
   - **Use case:** “Export from Quarkdown” or “View this Quarkdown document” inside our UI, without editing `.qd` in-app.

2. **Pipeline / export**
   - Use `--pipe` to get HTML on stdout and pipe it into another tool (e.g. our build or a server that serves it).
   - Still no in-browser parsing; integration is at build/server/CLI level.

So: **we can integrate with Quarkdown only by running it outside the browser and consuming its output** (e.g. “open Quarkdown output” or “export to PDF via Quarkdown”), not by replacing or augmenting our current in-browser markdown parser.

---

## If we integrate (pre-compile / pipeline), what do we gain?

- **Richer output from Quarkdown**
  - Documents using: functions, variables, TOC, numbering, cross-refs, footnotes, figures, custom blocks, multi-file includes.
  - Multiple doctypes: plain, paged (PDF-like), slides, docs (wiki-style).
- **Themes and layout**
  - Color + layout themes (e.g. `paperwhite + latex`, `darko + minimal`).
  - We could offer “view this in Quarkdown” and show their rendered HTML/PDF.
- **PDF export**
  - They support `--pdf` (with Node/Puppeteer). We could trigger a backend/CLI that runs Quarkdown and returns PDF for download.
- **Single source for many targets**
  - One `.qd` → HTML (plain/paged/slides/docs) and PDF. We could surface “Export as PDF” or “Export as slides” that delegate to Quarkdown.

So benefits are: **better export and viewing of Quarkdown-authored content**, not “run Quarkdown in our editor.”

---

## If we don’t integrate: what can we learn from Quarkdown?

These are ideas we can implement in our own stack (Svelte + `marked` + themes) without running Quarkdown.

### 1. Document type / layout mode

- **Quarkdown:** `.doctype {plain|paged|slides|docs}` — one source, different layouts (continuous, paged, slides, wiki).
- **Us:** We have theme presets (github, etc.) but not “document type.” We could add a **layout mode** (e.g. “Article” vs “Slides” vs “Doc”) that switches CSS and maybe structure (e.g. slide breaks, TOC placement).

### 2. Separate color theme vs layout theme

- **Quarkdown:** e.g. `.theme {paperwhite} layout:{latex}` — color and layout are separate.
- **Us:** Presets mix both. We could **split**: one selector for “color theme” (github, dark, etc.) and one for “layout” (compact, document, presentation), and combine them.

### 3. Image dimensions

- **Quarkdown:** `!(50%)[alt](url)` or `!(6cm 2cm)[alt](url)`.
- **Us:** Standard Markdown only. We could add a **marked extension** (or a simple pre/post regex) to support image size (e.g. `![alt](url){width=50%}` or a custom syntax) and render with `width`/`height` or a wrapper.

### 4. Table of contents

- **Quarkdown:** `.tableofcontents` from headings.
- **Us:** We could **derive a TOC from the current markdown** (headings from the AST or a simple regex), render it in the sidebar or above the preview, and optionally anchor-link to headings.

### 5. Footnotes

- **Quarkdown:** GFM-style and inline footnotes.
- **Us:** Check if **marked** (with GFM) already supports footnotes; if not, add an extension. Style footnotes (e.g. margin/side notes in “article” layout, bottom-of-page in “paged”).

### 6. Copy/export

- **Quarkdown:** PDF via CLI + Puppeteer.
- **Us:** We already have “Copy HTML” with inlined theme. We could add **Print / “Save as PDF”** via the browser’s print dialog (no backend), and optionally a “Export as PDF” that uses a small backend or Quarkdown CLI if we choose to integrate.

### 7. Live preview and watch

- **Quarkdown:** `-p -w` for live preview + watch.
- **Us:** Vite HMR already gives live preview. We could document “edit and see changes instantly” as our equivalent.

### 8. Custom blocks (callouts, boxes)

- **Quarkdown:** Custom functions and blocks (e.g. `.box {Example} type:{tip}`).
- **Us:** We could support **callout/box syntax** (e.g. `::: tip` / `::: note` or a small convention) via a **marked extension** and style them in our theme CSS (similar to their “Example” box).

### 9. Shareable state

- **Quarkdown:** Project files and config.
- **Us:** We already have **hash-based state** (style, doc, mode). We could extend it (e.g. layout mode, TOC on/off) so “share URL” keeps the full experience.

---

## Summary

| Question | Answer |
|----------|--------|
| **Can we integrate?** | Not as an in-browser parser. Only by running Quarkdown (CLI) and using its HTML/PDF output (pre-compile, pipeline, or backend). |
| **If we integrate (indirectly)?** | We gain: viewing/export of Quarkdown documents, PDF/slides/docs output, and their theme/layout system — as consumed output, not editing of `.qd` in our app. |
| **If we don’t integrate?** | We can still adopt: document type/layout mode, split color vs layout theme, image dimensions, TOC, footnotes, print/PDF, custom blocks, and richer shareable URL state. |

**Practical recommendation:** Treat Quarkdown as an **external tool** for power users who want paged/slides/docs/PDF. Improve **our own** editor with the “learn from” list above (TOC, image size, footnotes, layout/theme split, callouts, print/PDF). If we later add “Export with Quarkdown” or “View Quarkdown output,” do it via CLI/backend and display the generated HTML/PDF, not by embedding a Quarkdown parser in the browser.
