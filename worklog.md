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
