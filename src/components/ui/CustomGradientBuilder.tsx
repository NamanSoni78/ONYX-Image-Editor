import React, { useState } from 'react';
import { FaPlus, FaTrash } from 'react-icons/fa6';
import { ColorPicker } from './ColorPicker';

interface CustomGradientBuilderProps {
    onApply: (gradient: string) => void;
    onCancel: () => void;
}

export const CustomGradientBuilder: React.FC<CustomGradientBuilderProps> = ({ onApply, onCancel }) => {
    const [type, setType] = useState<'linear' | 'radial'>('linear');
    const [direction, setDirection] = useState('to right');
    const [colors, setColors] = useState<string[]>(['#ff0000', '#0000ff']);

    const handleAddColor = () => {
        if (colors.length < 5) {
            setColors([...colors, '#ffffff']);
        }
    };

    const handleRemoveColor = (index: number) => {
        if (colors.length > 2) {
            const newColors = [...colors];
            newColors.splice(index, 1);
            setColors(newColors);
        }
    };

    const handleColorChange = (color: string, index: number) => {
        const newColors = [...colors];
        newColors[index] = color;
        setColors(newColors);
    };

    const getGradientString = () => {
        const colorStr = colors.join(', ');
        return type === 'linear'
            ? `linear-gradient(${direction}, ${colorStr})`
            : `radial-gradient(circle, ${colorStr})`;
    };

    return (
        <div className="p-4 bg-zinc-900 rounded-xl space-y-4 border border-white/10">
            <h3 className="text-xs font-bold text-zinc-400 uppercase">Create Custom Gradient</h3>

            {/* Preview */}
            <div
                className="h-20 rounded-lg w-full border border-white/20"
                style={{ background: getGradientString() }}
            />

            {/* Type Selection */}
            <div className="flex gap-2">
                <button
                    onClick={() => setType('linear')}
                    className={`px-3 py-1 rounded text-xs font-bold ${type === 'linear' ? 'bg-blue-500 text-white' : 'bg-zinc-800 text-zinc-400'}`}
                >
                    Linear
                </button>
                <button
                    onClick={() => setType('radial')}
                    className={`px-3 py-1 rounded text-xs font-bold ${type === 'radial' ? 'bg-blue-500 text-white' : 'bg-zinc-800 text-zinc-400'}`}
                >
                    Radial
                </button>
            </div>

            {/* Direction (Linear Only) */}
            {type === 'linear' && (
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                    {['to right', 'to left', 'to bottom', 'to top', '45deg', '-45deg'].map(d => (
                        <button
                            key={d}
                            onClick={() => setDirection(d)}
                            className={`px-2 py-1 rounded text-[10px] font-bold whitespace-nowrap ${direction === d ? 'bg-blue-500/20 text-blue-400' : 'bg-zinc-800 text-zinc-500'}`}
                        >
                            {d}
                        </button>
                    ))}
                </div>
            )}

            {/* Colors */}
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                     <span className="text-xs font-bold text-zinc-500">COLORS</span>
                     <button onClick={handleAddColor} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"><FaPlus/> Add</button>
                </div>
                <div className="flex gap-2 overflow-x-auto scrollbar-hide py-2">
                    {colors.map((c, i) => (
                        <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0">
                            <input
                                type="color"
                                value={c}
                                onChange={(e) => handleColorChange(e.target.value, i)}
                                className="w-8 h-8 rounded-full overflow-hidden cursor-pointer border-none p-0"
                            />
                            {colors.length > 2 && (
                                <button onClick={() => handleRemoveColor(i)} className="text-red-500 hover:text-red-400 text-xs"><FaTrash/></button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-4">
                <button onClick={onCancel} className="flex-1 py-2 bg-zinc-800 text-zinc-400 rounded-lg text-xs font-bold hover:bg-zinc-700">Cancel</button>
                <button onClick={() => onApply(getGradientString())} className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-xs font-bold hover:bg-blue-600">Apply</button>
            </div>
        </div>
    );
};
