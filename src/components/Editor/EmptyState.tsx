'use client';

import React from 'react';
import clsx from 'clsx';
import { FaCloudArrowUp, FaRegImage } from 'react-icons/fa6';
import { useEditor } from './EditorContext';
import { DOC_PRESETS } from './constants';

/**
 * Onboarding overlay shown while the document is empty:
 * dropzone + social-size presets. Disappears as soon as content exists.
 */
export const EmptyState: React.FC = () => {
  const { layers, docSize, setDocSize, openFilePicker } = useEditor();

  if (layers.length > 0) return null;

  const isDefault = docSize.width === 1080 && docSize.height === 1080;

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center p-4">
      <div className="glass flex w-full max-w-md flex-col items-center gap-5 rounded-2xl border border-white/10 p-6 text-center shadow-2xl shadow-black/50">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-indigo-400/30 bg-indigo-500/10 text-2xl text-indigo-300">
          <FaRegImage />
        </div>

        <div className="space-y-1">
          <h2 className="text-base font-bold text-white">Start with an image</h2>
          <p className="text-xs leading-relaxed text-zinc-400">
            Drop it anywhere, paste from clipboard, or browse —<br />
            it never leaves your device.
          </p>
        </div>

        <button
          onClick={openFilePicker}
          className="focus-ring flex w-full items-center justify-center gap-2 rounded-xl bg-brand-gradient py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-950/40 transition-transform active:scale-[0.98]"
        >
          <FaCloudArrowUp /> Browse files
        </button>

        <div className="w-full space-y-2.5">
          <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-zinc-600">
            <span className="h-px flex-1 bg-white/10" />
            or start with a canvas
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <div className="flex flex-wrap justify-center gap-1.5">
            {DOC_PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => setDocSize(p.width, p.height)}
                className={clsx(
                  'focus-ring rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition-all active:scale-95',
                  docSize.width === p.width && docSize.height === p.height
                    ? 'border-indigo-400/60 bg-indigo-500/15 text-indigo-200'
                    : 'border-white/10 bg-zinc-800/50 text-zinc-300 hover:border-white/25'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap justify-center gap-1.5">
            <span className="py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-600">Ratio</span>
            {([
              ['1:1', 1], ['4:5', 4 / 5], ['3:2', 3 / 2], ['2:3', 2 / 3], ['16:9', 16 / 9], ['9:16', 9 / 16],
            ] as [string, number][]).map(([label, r]) => {
              const long = 1080;
              const w = r >= 1 ? long : Math.round(long * r);
              const h = r >= 1 ? Math.round(long / r) : long;
              return (
                <button
                  key={label}
                  onClick={() => setDocSize(w, h)}
                  className={clsx(
                    'focus-ring rounded-lg border px-2.5 py-1 font-mono text-[11px] font-bold transition-all active:scale-95',
                    docSize.width === w && docSize.height === h
                      ? 'border-indigo-400/60 bg-indigo-500/15 text-indigo-200'
                      : 'border-white/10 bg-zinc-800/50 text-zinc-300 hover:border-white/25'
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {!isDefault && (
            <p className="pt-1 font-mono text-[10px] text-zinc-500">
              Canvas ready: {docSize.width} × {docSize.height} px
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
