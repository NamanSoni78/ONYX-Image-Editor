'use client';

import React from 'react';
import { FaPlus, FaMinus, FaExpand } from 'react-icons/fa6';
import { useEditor } from './EditorContext';

/** Floating zoom cluster — bottom-right of the canvas viewport */
export const ZoomControls: React.FC = () => {
  const { zoom, zoomIn, zoomOut, zoomFit, zoom100 } = useEditor();
  return (
    <div className="glass absolute bottom-3 right-3 z-20 flex items-center overflow-hidden rounded-xl border border-white/10 shadow-xl shadow-black/40">
      <button onClick={zoomOut} aria-label="Zoom out" className="focus-ring flex h-10 w-10 items-center justify-center text-zinc-300 transition-colors hover:bg-white/10 hover:text-white">
        <FaMinus size={12} />
      </button>
      <button
        onClick={zoom100}
        className="focus-ring min-h-[40px] min-w-[52px] px-1 text-center font-mono text-[11px] font-bold text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
        title="Reset to 100%"
      >
        {Math.round(zoom * 100)}%
      </button>
      <button onClick={zoomIn} aria-label="Zoom in" className="focus-ring flex h-10 w-10 items-center justify-center text-zinc-300 transition-colors hover:bg-white/10 hover:text-white">
        <FaPlus size={12} />
      </button>
      <button onClick={zoomFit} aria-label="Fit to screen" className="focus-ring flex h-10 w-10 items-center justify-center border-l border-white/10 text-zinc-300 transition-colors hover:bg-white/10 hover:text-white" title="Fit to screen (0)">
        <FaExpand size={12} />
      </button>
    </div>
  );
};
