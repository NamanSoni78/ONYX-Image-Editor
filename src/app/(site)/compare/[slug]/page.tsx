import { notFound } from 'next/navigation';
import Link from 'next/link';
import { COMPARISONS } from '@/lib/comparisons';
import { generateMetadata as getSeoMetadata } from '@/lib/seo-metadata';
import JsonLd from '@/components/Seo/JsonLd';
import { generateBreadcrumbSchema, generateArticleSchema } from '@/lib/schema';
import { FaArrowLeft, FaCheck } from 'react-icons/fa6';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return COMPARISONS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const comp = COMPARISONS.find((c) => c.slug === slug);
  if (!comp) return { title: 'Not Found' };

  return getSeoMetadata({
    title: `${comp.title} - 2026 Comparison | Onyx`,
    description: comp.description,
    canonicalUrl: `https://onyx.namansoni.in/compare/${slug}`,
    keywords: [`onyx vs ${comp.competitor}`, `${comp.competitor} alternative`, 'best image editor comparison'],
  });
}

export default async function ComparisonPage({ params }: PageProps) {
  const { slug } = await params;
  const comp = COMPARISONS.find((c) => c.slug === slug);
  if (!comp) notFound();

  const breadcrumb = generateBreadcrumbSchema([
    { name: 'Home', url: 'https://onyx.namansoni.in' },
    { name: 'Comparisons', url: 'https://onyx.namansoni.in/compare' },
    { name: comp.title, url: `https://onyx.namansoni.in/compare/${slug}` },
  ]);

  const articleSchema = generateArticleSchema({
      title: comp.title,
      image: '/og-image.jpg', // Placeholder
      author: 'Onyx Team',
      date: '2026-01-15',
      excerpt: comp.description,
      slug: `compare/${slug}`
  });

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-blue-500/30">
      <JsonLd data={[breadcrumb, articleSchema]} />

      <header className="p-6 border-b border-white/10 flex justify-between items-center bg-black/80 backdrop-blur sticky top-0 z-20">
        <div className="flex items-center gap-4">
            <Link href="/compare" className="text-zinc-400 hover:text-white transition-colors">
                <FaArrowLeft /> Back
            </Link>
            <Link href="/" className="text-xl font-black tracking-widest bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              ONYX
            </Link>
        </div>
        <Link href="/" className="bg-white text-black px-4 py-2 rounded-full text-sm font-bold hover:bg-zinc-200 transition-colors">
            Try Onyx Free
        </Link>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-12 pb-24">
        <section className="text-center py-12 space-y-6">
          <h1 className="text-3xl md:text-5xl font-bold leading-tight">
            {comp.title}
          </h1>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            {comp.description}
          </p>
        </section>

        <section className="bg-zinc-900/30 border border-white/5 p-8 rounded-3xl space-y-6">
            <h2 className="text-2xl font-bold">The Verdict</h2>
            <p className="text-lg text-zinc-300">
                {comp.verdict}
            </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-zinc-900/20 border border-green-500/20 p-6 rounded-2xl">
                <h3 className="text-xl font-bold mb-4 text-green-400">Why Choose Onyx?</h3>
                <ul className="space-y-3">
                    {comp.pros.map((pro, i) => (
                        <li key={i} className="flex gap-3 text-zinc-300">
                            <FaCheck className="text-green-500 mt-1 shrink-0" /> {pro}
                        </li>
                    ))}
                </ul>
            </div>
            <div className="bg-zinc-900/20 border border-red-500/20 p-6 rounded-2xl">
                <h3 className="text-xl font-bold mb-4 text-red-400">Where {comp.competitor} Wins</h3>
                <ul className="space-y-3">
                    {comp.cons.map((con, i) => (
                        <li key={i} className="flex gap-3 text-zinc-300">
                            <FaCheck className="text-red-500 mt-1 shrink-0" /> {con}
                        </li>
                    ))}
                </ul>
            </div>
        </section>

        <div className="text-center pt-8">
             <Link href="/" className="inline-block bg-blue-600 hover:bg-blue-500 text-white text-lg font-bold px-12 py-4 rounded-full transition-transform active:scale-95 shadow-xl shadow-blue-900/20">
                Start Editing with Onyx
             </Link>
        </div>
      </main>
    </div>
  );
}
