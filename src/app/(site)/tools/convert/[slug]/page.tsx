import { notFound } from 'next/navigation';
import Link from 'next/link';
import { CONVERT_PRESETS } from '@/lib/convert-presets';
import { generateMetadata as getSeoMetadata } from '@/lib/seo-metadata';
import JsonLd from '@/components/Seo/JsonLd';
import { EmbeddedEditor } from '@/components/Editor/EmbeddedEditor';
import { generateBreadcrumbSchema, generateFAQSchema, generateHowToSchema } from '@/lib/schema';
import { FaFileImage, FaCheck, FaQuestion, FaArrowLeft } from 'react-icons/fa6';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return CONVERT_PRESETS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const preset = CONVERT_PRESETS.find((p) => p.slug === slug);
  if (!preset) return { title: 'Not Found' };

  return getSeoMetadata({
    title: `Convert ${preset.from} to ${preset.to} Online - Free Converter | Onyx`,
    description: `Easily convert ${preset.from} images to ${preset.to} format online. Free, fast, and secure image converter. No uploads required.`,
    canonicalUrl: `https://onyx.namansoni.in/tools/convert/${slug}`,
    keywords: [`convert ${preset.from} to ${preset.to}`, `online ${preset.from} converter`, `free ${preset.to} conversion`, 'image format converter'],
  });
}

export default async function ConvertPresetPage({ params }: PageProps) {
  const { slug } = await params;
  const preset = CONVERT_PRESETS.find((p) => p.slug === slug);
  if (!preset) notFound();

  const breadcrumb = generateBreadcrumbSchema([
    { name: 'Home', url: 'https://onyx.namansoni.in' },
    { name: 'Tools', url: 'https://onyx.namansoni.in/tools' },
    { name: 'Convert', url: 'https://onyx.namansoni.in/tools/convert' },
    { name: `${preset.from} to ${preset.to}`, url: `https://onyx.namansoni.in/tools/convert/${slug}` },
  ]);

  const faqSchema = generateFAQSchema([
    { question: `How do I convert ${preset.from} to ${preset.to}?`, answer: `Upload your ${preset.from} file to Onyx, check the format, and export as ${preset.to}.` },
    { question: 'Is it free?', answer: 'Yes, Onyx is a free online image converter.' },
    { question: 'Is it secure?', answer: 'Yes, files are processed locally in your browser.' }
  ]);

  const howToSchema = generateHowToSchema([
    `Upload your ${preset.from} file.`,
    `Select "Export" from the menu.`,
    `Choose ${preset.to} as the format.`
  ]);

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-blue-500/30">
      <JsonLd data={[breadcrumb, faqSchema, howToSchema]} />

      <header className="p-6 border-b border-white/10 flex justify-between items-center bg-black/80 backdrop-blur sticky top-0 z-20">
        <div className="flex items-center gap-4">
            <Link href="/tools/convert" className="text-zinc-400 hover:text-white transition-colors">
                <FaArrowLeft /> Back
            </Link>
            <Link href="/" className="text-xl font-black tracking-widest bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              ONYX
            </Link>
        </div>
        <Link href="/" className="bg-white text-black px-4 py-2 rounded-full text-sm font-bold hover:bg-zinc-200 transition-colors">
            Open Editor
        </Link>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-12 pb-24">
        <section className="text-center py-12 space-y-6">
          <div className="inline-flex p-4 bg-zinc-900 rounded-2xl mb-4 text-blue-500 text-4xl">
            <FaFileImage />
          </div>
          <h1 className="text-3xl md:text-5xl font-bold leading-tight">
            Convert <span className="text-blue-500">{preset.from}</span> to <span className="text-purple-500">{preset.to}</span>
          </h1>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            Instantly convert your {preset.from} files to {preset.to} format directly in your browser. No server uploads.
          </p>

          <div className="w-full max-w-5xl mx-auto relative z-10">
              <EmbeddedEditor slug="convert" />
          </div>

          <div className="flex justify-center pt-4">
             <Link href="/" className="bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-bold px-6 py-3 rounded-full transition-transform active:scale-95 border border-white/10">
                Open Full Screen Editor
             </Link>
          </div>
        </section>

        <section className="bg-zinc-900/30 border border-white/5 p-8 rounded-3xl space-y-6">
            <h2 className="text-2xl font-bold">How to Convert {preset.from} to {preset.to}</h2>
            <ol className="list-decimal list-inside space-y-4 text-zinc-300 text-lg">
                <li>Click "Convert Now" to open the Onyx Editor.</li>
                <li>Upload or drag & drop your {preset.from} file.</li>
                <li>Make any optional edits (crop, resize, filter).</li>
                <li>Click "Export" and select <strong>{preset.to}</strong> format.</li>
                <li>Download your converted file instantly.</li>
            </ol>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
                <h3 className="text-xl font-bold flex items-center gap-2"><FaCheck className="text-green-500"/> High Quality Conversion</h3>
                <p className="text-zinc-400">Our converter maintains the highest possible quality when switching from {preset.from} to {preset.to}.</p>
            </div>
            <div className="space-y-4">
                <h3 className="text-xl font-bold flex items-center gap-2"><FaCheck className="text-green-500"/> Privacy First</h3>
                <p className="text-zinc-400">Unlike other converters, your files never leave your device. Conversion happens locally.</p>
            </div>
        </section>

        <section className="space-y-6">
             <h2 className="text-2xl font-bold text-center">Frequently Asked Questions</h2>
             <div className="space-y-4">
                 <div className="border border-white/10 rounded-xl bg-zinc-900/20 p-4">
                     <h3 className="font-bold mb-2 flex items-center gap-2"><FaQuestion className="text-blue-500"/> Can I batch convert?</h3>
                     <p className="text-zinc-400">Yes, you can upload multiple files to separate projects and export them individually.</p>
                 </div>
                 <div className="border border-white/10 rounded-xl bg-zinc-900/20 p-4">
                     <h3 className="font-bold mb-2 flex items-center gap-2"><FaQuestion className="text-blue-500"/> Is it free?</h3>
                     <p className="text-zinc-400">Yes, converting images with Onyx is completely free.</p>
                 </div>
             </div>
        </section>
      </main>
    </div>
  );
}
