# 🎨 Onyx Image Editor

[![Live Demo](https://img.shields.io/badge/Live%20Demo-onyx.namansoni.in-blue?style=for-the-badge&logo=vercel)](https://onyx.namansoni.in)
[![Next.js](https://img.shields.io/badge/Next.js-16.0-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

**Onyx** is a fast, free, privacy-first, browser-based online image editor built for modern content creators, designers, and developers. Powered by Next.js App Router and Fabric.js, Onyx allows you to edit, crop, filter, annotate, convert, and format photos without uploading them to any remote server.

🌐 **Hosted Live At:** [https://onyx.namansoni.in](https://onyx.namansoni.in)

---

## 🌟 Key Features

### 🔒 100% Private & Client-Side
* **Local WebAssembly & Canvas Engine:** All photo edits—cropping, filtering, resizing, and drawing—are computed directly on your browser's WebAssembly and Canvas runtime.
* **Zero Server Uploads:** Your photos never leave your device. You can even load Onyx and edit images completely offline.

### 💾 Local Project Persistence (IndexedDB)
* Auto-saves your ongoing projects and canvas sessions locally using browser IndexedDB.
* Revisit, rename, export, or delete saved projects from your personal Project Dashboard anytime.

### ✂️ Comprehensive Editing Suite
* **Image Cropper:** Aspect ratio presets (Instagram 1:1, Stories 9:16, YouTube 16:9, etc.) and freehand cropping.
* **Photo Resizer & Converter:** Easily scale dimensions and convert between formats (`JPG`, `PNG`, `WebP`).
* **Filters & Adjustments:** Grayscale, Sepia, Vintage, Blur, Brightness, Saturation, and Contrast fine-tuning.
* **Drawing & Annotations:** Freehand pencil tool, highlighters, customizable shapes, and drop shadows.
* **Text & Typography:** Rich text overlays integrated with Google Fonts library.
* **Image Masking:** Clip photos into custom shapes (Circles, Hearts, Stars).
* **Layer Management:** Drag-and-drop layer reordering and element visibility controls.

### 🚀 Search Engine & Performance Optimized
* Server-Side Pre-rendered (SSR) HTML pages for high-intent tool landing pages (`/tools/crop`, `/tools/resize`, `/tools/convert`, etc.).
* Dynamic JSON-LD structured data (`SoftwareApplication`, `HowTo`, `FAQPage`, `BreadcrumbList`, `Article`).
* Core Web Vitals optimized using dynamic imports, streaming Suspense boundaries, and zero-CLS font rendering.

---

## 🛠️ Tech Stack

* **Framework:** [Next.js 16](https://nextjs.org) (App Router)
* **Frontend Library:** [React 19](https://react.dev)
* **Canvas Engine:** [Fabric.js v5](http://fabricjs.com/)
* **Styling & UI:** [Tailwind CSS v4](https://tailwindcss.com/), [Framer Motion](https://www.framer.com/motion/), [React Icons](https://react-icons.github.io/react-icons/)
* **Local Storage:** [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) via `idb`
* **Type Safety:** [TypeScript](https://www.typescript.org/)
* **SEO Utility:** Programmatic Schema Markup Generators & Next.js Dynamic Metadata API

---

## 🏗️ Project Structure

```
onyx/
├── public/                 # Static public assets, icons, and blog images
├── src/
│   ├── app/                # Next.js App Router hierarchy
│   │   ├── (site)/         # Public SEO pages layout (Landing, Blog, Tools, Compare)
│   │   │   ├── blog/       # Blog hub & individual posts
│   │   │   ├── compare/    # Competitor comparison pages
│   │   │   ├── tools/      # Programmatic tool landing pages (/crop, /resize, /convert, etc.)
│   │   │   ├── layout.tsx  # Site layout with global header & footer
│   │   │   └── page.tsx    # Onyx landing page
│   │   ├── editor/         # Fullscreen Canvas Editor route
│   │   │   └── page.tsx    # Interactive Canvas Editor App
│   │   ├── globals.css     # Tailwind CSS & global styling
│   │   ├── layout.tsx      # Root HTML layout & Schema JSON-LD injection
│   │   ├── robots.ts       # Dynamic robots.txt generation
│   │   └── sitemap.ts      # Dynamic XML sitemap generator
│   ├── components/
│   │   ├── Editor/         # Canvas Editor components (Toolbar, Layers, Export Panel)
│   │   ├── Home/           # Landing page sections (Features, FAQ, HowItWorks, Dashboard)
│   │   ├── Layout/         # Header and Sidebar navigation
│   │   ├── Seo/            # JSON-LD Schema component helper
│   │   └── ui/             # Reusable UI primitives
│   └── lib/                # Core logic, presets, data models, storage utilities
│       ├── blog.ts         # Blog post definitions
│       ├── features.ts     # Tool feature data models & SEO content
│       ├── schema.ts       # Structured JSON-LD schema generators
│       ├── seo-metadata.ts # Metadata generation utility
│       └── storage.ts      # IndexedDB project management helper
├── next.config.ts          # Next.js build configuration
├── tsconfig.json           # TypeScript configuration
└── package.json            # Dependencies and scripts
```

---

## 🚀 Getting Started

### Prerequisites

* **Node.js**: `v18.17.0` or higher
* **npm**, **pnpm**, **yarn**, or **bun**

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/namansoni/onyx.git
   cd onyx
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open in browser:**
   Navigate to [http://localhost:3000](http://localhost:3000) to view Onyx locally.

---

## 📜 Production Scripts

* `npm run dev` - Starts the Next.js development server.
* `npm run build` - Builds the application for production deployment.
* `npm run start` - Starts the production server.
* `npm run lint` - Runs ESLint code quality checks.

---

## 🌐 Hosted Deployment

This project is deployed and hosted live on Vercel at:
👉 **[https://onyx.namansoni.in](https://onyx.namansoni.in)**

---

## 🤝 Contributing

Contributions, bug reports, and feature requests are welcome!

1. Fork the Project.
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`).
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the Branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

Made with ❤️ by [Naman Soni](https://namansoni.in).
