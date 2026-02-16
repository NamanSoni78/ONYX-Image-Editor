import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Metadata } from 'next';
import { FEATURES } from '@/lib/features';
import { BLOG_POSTS } from '@/lib/blog';
import JsonLd from '@/components/Seo/JsonLd';
import { FaCrop, FaExpand, FaWandMagicSparkles, FaFont, FaMask, FaPen, FaArrowRotateRight, FaLeftRight, FaFileImage, FaArrowRight, FaCheck, FaBookOpen } from 'react-icons/fa6';

// Map icon strings to components
const IconMap: Record<string, React.ElementType> = {
  'crop': FaCrop,
  'resize': FaExpand,
  'filter': FaWandMagicSparkles,
  'text': FaFont,
  'mask': FaMask,
  'draw': FaPen,
  'rotate': FaArrowRotateRight,
  'flip': FaLeftRight,
  'convert': FaFileImage // fallback or specific
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return FEATURES.map((feature) => ({
    slug: feature.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const feature = FEATURES.find((f) => f.slug === slug);

  if (!feature) {
    return {
      title: 'Feature Not Found',
    };
  }

  return {
    title: feature.title,
    description: feature.description,
    keywords: feature.keywords,
    openGraph: {
      title: feature.title,
      description: feature.description,
      type: 'website',
      url: `https://onyx.namansoni.in/tools/${slug}`,
    },
    twitter: {
        card: 'summary_large_image',
        title: feature.title,
        description: feature.description,
    },
    alternates: {
        canonical: `https://onyx.namansoni.in/tools/${slug}`,
    }
  };
}

export default async function FeaturePage({ params }: PageProps) {
  const { slug } = await params;
  const feature = FEATURES.find((f) => f.slug === slug);

  if (!feature) {
    notFound();
  }

  const Icon = IconMap[feature.icon] || FaFileImage;

  // Find related blog posts based on matching keywords
  const relatedPosts = BLOG_POSTS
    .map(post => {
      // Count matching keywords (simple string inclusion check)
      const matches = post.keywords.filter(pk =>
        feature.keywords.some(fk => pk.toLowerCase().includes(fk.toLowerCase()) || fk.toLowerCase().includes(pk.toLowerCase()))
      ).length;
      return { post, matches };
    })
    .filter(item => item.matches > 0)
    .sort((a, b) => b.matches - a.matches)
    .slice(0, 3)
    .map(item => item.post);

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://onyx.namansoni.in/"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Tools",
        "item": "https://onyx.namansoni.in/tools"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": feature.content.heroTitle,
        "item": `https://onyx.namansoni.in/tools/${slug}`
      }
    ]
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": feature.content.howTo.title,
    "step": feature.content.howTo.steps.map((step, index) => ({
      "@type": "HowToStep",
      "position": index + 1,
      "text": step
    }))
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-blue-500/30">
      <JsonLd data={breadcrumbSchema} />
      <JsonLd data={howToSchema} />

      {/* Header */}
      <header className="p-6 border-b border-white/10 sticky top-0 z-50 bg-black/80 backdrop-blur">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
            <Link href="/" className="text-xl font-black tracking-widest bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent hover:opacity-80 transition-opacity">
                ONYX EDITOR
            </Link>
            <Link href="/" className="bg-white text-black px-4 py-2 rounded-full text-sm font-bold hover:bg-zinc-200 transition-colors">
                Open Editor
            </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-24 pb-24">
        {/* Hero */}
        <section className="text-center space-y-8 pt-12">
            <div className="inline-flex items-center justify-center p-4 bg-zinc-900 rounded-2xl border border-zinc-800 mb-4">
                <Icon className="text-4xl text-blue-500" />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-500 leading-tight">
                {feature.content.heroTitle}
            </h1>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
                {feature.content.heroDescription}
            </p>
            <div className="flex justify-center pt-4">
                <Link href="/" className="bg-blue-600 hover:bg-blue-500 text-white text-lg font-bold px-8 py-4 rounded-full transition-transform active:scale-95 shadow-xl shadow-blue-900/20 flex items-center gap-3">
                    Start {feature.content.heroTitle.split(' ').slice(0, 1)} Now <FaArrowRight />
                </Link>
            </div>
        </section>

        {/* How To */}
        <section className="bg-zinc-900/30 border border-white/5 rounded-3xl p-8 md:p-12">
            <h2 className="text-3xl font-bold mb-8 text-center">{feature.content.howTo.title}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-6">
                    {feature.content.howTo.steps.map((step, i) => (
                        <div key={i} className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold shrink-0 border border-blue-500/20">
                                {i + 1}
                            </div>
                            <p className="text-zinc-300 text-lg">{step}</p>
                        </div>
                    ))}
                </div>
                {/* Visual placeholder or mini-demo could go here */}
                <div className="bg-black/50 aspect-video rounded-xl border border-zinc-800 flex items-center justify-center relative overflow-hidden group">
                     <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-purple-500/20 opacity-50"></div>
                     <Icon className="text-6xl text-zinc-700 group-hover:text-zinc-600 transition-colors" />
                     <div className="absolute bottom-4 right-4 bg-zinc-900 px-3 py-1 rounded text-xs text-zinc-500 border border-zinc-800">Preview</div>
                </div>
            </div>
        </section>

        {/* Benefits */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {feature.content.benefits.map((benefit, i) => (
                <div key={i} className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5 hover:border-blue-500/30 transition-colors">
                    <FaCheck className="text-green-500 text-xl mb-4" />
                    <h3 className="text-xl font-bold mb-2">{benefit.title}</h3>
                    <p className="text-zinc-400">{benefit.description}</p>
                </div>
            ))}
        </section>

        {/* FAQ */}
        <section className="max-w-2xl mx-auto w-full">
            <h2 className="text-3xl font-bold mb-8 text-center">Frequently Asked Questions</h2>
            <div className="space-y-4">
                {feature.content.faq.map((item, i) => (
                    <div key={i} className="border border-white/10 rounded-xl overflow-hidden bg-zinc-900/20">
                        <div className="p-4 font-bold text-lg bg-white/5">{item.question}</div>
                        <div className="p-4 text-zinc-400">{item.answer}</div>
                    </div>
                ))}
            </div>
        </section>

        {/* Related Blog Posts */}
        {relatedPosts.length > 0 && (
          <section className="pt-12 border-t border-white/10">
              <h3 className="text-2xl font-bold mb-8 text-center text-zinc-500 flex items-center justify-center gap-2">
                <FaBookOpen /> Related Articles
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {relatedPosts.map((post) => (
                      <Link key={post.slug} href={`/blog/${post.slug}`} className="block group h-full">
                          <article className="bg-zinc-900/40 border border-white/5 rounded-2xl overflow-hidden hover:border-blue-500/30 transition-all h-full flex flex-col">
                              <div className="p-6 flex flex-col flex-grow">
                                  <div className="text-xs text-blue-400 mb-2 font-mono uppercase tracking-wider">{post.readTime}</div>
                                  <h4 className="text-lg font-bold mb-3 group-hover:text-blue-400 transition-colors line-clamp-2">{post.title}</h4>
                                  <p className="text-zinc-400 text-sm line-clamp-3 mb-4 flex-grow">{post.excerpt}</p>
                                  <span className="text-sm text-zinc-500 group-hover:text-white transition-colors flex items-center gap-2">
                                    Read Article <FaArrowRight className="text-xs" />
                                  </span>
                              </div>
                          </article>
                      </Link>
                  ))}
              </div>
          </section>
        )}

        {/* Other Features Grid */}
        <section className="pt-12 border-t border-white/10">
            <h3 className="text-2xl font-bold mb-8 text-center text-zinc-500">More Tools</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {FEATURES.filter(f => f.slug !== slug).map((f) => (
                    <Link key={f.slug} href={`/tools/${f.slug}`} className="p-4 rounded-xl bg-zinc-900/50 border border-white/5 hover:bg-zinc-800 transition-colors text-center group">
                        <span className="text-zinc-500 text-xs uppercase tracking-wider font-bold group-hover:text-blue-400 transition-colors">{f.content.heroTitle}</span>
                    </Link>
                ))}
            </div>
        </section>
      </main>

      <footer className="p-8 text-center text-zinc-600 text-sm border-t border-white/10 bg-zinc-950">
          <p>&copy; {new Date().getFullYear()} Onyx Image Editor. All rights reserved.</p>
      </footer>
    </div>
  );
}
