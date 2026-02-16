import Link from 'next/link';
import { FEATURES } from '@/lib/features';
import { FaStar, FaCrop, FaExpand, FaWandMagicSparkles, FaFont, FaMask, FaPen, FaArrowRotateRight, FaLeftRight, FaFileImage } from 'react-icons/fa6';

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

export default function FeaturesGrid() {
  return (
    <section id="features" className="space-y-8">
        <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-5xl font-bold">Powerful Online Image Tools</h2>
            <p className="text-zinc-400 max-w-2xl mx-auto">Everything you need to edit photos online. Crop, mask, filter, and draw—all in one place.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {FEATURES.map((feature) => {
                const Icon = IconMap[feature.icon] || FaStar;
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
  );
}
