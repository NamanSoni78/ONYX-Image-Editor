import { notFound } from 'next/navigation';
import Link from 'next/link';
import { RESIZE_PRESETS } from '@/lib/resize-presets';
import { generateMetadata as getSeoMetadata } from '@/lib/seo-metadata';
import JsonLd from '@/components/Seo/JsonLd';
import { EmbeddedEditor } from '@/components/Editor/EmbeddedEditor';
import { generateBreadcrumbSchema, generateFAQSchema, generateHowToSchema } from '@/lib/schema';
import { FaExpand, FaCheck, FaQuestion, FaArrowLeft } from 'react-icons/fa6';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return RESIZE_PRESETS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const preset = RESIZE_PRESETS.find((p) => p.slug === slug);
  if (!preset) return { title: 'Not Found' };

  return getSeoMetadata({
    title: `Resize Image to ${preset.width}x${preset.height} - ${preset.title} | Onyx`,
    description: `Resize images to ${preset.width}x${preset.height} pixels for ${preset.title}. Free online image resizer for social media and web. Privacy focused.`,
    canonicalUrl: `https://onyx.namansoni.in/tools/resize/${slug}`,
    keywords: [`resize image to ${preset.width}x${preset.height}`, `resize for ${preset.title}`, 'online image resizer', 'image scaler'],
  });
}

export default async function ResizePresetPage({ params }: PageProps) {
  const { slug } = await params;
  const preset = RESIZE_PRESETS.find((p) => p.slug === slug);
  if (!preset) notFound();

  const breadcrumb = generateBreadcrumbSchema([
    { name: 'Home', url: 'https://onyx.namansoni.in' },
    { name: 'Tools', url: 'https://onyx.namansoni.in/tools' },
    { name: 'Resize', url: 'https://onyx.namansoni.in/tools/resize' },
    { name: preset.title, url: `https://onyx.namansoni.in/tools/resize/${slug}` },
  ]);

  const faqSchema = generateFAQSchema([
    { question: `How do I resize an image to ${preset.width}x${preset.height}?`, answer: `Upload your image to Onyx, select the Resize tool, and enter ${preset.width} for width and ${preset.height} for height. Or simply use this preset page.` },
    { question: 'Is it free?', answer: 'Yes, Onyx is a free online image editor.' },
    { question: 'Does it reduce quality?', answer: 'Onyx uses high-quality resampling to minimize quality loss.' }
  ]);

  const howToSchema = generateHowToSchema([
    "Upload your image.",
    `Set dimensions to ${preset.width}x${preset.height}.`,
    "Apply and download."
  ]);

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-blue-500/30">
      <JsonLd data={[breadcrumb, faqSchema, howToSchema]} />

      <header className="p-6 border-b border-white/10 flex justify-between items-center bg-black/80 backdrop-blur sticky top-0 z-20">
        <div className="flex items-center gap-4">
            <Link href="/tools/resize" className="text-zinc-400 hover:text-white transition-colors">
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
            <FaExpand />
          </div>
          <h1 className="text-3xl md:text-5xl font-bold leading-tight">
            Resize Image to <span className="text-blue-500">{preset.width}x{preset.height}</span>
          </h1>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            Instantly resize your photos for <strong>{preset.title}</strong>. Perfect dimensions, zero quality loss.
          </p>

          <div className="w-full max-w-5xl mx-auto relative z-10">
              <EmbeddedEditor slug="resize" />
          </div>

          <div className="flex justify-center pt-4">
             <Link href="/" className="bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-bold px-6 py-3 rounded-full transition-transform active:scale-95 border border-white/10">
                Open Full Screen Editor
             </Link>
          </div>
        </section>

        <section className="bg-zinc-900/30 border border-white/5 p-8 rounded-3xl space-y-6">
            <h2 className="text-2xl font-bold">How to Resize for {preset.title}</h2>
            <ol className="list-decimal list-inside space-y-4 text-zinc-300 text-lg">
                <li>Click the button above to open the Onyx Editor.</li>
                <li>Upload the photo you want to use for {preset.title}.</li>
                <li>The resize tool will be pre-set to <strong>{preset.width} x {preset.height}</strong> pixels.</li>
                <li>Adjust the crop area if needed to fit the aspect ratio.</li>
                <li>Click "Export" to download your perfectly sized image.</li>
            </ol>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
                <h3 className="text-xl font-bold flex items-center gap-2"><FaCheck className="text-green-500"/> Exact Dimensions</h3>
                <p className="text-zinc-400">Get the precise {preset.width}x{preset.height} size required for {preset.title}, ensuring your content looks professional.</p>
            </div>
            <div className="space-y-4">
                <h3 className="text-xl font-bold flex items-center gap-2"><FaCheck className="text-green-500"/> Privacy Focused</h3>
                <p className="text-zinc-400">Your images are processed locally in your browser. We never upload or store your personal photos.</p>
            </div>
        </section>

        <section className="space-y-6">
             <h2 className="text-2xl font-bold text-center">Frequently Asked Questions</h2>
             <div className="space-y-4">
                 <div className="border border-white/10 rounded-xl bg-zinc-900/20 p-4">
                     <h3 className="font-bold mb-2 flex items-center gap-2"><FaQuestion className="text-blue-500"/> What is the best size for {preset.title}?</h3>
                     <p className="text-zinc-400">The recommended size is {preset.width}x{preset.height} pixels.</p>
                 </div>
                 <div className="border border-white/10 rounded-xl bg-zinc-900/20 p-4">
                     <h3 className="font-bold mb-2 flex items-center gap-2"><FaQuestion className="text-blue-500"/> Is it free?</h3>
                     <p className="text-zinc-400">Yes, resizing images with Onyx is completely free.</p>
                 </div>
             </div>
        </section>
      </main>
    </div>
  );
}
