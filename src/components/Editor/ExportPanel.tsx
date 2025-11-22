'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaXmark, FaDownload, FaLock, FaLockOpen } from 'react-icons/fa6';

interface ExportPanelProps {
  onClose: () => void;
  onExport: (format: 'png' | 'jpeg', quality: number, options: { width: number, height: number, ratio: boolean }) => void;
}

export const ExportPanel: React.FC<ExportPanelProps> = ({ onClose, onExport }) => {
  const [format, setFormat] = useState<'png' | 'jpeg'>('png');
  const [quality, setQuality] = useState(1);
  const [width, setWidth] = useState(1080);
  const [height, setHeight] = useState(1080);
  const [ratio, setRatio] = useState(true);

  const handleWidthChange = (val: number) => {
    setWidth(val);
    if (ratio) setHeight(val);
  };

  const handleHeightChange = (val: number) => {
    setHeight(val);
    if (ratio) setWidth(val);
  };

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="absolute bottom-0 w-full bg-zinc-900 rounded-t-2xl z-40 shadow-2xl p-4 border-t border-zinc-800 pb-10"
    >
      <div className="flex justify-between mb-6 items-center">
        <span className="font-bold text-white text-lg">Export Settings</span>
        <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
            <FaXmark className="text-zinc-400 hover:text-white" />
        </button>
      </div>

      <div className="space-y-6">
        {/* Dimensions */}
        <div className="flex gap-4 items-end">
            <div className="flex-1">
                <label className="text-[10px] font-bold text-zinc-500 mb-1 block uppercase">Width (px)</label>
                <input
                    type="number"
                    value={width}
                    onChange={(e) => handleWidthChange(parseInt(e.target.value) || 0)}
                    className="w-full bg-zinc-800 text-white p-2 rounded-lg border border-zinc-700 text-sm font-bold"
                />
            </div>
            <button
                onClick={() => setRatio(!ratio)}
                className={`p-2 rounded-lg mb-1 ${ratio ? 'text-blue-400 bg-blue-500/10' : 'text-zinc-500 hover:bg-zinc-800'}`}
            >
                {ratio ? <FaLock /> : <FaLockOpen />}
            </button>
            <div className="flex-1">
                <label className="text-[10px] font-bold text-zinc-500 mb-1 block uppercase">Height (px)</label>
                <input
                    type="number"
                    value={height}
                    onChange={(e) => handleHeightChange(parseInt(e.target.value) || 0)}
                    className="w-full bg-zinc-800 text-white p-2 rounded-lg border border-zinc-700 text-sm font-bold"
                />
            </div>
        </div>

        <div>
            <label className="text-xs font-bold text-zinc-500 mb-2 block">FORMAT</label>
            <div className="flex gap-3">
                <button
                    onClick={() => setFormat('png')}
                    className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors ${format === 'png' ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                >
                    PNG
                </button>
                <button
                    onClick={() => setFormat('jpeg')}
                    className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors ${format === 'jpeg' ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                >
                    JPG
                </button>
            </div>
        </div>

        {format === 'jpeg' && (
             <div>
                <div className="flex justify-between text-[10px] text-zinc-400 font-bold mb-1 uppercase">
                    <span>Quality</span>
                    <span>{Math.round(quality * 100)}%</span>
                </div>
                <input
                    type="range"
                    min={0.1}
                    max={1}
                    step={0.1}
                    value={quality}
                    onChange={(e) => setQuality(parseFloat(e.target.value))}
                    className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
            </div>
        )}

        <button
            onClick={() => onExport(format, quality, { width, height, ratio })}
            className="w-full bg-white text-black py-4 rounded-xl font-bold text-base mt-2 flex items-center justify-center gap-2 hover:bg-zinc-200 transition-colors"
        >
            <FaDownload /> Download Image
        </button>
      </div>
    </motion.div>
  );
};
