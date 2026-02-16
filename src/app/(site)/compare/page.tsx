import Link from 'next/link';
import { COMPARISONS } from '@/lib/comparisons';
import { generateMetadata } from '@/lib/seo-metadata';
import JsonLd from '@/components/Seo/JsonLd';
import { generateBreadcrumbSchema } from '@/lib/schema';
import { FaScaleBalanced, FaArrowRight } from 'react-icons/fa6';

export const metadata = generateMetadata({
  title: 'Image Editor Comparisons - Onyx vs Competitors',
  description: 'Compare Onyx with other popular image editors like Canva, Photopea, and Pixlr. Find the right tool for your workflow.',
  canonicalUrl: 'https://onyx.namansoni.in/compare',
});

export default function CompareHub() {
  const breadcrumb = generateBreadcrumbSchema([
    { name: 'Home', url: 'https://onyx.namansoni.in' },
    { name: 'Comparisons', url: 'https://onyx.namansoni.in/compare' },
  ]);

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-blue-500/30">
      <JsonLd data={breadcrumb} />
      <header className="p-6 border-b border-white/10 flex justify-between items-center bg-black/80 backdrop-blur sticky top-0 z-20">
        <Link href="/" className="text-xl font-black tracking-widest bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          ONYX
        </Link>
        <Link href="/blog" className="text-sm font-bold text-zinc-400 hover:text-white transition-colors">
          Blog
        </Link>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-12 pb-24">
        <section className="text-center py-12 space-y-6">
          <div className="inline-flex p-4 bg-zinc-900 rounded-2xl mb-4 text-blue-500 text-4xl">
            <FaScaleBalanced />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold">Onyx vs The Rest</h1>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            Honest, data-driven comparisons to help you choose the best image editing tool.
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {COMPARISONS.map((comp) => (
            <Link key={comp.slug} href={`/compare/${comp.slug}`} className="block p-6 rounded-xl bg-zinc-900/50 border border-white/5 hover:border-blue-500/50 hover:bg-zinc-900 transition-all group">
               <h3 className="font-bold text-lg mb-2 group-hover:text-blue-400 transition-colors">{comp.title}</h3>
               <p className="text-zinc-500 text-sm line-clamp-3">{comp.description}</p>
               <div className="mt-4 flex items-center text-xs text-blue-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                 Read Comparison <FaArrowRight className="ml-1" />
               </div>
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}
