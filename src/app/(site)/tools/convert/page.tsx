import Link from 'next/link';
import { CONVERT_PRESETS } from '@/lib/convert-presets';
import { generateMetadata } from '@/lib/seo-metadata';
import JsonLd from '@/components/Seo/JsonLd';
import { generateBreadcrumbSchema } from '@/lib/schema';
import { EmbeddedEditor } from '@/components/Editor/EmbeddedEditor';
import { FaFileImage, FaArrowRight } from 'react-icons/fa6';

export const metadata = generateMetadata({
  title: 'Convert Image Online - Free PNG, JPG, WebP Converter | Onyx',
  description: 'Convert images to PNG, JPG, WebP, HEIC and more. Free online image converter, no uploads needed. Privacy focused.',
  canonicalUrl: 'https://onyx.namansoni.in/tools/convert',
});

export default function ConvertHub() {
  const breadcrumb = generateBreadcrumbSchema([
    { name: 'Home', url: 'https://onyx.namansoni.in' },
    { name: 'Tools', url: 'https://onyx.namansoni.in/tools' },
    { name: 'Convert', url: 'https://onyx.namansoni.in/tools/convert' },
  ]);

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-blue-500/30">
      <JsonLd data={breadcrumb} />
      <header className="p-6 border-b border-white/10 flex justify-between items-center bg-black/80 backdrop-blur sticky top-0 z-20">
        <Link href="/" className="text-xl font-black tracking-widest bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          ONYX
        </Link>
        <Link href="/tools" className="text-sm font-bold text-zinc-400 hover:text-white transition-colors">
          All Tools
        </Link>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-12 pb-24">
        <section className="text-center py-12 space-y-6">
          <div className="inline-flex p-4 bg-zinc-900 rounded-2xl mb-4 text-blue-500 text-4xl">
            <FaFileImage />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold">Convert Images Online</h1>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            Easily convert between popular image formats. 100% free and private.
          </p>

          <div className="w-full max-w-5xl mx-auto relative z-10">
              <EmbeddedEditor slug="convert" />
          </div>

          <div className="flex justify-center">
            <Link href="/" className="bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-bold px-6 py-3 rounded-full transition-transform active:scale-95 border border-white/10">
               Open Full Screen Editor
            </Link>
          </div>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {CONVERT_PRESETS.map((preset) => (
            <Link key={preset.slug} href={`/tools/convert/${preset.slug}`} className="block p-6 rounded-xl bg-zinc-900/50 border border-white/5 hover:border-blue-500/50 hover:bg-zinc-900 transition-all group">
               <h3 className="font-bold text-lg mb-1 group-hover:text-blue-400 transition-colors">{preset.from} to {preset.to}</h3>
               <p className="text-zinc-500 text-sm">Convert {preset.from} images to {preset.to}</p>
               <div className="mt-4 flex items-center text-xs text-blue-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                 Convert Now <FaArrowRight className="ml-1" />
               </div>
            </Link>
          ))}
        </section>

        <section className="bg-zinc-900/20 border border-white/5 p-8 rounded-3xl space-y-4">
           <h2 className="text-2xl font-bold">Why Convert with Onyx?</h2>
           <ul className="list-disc list-inside text-zinc-400 space-y-2">
             <li><strong>Fast & Free:</strong> No signup required, instant conversions.</li>
             <li><strong>Privacy First:</strong> Images are processed locally in your browser.</li>
             <li><strong>Quality:</strong> Maintain high quality during format change.</li>
           </ul>
        </section>
      </main>
    </div>
  );
}
