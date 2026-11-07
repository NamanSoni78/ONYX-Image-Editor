import React from 'react';
import Link from 'next/link';
import { generateMetadata } from '@/lib/seo-metadata';
import { generateSoftwareApplicationSchema } from '@/lib/schema';
import JsonLd from '@/components/Seo/JsonLd';
import { SiteHeader } from '@/components/Layout/SiteHeader';
import ProjectDashboard from '@/components/Home/ProjectDashboard';
import FaqSection from '@/components/Home/FaqSection';
import { TOOLS } from '@/lib/features';
import { TOOLS as TOOL_ICONS } from '@/components/Home/toolsIcons';

export const metadata = generateMetadata({
  title: 'Onyx Image Editor — Free Online Photo Editor',
  description:
    'Professional browser-based image editor. Crop, filter, mask, add text and export PNG/JPG/WebP — private, free, no signup, works offline.',
  canonicalUrl: 'https://onyx.namansoni.in',
});

export default function LandingPage() {
  const softwareAppSchema = generateSoftwareApplicationSchema(
    'Onyx Image Editor',
    'Professional browser-based image editor. Crop, filter, mask, add text and export PNG/JPG/WebP — private, free, no signup.'
  );

  return (
    <div className="flex min-h-screen flex-col bg-onyx-950 font-sans text-zinc-100 selection:bg-indigo-500/30">
      <JsonLd data={softwareAppSchema} />
      <SiteHeader />

      <main className="grid-bg flex-1">
        {/* ---------------- Hero ---------------- */}
        <section className="relative overflow-hidden">
          {/* ambient gradient blobs (pure CSS, zero requests) */}
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute -top-32 left-1/2 h-[420px] w-[680px] -translate-x-1/2 rounded-full bg-indigo-600/20 blur-[120px]" />
            <div className="absolute right-[8%] top-40 h-[280px] w-[380px] rounded-full bg-fuchsia-600/10 blur-[100px]" />
          </div>

          <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 text-center sm:px-6 md:pt-24">
            <h1 className="mx-auto max-w-3xl text-4xl font-black leading-[1.08] tracking-tight md:text-6xl">
              Edit images like a pro,
              <br />
              <span className="text-brand-gradient">right in your browser.</span>
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-zinc-400 md:text-lg">
              A fast, private image editor with pro tools — filters, masking, layers, text and
              pixel-true export. Nothing uploads, nothing tracks, no signup.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/editor"
                className="focus-ring flex w-full items-center justify-center gap-2 rounded-full bg-brand-gradient px-8 py-4 text-base font-bold text-white shadow-2xl shadow-indigo-950/50 transition-transform active:scale-95 sm:w-auto"
              >
                Start editing — it&apos;s free
              </Link>
              <Link
                href="/tools"
                className="focus-ring flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-8 py-4 text-base font-bold text-zinc-200 transition-colors hover:bg-white/10 sm:w-auto"
              >
                Explore tools
              </Link>
            </div>

            {/* trust chips */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-semibold text-zinc-500">
              <span>🔒 100% private — images never leave your device</span>
              <span>⚡ Works offline (installable PWA)</span>
              <span>📱 Desktop & mobile experiences</span>
            </div>
          </div>
        </section>

        {/* ---------------- Projects dashboard ---------------- */}
        <div className="px-4 pb-20 sm:px-6">
          <ProjectDashboard />
        </div>

        {/* ---------------- Tools strip ---------------- */}
        <section id="tools" className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-1">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-400">Toolbox</p>
              <h2 className="text-2xl font-bold md:text-3xl">Everything you need, nothing you don&apos;t</h2>
            </div>
            <Link href="/tools" className="text-sm font-bold text-indigo-300 transition-colors hover:text-indigo-200">
              View all tools →
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {TOOLS.slice(0, 8).map((t) => {
              const Icon = TOOL_ICONS[t.icon] || TOOL_ICONS.crop;
              return (
                <Link
                  key={t.slug}
                  href="/editor"
                  className="group rounded-2xl border border-white/10 bg-zinc-900/40 p-4 transition-all hover:-translate-y-0.5 hover:border-indigo-400/40 hover:bg-zinc-900"
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300 transition-colors group-hover:bg-indigo-500/20">
                    <Icon size={16} />
                  </div>
                  <h3 className="text-sm font-bold text-zinc-100">{t.title}</h3>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-500">{t.description}</p>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ---------------- FAQ ---------------- */}
        <div className="px-4 pb-24 sm:px-6">
          <FaqSection />
        </div>
      </main>

      {/* ---------------- Footer ---------------- */}
      <footer className="border-t border-white/10 bg-onyx-950">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="flex flex-col items-center gap-6">
            {/* Brand */}
            <div className="flex items-center gap-2">
              <span className="text-brand-gradient text-lg font-black tracking-[0.18em]">ONYX</span>
              <span className="text-sm text-zinc-600">· free forever · privacy-first</span>
            </div>

            {/* App links */}
            <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-semibold">
              <Link href="/editor" className="text-zinc-400 transition-colors hover:text-zinc-200">Editor</Link>
              <Link href="/tools" className="text-zinc-400 transition-colors hover:text-zinc-200">Tools</Link>
              <Link href="/#faq" className="text-zinc-400 transition-colors hover:text-zinc-200">FAQ</Link>
              <a
                href="https://links.namansoni.in/namansoni78"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3.5 py-1.5 text-indigo-300 transition-colors hover:bg-indigo-500/20 hover:text-indigo-200"
              >
                ✦ See Other Apps
              </a>
            </nav>

            {/* Divider */}
            <div className="h-px w-full max-w-md bg-white/5" />

            {/* Credits */}
            <div className="flex flex-col items-center gap-3 text-center">
              <p className="flex flex-wrap items-center justify-center gap-1.5 text-sm text-zinc-400">
                <span>Made with</span>
                <span className="text-red-500" aria-label="love">❤️</span>
                <span>by</span>
                <a
                  href="https://github.com/namansoni78"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-zinc-200 transition-colors hover:text-white"
                >
                  Naman
                </a>
                <span className="text-zinc-600">•</span>
                <a
                  href="https://github.com/namansoni78"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-zinc-300 transition-colors hover:border-white/25 hover:text-white"
                >
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-current" aria-hidden>
                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
                  </svg>
                  GitHub Account
                </a>
              </p>
              <a
                href="https://payment.namansoni.in/payment"
                target="_blank"
                rel="noopener noreferrer"
                className="focus-ring flex items-center gap-2 rounded-full bg-brand-gradient px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-950/40 transition-transform active:scale-95"
              >
                ☕ Donate me
              </a>
            </div>

            <p className="text-xs text-zinc-600">© 2026 Onyx Image Editor</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
