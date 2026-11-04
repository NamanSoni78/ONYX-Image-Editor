import React from 'react';
import Link from 'next/link';
import { FaArrowRight, FaBolt, FaLock, FaMobileScreen } from 'react-icons/fa6';
import { generateMetadata } from '@/lib/seo-metadata';
import { SiteHeader } from '@/components/Layout/SiteHeader';
import { TOOLS as TOOL_LIST } from '@/lib/features';
import { TOOLS as TOOL_ICONS } from '@/components/Home/toolsIcons';

export const metadata = generateMetadata({
  title: 'All Tools — Onyx Image Editor',
  description:
    'Crop, resize, filter, mask, annotate, convert and export images — every Onyx tool explained. Free, private, browser-based.',
  canonicalUrl: 'https://onyx.namansoni.in/tools',
});

const HIGHLIGHTS = [
  { icon: <FaLock />, title: 'Private by design', text: 'Every pixel is processed on your device with Canvas + WebAssembly. No uploads, ever.' },
  { icon: <FaBolt />, title: 'Instant & offline', text: 'Static app shell + service worker means near-zero load times and full offline editing.' },
  { icon: <FaMobileScreen />, title: 'Two experiences, one editor', text: 'A pro desktop workspace with panels and shortcuts — and a native-feeling touch UI on mobile.' },
];

export default function ToolsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-onyx-950 font-sans text-zinc-100 selection:bg-indigo-500/30">
      <SiteHeader />

      <main className="grid-bg flex-1">
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 md:pt-20">
          <p className="mb-3 text-[11px] font-black uppercase tracking-[0.2em] text-indigo-400">Toolbox</p>
          <h1 className="max-w-2xl text-4xl font-black leading-tight tracking-tight md:text-5xl">
            One editor, <span className="text-brand-gradient">every tool</span> you need
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-zinc-400">
            Everything below lives inside a single canvas workspace — combine tools freely on the same project.
          </p>

          <Link
            href="/editor"
            className="focus-ring mt-7 inline-flex items-center gap-2 rounded-full bg-brand-gradient px-7 py-3.5 text-sm font-bold text-white shadow-xl shadow-indigo-950/40 transition-transform active:scale-95"
          >
            Open the editor <FaArrowRight size={12} />
          </Link>
        </section>

        {/* Highlight strip */}
        <section className="mx-auto grid max-w-6xl gap-3 px-4 pb-16 sm:grid-cols-3 sm:px-6">
          {HIGHLIGHTS.map((h) => (
            <div key={h.title} className="rounded-2xl border border-white/10 bg-zinc-900/40 p-5">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300">
                {h.icon}
              </div>
              <h3 className="text-sm font-bold">{h.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">{h.text}</p>
            </div>
          ))}
        </section>

        {/* Tool cards */}
        <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TOOL_LIST.map((t) => {
              const Icon = TOOL_ICONS[t.icon] || TOOL_ICONS.crop;
              return (
                <Link
                  key={t.slug}
                  href="/editor"
                  className="group rounded-2xl border border-white/10 bg-zinc-900/40 p-5 transition-all hover:-translate-y-0.5 hover:border-indigo-400/40 hover:bg-zinc-900"
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300 transition-colors group-hover:bg-indigo-500/20">
                    <Icon size={16} />
                  </div>
                  <h2 className="text-base font-bold text-zinc-100">{t.title}</h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">{t.description}</p>
                  <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-indigo-300 opacity-0 transition-opacity group-hover:opacity-100">
                    Try it <FaArrowRight size={10} />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-onyx-950">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-zinc-500 sm:flex-row sm:px-6">
          <span className="text-brand-gradient font-black tracking-[0.18em]">ONYX</span>
          <Link href="/editor" className="font-bold text-indigo-300 hover:text-indigo-200">
            Start editing →
          </Link>
          <p>© 2026 Onyx Image Editor</p>
        </div>
      </footer>
    </div>
  );
}
