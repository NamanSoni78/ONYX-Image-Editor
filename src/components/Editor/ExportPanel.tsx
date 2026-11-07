'use client';

import React, { useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { FaDownload, FaCopy, FaLock, FaLockOpen, FaShapes, FaCropSimple } from 'react-icons/fa6';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useEditor, ExportShape, exportPixelCaps } from './EditorContext';
import { PickExportModal } from './PickExportModal';

type Format = 'png' | 'jpeg' | 'webp';

const SHAPE_OPTIONS: { id: ExportShape; label: string; visual: React.ReactNode }[] = [
  { id: 'none', label: 'Full', visual: <span className="flex h-7 w-7 items-center justify-center rounded border-2 border-zinc-300 text-[9px] font-black">1:1</span> },
  { id: 'circle', label: 'Circle', visual: <div className="h-7 w-7 rounded-full border-2 border-zinc-300" /> },
  { id: 'rounded', label: 'Round', visual: <div className="h-7 w-7 rounded-lg border-2 border-zinc-300" /> },
  { id: 'triangle', label: 'Triangle', visual: <div className="h-0 w-0 border-b-[24px] border-l-[13px] border-r-[13px] border-b-zinc-300 border-l-transparent border-r-transparent" /> },
  { id: 'star', label: 'Star', visual: <span className="text-xl leading-none">⭐</span> },
  { id: 'heart', label: 'Heart', visual: <span className="text-xl leading-none">❤️</span> },
  { id: 'hexagon', label: 'Hex', visual: <span className="text-xl leading-none">⬡</span> },
  { id: 'pentagon', label: 'Penta', visual: <span className="text-xl leading-none">⬠</span> },
  { id: 'diamond', label: 'Diamond', visual: <div className="h-6 w-6 rotate-45 border-2 border-zinc-300" /> },
  { id: 'polygon', label: 'Poly', visual: <span className="flex h-7 items-center text-lg leading-none font-black text-zinc-300">⬡</span> },
];

export const ExportPanel: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { docSize, exportImage } = useEditor();
  const { toast } = useToast();

  // Device-aware browser caps (iOS Safari gets a much lower area limit)
  const { maxSide: MAX_SIDE, maxMP: MAX_MP } = useMemo(() => exportPixelCaps(), []);
  const wInputRef = useRef<HTMLInputElement>(null);

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
  const [ratio, setRatio] = useState(1);
  const [ratioDraft, setRatioDraft] = useState('1');
  const [customW, setCustomW] = useState<number | null>(null);
  const [customH, setCustomH] = useState<number | null>(null);
  // Draft strings for the size inputs — committing only on blur/Enter avoids
  // the "type 800 → the 8 is eaten because 8 < 16" controlled-input trap.
  const [wDraft, setWDraft] = useState('');
  const [hDraft, setHDraft] = useState('');
  const [aspectLocked, setAspectLocked] = useState(true);
  const [transparent, setTransparent] = useState(false);
  const [shape, setShape] = useState<ExportShape>('none');
  const [polySides, setPolySides] = useState(6);
  const [pickOpen, setPickOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  /* ---------- resolve the final output size ---------- */
  const usingCustom = customW != null || customH != null;
  let outW: number;
  let outH: number;
  if (usingCustom) {
    if (customW != null && customH != null) {
      outW = customW;
      outH = customH;
    } else if (customW != null) {
      // single side: derive from the doc aspect when locked, plain doc size when free
      outW = customW;
      outH = aspectLocked ? Math.round((customW * docSize.height) / docSize.width) : docSize.height;
    } else {
      const ch = customH!;
      outH = ch;
      outW = aspectLocked ? Math.round((ch * docSize.width) / docSize.height) : docSize.width;
    }
  } else {
    outW = Math.round(docSize.width * ratio);
    outH = Math.round(docSize.height * ratio);
  }
  // hard browser caps
  const cap = Math.min(1, MAX_SIDE / Math.max(outW, outH), Math.sqrt(MAX_MP / (outW * outH)));
  const capped = cap < 1;
  outW = Math.max(1, Math.floor(outW * cap));
  outH = Math.max(1, Math.floor(outH * cap));

  const megapixels = (outW * outH) / 1e6;
  const heavy = megapixels > 40;

  const clearCustom = () => {
    setCustomW(null);
    setCustomH(null);
    setWDraft('');
    setHDraft('');
  };

  const setRatioBoth = (r: number) => {
    // Manual input is clamped to 32× — the pixel caps above do the real limiting
    // (16K-class sizes are reached through the Custom exact-px mode).
    const clamped = Math.min(32, Math.max(0.1, r));
    setRatio(clamped);
    setRatioDraft(String(clamped));
    clearCustom();
  };

  const commitWDraft = () => {
    // Number() + isFinite: parseInt silently mis-commits exponential input
    // ("16e2" displays as 1600 in the field but parsed to 16)
    const n = Math.round(Number(wDraft));
    if (wDraft !== '' && Number.isFinite(n) && n >= 16) {
      setCustomW(n);
      if (aspectLocked) {
        const h = Math.max(16, Math.round((n * docSize.height) / docSize.width));
        setCustomH(h);
        setHDraft(String(h));
      }
    } else {
      // nothing valid typed → revert to “unset” (falls back to doc/aspect size)
      setWDraft('');
      setCustomW(null);
    }
  };
  const commitHDraft = () => {
    const n = Math.round(Number(hDraft));
    if (hDraft !== '' && Number.isFinite(n) && n >= 16) {
      setCustomH(n);
      if (aspectLocked) {
        const w = Math.max(16, Math.round((n * docSize.width) / docSize.height));
        setCustomW(w);
        setWDraft(String(w));
      }
    } else {
      setHDraft('');
      setCustomH(null);
    }
  };

  const toggleAspectLock = () => {
    const next = !aspectLocked;
    setAspectLocked(next);
    // Re-locking snaps the height back to the width's aspect
    if (next && customW != null) {
      const h = Math.max(16, Math.round((customW * docSize.height) / docSize.width));
      setCustomH(h);
      setHDraft(String(h));
    }
  };

  const scales: { label: string; value: number }[] = [
    { label: '0.5×', value: 0.5 },
    { label: '1×', value: 1 },
    { label: '2×', value: 2 },
    { label: '4×', value: 4 },
  ];

  /** Custom chip: jump into exact-pixel mode seeded with the current output size */
  const activateCustom = () => {
    const w = Math.max(16, Math.min(MAX_SIDE, Math.round(usingCustom ? outW : docSize.width * ratio)));
    const h = aspectLocked
      ? Math.max(16, Math.round((w * docSize.height) / docSize.width))
      : Math.max(16, Math.round(usingCustom ? outH : docSize.height * ratio));
    setCustomW(w);
    setCustomH(h);
    setWDraft(String(w));
    setHDraft(String(h));
    // focus the width input so typing immediately refines it
    requestAnimationFrame(() => wInputRef.current?.focus());
  };

  const run = async (mode: 'download' | 'copy') => {
    // Re-entrancy guard: a second click mid-render would start a CONCURRENT
    // export whose capture/restore dance races the first one (strip mode can
    // restore stale visibility state and leave the frame hidden) — and the
    // z-110 modal hides the canvas overlay, so the user gets no feedback.
    if (busy) return;
    if (mode === 'copy' && format !== 'png') {
      toast('Clipboard copy supports PNG only', 'warning');
      return;
    }
    setBusy(true);
    try {
      const ok = await exportImage({
        format,
        quality,
        scale: usingCustom ? 1 : ratio,
        targetW: usingCustom ? outW : undefined,
        targetH: usingCustom ? outH : undefined,
        // JPEG has no alpha — never request transparency for it
        transparent: format === 'jpeg' ? false : transparent,
        shape,
        shapeSides: shape === 'polygon' ? polySides : undefined,
        mode,
      });
      // Close only on success — a failed render keeps the modal (and the
      // user's settings) open for a retry at a smaller resolution.
      if (ok) onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Modal open={open} onClose={onClose} title="Export image" subtitle={`${outW} × ${outH} px${capped ? ' (capped to device limit)' : ''} · ${megapixels.toFixed(1)} MP`}>
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
                  onClick={() => {
                    setFormat(f);
                    // JPEG has no alpha — drop any stale transparent toggle
                    if (f === 'jpeg') setTransparent(false);
                  }}
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

        {/* Size — scale ratio */}
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Size</p>
          <div className="flex gap-2">
            {scales.map((s) => (
              <button
                key={s.label}
                onClick={() => setRatioBoth(s.value)}
                className={clsx(
                  'focus-ring flex-1 rounded-xl border py-2.5 font-mono text-xs font-bold transition-all active:scale-[0.97]',
                  !usingCustom && Math.abs(ratio - s.value) < 0.001
                    ? 'border-indigo-400/60 bg-indigo-500/20 text-indigo-200'
                    : 'border-white/10 bg-zinc-800/60 text-zinc-300 hover:border-white/20'
                )}
              >
                {s.label}
              </button>
            ))}
            {/* Custom replaces the old 16K chip — any exact size up to the caps */}
            <button
              onClick={activateCustom}
              aria-pressed={usingCustom}
              className={clsx(
                'focus-ring flex-1 rounded-xl border py-2.5 text-xs font-bold transition-all active:scale-[0.97]',
                usingCustom
                  ? 'border-indigo-400/60 bg-indigo-500/20 text-indigo-200'
                  : 'border-white/10 bg-zinc-800/60 text-zinc-300 hover:border-white/20'
              )}
            >
              Custom
            </button>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Ratio</span>
            <input
              type="number"
              min={0.1}
              max={32}
              step={0.1}
              value={ratioDraft}
              onChange={(e) => {
                setRatioDraft(e.target.value);
                const v = parseFloat(e.target.value);
                // apply live when valid — clamp/normalize happens on blur
                if (!isNaN(v) && v >= 0.1) setRatioBoth(v);
              }}
              onBlur={() => setRatioDraft(String(ratio))}
              className="focus-ring w-24 rounded-lg border border-white/10 bg-zinc-800/70 px-3 py-2 font-mono text-xs text-zinc-100 outline-none focus:border-indigo-400/50"
            />
            <span className="font-mono text-[10px] text-zinc-500">× of {docSize.width} × {docSize.height}</span>
          </div>
        </div>

        {/* Custom exact-px size */}
        <div className={clsx('rounded-xl border p-3 transition-colors', usingCustom ? 'border-indigo-400/50 bg-indigo-500/5' : 'border-transparent')}>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Custom size (exact px)</p>
            <button
              onClick={toggleAspectLock}
              title={aspectLocked ? 'Aspect ratio locked' : 'Aspect ratio free'}
              className={clsx(
                'focus-ring flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold transition-colors',
                aspectLocked
                  ? 'border-indigo-400/50 bg-indigo-500/15 text-indigo-300'
                  : 'border-white/10 bg-zinc-800/60 text-zinc-400'
              )}
            >
              {aspectLocked ? <FaLock size={9} /> : <FaLockOpen size={9} />}
              {aspectLocked ? 'Ratio locked' : 'Ratio free'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={wInputRef}
              type="number"
              inputMode="numeric"
              min={16}
              max={MAX_SIDE}
              aria-label="Output width in pixels"
              placeholder={`W · ${docSize.width}`}
              value={wDraft}
              onChange={(e) => setWDraft(e.target.value)}
              onBlur={commitWDraft}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
              }}
              className="focus-ring w-full rounded-lg border border-white/10 bg-zinc-800/70 px-3 py-2 font-mono text-xs text-zinc-100 outline-none placeholder:font-sans placeholder:text-zinc-600 focus:border-indigo-400/50"
            />
            <span className="text-zinc-600">×</span>
            <input
              type="number"
              inputMode="numeric"
              min={16}
              max={MAX_SIDE}
              aria-label="Output height in pixels"
              placeholder={`H · ${docSize.height}`}
              value={hDraft}
              onChange={(e) => setHDraft(e.target.value)}
              onBlur={commitHDraft}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
              }}
              className="focus-ring w-full rounded-lg border border-white/10 bg-zinc-800/70 px-3 py-2 font-mono text-xs text-zinc-100 outline-none placeholder:font-sans placeholder:text-zinc-600 focus:border-indigo-400/50"
            />
            {(customW != null || customH != null || wDraft !== '' || hDraft !== '') && (
              <button
                onClick={clearCustom}
                className="focus-ring shrink-0 rounded-lg border border-white/10 bg-zinc-800/70 px-2.5 py-2 text-[10px] font-bold text-zinc-400 hover:text-white"
              >
                Reset
              </button>
            )}
          </div>
          <p className="mt-1.5 text-[10px] text-zinc-600">Up to {MAX_SIDE.toLocaleString()} px per side{MAX_MP < 268435456 ? ' (this device caps lower)' : ''} · 16K-class sizes included</p>
        </div>

        {/* Shape pick */}
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            <FaShapes size={10} /> Pick export shape
          </p>
          {/* Grab ANY region of the project at any resolution (up to 16K) */}
          <button
            onClick={() => setPickOpen(true)}
            className="focus-ring mb-2 flex w-full items-center gap-3 rounded-xl border border-indigo-400/40 bg-indigo-500/10 px-3 py-3 text-left transition-all hover:bg-indigo-500/20 active:scale-[0.98]"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-gradient text-white">
              <FaCropSimple size={14} />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-bold text-indigo-200">Pick region &amp; shape</span>
              <span className="block text-[10px] text-zinc-400">Drag a box anywhere on the canvas · any resolution up to 16K</span>
            </span>
          </button>
          <div className="grid grid-cols-5 gap-2">
            {SHAPE_OPTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => setShape(s.id)}
                title={s.label}
                className={clsx(
                  'focus-ring flex flex-col items-center gap-1 rounded-xl border py-2 transition-all active:scale-95',
                  shape === s.id
                    ? 'border-indigo-400/60 bg-indigo-500/15'
                    : 'border-white/10 bg-zinc-800/50 hover:border-white/25'
                )}
              >
                <span className="flex h-7 items-center">{s.visual}</span>
                <span className={clsx('text-[9px] font-bold uppercase', shape === s.id ? 'text-indigo-300' : 'text-zinc-500')}>
                  {s.label}
                </span>
              </button>
            ))}
          </div>
          {shape === 'polygon' && (
            <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-800/40 p-2">
              <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Polygon sides</span>
              <button onClick={() => setPolySides((s) => Math.max(3, s - 1))} className="focus-ring h-6 w-6 rounded-md border border-white/10 bg-zinc-800/70 text-xs font-bold text-zinc-200 active:scale-90">−</button>
              <span className="w-6 text-center font-mono text-xs font-bold text-zinc-100">{polySides}</span>
              <button onClick={() => setPolySides((s) => Math.min(20, s + 1))} className="focus-ring h-6 w-6 rounded-md border border-white/10 bg-zinc-800/70 text-xs font-bold text-zinc-200 active:scale-90">+</button>
              <span className="ml-auto text-[10px] text-zinc-600">3–20</span>
            </div>
          )}
          {shape !== 'none' && shape !== 'polygon' && (
            <p className="mt-1.5 text-[10px] text-zinc-500">
              {format === 'png' || format === 'webp'
                ? 'Exports with transparency outside the shape.'
                : 'JPG has no transparency — the outside is filled white.'}
            </p>
          )}
        </div>

        {/* Transparent */}
        {format !== 'jpeg' && (
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

        {heavy && (
          <p className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-[11px] font-semibold text-amber-300">
            Heavy export ({megapixels.toFixed(0)} MP) — rendering may take a moment on some devices.
          </p>
        )}

        {/* Output preview */}
        <div className="rounded-xl border border-white/10 bg-zinc-800/30 px-3 py-2.5 font-mono text-[11px] text-zinc-400">
          {outW} × {outH} px · {format === 'png' ? 'PNG' : format === 'jpeg' ? `JPG ${Math.round(quality * 100)}%` : `WebP ${Math.round(quality * 100)}%`}
          {shape !== 'none' && ` · ${shape === 'polygon' ? `${polySides}-gon` : shape} shape`}
          {capped && ' · capped'}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {format === 'png' && (
            <button
              disabled={busy}
              onClick={() => void run('copy')}
              className={clsx(
                'focus-ring flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-zinc-800/70 py-3.5 text-sm font-bold text-zinc-100 transition-colors hover:bg-zinc-800',
                busy && 'cursor-not-allowed opacity-50'
              )}
            >
              <FaCopy size={13} /> Copy
            </button>
          )}
          <button
            disabled={busy}
            onClick={() => void run('download')}
            className={clsx(
              'focus-ring flex flex-[2] items-center justify-center gap-2 rounded-xl bg-brand-gradient py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-950/40 transition-transform active:scale-[0.98]',
              busy && 'cursor-not-allowed opacity-70'
            )}
          >
            {busy ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Rendering…
              </>
            ) : (
              <>
                <FaDownload size={13} /> Download
              </>
            )}
          </button>
        </div>
      </div>
      </Modal>
      {/* Full-screen picker must NOT live inside the Modal — the glass/transform
          panel becomes the containing block for its fixed overlay (it would size
          to the panel, not the viewport) and the outer backdrop stays clickable. */}
      <PickExportModal open={pickOpen} onClose={() => setPickOpen(false)} />
    </>
  );
};
