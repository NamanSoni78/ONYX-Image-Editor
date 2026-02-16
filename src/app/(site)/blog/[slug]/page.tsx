import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Metadata } from 'next';
import { BLOG_POSTS } from '@/lib/blog';
import JsonLd from '@/components/Seo/JsonLd';
import { FaArrowLeft, FaCalendar, FaUser, FaClock, FaShare } from 'react-icons/fa6';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  if (!post) return { title: 'Post Not Found' };

  return {
    title: post.title,
    description: post.excerpt,
    keywords: post.keywords,
    openGraph: {
        title: post.title,
        description: post.excerpt,
        type: 'article',
        publishedTime: post.date,
        authors: [post.author],
        url: `https://onyx.namansoni.in/blog/${slug}`,
    },
    twitter: {
        card: 'summary_large_image',
        title: post.title,
        description: post.excerpt,
    },
    alternates: {
        canonical: `https://onyx.namansoni.in/blog/${slug}`,
    }
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  if (!post) notFound();

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": post.title,
    "image": `https://onyx.namansoni.in${post.image}`,
    "author": {
      "@type": "Person",
      "name": post.author
    },
    "publisher": {
      "@type": "Organization",
      "name": "Onyx Image Editor",
      "logo": {
        "@type": "ImageObject",
        "url": "https://onyx.namansoni.in/icon-512x512.png"
      }
    },
    "datePublished": post.date,
    "description": post.excerpt,
    "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": `https://onyx.namansoni.in/blog/${slug}`
    }
  };

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
          "name": "Blog",
          "item": "https://onyx.namansoni.in/blog"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": post.title,
          "item": `https://onyx.namansoni.in/blog/${slug}`
        }
      ]
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-blue-500/30">
      <JsonLd data={articleSchema} />
      <JsonLd data={breadcrumbSchema} />

      {/* Header */}
      <header className="p-6 border-b border-white/10 sticky top-0 z-50 bg-black/80 backdrop-blur">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
            <Link href="/blog" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors font-bold">
                <FaArrowLeft /> Back to Blog
            </Link>
            <Link href="/" className="bg-white text-black px-4 py-2 rounded-full text-sm font-bold hover:bg-zinc-200 transition-colors">
                Open Editor
            </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-8 pb-24">
        {/* Article Header */}
        <header className="space-y-6 pt-8 text-center">
            <div className="flex items-center justify-center gap-4 text-sm text-zinc-500">
                <span className="flex items-center gap-1"><FaCalendar /> {new Date(post.date).toLocaleDateString()}</span>
                <span className="flex items-center gap-1"><FaUser /> {post.author}</span>
                <span className="flex items-center gap-1"><FaClock /> {post.readTime}</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold leading-tight">
                {post.title}
            </h1>
            <p className="text-xl text-zinc-400">
                {post.excerpt}
            </p>
        </header>

        {/* Featured Image */}
        <div className="aspect-video bg-zinc-800 rounded-2xl overflow-hidden relative border border-white/10">
             <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-purple-900/20 flex items-center justify-center">
                 <span className="text-zinc-700 text-6xl font-black opacity-20">ONYX</span>
             </div>
             {/* Use post.image if available via next/image in real implementation */}
        </div>

        {/* Content */}
        <article
            className="prose prose-invert prose-lg max-w-none prose-headings:font-bold prose-headings:text-white prose-a:text-blue-400 prose-strong:text-white prose-li:text-zinc-300 text-zinc-300"
            dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* Share / CTA */}
        <div className="border-t border-white/10 pt-8 mt-12 text-center space-y-6">
            <h3 className="text-2xl font-bold">Start Creating Now</h3>
            <p className="text-zinc-400">Put these tips into practice with our free online editor.</p>
            <Link href="/" className="inline-block bg-blue-600 hover:bg-blue-500 text-white text-lg font-bold px-8 py-4 rounded-full transition-transform active:scale-95 shadow-xl shadow-blue-900/20">
                Open Onyx Editor
            </Link>
        </div>
      </main>
    </div>
  );
}
