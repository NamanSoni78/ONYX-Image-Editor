import React from 'react';
import Link from 'next/link';
import { FaNewspaper, FaArrowRight } from 'react-icons/fa6';
import { BLOG_POSTS } from '@/lib/blog';
import { generateMetadata } from '@/lib/seo-metadata';
import { generateSoftwareApplicationSchema, generateFAQSchema } from '@/lib/schema';
import JsonLd from '@/components/Seo/JsonLd';

import ProjectDashboard from '@/components/Home/ProjectDashboard';
import FeaturesGrid from '@/components/Home/FeaturesGrid';
import HowItWorks from '@/components/Home/HowItWorks';
import FaqSection from '@/components/Home/FaqSection';

export const metadata = generateMetadata({
  title: 'Onyx Image Editor - Free Online Photo Editor',
  description: 'Professional browser-based image editor. Crop, filter, text, shapes, masking, and more. No sign-up required. Privacy-focused.',
  canonicalUrl: 'https://onyx.namansoni.in',
});

export default function LandingPage() {
  const softwareAppSchema = generateSoftwareApplicationSchema(
    "Onyx Image Editor",
    "Professional browser-based image editor. Crop, filter, text, shapes, masking, and more. No sign-up required."
  );

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-blue-500/30">
      <JsonLd data={softwareAppSchema} />

      {/* Header */}
      <header className="p-6 flex justify-between items-center border-b border-white/10 glass sticky top-0 z-20 shrink-0 bg-black/80 backdrop-blur">
        <div className="text-2xl font-black tracking-widest bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent cursor-pointer">
            ONYX IMAGE EDITOR
        </div>
        <nav className="hidden md:flex gap-6 text-sm font-bold text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#blog" className="hover:text-white transition-colors">Blog</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
        </nav>
      </header>

      <main className="flex-1 p-6 max-w-6xl mx-auto w-full space-y-24">

        {/* Client-Side Dashboard */}
        <ProjectDashboard />

        {/* Server-Side Features */}
        <FeaturesGrid />

        {/* Server-Side HowItWorks (Why Choose) */}
        <HowItWorks />

        {/* Blog Section */}
        <section id="blog" className="space-y-8">
            <div className="flex justify-between items-end">
                <div className="space-y-2">
                    <h2 className="text-3xl font-bold flex items-center gap-3"><FaNewspaper className="text-blue-500"/> Latest from the Blog</h2>
                    <p className="text-zinc-400">Tips, tutorials, and comparisons.</p>
                </div>
                <Link href="/blog" className="text-blue-400 hover:text-blue-300 font-bold flex items-center gap-2">View All <FaArrowRight/></Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {BLOG_POSTS.slice(0, 3).map((post) => (
                    <Link key={post.slug} href={`/blog/${post.slug}`} className="group block bg-zinc-900/30 border border-white/5 rounded-2xl overflow-hidden hover:border-blue-500/30 transition-all">
                        <div className="aspect-video bg-zinc-800 relative overflow-hidden">
                             <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center text-zinc-700 text-4xl group-hover:scale-105 transition-transform duration-500">
                                 <span className="opacity-20 font-black">ONYX</span>
                             </div>
                        </div>
                        <div className="p-4 space-y-2">
                            <div className="text-xs text-zinc-500">{new Date(post.date).toLocaleDateString()}</div>
                            <h3 className="font-bold group-hover:text-blue-400 transition-colors line-clamp-2">{post.title}</h3>
                        </div>
                    </Link>
                ))}
            </div>
        </section>

        {/* SEO Content Section */}
        <section className="bg-zinc-900/20 border border-white/5 p-8 rounded-3xl space-y-6">
            <h2 className="text-2xl font-bold">The Best Free Online Image Editor</h2>
            <div className="prose prose-invert prose-sm max-w-none text-zinc-400 columns-1 md:columns-2 gap-8">
                <p>
                    Onyx is a state-of-the-art <strong>online image editor</strong> designed to bring professional-grade photo editing tools directly to your web browser. Whether you need to <strong>crop images</strong>, <strong>resize photos</strong>, or apply artistic <strong>photo filters</strong>, Onyx handles it all with speed and precision.
                </p>
                <p>
                    Unlike traditional desktop software like Photoshop, Onyx requires <strong>no installation</strong> and <strong>no signup</strong>. You can simply open the website and start editing immediately. This makes it the perfect solution for social media managers, content creators, and casual photographers who need a <strong>free photo editor</strong> on the go.
                </p>
                <p>
                    Our <strong>privacy-first approach</strong> sets us apart from other tools. Most <strong>online photo editors</strong> upload your sensitive images to a remote server for processing. Onyx uses advanced WebAssembly technology to process your images directly on your device. Your photos never leave your computer, ensuring complete data security.
                </p>
                <p>
                    From <strong>removing backgrounds</strong> (coming soon) to advanced <strong>image masking</strong> and <strong>vector drawing</strong>, Onyx is constantly evolving. Use our <strong>image converter</strong> to switch between JPG, PNG, and WebP formats effortlessly. Experience the future of photo editing with Onyx today.
                </p>
            </div>
        </section>

        {/* Server-Side FAQ */}
        <FaqSection />

      </main>
    </div>
  );
}
