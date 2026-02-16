import { FaCheck, FaShieldHalved, FaBolt, FaDollarSign } from 'react-icons/fa6';
import JsonLd from '@/components/Seo/JsonLd';

export default function HowItWorks() {
  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": "How to Edit Images Online",
    "step": [
        { "@type": "HowToStep", "position": 1, "name": "Upload Image", "text": "Upload your photo to the Onyx editor." },
        { "@type": "HowToStep", "position": 2, "name": "Edit", "text": "Use tools like crop, resize, filter, or draw." },
        { "@type": "HowToStep", "position": 3, "name": "Export", "text": "Download your edited image instantly." }
    ]
  };

  return (
    <>
        <JsonLd data={howToSchema} />
        <section className="bg-gradient-to-br from-zinc-900 to-black p-8 md:p-12 rounded-3xl border border-white/10 space-y-12">
             <div className="text-center space-y-4">
                <h2 className="text-3xl md:text-4xl font-bold">Why We Are The Best Free Photo Editor</h2>
                <p className="text-zinc-400">Onyx is designed to be the ultimate Photoshop alternative for quick tasks.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-4">
                    <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400 text-xl"><FaShieldHalved /></div>
                    <h3 className="text-xl font-bold">100% Private & Secure</h3>
                    <p className="text-zinc-400">Your images never leave your browser. Unlike other online editors, we process everything locally.</p>
                </div>
                <div className="space-y-4">
                    <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center text-purple-400 text-xl"><FaBolt /></div>
                    <h3 className="text-xl font-bold">Blazing Fast Performance</h3>
                    <p className="text-zinc-400">No server uploads means instant editing. Work with large high-resolution files without any lag.</p>
                </div>
                <div className="space-y-4">
                    <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center text-green-400 text-xl"><FaDollarSign /></div>
                    <h3 className="text-xl font-bold">Free Forever</h3>
                    <p className="text-zinc-400">Access all professional features like masking and filters without any subscription or hidden fees.</p>
                </div>
            </div>
        </section>
    </>
  );
}
