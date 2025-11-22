import React from 'react';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (val: number) => void;
}

export const Slider: React.FC<SliderProps> = ({ label, value, min, max, step = 1, onChange }) => {
  return (
    <div className="mb-3 px-1 w-full">
      <div className="flex justify-between text-[10px] text-zinc-400 font-bold mb-1 uppercase">
        <span>{label}</span>
        <span>{Math.round(value * 100) / 100}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
      />
    </div>
  );
};
