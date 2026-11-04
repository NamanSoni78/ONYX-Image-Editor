# ONYX v2.0 — Project Structure

> File map + short docs for future agents (or future you).
> Stack: **Next.js 16 (App Router, static export) · React 19 · Tailwind v4 · Fabric.js 5 · framer-motion · IndexedDB (idb) · react-cropper**
> Golden rule: **everything runs client-side; there is no server runtime.** (`output: 'export'`)

```
ONYX-Image-Editor-main/
├── plan.md                      ← v2.0 upgrade plan (goals, decisions, file plan)
├── worklog.md                   ← chronological log of all v2.0 work
├── bugfix.md                    ← bugs fixed + breaking changes + known limits
├── structure.md                 ← this file
├── next.config.ts               ← static export, images.unoptimized
├── vercel.json                  ← security headers + SW headers (static export ignores next headers())
├── package.json                 ← v2.0.0
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
    │   ├── globals.css          ← design system: Onyx tokens, scrollbars, .glass/.checkerboard/.grid-bg/.mask-fade-x/.focus-ring, range inputs, reduced-motion
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
    │   │   ├── CanvasEditor.tsx     ← THE ENGINE (only 'use client' fabric logic): document-frame canvas, zoom/pan (wheel+pinch+space), history(50), keyboard map, paste/drag-drop, scratch mode + autosave, filter stack, export capture, adaptive layout. Exposes everything via EditorContext
    │   │   ├── EditorContext.tsx    ← EditorAPI type + provider + useEditor() (40+ members: state + actions)
    │   │   ├── constants.ts         ← FONTS, DOC_PRESETS, FILTER_PRESETS(15, css previews), ADJUSTMENTS(6), STICKERS, EditorState, SHORTCUTS(31)
    │   │   ├── TopBar.tsx           ← logo, inline project rename, save-state pill, undo/redo, zoom%, palette btn, Export
    │   │   ├── DesktopRail.tsx      ← left vertical tool rail (md+): 13 tools, Tooltip+shortcut, contextual disable (needs image/object)
    │   │   ├── PropertiesPanel.tsx  ← right panel (md+): contextual tab chips (image/text/shape/none) + tool content + collapsible layers
    │   │   ├── MobileToolbar.tsx    ← bottom toolbar (<md): scrollable icon row with fade mask; contextual tool groups
    │   │   ├── LayersPanel.tsx      ← LayersList (shared): thumbs, name, eye, lock, order buttons
    │   │   ├── ZoomControls.tsx     ← floating −/%/+/fit cluster (bottom-right of canvas)
    │   │   ├── EmptyState.tsx       ← onboarding overlay: dropzone + 6 social presets (hidden once layers exist)
    │   │   ├── ExportPanel.tsx      ← modal: PNG/JPG/WebP(feature-detected), quality, 0.5–3× + custom width, transparent PNG, copy-to-clipboard, live dims
    │   │   ├── ShortcutsModal.tsx   ← "?" cheat sheet from SHORTCUTS
    │   │   ├── CommandPalette.tsx   ← Ctrl+K fuzzy actions (tools, filters, presets, zoom, help)
    │   │   ├── CropModal.tsx        ← react-cropper fullscreen + ratio chips
    │   │   ├── EditorClient.tsx     ← dynamic(ssr:false) + Suspense wrapper (searchParams live in CanvasEditor)
    │   │   └── panels/
    │   │       └── ToolPanels.tsx   ← 13 panel contents (Add/Document/BG/Text/Shape/Draw/Sticker/Adjust/Filter/Mask/MaskEdit/Arrange/Style) + renderToolPanel() + PANEL_TITLES — used by BOTH desktop panel & mobile sheets
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
    └── lib/
        ├── storage.ts           ← IndexedDB via idb: projects {id,name,thumbnail,lastModified,data,docW,docH}; create/get/getAll/update/delete/rename/import (.onyx JSON)
        ├── fonts.ts             ← MORE_FONTS (6 extra) + idempotent loadFonts()
        ├── features.ts          ← TOOLS catalogue data for /tools page (12 entries)
        ├── schema.ts            ← JsonLd generators (org/website/softwareapp/faq)
        └── seo-metadata.ts      ← generateMetadata helper for site pages
```

## Key data flows

- **Editor state**: `CanvasEditor` owns fabric + React state → exposes `api` object through `EditorContext` → every panel/toolbar reads `useEditor()`. Fabric is the source of truth for objects; `EditorState` mirrors the *selection's* props (synced by `syncFromObject`).
- **Document model**: `onyx-frame` fabric.Rect = the document. Canvas element stays viewport-sized; zoom/pan = `viewportTransform`. First image adopts its pixel size; presets (`?preset=`) or Document panel can resize. Export/thumbnails: resize canvas → identity transform → capture → restore (`renderDocDataURL`).
- **Persistence**: any mutation → `scheduleSaveRef` (1.1 s debounce) → `doSave` → (scratch? create project + `history.replaceState`) → `updateProject(data, thumb, name, {docW,docH})`.
- **History**: `{json, w, h}` snapshots, max 50, `isLockedRef` guards restore loops.

## Conventions to keep

1. No new server runtime — anything new must work in `output: 'export'`.
2. Fabric v5 typings lag → `as any`/`@ts-ignore` is accepted interop (see eslint.config.mjs note); prefer tagging custom filter props (`onyxPreset`, `onyxRemove`).
3. Panel content goes in `panels/ToolPanels.tsx` so desktop and mobile stay in sync.
4. New keyboard shortcuts must be added to `SHORTCUTS` in `constants.ts` (single source for the cheat sheet) and guarded by `isTyping()`.
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
