'use client';

import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import type { fabric } from 'fabric';
import {
  FaBold, FaItalic, FaUnderline, FaAlignLeft, FaAlignCenter, FaAlignRight,
  FaArrowUp, FaArrowDown, FaAnglesUp, FaAnglesDown, FaLock, FaUnlock,
  FaArrowsLeftRight, FaArrowsUpDown, FaArrowRotateLeft, FaArrowRotateRight,
  FaCheck, FaXmark, FaImage, FaPlus, FaCropSimple, FaEyeDropper,
  FaSquare, FaCircle, FaPlay, FaMagnifyingGlass, FaTrashCan, FaClone,
  FaLockOpen, FaUpload, FaLayerGroup, FaCircleHalfStroke,
} from 'react-icons/fa6';
import { Slider } from '@/components/ui/Slider';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { GradientPicker } from '@/components/ui/GradientPicker';
import { useEditor, BorderStackConfig, BorderRing, ShadowFxConfig, MAX_BORDERS } from '../EditorContext';
import {
  ADJUSTMENTS, FILTER_PRESETS, STICKERS, FONTS, DOC_PRESETS,
} from '../constants';
import { MORE_FONTS } from '@/lib/fonts';

/* ------------------------------------------------------------------ */
/* Small shared bits                                                   */
/* ------------------------------------------------------------------ */

const Label: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <p className={clsx('mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500', className)}>{children}</p>
);

const Chip: React.FC<{
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  title?: string;
}> = ({ active, onClick, children, className, title }) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    // present only for toggle chips (actions leave it off)
    aria-pressed={active == null ? undefined : !!active}
    className={clsx(
      'focus-ring flex min-h-[38px] items-center justify-center rounded-lg border px-3 py-2 text-xs font-bold transition-all active:scale-95',
      active
        ? 'border-indigo-400/60 bg-indigo-500/20 text-indigo-200'
        : 'border-white/10 bg-zinc-800/60 text-zinc-300 hover:border-white/20 hover:bg-zinc-800',
      className
    )}
  >
    {children}
  </button>
);

const NumInput: React.FC<{
  label: string;
  value: number;
  onCommit: (v: number) => void;
  step?: number;
}> = ({ label, value, onCommit, step = 1 }) => {
  const commit = (raw: string) => {
    const n = parseFloat(raw);
    if (!isNaN(n)) onCommit(n);
  };
  return (
    <label className="flex items-center gap-1.5">
      <span className="w-5 shrink-0 text-[10px] font-bold uppercase text-zinc-500">{label}</span>
      {/* key={value}: remounts only when the external value changes, so typing is never clobbered */}
      <input
        key={value}
        type="number"
        step={step}
        defaultValue={String(Math.round(value))}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        className="focus-ring min-h-11 w-full rounded-md border border-white/10 bg-zinc-800/70 px-2 py-2 font-mono text-xs text-zinc-100 outline-none focus:border-indigo-400/50"
      />
    </label>
  );
};

/** Big − / + tap button for steppers (44px touch target) */
const StepBtn: React.FC<{
  onClick: () => void;
  disabled?: boolean;
  label: string;
}> = ({ onClick, disabled, label }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    className="focus-ring flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-zinc-800/70 text-base font-bold text-zinc-200 transition-all active:scale-90 active:bg-zinc-700 disabled:opacity-30"
  >
    {label}
  </button>
);

/** Always-visible action bar pinned to the bottom of the scroll area —
 *  Apply buttons must never be buried under a long per-border list on phones.
 *  Margins are tuned for the builder CARDS (p-3) the bars live in, so the bar
 *  goes flush with the card edges in both the mobile sheet and the desktop
 *  properties panel. */
const StickyBar: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="sticky bottom-0 z-10 -mx-3 -mb-3 mt-2 border-t border-white/10 bg-[#141418]/95 px-3 pb-3 pt-2.5 shadow-[0_-10px_20px_rgba(0,0,0,0.35)] backdrop-blur">
    {children}
  </div>
);

/* Align icons — compact inline SVGs */
const AlignIcon: React.FC<{ mode: string }> = ({ mode }) => {
  const common = 'stroke-zinc-300';
  const maps: Record<string, React.ReactElement> = {
    left: (
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none">
        <path d="M4 2v16" className={common} strokeWidth="1.5" />
        <rect x="7" y="6" width="9" height="8" rx="1.5" className="fill-indigo-400/80" />
      </svg>
    ),
    'center-h': (
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none">
        <path d="M10 2v16" className={common} strokeWidth="1.5" />
        <rect x="3" y="6" width="14" height="8" rx="1.5" className="fill-indigo-400/80" />
      </svg>
    ),
    right: (
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none">
        <path d="M16 2v16" className={common} strokeWidth="1.5" />
        <rect x="4" y="6" width="9" height="8" rx="1.5" className="fill-indigo-400/80" />
      </svg>
    ),
    top: (
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none">
        <path d="M2 4h16" className={common} strokeWidth="1.5" />
        <rect x="6" y="7" width="8" height="9" rx="1.5" className="fill-indigo-400/80" />
      </svg>
    ),
    'center-v': (
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none">
        <path d="M2 10h16" className={common} strokeWidth="1.5" />
        <rect x="6" y="3" width="8" height="14" rx="1.5" className="fill-indigo-400/80" />
      </svg>
    ),
    bottom: (
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none">
        <path d="M2 16h16" className={common} strokeWidth="1.5" />
        <rect x="6" y="4" width="8" height="9" rx="1.5" className="fill-indigo-400/80" />
      </svg>
    ),
  };
  return maps[mode] || null;
};

/* ------------------------------------------------------------------ */
/* Panels                                                              */
/* ------------------------------------------------------------------ */

const AddPanel: React.FC = () => {
  const { openFilePicker, addSolidLayer, addGradientLayer } = useEditor();
  return (
    <div className="space-y-5">
      <button
        onClick={openFilePicker}
        className="focus-ring flex w-full items-center justify-center gap-2 rounded-xl bg-brand-gradient py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-950/40 transition-transform active:scale-[0.98]"
      >
        <FaImage /> Upload image
      </button>
      <p className="text-center text-[11px] text-zinc-500">…or drag &amp; drop / paste (Ctrl+V) onto the canvas</p>

      <div>
        <Label>Solid color layer</Label>
        <ColorPicker selected="" onChange={addSolidLayer} />
      </div>
      <div>
        <Label>Gradient layer</Label>
        <GradientPicker selected="" onChange={addGradientLayer} onCustomGradient={() => {}} />
      </div>
    </div>
  );
};

const DocumentPanel: React.FC = () => {
  const { docSize, setDocSize, zoomFit } = useEditor();
  const [locked, setLocked] = useState(true);
  const ratio = docSize.width / docSize.height;

  // Clamp instead of reject — a rejected commit would leave the input showing a
  // value the document never took (uncontrolled input + stable key).
  const clampDoc = (v: number) => Math.max(16, Math.min(6000, Math.round(v)));
  const setW = (v: number) => setDocSize(clampDoc(v), locked ? clampDoc(v / ratio) : docSize.height);
  const setH = (v: number) => setDocSize(locked ? clampDoc(v * ratio) : docSize.width, clampDoc(v));

  const ASPECTS: { label: string; r: number }[] = [
    { label: '1:1', r: 1 },
    { label: '4:5', r: 4 / 5 },
    { label: '3:2', r: 3 / 2 },
    { label: '2:3', r: 2 / 3 },
    { label: '16:9', r: 16 / 9 },
    { label: '9:16', r: 9 / 16 },
  ];
  const applyAspect = (r: number) => {
    const longEdge = Math.max(docSize.width, docSize.height);
    const w = r >= 1 ? longEdge : Math.round(longEdge * r);
    const h = r >= 1 ? Math.round(longEdge / r) : longEdge;
    setDocSize(w, h);
  };

  return (
    <div className="space-y-5">
      <div>
        <Label>Canvas size</Label>
        <div className="flex items-center gap-2">
          <NumInput label="W" value={docSize.width} onCommit={setW} />
          <button
            onClick={() => setLocked((l) => !l)}
            title={locked ? 'Aspect ratio locked — W and H stay in sync' : 'Aspect ratio free'}
            className={clsx(
              'focus-ring shrink-0 rounded-md border p-2 transition-colors',
              locked
                ? 'border-indigo-400/50 bg-indigo-500/15 text-indigo-300'
                : 'border-white/10 bg-zinc-800/70 text-zinc-500 hover:text-white'
            )}
          >
            {locked ? <FaLock size={11} /> : <FaLockOpen size={11} />}
          </button>
          <NumInput label="H" value={docSize.height} onCommit={setH} />
          <button
            onClick={zoomFit}
            title="Fit to screen"
            className="focus-ring rounded-md border border-white/10 bg-zinc-800/70 p-2 text-zinc-300 hover:bg-zinc-800"
          >
            <FaMagnifyingGlass size={12} />
          </button>
        </div>
        <p className="mt-1.5 text-[10px] text-zinc-500">Content stays centered when the canvas is resized.</p>
      </div>
      <div>
        <Label>Aspect ratio</Label>
        <div className="flex gap-1.5">
          {ASPECTS.map((a) => (
            <button
              key={a.label}
              onClick={() => applyAspect(a.r)}
              className={clsx(
                'focus-ring flex-1 rounded-lg border py-2 font-mono text-[11px] font-bold transition-all active:scale-95',
                Math.abs(ratio - a.r) < 0.01
                  ? 'border-indigo-400/60 bg-indigo-500/15 text-indigo-200'
                  : 'border-white/10 bg-zinc-800/50 text-zinc-300 hover:border-white/25'
              )}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <Label>Presets</Label>
        <div className="grid grid-cols-2 gap-2">
          {DOC_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => setDocSize(p.width, p.height)}
              className={clsx(
                'focus-ring rounded-lg border px-3 py-2 text-left transition-all active:scale-[0.98]',
                docSize.width === p.width && docSize.height === p.height
                  ? 'border-indigo-400/60 bg-indigo-500/15'
                  : 'border-white/10 bg-zinc-800/50 hover:border-white/20'
              )}
            >
              <div className="text-xs font-bold text-zinc-200">{p.label}</div>
              <div className="font-mono text-[10px] text-zinc-500">{p.sub}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const BgPanel: React.FC = () => {
  const { docBg, setDocBackground, openBgPicker, clearBgImage } = useEditor();
  return (
    <div className="space-y-5">
      <div>
        <Label>Type</Label>
        <div className="flex gap-2">
          {/* clicking the already-active chip is a no-op — re-applying the default
              would silently destroy the user's custom color/gradient */}
          <Chip
            active={docBg.kind === 'color'}
            onClick={() => docBg.kind !== 'color' && setDocBackground({ kind: 'color', value: '#ffffff' })}
          >
            Color
          </Chip>
          <Chip
            active={docBg.kind === 'gradient'}
            onClick={() => docBg.kind !== 'gradient' && setDocBackground({ kind: 'gradient', value: 'linear-gradient(to right, #6366f1, #a855f7)' })}
          >
            Gradient
          </Chip>
          <Chip
            active={docBg.kind === 'transparent'}
            onClick={() => docBg.kind !== 'transparent' && setDocBackground({ kind: 'transparent' })}
          >
            Transparent
          </Chip>
        </div>
      </div>
      {docBg.kind === 'color' && (
        <div>
          <Label>Color</Label>
          <ColorPicker selected={docBg.value} onChange={(c) => setDocBackground({ kind: 'color', value: c })} />
        </div>
      )}
      {docBg.kind === 'gradient' && (
        <div>
          <Label>Gradient — presets &amp; custom (up to 5 stops)</Label>
          <GradientPicker selected={docBg.value} onChange={(g) => setDocBackground({ kind: 'gradient', value: g })} onCustomGradient={() => {}} />
        </div>
      )}
      {docBg.kind === 'transparent' && (
        <p className="rounded-lg border border-white/10 bg-zinc-800/40 px-3 py-2 text-[11px] text-zinc-400">
          Checkerboard = transparent. Export as <strong>PNG</strong> to keep it — JPG fills white.
        </p>
      )}
      <div>
        <Label>Image background</Label>
        <div className="flex gap-2">
          <button
            onClick={openBgPicker}
            className="focus-ring flex flex-1 items-center justify-center gap-2 rounded-lg bg-zinc-800/70 py-3 text-xs font-bold text-zinc-200 transition-colors hover:bg-zinc-800"
          >
            <FaUpload /> Upload (cover)
          </button>
          <button
            onClick={clearBgImage}
            title="Remove background image"
            className="focus-ring flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-zinc-800/70 px-3.5 py-3 text-xs font-bold text-zinc-400 transition-colors hover:border-red-500/30 hover:text-red-400"
          >
            <FaTrashCan /> Remove
          </button>
        </div>
      </div>
    </div>
  );
};

const TextPanel: React.FC = () => {
  const { activeObj, editorState, updateStyle, handleTextFormat, commitHistory } = useEditor();
  const isText = activeObj && (activeObj.type === 'i-text' || activeObj.type === 'text');
  if (!isText) {
    return (
      <p className="py-6 text-center text-xs text-zinc-500">
        Select a text object to edit it.
        <br />
        Double-click text on the canvas to rewrite it.
      </p>
    );
  }
  const a: any = activeObj;
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-center gap-3">
        <div className="flex overflow-hidden rounded-lg border border-white/10">
          <button onClick={() => handleTextFormat('bold')} className={clsx('px-3 py-2 text-sm hover:bg-zinc-800', a.fontWeight === 'bold' ? 'text-indigo-300' : 'text-zinc-400')}><FaBold /></button>
          <button onClick={() => handleTextFormat('italic')} className={clsx('px-3 py-2 text-sm hover:bg-zinc-800', a.fontStyle === 'italic' ? 'text-indigo-300' : 'text-zinc-400')}><FaItalic /></button>
          <button onClick={() => handleTextFormat('underline')} className={clsx('px-3 py-2 text-sm hover:bg-zinc-800', a.underline ? 'text-indigo-300' : 'text-zinc-400')}><FaUnderline /></button>
        </div>
        <div className="flex overflow-hidden rounded-lg border border-white/10">
          <button onClick={() => handleTextFormat('align-left')} className={clsx('px-3 py-2 text-sm hover:bg-zinc-800', a.textAlign === 'left' ? 'text-indigo-300' : 'text-zinc-400')}><FaAlignLeft /></button>
          <button onClick={() => handleTextFormat('align-center')} className={clsx('px-3 py-2 text-sm hover:bg-zinc-800', a.textAlign === 'center' ? 'text-indigo-300' : 'text-zinc-400')}><FaAlignCenter /></button>
          <button onClick={() => handleTextFormat('align-right')} className={clsx('px-3 py-2 text-sm hover:bg-zinc-800', a.textAlign === 'right' ? 'text-indigo-300' : 'text-zinc-400')}><FaAlignRight /></button>
        </div>
      </div>

      <div>
        <Label>Font</Label>
        <div className="flex gap-2 overflow-x-auto pb-1 hide-scroll">
          {[...FONTS, ...MORE_FONTS].map((f) => (
            <button
              key={f}
              onClick={() => updateStyle('font', f)}
              style={{ fontFamily: f }}
              className={clsx(
                'shrink-0 rounded-lg border px-3.5 py-2 text-xs transition-all',
                editorState.font === f
                  ? 'border-indigo-400/60 bg-indigo-500/20 text-indigo-200'
                  : 'border-white/10 bg-zinc-800/60 text-zinc-300 hover:border-white/20'
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <Slider label="Size" value={editorState.fontSize} min={8} max={300} step={1} onChange={(v) => updateStyle('fontSize', v)} onCommit={commitHistory} />
      <Slider label="Spacing" value={editorState.charSpacing} min={-100} max={800} step={10} format={(v) => String(Math.round(v))} onChange={(v) => updateStyle('charSpacing', v)} onCommit={commitHistory} />
      <Slider label="Line height" value={editorState.lineHeight} min={0.6} max={2.4} step={0.02} defaultVal={1.16} format={(v) => v.toFixed(2)} onChange={(v) => updateStyle('lineHeight', v)} onCommit={commitHistory} />

      <div className="grid grid-cols-2 gap-4">
        <div><Label>Fill</Label><ColorPicker selected={editorState.fill} onChange={(c) => updateStyle('fill', c)} /></div>
        <div><Label>Highlight</Label><ColorPicker selected={editorState.bg} onChange={(c) => updateStyle('bg', c)} /></div>
      </div>
    </div>
  );
};

const ShapePanel: React.FC = () => {
  const { addShape, addPolygon } = useEditor();
  const [sides, setSides] = useState(6);
  const [star, setStar] = useState(false);

  const items = [
    { key: 'rect' as const, icon: <FaSquare className="text-xl" />, label: 'Rect', onClick: () => addShape('rect') },
    { key: 'circle' as const, icon: <FaCircle className="text-xl" />, label: 'Circle', onClick: () => addShape('circle') },
    { key: 'tri' as const, icon: <FaPlay className="-rotate-90 text-xl" />, label: 'Triangle', onClick: () => addShape('tri') },
    { key: 'pentagon' as const, icon: <span className="text-2xl leading-none">⬠</span>, label: 'Pentagon', onClick: () => addPolygon(5) },
    { key: 'hexagon' as const, icon: <span className="text-2xl leading-none">⬡</span>, label: 'Hexagon', onClick: () => addPolygon(6) },
    { key: 'star' as const, icon: <span className="text-2xl leading-none">⭐</span>, label: 'Star 5', onClick: () => addPolygon(5, true) },
  ];
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-2">
        {items.map((it) => (
          <button
            key={it.key}
            onClick={it.onClick}
            className="focus-ring flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-zinc-800/60 py-4 text-zinc-300 transition-all hover:border-white/20 hover:bg-zinc-800 active:scale-95"
          >
            {it.icon}
            <span className="text-[10px] font-bold uppercase tracking-wide">{it.label}</span>
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-white/10 bg-zinc-800/40 p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Custom polygon</span>
          <button
            onClick={() => setStar((s) => !s)}
            className={clsx(
              'focus-ring rounded-full border px-2.5 py-1 text-[10px] font-bold transition-colors',
              star ? 'border-indigo-400/50 bg-indigo-500/15 text-indigo-300' : 'border-white/10 bg-zinc-800/70 text-zinc-400'
            )}
          >
            {star ? '★ star' : '⬡ polygon'}
          </button>
        </div>
        <Slider
          label="Sides"
          value={sides}
          min={3}
          max={20}
          step={1}
          defaultVal={6}
          format={(v) => String(Math.round(v))}
          onChange={(v) => setSides(v)}
        />
        <button
          onClick={() => addPolygon(sides, star)}
          className="focus-ring mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-gradient py-2.5 text-xs font-bold text-white transition-transform active:scale-[0.98]"
        >
          <FaPlus /> Add {star ? `${Math.round(sides)}-point star` : `${Math.round(sides)}-sided polygon`}
        </button>
      </div>
    </div>
  );
};

const DrawPanel: React.FC = () => {
  const { editorState, updateStyle, toggleDraw, isDrawing } = useEditor();
  return (
    <div className="space-y-4">
      {isDrawing && (
        <div className="flex justify-center">
          <span className="animate-pulse-dot rounded-full bg-indigo-500/15 px-3 py-1 text-[11px] font-bold text-indigo-300">
            Drawing mode active
          </span>
        </div>
      )}
      <Slider label="Brush size" value={editorState.brushS} min={1} max={80} defaultVal={5} onChange={(v) => updateStyle('brushS', v)} />
      <div>
        <Label>Brush color</Label>
        <ColorPicker selected={editorState.brushC} onChange={(c) => updateStyle('brushC', c)} />
      </div>
      <button
        onClick={toggleDraw}
        className="focus-ring w-full rounded-lg border border-white/10 bg-zinc-800/70 py-2.5 text-xs font-bold text-zinc-200 hover:bg-zinc-800"
      >
        {isDrawing ? 'Stop drawing' : 'Start drawing'}
      </button>
    </div>
  );
};

const StickerPanel: React.FC = () => {
  const { addSticker } = useEditor();
  const [custom, setCustom] = useState('');
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && custom.trim()) {
              addSticker(custom.trim());
              setCustom('');
            }
          }}
          placeholder="Custom emoji or text…"
          className="focus-ring min-w-0 flex-1 rounded-lg border border-white/10 bg-zinc-800/70 px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-indigo-400/50"
        />
        <button
          disabled={!custom.trim()}
          onClick={() => {
            addSticker(custom.trim());
            setCustom('');
          }}
          className="focus-ring rounded-lg bg-brand-gradient px-4 text-sm font-bold text-white disabled:opacity-40"
        >
          Add
        </button>
      </div>
      <div className="grid h-36 grid-cols-6 gap-2 overflow-y-auto">
        {STICKERS.map((s) => (
          <button key={s} onClick={() => addSticker(s)} className="rounded-lg py-2 text-3xl transition-transform hover:scale-110 active:scale-95">
            {s}
          </button>
        ))}
      </div>
    </div>
  );
};

const AdjustPanel: React.FC = () => {
  const { activeObj, editorState, adjustImage, commitHistory, holdCompare, startCrop, toggleRemoveColor, setRemoveColor } = useEditor();
  // If this panel unmounts mid-hold (Escape, tool switch, selection change via
  // touch), the Compare button's pointerup handler dies with it and the stash
  // would stay applied — release it on unmount. No stash ⇒ harmless no-op.
  useEffect(() => () => holdCompare(false), [holdCompare]);
  if (!activeObj) {
    return <p className="py-6 text-center text-xs text-zinc-500">Select an object to adjust it.</p>;
  }
  const isVector = activeObj.type !== 'image';
  const anyAdjusted = ADJUSTMENTS.some((a) => Math.abs(((editorState as any)[a.key] ?? a.zero) - a.zero) > 1e-9);
  const resetAll = () => {
    ADJUSTMENTS.forEach((a) => {
      if (Math.abs(((editorState as any)[a.key] ?? a.zero) - a.zero) > 1e-9) adjustImage(a.key, a.zero);
    });
    commitHistory();
  };
  return (
    <div className="space-y-4">
      {isVector && (
        <p className="rounded-lg border border-indigo-400/25 bg-indigo-500/10 px-2.5 py-2 text-[10px] leading-relaxed text-indigo-200">
          Shapes & text are rasterized on the first adjustment — undo restores the vector original.
        </p>
      )}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Adjustments</span>
        <button
          onClick={resetAll}
          disabled={!anyAdjusted}
          className={clsx(
            'focus-ring flex h-10 items-center gap-1.5 rounded-lg border px-3 text-[11px] font-bold transition-colors',
            anyAdjusted
              ? 'border-white/10 bg-zinc-800/70 text-zinc-300 hover:bg-zinc-800 hover:text-white'
              : 'cursor-not-allowed border-white/5 bg-zinc-800/30 text-zinc-600'
          )}
        >
          <FaArrowRotateLeft size={10} /> Reset all
        </button>
      </div>
      {ADJUSTMENTS.map((a) => (
        <Slider
          key={a.key}
          label={a.label}
          value={(editorState as any)[a.key] ?? a.zero}
          min={a.min}
          max={a.max}
          step={a.step}
          defaultVal={a.zero}
          format={a.format}
          onChange={(v) => adjustImage(a.key, v)}
          onCommit={commitHistory}
        />
      ))}

      <div className="flex gap-2">
        <button
          onPointerDown={() => holdCompare(true)}
          onPointerUp={() => holdCompare(false)}
          onPointerLeave={() => holdCompare(false)}
          onPointerCancel={() => holdCompare(false)}
          onLostPointerCapture={() => holdCompare(false)}
          className="focus-ring flex min-h-11 flex-1 touch-none items-center justify-center gap-2 rounded-lg border border-white/10 bg-zinc-800/70 px-2 text-xs font-bold text-zinc-200 transition-colors hover:bg-zinc-800 active:bg-zinc-700"
        >
          <FaEyeDropper /> Hold to compare
        </button>
        <button
          onClick={startCrop}
          className="focus-ring flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-white/10 bg-zinc-800/70 px-2 text-xs font-bold text-zinc-200 transition-colors hover:bg-zinc-800"
        >
          <FaCropSimple /> Crop
        </button>
      </div>

      <div className="rounded-xl border border-white/10 bg-zinc-800/30 p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Remove color</span>
          <button
            onClick={() => toggleRemoveColor(!editorState.removeColorOn)}
            className={clsx(
              'focus-ring relative h-5 w-9 rounded-full transition-colors',
              editorState.removeColorOn ? 'bg-indigo-500' : 'bg-zinc-700'
            )}
            aria-label="Toggle remove color"
          >
            <span className={clsx('absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all', editorState.removeColorOn ? 'left-[18px]' : 'left-0.5')} />
          </button>
        </div>
        {editorState.removeColorOn && (
          <div className="space-y-2">
            <ColorPicker selected={editorState.removeColorHex} onChange={(c) => { setRemoveColor(c, editorState.removeColorDist); commitHistory(); }} />
            <Slider
              label="Tolerance"
              value={editorState.removeColorDist}
              min={0.02}
              max={0.6}
              step={0.01}
              defaultVal={0.2}
              format={(v) => v.toFixed(2)}
              onChange={(v) => setRemoveColor(editorState.removeColorHex, v)}
              onCommit={commitHistory}
            />
          </div>
        )}
      </div>
    </div>
  );
};

const FilterPanel: React.FC = () => {
  const { activeObj, editorState, applyFilterPreset } = useEditor();
  if (!activeObj) {
    return <p className="py-6 text-center text-xs text-zinc-500">Select an object to apply filters.</p>;
  }
  const isVector = activeObj.type !== 'image';
  return (
    <div className="space-y-3">
      {isVector && (
        <p className="rounded-lg border border-indigo-400/25 bg-indigo-500/10 px-2.5 py-2 text-[10px] leading-relaxed text-indigo-200">
          Shapes & text are rasterized on the first filter — undo restores the vector original.
        </p>
      )}
      <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-5">
      {FILTER_PRESETS.map((f) => (
        <button
          key={f.name}
          onClick={() => applyFilterPreset(f.name)}
          className="group flex flex-col items-center gap-1.5"
        >
          <div
            className={clsx(
              'aspect-square w-full overflow-hidden rounded-xl border-2 transition-all group-hover:scale-105 group-active:scale-95',
              editorState.filterPreset === f.name ? 'border-indigo-400' : 'border-white/10'
            )}
          >
            <div
              className="h-full w-full"
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 35%, #6366f1 70%, #22d3ee 100%)',
                filter: f.css || undefined,
              }}
            />
          </div>
          <span className={clsx('text-[9px] font-bold uppercase tracking-wide', editorState.filterPreset === f.name ? 'text-indigo-300' : 'text-zinc-400')}>
            {f.name}
          </span>
        </button>
      ))}
      </div>
    </div>
  );
};

const MaskPanel: React.FC = () => {
  const { activeObj, startMasking } = useEditor();
  if (!activeObj) {
    return <p className="py-6 text-center text-xs text-zinc-500">Select an object to mask it.</p>;
  }
  if ((activeObj as any).type === 'activeSelection') {
    return <p className="py-6 text-center text-xs text-zinc-500">Select a single object to mask it.</p>;
  }
  const maskShapes = [
    { key: 'rect' as const, label: 'Square', visual: <div className="h-7 w-7 rounded border-2 border-zinc-300" /> },
    { key: 'circle' as const, label: 'Circle', visual: <div className="h-7 w-7 rounded-full border-2 border-zinc-300" /> },
    { key: 'triangle' as const, label: 'Triangle', visual: <div className="h-0 w-0 border-b-[26px] border-l-[14px] border-r-[14px] border-b-zinc-300 border-l-transparent border-r-transparent" /> },
    { key: 'heart' as const, label: 'Heart', visual: <span className="text-2xl">❤️</span> },
    { key: 'star' as const, label: 'Star', visual: <span className="text-2xl">⭐</span> },
  ];
  return (
    <div className="space-y-3">
      <p className="text-[10px] leading-relaxed text-zinc-500">
        Mask clips the object to the shape — fully reversible, the original is kept. For a real cut (with borders that follow the shape exactly), use <span className="font-bold text-zinc-400">Crop</span>.
      </p>
      <div className="grid grid-cols-5 gap-2">
        {maskShapes.map((s) => (
          <button
            key={s.key}
            onClick={() => startMasking(s.key)}
            className="focus-ring flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-zinc-800/60 py-3 transition-all hover:border-white/20 hover:bg-zinc-800 active:scale-95"
          >
            {s.visual}
            <span className="text-[9px] font-bold uppercase text-zinc-400">{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

const MaskEditPanel: React.FC = () => {
  const { finishMasking } = useEditor();
  return (
    <div className="space-y-3">
      <p className="text-center text-xs text-zinc-400">Move, scale and rotate the shape over the image, then apply.</p>
      <div className="flex justify-center gap-3">
        <button
          onClick={() => finishMasking(false)}
          className="focus-ring flex items-center gap-2 rounded-full bg-zinc-800 px-6 py-3 text-sm font-bold text-red-400 transition-colors hover:bg-zinc-700"
        >
          <FaXmark /> Cancel
        </button>
        <button
          onClick={() => finishMasking(true)}
          className="focus-ring flex items-center gap-2 rounded-full bg-brand-gradient px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-950/40"
        >
          <FaCheck /> Apply mask
        </button>
      </div>
    </div>
  );
};

const ArrangePanel: React.FC = () => {
  const { activeObj, flip, rotate90, lockToggle, order, align, duplicate, deleteSelected, updateTransform } = useEditor();
  if (!activeObj) {
    return <p className="py-6 text-center text-xs text-zinc-500">Select an object to arrange it.</p>;
  }
  const a: any = activeObj;
  const w = Math.round((a.width || 0) * (a.scaleX || 1));
  const h = Math.round((a.height || 0) * (a.scaleY || 1));
  return (
    <div className="space-y-5">
      <div>
        <Label>Transform</Label>
        <div className="grid grid-cols-2 gap-2">
          <NumInput label="X" value={a.left || 0} onCommit={(v) => updateTransform({ left: v })} />
          <NumInput label="Y" value={a.top || 0} onCommit={(v) => updateTransform({ top: v })} />
          <NumInput label="W" value={w} onCommit={(v) => v > 4 && updateTransform({ scaleX: v / (a.width || 1) })} />
          <NumInput label="H" value={h} onCommit={(v) => v > 4 && updateTransform({ scaleY: v / (a.height || 1) })} />
        </div>
        <div className="mt-2">
          <NumInput label="∠" value={a.angle || 0} onCommit={(v) => updateTransform({ angle: v })} />
        </div>
      </div>

      <div>
        <Label>Flip · rotate · lock</Label>
        <div className="flex flex-wrap gap-2">
          <Chip onClick={() => flip('X')}><FaArrowsLeftRight className="mr-1.5 inline" />Flip H</Chip>
          <Chip onClick={() => flip('Y')}><FaArrowsUpDown className="mr-1.5 inline" />Flip V</Chip>
          <Chip onClick={() => rotate90(-1)}><FaArrowRotateLeft className="mr-1.5 inline" />−90°</Chip>
          <Chip onClick={() => rotate90(1)}><FaArrowRotateRight className="mr-1.5 inline" />+90°</Chip>
          <Chip onClick={() => updateTransform({ angle: (((a.angle || 0) - 45) % 360 + 360) % 360 })}>−45°</Chip>
          <Chip onClick={() => updateTransform({ angle: (((a.angle || 0) + 45) % 360 + 360) % 360 })}>+45°</Chip>
          <Chip onClick={lockToggle} active={!!a.lockMovementX}>
            {a.lockMovementX ? <FaLock className="mr-1.5 inline" /> : <FaUnlock className="mr-1.5 inline" />}
            {a.lockMovementX ? 'Locked' : 'Lock'}
          </Chip>
        </div>
      </div>

      <div>
        <Label>Layer order</Label>
        <div className="flex flex-wrap gap-2">
          <Chip onClick={() => order('backward')}><FaArrowDown className="mr-1.5 inline" />Back</Chip>
          <Chip onClick={() => order('forward')}><FaArrowUp className="mr-1.5 inline" />Front</Chip>
          <Chip onClick={() => order('back')}><FaAnglesDown className="mr-1.5 inline" />To bottom</Chip>
          <Chip onClick={() => order('front')}><FaAnglesUp className="mr-1.5 inline" />To top</Chip>
        </div>
      </div>

      <div>
        <Label>Align to canvas</Label>
        <div className="flex gap-2">
          {(['left', 'center-h', 'right', 'top', 'center-v', 'bottom'] as const).map((m) => (
            <button
              key={m}
              onClick={() => align(m)}
              title={m}
              className="focus-ring flex-1 rounded-lg border border-white/10 bg-zinc-800/60 py-2.5 transition-all hover:border-white/20 hover:bg-zinc-800 active:scale-95"
            >
              <span className="flex justify-center"><AlignIcon mode={m} /></span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 border-t border-white/5 pt-4">
        <button onClick={duplicate} className="focus-ring flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/10 bg-zinc-800/70 py-2.5 text-xs font-bold text-zinc-200 hover:bg-zinc-800">
          <FaClone /> Duplicate
        </button>
        <button onClick={deleteSelected} className="focus-ring flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 py-2.5 text-xs font-bold text-red-400 hover:bg-red-500/20">
          <FaTrashCan /> Delete
        </button>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Border stack builder (fancy multi-borders)                          */
/* ------------------------------------------------------------------ */

const DEFAULT_BORDER_CFG: BorderStackConfig = {
  count: 3,
  mode: 'gradient',
  colorA: '#6366f1',
  colorB: '#22d3ee',
  widthMin: 2,
  widthMax: 10,
  gap: 4,
};

/** Preview chip for one ring — tap to select it for editing */
const RingChip: React.FC<{
  ring: BorderRing;
  index: number;
  selected: boolean;
  onClick: () => void;
}> = ({ ring, index, selected, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={`Border ${index + 1}`}
    aria-pressed={selected}
    className={clsx(
      'flex h-[54px] w-11 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border-2 transition-all active:scale-90',
      selected ? 'border-indigo-400 bg-indigo-500/15' : 'border-white/10 bg-zinc-800/40'
    )}
  >
    <span
      className="h-6 w-6 rounded-md border border-black/30"
      style={
        ring.gradient
          ? ring.gradient.type === 'radial'
            ? { background: `radial-gradient(circle, ${ring.gradient.a}, ${ring.gradient.b})` }
            : { background: `linear-gradient(${(ring.gradient.angle + 90) % 360}deg, ${ring.gradient.a}, ${ring.gradient.b})` }
          : { background: ring.color === 'transparent' ? 'transparent' : ring.color }
      }
    />
    <span className={clsx('font-mono text-[9px] font-bold', selected ? 'text-indigo-300' : 'text-zinc-500')}>{index + 1}</span>
  </button>
);

/** Compact icon action for the selected-ring row (move / duplicate / delete) */
const RingAction: React.FC<{
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  title: string;
  children: React.ReactNode;
}> = ({ onClick, disabled, danger, title, children }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    aria-label={title}
    className={clsx(
      'focus-ring flex h-10 w-10 items-center justify-center rounded-lg border text-sm transition-all active:scale-90 disabled:opacity-30',
      danger
        ? 'border-red-500/25 bg-red-500/10 text-red-400'
        : 'border-white/10 bg-zinc-800/70 text-zinc-300 hover:border-white/20 hover:text-white'
    )}
  >
    {children}
  </button>
);

const BorderStackBuilder: React.FC = () => {
  const { activeObj, applyBorderStack, removeBorderStack } = useEditor();
  const isRingGroup = activeObj?.type === 'group' && !!(activeObj as any).onyxRing;
  const seed: BorderStackConfig = isRingGroup ? (activeObj as any).onyxRingCfg : DEFAULT_BORDER_CFG;
  const [cfg, setCfg] = useState<BorderStackConfig>({ ...seed });
  // Re-seed when a DIFFERENT ring group is selected — otherwise the tweaks
  // would apply the previous object's config. Plain objects keep the current tweaks.
  const [lastObj, setLastObj] = useState<fabric.Object | undefined | null>(activeObj);
  /** which ring chip is being edited (per-border mode) */
  const [sel, setSel] = useState(0);
  /** AUTO-APPLY guards:
   *  - touchedRef: set on the first USER edit; opening the builder never
   *    slaps a border on the object by itself.
   *  - lastAppliedRef: JSON of the last applied cfg. The rebuild re-selects a
   *    NEW group object which re-seeds cfg with identical content — comparing
   *    against this string breaks the re-seed → apply → re-seed feedback loop. */
  const touchedRef = useRef(false);
  const lastAppliedRef = useRef<string>('');
  const applyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** latest cfg for the unmount flush (the debounce closure would hold a stale one) */
  const cfgRef = useRef(cfg);
  cfgRef.current = cfg;
  if (activeObj !== lastObj) {
    // An auto-apply echo rebuilds the group as a NEW object with IDENTICAL
    // cfg — keep editing the same ring chip in that case (setSel(0) here made
    // every tweak dump the user back onto Border 1, mid-drag included).
    const incoming: BorderStackConfig | undefined = (activeObj as any)?.onyxRingCfg;
    const isEcho =
      !!lastAppliedRef.current && !!incoming && JSON.stringify(incoming) === lastAppliedRef.current;
    setLastObj(activeObj);
    touchedRef.current = false;
    if (activeObj?.type === 'group' && (activeObj as any).onyxRing) {
      setCfg({ ...incoming! });
      if (isEcho) {
        // keep sel (clamped to the new count)
        setSel((s) => Math.min(s, Math.max(0, (incoming?.count || 1) - 1)));
      } else {
        setSel(0);
      }
    }
  }

  // Debounced auto-apply — every tweak lands ~350ms after the last change.
  // The engine queues cfgs that arrive mid-rebuild, so no tick is ever lost.
  useEffect(() => {
    if (!touchedRef.current) return;
    const key = JSON.stringify(cfg);
    if (key === lastAppliedRef.current) return;
    if (applyTimerRef.current) clearTimeout(applyTimerRef.current);
    applyTimerRef.current = setTimeout(() => {
      lastAppliedRef.current = key;
      applyBorderStack(cfg, { quiet: true });
    }, 350);
    return () => {
      if (applyTimerRef.current) clearTimeout(applyTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg]);
  useEffect(
    () => () => {
      if (applyTimerRef.current) clearTimeout(applyTimerRef.current);
      // A tweak still inside its 350ms debounce window must not die with the
      // panel (switching to Single, Done, selecting another object) — the
      // "auto-applies" badge promises it lands.
      if (touchedRef.current && JSON.stringify(cfgRef.current) !== lastAppliedRef.current) {
        applyBorderStack(cfgRef.current, { quiet: true });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const maxCount = cfg.mode === 'custom' ? 64 : MAX_BORDERS;
  const count = Math.round(cfg.count);
  const patch = (p: Partial<BorderStackConfig>) => {
    touchedRef.current = true;
    setCfg((c) => ({ ...c, ...p }));
  };

  const DEFAULT_RING: BorderRing = { width: 6, color: '#ffffff' };
  const getRing = (i: number): BorderRing => cfg.rings?.[i] || DEFAULT_RING;

  const patchRing = (i: number, p: Partial<BorderRing>) => {
    touchedRef.current = true;
    setCfg((c) => {
      const rings = [...(c.rings || [])];
      while (rings.length < c.count) rings.push({ ...DEFAULT_RING });
      rings[i] = { ...rings[i], ...p };
      return { ...c, rings };
    });
  };

  const setCount = (n: number) => {
    const v = Math.max(1, Math.min(maxCount, Math.round(n) || 1));
    patch({ count: v });
    setSel((s) => Math.min(s, v - 1));
  };

  /** swap ring i with its neighbour (dir −1 = inward / +1 = outward) */
  const moveRing = (i: number, dir: -1 | 1) => {
    touchedRef.current = true;
    setCfg((c) => {
      const rings = [...(c.rings || [])];
      while (rings.length < c.count) rings.push({ ...DEFAULT_RING });
      const j = i + dir;
      if (j < 0 || j >= rings.length) return c;
      [rings[i], rings[j]] = [rings[j], rings[i]];
      return { ...c, rings };
    });
  };

  const dupRing = (i: number) => {
    touchedRef.current = true;
    setCfg((c) => {
      if (c.count >= (c.mode === 'custom' ? 64 : MAX_BORDERS)) return c;
      const rings = [...(c.rings || [])];
      while (rings.length < c.count) rings.push({ ...DEFAULT_RING });
      rings.splice(i + 1, 0, { ...rings[i] });
      return { ...c, rings, count: Math.min(c.count + 1, c.mode === 'custom' ? 64 : MAX_BORDERS) };
    });
  };

  const delRing = (i: number) => {
    touchedRef.current = true;
    setCfg((c) => {
      if (c.count <= 1) return c;
      const rings = [...(c.rings || [])];
      while (rings.length < c.count) rings.push({ ...DEFAULT_RING });
      rings.splice(i, 1);
      return { ...c, rings, count: c.count - 1 };
    });
  };

  const ring = getRing(sel);

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-800/40 p-3">
      <div className="mb-1 flex items-center justify-between">
        <span className="flex items-center gap-2 text-xs font-bold text-zinc-200">
          <FaLayerGroup size={11} className="text-indigo-300" />
          Multi-border {isRingGroup && <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[9px] font-bold text-indigo-300">editing</span>}
        </span>
        <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide text-emerald-400/90">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> auto-applies
        </span>
      </div>

      <div className="mt-2 space-y-4">
          {/* Border count: fat − / + steppers + drag slider */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Borders <span className="normal-case text-zinc-600">· up to {maxCount}</span>
              </span>
              <span className="rounded bg-zinc-800/80 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-zinc-300">{count}</span>
            </div>
            <div className="flex items-center gap-2">
              <StepBtn label="−" onClick={() => setCount(count - 1)} disabled={count <= 1} />
              <input
                type="range"
                className="onyx-range min-w-0 flex-1"
                min={1}
                max={24}
                step={1}
                value={Math.min(count, 24)}
                aria-label="Border count"
                onChange={(e) => setCount(Math.round(parseFloat(e.target.value)))}
              />
              <StepBtn label="+" onClick={() => setCount(count + 1)} disabled={count >= maxCount} />
            </div>
          </div>

          <div className="flex gap-2">
            <Chip active={cfg.mode === 'gradient'} onClick={() => patch({ mode: 'gradient' })} className="flex-1">Gradient ramp</Chip>
            <Chip
              active={cfg.mode === 'custom'}
              onClick={() => {
                touchedRef.current = true;
                setCfg((c) => {
                  const n = Math.max(1, Math.min(Math.round(c.count), 64));
                  // First entry: seed per-border rings from the current gradient
                  // ramp so the editor starts from something meaningful instead
                  // of a wall of identical white defaults.
                  const hasTweaks = !!c.rings?.some((r) => r.color !== '#ffffff' || r.gradient);
                  if (hasTweaks) return { ...c, mode: 'custom', count: n };
                  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
                  const HEX6 = /^#[0-9a-fA-F]{6}$/;
                  const mix = (a: string, b: string, t: number) => {
                    // guard like mixHex in CanvasEditor: "transparent" parses
                    // to NaN and would poison every seeded ring color
                    const sa = HEX6.test(a) ? a : '#ffffff';
                    const sb = HEX6.test(b) ? b : '#ffffff';
                    const pa = [1, 3, 5].map((i) => parseInt(sa.slice(i, i + 2), 16));
                    const pb = [1, 3, 5].map((i) => parseInt(sb.slice(i, i + 2), 16));
                    return '#' + pa.map((v, i) => Math.round(lerp(v, pb[i], t)).toString(16).padStart(2, '0')).join('');
                  };
                  const rings = Array.from({ length: n }, (_, i) => ({
                    width: Math.round(lerp(c.widthMin, c.widthMax, n === 1 ? 0 : i / (n - 1))),
                    color: mix(c.colorA, c.colorB, n === 1 ? 0 : i / (n - 1)),
                  }));
                  return { ...c, mode: 'custom', count: n, rings };
                });
                setSel((s) => Math.min(s, 63));
                // Per-border editing is content-heavy — ask the mobile sheet for
                // its tall snap point so the ring chips are immediately visible.
                if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('onyx:expand-sheet'));
              }}
              className="flex-1"
            >
              Per-border
            </Chip>
          </div>

          {cfg.mode === 'gradient' ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Inner color</Label>
                  <ColorPicker selected={cfg.colorA} onChange={(c) => patch({ colorA: c })} />
                </div>
                <div>
                  <Label>Outer color</Label>
                  <ColorPicker selected={cfg.colorB} onChange={(c) => patch({ colorB: c })} />
                </div>
              </div>
              <Slider
                label="Thin → thick ramp"
                value={cfg.widthMin}
                min={1}
                max={20}
                step={1}
                defaultVal={2}
                format={(v) => `${Math.round(v)}px`}
                onChange={(v) => patch({ widthMin: v, widthMax: Math.max(v, cfg.widthMax) })}
              />
              <Slider
                label="Outer thickness"
                value={cfg.widthMax}
                min={1}
                max={30}
                step={1}
                defaultVal={10}
                format={(v) => `${Math.round(v)}px`}
                onChange={(v) => patch({ widthMax: v, widthMin: Math.min(v, cfg.widthMin) })}
              />
            </>
          ) : (
            <>
              {/* Ring chips — tap a border to edit it (never scroll a 64-row list) */}
              <div>
                <Label>Tap a border to edit it</Label>
                <div className="mask-fade-x flex items-stretch gap-1.5 overflow-x-auto pb-1 hide-scroll">
                  {Array.from({ length: count }).map((_, i) => (
                    <RingChip key={i} ring={getRing(i)} index={i} selected={i === sel} onClick={() => setSel(i)} />
                  ))}
                  {count < maxCount && (
                    <button
                      type="button"
                      onClick={() => setCount(count + 1)}
                      aria-label="Add another border"
                      className="flex h-[54px] w-11 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-white/15 text-zinc-500 transition-all active:scale-90 hover:border-indigo-400/50 hover:text-indigo-300"
                    >
                      <FaPlus size={11} />
                      <span className="text-[9px] font-bold uppercase">Add</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Editor for the SELECTED ring — full-size controls, one ring at a time */}
              <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-3">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-zinc-200">
                    Border <span className="text-indigo-300">{sel + 1}</span>
                    <span className="text-zinc-500"> / {count}</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <RingAction title="Move inward" disabled={sel === 0} onClick={() => { moveRing(sel, -1); setSel(sel - 1); }}>
                      ↑
                    </RingAction>
                    <RingAction title="Move outward" disabled={sel >= count - 1} onClick={() => { moveRing(sel, 1); setSel(sel + 1); }}>
                      ↓
                    </RingAction>
                    <RingAction title="Duplicate this border" disabled={count >= maxCount} onClick={() => { dupRing(sel); setSel(sel + 1); }}>
                      ⧉
                    </RingAction>
                    <RingAction title="Delete this border" danger disabled={count <= 1} onClick={() => { delRing(sel); setSel(Math.max(0, sel - 1)); }}>
                      <FaTrashCan size={12} />
                    </RingAction>
                  </div>
                </div>

                <div className="mb-3 flex gap-2">
                  <Chip active={!ring.gradient} onClick={() => patchRing(sel, { gradient: undefined })} className="min-h-10 flex-1">Solid</Chip>
                  <Chip
                    active={!!ring.gradient && ring.gradient.type !== 'radial'}
                    onClick={() => patchRing(sel, { gradient: ring.gradient ? { ...ring.gradient, type: 'linear' } : { a: '#6366f1', b: '#22d3ee', angle: 90, type: 'linear' } })}
                    className="min-h-10 flex-1"
                    title="Straight-line gradient between the two colors"
                  >
                    Linear
                  </Chip>
                  <Chip
                    active={!!ring.gradient && ring.gradient.type === 'radial'}
                    onClick={() => patchRing(sel, { gradient: ring.gradient ? { ...ring.gradient, type: 'radial' } : { a: '#6366f1', b: '#22d3ee', angle: 90, type: 'radial' } })}
                    className="min-h-10 flex-1"
                    title="Center-out circular gradient"
                  >
                    Radial
                  </Chip>
                </div>

                {ring.gradient ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={ring.gradient.a}
                        onChange={(e) => patchRing(sel, { gradient: { ...ring.gradient!, a: e.target.value } })}
                        title="Gradient start"
                        className="h-11 w-14 shrink-0 cursor-pointer rounded-lg border border-white/10 bg-transparent p-1"
                      />
                      <input
                        type="color"
                        value={ring.gradient.b}
                        onChange={(e) => patchRing(sel, { gradient: { ...ring.gradient!, b: e.target.value } })}
                        title="Gradient end"
                        className="h-11 w-14 shrink-0 cursor-pointer rounded-lg border border-white/10 bg-transparent p-1"
                      />
                      {ring.gradient.type === 'radial' ? (
                        <span className="ml-auto rounded bg-zinc-800/80 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-zinc-300">center → out</span>
                      ) : (
                        <span className="ml-auto rounded bg-zinc-800/80 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-zinc-300">
                          {Math.round(ring.gradient.angle)}°
                        </span>
                      )}
                    </div>
                    {ring.gradient.type !== 'radial' && (
                      <Slider
                        label="Gradient angle"
                        value={ring.gradient.angle}
                        min={0}
                        max={360}
                        step={5}
                        defaultVal={90}
                        format={(v) => `${Math.round(v)}°`}
                        onChange={(v) => patchRing(sel, { gradient: { ...ring.gradient!, angle: v } })}
                      />
                    )}
                  </div>
                ) : (
                  <ColorPicker selected={ring.color} onChange={(c) => patchRing(sel, { color: c })} />
                )}

                {/* Thickness: slider + fat steppers */}
                <div className="mt-3">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Thickness</span>
                    <span className="rounded bg-zinc-800/80 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-zinc-300">{Math.round(ring.width)}px</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <StepBtn label="−" onClick={() => patchRing(sel, { width: Math.max(1, ring.width - 1) })} />
                    <input
                      type="range"
                      className="onyx-range min-w-0 flex-1"
                      min={1}
                      max={60}
                      step={1}
                      value={ring.width}
                      aria-label="Border thickness"
                      onChange={(e) => patchRing(sel, { width: parseFloat(e.target.value) })}
                    />
                    <StepBtn label="+" onClick={() => patchRing(sel, { width: Math.min(60, ring.width + 1) })} />
                  </div>
                </div>
              </div>
            </>
          )}

          <Slider label="Gap between borders" value={cfg.gap} min={0} max={24} step={1} defaultVal={4} format={(v) => `${Math.round(v)}px`} onChange={(v) => patch({ gap: v })} />

          <p className="text-[10px] leading-relaxed text-zinc-500">
            Borders wrap the object as one layer, following its crop shape (or native shape) — a reversible mask keeps the full frame instead. Per-border solid, linear and radial gradients supported. Every change applies automatically.
          </p>

          {/* Sticky remove — never buried under the ring list. Applying is
              automatic; the only explicit action left is the destructive one. */}
          {isRingGroup && (
            <StickyBar>
              <button
                onClick={removeBorderStack}
                className="focus-ring flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-red-500/25 bg-red-500/10 px-4 text-xs font-bold text-red-400 hover:bg-red-500/20"
              >
                <FaTrashCan /> Remove borders
              </button>
            </StickyBar>
          )}
        </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Advanced shadow builder (gradient + 360° directional)               */
/* ------------------------------------------------------------------ */

const DEFAULT_SHADOW_CFG: ShadowFxConfig = {
  mode: 'gradient',
  angle: 90,
  distance: 16,
  blur: 20,
  spread: 0,
  opacity: 0.55,
  color: '#000000',
  gradA: '#6366f1',
  gradB: '#22d3ee',
  gradAngle: 90,
};

const SHADOW_PRESETS: { name: string; cfg: Partial<ShadowFxConfig> }[] = [
  { name: 'Soft', cfg: { mode: 'solid', color: '#000000', distance: 14, blur: 26, spread: 0, opacity: 0.4, angle: 90 } },
  { name: 'Hard', cfg: { mode: 'solid', color: '#000000', distance: 8, blur: 0, spread: 0, opacity: 0.85, angle: 90 } },
  { name: 'Glow 360°', cfg: { mode: 'solid', color: '#a855f7', distance: 0, blur: 28, spread: 2, opacity: 0.8 } },
  // gradType is pinned so a Radial left active can't silently swallow a
  // preset's intended direction
  { name: 'Neon grad', cfg: { mode: 'gradient', gradA: '#22d3ee', gradB: '#a855f7', gradAngle: 90, gradType: 'linear', distance: 10, blur: 24, spread: 0, opacity: 0.75, angle: 90 } },
  { name: 'Side sweep', cfg: { mode: 'gradient', gradA: '#f472b6', gradB: '#6366f1', gradAngle: 0, gradType: 'linear', distance: 18, blur: 18, spread: 4, opacity: 0.65, angle: 180 } },
];

const ShadowFxBuilder: React.FC = () => {
  const { activeObj, applyShadowFx, removeShadowFx } = useEditor();
  const isFx = activeObj?.type === 'group' && !!(activeObj as any).onyxShadowCfg;
  const seed: ShadowFxConfig = isFx ? (activeObj as any).onyxShadowCfg : DEFAULT_SHADOW_CFG;
  const [cfg, setCfg] = useState<ShadowFxConfig>({ ...seed });
  // Re-seed when a DIFFERENT fx group is selected (same pattern as the border builder)
  const [lastObj, setLastObj] = useState<fabric.Object | null | undefined>(activeObj);
  if (activeObj !== lastObj) {
    setLastObj(activeObj);
    if (activeObj?.type === 'group' && (activeObj as any).onyxShadowCfg) {
      setCfg({ ...(activeObj as any).onyxShadowCfg });
    }
  }
  const [open, setOpen] = useState(false);
  const patch = (p: Partial<ShadowFxConfig>) => setCfg((c) => ({ ...c, ...p }));

  // 3×3 direction pad. ENGINE convention (screen space, y-down):
  // 0° = right, 90° = down, 180° = left, 270° = up — the matrix below reads
  // row-major top→bottom so each button sits where its shadow actually falls.
  // (A previous compass-rose layout was rotated 90° from the engine and every
  // click threw the shadow the wrong way.)
  const pad: number[][] = [
    [225, 270, 315],
    [180, -1, 0],
    [135, 90, 45],
  ];
  const nearPad = (a: number) => pad.flat().some((v) => v >= 0 && Math.abs(v - a) < 1);
  const dirName = (a: number): string =>
    ({
      0: 'Right',
      45: 'Down-right',
      90: 'Down',
      135: 'Down-left',
      180: 'Left',
      225: 'Up-left',
      270: 'Up',
      315: 'Up-right',
    } as Record<number, string>)[a] || '';

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-800/40 p-3">
      <button onClick={() => setOpen((o) => !o)} className="focus-ring flex w-full items-center justify-between text-left">
        <span className="flex items-center gap-2 text-xs font-bold text-zinc-200">
          <FaCircleHalfStroke size={11} className="text-indigo-300" />
          Advanced shadow {isFx && <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[9px] font-bold text-indigo-300">editing</span>}
        </span>
        <span className="text-[10px] font-bold text-zinc-500">{open ? 'hide ▲' : 'gradient · 360° ▼'}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-4">
          <div className="flex flex-wrap gap-2">
            {SHADOW_PRESETS.map((p) => (
              <Chip key={p.name} onClick={() => patch(p.cfg)} className="min-h-10 px-3 text-[11px]">
                {p.name}
              </Chip>
            ))}
          </div>

          <div className="flex gap-2">
            <Chip active={cfg.mode === 'solid'} onClick={() => patch({ mode: 'solid' })} className="flex-1">Solid</Chip>
            <Chip active={cfg.mode === 'gradient'} onClick={() => patch({ mode: 'gradient' })} className="flex-1">Gradient</Chip>
          </div>

          {cfg.mode === 'gradient' ? (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Chip active={cfg.gradType !== 'radial'} onClick={() => patch({ gradType: 'linear' })} className="min-h-10 flex-1">Linear</Chip>
                <Chip active={cfg.gradType === 'radial'} onClick={() => patch({ gradType: 'radial' })} className="min-h-10 flex-1">Radial</Chip>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{cfg.gradType === 'radial' ? 'Grad center' : 'Grad start'}</Label>
                  <ColorPicker selected={cfg.gradA} onChange={(c) => patch({ gradA: c })} />
                </div>
                <div>
                  <Label>{cfg.gradType === 'radial' ? 'Grad edge' : 'Grad end'}</Label>
                  <ColorPicker selected={cfg.gradB} onChange={(c) => patch({ gradB: c })} />
                </div>
              </div>
              {cfg.gradType !== 'radial' && (
                <Slider
                  label="Gradient direction"
                  value={cfg.gradAngle}
                  min={0}
                  max={360}
                  step={5}
                  defaultVal={90}
                  format={(v) => `${Math.round(v)}°`}
                  onChange={(v) => patch({ gradAngle: v })}
                />
              )}
            </div>
          ) : (
            <div>
              <Label>Shadow color</Label>
              <ColorPicker selected={cfg.color} onChange={(c) => patch({ color: c })} />
            </div>
          )}

          <div>
            <Label>Direction — 360° coverage</Label>
            <div className="mx-auto grid w-40 grid-cols-3 gap-1.5">
              {pad.flat().map((a) =>
                a < 0 ? (
                  <button
                    key="center"
                    onClick={() => patch({ distance: 0 })}
                    title="All sides (360° glow) — distance 0"
                    aria-pressed={cfg.distance === 0}
                    className={clsx(
                      'focus-ring flex h-11 items-center justify-center rounded-lg border text-[9px] font-bold transition-all active:scale-95',
                      cfg.distance === 0
                        ? 'border-indigo-400/60 bg-indigo-500/20 text-indigo-200'
                        : 'border-white/10 bg-zinc-800/60 text-zinc-400 hover:border-white/20'
                    )}
                  >
                    360°
                  </button>
                ) : (
                  <button
                    key={a}
                    onClick={() => patch({ angle: a, distance: cfg.distance === 0 ? 16 : cfg.distance })}
                    title={`${dirName(a)} (${a}°)`}
                    aria-pressed={nearPad(cfg.angle) && Math.abs(cfg.angle - a) < 1 && cfg.distance > 0}
                    className={clsx(
                      'focus-ring flex h-11 items-center justify-center rounded-lg border transition-all active:scale-95',
                      Math.abs(cfg.angle - a) < 1 && cfg.distance > 0
                        ? 'border-indigo-400/60 bg-indigo-500/20'
                        : 'border-white/10 bg-zinc-800/60 hover:border-white/20'
                    )}
                  >
                    <span
                      className="block h-2 w-2 rounded-full bg-current"
                      style={{
                        transform: `translate(${Math.cos((a * Math.PI) / 180) * 8}px, ${Math.sin((a * Math.PI) / 180) * 8}px)`,
                        color: Math.abs(cfg.angle - a) < 1 && cfg.distance > 0 ? '#a5b4fc' : undefined,
                      }}
                    />
                  </button>
                )
              )}
            </div>
          </div>

          <Slider label="Direction angle" value={cfg.angle} min={0} max={360} step={5} defaultVal={90} format={(v) => `${Math.round(v)}°`} onChange={(v) => patch({ angle: v })} />
          <Slider label="Distance (offset)" value={cfg.distance} min={0} max={120} step={1} defaultVal={16} format={(v) => `${Math.round(v)}px`} onChange={(v) => patch({ distance: v })} />
          <Slider label="Blur" value={cfg.blur} min={0} max={80} step={1} defaultVal={20} format={(v) => `${Math.round(v)}px`} onChange={(v) => patch({ blur: v })} />
          <Slider label="Spread (all sides)" value={cfg.spread} min={0} max={60} step={1} defaultVal={0} format={(v) => `${Math.round(v)}px`} onChange={(v) => patch({ spread: v })} />
          <Slider label="Opacity" value={cfg.opacity} min={0.05} max={1} step={0.05} defaultVal={0.55} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => patch({ opacity: v })} />

          <p className="text-[10px] leading-relaxed text-zinc-500">
            Renders the object&apos;s own silhouette (its crop shape included), recolored, blurred and thrown in any direction — or all 360° at once. Merges with border stacks into one layer. In gradient mode the gradient sweeps in the object&apos;s own space (it rotates with the object); the offset direction is screen-space.
          </p>

          <StickyBar>
            <div className="flex gap-2">
              <button
                onClick={() => applyShadowFx(cfg)}
                className="focus-ring flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-brand-gradient px-4 text-xs font-bold text-white transition-transform active:scale-[0.98]"
              >
                <FaCheck /> {isFx ? 'Update' : 'Apply'}
              </button>
              {isFx && (
                <button
                  onClick={removeShadowFx}
                  className="focus-ring flex min-h-11 items-center justify-center gap-2 rounded-lg border border-red-500/25 bg-red-500/10 px-4 text-xs font-bold text-red-400 hover:bg-red-500/20"
                >
                  <FaTrashCan /> Remove
                </button>
              )}
            </div>
          </StickyBar>
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Gradient stroke for the plain single border                         */
/* ------------------------------------------------------------------ */

const GradientStrokeSection: React.FC = () => {
  const { editorState, activeObj, updateStyle, setObjectGradientStroke, setObjectSolidStroke } = useEditor();
  // Live detection (structural, like the fill-mode detection above): a gradient
  // stroke is a Gradient instance, not a string. On shape-cropped objects the
  // single border is a one-ring contour stack — seed from the ring gradient.
  // `on` is DERIVED from the object (no mirrored state): picking a solid color
  // from the Single picker replaces the gradient and the toggle must follow.
  const rawStroke: any = (activeObj as any)?.stroke;
  const ringGrad: any = (activeObj as any)?.onyxRingCfg?.rings?.[0]?.gradient;
  const on = !!(
    (rawStroke && typeof rawStroke === 'object' && Array.isArray(rawStroke.colorStops)) ||
    ringGrad
  );
  const strokeIsRadial =
    ringGrad?.type === 'radial' || (on && !ringGrad && rawStroke?.type === 'radial');
  const [a, setA] = useState('#6366f1');
  const [b, setB] = useState('#22d3ee');
  const [angle, setAngle] = useState(90);
  const [radial, setRadial] = useState(strokeIsRadial);
  // Re-seed when the selection changes (same pattern as the border/shadow
  // builders) — otherwise the colors describe the PREVIOUS object.
  const [lastObj, setLastObj] = useState<fabric.Object | null | undefined>(activeObj);
  if (activeObj !== lastObj) {
    setLastObj(activeObj);
    setRadial(strokeIsRadial);
    // Seed the pickers from the object's ACTUAL gradient (plain stroke or ring
    // contour) — the first tweak must not jump from a stale color to the real one.
    if (ringGrad) {
      if (typeof ringGrad.a === 'string') setA(ringGrad.a);
      if (typeof ringGrad.b === 'string') setB(ringGrad.b);
      if (typeof ringGrad.angle === 'number') setAngle(ringGrad.angle);
    } else if (on && Array.isArray(rawStroke.colorStops)) {
      const c0 = rawStroke.colorStops[0]?.color;
      const c1 = rawStroke.colorStops[rawStroke.colorStops.length - 1]?.color;
      if (typeof c0 === 'string' && /^#/.test(c0)) setA(c0);
      if (typeof c1 === 'string' && /^#/.test(c1)) setB(c1);
    }
  }

  const applyGrad = (na: string, nb: string, nAngle: number, nRadial: boolean) => {
    // A stroke with width 0 renders NOTHING — seed a visible width so the
    // toggle never looks dead on a fresh object.
    if (!editorState.strokeW) updateStyle('strokeW', 3);
    // App angles are screen-space (0° = →); CSS 0° = up — convert before parsing.
    // Radial has no direction — center out.
    setObjectGradientStroke(
      nRadial
        ? `radial-gradient(circle, ${na}, ${nb})`
        : `linear-gradient(${(nAngle + 90) % 360}deg, ${na}, ${nb})`
    );
  };

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-800/40 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-zinc-200">Gradient border color</span>
        <button
          type="button"
          aria-pressed={on}
          onClick={() => {
            if (on) setObjectSolidStroke(editorState.strokeC || '#ffffff');
            else applyGrad(a, b, angle, radial);
          }}
          className={clsx(
            'focus-ring relative h-5 w-9 rounded-full transition-colors',
            on ? 'bg-indigo-500' : 'bg-zinc-700'
          )}
        >
          <span className={clsx('absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all', on ? 'left-[18px]' : 'left-0.5')} />
        </button>
      </div>
      {on && (
        <div className="mt-3 space-y-3">
          <div className="flex gap-2">
            <Chip active={!radial} onClick={() => { setRadial(false); applyGrad(a, b, angle, false); }} className="min-h-10 flex-1">Linear</Chip>
            <Chip active={radial} onClick={() => { setRadial(true); applyGrad(a, b, angle, true); }} className="min-h-10 flex-1">Radial</Chip>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{radial ? 'Center' : 'Start'}</Label>
              <ColorPicker selected={a} onChange={(c) => { setA(c); applyGrad(c, b, angle, radial); }} />
            </div>
            <div>
              <Label>{radial ? 'Edge' : 'End'}</Label>
              <ColorPicker selected={b} onChange={(c) => { setB(c); applyGrad(a, c, angle, radial); }} />
            </div>
          </div>
          {!radial && (
            <Slider
              label="Direction"
              value={angle}
              min={0}
              max={360}
              step={5}
              defaultVal={90}
              format={(v) => `${Math.round(v)}°`}
              onChange={(v) => setAngle(v)}
              // v, not the `angle` closure: a double-click reset fires onChange +
              // onCommit in the SAME tick — before the next render — so the
              // closure still holds the pre-reset angle and would write the OLD
              // gradient to the object.
              onCommit={(v) => applyGrad(a, b, v, false)}
            />
          )}
        </div>
      )}
    </div>
  );
};

const StylePanel: React.FC = () => {
  const {
    activeObj, editorState, subTool, setSubTool, updateStyle, commitHistory,
    setObjectGradientFill, setObjectImageFill, setObjectSolidFill, removeBorderStack,
  } = useEditor();
  const imgFillRef = useRef<HTMLInputElement>(null);
  /** Local width while the slider is HELD. The contour-border path rebuilds a
   *  ring group per change (async) and syncFromObject re-seeds editorState —
   *  without this the thumb would snap back a tick mid-drag. */
  const [localW, setLocalW] = useState<number | null>(null);
  // a vanished selection (delete/undo mid-drag) must not leak localW into the
  // NEXT object's slider — clear it as soon as nothing is selected (render-phase
  // tracker, same pattern as the builders)
  const [lastSelW, setLastSelW] = useState<fabric.Object | null | undefined>(activeObj);
  if (activeObj !== lastSelW) {
    setLastSelW(activeObj);
    if (!activeObj) setLocalW(null);
  }
  if (!activeObj) {
    return <p className="py-6 text-center text-xs text-zinc-500">Select an object to style it.</p>;
  }
  const isShape = ['rect', 'circle', 'triangle', 'polygon'].includes(activeObj.type || '');
  const isText = activeObj.type === 'i-text' || activeObj.type === 'text';
  const fillable = isShape || isText;
  // fabric v5: Gradient.type is 'linear'|'radial' and Pattern has NO type field —
  // detect by structure (colorStops / source+repeat) instead of a .type string.
  const rawFill: any = (activeObj as any).fill;
  const fillMode: 'solid' | 'gradient' | 'image' =
    rawFill && typeof rawFill === 'object'
      ? Array.isArray(rawFill.colorStops)
        ? 'gradient'
        : rawFill.source != null || rawFill.repeat != null
          ? 'image'
          : 'solid'
      : 'solid';
  /** Which fill section is shown: explicit chip choice wins, else the object's live fill */
  const shownFill: 'solid' | 'gradient' | 'image' =
    subTool === 'fill-gradient' ? 'gradient' : subTool === 'fill-image' ? 'image' : subTool === 'fill-solid' ? 'solid' : fillMode;

  /** Border mode: Single by default — a multi-ring object opens in Multi so
   *  its stack is immediately editable. Explicit chip choice wins per object. */
  const ringCount: number = (activeObj as any).onyxRingCfg?.count || 0;
  const isMultiRing = ringCount > 1;
  const borderMode: 'single' | 'multi' =
    subTool === 'border-multi' ? 'multi' : subTool === 'border-single' ? 'single' : isMultiRing ? 'multi' : 'single';

  const tabs = [
    ...(fillable ? [{ id: 'fill', label: 'Fill' }] : []),
    { id: 'border', label: 'Border' },
    { id: 'shadow', label: 'Shadow' },
    { id: 'opacity', label: 'Opacity' },
    ...(activeObj.type === 'rect' ? [{ id: 'radius', label: 'Radius' }] : []),
  ];
  // border-single / border-multi keep the BORDER tab active (they are mode
  // chips within it, not separate tabs)
  const tabFromSub = subTool?.startsWith('border-') ? 'border' : subTool;
  const activeTab = tabFromSub && tabs.some((t) => t.id === tabFromSub) ? tabFromSub : tabs[0].id;

  const onFillImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      if (url) setObjectImageFill(url);
    };
    reader.readAsDataURL(f);
    e.target.value = '';
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-1 overflow-x-auto border-b border-white/5 pb-2 hide-scroll">
        {tabs.map((t) => (
          <button
            key={t.id}
            // re-clicking the ACTIVE tab is a no-op — it used to reset subTool
            // and silently discard an explicit Single/Multi choice
            onClick={() => {
              if (activeTab !== t.id) setSubTool(t.id);
            }}
            className={clsx(
              'flex min-h-[38px] shrink-0 items-center rounded-lg px-3 text-[11px] font-bold uppercase tracking-wide transition-colors',
              activeTab === t.id
                ? 'bg-indigo-500/15 text-indigo-300'
                : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-300'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'fill' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {(['solid', 'gradient', 'image'] as const).map((m) => (
              <Chip key={m} active={shownFill === m} onClick={() => setSubTool(`fill-${m}`)} className="flex-1">
                {m === 'solid' ? 'Solid' : m === 'gradient' ? 'Gradient' : 'Image'}
              </Chip>
            ))}
          </div>
          {shownFill === 'gradient' && (
            <div>
              <Label>Gradient — up to 5 stops (tri-gradient+)</Label>
              <GradientPicker selected="" onChange={(g) => { setObjectGradientFill(g); commitHistory(); }} onCustomGradient={() => {}} />
            </div>
          )}
          {shownFill === 'image' && (
            <div className="space-y-2">
              <Label>Fill with an image (cover)</Label>
              <button
                onClick={() => imgFillRef.current?.click()}
                className="focus-ring flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-800/70 py-3 text-xs font-bold text-zinc-200 transition-colors hover:bg-zinc-800"
              >
                <FaUpload /> Upload fill image
              </button>
              <input type="file" accept="image/*" ref={imgFillRef} className="hidden" onChange={onFillImage} />
              <p className="text-[10px] text-zinc-500">The image is clipped to the shape and scales with it.</p>
            </div>
          )}
          {shownFill === 'solid' && (
            <div>
              <Label>Fill color</Label>
              <ColorPicker
                selected={editorState.fill}
                onChange={(c) => {
                  setObjectSolidFill(c);
                  updateStyle('fill', c);
                }}
              />
            </div>
          )}
        </div>
      )}

      {activeTab === 'border' && (
        <>
          {/* Single/Multi mode chips — SINGLE is the default. A ring-stack
              object opens straight into Multi so its borders are editable. */}
          <div className="flex gap-2">
            <Chip active={borderMode === 'single'} onClick={() => setSubTool('border-single')} className="flex-1">Single</Chip>
            <Chip active={borderMode === 'multi'} onClick={() => setSubTool('border-multi')} className="flex-1">Multi-border</Chip>
          </div>
          {borderMode === 'multi' ? (
            <BorderStackBuilder />
          ) : isMultiRing ? (
            /* Single controls on a multi-ring stack are a placebo at best (a
               group ignores strokeWidth) and destructive at worst (the contour
               path would flatten the stack) — point the user at Multi instead. */
            <div className="rounded-xl border border-white/10 bg-zinc-800/40 p-3 text-center">
              <p className="text-xs font-bold text-zinc-300">
                This object carries a <span className="text-indigo-300">{ringCount}-border</span> stack
              </p>
              <p className="mt-1 text-[10px] leading-relaxed text-zinc-500">
                Single-border controls do not apply to it. Edit the rings in Multi-border, or remove the stack first.
              </p>
              <div className="mt-3 flex gap-2">
                <Chip onClick={() => setSubTool('border-multi')} className="flex-1">Edit in Multi-border</Chip>
                <Chip onClick={removeBorderStack} className="flex-1">Remove borders</Chip>
              </div>
            </div>
          ) : (
            <>
              <Slider
                label="Width"
                value={localW ?? editorState.strokeW}
                min={0}
                max={40}
                step={1}
                defaultVal={0}
                onChange={(v) => {
                  setLocalW(v);
                  updateStyle('strokeW', v);
                }}
                onCommit={() => {
                  setLocalW(null);
                  commitHistory();
                }}
              />
              <div><Label>Color</Label><ColorPicker selected={editorState.strokeC} onChange={(c) => updateStyle('strokeC', c)} /></div>
              <GradientStrokeSection />
            </>
          )}
        </>
      )}
      {activeTab === 'shadow' && (
        <>
          <Slider label="Blur" value={editorState.shadowB} min={0} max={80} step={1} defaultVal={0} onChange={(v) => updateStyle('shadowB', v)} onCommit={commitHistory} />
          <Slider label="Offset" value={editorState.shadowO} min={0} max={80} step={1} defaultVal={10} onChange={(v) => updateStyle('shadowO', v)} onCommit={commitHistory} />
          <div><Label>Color</Label><ColorPicker selected={editorState.shadowC} onChange={(c) => updateStyle('shadowC', c)} /></div>
          <ShadowFxBuilder />
        </>
      )}
      {activeTab === 'opacity' && (
        <Slider label="Opacity" value={editorState.opacity} min={0.05} max={1} step={0.05} defaultVal={1} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => updateStyle('opacity', v)} onCommit={commitHistory} />
      )}
      {activeTab === 'radius' && (
        <Slider label="Corner radius" value={editorState.radius} min={0} max={200} step={1} defaultVal={0} onChange={(v) => updateStyle('radius', v)} onCommit={commitHistory} />
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Router                                                              */
/* ------------------------------------------------------------------ */

export const renderToolPanel = (menu: string): React.ReactNode => {
  switch (menu) {
    case 'ADD': return <AddPanel />;
    case 'DOCUMENT': return <DocumentPanel />;
    case 'BG': return <BgPanel />;
    case 'TEXT': return <TextPanel />;
    case 'SHAPE': return <ShapePanel />;
    case 'DRAW': return <DrawPanel />;
    case 'STICKER': return <StickerPanel />;
    case 'ADJUST': return <AdjustPanel />;
    case 'FILTER': return <FilterPanel />;
    case 'MASK': return <MaskPanel />;
    case 'MASK_EDIT': return <MaskEditPanel />;
    case 'ARRANGE': return <ArrangePanel />;
    case 'STYLE': return <StylePanel />;
    default: return null;
  }
};

export const PANEL_TITLES: Record<string, string> = {
  ADD: 'Add',
  DOCUMENT: 'Document',
  BG: 'Background',
  TEXT: 'Text',
  SHAPE: 'Shapes',
  DRAW: 'Draw',
  STICKER: 'Stickers',
  ADJUST: 'Adjust',
  FILTER: 'Filters',
  MASK: 'Mask',
  MASK_EDIT: 'Mask',
  ARRANGE: 'Arrange',
  STYLE: 'Style',
};
