# 🎨 Onyx Image Editor v2.1

[![Live Demo](https://img.shields.io/badge/Live%20Demo-onyx.namansoni.in-blue?style=for-the-badge&logo=vercel)](https://onyx.namansoni.in)
[![Next.js](https://img.shields.io/badge/Next.js-16.0-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

**Onyx v2.1** is a fast, free, privacy-first, browser-based image editor with a real **pro desktop workspace** and a native-feeling **mobile experience** — built with Next.js, React 19 and Fabric.js. Every pixel is processed on your device; nothing is ever uploaded.

🌐 **Live:** [https://onyx.namansoni.in](https://onyx.namansoni.in)

---

## ✨ What's new in v2.1

### 🖼️ Export, upgraded
- **Pick export shape** — circle, rounded, triangle, star, heart, hexagon, pentagon, diamond masks (transparent outside in PNG; white fill in JPG)
- **Exact-pixel resize** with a default-locked aspect ratio (unlock freely — re-locking snaps back)
- **0.5×–4× + 16K** scale chips (device caps: 16 384 px / 268 MP, real output size reported)

### 🔷 Shapes, borders & fills
- **Custom n-sided polygons and n-point stars**
- **Border stacks**: up to 6 concentric borders — gradient thickness ramp (thin→thick), gradient colors, or per-border custom color+width, with gap control
- **Corner radius** for rectangles
- **Fills for any shape/text**: solid, **gradient / tri-gradient+ (up to 5 stops)** with proper CSS angle semantics, or **custom image** (cover-fit)

### 🎨 Backgrounds & document
- **Background system**: solid color, gradient (up to 5 stops), transparent checkerboard, or **image as background** (cover-fit, rescales with the document, undoable)
- **Aspect-ratio management** at creation (presets + ratio chips) and after (Document panel with W/H lock, content stays centered)
- **Layers 2.0**: position slider to reorder (0 = bottom ↔ top), inline rename

### 🐛 Stability (parallel bug-hunt round)
- Transparent PNG exports are truly transparent; JPG never black; layer ordering can never hide content below the canvas frame
- Multi-select delete + full undo coverage (deletes, borders, backgrounds, transforms, renames)
- Shortcuts never fire while typing; New Project truly starts fresh; scratch autosave never races the project write
- Full list: `bugfix.md` §E (49 fixes from 3 parallel bug-hunt subagents, browser-verified)

---

## ✨ What was new in v2.0

### 🖥️ Pro desktop workspace
- Figma-style layout: **left tool rail** (tooltips + shortcuts) · center canvas · **right contextual properties panel** with layers
- **Document-based canvas** — true-resolution exports (v1 exported screen resolution), zoom/pan (wheel, pinch, space-drag), fit/100%
- **Command palette** (`Ctrl+K`), **30+ keyboard shortcuts** (`?` for the cheat sheet), align-to-canvas, numeric transform inputs

### 📱 Mobile-first editing
- Bottom toolbar + bottom-sheet tool panels, pinch-to-zoom the document, two-finger pan, drag handles, safe-area aware

### 🛠️ More editing power
- 15 filter presets + 6 stackable adjustments (brightness/contrast/saturation/hue/blur/grain) that **no longer clobber each other**
- **Hold-to-compare** original, remove-color (color key) with tolerance, crop with ratio presets, image masking, text with 12 fonts/spacing/line-height, stickers, draw, layers with thumbnails/visibility/lock
- **Export**: PNG (transparent) / JPG / WebP · quality · 0.5×–4× + 16K · exact-px resize with aspect lock · shape pick · **copy-to-clipboard**
- Drag & drop, clipboard paste (image + text), onboarding size presets (Instagram, Story, YouTube, X, Pinterest, Facebook)

### ⚡ Performance & hosting
- **100% static export** → zero serverless invocations on Vercel (the free Fluid-CPU allowance is never drained by traffic)
- **Installable PWA** with service worker — full offline editing
- Autosaved projects (IndexedDB) with **scratch mode** (no more empty-project spam), inline rename, `.onyx` project import/export

### 🧹 Focused site
- Blog, comparison and programmatic SEO pages removed — three fast pages: `/`, `/tools`, `/editor`

---

## 🌟 Key Features

- 🔒 **100% private** — Canvas + WebAssembly engine, zero server uploads, works offline
- 💾 **Local project persistence** — autosave, thumbnails, rename, import/export
- ✂️ **Full editing suite** — crop, mask, filters, adjustments, text, shapes, draw, stickers, layers
- 🚀 **Instant** — static shell, cached assets, trimmed font payload

## 🛠️ Tech Stack

| Layer | Tech |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router, `output: 'export'`) |
| UI | [React 19](https://react.dev) · [Tailwind CSS v4](https://tailwindcss.com) · [framer-motion](https://motion.dev) · [react-icons](https://react-icons.github.io/react-icons/) |
| Canvas engine | [Fabric.js v5](http://fabricjs.com/) |
| Storage | IndexedDB via [idb](https://github.com/jakearchibald/idb) |
| Cropping | [react-cropper](https://github.com/react-cropper/react-cropper) |
| PWA | Custom service worker (`public/sw.js`) + manifest |

## 🚀 Getting Started

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # static export → out/ (zero server functions)
npm run lint       # eslint (0 errors / 0 warnings expected)
```

**Deploy (Vercel):** import the repo — the static export is detected automatically. Security headers live in `vercel.json`.

## 📁 Documentation

| File | Contents |
|---|---|
| [`plan.md`](./plan.md) | v2.0 upgrade plan — goals, architecture decisions, feature matrix |
| [`worklog.md`](./worklog.md) | Chronological log of all v2.0 work |
| [`bugfix.md`](./bugfix.md) | Bugs fixed, breaking changes, known limitations |
| [`structure.md`](./structure.md) | Full file map + conventions for future contributors/agents |

## ⚠️ v2 breaking changes

- Editor URLs changed: `/editor/<id>` → **`/editor?project=<id>`**
- Blog / compare / programmatic tool pages removed (now a single `/tools` page)
- v1 saved projects open fine — document size is derived automatically on first load

---

Made with ❤️ by [Naman Soni](https://namansoni.in). Distributed under the MIT License.
