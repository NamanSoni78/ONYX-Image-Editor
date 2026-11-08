'use client';

import React, { useEffect, useRef, useState } from 'react';
import Cropper, { ReactCropperElement } from 'react-cropper';
import 'cropperjs/dist/cropper.css';
import clsx from 'clsx';
import { FaXmark, FaCheck } from 'react-icons/fa6';

const RATIOS: { label: string; value: number }[] = [
  { label: 'Free', value: NaN },
  { label: '1:1', value: 1 },
  { label: '4:5', value: 4 / 5 },
  { label: '3:2', value: 3 / 2 },
  { label: '16:9', value: 16 / 9 },
  { label: '9:16', value: 9 / 16 },
];

interface CropModalProps {
  src: string;
  onCancel: () => void;
  onCrop: (croppedDataUrl: string) => void;
}

export const CropModal: React.FC<CropModalProps> = ({ src, onCancel, onCrop }) => {
  const cropperRef = useRef<ReactCropperElement>(null);
  const [ratio, setRatio] = useState<number>(NaN);

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
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-3">
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

      {/* Ratio presets */}
      <div className="mask-fade-x flex justify-center gap-1.5 overflow-x-auto border-b border-white/5 py-2 hide-scroll">
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
    </div>
  );
};
