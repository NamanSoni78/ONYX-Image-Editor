# ONYX v2.2 — Project Structure

> File map + short docs for future agents (or future you).
> Stack: **Next.js 16 (App Router, static export) · React 19 · Tailwind v4 · Fabric.js 5 · framer-motion · IndexedDB (idb) · react-cropper**
> Golden rule: **everything runs client-side; there is no server runtime.** (`output: 'export'`)

```
ONYX-Image-Editor-main/
├── plan.md                      ← v2.0 plan + v2.1 round goals
├── worklog.md                   ← chronological log (v2.0 phases 1-7 + v2.1 phases 8-11)
├── bugfix.md                    ← bugs fixed + breaking changes + known limits (v2.0 §A-D + v2.1 §E)
├── structure.md                 ← this file
├── next.config.ts               ← static export, images.unoptimized
├── vercel.json                  ← security headers + SW headers (static export ignores next headers())
├── package.json                 ← v2.1.0
├── LICENSE                      ← MIT
├── eslint.config.mjs            ← next presets; any/ts-comment relaxed for Fabric v5 interop
├── tsconfig.json
│
├── public/                      ← served as-is / precached by SW
│   ├── manifest.webmanifest     ← PWA manifest (icons, standalone, start /editor)
│   ├── sw.js                    ← service worker (shell precache, cache-first _next/static, SWR fonts)
│   ├── offline.html             ← SW offline fallback page
│   ├── icon-192/512.png, icon-maskable-512.png, apple-touch-icon.png
│   ├── og-image.jpg             ← social share card
│   ├── robots.txt · sitemap.xml ← 3 URLs: /, /editor, /tools
│   └── screenshots/             ← README asset
│
└── src/
    ├── app/
    │   ├── layout.tsx           ← root: Geist fonts, metadata + manifest + icons, 12-family Google font link (canvas text), JsonLd, PwaRegister
    │   ├── globals.css (incl. .sheet-solid, .safe-area-pt, coarse-pointer slider thumbs)          ← design system: Onyx tokens, scrollbars, .glass/.checkerboard/.grid-bg/.mask-fade-x/.focus-ring, range inputs, reduced-motion
    │   ├── editor/
    │   │   └── page.tsx         ← STATIC editor page (sr-only h1 + <EditorClient/>)
    │   └── (site)/
    │       ├── layout.tsx       ← thin shell (pages own their headers/footers)
    │       ├── page.tsx         ← HOME v2: hero → ProjectDashboard → tools strip → FAQ → footer
    │       ├── tools/page.tsx   ← single tools catalogue (12 cards → /editor)
    │       └── _not-found.tsx   ← styled 404
    │
    ├── components/
    │   ├── Editor/
    │   │   ├── CanvasEditor.tsx     ← THE ENGINE (only 'use client' fabric logic): document-frame canvas, zoom/pan (wheel+pinch+space), history(50), keyboard map, paste/drag-drop, scratch mode + autosave, filter stack, export capture (shape masks / exact px / 16K caps), bg system (color/gradient/checker/image-layer), border stacks, gradient+image fills, layer index API, order ops (frame-safe), adaptive layout, MobileSheet (peek/tall bottom sheet with drag-dismiss + live canvas refit above it). Exposes everything via EditorContext
    │   │   ├── EditorContext.tsx    ← EditorAPI type + provider + useEditor() (40+ members: state + actions; DocBg, ExportShape, BorderStackConfig, LayerInfo types)
    │   │   ├── constants.ts         ← FONTS, DOC_PRESETS, FILTER_PRESETS(15), ADJUSTMENTS(6), STICKERS, EditorState, SHORTCUTS(32)
    │   │   ├── TopBar.tsx           ← logo, inline project rename, save-state pill, undo/redo, zoom%, palette btn, Export · mobile: h-14 + 44px targets + safe-area top (PWA status bar)
    │   │   ├── DesktopRail.tsx      ← left vertical tool rail (md+): 15 tools (incl. Document + BG), Tooltip+shortcut, contextual disable (needs image/object)
    │   │   ├── PropertiesPanel.tsx  ← right panel (md+): contextual tab chips (image/text/shape/none) + tool content + collapsible layers
    │   │   ├── MobileToolbar.tsx    ← CONTEXTUAL bottom toolbar (<md): empty → creation tools; object selected → quick-bar (Copy/Flip↕↔/±90°/Delete) + EDITING tools first (Adjust/Filter/Style/Mask/Crop/Arrange); sheet open → Done + live tool switching (MASK_EDIT guarded); single Done affordance
    │   │   ├── LayersPanel.tsx      ← LayersList (shared): Canva-style drag-to-reorder (⠿ handle + keyboard ↑/↓), thumbs, inline rename, eye, lock
    │   │   ├── ZoomControls.tsx     ← floating −/%/+/fit cluster (bottom-right of canvas; hidden while a mobile sheet is open)
    │   │   ├── EmptyState.tsx       ← onboarding overlay: dropzone + presets + ratio chips incl. 2:3 (hidden once layers exist)
    │   │   ├── ExportPanel.tsx      ← modal: PNG/JPG/WebP, quality, 0.5–4× + 16K chips + ratio input, exact-px resize (aspect lock), shape pick (9 masks), transparent PNG, copy-to-clipboard, live capped dims
    │   │   ├── ShortcutsModal.tsx   ← "?" cheat sheet from SHORTCUTS
    │   │   ├── CommandPalette.tsx   ← Ctrl+K fuzzy actions (tools, filters, presets, zoom, help)
    │   │   ├── CropModal.tsx        ← react-cropper fullscreen + ratio chips + Escape + ready-guard
    │   │   ├── PickExportModal.tsx  ← full-viewport region picker: drag/resize box over a doc snapshot, shape masks (incl. n-gon), resolution to 16K, busy-guarded export
    │   │   ├── EditorClient.tsx     ← dynamic(ssr:false) + Suspense + epoch-keyed remount on document switches (adoption-aware: URL rewrite on first scratch autosave does NOT remount)
    │   │   └── panels/
    │   │       └── ToolPanels.tsx   ← 13 panel contents (Add/Document/BG/Text/Shape/Draw/Sticker/Adjust/Filter/Mask/MaskEdit/Arrange/Style — Shape has n-gon/star, Style has fills + BorderStackBuilder) + renderToolPanel() + PANEL_TITLES — used by BOTH desktop panel & mobile sheets
    │   ├── Home/
    │   │   ├── ProjectDashboard.tsx ← 'use client': project grid (thumbs, hover actions, inline rename, delete confirm), preset quick-launch, scratch start, .onyx import/export
    │   │   ├── FaqSection.tsx       ← 6 FAQs, <details> accordions + FAQPage JsonLd
    │   │   └── toolsIcons.tsx       ← icon map for tool cards
    │   ├── Layout/
    │   │   ├── SiteHeader.tsx       ← shared marketing header (scroll glass, mobile menu)
    │   │   └── Sidebar.tsx          ← editor projects drawer (mobile + shared): thumbnails, Link nav, delete
    │   ├── Seo/JsonLd.tsx           ← JSON-LD injector
    │   ├── PwaRegister.tsx          ← registers /sw.js in production
    │   └── ui/
    │       ├── Toast.tsx            ← ToastProvider + useToast (success/error/info/warning)
    │       ├── Tooltip.tsx          ← CSS-only tooltip with kbd shortcut chip (hover devices)
    │       ├── Modal.tsx            ← responsive modal: bottom-sheet (mobile) / dialog (desktop), Esc+backdrop
    │       ├── Slider.tsx           ← label/value chip/format/defaultVal(dbl-click reset)/onCommit
    │       ├── ColorPicker.tsx      ← eyedropper + transparent + swatches
    │       ├── GradientPicker.tsx   ← presets + custom builder (optional onCustomGradient for compat)
    │       ├── CustomGradientBuilder.tsx
    │       └── IconBtn.tsx          ← (legacy v1 helper, still exported)
    │
    │   └── lib/
    │       ├── storage.ts           ← IndexedDB via idb: projects {id,name,thumbnail,lastModified,data,docW,docH}; import keeps docW/docH
    │       ├── fonts.ts             ← MORE_FONTS (6 extra) + idempotent loadFonts()
    │       ├── features.ts          ← TOOLS catalogue data for /tools page (12 entries)
    │       ├── schema.ts            ← JsonLd generators (org/website/softwareapp/faq)
    │       └── seo-metadata.ts      ← generateMetadata helper for site pages
    ```

## Key data flows

- **Editor state**: `CanvasEditor` owns fabric + React state → exposes `api` object through `EditorContext` → every panel/toolbar reads `useEditor()`. Fabric is the source of truth for objects; `EditorState` mirrors the *selection's* props (synced by `syncFromObject`).
- **Document model**: `onyx-frame` fabric.Rect = the document. Canvas element stays viewport-sized; zoom/pan = `viewportTransform`. First image adopts its pixel size and starts the doc TRANSPARENT (`onyxBgTransparent`); presets (`?preset=`) or Document panel can resize (content centered, frame gradient rebuilt). Export/thumbnails: resize canvas → identity transform → capture → restore (`renderDocDataURL`, clears `backgroundColor` for transparent captures, returns real capped `{url,w,h}`).
- **Persistence**: any mutation → `scheduleSaveRef` (1.1 s debounce) → `doSave` → (scratch? create project + mark `window.__onyxAdoptedPid` + `history.replaceState`) → `updateProject(data, thumb, name, {docW,docH})`. Remount policy lives in `EditorClient` (epoch key; adoption never remounts).
- **History**: `{json, w, h}` snapshots, max 50, `isLockedRef` guards restore loops. **Never call `saveHistory()` while `isLockedRef.current` is true — it silently no-ops** (commit history AFTER the lock).
- **Backgrounds**: color/gradient bake into the frame fill (`onyxBgCss` round-trips the CSS); transparent = checker Pattern + `onyxBgTransparent` flag; image = cover-fit fabric.Image layer flagged `onyxBgImage` directly above the frame (never `canvas.backgroundImage` — that renders under the frame).
- **Ordering**: fabric's sendToBack/sendBackwards can drop objects BELOW the frame → all order ops use the live `_objects` array with `frameIdx + 1` as the floor (`apiOrder`, `setLayerIndex`).

## Conventions to keep

1. No new server runtime — anything new must work in `output: 'export'`.
2. Fabric v5 typings lag → `as any`/`@ts-ignore` is accepted interop (see eslint.config.mjs note); prefer tagging custom filter props (`onyxPreset`, `onyxRemove`).
3. Panel content goes in `panels/ToolPanels.tsx` so desktop and mobile stay in sync.
4. New keyboard shortcuts must be added to `SHORTCUTS` in `constants.ts` (single source for the cheat sheet) and guarded by `isTyping()` / `domTyping()` (canvas-level combos must never fire in DOM inputs).
5. Use `toast()` for feedback; never `alert/confirm/prompt`.
6. New pages: static, add to `public/sitemap.xml` + nav.

## Local dev

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # static export → out/  (zero server functions)
npx tsc --noEmit   # type gate
npx eslint src     # lint gate (0/0 expected)
```

Serve the export locally with clean-URL mapping if needed (python http.server requires `.html`):
`cd out && python3 -m http.server 4173` → open `/editor.html`.
