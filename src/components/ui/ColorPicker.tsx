import React from 'react';
import { FaEyeDropper } from 'react-icons/fa6';

interface ColorPickerProps {
  selected: string;
  onChange: (color: string) => void;
}

const COLORS = ['#ffffff', '#000000', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b'];

export const ColorPicker: React.FC<ColorPickerProps> = ({ selected, onChange }) => {
  return (
    <div className="flex gap-2 overflow-x-auto py-2 scrollbar-hide">
      {/* Custom Color Picker */}
      <div className="w-8 h-8 rounded-full border border-white/20 relative overflow-hidden flex-shrink-0 group">
        <input
          type="color"
          className="opacity-0 w-full h-full absolute inset-0 cursor-pointer z-10"
          onChange={(e) => onChange(e.target.value)}
        />
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 group-hover:bg-zinc-800 transition-colors">
          <FaEyeDropper className="text-xs text-white" />
        </div>
      </div>

      {/* Transparent */}
      <div
        onClick={() => onChange('transparent')}
        className="w-8 h-8 rounded-full border border-white/20 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAIklEQVQIW2NkQAKrVq36zwjjgzhhYWGMYAEYB8RmROaABADeOQ8CXl/xfgAAAABJRU5ErkJggg==')] flex-shrink-0 cursor-pointer"
      ></div>

      {/* Presets */}
      {COLORS.map(c => (
        <div
          key={c}
          onClick={() => onChange(c)}
          className={`w-8 h-8 rounded-full flex-shrink-0 border-2 cursor-pointer transition-all ${selected === c ? 'border-blue-500 scale-110' : 'border-transparent hover:border-white/30'}`}
          style={{ backgroundColor: c }}
        ></div>
      ))}
    </div>
  );
};
