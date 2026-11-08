import React from 'react';
import { FaEyeDropper } from 'react-icons/fa6';

interface ColorPickerProps {
  selected: string;
  onChange: (color: string) => void;
}

const COLORS = ['#ffffff', '#000000', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b'];

export const ColorPicker: React.FC<ColorPickerProps> = ({ selected, onChange }) => {
  return (
    <div className="mask-fade-x flex gap-2 overflow-x-auto py-2 hide-scroll" role="group" aria-label="Color picker">
      {/* Custom Color Picker */}
      <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full border border-white/20 sm:h-8 sm:w-8">
        <input
          type="color"
          aria-label="Custom color"
          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
          onChange={(e) => onChange(e.target.value)}
        />
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 transition-colors group-hover:bg-zinc-800">
          <FaEyeDropper className="text-xs text-white" />
        </div>
      </div>

      {/* Transparent */}
      <button
        type="button"
        onClick={() => onChange('transparent')}
        aria-label="Transparent"
        className="h-10 w-10 flex-shrink-0 cursor-pointer rounded-full border border-white/20 sm:h-8 sm:w-8"
        style={{
          backgroundImage:
            "url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAIklEQVQIW2NkQAKrVq36zwjjgzhhYWGMYAEYB8RmROaABADeOQ8CXl/xfgAAAABJRU5ErkJggg==')",
        }}
      />

      {/* Presets — 40px on touch, 32 on pointer devices */}
      {COLORS.map((c) => (
        <button
          type="button"
          key={c}
          onClick={() => onChange(c)}
          aria-label={`Color ${c}`}
          className={`h-10 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 transition-all sm:h-8 sm:w-8 ${
            selected === c
              ? 'scale-110 border-indigo-400 ring-2 ring-indigo-400/30'
              : 'border-transparent hover:border-white/30'
          }`}
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  );
};
