import React, { useState } from 'react';
import { FaPlus } from 'react-icons/fa6';
import { CustomGradientBuilder } from './CustomGradientBuilder';

interface GradientPickerProps {
  selected: string;
  onChange: (gradient: string) => void;
  onCustomGradient: (colors: string[]) => void;
}

const GRADIENTS = [
  'linear-gradient(to right, #ff7e5f, #feb47b)',
  'linear-gradient(to right, #00c6ff, #0072ff)',
  'linear-gradient(to right, #f7971e, #ffd200)',
  'linear-gradient(to right, #8e2de2, #4a00e0)',
  'linear-gradient(to right, #11998e, #38ef7d)',
  'linear-gradient(to right, #fc466b, #3f5efb)',
  'radial-gradient(circle, #ff9a9e, #fecfef)',
  'radial-gradient(circle, #a18cd1, #fbc2eb)',
];

export const GradientPicker: React.FC<GradientPickerProps> = ({ selected, onChange, onCustomGradient }) => {
    const [showBuilder, setShowBuilder] = useState(false);

    if (showBuilder) {
        return <CustomGradientBuilder onApply={(g) => { onChange(g); setShowBuilder(false); }} onCancel={() => setShowBuilder(false)} />;
    }

    return (
        <div className="flex gap-2 overflow-x-auto py-2 scrollbar-hide items-center">
             {/* Create New */}
             <button
                onClick={() => setShowBuilder(true)}
                className="w-10 h-10 rounded-full flex-shrink-0 border border-white/20 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 transition-colors"
                title="Create Custom Gradient"
            >
                <FaPlus className="text-zinc-400" />
            </button>

            {GRADIENTS.map((g, i) => (
                <div
                    key={i}
                    onClick={() => onChange(g)}
                    className={`w-10 h-10 rounded-full flex-shrink-0 border-2 cursor-pointer transition-all ${selected === g ? 'border-white scale-110' : 'border-transparent hover:border-white/30'}`}
                    style={{ background: g }}
                ></div>
            ))}
        </div>
    );
}
