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
