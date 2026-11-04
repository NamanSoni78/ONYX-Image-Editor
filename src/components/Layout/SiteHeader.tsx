'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { FaBars, FaXmark, FaWandMagicSparkles } from 'react-icons/fa6';

/** Shared site header for the marketing pages (/, /tools) */
export const SiteHeader: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all ${
        scrolled ? 'glass border-b border-white/10' : 'border-b border-transparent'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="text-brand-gradient text-lg font-black tracking-[0.18em] transition-opacity hover:opacity-80">
          ONYX
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-semibold text-zinc-400 md:flex">
          <Link href="/#projects" className="transition-colors hover:text-white">Projects</Link>
          <Link href="/tools" className="transition-colors hover:text-white">Tools</Link>
          <Link href="/#faq" className="transition-colors hover:text-white">FAQ</Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/editor"
            className="focus-ring flex items-center gap-2 rounded-full bg-brand-gradient px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-950/40 transition-transform active:scale-95 sm:px-5 sm:text-sm"
          >
            <FaWandMagicSparkles size={13} /> Open Editor
          </Link>
          <button
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Menu"
            className="focus-ring rounded-lg p-2.5 text-zinc-300 transition-colors hover:bg-white/10 md:hidden"
          >
            {mobileOpen ? <FaXmark /> : <FaBars />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <nav className="glass flex flex-col gap-1 border-b border-white/10 px-4 py-3 text-sm font-semibold text-zinc-300 md:hidden">
          <Link href="/#projects" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 hover:bg-white/5">
            Projects
          </Link>
          <Link href="/tools" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 hover:bg-white/5">
            Tools
          </Link>
          <Link href="/#faq" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 hover:bg-white/5">
            FAQ
          </Link>
        </nav>
      )}
    </header>
  );
};
