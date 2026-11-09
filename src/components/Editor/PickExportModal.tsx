'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { FaXmark, FaDownload, FaLock, FaLockOpen, FaCropSimple, FaShapes } from 'react-icons/fa6';
import { useEditor, ExportShape, exportPixelCaps } from './EditorContext';

/** Device-aware browser caps (iOS Safari gets a lower area limit) */
const { maxSide: MAX_SIDE, maxMP: MAX_MP } = exportPixelCaps();
const clampN = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const SHAPES: { id: ExportShape; label: string }[] = [
  { id: 'none', label: 'Full' },
  { id: 'circle', label: 'Circle' },
  { id: 'rounded', label: 'Round' },
  { id: 'triangle', label: 'Triangle' },
  { id: 'star', label: 'Star' },
  { id: 'heart', label: 'Heart' },
  { id: 'hexagon', label: 'Hex' },
  { id: 'pentagon', label: 'Penta' },
  { id: 'diamond', label: 'Diamond' },
  { id: 'polygon', label: 'Poly' },
];

/* ---- tiny local shape geometry (mirrors the export tracer) ---- */
const polyPts = (n: number, r: number) =>
  Array.from({ length: Math.max(3, Math.round(n)) }, (_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / Math.max(3, Math.round(n));
    return { x: r * Math.cos(a), y: r * Math.sin(a) };
  });
const starPts = (n: number, outer: number, inner: number) => {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / n;
    pts.push({ x: r * Math.cos(a), y: r * Math.sin(a) });
  }
  return pts;
};
/** SVG path (0..w, 0..h space) matching the export shape tracer (inscribed in min axis) */
const shapePathD = (shape: ExportShape, w: number, h: number, sides: number): string => {
  const s = Math.min(w, h);
  const cx = w / 2;
  const cy = h / 2;
  const P = (x: number, y: number) => `${(cx + x * s).toFixed(2)},${(cy + y * s).toFixed(2)}`;
  const fromPts = (pts: { x: number; y: number }[]) => `M ${pts.map((p) => P(p.x, p.y)).join(' L ')} Z`;
  switch (shape) {
    case 'circle':
      return `M ${(cx - s / 2).toFixed(2)} ${cy.toFixed(2)} A ${(s / 2).toFixed(2)} ${(s / 2).toFixed(2)} 0 1 1 ${(cx + s / 2).toFixed(2)} ${cy.toFixed(2)} A ${(s / 2).toFixed(2)} ${(s / 2).toFixed(2)} 0 1 1 ${(cx - s / 2).toFixed(2)} ${cy.toFixed(2)} Z`;
    case 'triangle':
      return fromPts(polyPts(3, 0.5));
    case 'hexagon':
      return fromPts(polyPts(6, 0.5));
    case 'pentagon':
      return fromPts(polyPts(5, 0.5));
    case 'polygon':
      return fromPts(polyPts(sides, 0.5));
    case 'star':
      return fromPts(starPts(5, 0.5, 0.21));
    case 'diamond':
      return `M ${P(0, -0.5)} L ${P(0.5, 0)} L ${P(0, 0.5)} L ${P(-0.5, 0)} Z`;
    case 'heart':
      return `M ${P(0, 0.475)} C ${P(-0.49, 0.18)} ${P(-0.42, -0.34)} ${P(0, -0.11)} C ${P(0.42, -0.34)} ${P(0.49, 0.18)} ${P(0, 0.475)} Z`;
    case 'rounded': {
      const r = s / 4;
      return `M ${r.toFixed(2)} 0 L ${(w - r).toFixed(2)} 0 Q ${w.toFixed(2)} 0 ${w.toFixed(2)} ${r.toFixed(2)} L ${w.toFixed(2)} ${(h - r).toFixed(2)} Q ${w.toFixed(2)} ${h.toFixed(2)} ${(w - r).toFixed(2)} ${h.toFixed(2)} L ${r.toFixed(2)} ${h.toFixed(2)} Q 0 ${h.toFixed(2)} 0 ${(h - r).toFixed(2)} L 0 ${r.toFixed(2)} Q 0 0 ${r.toFixed(2)} 0 Z`;
    }
    default:
      return `M 0 0 L ${w.toFixed(2)} 0 L ${w.toFixed(2)} ${h.toFixed(2)} L 0 ${h.toFixed(2)} Z`;
  }
};

type Box = { x: number; y: number; w: number; h: number }; // normalized inside the doc
type DragMode = 'move' | 'nw' | 'ne' | 'sw' | 'se';

/**
 * Pick & export — grab ANY region of the project at any resolution (up to 16K),
 * optionally cut to a shape. Opens full-screen, mask-style.
 */
export const PickExportModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { docSize, docPreviewUrl, exportImage } = useEditor();

  const [preview, setPreview] = useState('');
  const [box, setBox] = useState<Box>({ x: 0.12, y: 0.12, w: 0.76, h: 0.76 });
  const [shape, setShape] = useState<ExportShape>('none');
  const [sides, setSides] = useState(6);
  const [format, setFormat] = useState<'png' | 'jpeg' | 'webp'>('png');
  const [quality, setQuality] = useState(0.92);
  const [transparent, setTransparent] = useState(false);
  const [mult, setMult] = useState(1);
  const [custom, setCustom] = useState<{ w: number; h: number } | null>(null);
  const [lockRatio, setLockRatio] = useState(true);
  const [wDraft, setWDraft] = useState('');
  const [hDraft, setHDraft] = useState('');
  const [stage, setStage] = useState({ w: 300, h: 300 });
  const [busy, setBusy] = useState(false);

  const supportsWebP = useMemo(() => {
    try {
      return document.createElement('canvas').toDataURL('image/webp').startsWith('data:image/webp');
    } catch {
      return false;
    }
  }, []);

  const stageRef = useRef<HTMLDivElement>(null);
  const wInRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ mode: DragMode; sx: number; sy: number; box: Box; wrapW: number; wrapH: number } | null>(null);
  const boxRef = useRef(box);
  useEffect(() => {
    boxRef.current = box;
  }, [box]);

  /* ---- snapshot the document for the preview ---- */
  useEffect(() => {
    if (!open) return;
    setPreview('');
    setMult(1);
    setCustom(null);
    setWDraft('');
    setHDraft('');
    const t = setTimeout(() => setPreview(docPreviewUrl()), 30);
    return () => clearTimeout(t);
  }, [open, docPreviewUrl]);

  /* ---- fit the preview stage inside the available space ---- */
  useEffect(() => {
    if (!open) return;
    const el = stageRef.current;
    if (!el) return;
    const fit = () => {
      const r = el.getBoundingClientRect();
      const k = Math.min((r.width - 16) / docSize.width, (r.height - 16) / docSize.height);
      setStage({ w: Math.max(40, docSize.width * k), h: Math.max(40, docSize.height * k) });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open, docSize.width, docSize.height]);

  /* ---- Escape closes (but never mid-render — the export engine guard
     blocks a second export, and closing would throw away the settings) ---- */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        if (!busy) onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, onClose, busy]);

  const dw = docSize.width;
  const dh = docSize.height;
  const region = {
    left: box.x * dw,
    top: box.y * dh,
    // Min 8px, but never past the doc edge — on tiny docs the floor alone
    // could push the capture off-document (an empty band, black in JPEG).
    width: Math.min(Math.max(8, box.w * dw), Math.max(8, dw - box.x * dw)),
    height: Math.min(Math.max(8, box.h * dh), Math.max(8, dh - box.y * dh)),
  };

  /* ---- resolve the output size (custom px or region × mult) ---- */
  let outW = custom ? custom.w : Math.round(region.width * mult);
  let outH = custom ? custom.h : Math.round(region.height * mult);
  const cap = Math.min(1, MAX_SIDE / Math.max(outW, outH), Math.sqrt(MAX_MP / (outW * outH)));
  const capped = cap < 1;
  outW = Math.max(1, Math.floor(outW * cap));
  outH = Math.max(1, Math.floor(outH * cap));
  const megapixels = (outW * outH) / 1e6;

  const applyBox = (b: Box) => {
    // A new region invalidates the custom px size AND the multiplier chips
    // (16K is region-relative — a stale mult would silently apply)
    setBox(b);
    setMult(1);
    if (custom) {
      setCustom(null);
      setWDraft('');
      setHDraft('');
    }
  };

  /* ---- selection drag (move + 4 corner handles) ---- */
  const onPointerDown = (e: React.PointerEvent, mode: DragMode) => {
    e.preventDefault();
    e.stopPropagation();
    const wrap = (e.currentTarget as HTMLElement).closest('[data-stage-inner]') as HTMLElement | null;
    const r = (wrap ?? stageRef.current)?.getBoundingClientRect();
    dragRef.current = {
      mode,
      sx: e.clientX,
      sy: e.clientY,
      box: { ...boxRef.current },
      wrapW: r?.width || 1,
      wrapH: r?.height || 1,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = (e.clientX - d.sx) / d.wrapW;
    const dy = (e.clientY - d.sy) / d.wrapH;
    const b = { ...d.box };
    if (d.mode === 'move') {
      b.x = clampN(d.box.x + dx, 0, 1 - b.w);
      b.y = clampN(d.box.y + dy, 0, 1 - b.h);
    } else {
      const min = 0.05;
      if (d.mode.includes('w')) {
        const nx = clampN(d.box.x + dx, 0, d.box.x + d.box.w - min);
        b.w = d.box.w - (nx - d.box.x);
        b.x = nx;
      }
      if (d.mode.includes('e')) b.w = clampN(d.box.w + dx, min, 1 - d.box.x);
      if (d.mode.includes('n')) {
        const ny = clampN(d.box.y + dy, 0, d.box.y + d.box.h - min);
        b.h = d.box.h - (ny - d.box.y);
        b.y = ny;
      }
      if (d.mode.includes('s')) b.h = clampN(d.box.h + dy, min, 1 - d.box.y);
    }
    applyBox(b);
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  const commitW = () => {
    // Number() + isFinite: parseInt silently mis-commits exponential input
    // ("16e2" displays as 1600 in the field but parsed to 16)
    const n = Math.round(Number(wDraft));
    if (wDraft !== '' && Number.isFinite(n) && n >= 16) {
      const h = lockRatio ? Math.max(16, Math.round((n * region.height) / region.width)) : custom?.h ?? Math.max(16, Math.round(region.height * mult));
      setCustom({ w: n, h });
      if (lockRatio) setHDraft(String(h));
    } else {
      setWDraft('');
    }
  };
  const commitH = () => {
    const n = Math.round(Number(hDraft));
    if (hDraft !== '' && Number.isFinite(n) && n >= 16) {
      const w = lockRatio ? Math.max(16, Math.round((n * region.width) / region.height)) : custom?.w ?? Math.max(16, Math.round(region.width * mult));
      setCustom({ w, h: n });
      if (lockRatio) setWDraft(String(w));
    } else {
      setHDraft('');
    }
  };

  const setMultBoth = (k: number) => {
    setMult(k);
    setCustom(null);
    setWDraft('');
    setHDraft('');
  };

  const k16 = MAX_SIDE / Math.max(region.width, region.height);
  const mults: { label: string; value: number }[] = [
    { label: '1×', value: 1 },
    { label: '2×', value: 2 },
    { label: '4×', value: 4 },
  ];

  /** Custom chip: jump into exact-px mode seeded with the region at ~4× (or 16K-class when it fits) */
  const activateCustomPx = () => {
    // Already custom? Keep the typed size (like ExportPanel) — re-clicking the
    // active chip must not discard what the user entered. With the ratio lock
    // OFF both dimensions survive; with it ON the width wins and the height
    // follows the region aspect (mirrors commitW's fallback).
    const seedMult = Math.min(k16, 4);
    const w = Math.max(16, Math.min(MAX_SIDE, Math.round(custom ? custom.w : region.width * seedMult)));
    const h = lockRatio
      ? Math.max(16, Math.round((w * region.height) / region.width))
      : custom
        ? custom.h
        : Math.max(16, Math.round(region.height * seedMult));
    setCustom({ w, h });
    setWDraft(String(w));
    setHDraft(String(h));
    requestAnimationFrame(() => wInRef.current?.focus());
  };

  const run = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const ok = await exportImage({
        format,
        quality,
        scale: 1,
        targetW: outW,
        targetH: outH,
        transparent: format === 'jpeg' ? false : transparent,
        shape,
        shapeSides: shape === 'polygon' ? sides : undefined,
        region: {
          left: Math.round(region.left),
          top: Math.round(region.top),
          width: Math.round(region.width),
          height: Math.round(region.height),
        },
        mode: 'download',
      });
      // keep the picker open on failure so the picked region/settings survive
      if (ok) onClose();
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  const boxPx = { left: box.x * stage.w, top: box.y * stage.h, width: box.w * stage.w, height: box.h * stage.h };
  const HANDLE =
    'absolute h-5 w-5 rounded-full border-2 border-indigo-400 bg-onyx-950 shadow-lg shadow-black/60';

  return (
    <div role="dialog" aria-modal="true" aria-label="Pick and export region" className="fixed inset-0 z-[120] flex flex-col bg-[#0a0a0d]">
      {/* header — pt safe-area: fullscreen overlays sit under the status bar
          on notched phones in the installed PWA */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 px-3 pt-[env(safe-area-inset-top)]">
        <span className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-zinc-300">
          <FaCropSimple size={12} className="text-indigo-400" /> Pick &amp; export region
        </span>
        <button
          onClick={onClose}
          className="focus-ring flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold text-red-400 transition-colors hover:bg-red-500/10"
        >
          <FaXmark size={12} /> Close
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {/* stage */}
        <div ref={stageRef} className="relative flex min-h-[240px] flex-1 items-center justify-center overflow-hidden bg-[#0a0a0d] p-2">
          {!preview ? (
            <p className="animate-pulse text-xs font-bold text-zinc-500">Rendering preview…</p>
          ) : (
            <div
              data-stage-inner
              className="relative touch-none"
              style={{ width: stage.w, height: stage.h }}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              <img src={preview} alt="Document preview" className="h-full w-full rounded-sm object-fill" draggable={false} />

              {/* selection box — dark outside via the huge box-shadow trick */}
              <div
                className="absolute cursor-move"
                style={{
                  left: boxPx.left,
                  top: boxPx.top,
                  width: boxPx.width,
                  height: boxPx.height,
                  boxShadow: '0 0 0 9999px rgba(0,0,0,0.62)',
                }}
                onPointerDown={(e) => onPointerDown(e, 'move')}
              >
                <div className="absolute inset-0 border-2 border-indigo-400" />
                {/* thirds guides */}
                <div className="pointer-events-none absolute inset-0 opacity-40">
                  <div className="absolute left-1/3 top-0 h-full w-px bg-white/50" />
                  <div className="absolute left-2/3 top-0 h-full w-px bg-white/50" />
                  <div className="absolute left-0 top-1/3 h-px w-full bg-white/50" />
                  <div className="absolute left-0 top-2/3 h-px w-full bg-white/50" />
                </div>
                {/* shape preview inside the selection */}
                {shape !== 'none' && (
                  <svg
                    className="pointer-events-none absolute inset-0 h-full w-full"
                    viewBox={`0 0 ${Math.max(boxPx.width, 1)} ${Math.max(boxPx.height, 1)}`}
                    preserveAspectRatio="none"
                  >
                    <path
                      d={shapePathD(shape, Math.max(boxPx.width, 1), Math.max(boxPx.height, 1), sides)}
                      fill="rgba(99,102,241,0.14)"
                      stroke="#818cf8"
                      strokeWidth="1.5"
                      strokeDasharray="5 4"
                    />
                  </svg>
                )}
                {/* handles */}
                <button
                  aria-label="Resize from top-left"
                  onPointerDown={(e) => onPointerDown(e, 'nw')}
                  className={clsx(HANDLE, '-left-2.5 -top-2.5 cursor-nwse-resize')}
                />
                <button
                  aria-label="Resize from top-right"
                  onPointerDown={(e) => onPointerDown(e, 'ne')}
                  className={clsx(HANDLE, '-right-2.5 -top-2.5 cursor-nesw-resize')}
                />
                <button
                  aria-label="Resize from bottom-left"
                  onPointerDown={(e) => onPointerDown(e, 'sw')}
                  className={clsx(HANDLE, '-bottom-2.5 -left-2.5 cursor-nesw-resize')}
                />
                <button
                  aria-label="Resize from bottom-right"
                  onPointerDown={(e) => onPointerDown(e, 'se')}
                  className={clsx(HANDLE, '-bottom-2.5 -right-2.5 cursor-nwse-resize')}
                />
                {/* live size readout */}
                <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-indigo-400/40 bg-onyx-950/95 px-2 py-0.5 font-mono text-[10px] font-bold text-indigo-200">
                  {Math.round(region.width)} × {Math.round(region.height)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* controls */}
        <div className="w-full shrink-0 space-y-4 overflow-y-auto border-t border-white/10 p-4 md:w-80 md:border-l md:border-t-0">
          {/* shape */}
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              <FaShapes size={10} /> Export shape
            </p>
            <div className="grid grid-cols-5 gap-1.5">
              {SHAPES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setShape(s.id)}
                  title={s.label}
                  aria-pressed={shape === s.id}
                  className={clsx(
                    'focus-ring rounded-lg border py-1.5 text-[9px] font-bold uppercase transition-all active:scale-95',
                    shape === s.id
                      ? 'border-indigo-400/60 bg-indigo-500/20 text-indigo-200'
                      : 'border-white/10 bg-zinc-800/50 text-zinc-500 hover:text-zinc-300'
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
            {shape === 'polygon' && (
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-white/10 bg-zinc-800/40 p-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Sides</span>
                <button onClick={() => setSides((s) => Math.max(3, s - 1))} className="focus-ring h-6 w-6 rounded-md border border-white/10 bg-zinc-800/70 text-xs font-bold text-zinc-200 active:scale-90">−</button>
                <span className="w-6 text-center font-mono text-xs font-bold text-zinc-100">{sides}</span>
                <button onClick={() => setSides((s) => Math.min(20, s + 1))} className="focus-ring h-6 w-6 rounded-md border border-white/10 bg-zinc-800/70 text-xs font-bold text-zinc-200 active:scale-90">+</button>
              </div>
            )}
            {shape !== 'none' && (
              <p className="mt-1.5 text-[10px] text-zinc-500">
                {format === 'jpeg' ? 'JPG has no transparency — the outside is filled white.' : 'The area outside the shape exports transparent.'}
              </p>
            )}
          </div>

          {/* resolution */}
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Output resolution</p>
            <div className="flex gap-1.5">
              {mults.map((m) => (
                <button
                  key={m.label}
                  onClick={() => setMultBoth(m.value)}
                  aria-pressed={!custom && Math.abs(mult - m.value) < 0.001}
                  className={clsx(
                    'focus-ring flex-1 rounded-lg border py-2 font-mono text-[11px] font-bold transition-all active:scale-95',
                    !custom && Math.abs(mult - m.value) < 0.001
                      ? 'border-indigo-400/60 bg-indigo-500/20 text-indigo-200'
                      : 'border-white/10 bg-zinc-800/60 text-zinc-300 hover:border-white/20'
                  )}
                >
                  {m.label}
                </button>
              ))}
              {/* Custom replaces the old 16K chip — any exact size up to the caps */}
              <button
                onClick={activateCustomPx}
                aria-pressed={!!custom}
                className={clsx(
                  'focus-ring flex-1 rounded-lg border py-2 text-[11px] font-bold transition-all active:scale-95',
                  custom
                    ? 'border-indigo-400/60 bg-indigo-500/20 text-indigo-200'
                    : 'border-white/10 bg-zinc-800/60 text-zinc-300 hover:border-white/20'
                )}
              >
                Custom
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input
                ref={wInRef}
                type="number"
                inputMode="numeric"
                min={16}
                max={MAX_SIDE}
                aria-label="Output width in pixels"
                placeholder={`W · ${Math.round(region.width * mult)}`}
                value={wDraft}
                onChange={(e) => setWDraft(e.target.value)}
                onBlur={commitW}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                className="focus-ring w-full rounded-lg border border-white/10 bg-zinc-800/70 px-3 py-2 font-mono text-xs text-zinc-100 outline-none placeholder:font-sans placeholder:text-zinc-600 focus:border-indigo-400/50"
              />
              <button
                onClick={() => {
                  const next = !lockRatio;
                  setLockRatio(next);
                  if (next && custom) {
                    const h = Math.max(16, Math.round((custom.w * region.height) / region.width));
                    setCustom({ ...custom, h });
                    setHDraft(String(h));
                  }
                }}
                title={lockRatio ? 'Aspect ratio locked' : 'Aspect ratio free'}
                className={clsx(
                  'focus-ring flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1.5 text-[10px] font-bold transition-colors',
                  lockRatio ? 'border-indigo-400/50 bg-indigo-500/15 text-indigo-300' : 'border-white/10 bg-zinc-800/60 text-zinc-400'
                )}
              >
                {lockRatio ? <FaLock size={9} /> : <FaLockOpen size={9} />}
              </button>
              <input
                type="number"
                inputMode="numeric"
                min={16}
                max={MAX_SIDE}
                aria-label="Output height in pixels"
                placeholder={`H · ${Math.round(region.height * mult)}`}
                value={hDraft}
                onChange={(e) => setHDraft(e.target.value)}
                onBlur={commitH}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                className="focus-ring w-full rounded-lg border border-white/10 bg-zinc-800/70 px-3 py-2 font-mono text-xs text-zinc-100 outline-none placeholder:font-sans placeholder:text-zinc-600 focus:border-indigo-400/50"
              />
            </div>
            <p className="mt-1.5 font-mono text-[10px] text-zinc-500">
              {outW} × {outH} px · {megapixels.toFixed(1)} MP{capped ? ' · capped to device limit' : ''}
            </p>
          </div>

          {/* format */}
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Format</p>
            <div className="flex gap-1.5">
              {(['png', 'jpeg', 'webp'] as const).map((f) => {
                const webpUnsupported = f === 'webp' && !supportsWebP;
                return (
                <button
                  key={f}
                  disabled={webpUnsupported}
                  aria-pressed={format === f}
                  onClick={() => {
                    setFormat(f);
                    if (f === 'jpeg') setTransparent(false);
                  }}
                  className={clsx(
                    'focus-ring flex-1 rounded-lg border py-2 text-xs font-bold transition-all active:scale-95',
                    format === f
                      ? 'border-indigo-400/60 bg-indigo-500/20 text-indigo-200'
                      : webpUnsupported
                        ? 'cursor-not-allowed border-white/5 bg-zinc-800/30 text-zinc-600'
                        : 'border-white/10 bg-zinc-800/60 text-zinc-300 hover:border-white/20'
                  )}
                >
                  {f === 'jpeg' ? 'JPG' : f.toUpperCase()}
                </button>
              );})}
            </div>
            {format !== 'png' && (
              <input
                type="range"
                min={0.3}
                max={1}
                step={0.02}
                value={quality}
                onChange={(e) => setQuality(parseFloat(e.target.value))}
                className="onyx-range mt-2 w-full"
                aria-label="Quality"
              />
            )}
            {format !== 'jpeg' && (
              <label className="mt-2 flex cursor-pointer items-center justify-between rounded-lg border border-white/10 bg-zinc-800/30 px-3 py-2">
                <span className="text-[11px] font-bold text-zinc-300">Transparent background</span>
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
          </div>

          {megapixels > 40 && (
            <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-[11px] font-semibold text-amber-300">
              Heavy export ({megapixels.toFixed(0)} MP) — rendering may take a moment.
            </p>
          )}

          <button
            onClick={() => void run()}
            disabled={!preview || busy}
            className="focus-ring flex w-full items-center justify-center gap-2 rounded-xl bg-brand-gradient py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-950/40 transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            <FaDownload size={13} /> {busy ? 'Exporting…' : `Export ${outW} × ${outH}`}
          </button>
          <p className="text-center text-[10px] text-zinc-600">
            Drag the box to move · drag a corner to resize · up to {MAX_SIDE.toLocaleString()} px per side
          </p>
        </div>
      </div>
    </div>
  );
};
