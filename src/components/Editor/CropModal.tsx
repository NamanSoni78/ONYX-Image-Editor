'use client';

import React, { useEffect, useRef, useState } from 'react';
import Cropper, { ReactCropperElement } from 'react-cropper';
import 'cropperjs/dist/cropper.css';
import clsx from 'clsx';
import { FaXmark, FaCheck } from 'react-icons/fa6';
import type { CropShapeSpec } from './EditorContext';

const RATIOS: { label: string; value: number }[] = [
  { label: 'Free', value: NaN },
  { label: '1:1', value: 1 },
  { label: '4:5', value: 4 / 5 },
  { label: '3:2', value: 3 / 2 },
  { label: '16:9', value: 16 / 9 },
  { label: '9:16', value: 9 / 16 },
];

/** Shape cuts — a REAL (rasterized) crop. Tapping one applies instantly and
 *  closes; borders added afterwards follow the cut contour exactly. */
const SHAPE_CUTS: { key: CropShapeSpec['shape']; label: string; visual: React.ReactNode }[] = [
  { key: 'circle', label: 'Circle', visual: <div className="h-7 w-7 rounded-full border-2 border-zinc-300" /> },
  { key: 'square', label: 'Square', visual: <div className="h-7 w-7 rounded border-2 border-zinc-300" /> },
  { key: 'rounded', label: 'Round', visual: <div className="h-7 w-7 rounded-lg border-2 border-zinc-300" /> },
  { key: 'triangle', label: 'Triangle', visual: <div className="h-0 w-0 border-b-[26px] border-l-[14px] border-r-[14px] border-b-zinc-300 border-l-transparent border-r-transparent" /> },
  { key: 'star', label: 'Star', visual: <span className="text-2xl">⭐</span> },
  { key: 'heart', label: 'Heart', visual: <span className="text-2xl">❤️</span> },
  { key: 'hexagon', label: 'Hex', visual: <span className="text-2xl">⬡</span> },
  { key: 'pentagon', label: 'Penta', visual: <span className="text-2xl">⬠</span> },
  { key: 'diamond', label: 'Diamond', visual: <div className="h-6 w-6 rotate-45 border-2 border-zinc-300" /> },
];

interface CropModalProps {
  src: string;
  onCancel: () => void;
  onCrop: (croppedDataUrl: string) => void;
  /** apply a true shape cut (circle, star, …) to the live object */
  onShapeCrop: (spec: CropShapeSpec) => void;
}

export const CropModal: React.FC<CropModalProps> = ({ src, onCancel, onCrop, onShapeCrop }) => {
  const cropperRef = useRef<ReactCropperElement>(null);
  const [ratio, setRatio] = useState<number>(NaN);
  const [sides, setSides] = useState(6);

  // Escape cancels the crop (every other overlay closes on Esc too)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCancel();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onCancel]);

  const handleCrop = () => {
    const cropper = cropperRef.current?.cropper;
    if (cropper) {
      // getCroppedCanvas() returns null while the image is still loading
      const cv = cropper.getCroppedCanvas();
      if (!cv || !cv.width) return;
      onCrop(cv.toDataURL('image/png'));
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Crop image" className="fixed inset-0 z-[120] flex flex-col bg-black">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-3 pt-[env(safe-area-inset-top)]">
        <span className="text-xs font-black uppercase tracking-[0.14em] text-zinc-300">Crop image</span>
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="focus-ring flex min-h-11 items-center gap-2 rounded-full px-4 text-xs font-bold text-red-400 transition-colors hover:bg-red-500/10"
          >
            <FaXmark size={12} /> Cancel
          </button>
          <button
            onClick={handleCrop}
            className="focus-ring flex min-h-11 items-center gap-2 rounded-full bg-brand-gradient px-5 text-xs font-bold text-white"
          >
            <FaCheck size={12} /> Apply
          </button>
        </div>
      </div>

      {/* Ratio presets (rectangle crop) — left-aligned: justify-center on an
          overflow-x-auto row clips the FIRST chips on narrow viewports. */}
      <div className="mask-fade-x flex gap-1.5 overflow-x-auto border-b border-white/5 py-2 hide-scroll">
        {RATIOS.map((r) => (
          <button
            key={r.label}
            onClick={() => {
              setRatio(r.value);
              cropperRef.current?.cropper?.setAspectRatio(r.value);
            }}
            className={clsx(
              'focus-ring flex min-h-11 shrink-0 items-center rounded-lg px-3.5 text-[11px] font-bold transition-all active:scale-95',
              (Number.isNaN(ratio) && Number.isNaN(r.value)) || ratio === r.value
                ? 'bg-indigo-500/20 text-indigo-200'
                : 'bg-zinc-800/60 text-zinc-400 hover:text-zinc-200'
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="relative flex-1 overflow-hidden bg-black p-3">
        <Cropper
          src={src}
          style={{ height: '100%', width: '100%' }}
          initialAspectRatio={NaN}
          aspectRatio={NaN}
          guides={true}
          ref={cropperRef}
          viewMode={1}
          dragMode="move"
          background={false}
          responsive={true}
          autoCropArea={0.9}
        />
      </div>

      {/* Shape cuts — real cuts that borders can follow. One tap = applied. */}
      <div className="shrink-0 border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-between gap-2 px-3 pt-2">
          <span className="truncate text-[10px] font-bold uppercase tracking-wider text-zinc-500" title="A real cut — borders added afterwards follow the shape exactly">
            Shape crop · real cut
          </span>
          <div className="flex shrink-0 items-center gap-1.5" title="Polygon sides">
            <button
              onClick={() => setSides((s) => Math.max(3, s - 1))}
              aria-label="Fewer polygon sides"
              className="focus-ring flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-zinc-800/70 text-sm font-bold text-zinc-200 active:scale-90"
            >
              −
            </button>
            <span className="w-6 text-center font-mono text-xs font-bold text-zinc-100">{sides}</span>
            <button
              onClick={() => setSides((s) => Math.min(20, s + 1))}
              aria-label="More polygon sides"
              className="focus-ring flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-zinc-800/70 text-sm font-bold text-zinc-200 active:scale-90"
            >
              +
            </button>
          </div>
        </div>
        <div className="mask-fade-x flex gap-2 overflow-x-auto px-3 pb-3 pt-1.5 hide-scroll">
          {SHAPE_CUTS.map((s) => (
            <button
              key={s.key}
              onClick={() => onShapeCrop({ shape: s.key })}
              title={`Crop to ${s.label.toLowerCase()}`}
              className="focus-ring flex h-[62px] w-[62px] shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-white/10 bg-zinc-800/60 transition-all hover:border-white/20 hover:bg-zinc-800 active:scale-95"
            >
              {s.visual}
              <span className="text-[8px] font-bold uppercase text-zinc-400">{s.label}</span>
            </button>
          ))}
          <button
            onClick={() => onShapeCrop({ shape: 'polygon', sides })}
            title={`Crop to ${sides}-gon`}
            className="focus-ring flex h-[62px] w-[62px] shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-white/10 bg-zinc-800/60 transition-all hover:border-white/20 hover:bg-zinc-800 active:scale-95"
          >
            <span className="text-xs font-black text-zinc-300">{sides}</span>
            <span className="text-[8px] font-bold uppercase text-zinc-400">gon</span>
          </button>
        </div>
      </div>
    </div>
  );
};
