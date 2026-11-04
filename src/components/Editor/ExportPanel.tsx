'use client';

import React, { useMemo, useState } from 'react';
import clsx from 'clsx';
import { FaDownload, FaCopy } from 'react-icons/fa6';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useEditor } from './EditorContext';

type Format = 'png' | 'jpeg' | 'webp';

export const ExportPanel: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { docSize, exportImage } = useEditor();
  const { toast } = useToast();

  const supportsWebP = useMemo(() => {
    if (typeof document === 'undefined') return false;
    try {
      return document.createElement('canvas').toDataURL('image/webp').startsWith('data:image/webp');
    } catch {
      return false;
    }
  }, []);

  const [format, setFormat] = useState<Format>('png');
  const [quality, setQuality] = useState(0.92);
  const [scale, setScale] = useState(1);
  const [customW, setCustomW] = useState<number | null>(null);
  const [transparent, setTransparent] = useState(false);

  // Custom width → derive scale
  const effectiveScale = customW ? clampScale(customW / docSize.width) : scale;
  const outW = Math.round(docSize.width * effectiveScale);
  const outH = Math.round(docSize.height * effectiveScale);

  function clampScale(s: number) {
    return Math.min(4, Math.max(0.1, s));
  }

  const run = async (mode: 'download' | 'copy') => {
    if (mode === 'copy' && format !== 'png') {
      toast('Clipboard copy supports PNG only', 'warning');
      return;
    }
    await exportImage({ format, quality, scale: effectiveScale, transparent, mode });
    onClose();
  };

  const scales = [0.5, 1, 2, 3];

  return (
    <Modal open={open} onClose={onClose} title="Export image" subtitle={`${outW} × ${outH} px output`}>
      <div className="space-y-5">
        {/* Format */}
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Format</p>
          <div className="flex gap-2">
            {(['png', 'jpeg', 'webp'] as Format[]).map((f) => {
              const disabled = f === 'webp' && !supportsWebP;
              return (
                <button
                  key={f}
                  disabled={disabled}
                  onClick={() => setFormat(f)}
                  className={clsx(
                    'focus-ring flex-1 rounded-xl border py-3 text-sm font-bold transition-all active:scale-[0.97]',
                    format === f
                      ? 'border-indigo-400/60 bg-indigo-500/20 text-indigo-200'
                      : disabled
                        ? 'cursor-not-allowed border-white/5 bg-zinc-800/30 text-zinc-600'
                        : 'border-white/10 bg-zinc-800/60 text-zinc-300 hover:border-white/20'
                  )}
                >
                  {f === 'jpeg' ? 'JPG' : f.toUpperCase()}
                </button>
              );
            })}
          </div>
          {format === 'png' && <p className="mt-1.5 text-[10px] text-zinc-500">PNG keeps transparency &amp; sharp text.</p>}
          {format === 'jpeg' && <p className="mt-1.5 text-[10px] text-zinc-500">Smaller files, no transparency. Great for photos.</p>}
          {format === 'webp' && <p className="mt-1.5 text-[10px] text-zinc-500">Modern format — smallest files at high quality.</p>}
        </div>

        {/* Quality */}
        {format !== 'png' && (
          <div>
            <div className="mb-1.5 flex justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              <span>Quality</span>
              <span className="font-mono text-zinc-300">{Math.round(quality * 100)}%</span>
            </div>
            <input
              type="range"
              min={0.3}
              max={1}
              step={0.02}
              value={quality}
              onChange={(e) => setQuality(parseFloat(e.target.value))}
              className="onyx-range w-full"
            />
          </div>
        )}

        {/* Scale */}
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Scale</p>
          <div className="flex gap-2">
            {scales.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setScale(s);
                  setCustomW(null);
                }}
                className={clsx(
                  'focus-ring flex-1 rounded-xl border py-2.5 font-mono text-xs font-bold transition-all active:scale-[0.97]',
                  !customW && scale === s
                    ? 'border-indigo-400/60 bg-indigo-500/20 text-indigo-200'
                    : 'border-white/10 bg-zinc-800/60 text-zinc-300 hover:border-white/20'
                )}
              >
                {s}×
              </button>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="number"
              min={16}
              placeholder={`Custom width (default ${docSize.width})`}
              value={customW ?? ''}
              onChange={(e) => {
                const v = e.target.value ? parseInt(e.target.value) : null;
                setCustomW(v && v >= 16 ? v : null);
              }}
              className="focus-ring w-full rounded-lg border border-white/10 bg-zinc-800/70 px-3 py-2 font-mono text-xs text-zinc-100 outline-none placeholder:font-sans placeholder:text-zinc-600 focus:border-indigo-400/50"
            />
          </div>
        </div>

        {/* Transparent */}
        {format === 'png' && (
          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-zinc-800/30 p-3">
            <span className="text-xs font-bold text-zinc-200">
              Transparent background
              <span className="block text-[10px] font-medium text-zinc-500">Removes the canvas color from the export</span>
            </span>
            <button
              type="button"
              onClick={() => setTransparent((t) => !t)}
              aria-label="Toggle transparent background"
              className={clsx('focus-ring relative h-5 w-9 shrink-0 rounded-full transition-colors', transparent ? 'bg-indigo-500' : 'bg-zinc-700')}
            >
              <span className={clsx('absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all', transparent ? 'left-[18px]' : 'left-0.5')} />
            </button>
          </label>
        )}

        {/* Output preview */}
        <div className="rounded-xl border border-white/10 bg-zinc-800/30 px-3 py-2.5 font-mono text-[11px] text-zinc-400">
          {outW} × {outH} px · {format === 'png' ? 'PNG' : format === 'jpeg' ? `JPG ${Math.round(quality * 100)}%` : `WebP ${Math.round(quality * 100)}%`}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {format === 'png' && (
            <button
              onClick={() => void run('copy')}
              className="focus-ring flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-zinc-800/70 py-3.5 text-sm font-bold text-zinc-100 transition-colors hover:bg-zinc-800"
            >
              <FaCopy size={13} /> Copy
            </button>
          )}
          <button
            onClick={() => void run('download')}
            className="focus-ring flex flex-[2] items-center justify-center gap-2 rounded-xl bg-brand-gradient py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-950/40 transition-transform active:scale-[0.98]"
          >
            <FaDownload size={13} /> Download
          </button>
        </div>
      </div>
    </Modal>
  );
};
