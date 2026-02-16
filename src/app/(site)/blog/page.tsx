import Link from 'next/link';
import { Metadata } from 'next';
import { BLOG_POSTS } from '@/lib/blog';
import JsonLd from '@/components/Seo/JsonLd';
import { FaArrowLeft, FaCalendar, FaUser, FaClock, FaArrowRight } from 'react-icons/fa6';

export const metadata: Metadata = {
  title: 'Onyx Blog - Image Editing Tips, Tutorials & Privacy',
  description: 'Read the latest articles about online image editing, privacy, and design tips from the Onyx team. Learn how to crop, resize, and filter photos like a pro.',
  alternates: {
      canonical: 'https://onyx.namansoni.in/blog',
  }
};

export default function BlogIndex() {
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
      }
    ]
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-blue-500/30">
      <JsonLd data={breadcrumbSchema} />

      {/* Header */}
      <header className="p-6 border-b border-white/10 sticky top-0 z-50 bg-black/80 backdrop-blur">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
            <Link href="/" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors font-bold">
                <FaArrowLeft /> Back to Editor
            </Link>
            <span className="font-black tracking-widest bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                ONYX BLOG
            </span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-12 pb-24">
        {/* Hero Section */}
        <section className="text-center space-y-6 py-12">
            <h1 className="text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-500 leading-tight">
                Master the Art of <br/> <span className="text-blue-500">Image Editing.</span>
            </h1>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
                Tutorials, comparisons, and insights on how to get the most out of your photos while protecting your privacy.
            </p>
        </section>

        {/* Blog Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {BLOG_POSTS.map((post) => (
                <Link key={post.slug} href={`/blog/${post.slug}`} className="group block bg-zinc-900/30 border border-white/5 rounded-2xl overflow-hidden hover:border-blue-500/30 transition-all hover:bg-zinc-900/50">
                    <div className="aspect-video bg-zinc-800 relative overflow-hidden">
                        {/* Placeholder for image - using gradient for now if real image fails/missing */}
                        <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center text-zinc-700 text-6xl group-hover:scale-105 transition-transform duration-500">
                             {/* In a real app, use Next.js Image here */}
                             <span className="opacity-20 font-black">ONYX</span>
                        </div>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="flex items-center gap-4 text-xs text-zinc-500">
                            <span className="flex items-center gap-1"><FaCalendar /> {new Date(post.date).toLocaleDateString()}</span>
                            <span className="flex items-center gap-1"><FaClock /> {post.readTime}</span>
                        </div>
                        <h2 className="text-xl font-bold group-hover:text-blue-400 transition-colors line-clamp-2">
                            {post.title}
                        </h2>
                        <p className="text-zinc-400 text-sm line-clamp-3">
                            {post.excerpt}
                        </p>
                        <div className="pt-4 flex items-center text-blue-500 text-sm font-bold gap-2">
                            Read Article <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>
                </Link>
            ))}
        </div>
      </main>
    </div>
  );
}
