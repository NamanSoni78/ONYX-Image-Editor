'use client';

import React, { useRef, useState } from 'react';
import clsx from 'clsx';
import {
  FaBold, FaItalic, FaUnderline, FaAlignLeft, FaAlignCenter, FaAlignRight,
  FaArrowUp, FaArrowDown, FaAnglesUp, FaAnglesDown, FaLock, FaUnlock,
  FaArrowsLeftRight, FaArrowsUpDown, FaArrowRotateLeft, FaArrowRotateRight,
  FaCheck, FaXmark, FaImage, FaPlus, FaCropSimple, FaEyeDropper,
  FaSquare, FaCircle, FaPlay, FaMagnifyingGlass, FaTrashCan, FaClone,
  FaLockOpen, FaUpload, FaLayerGroup,
} from 'react-icons/fa6';
import { Slider } from '@/components/ui/Slider';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { GradientPicker } from '@/components/ui/GradientPicker';
import { useEditor, BorderStackConfig, CropShapeSpec, MAX_BORDERS } from '../EditorContext';
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
    className={clsx(
      'focus-ring rounded-lg border px-3 py-2 text-xs font-bold transition-all active:scale-95',
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
        className="focus-ring w-full rounded-md border border-white/10 bg-zinc-800/70 px-2 py-1.5 font-mono text-xs text-zinc-100 outline-none focus:border-indigo-400/50"
      />
    </label>
  );
};

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
  if (!activeObj) {
    return <p className="py-6 text-center text-xs text-zinc-500">Select an object to adjust it.</p>;
  }
  const isVector = activeObj.type !== 'image';
  return (
    <div className="space-y-4">
      {isVector && (
        <p className="rounded-lg border border-indigo-400/25 bg-indigo-500/10 px-2.5 py-2 text-[10px] leading-relaxed text-indigo-200">
          Shapes & text are rasterized on the first adjustment — undo restores the vector original.
        </p>
      )}
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
          className="focus-ring flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/10 bg-zinc-800/70 py-2.5 text-xs font-bold text-zinc-200 transition-colors hover:bg-zinc-800"
        >
          <FaEyeDropper /> Hold to compare
        </button>
        <button
          onClick={startCrop}
          className="focus-ring flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/10 bg-zinc-800/70 py-2.5 text-xs font-bold text-zinc-200 transition-colors hover:bg-zinc-800"
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
            <ColorPicker selected={editorState.removeColorHex} onChange={(c) => setRemoveColor(c, editorState.removeColorDist)} />
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
  const { activeObj, startMasking, applyShapeCrop } = useEditor();
  const [mode, setMode] = useState<'mask' | 'crop'>('mask');
  const [sides, setSides] = useState(6);
  if (!activeObj) {
    return <p className="py-6 text-center text-xs text-zinc-500">Select an object to mask or crop it.</p>;
  }
  if ((activeObj as any).type === 'activeSelection') {
    return <p className="py-6 text-center text-xs text-zinc-500">Select a single object to mask or crop it.</p>;
  }
  const maskShapes = [
    { key: 'rect' as const, label: 'Square', visual: <div className="h-7 w-7 rounded border-2 border-zinc-300" /> },
    { key: 'circle' as const, label: 'Circle', visual: <div className="h-7 w-7 rounded-full border-2 border-zinc-300" /> },
    { key: 'triangle' as const, label: 'Triangle', visual: <div className="h-0 w-0 border-b-[26px] border-l-[14px] border-r-[14px] border-b-zinc-300 border-l-transparent border-r-transparent" /> },
    { key: 'heart' as const, label: 'Heart', visual: <span className="text-2xl">❤️</span> },
    { key: 'star' as const, label: 'Star', visual: <span className="text-2xl">⭐</span> },
  ];
  const cropShapes: { key: CropShapeSpec['shape']; label: string; visual: React.ReactNode }[] = [
    { key: 'circle', label: 'Circle', visual: <div className="h-7 w-7 rounded-full border-2 border-zinc-300" /> },
    { key: 'square', label: 'Square', visual: <div className="h-7 w-7 rounded border-2 border-zinc-300" /> },
    { key: 'rounded', label: 'Round', visual: <div className="h-7 w-7 rounded-lg border-2 border-zinc-300" /> },
    { key: 'triangle', label: 'Triangle', visual: <div className="h-0 w-0 border-b-[26px] border-l-[14px] border-r-[14px] border-b-zinc-300 border-l-transparent border-r-transparent" /> },
    { key: 'star', label: 'Star', visual: <span className="text-2xl">⭐</span> },
    { key: 'heart', label: 'Heart', visual: <span className="text-2xl">❤️</span> },
    { key: 'hexagon', label: 'Hex', visual: <span className="text-2xl">⬡</span> },
    { key: 'pentagon', label: 'Penta', visual: <span className="text-2xl">⬠</span> },
    { key: 'diamond', label: 'Diamond', visual: <div className="h-6 w-6 rotate-45 border-2 border-zinc-300" /> },
    { key: 'polygon', label: `${sides}-gon`, visual: <span className="text-xs font-black text-zinc-300">{sides}</span> },
  ];
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Chip active={mode === 'mask'} onClick={() => setMode('mask')} className="flex-1">Mask · reversible</Chip>
        <Chip active={mode === 'crop'} onClick={() => setMode('crop')} className="flex-1">Crop · real cut</Chip>
      </div>
      <p className="text-[10px] leading-relaxed text-zinc-500">
        {mode === 'mask'
          ? 'Mask clips the object to the shape — non-destructive, editable afterwards.'
          : 'Crop truly cuts the object into the shape — borders added after the crop follow the cropped outline.'}
      </p>
      {mode === 'mask' ? (
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
      ) : (
        <>
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-800/40 p-2.5">
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Polygon sides</span>
            <button onClick={() => setSides((s) => Math.max(3, s - 1))} className="focus-ring h-7 w-7 rounded-lg border border-white/10 bg-zinc-800/70 text-sm font-bold text-zinc-200 active:scale-90">−</button>
            <span className="w-7 text-center font-mono text-xs font-bold text-zinc-100">{sides}</span>
            <button onClick={() => setSides((s) => Math.min(20, s + 1))} className="focus-ring h-7 w-7 rounded-lg border border-white/10 bg-zinc-800/70 text-sm font-bold text-zinc-200 active:scale-90">+</button>
            <span className="ml-auto text-[10px] text-zinc-600">3–20</span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {cropShapes.map((s) => (
              <button
                key={s.key}
                onClick={() => applyShapeCrop({ shape: s.key, sides })}
                className="focus-ring flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-zinc-800/60 py-3 transition-all hover:border-white/20 hover:bg-zinc-800 active:scale-95"
              >
                {s.visual}
                <span className="text-[9px] font-bold uppercase text-zinc-400">{s.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
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

const BorderStackBuilder: React.FC = () => {
  const { activeObj, applyBorderStack, removeBorderStack } = useEditor();
  const isRingGroup = activeObj?.type === 'group' && !!(activeObj as any).onyxRing;
  const seed: BorderStackConfig = isRingGroup ? (activeObj as any).onyxRingCfg : DEFAULT_BORDER_CFG;
  const [cfg, setCfg] = useState<BorderStackConfig>({ ...seed });
  // Re-seed when a DIFFERENT ring group is selected — otherwise "Update" would
  // apply the previous object's config. Plain objects keep the current tweaks.
  const [lastObj, setLastObj] = useState<fabric.Object | undefined | null>(activeObj);
  if (activeObj !== lastObj) {
    setLastObj(activeObj);
    if (activeObj?.type === 'group' && (activeObj as any).onyxRing) {
      setCfg({ ...(activeObj as any).onyxRingCfg });
    }
  }
  const [open, setOpen] = useState(false);

  const patch = (p: Partial<BorderStackConfig>) => setCfg((c) => ({ ...c, ...p }));
  const patchRing = (i: number, p: Partial<{ width: number; color: string }>) =>
    setCfg((c) => {
      const rings = [...(c.rings || [])];
      while (rings.length < c.count) rings.push({ width: 6, color: '#ffffff' });
      rings[i] = { ...rings[i], ...p };
      return { ...c, rings };
    });

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-800/40 p-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="focus-ring flex w-full items-center justify-between text-left"
      >
        <span className="flex items-center gap-2 text-xs font-bold text-zinc-200">
          <FaLayerGroup size={11} className="text-indigo-300" />
          Border stack {isRingGroup && <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[9px] font-bold text-indigo-300">editing</span>}
        </span>
        <span className="text-[10px] font-bold text-zinc-500">{open ? 'hide ▲' : 'multi-border ▼'}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-4">
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <Slider
                label="Borders"
                value={Math.min(cfg.count, 24)}
                min={1}
                max={24}
                step={1}
                defaultVal={3}
                format={() => String(Math.round(cfg.count))}
                onChange={(v) => patch({ count: Math.round(v) })}
              />
            </div>
            <NumInput
              label="N"
              value={cfg.count}
              onCommit={(v) =>
                patch({ count: Math.max(1, Math.min(cfg.mode === 'custom' ? 64 : MAX_BORDERS, Math.round(v) || 1)) })
              }
            />
          </div>
          <p className="text-[10px] text-zinc-500">
            Up to {cfg.mode === 'custom' ? 64 : MAX_BORDERS} borders — drag the slider or type an exact count.
          </p>
          <div className="flex gap-2">
            <Chip active={cfg.mode === 'gradient'} onClick={() => patch({ mode: 'gradient' })}>Gradient ramp</Chip>
            <Chip active={cfg.mode === 'custom'} onClick={() => patch({ mode: 'custom', count: Math.min(cfg.count, 64) })}>Per-border</Chip>
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
            <div className="space-y-2">
              <Label>Each border</Label>
              {Array.from({ length: Math.min(Math.round(cfg.count), 64) }).map((_, i) => {
                const ring = cfg.rings?.[i] || { width: 6, color: '#ffffff' };
                return (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-4 text-[10px] font-bold text-zinc-500">{i + 1}</span>
                    <input
                      type="color"
                      value={ring.color}
                      onChange={(e) => patchRing(i, { color: e.target.value })}
                      className="h-7 w-9 cursor-pointer rounded-md border border-white/10 bg-transparent p-0.5"
                    />
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={Math.round(ring.width)}
                      onChange={(e) => patchRing(i, { width: Math.max(1, parseInt(e.target.value) || 1) })}
                      className="focus-ring w-16 rounded-md border border-white/10 bg-zinc-800/70 px-2 py-1 font-mono text-[11px] text-zinc-100 outline-none focus:border-indigo-400/50"
                    />
                    <span className="text-[10px] text-zinc-500">px</span>
                  </div>
                );
              })}
            </div>
          )}

          <Slider label="Gap between borders" value={cfg.gap} min={0} max={24} step={1} defaultVal={4} format={(v) => `${Math.round(v)}px`} onChange={(v) => patch({ gap: v })} />

          <div className="flex gap-2">
            <button
              onClick={() => applyBorderStack(cfg)}
              className="focus-ring flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-gradient py-2.5 text-xs font-bold text-white transition-transform active:scale-[0.98]"
            >
              <FaCheck /> {isRingGroup ? 'Update' : 'Apply'}
            </button>
            {isRingGroup && (
              <button
                onClick={removeBorderStack}
                className="focus-ring flex items-center justify-center gap-2 rounded-lg border border-red-500/25 bg-red-500/10 px-3.5 py-2.5 text-xs font-bold text-red-400 hover:bg-red-500/20"
              >
                <FaTrashCan /> Remove
              </button>
            )}
          </div>
          <p className="text-[10px] leading-relaxed text-zinc-500">
            Borders wrap the object as one layer (following its shape — or its crop shape) — remove them anytime to edit the original.
          </p>
        </div>
      )}
    </div>
  );
};

const StylePanel: React.FC = () => {
  const {
    activeObj, editorState, subTool, setSubTool, updateStyle, commitHistory,
    setObjectGradientFill, setObjectImageFill, setObjectSolidFill,
  } = useEditor();
  const imgFillRef = useRef<HTMLInputElement>(null);
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

  const tabs = [
    ...(fillable ? [{ id: 'fill', label: 'Fill' }] : []),
    { id: 'border', label: 'Border' },
    { id: 'shadow', label: 'Shadow' },
    { id: 'opacity', label: 'Opacity' },
    ...(activeObj.type === 'rect' ? [{ id: 'radius', label: 'Radius' }] : []),
  ];
  const activeTab = subTool && tabs.some((t) => t.id === subTool) ? subTool : tabs[0].id;

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
            onClick={() => setSubTool(t.id)}
            className={clsx(
              'shrink-0 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide transition-colors',
              activeTab === t.id ? 'text-indigo-300' : 'text-zinc-500 hover:text-zinc-300'
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
          <Slider label="Width" value={editorState.strokeW} min={0} max={40} step={1} defaultVal={0} onChange={(v) => updateStyle('strokeW', v)} onCommit={commitHistory} />
          <div><Label>Color</Label><ColorPicker selected={editorState.strokeC} onChange={(c) => updateStyle('strokeC', c)} /></div>
          <BorderStackBuilder />
        </>
      )}
      {activeTab === 'shadow' && (
        <>
          <Slider label="Blur" value={editorState.shadowB} min={0} max={80} step={1} defaultVal={0} onChange={(v) => updateStyle('shadowB', v)} onCommit={commitHistory} />
          <Slider label="Offset" value={editorState.shadowO} min={0} max={80} step={1} defaultVal={10} onChange={(v) => updateStyle('shadowO', v)} onCommit={commitHistory} />
          <div><Label>Color</Label><ColorPicker selected={editorState.shadowC} onChange={(c) => updateStyle('shadowC', c)} /></div>
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
  MASK: 'Mask & crop',
  MASK_EDIT: 'Mask',
  ARRANGE: 'Arrange',
  STYLE: 'Style',
};
