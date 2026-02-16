import { FaQuestion } from 'react-icons/fa6';
import JsonLd from '@/components/Seo/JsonLd';

export default function FaqSection() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      { "@type": "Question", "name": "Is Onyx really free?", "acceptedAnswer": { "@type": "Answer", "text": "Yes, Onyx is completely free to use. There are no watermarks or premium-only features." } },
      { "@type": "Question", "name": "Is my data safe?", "acceptedAnswer": { "@type": "Answer", "text": "Absolutely. Onyx runs entirely in your browser. We do not store or see your images." } },
      { "@type": "Question", "name": "Can I use it on mobile?", "acceptedAnswer": { "@type": "Answer", "text": "Yes, Onyx is optimized for touch devices, allowing you to edit photos on your phone or tablet." } }
    ]
  };

  return (
    <>
        <JsonLd data={faqSchema} />
        <section id="faq" className="max-w-3xl mx-auto w-full space-y-8">
             <div className="text-center space-y-4">
                <h2 className="text-3xl md:text-4xl font-bold">Frequently Asked Questions</h2>
            </div>
            <div className="space-y-4">
                 <div className="border border-white/10 rounded-xl overflow-hidden bg-zinc-900/20">
                    <div className="p-4 font-bold text-lg bg-white/5 flex gap-4 items-center"><FaQuestion className="text-blue-500 text-sm"/> Is Onyx really free?</div>
                    <div className="p-4 text-zinc-400 pt-0">Yes, Onyx is completely free to use. There are no watermarks or premium-only features.</div>
                </div>
                <div className="border border-white/10 rounded-xl overflow-hidden bg-zinc-900/20">
                    <div className="p-4 font-bold text-lg bg-white/5 flex gap-4 items-center"><FaQuestion className="text-blue-500 text-sm"/> Is my data safe?</div>
                    <div className="p-4 text-zinc-400 pt-0">Absolutely. Onyx runs entirely in your browser. We do not store or see your images.</div>
                </div>
                <div className="border border-white/10 rounded-xl overflow-hidden bg-zinc-900/20">
                    <div className="p-4 font-bold text-lg bg-white/5 flex gap-4 items-center"><FaQuestion className="text-blue-500 text-sm"/> Can I use it on mobile?</div>
                    <div className="p-4 text-zinc-400 pt-0">Yes, Onyx is optimized for touch devices, allowing you to edit photos on your phone or tablet.</div>
                </div>
            </div>
        </section>
    </>
  );
}
