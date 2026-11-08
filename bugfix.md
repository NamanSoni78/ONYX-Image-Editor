# ONYX v2.1 — Bugfixes & Breaking Changes

> Every defect found during the v2.0 audit (from v1 code or introduced & caught during v2 QA),
> how it was fixed, and the breaking changes deployers must know about.
> **v2.1**: section E lists the user-reported + parallel-subagent-hunted bugs fixed in the v2.1 round.

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

## E. v2.1 round — user-reported + bug-hunt fixes (all browser-verified where marked ✅)

### E1. User-reported bugs

| # | Bug | Root cause | Fix |
|---|-----|-----------|-----|
| 1 | **Black background turned white behind the first imported image** (visible when moving it) | First import defined the doc but the frame kept its white fill | First import sets the doc background transparent (checkerboard) + serializable `onyxBgTransparent` flag ✅ |
| 2 | **Keyboard Delete didn't delete the selected object (multi-select did nothing)** | `canvas.remove(activeSelection)` doesn't remove member objects in fabric v5 | `apiDeleteObjects` unwraps ActiveSelection members and removes them batched (one history entry) ✅ |
| 3 | **Favicon** was the old generic one | — | User's ICO installed at `src/app/favicon.ico`; all PWA icons (192/512/maskable/apple-touch) regenerated from it |
| 4 | **Footer** missing links | — | Home footer: See Other Apps → `links.namansoni.in/namansoni78`, Made With ❤️ By Naman + GitHub → `github.com/namansoni78`, Donate → `payment.namansoni.in/payment` (all `target=_blank rel=noopener`) ✅ |

### E2. Parallel-subagent bug hunt (3 hunters: canvas core / export+panels / shell+mobile)

**Critical**

| # | Bug | Root cause | Fix |
|---|-----|-----------|-----|
| 5 | **"Transparent background" PNG export came out filled with the editor backdrop (#101013)** | `toCanvasElement` paints `canvas.backgroundColor` under everything; only the frame was hidden | `renderDocDataURL` clears `c.backgroundColor` during transparent capture, restores in `finally` ✅ |
| 6 | **"To bottom" hid single objects (under the frame) and CORRUPTED multi-selects** (`splice(-1,1)` deleted the top object; ActiveSelection injected into the canvas stack) | `order('back')` mixed `getObjects()` copies, stale frame indexes and ActiveSelection handling | Live-`_objects` rewrite: single objects land just above the frame; ActiveSelection members are moved in order and re-selected ✅ |
| 7 | **"New Project" from inside the editor kept autosaving into the OLD project** (same-route soft nav never re-initialized the canvas) | No remount on `?project` change | `EditorClient` remounts `CanvasEditor` via an epoch key on document switches — with an "adoption" exception so the first autosave of a scratch session (which rewrites the URL) does NOT remount/race the project write ✅ |
| 8 | **Adoption race (found while fixing #7)**: keying on the raw URL made the first autosave of a scratch session remount the editor and load the just-created EMPTY project record — wiping the imported image | `createProject()` writes an empty record, then `replaceState` triggered the remount before `updateProject` committed | doSave marks `window.__onyxAdoptedPid` before `replaceState`; the wrapper keeps the epoch for that doc ✅ |
| 9 | **JPG export after toggling "Transparent" produced a black-background JPEG** | The transparent flag survived the format switch | Flag reset on format change + engine-level guard (`transparent && format!=='jpeg'`) ✅ |

**Major**

| # | Bug | Fix |
|---|-----|-----|
| 10 | **`sendBackwards` / Layers ↓ dropped the bottom-most layer below the frame (invisible)** | Member-wise backward move with floor = frameIdx+1 (single + multi-select) ✅ |
| 11 | **Doc background changes weren't undoable/autosaved** | `setDocBackground` commits history ✅ |
| 12 | **Background image was invisible** (canvas-level `backgroundImage` renders under the opaque frame) and not undoable | BG image is now a real cover-fit layer directly above the frame (`onyxBgImage`), visible + exportable + listed in Layers + rescales with doc resize; legacy saves are migrated on load; undoable ✅ |
| 13 | **Transparent-doc detection used pattern-instance identity** — broke after every save/reload (checker baked into JPEG exports/thumbnails) | Serializable `onyxBgTransparent` flag (+ Pattern instanceof fallback) ✅ |
| 14 | **CSS gradient angles were mirrored / corner keywords wrong** (`45deg` rendered down-right, `to top right` rendered straight up; `turn`/`rad` ignored) | Proper CSS semantics: keyword → direction vector, `deg` → `cssDeg − 90`, `turn`/`rad` conversion ✅ |
| 15 | **Updating a border stack pushed spurious history entries** (one where the core object was missing) | The whole unwrap→re-wrap runs under `isLockedRef`; history commits after ✅ |
| 16 | **Doc resize didn't rescale the frame gradient** (gradient only spanned the old area) | `applyDocSize` rebuilds the gradient via `buildFrameGradient(onyxBgCss, w, h)` |
| 17 | **Export custom W/H inputs ate the first keystrokes** (typing "800" → the "8" vanished because 8 < 16 nulled the state) | Draft-string inputs committing on blur/Enter; ratio input normalized on blur ✅ |
| 18 | **Stale mixed custom/ratio mode exported a dimension the UI never showed** | Missing side falls back to the doc dimension (aspect-derived when locked) ✅ |
| 19 | **Border rings on scaled images used the natural pixel size** (3000×2000 rings around a 700px image) | Ring Rect carries `scaleX/scaleY = ringW/naturalW` ✅ |
| 20 | **BorderStackBuilder kept the previous object's config** when selecting another bordered object | Re-seeds from the group's `onyxRingCfg` when the selection identity changes |
| 21 | **Non-circle export masks were stretched** on non-square documents | `traceExportShape` inscribes every shape by `min(w,h)` (like circle) ✅ |
| 22 | **Ctrl+Z/Y/S/K/D fired while typing in DOM inputs** (canvas undid, native input undo blocked) | `domTyping()` guard; fabric IText editing (hidden textarea) still allows canvas shortcuts; Space no longer swallows button activation ✅ |
| 23 | **Mask tool unreachable on mobile** | Mask button added to the image group of the mobile toolbar ✅ |
| 24 | **Existing text objects couldn't be re-formatted on mobile** (Text button always created a new object) | With an i-text selected the button opens the TEXT panel instead ✅ |
| 25 | **Escape / sheet-Done during mask edit left the temp mask on canvas and the image locked** | Both paths call `finishMasking(false)` ✅ |
| 26 | **`.onyx` re-import dropped `docW/docH`** (re-imported 1080×1920 story exported as 1080² square) | `importProject` persists doc dimensions ✅ |
| 27 | **Native `confirm()`/`alert()` still used** (sidebar delete, dashboard import error) | In-drawer delete-confirm dialog; inline error banner ✅ |
| 28 | **Gradient/pattern fills mis-detected** (`fill.type === 'gradient'` never matches — fabric v5 uses 'linear'/'radial' and Pattern has no type) | Structural detection (colorStops → gradient, source/repeat → pattern) ✅ |
| 29 | **`viewportFit: cover` missing** → all safe-area insets dead code on iOS PWA | Added to the Viewport export |

**Minor**

| # | Bug | Fix |
|---|-----| -----|
| 30 | Arrange numeric inputs, flip, rename, layer visibility, gradient/solid fills weren't undoable | All commit history |
| 31 | `docBg` UI state stale after undo/redo | `restoreEntry` re-derives it via `docBgFromFrame` ✅ |
| 32 | "Gradient layer" in the Add panel dropped stops 3–5 and the direction | Uses `buildFrameGradient` (full CSS parsing) |
| 33 | Gradient parser deduplicated repeated stop colors | Dropped the dedupe |
| 34 | Export toast reported pre-cap dimensions (16K requests announced 16384 when capped) | `renderDocDataURL` returns the real `{url,w,h}` ✅ |
| 35 | Layer lock didn't round-trip through save/reload | lock props added to `CANVAS_EXTRA_PROPS` |
| 36 | "16K" chip capped at 32× (lied for docs < 512px) | Chip bypasses the manual-ratio clamp; pixel caps do the real limiting ✅ |
| 37 | Fill sub-mode (solid/gradient/image chip) stale across selections | Reset on selection identity change |
| 38 | Clicking the active BG chip re-applied the default color/gradient (destroying the user's custom value) | No-op when the kind already matches |
| 39 | Border ramp sliders could invert (min > max) | Cross-clamped on change |
| 40 | Document W/H inputs kept showing rejected values | Clamp instead of reject (16–6000) |
| 41 | Desktop rail "Select"/"Crop" set non-existent `MenuTab` values (empty right panel) | Select → HOME; Crop doesn't change the menu ✅ |
| 42 | CropModal Apply crashed before the cropper was ready (`getCroppedCanvas() → null`); no Escape | Null-guard + Escape listener + `role=dialog` ✅ |
| 43 | JSON-LD pointed at nonexistent resources (SearchAction `/search`, `/logo.png`, wrong `sameAs`) | Dropped SearchAction; logo → `/icon-512.png`; sameAs → real profiles |
| 44 | SW version stale (`onyx-v2.0.0`), `offline.html` never served, dead `resize/convert-presets.ts` libs | Version bumped to `onyx-v2.1.0`; offline page is the last navigate fallback; dead libs deleted |
| 45 | `scrollbar-hide` class used but never defined (4 UI components) | Replaced with the defined `hide-scroll`; swatches became real `<button>`s |
| 46 | Hover-only card/sidebar actions invisible on touch devices | `.touch-visible` utility (`@media (hover: none)` forces opacity) |
| 47 | No file-size guard on import | Reject > 50 MB with a toast |
| 48 | `I` (Add panel) and Ctrl+Y missing from the shortcuts cheat sheet; 2:3 ratio missing from EmptyState | All added |
| 49 | **saveHistory() called while `isLockedRef` was true was a silent no-op** — deletes, border stacks, bg image set/remove never created history entries | History + autosave moved outside the lock in `apiDeleteObjects`, `applyBorderStack`, `removeBorderStack`, `handleBgInput`, `clearBgImage` ✅ |

### E3. False alarms (investigated, not bugs)

- `setLayerIndex` splice math (live `_objects`), image/pattern fill round-trip (fabric serializes pattern canvases to dataURL), gradient fill round-trip, polygon/star NaN guards (n≥3 clamps), undo/redo selection cleanup, clipboard PNG hardcode (panel blocks non-PNG copy), no retina double-scaling (`enableRetinaScaling:false`), footer URLs (byte-exact), favicon wiring (ICO + PNGs + manifest + apple-touch all present), v2.0→v2.1 project compatibility (extra props revive natively).

---

## F. v2.2 round — user-reported + parallel-subagent-hunted bugs

Fixed during the v2.2 feature round (3 hunters, 24 findings — all fixed, browser-verified):

| # | Bug | Fix |
|---|-----|-----|
| 50 | **Viewport transform leaked into the shape-crop raster** — `getBoundingRect(false)` in fabric v5 INCLUDES the viewport, so zoom 1.66 produced a 1.66× bloated, misplaced crop | Use `getBoundingRect(true, true)` (document coords) everywhere in the raster engine |
| 51 | **Border rings rendered only the bottom-right quadrant** — `rctx.translate(cx, cy)` moved the origin but ring paths were built in 0..w space | Translate by `(canvas−ring)/2` so the 0..rw path box is centered |
| 52 | **Ctrl+Z died after touching any slider** — `domTyping()` treated focused range inputs as typing | range/color/checkbox inputs are non-typing for modifier combos; plain keys get the same treatment (v2.2.1) while text inputs + fabric editing stay protected |
| 53 | Rasterize on first slider tick could run N times (one per tick) → duplicate layers + toast spam | `rasterBusyRef` in-flight guard |
| 54 | Undo/Delete/selection-change during the async border/raster/crop window resurrected objects, corrupted history or stomped selection | `obj.canvas === c` attachment checks + lock ownership tokens (`lockTokenRef`) |
| 55 | Duplicate/paste dropped `onyxRing/onyxCropShape/name/locks` | `clone(cb, CANVAS_EXTRA_PROPS)` |
| 56 | Leaving MASK_EDIT via rail/palette/tool keys stranded the temp mask shape on canvas (it exported!) and left the target unclickable | `cancelMasking()` + menu-change effect; plain shortcuts blocked while masking |
| 57 | Shadows clipped by the raster bounding box | bound padded by `blur + max(offsetX,offsetY)` |
| 58 | Crop / rasterize / border apply / remove sent layers to the TOP of the stack | `insertAt(idx)` preserves z-order |
| 59 | Extreme border configs (1024 × 30 px × gap 24) built ~8000 px canvases → iOS `getContext` null crash + a poisoned busy flag | 4096 px hard cap, null-context guard, try/catch always resets the flag |
| 60 | hold-compare stash leaked a deleted image's filters onto the NEXT selected image | stash `{obj, filters}`, restore only on the same object |
| 61 | **Pick-export modal rendered inside the export Modal** — the glass panel's backdrop-filter became the containing block, shrinking the "full-screen" picker to ~448 px (and the outer backdrop stayed clickable) | Hoisted to a sibling of `<Modal>` — verified 1440×900 = viewport |
| 62 | WebP chip offered on non-WebP browsers (silent PNG fallback) in the pick modal | Same capability gate as the export panel |
| 63 | Layer drag handle had no keyboard path; `reorderLayer` orphaned | Enter selects, ↑/↓ reorder |
| 64 | Layer row ids derived from stack index → full remount on every reorder, drops could silently no-op mid-drag | stable `onyxUid` (persisted) |
| 65 | "Square" crop produced the full bbox (16:9 in → 16:9 out) | True inscribed square (600×400 → 400×400) |
| 66 | Pick export: double-click during a 16K render double-exported; a FAILED export still closed the picker (settings lost) | busy-guard + `exportImage` returns success, close only on success |
| 67 | After resizing the picked region, a stale 16K multiplier silently applied (no chip selected) | `applyBox` resets the multiplier |
| 68 | Mobile: three close affordances (toolbar Done ×2 + Sheet ✕) | MobileToolbar owns tool-sheet closing; only LAYERS keeps a handle |
| 69 | Mobile tool sheet had an exit animation that never played (no AnimatePresence) | wrapped, keyed, plays |
| 70 | Desktop rail/panel still gated Adjust/Filters/Mask to images while the engine + mobile accepted any object | rail `needsObject`, tabs for shape/text |
| 71 | Locked layers deletable via Delete key / quick-bar | single-object delete refuses with a toast |
| 72 | Desktop LAYERS rail button showed an empty placeholder | panel renders `LayersList` for LAYERS |
| 73 | Service worker still cached as v2.1.0 | bumped to `onyx-v2.2.0` |
| 74 | Transform badge invisible when the object touched the viewport top | clamped + transform flip |
| 75 | Clipboard copy labeled JPEG/WebP bytes as `image/png` | labeled with the real blob MIME |
| 76 | Per-border mode kept count=1024 → 1024 default-white rings | switching modes clamps count to 64 |

### F2. Investigated, not bugs (this round)

Escape nesting (pick modal's capture-phase listener wins — one consumer), pointer-capture on pick handles (events bubble to the stage), MaskPanel hooks-before-returns (legal), BorderStackBuilder re-seed pattern (sanctioned adjust-state-during-render), flip/rotate on ActiveSelection (fabric bakes the matrix on deselect), z-index of the pick modal (child stacking context paints above), SHORTCUTS accuracy, CommandPalette actions, layout viewport, `CropShapeSpec.sides` always-passed (clamped + only read for polygon).

## v2.3 round 2 — parallel bug-hunt fixes (3 subagents: canvas core / export+panels / shell+mobile+docs)

| # | Bug | Fix |
| --- | --- | --- |
| 77 | **Filter-engine JPEG-swap race could still blank images** (residual of the brightness-invisibility bug): the async re-encode updated `_originalElement` but not `_element`; emptying the filters while the encode was in flight broke fabric's `_element === _originalElement` invariant, so the NEXT filter pass dereferenced a null `_filteredEl` and left the image permanently invisible | the swap also assigns `_element` when no filtered element is live — repro verified: 0.3 → 0 → wait → 0.3 stays visible |
| 78 | **Crop double-applied adjustments**: the crop modal snapshotted FILTERED pixels (`toDataURL` renders through `_element`) and `setSrc`'s setElement re-applied the filter stack — brightness +30 became +60, baked into history | `unfilteredSnapshot` stashes/neutralizes/restores the filters around the capture; setSrc re-applies the look exactly once |
| 79 | Gradient-stroke OFF silently re-applied the gradient: `syncFromObject` stored the Gradient instance into `editorState.strokeC`, so the off-toggle set stroke back to that Gradient | `typeof obj.stroke === 'string'` guard |
| 80 | Advanced-shadow direction pad was a compass rose but the engine is screen-convention (0°=right, 90°=down) — every pad click threw the shadow 90° the wrong way | screen-convention matrix + named tooltips (Up=270°…) — verified by shadow-blob centroid |
| 81 | ExportPanel had no busy guard: a second click during a heavy export double-exported, and a concurrent strip-mode capture could restore STALE visibility state (frame hidden / checker replaced) until the next capture; a failed export still closed the panel (settings lost) | busy state disables Copy/Download ("Rendering…"), closes only on success |
| 82 | Basic-shadow offset 0 was resurrected as 10 by any later Blur/Color change (`0 \\|\\| 10`); shadow sliders also showed the PREVIOUS object's values on shadow-less objects | `??` fallbacks + no-shadow reset branch in `syncFromObject` |
| 83 | Shape crops were inscribed in the SHADOW-PADDED raster: a 400×300 rect with a glow circle-cropped to ~390px with the shadow baked into the crop geometry | shadow-strip the raster for shape crops + re-attach the basic shadow to the result so it wraps the cropped contour (verified: 301×301 + shadow intact) |
| 84 | Mask flow polluted history: the temp Mask shape's add/remove pushed junk undo states (dashed temp shape as a REAL object, target unclickable) and could leak into autosaves; it also showed as a layer row | locked add/remove (save/restore), `onyxTempMask` flag, layers filter, `object:modified` gate while masking — verified: one undo cleanly un-masks, zero stray states |
| 85 | Ctrl-shortcuts fired under the crop modal and inside MASK_EDIT: Ctrl+Z undid the document UNDER the crop modal and stranded it Apply-unclosable; Ctrl+D duplicated the temp mask shape; Escape during masking was dead (the mask guard returned before the Escape branch) | guards hoisted above the modifier block; Escape gets first crack at the topmost mode |
| 86 | `borderBusyRef` was cleared unconditionally in the rewrap finally — the failure-restore recursion owned the lock but the outer call re-opened the re-entrancy window mid-rebuild | token-guarded cleanup of BOTH flags |
| 87 | Layers rows were keyed by full-canvas index — the stable `onyxUid` was generated (and persisted) but never read, so every reorder remounted rows and a debounced update could abort a drag mid-flight | key = `onyxUid` |
| 88 | A pending adjust-raster replay could apply the OLD object's slider value to whatever was selected after a mid-flight selection switch | replay only when the rasterized image still holds the selection (toast otherwise) |
| 89 | Image decode failures wedged the busy-flags for the whole session: fabric's `fromURL` throws inside its own error handler (addClass on a null element) BEFORE any caller callback runs, so promises never settled and rasterBusy/borderBusy stuck true (undo/redo/adjust dead) | safe `loadImageP` via `util.loadImage` + error flag + hard timeout nets; every `fromURL`/clone site routed through it or given a settle-net |
| 90 | GradientStrokeSection kept the previous object's toggle/colors across selections, and enabling it on a strokeW-0 object rendered nothing with no hint | live re-seed from the object's actual stroke + seeds a visible width |
| 91 | Pick-modal Custom chip reset an already-typed custom size to 1× the region on re-click | preserve the typed size (mirrors ExportPanel) |
| 92 | Clipboard failure path pinned the blob URL until unload when the write was refused, and a FAILED render showed a misleading "clipboard not available" toast on top of the real one | settle the render in the catch, revoke the URL, toast only for genuine clipboard refusals |
| 93 | Ring-width input accepted values the engine silently clamps (typing 400 showed 400 px, rendered 60 px) | clamp to 1–60 in onChange |
| 94 | Shape+JPEG exports bypassed the blank-output retry: the white pre-fill hid a total capture failure from the alpha-only blank check → blank white JPEG shipped without the half-res retry | per-strip transparency detection (a failed capture is fully transparent; a legit white image is opaque) |
| 95 | Stale/wrong copy: README advertised the removed 16K chip; features card claimed a nonexistent project "duplicate" action, 15 (really 12) filter looks and a nonexistent "Emboss"; pick-modal footer hardcoded the 16384 px cap on iOS (8192 real) | corrected all four |
| 96 | Landing hero carried the stale "v2.2 — true shape crops & pick-export up to 16K" badge | removed (user request) |

### F3. Investigated, not bugs (round 2)

Text-edit undo granularity: fabric v5's `exitEditing` fires `modified` on the object when the text changed, which FORWARDS to the canvas `object:modified` handler — typed text was already committed on editing exit; adding a `text:editing:exited` commit double-pushed identical entries (first undo became a silent no-op) and was reverted. Empirically verified with event counters. Also verified clean: filter-engine texture eviction, ring layout/mask-vs-crop ring paths, shadow compositing (double-rotation guard), strip seam math, cap parity between panels and engine, custom exact-px validation, persistence round-trip of all v2.3 props (gradient rings/shadows/strokes, onyxCropShape), mobile shell, JSON-LD.

## v2.3 round 3 — final QA hunt (3 subagents: filters+history / export / FX+docs)

| # | Bug | Fix |
| --- | --- | --- |
| 97 | **Filter provenance was lost on every undo/redo / reload** (HIGH): fabric's `BaseFilter.toObject` drops the `onyxPreset`/`onyxRemove` flags, so after ONE undo, applying "Sepia" over "Gray" stacked BOTH (verified: `[Grayscale, Sepia]` mud), and RemoveColor could never be toggled off again | `onyxFilterMeta.slots` persisted 1:1 with the filters array on the IMAGE (round-trips via CANVAS_EXTRA_PROPS); both loadFromJSON post-passes re-tag live instances; duplicates/paste re-tag cloned trees. Verified: Sepia-after-undo → `[Brightness, Sepia]`, zero Grayscale leak |
| 98 | **Slider double-click reset never committed history**: adjust → double-click a label → Ctrl+Z removed a much OLDER action (typically the image import — "my image disappeared") | the reset now fires `onCommit` too; verified: reset → undo restores the previous value with the image alive |
| 99 | **Ratio-flipping custom exports hard-failed** (HIGH): `captureScale = max(outW/baseW, outH/baseH)` oversampled the LONG doc axis — 6000×750 doc → 2000×16000 export requested a 120 000×15 000 intermediate canvas → guaranteed blank → "Export failed" | per-axis + megapixel clamp on the INTERMEDIATE capture in both renderDocDataURL and renderDocBlob; verified end-to-end: the exact repro now exports a real 2000×16000 non-blank PNG |
| 100 | **Two concurrent exports could kill the renderer** (HIGH): Escape closed the pick modal mid-render (no busy check) and re-enabled the parent Download → two 268-MP pipelines → renderer OOM | engine-level `exportBusyRef` re-entrancy guard in `exportImage` + the pick modal refuses Escape while busy; verified: second click blocked while rendering |
| 101 | Fast slider flick on a VECTOR object committed history BEFORE the async rasterize finished → duplicate entry, redo a silent no-op, adjustment never recorded | `saveHistory` no-ops while `rasterBusyRef` is set; `ensureAdjustableImage` commits once after the replayed adjustment lands |
| 102 | Hold-compare could leak the filter-stripped state forever: Escape/tool-switch unmounted the panel mid-hold; a concurrent commit also BAKED the stripped filters into history | panel unmount releases the stash (`useEffect` cleanup) + `onPointerCancel`/`onLostPointerCapture` + selection-change release in `syncFromObject` + `saveHistory` no-ops while a stash is live |
| 103 | Remove-color hex changes (swatch clicks) had no history commit — one Ctrl+Z ate the toggle instead | the ColorPicker onChange commits |
| 104 | Slider `onKeyUp` committed only ArrowLeft/Right — ArrowUp/Down/PageUp/PageDown/Home/End changes were uncommitted | all value-changing keys commit |
| 105 | Blur ADJUSTMENT vs Blur PRESET type collision: the adjustment deleted the preset from under the FilterPanel; applying the preset over an adjustment double-blurred | adjustments are tagged (`onyxAdjust`) and removed only by key; a colliding preset supersedes the adjustment and zeroes its slider |
| 106 | No-op commits (pointer-up without change, reset at default) pushed JSON-identical entries — the next undo was a silent no-op | consecutive identical entries collapse in `saveHistory` |
| 107 | Pick-modal Custom chip re-click preserved the typed WIDTH but silently overwrote the typed height when unlocked | both dimensions survive; ratio-locked clicks still follow the region aspect |
| 108 | `parseInt` on export drafts mis-committed exponential input ("16e2" displayed 1600, committed 16) | `Number()` + `Number.isFinite` in all four commit handlers (both panels) |
| 109 | The 8px minimum pick-region could extend past the document edge on tiny docs (empty band, black in JPEG) | region clamped to the doc bounds |
| 110 | Copy-to-clipboard on non-secure origins rendered the ENTIRE image before discovering the clipboard was unavailable | fail-fast when the sequential write path is guaranteed to throw |
| 111 | README still branded v2.2 with no v2.3 changelog; service worker still cached as `onyx-v2.2.0` | README v2.3 + What's-new section; SW bumped to `onyx-v2.3.0` |
| 112 | 1024-ring stacks at low supersample: the absolute 0.6px stroke floor fattened 1px rings tenfold, and the outermost ring was shaved by the +1.5 path-box fudge | ring WIDTH floored in object space (0.5px) then scaled; ring canvas sized +3px |
| 113 | Shadow blur margin was 2σ — the gaussian tail hard-clipped at the raster edge | 3σ pad |
| 114 | Spread stretched the silhouette raster anisotropically ((bw+2s)×(bh+2s)) — non-square bounds turned a 360° glow into an egg | isotropic dilation: the silhouette is stamped around a circle of radius = spread |
| 115 | GradientStrokeSection re-seeded only the toggle — colors described the previous object | colors seeded from the object's actual gradient stops |
| 116 | History snapshots embedded 4096² ring/shadow part PNGs ×50 entries — maxed stacks pinned ~100MB+ of strings | retained history capped at 32M chars (oldest evicted, floor of 2 entries) |

### F4. Investigated, not bugs (round 3)

Ring gradient angle default (0° vs panel's 90° seed — cosmetic only, both render); gradient-vs-shadow reference frames on rotated objects (consistent with ring gradients, documented in the panel copy); ShadowFx direction pad matrix (verified against cos/sin); custom-mode ring padding fallback; rings arrays longer than count (dropped, not leaked); WebP/JPEG quality plumbing; strip seam math at odd resolutions; `commitHistory` called with a numeric arg from onCommit (zero-param signature, harmless).

### F5. Round 4 — mobile overhaul QA (v2.4)

| # | Bug | Fix |
| --- | --- | --- |
| 117 | holdCompare(false) on a non-image selection called ensureAdjustableImage — merely OPENING Adjust with a shape/border-stack selected and switching tools rasterized (destroyed) it | non-image selections are a strict no-op in holdCompare |
| 118 | syncFromObject's init-effect handlers captured the opening-render isMobile=false closure — desktop auto-open panels fired on phones | syncFromObjectRef routes all one-time registrations to the latest closure |
| 119 | Rasterize/border rebuild transiently cleared the selection → menu flipped to HOME mid-slider → sheet closed under the user's finger | !obj branch guarded by borderBusyRef/rasterBusyRef (ported) |
| 120 | GL applyFilters throw during loadFromJSON enliven → project opened EMPTY | patchGlApplyFilters wraps the GL backend: CPU retry within a 24MP budget, else unfiltered passthrough (ported) |
| 121 | Undo/redo + project reload only ran the guarded filter pass on TOP-LEVEL images — ring/shadow-group cores kept stale flags / GL-blank sources | restoreFiltersDeep descends into attachment groups (ported) |
| 122 | Closing the DRAW sheet (Done / drag / Escape) left the brush armed — every canvas drag painted a stroke | brush disarmed on all three close paths |
| 123 | "transparent" ramp endpoints parsed to NaN → #NaNNaN ring colors (all-black rings, poisoned saved config) | HEX6 guard in mixHex + panel seeding (white fallback) |
| 124 | GradientStroke "Direction" double-click reset committed the PRE-reset angle (closure captured before re-render) | onCommit receives the fresh value |
| 125 | ShadowFx direction pad lost its active-direction dot highlight (both ternary branches undefined) | #a5b4fc restored |
| 126 | EmptyState's full-cover overlay swallowed canvas pointer events — Draw could not paint on an empty document | overlay pointer-events-none, card keeps events |
| 127 | No safe-area TOP inset: TopBar controls sat under the status bar in the installed iOS PWA | .safe-area-pt on the header |
| 128 | .safe-area-pb overrode Tailwind pb-5 in Modal (same cascade layer) — modal content lost its 20px bottom padding | pb-[max(1.25rem,env(safe-area-inset-bottom))] |
| 129 | ExportPanel custom-size invalid commit kept the other axis in Custom mode (stale derived W) | both axes cleared (ported) |
| 130 | CropModal Cancel/Apply ≈28px, ratio chips ≈27px — below the round's 44px touch standard | 44px actions + chips |
| 131 | EmptyState card clipped top+bottom on short (landscape) viewports | max-h-full + overflow-y-auto |
| 132 | Sticky apply bars: −mx-4/−mb-5 didn't match their host paddings (builder cards p-3, Modal px-5) | bars re-margined per host; Modal padding uses max() |
