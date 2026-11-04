# ONYX Image Editor — v2.0 Upgrade Plan

> **Status:** Approved & In Progress
> **Scope:** Full UX/UI overhaul + feature expansion + performance & hosting-cost optimization
> **Baseline:** v1 (commit state as received, live at onyx.namansoni.in)

---

## 1. Goals

| # | Goal | Success Criteria |
|---|------|------------------|
| G1 | Professional editor UX on **desktop** | Figma/Photoshop-style layout: top bar, left tool rail w/ tooltips + shortcuts, center canvas with zoom/pan, right contextual properties panel |
| G2 | Native-feeling **mobile** UX | Bottom toolbar, bottom-sheet tool panels, pinch-to-zoom the *document*, thumb-reachable controls, safe-area aware |
| G3 | Real image-editor document model | Canvas = fixed-size document (not the screen), true-resolution export, fit/100% zoom, pan |
| G4 | More functionality | Shortcuts, command palette, before/after compare, clipboard copy, WebP export, transparent PNG, layer thumbnails/visibility/lock, align tools, onboarding presets, drag-drop & paste, toasts |
| G5 | Kill the SEO content sprawl | Remove `/blog`, `/compare`, all `/tools/[slug]` programmatic pages, blog section + SEO prose on home. Keep one clean `/tools` page |
| G6 | Protect Vercel free-tier limits | **Static export** (`output: 'export'`) → 0 serverless function invocations, 0 Fluid-CPU drain; PWA service worker for repeat visits |
| G7 | Faster, lighter pages | Trim Google Fonts payload (34 families → 12), CSS-only hero art, no new heavy deps |

### Non-Goals (explicitly out of scope for v2.0)

- AI/background removal (server-side or WASM ML) — future version
- Multi-page documents, CMYK, RAW formats
- Team/collaboration features
- Light theme (image editors are dark by industry convention; dark-only, polished)

---

## 2. Design Direction (researched)

- **Reference patterns:** Figma (left rail + right properties + toolbar), Photopea/Photoshop (zoom + shortcuts), Canva mobile (bottom sheets), Apple Photos (contextual controls)
- **Theme:** "Onyx Studio" — near-black neutral surfaces (`#09090B` → `#18181B` zinc ramp), 1px white/8% borders, **blue→violet brand gradient** kept, accent `#6366F1` family for interactive states
- **Type:** Geist Sans (already in repo) — UI 12/13px, labels 10px uppercase tracking-wider
- **Motion:** framer-motion springs only where they aid orientation (panels, sheets); `prefers-reduced-motion` respected
- **Touch targets:** ≥ 44px on mobile; icon buttons 40px on desktop with tooltip + shortcut hint

---

## 3. Architecture Decisions

### 3.1 Static export (G6)

```
next.config.ts:  output: 'export',  images: { unoptimized: true }
```

- All pages become static HTML on Vercel's CDN → **no SSR function invocations at all**
- Security headers move from `next.config.ts headers()` (ignored in export) → `vercel.json`
- `/editor/[id]` (dynamic, was the only per-request SSR route) is replaced by **`/editor?project=<id>`** read client-side. Old deep links 404 — documented as a v2 breaking change; dashboard/sidebar links updated

### 3.2 Document-based canvas (G3)

- Fabric canvas element stays viewport-sized; a **frame rect** (`name: 'onyx-frame'`) represents the document (1080×1080 default, adopts first image's pixel size, or preset from `?preset=`)
- `viewportTransform` drives zoom/pan; export temporarily resets VCT + resizes canvas to doc dimensions → pixel-true output
- Old v1 projects: on load, document = legacy canvas size, frame auto-inserted (backward compatible)

### 3.3 Component architecture

```
CanvasEditor (state + fabric logic, the only 'use client' engine)
├── EditorContext        — typed context: state + action api
├── TopBar               — logo, rename, save-state, undo/redo, zoom %, export
├── DesktopRail (md+)    — vertical tool rail → opens PropertiesPanel tab
├── PropertiesPanel (md+)— contextual tabs (Adjust/Filters/Style/Text/Transform/Document) + Layers
├── MobileToolbar (<md)  — horizontal icon bar → bottom sheets
├── ZoomControls         — floating −/+/fit/100% + % readout
├── EmptyState           — onboarding dropzone + size presets
├── ExportPanel (modal)  — PNG/JPG/WebP, quality, scale, transparent, copy-to-clipboard
├── LayersPanel (mobile) — sheet version of layers
├── ShortcutsModal       — "?" cheat sheet
├── CommandPalette       — Ctrl+K action search
└── panels/ToolPanels    — shared panel content used by BOTH desktop panel & mobile sheets
```

- **Scratch mode:** `/editor` without `?project` starts unsaved; first edit creates the IndexedDB project and rewrites the URL (`history.replaceState`) — no more empty-project spam

### 3.4 Filter engine fix

- Filters are managed as a **typed stack keyed by filter type** (adjustments never clobber the preset filter, and vice-versa)
- Adjustment sliders read live state from the selected image's actual filter stack (v1 always reset to 0 — bug)

---

## 4. Feature Matrix (v1 → v2)

| Area | v1 | v2 |
|------|----|----|
| Layout | One mobile-style bottom toolbar for everyone | Adaptive: desktop rail+panel / mobile toolbar+sheets |
| Canvas | Screen-sized (exports were screen-res) | Document model, true-resolution export |
| Zoom/Pan | None (pinch scaled the *object*) | Wheel/pinch zoom of viewport, space/middle-drag pan, fit/100% |
| Input | File pickers only | Drag-drop, clipboard paste (image + text), file picker |
| Export | PNG/JPG, fixed dims | + WebP, quality, 0.5×–3× scale, transparent PNG, filename from project, copy-to-clipboard |
| Adjustments | 4 sliders, state desync bug | Brightness/Contrast/Saturation/Hue/Blur/Noise + remove-color w/ picker, live-synced |
| Filters | 13 presets, wipe adjustments | 13 presets + 15 gradient thumbnails, stack-safe |
| Compare | – | Hold-to-compare original |
| Layers | List + up/down | + thumbnails, visibility, lock, drag-reorder, delete |
| Align | – | Align L/C/R/T/M/B to document |
| Transform | – | X/Y/W/H/angle numeric inputs, rotate ±90, flips |
| Shortcuts | 3 (undo/redo/dup) | 20+ with cheat-sheet (`?`) |
| Command palette | – | Ctrl+K fuzzy actions |
| Onboarding | Blank canvas | Dropzone + social-size presets (also from home & `?preset=`) |
| Feedback | `alert/confirm/prompt` | Toasts + inline UI + confirm modals |
| Projects | Created eagerly (empty spam) | Scratch mode, inline rename, auto-name from filename |
| Offline | Claimed, not real | Service worker + manifest (installable PWA) |
| Pages | Home, blog hub+4 posts, compare hub+3, tools hub+11 slugs+resize/convert slugs | Home, /tools, /editor — 3 focused pages |
| Fonts | 34 Google families blocking | 12 curated families |

---

## 5. File Plan

**Delete:** `src/app/(site)/blog/**`, `src/app/(site)/compare/**`, `src/app/(site)/tools/[slug]/**`, `src/app/(site)/tools/resize/**`, `src/app/(site)/tools/convert/**`, `src/app/editor/[id]/`, `src/lib/blog.ts`, `src/lib/comparisons.ts`, `src/app/Tempsitemap.ts`, `src/app/Temprobots.ts`, `V7.html`, `dev.log`, `prompt.txt`, unused `public/*.svg`

**Rewrite:** `CanvasEditor.tsx`, `Toolbar.tsx → MobileToolbar.tsx`, `LayersPanel.tsx`, `ExportPanel.tsx`, `constants.ts`, `globals.css`, `(site)/page.tsx`, `tools/page.tsx`, `ProjectDashboard.tsx`, `Sidebar.tsx`, `layout.tsx`, `next.config.ts`, `storage.ts` (minor), `README.md`

**Create:** `EditorContext.tsx`, `TopBar.tsx`, `DesktopRail.tsx`, `PropertiesPanel.tsx`, `ZoomControls.tsx`, `EmptyState.tsx`, `ShortcutsModal.tsx`, `CommandPalette.tsx`, `panels/ToolPanels.tsx`, `ui/Toast.tsx`, `ui/Tooltip.tsx`, `ui/Modal.tsx`, `app/editor/page.tsx`, `public/sw.js`, `public/manifest.webmanifest`, PWA icons, `vercel.json`, `plan.md`, `worklog.md`, `bugfix.md`, `structure.md`

---

## 6. Performance / Cost Notes

- Static export → CDN-only hosting, **Vercel Fluid CPU hours no longer consumed by page visits**
- Service worker: precache shell, cache-first `/_next/static`, stale-while-revalidate fonts
- No new runtime dependencies (uses existing: fabric, framer-motion, react-icons, idb, react-cropper, use-debounce, uuid)
- Canvas renders: `requestRenderAll` (not `renderAll`) on slider scrubbing; thumbnail generation debounced

## 7. Acceptance Checklist

- [ ] `npm run build` passes with `output: 'export'`
- [ ] Desktop ≥1024px: rail + panel layout; Mobile <768px: toolbar + sheets
- [ ] Export PNG at 2× from 1080² doc = 2160² file
- [ ] Ctrl+K, `?`, all listed shortcuts work; typing in text object doesn't trigger them
- [ ] Drop/paste image works; before/after works; toasts fire
- [ ] `/blog`, `/compare`, `/tools/crop` return 404; `/`, `/tools`, `/editor` clean
- [ ] Lighthouse-style sanity: no console errors, no CLS on home
- [ ] `plan.md`, `worklog.md`, `bugfix.md`, `structure.md` complete and accurate
