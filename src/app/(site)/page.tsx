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
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[11px] font-bold text-zinc-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              v2.0 — now with a full pro workspace
            </div>

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
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-zinc-500 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <span className="text-brand-gradient font-black tracking-[0.18em]">ONYX</span>
            <span className="text-zinc-600">· free forever · privacy-first</span>
          </div>
          <div className="flex items-center gap-5 font-semibold">
            <Link href="/editor" className="transition-colors hover:text-zinc-200">Editor</Link>
            <Link href="/tools" className="transition-colors hover:text-zinc-200">Tools</Link>
            <Link href="/#faq" className="transition-colors hover:text-zinc-200">FAQ</Link>
          </div>
          <p>© 2026 Onyx Image Editor</p>
        </div>
      </footer>
    </div>
  );
}
