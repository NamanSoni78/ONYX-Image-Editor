import Link from 'next/link';
import { FEATURES } from '@/lib/features';
import { RESIZE_PRESETS } from '@/lib/resize-presets';
import { CONVERT_PRESETS } from '@/lib/convert-presets';
import { generateMetadata } from '@/lib/seo-metadata';
import JsonLd from '@/components/Seo/JsonLd';
import { generateBreadcrumbSchema } from '@/lib/schema';
import { FaArrowRight, FaCrop, FaExpand, FaWandMagicSparkles, FaFont, FaMask, FaPen, FaArrowRotateRight, FaLeftRight, FaFileImage } from 'react-icons/fa6';

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
  'convert': FaFileImage
};

export const metadata = generateMetadata({
  title: 'Online Image Editing Tools - Crop, Resize, Convert | Onyx',
  description: 'Access all our free online image editing tools. Crop photos, resize images for social media, convert formats, add filters, and more.',
  canonicalUrl: 'https://onyx.namansoni.in/tools',
});

export default function ToolsHub() {
  const breadcrumb = generateBreadcrumbSchema([
    { name: 'Home', url: 'https://onyx.namansoni.in' },
    { name: 'Tools', url: 'https://onyx.namansoni.in/tools' },
  ]);

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-blue-500/30">
      <JsonLd data={breadcrumb} />
      <header className="p-6 border-b border-white/10 flex justify-between items-center bg-black/80 backdrop-blur sticky top-0 z-20">
        <Link href="/" className="text-xl font-black tracking-widest bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          ONYX
        </Link>
        <Link href="/" className="text-sm font-bold text-zinc-400 hover:text-white transition-colors">
          Home
        </Link>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-16 pb-24">

        {/* Core Tools */}
        <section className="space-y-8">
            <div className="text-center space-y-4 pt-12">
                <h1 className="text-4xl md:text-6xl font-bold">All Image Tools</h1>
                <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
                    Everything you need to edit images online. No signup required.
                </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {FEATURES.map((feature) => {
                    const Icon = IconMap[feature.icon] || FaFileImage;
                    return (
                        <Link
                            key={feature.slug}
                            href={`/tools/${feature.slug}`}
                            className="bg-zinc-900/40 border border-white/5 p-6 rounded-2xl hover:bg-zinc-900 hover:border-blue-500/30 transition-all group text-center space-y-4"
                        >
                            <div className="text-blue-500 text-3xl mb-2 group-hover:scale-110 transition-transform inline-block">
                                <Icon />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">{feature.content.heroTitle}</h3>
                                <p className="text-xs text-zinc-500 mt-2 line-clamp-2">{feature.description}</p>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </section>

        {/* Quick Resize Presets */}
        <section className="space-y-6">
            <div className="flex justify-between items-end border-b border-white/10 pb-4">
                <h2 className="text-2xl font-bold">Popular Resize Presets</h2>
                <Link href="/tools/resize" className="text-blue-400 hover:text-blue-300 text-sm font-bold flex items-center gap-2">View All <FaArrowRight/></Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {RESIZE_PRESETS.slice(0, 10).map((preset) => (
                    <Link key={preset.slug} href={`/tools/resize/${preset.slug}`} className="p-4 rounded-xl bg-zinc-900/30 border border-white/5 hover:bg-zinc-900 hover:border-blue-500/30 transition-colors text-center group">
                        <span className="block text-sm font-bold truncate group-hover:text-blue-400 transition-colors">{preset.title}</span>
                        <span className="text-xs text-zinc-600">{preset.width} x {preset.height}</span>
                    </Link>
                ))}
            </div>
        </section>

        {/* Quick Convert Presets */}
        <section className="space-y-6">
            <div className="flex justify-between items-end border-b border-white/10 pb-4">
                <h2 className="text-2xl font-bold">Convert Image Formats</h2>
                <Link href="/tools/convert" className="text-blue-400 hover:text-blue-300 text-sm font-bold flex items-center gap-2">View All <FaArrowRight/></Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {CONVERT_PRESETS.slice(0, 8).map((preset) => (
                    <Link key={preset.slug} href={`/tools/convert/${preset.slug}`} className="p-4 rounded-xl bg-zinc-900/30 border border-white/5 hover:bg-zinc-900 hover:border-blue-500/30 transition-colors text-center group">
                        <span className="block text-sm font-bold truncate group-hover:text-blue-400 transition-colors">{preset.from} to {preset.to}</span>
                    </Link>
                ))}
            </div>
        </section>

      </main>
    </div>
  );
}
