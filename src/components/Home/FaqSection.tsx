import { FaChevronDown } from 'react-icons/fa6';
import JsonLd from '@/components/Seo/JsonLd';

const FAQS: { q: string; a: string }[] = [
  {
    q: 'Is Onyx really free?',
    a: 'Yes — every tool and filter is free, with no watermarks, no sign-up, and no premium tier.',
  },
  {
    q: 'Are my photos uploaded anywhere?',
    a: 'No. All editing happens locally in your browser using Canvas + WebAssembly. Your images never leave your device — you can even edit offline.',
  },
  {
    q: 'Can I use it on my phone?',
    a: 'Yes. Onyx has a dedicated touch experience: bottom toolbars, bottom sheets, pinch-to-zoom and drag handles, built mobile-first.',
  },
  {
    q: 'What formats can I export?',
    a: 'PNG (with optional transparency), JPG (with quality control), and WebP where your browser supports it — from 0.5× up to 4×, exact-pixel resize with aspect lock, circle/star/heart… shape exports, and up to 16K resolution.',
  },
  {
    q: 'Do I lose my work if I close the tab?',
    a: 'Projects autosave to your browser (IndexedDB) as you edit. Reopen them any time from the dashboard. You can also export a project file and import it later.',
  },
  {
    q: 'Does it work offline?',
    a: 'Yes — install Onyx as an app (Add to Home Screen) and the service worker keeps the editor available even without a network.',
  },
];

export default function FaqSection() {
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <>
      <JsonLd data={faqSchema} />
      <section id="faq" className="mx-auto w-full max-w-3xl space-y-8">
        <div className="space-y-3 text-center">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-400">FAQ</p>
          <h2 className="text-3xl font-bold md:text-4xl">Questions, answered</h2>
        </div>
        <div className="space-y-2.5">
          {FAQS.map((f) => (
            <details key={f.q} className="group overflow-hidden rounded-xl border border-white/10 bg-zinc-900/30 transition-colors hover:border-white/20">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 text-sm font-bold text-zinc-100 marker:hidden">
                {f.q}
                <FaChevronDown size={12} className="shrink-0 text-zinc-500 transition-transform group-open:rotate-180" />
              </summary>
              <p className="px-4 pb-4 text-sm leading-relaxed text-zinc-400">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
