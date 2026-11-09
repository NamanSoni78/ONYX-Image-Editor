# ONYX v2.0 — Worklog

> Chronological log of everything done in the v2.0 upgrade.
> Format: phase → what changed → files touched.

---

## Phase 0 — Intake & Analysis

- Downloaded `onyx-image-editor-main.zip` (tmpfiles.org) and audited the full codebase.
- **v1 stack confirmed:** Next.js 16 (App Router) · React 19 · Tailwind v4 · Fabric.js 5 · framer-motion · idb · react-cropper.
- **v1 findings:**
  - Editor canvas was **viewport-sized** → exports were screen-resolution, not image-resolution.
  - Single mobile-style bottom toolbar served desktop users too — no pro desktop layout.
  - No zoom/pan; pinch gesture scaled the *object* instead of the canvas.
  - Filter presets wiped adjustment filters (`img.filters = []`) and sliders desynced on reselect.
  - SEO sprawl: `/blog` (hub + posts), `/compare` (hub + posts), `/tools/[slug]` × 11, `/tools/resize/[slug]`, `/tools/convert/[slug]`.
  - 34 Google font families requested in one blocking `<link>`.
  - `/editor/[id]` was the only dynamic route → an SSR function invocation per editor visit (drains Vercel Fluid CPU).
  - `alert()/confirm()/prompt()` used for renames, deletes, custom stickers.
  - Dashboard "New Project" eagerly created empty IndexedDB projects.
- Researched 2025/2026 editor UX patterns (Figma properties-panel model, NN/g bottom-sheet guidance, Photopea zoom conventions) → wrote `plan.md`.

## Phase 1 — Content & Route Pruning

- **Deleted routes:** `src/app/(site)/blog/**`, `src/app/(site)/compare/**`, `src/app/(site)/tools/[slug]`, `src/app/(site)/tools/resize/**`, `src/app/(site)/tools/convert/**`, `src/app/editor/[id]/`.
- **Deleted libs/components:** `lib/blog.ts`, `lib/comparisons.ts`, `Editor/EmbeddedEditor.tsx`, `Editor/Toolbar.tsx` (replaced), `Home/FeaturesGrid.tsx`, `Home/HowItWorks.tsx`, `app/Tempsitemap.ts`, `app/Temprobots.ts`.
- **Deleted junk:** `V7.html`, `dev.log`, `prompt.txt`, unused `public/*.svg`.
- `lib/features.ts` rewritten from SEO long-form data → compact `TOOLS` catalogue (12 cards).
- Rebuilt `public/sitemap.xml` (3 URLs) + `public/robots.txt`; new `_not-found.tsx`.

## Phase 2 — Hosting Cost & Performance (Vercel = $0 compute)

- `next.config.ts` → **`output: 'export'`** (all 4 routes static; zero serverless invocations).
- Security headers moved `next.config.ts headers()` → **`vercel.json`** (headers ignored in static export).
- Editor route redesign: `/editor/[id]` (dynamic SSR) → **`/editor?project=<id>`** (static page, client reads param).
- Font payload trimmed 34 → **12 families**, `preconnect` added, `loadFonts()` made idempotent.
- PWA: `public/manifest.webmanifest`, `public/sw.js` (precache shell / cache-first `/_next/static` / SWR fonts / network-first pages), `public/offline.html`, `PwaRegister.tsx`, generated PNG icons (192/512/maskable/apple) + `og-image.jpg` via Pillow scripts.

## Phase 3 — Design System

- `globals.css` rebuilt: Onyx palette tokens (`onyx-950…600`, `accent-*`), custom scrollbars, `.glass`, `.text-brand-gradient`, `.bg-brand-gradient`, `.checkerboard`, `.grid-bg`, `.mask-fade-x`, `.focus-ring`, safe-area utilities, styled range inputs, `prefers-reduced-motion` support.
- New shared primitives: `ui/Toast.tsx` (provider + `useToast`), `ui/Tooltip.tsx` (CSS-only, shortcut chips), `ui/Modal.tsx` (bottom-sheet on mobile / dialog on desktop, Esc + backdrop close), `ui/Slider.tsx` v2 (value chip, `format`, double-click reset, `onCommit`).

## Phase 4 — Editor Engine (document-based canvas)

- **`EditorContext.tsx`** — typed `EditorAPI` (40+ members) + `EditorProvider`/`useEditor`.
- **`constants.ts`** — 15 filter presets (with CSS preview approximations), 6 stackable adjustments (`ADJUSTMENTS`), 6 doc presets, 24 stickers, 31-entry shortcut table, expanded `EditorState`.
- **`CanvasEditor.tsx`** rewritten (~1900 lines):
  - Document model: `onyx-frame` rect = the document (default 1080², adopts first image's pixel size, or `?preset=`); `viewportTransform` zoom/pan.
  - v1 project compatibility: on load, frame auto-inserted; missing doc size derived from content bounding box.
  - Zoom/pan: wheel-zoom at cursor, ctrl+wheel, pinch-zoom + two-finger pan (capture-phase, fabric-safe), space/middle-drag pan, fit/100%.
  - History 50 steps incl. doc size; undo/redo restores document + layers.
  - Filter engine: per-type filter stack — presets tagged `onyxPreset`, remove-color tagged `onyxRemove`, adjustments keyed by type → **no more clobbering**; sliders read live state back from the image.
  - Hold-to-compare, copy/paste objects, Ctrl+A multi-select, arrow-key nudging, `[`/`]` ordering, letter tool shortcuts (guarded while typing).
  - Drag-drop + clipboard paste (images **and** text), dropzone ring.
  - Scratch mode: `/editor` without `?project` stays unsaved; first edit creates the project and rewrites the URL via `history.replaceState`.
  - Autosave (1.1 s debounce) with save-state indicator + doc-bounded thumbnail.
  - Export engine `renderDocDataURL`: resize canvas to doc dims → identity VCT → capture → restore (with selection preserved via `isCapturingRef`).
  - Adaptive layout: desktop (rail + properties panel) vs mobile (toolbar + sheets) via matchMedia.
- New editor components: `TopBar` (inline rename, save state, zoom %), `DesktopRail` (13 tools, tooltips + shortcuts, contextual disable), `PropertiesPanel` (contextual tabs + collapsible layers), `MobileToolbar`, `LayersPanel` (thumbnails/eye/lock/order), `ZoomControls`, `EmptyState` (dropzone + 6 presets), `ExportPanel` v2 (PNG/JPG/WebP, quality, 0.5–3× scale + custom width, transparent PNG, copy-to-clipboard, live dims), `ShortcutsModal`, `CommandPalette` (Ctrl+K, fuzzy, 30+ actions), `CropModal` v2 (ratio presets, styled bar).
- `panels/ToolPanels.tsx` — 13 shared panel contents used by BOTH desktop panel and mobile sheets (single source of truth).

## Phase 5 — Site Pages

- Home v2 (`(site)/page.tsx`): hero (CSS gradient art, trust chips), dashboard, 8-tool strip, FAQ (6, `<details>` accordions), clean footer. Blog section + SEO prose removed.
- `tools/page.tsx`: single focused catalogue page (12 cards + 3 highlights).
- `ProjectDashboard` v2: thumbnail cards, hover actions, **inline rename**, delete-confirm dialog, preset quick-launch dropdown, scratch "Start editing" (no empty-project spam), `.onyx` import, skeleton loading, `timeAgo`.
- `Sidebar` v2 (projects drawer): thumbnails, `Link`-based nav, new URL scheme.
- `SiteHeader` (shared, scroll-aware glass) + `(site)/layout.tsx` simplified.
- Root `layout.tsx`: manifest, icons, apple-web-app, OG metadata inlined, 12-family font link.

## Phase 6 — Quality Gates

- `tsc --noEmit` → **0 errors**.
- ESLint → **0 errors / 0 warnings** (fixed: nested components, setState-in-effect, TDZ access, unescaped entities, unused imports; relaxed `no-explicit-any`/`ban-ts-comment` with justification for Fabric v5 interop).
- `next build` → **4/4 routes static**, `out/` = 3.3 MB.
- Browser smoke test (agent-browser, Chromium):
  - Home/tools/editor load with **zero console errors**.
  - Desktop: rail + panel + canvas verified; text tool → contextual TEXT tab; filters/adjust available on image.
  - Image upload → doc adopted 800×500, Adjust tab auto-opened, layer thumb created, project auto-created (URL rewritten).
  - Export modal → output preview "800 × 500 px", download toast fired.
  - Command palette: opened, fuzzy "fil" → Filter actions.
  - Shortcuts modal via `?`.
  - Mobile 390×844: bottom toolbar + sheet verified; fixed canvas-centering bug found in visual QA; re-verified.
- Visual QA via VLM on home / desktop editor / mobile editor screenshots.

## Phase 7 — Docs & Packaging

- `plan.md`, `worklog.md` (this file), `bugfix.md`, `structure.md`, README v2.0.
- Final zip packaged for delivery.

---

# v2.1 Round — Bug-fix + Feature Sprint (user-reported + subagent bug hunt)

## Phase 8 — User-reported bug fixes

- **First-import background**: doc adopts the image and starts transparent (checkerboard) — no white flash behind moved imports. Browser-verified via pixel analysis (dark checker exposed behind the moved photo).
- **Delete key**: single + multi-select deletion fixed for fabric v5 (ActiveSelection members removed batched, one history entry). Verified: Ctrl+A → Delete → empty state; Ctrl+Z restores everything.
- **Favicon**: user's ICO installed (`src/app/favicon.ico`); all PWA icons (192/512/maskable/apple-touch) regenerated from it.
- **Home footer**: See Other Apps (`links.namansoni.in/namansoni78`) · Made With ❤️ By Naman + GitHub (`github.com/namansoni78`) · Donate (`payment.namansoni.in/payment`) — verified byte-exact with correct `target=_blank rel=noopener noreferrer`.

## Phase 9 — v2.1 features

- **Export**: shape pick (full/circle/round/triangle/star/heart/hex/penta/diamond mask, PNG transparency outside the shape, JPG white fill), exact-pixel resize with aspect lock (lockable, re-lock snaps H to W's aspect), ratio input, 0.5–4× chips + 16K chip (16 384 px / 268 MP device caps; toast reports the real capped size).
- **Shapes**: n-sided polygon + n-point star generators; border-radius slider (rect).
- **Border stacks**: 1–6 concentric borders, gradient ramp (thin→thick, colorA→colorB) or per-border color+width; gap control; wrap/unwrap as a group ("· bordered" layer); rings match scaled images.
- **Fills**: solid / gradient (CSS parsing, up to 5 stops, angle presets 45°/-45°) / tri-gradient+ / image cover-fill on any shape or text.
- **Document background**: color / gradient / transparent / image (cover-fit layer above the frame, listed in Layers, rescales with doc resize, migrates legacy canvas.backgroundImage saves on load).
- **Layers panel**: position slider (0=bottom ↔ top) + arrows + inline rename; index round-trips through setLayerIndex.
- **Aspect management**: Document panel W/H with lock + chips (1:1/4:5/3:2/2:3/16:9/9:16) + presets; content stays centered on resize; EmptyState ratio chips.

## Phase 10 — Parallel bug-hunt subagents (3 hunters) + fixes

Dispatched 3 general-purpose subagents in parallel (canvas core / export+panels / shell+mobile+docs). They returned 40+ real findings; all critical + major + minor fixed (see bugfix.md §E for the full table). Highlights:

- Transparent PNG export filled with the editor backdrop → backgroundColor cleared during capture.
- "To bottom" data loss + hidden objects → live-`_objects` reorder with frame floor; multi-safe.
- New Project kept autosaving into the old project → epoch-keyed remount, with an "adoption" exception (first autosave of a scratch session rewrites the URL without remounting — otherwise the fresh record race WIPED the user's import; found + fixed during verification).
- `saveHistory()` inside the `isLockedRef` lock was a silent no-op → history/autosave moved outside the lock (deletes, border stacks, bg image ops now truly undoable).
- CSS gradient angle semantics (45deg mirrored, corner keywords, turn/rad).
- Ctrl+Z/Y/S/K/D suppressed while typing in DOM inputs (fabric IText still works).
- Mobile: Mask button, re-format existing text, mask-edit cleanup on Done/Esc.
- Export UX: draft inputs (no eaten keystrokes), stale-mode fallbacks, 16K clamp bypass.
- Shell: viewportFit cover, JSON-LD fixes, SW v2.1.0 + offline fallback, touch-visible hover actions, dialog roles, a11y swatch buttons, 50 MB import guard.

## Phase 11 — Verification (all green)

- `tsc --noEmit` → 0 errors · ESLint (React Compiler rules) → 0 errors · `next build` → 4/4 static routes.
- Browser regression (agent-browser + pixel analysis), all ✅: transparent PNG corners [0,0,0,0]; JPG white (not black) with transparent on; To-bottom/backward visibility; bg image layer visible + exported + undoable; doc bg color undo + panel state sync; 45° gradient direction; triangle mask inscribed (not stretched) on 3:2; ring group 744×511 around a 700px image; custom W/H typing; Ctrl+Z-in-input guard; New Project fresh editor (project + scratch paths); adoption race (image + pattern frame + docW survive); multi-select delete + undo.

---

# ONYX v2.2 — Worklog

## Phase 12 — v2.2 feature round (user request)

- **Border stacks up to 1024** — engine rewrite: ALL rings render into ONE offscreen canvas → a single fabric.Image layer inside the ring group (vs 1024 fabric objects). `ringPathFor()` picks ring geometry per target: crop shape → traced shape, circle → ellipse, polygon → n-gon from normalized points, rect → radius-aware rounded rect, else rect. Slider (1–24) + exact N input (1–1024 gradient / 1–64 per-border). Canvas hard-capped at 4096 px/side (iOS-safe), `borderBusyRef` re-entrancy guard, try/catch never poisons it.
- **True shape crop (any object)** — new raster engine (`rasterizeToCanvas` + `rasterizeObjectToImage`): clone → StaticCanvas at zoom m → shape clip via `traceCropPath` with TIGHT bounding box → new fabric.Image with `onyxCropShape` metadata. Rotation/opacity/shadow baked; lock state + name carry over; shadow-aware bound padding. `applyShapeCrop()` = destructive crop for images, shapes, text and groups; borders applied afterwards FOLLOW the cropped outline (circle crop → circle rings, pixel-verified: 735×735, zero corner pixels).
- **Mask panel → Mask & Crop** — segmented Mask (reversible clipPath, now works on ANY object incl. shapes/text) vs Crop (real cut) with 10 shapes + polygon sides stepper (3–20). `cancelMasking()` + a menu-change effect guarantee cleanup through EVERY exit path (rail, palette, tool keys — previously stranded the temp shape on canvas/exports).
- **Adjust / Filter / Crop for shapes & text** — `ensureAdjustableImage()` rasterizes non-images once (busy-guarded, attachment-checked, single undo step) then applies filters; Adjust/Filters panels + desktop rail + mobile toolbar now enable for every object type.
- **Pick export** — new `PickExportModal` (full-viewport, mask-style): drag/resize a region over a live doc snapshot, 10 shape masks with SVG preview, resolution chips (1×/2×/4×/16K) + custom W/H with ratio lock, 16 384 px & 268 MP caps, PNG/JPG/WebP + transparent. `renderDocDataURL()` gained `region` + `shapeSides`. Export button is busy-guarded and only closes on success. Verified: 16 384 × 10 923 circle-mask PNG with 47.6% transparency (geometrically exact).
- **Layers, Canva-style** — rewrote `LayersList`: pointer-drag reordering with live row shifts (⠿ handle), keyboard ↑/↓/Enter support, stable `onyxUid` ids (no remounts, drops never no-op), eye/lock/rename kept. The v2.1 position slider is gone (replaced by the drag the user actually asked for).
- **Transform UX** — 45° rotation snap within 4° (Shift = free) with live angle badge (`45° ✓`, direct-DOM, clamped at viewport top); W×H badge while scaling; Canva-style pink center/edge snap guides drawn on `contextTop` (zero fabric objects, zero history noise); ±45°/±90° chips in Arrange.
- **Mobile selection bar** — animated quick-bar (Copy / Flip ↔ / Flip ↕ / −90° / +90° / Delete) above the toolbar whenever an object is selected; tool sheet now has ONE close affordance (MobileToolbar owns Done; only LAYERS sheet keeps its own handle); `AnimatePresence` exit animation actually plays.
- Shell: polygon export shape (3–20 sides) in Export panel + pick modal, WebP capability gate in both, hero badge v2.2, SW cache `onyx-v2.2.0`.

## Phase 13 — Parallel bug hunt (3 subagents) + fixes

Hunters A (canvas core) / B (panels+export) / C (shell+mobile) returned 24 findings; all triaged and fixed:

- [A1] rasterize in-flight guard (duplicate layers + toast spam on first slider drag).
- [A2] async callbacks re-validate `obj.canvas` + lock ownership TOKENS (undo/delete/selection-change mid-flight can no longer resurrect objects, corrupt history or stomp selection).
- [A3] duplicate/paste keep `CANVAS_EXTRA_PROPS` (border groups stay editable, cropShape/locks/names survive copy).
- [A4] MASK_EDIT cleanup centralized (see above).
- [A5] shadow padding in rasterize (glows no longer clipped).
- [A6] z-order preserved via `insertAt` on crop / rasterize / border apply / unwrap / remove.
- [A7] ring canvas 4096 cap + null-context guard + poison-proof busy flag.
- [A8] hold-compare stashes `{obj, filters}` (stale stash can't leak onto another image).
- [A9] clipPath-masked objects get a "use Crop" hint when bordering.
- [A10] clipboard copy labeled with the real blob MIME.
- [A12] transform badge clamped into the viewport.
- [B1] PickExportModal hoisted OUT of the Export Modal (glass/backdrop-filter made the panel the containing block — picker was 448 px, now verified 1440×900 = viewport).
- [B2] WebP gated by capability in the pick modal.
- [B3] layer reorder via keyboard (↑/↓) + Enter select.
- [B4] Per-border mode clamps count to 64.
- [B5] stable `onyxUid` layer ids.
- [B6] "Square" crop is now a TRUE inscribed square (600×400 → 400×400, verified).
- [B7/B8] pick export busy-guard, close-on-success only, mult reset on region change.
- [B9] aria-pressed on shape/format/resolution chips.
- [C1] one close affordance per sheet; [C2] AnimatePresence exit; [C3] desktop rail/panel open Adjust/Filters/Mask for ANY object; [C4] SW v2.2.0; [C5] hero badge; [C6] plain shortcuts live over range/color inputs (Ctrl+Z after slider touch, Escape/tool keys too) while text inputs + fabric editing stay protected, arrows defer to focused inputs; [C7] locked layers refuse Delete with a toast; [C8] desktop LAYERS rail renders the list; [C9] dead `ExportShapeLocal` + duplicate deps removed.

## Phase 14 — Verification (all green)

- `tsc --noEmit` → 0 errors · ESLint → 0 errors 0 warnings · `next build` → clean, 4/4 static routes.
- Browser regression (agent-browser + pixel analysis): circle crop 400×400 @ (100,0) exact · circle rings 735×735 aspect 1.000, 0 corner px, dense at compass points · 1024 borders in ~1.4 s · layers drag (Circle below Text, canvas + list agree) · rotation drag to 47° → snapped 45° + badge `45° ✓` + hides on release · pick export 16 384×10 923 circle RGBA (corners [0,0,0,0]) · shape adjust rasterize (circle → image + Brightness) · ONE Ctrl+Z restores the vector original (with the slider still focused) · pick modal full-viewport · square crop 400×400 · locked Delete refused.

---

# ONYX v2.3 — Worklog

## Phase 15 — v2.3 feature round

- **WebGL-safe filter engine** — `ensureFilterSafeSource` probes `MAX_TEXTURE_SIZE` and downscales oversized sources (with async JPEG re-encode) before any filter pass; per-tick replay after the async swap; `_element === _originalElement` invariant maintained through the swap; safe re-run after every `loadFromJSON` (undo/redo + project loads). This is the fix for "fresh import + brightness → image 1/4 visible or gone".
- **Custom export** — the 16K chip became a Custom button (exact W/H, ratio lock, caps kept) in BOTH ExportPanel and PickExportModal; flicker-free strip rendering, async blob pipeline, blank detection + half-res retry, export overlay.
- **Gradient shadows** — ShadowFxBuilder: solid/gradient recolor of the object's silhouette, any direction + offset + spread for 360° coverage, screen-convention direction pad.
- **Gradient borders** — single borders AND per-ring gradients in stacks (custom mode pads short arrays with white 6px defaults).
- Mask = square ring on pseudo-bounds; crop = contour-following ring (intended asymmetry).

## Phase 16 — Round 2 bug hunt (3 subagents) — 20 fixes

See bugfix.md #77–96.

## Phase 17 — Round 3 final QA hunt (3 subagents) — 20 more fixes

Two HIGH history bugs (filter provenance lost on undo → preset stacking; slider reset never committed → "image disappears after adjust + undo"), two HIGH export bugs (ratio-flip capture oversample → legal exports failed blank; concurrent exports → renderer OOM), plus hold-compare leaks, remove-color commit, slider key coverage, Blur collision, no-op commit collapse, pick-modal custom-height reset, exponential draft parsing, region doc-edge clamp, clipboard fail-fast, README/SW versioning, 1024-ring low-m distortion, shadow 3σ pad, isotropic spread, gradient-stroke re-seed, history memory budget. See bugfix.md #97–116.

## Phase 18 — Verification (all green)

- `tsc --noEmit` 0 errors · ESLint 0/0 · `next build` 4/4 static routes.
- Browser regression on the fresh build, all ✅: brightness on fresh import (full circle intact, 99.5k px); 9000×9000 oversize import + brightness (GPU limit 8192 — full circle, elements healthy); rapid multi-slider sweep (brightness/contrast/saturation/hue/blur) — circular profile intact by per-band analysis; adjust → Ctrl+Z reverts the filter with the image ALIVE; preset-after-undo replaces (no Grayscale/Sepia stacking — `onyxFilterMeta.slots` verified after round-trip); ratio-flip custom export 6000×750 → 2000×16000 exports non-blank; export busy guard blocks double export; 24-ring gradient stack renders (4099px part, +3 guard); gradient shadow spread-50 blur-25 builds a 3-layer merged group, undo→"bordered", redo→"bordered + shadow"; double-click reset commits (undo restores value, image alive); zero page errors.

## Phase 19 — v2.4 mobile overhaul (this round)

Phone-first redesign of the whole editing shell — the multi-border feature (and every other tool) is now genuinely usable one-handed.

- **MobileSheet** (new, CanvasEditor): peek/tall snap points, tap-header toggle, drag-to-dismiss (useDragControls — content scrolling unaffected), opaque `.sheet-solid`, live height reporting → the canvas viewport pads by the sheet height and the ResizeObserver refits the document ABOVE the sheet (the artwork is always visible while editing). Zoom cluster hides while a sheet is open.
- **Contextual MobileToolbar**: nothing selected → creation tools; object selected → quick-bar (Copy/Flip/±90°/Delete) + EDITING tools first (Adjust/Filter/Style/Mask/Crop/Arrange) with creation tools still reachable; sheet open → Done + live tool switching without closing (MASK_EDIT guarded). Exactly one Done affordance at all times.
- **Multi-border rebuilt** (BorderStackBuilder): ring chips row with live color previews + [+] add; one-ring-at-a-time editor with 44px steppers (StepBtn), move/duplicate/delete per ring, per-ring gradient (two swatches + angle slider), first entry seeds a ramp from the current gradient colors (NaN-guarded); sticky Apply/Update bar (StickyBar) never buried under the list; per-border entry auto-expands the sheet (onyx:expand-sheet event).
- **Touch ergonomics**: 24px slider thumbs + 6px track on coarse pointers, 38–44px chips/buttons/steppers everywhere, bigger ColorPicker swatches (40px) with fade-mask hint, StylePanel tab strip as tappable chips, CropModal 44px actions, TopBar 44px targets + h-14 mobile header + safe-area top inset (PWA status bar), EmptyState overlay no longer eats canvas pointer events (Draw works on an empty doc) and its card scrolls on short viewports, Export modal sticky Download bar.
- **Engine hardening ported from the aborted v2.3.1 tree**: patchGlApplyFilters (GL throw during loadFromJSON no longer opens projects empty), restoreFiltersDeep (nested ring/shadow-group images get the guarded filter pass after undo/redo/reload), border/raster busy-guard in syncFromObject (mid-Apply selection transients no longer close the sheet / blank the panel), DRAW disarm on every sheet-close path, ExportPanel custom-size invalid-commit clears BOTH axes, Slider ↺ reset button, AdjustPanel Reset-all, setSubTool reset on fresh objects + STYLE auto-open.
- **New bug fixes found by the 3-hunter QA round**: holdCompare(false) on a non-image selection no longer rasterizes it (switching away from Adjust destroyed shapes/border stacks — critical); syncFromObject isMobile closure fixed via ref (desktop auto-open fired on phones); transparent ramp endpoints no longer poison ring colors with NaN (both mixers guarded); GradientStroke direction reset commit uses the fresh value; shadow-pad active dot highlight restored.

---

# ONYX v2.5 — Worklog

## Phase 20 — v2.5 round: autosave flash, border UX rebuild, mask/crop split, contour borders, radial gradients

- **Autosave without the blank flash**: `doSave` now (1) runs its heavy work (JSON stringify + thumbnail capture) inside `requestIdleCallback` (timeout 600ms, setTimeout fallback) so it never blocks mid-interaction, (2) reuses the LAST history snapshot (`lastJsonRef`, invalidated on `text:changed`, kept fresh by `restoreEntry` on undo/redo) instead of re-stringifying a multi-MB canvas a second time, (3) repaints the canvas after saving (discarded-backing-store insurance). `renderDocDataURL`/`renderDocBlob` no longer discard/restore the active object around captures (fabric's `toCanvasElement` renders with `interactive=false` — controls are never in the capture; the churn fired selection events on every autosave thumbnail). Save-concurrency guards (`saveInFlightRef`/`saveAgainRef`) coalesce overlapping passes so the LAST change always lands.
- **Border tab rebuild**: Single / Multi-border mode chips (Single = default; a multi-ring object opens straight into Multi). `border-single`/`border-multi` subTool values; syncFromObject drops stale border-_* modes when the selection changes; the Width slider keeps a local drag value so the async contour re-seeds never snap the thumb.
- **Multi-border auto-apply**: the Apply/Update button is GONE. Every tweak debounces 350ms into `applyBorderStack(cfg, {quiet:true})`; a rebuild arriving mid-flight is QUEUED (`pendingRingRef` + target core) and flushed by `rewrapWithAttachments` when idle, with a stale-target guard (a queued cfg is dropped if the user selected a different object meanwhile). `rewrapWithAttachments` gained `{quiet}` (no toast spam on auto-applies).
- **Sheet-closing race fixed (critical)**: `c.remove(activeGroup)` fires `selection:cleared` synchronously DURING the unwrap — before `rewrapWithAttachments` set `borderBusyRef`, so every border/shadow apply read as a user deselect and closed the mobile sheet mid-apply. `applyBorderStack`/`applyShadowFx` now OWN the busy flag through the unwrap (handedOff pattern; aborts clear it), `removeBorderStack`/`removeShadowFx` mirror it.
- **Mask vs Crop split**: MaskPanel is mask-only (header "Mask", 5 reversible shapes, copy pointing at Crop for real cuts). The REAL shape cuts (circle/square/rounded/triangle/star/heart/hex/penta/diamond/N-gon + sides stepper) moved into the Crop screen — a one-tap shape row at the bottom of the fullscreen cropper; `onShapeCrop` closes the modal and runs `applyShapeCrop`. Rail labels, shortcut sheet and PANEL_TITLES updated.
- **Contour borders on shape crops**: a circle-cropped (or any shape-cropped) object's plain single border now hugs the cut contour EXACTLY — `updateStyle('strokeW'/'strokeC')`, `setObjectGradientStroke` and `setObjectSolidStroke` route through `applyContourStroke` (a one-ring `custom` stack traced by `ringPathFor` along `onyxCropShape`), falling back to the plain fabric stroke for non-cropped objects. Width 0 removes the ring; the picked color is remembered on the core; `syncFromObject` seeds the Width/Color controls from a one-ring cfg; GradientStrokeSection seeds its colors/type from the ring gradient.
- **Radial gradients**: `makeCtxGradient` gained a `type:'radial'` path (center → max(w,h)/2). Per-ring multi-border gradients (Linear/Radial chips, angle slider hidden for radial), the single gradient border (`radial-gradient(circle, a, b)` through the existing CSS parser), and gradient shadows (`gradType`) all support it. RingChip previews render radial correctly. `BorderRing.gradient`/`ShadowFxConfig` types extended; round-trips through project JSON verified.
- README v2.5 section + SW bumped to onyx-v2.5.0.

## Phase 21 — verification (all green)

- `tsc --noEmit` 0 errors · `next build` 4/4 static routes clean.
- Mobile 390×844 browser regression: circle crop → Width 10 → perfect CIRCULAR ring (pixel-verified: 16-ray scan, 0/4 corner pixels, aspect 1.000); border tab opens with Single active; Multi auto-applies count 3→5 with NO apply button and the sheet STAYS OPEN through the rebuild (the race fix); radial gradient on ring 1 round-trips through autosave + project reload (`type:'radial'` intact after reload); undo/redo restores/re-creates the ring group; autosave probe over 3s after a change: zero blank frames, selection survives, badge "Saved"; Mask sheet mask-only; Crop screen shows the full shape row; desktop rail labels correct. Zero page errors.

## Phase 22 — Round 4 QA hunt (3 subagents, 20 findings) — all fixed

- [A1] `lastJsonRef` autosave cache is invalidated by EVERY commit-less mutation (updateStyle, handleTextFormat) — picking a border/shadow/text color no longer risks persisting the pre-change canvas on the next debounced save.
- [A2/A4] Contour-stroke patches arriving inside the unwrap→regroup window (the live selection briefly points at a destroyed group) now merge against `busyCoreRef`/`busyRingCfgRef` — Width re-drags and the GradientStrokeSection's width+gradient one-two punch always land (the gradient is no longer swallowed into a white ring).
- [A3] Width→0 racing an in-flight rebuild queues a REMOVE intent (`pendingRingRemoveRef`) that the flush honors — dragging the width to 0 always ends borderless, the stale queued ring can't resurrect.
- [A5] Removing an existing contour ring remembers its color on the core (Width 5→0→5 keeps the color).
- [A6] `doSave`'s heavy pass re-checks `isLockedRef` after the idle wait — an undo/project-load during the window defers the save instead of persisting a torn state.
- [B1] The builder keeps the edited RING CHIP selected across auto-apply echoes (the rebuild's new group used to reset the editor to Border 1 mid-drag).
- [B2] A tweak still inside its 350ms debounce window is FLUSHED when the builder unmounts (switching chips/Done/objects) — "auto-applies" now always means it.
- [B3] Border mode is sticky across ring rebuilds: syncFromObject compares CORE identity, so the rebuilt group no longer reads as a new object (no more mid-edit ejection to Single).
- [B4] Single-mode controls on a multi-ring stack replaced by an honest info panel (Edit in Multi-border / Remove borders) — they were a placebo (group ignores strokeWidth) or destructive (contour path flattened the stack).
- [B5] Gradient shadow presets pin `gradType: 'linear'` — a Radial left active can't silently swallow a preset's direction.
- [B6] Re-clicking the active Style tab is a no-op (it used to discard an explicit Single/Multi choice).
- [B7] The gradient-border toggle is DERIVED from the object's live stroke/ring — picking a solid color no longer leaves the toggle lying ON.
- [B8] `localW` clears when the selection vanishes (no stale width leaking to the next object).
- [C1] Tall sheet capped at `max(30dvh, min(62dvh, 100dvh-470px))` — the canvas keeps ~200-290px (was pinned to the 160px floor at zoom 0.04-0.07, editing borders blind); verified 287px @ z 0.182 on 390×844.
- [C2/C3] Contour applies are debounced 250ms and MERGED — one ring rebuild per pause instead of one per slider tick (history + phone jank).
- [C4] CropModal + PickExportModal headers respect the top safe-area inset (notched-phone PWAs).
- [C5] Stray README.md.new removed.
- [C6] Crop during MASK_EDIT is refused with a toast (used to rasterize + leak the temp mask shape).
- [C7] Chip exposes aria-pressed for toggle chips; [C8] crop ratio row left-aligned (no first-chip clipping on ≤349px); [C9] command-palette crop label aligned.

## Phase 23 — re-verification (all green)

Mobile 390×844: Single chip default (aria-pressed) → plain image keeps the plain stroke · circle crop → Width 12 → contour ring group, sheet open · gradient toggle first tap lands the gradient ring at width 12 (A4) · Multi auto-apply count 1→3 · Per-border ring 3 thickness 20 → echo keeps Border 3 selected (B1) · tall-sheet canvas 287px @ zoom 0.182 (C1) · undo/redo of the ring tweak exact · zero page errors. tsc 0 errors, build 4/4 routes.
