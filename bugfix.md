# ONYX v2.0 — Bugfixes & Breaking Changes

> Every defect found during the v2.0 audit (from v1 code or introduced & caught during v2 QA),
> how it was fixed, and the breaking changes deployers must know about.

---

## A. Bugs inherited from v1 (fixed in v2)

| # | Bug (v1 behavior) | Root cause | v2 Fix |
|---|-------------------|------------|--------|
| 1 | **Exports were screen-resolution**, not image-resolution | Canvas was sized to the browser viewport; `toDataURL({multiplier})` captured the *screen-sized* canvas | Document-based canvas: export temporarily resizes canvas to doc dimensions with identity viewport transform → pixel-true output (verified: 800×500 upload → 800×500 export) |
| 2 | **Filter presets wiped adjustments** | `applyFilter` did `img.filters = []` before pushing the preset | Filters managed as a typed stack: presets tagged `onyxPreset`, remove-color tagged `onyxRemove`, adjustments keyed by filter type — all coexist |
| 3 | **Adjustment sliders reset to 0 when re-selecting an image** | `handleSelect` hard-reset `brightness/contrast/...` in state | `syncFromObject` reads the live filter stack back into `EditorState` (brightness/contrast/saturation/hue/blur/noise/remove-color/preset) |
| 4 | **Slider changes were lost on undo/redo** | Slider updates never pushed history (only `object:modified` did — fired by mouse, not sliders) | Sliders fire `onCommit` (pointer-up / arrow-key) → `commitHistory()` |
| 5 | **Pinch gesture scaled the selected object**, not the canvas | Touch handler manipulated `obj.scale/rotate` | Two-finger pinch/pan now drives `viewportTransform` (capture-phase listeners so fabric never sees the 2nd touch); single-finger still manipulates objects |
| 6 | **"New Project" spammed empty projects** | Dashboard created an IndexedDB project immediately on click, even if user abandoned it | Scratch mode: `/editor` starts unsaved; the project record is created on the *first edit*, then URL is rewritten to `?project=<id>` |
| 7 | **Native dialogs** (`prompt` for rename/custom sticker, `confirm` for delete, `alert` for import errors) | — | Inline rename inputs, delete-confirm modal, custom-sticker inline input, toasts |
| 8 | **Autosave overwrote during load** | `object:added` fired by `loadFromJSON` → `saveHistory()` + save during restore | `isLockedRef` guards history/save while restoring (also prevents duplicate initial history entries) |
| 9 | **`to bottom` could hide objects behind nothing / frame issues** | `sendToBack()` placed objects below the canvas frame | `order('back')` inserts above the `onyx-frame` explicitly |
| 10 | **Crop modal had no ratio presets** | `react-cropper` opened with free ratio only | Ratio chips (Free, 1:1, 4:5, 3:2, 16:9, 9:16) via imperative `setAspectRatio` |
| 11 | **34 Google font families in one blocking request** | v1 SEO font list | Trimmed to 12 curated families + `preconnect` + `display=swap` |
| 12 | **Security headers silently dropped in static export** | v1 set `headers()` in `next.config.ts`, which `output: 'export'` ignores | Moved to `vercel.json` (plus `Service-Worker-Allowed` for `/sw.js`) |
| 13 | **`X-Frame-Options: DENY`** conflicted with any future embed | v1 blanket DENY | Relaxed to `SAMEORIGIN` |

## B. Bugs introduced during v2 (caught in QA, fixed)

| # | Bug | Symptom | Fix |
|---|-----|---------|-----|
| B1 | **Autosave deselected the selection** — `renderDocDataURL` (used for thumbnails) called `canvas.discardActiveObject()`, which fired `selection:cleared` → contextual panel snapped back to "no selection" ~1 s after every edit | Add text → panel shows TEXT tab → 1.1 s later panel resets to empty state | `isCapturingRef` suppresses selection events during capture; selection is restored (`setActiveObject(prevActive)`) inside `finally` |
| B2 | **Canvas not centered / clipped right on mobile** | After viewport change the fabric container sat top-left and the document panned out of view | Wrapper gets `flex items-center justify-center`; ResizeObserver now debounce-re-fits (220 ms) after real size changes |
| B3 | Command-palette `useState` resets flagged by React-Compiler lint (`set-state-in-effect`) | Lint errors under the new `react-hooks` v6 rules | Render-adjust pattern (`prevQuery` compare) + uncontrolled `NumInput` keyed on external value |
| B4 | Nested `Btn` component inside `MobileToolbar` remounted every render | `react-hooks/static-components` errors, subtle focus loss | Moved to module scope |

## C. Breaking changes (v1 → v2)

1. **Editor URLs**: `/editor/<projectId>` → **`/editor?project=<projectId>`**. Old deep links will 404 after deploy (static export cannot keep the dynamic route). Dashboard/sidebar links updated; IndexedDB projects are unaffected.
2. **Content pages removed**: `/blog`, `/blog/[slug]`, `/compare`, `/compare/[slug]`, `/tools/[slug]`, `/tools/resize/[slug]`, `/tools/convert/[slug]` → gone. Sitemap + robots updated accordingly. (They 404 with the new styled page.)
3. **EmbeddedEditor removed** — the tool-landing embedded editor is replaced by the single full editor (`/editor?preset=…`).
4. **Saved-project compatibility**: v1 projects open fine — the frame is auto-inserted and the document size is derived from the content bounding box (or the new `docW/docH` meta once re-saved in v2).

## D. Known limitations (by design, documented for future agents)

- **Undo history is session-scoped** (50 steps, in-memory) — not persisted with the project.
- **Light theme** intentionally not offered (industry-standard dark editor UI).
- **Background-removal** is color-key based (RemoveColor) — ML-based removal is a future feature.
- **History does not capture brush strokes individually** — each stroke lands as one `object:added` checkpoint (standard fabric behavior).
- Vercel preview deployments must use the static output too — no server runtime is expected anywhere.
