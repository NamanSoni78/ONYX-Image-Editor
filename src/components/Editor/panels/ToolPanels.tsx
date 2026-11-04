'use client';

import React, { useState } from 'react';
import clsx from 'clsx';
import {
  FaBold, FaItalic, FaUnderline, FaAlignLeft, FaAlignCenter, FaAlignRight,
  FaArrowUp, FaArrowDown, FaAnglesUp, FaAnglesDown, FaLock, FaUnlock,
  FaArrowsLeftRight, FaArrowsUpDown, FaArrowRotateLeft, FaArrowRotateRight,
  FaCheck, FaXmark, FaImage, FaPlus, FaCropSimple, FaEyeDropper,
  FaSquare, FaCircle, FaPlay, FaMagnifyingGlass, FaTrashCan, FaClone,
} from 'react-icons/fa6';
import { Slider } from '@/components/ui/Slider';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { GradientPicker } from '@/components/ui/GradientPicker';
import { useEditor } from '../EditorContext';
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
  return (
    <div className="space-y-5">
      <div>
        <Label>Canvas size</Label>
        <div className="flex items-center gap-2">
          <NumInput label="W" value={docSize.width} onCommit={(v) => setDocSize(v, docSize.height)} />
          <NumInput label="H" value={docSize.height} onCommit={(v) => setDocSize(docSize.width, v)} />
          <button
            onClick={zoomFit}
            title="Fit to screen"
            className="focus-ring rounded-md border border-white/10 bg-zinc-800/70 p-2 text-zinc-300 hover:bg-zinc-800"
          >
            <FaMagnifyingGlass size={12} />
          </button>
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
  const { docBg, setDocBackground, openBgPicker } = useEditor();
  return (
    <div className="space-y-5">
      <div>
        <Label>Type</Label>
        <div className="flex gap-2">
          <Chip active={docBg.kind === 'color'} onClick={() => setDocBackground({ kind: 'color', value: '#ffffff' })}>Color</Chip>
          <Chip active={docBg.kind === 'gradient'} onClick={() => setDocBackground({ kind: 'gradient', value: 'linear-gradient(to right, #6366f1, #a855f7)' })}>Gradient</Chip>
          <Chip active={docBg.kind === 'transparent'} onClick={() => setDocBackground({ kind: 'transparent' })}>Transparent</Chip>
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
          <Label>Gradient</Label>
          <GradientPicker selected={docBg.value} onChange={(g) => setDocBackground({ kind: 'gradient', value: g })} onCustomGradient={() => {}} />
        </div>
      )}
      {docBg.kind === 'transparent' && (
        <p className="rounded-lg border border-white/10 bg-zinc-800/40 px-3 py-2 text-[11px] text-zinc-400">
          Checkerboard = transparent. Export as <strong>PNG</strong> with “Transparent background” to keep it.
        </p>
      )}
      <div>
        <Label>Image background</Label>
        <button
          onClick={openBgPicker}
          className="focus-ring flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-800/70 py-3 text-xs font-bold text-zinc-200 transition-colors hover:bg-zinc-800"
        >
          <FaPlus /> Upload image (cover)
        </button>
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
  const { addShape } = useEditor();
  const items = [
    { key: 'rect' as const, icon: <FaSquare className="text-xl" />, label: 'Rect' },
    { key: 'circle' as const, icon: <FaCircle className="text-xl" />, label: 'Circle' },
    { key: 'tri' as const, icon: <FaPlay className="-rotate-90 text-xl" />, label: 'Triangle' },
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map((it) => (
        <button
          key={it.key}
          onClick={() => addShape(it.key)}
          className="focus-ring flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-zinc-800/60 py-4 text-zinc-300 transition-all hover:border-white/20 hover:bg-zinc-800 active:scale-95"
        >
          {it.icon}
          <span className="text-[10px] font-bold uppercase tracking-wide">{it.label}</span>
        </button>
      ))}
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
  if (!activeObj || activeObj.type !== 'image') {
    return <p className="py-6 text-center text-xs text-zinc-500">Select an image to adjust it.</p>;
  }
  return (
    <div className="space-y-4">
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
  if (!activeObj || activeObj.type !== 'image') {
    return <p className="py-6 text-center text-xs text-zinc-500">Select an image to apply filters.</p>;
  }
  return (
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
  );
};

const MaskPanel: React.FC = () => {
  const { activeObj, startMasking } = useEditor();
  if (!activeObj || activeObj.type !== 'image') {
    return <p className="py-6 text-center text-xs text-zinc-500">Select an image to mask it.</p>;
  }
  const shapes = [
    { key: 'rect' as const, label: 'Square', visual: <div className="h-7 w-7 rounded border-2 border-zinc-300" /> },
    { key: 'circle' as const, label: 'Circle', visual: <div className="h-7 w-7 rounded-full border-2 border-zinc-300" /> },
    { key: 'triangle' as const, label: 'Triangle', visual: <div className="h-0 w-0 border-b-[26px] border-l-[14px] border-r-[14px] border-b-zinc-300 border-l-transparent border-r-transparent" /> },
    { key: 'heart' as const, label: 'Heart', visual: <span className="text-2xl">❤️</span> },
    { key: 'star' as const, label: 'Star', visual: <span className="text-2xl">⭐</span> },
  ];
  return (
    <div className="grid grid-cols-5 gap-2">
      {shapes.map((s) => (
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

const StylePanel: React.FC = () => {
  const { activeObj, editorState, subTool, setSubTool, updateStyle, commitHistory } = useEditor();
  if (!activeObj) {
    return <p className="py-6 text-center text-xs text-zinc-500">Select an object to style it.</p>;
  }
  const isShape = ['rect', 'circle', 'triangle'].includes(activeObj.type || '');
  const isText = activeObj.type === 'i-text' || activeObj.type === 'text';
  const tabs = [
    ...((isShape || isText) ? [{ id: 'fill', label: 'Fill' }] : []),
    { id: 'border', label: 'Border' },
    { id: 'shadow', label: 'Shadow' },
    { id: 'opacity', label: 'Opacity' },
    ...(activeObj.type === 'rect' ? [{ id: 'radius', label: 'Radius' }] : []),
  ];
  const activeTab = subTool && tabs.some((t) => t.id === subTool) ? subTool : tabs[0].id;
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
        <div>
          <Label>Fill color</Label>
          <ColorPicker selected={editorState.fill} onChange={(c) => updateStyle('fill', c)} />
        </div>
      )}
      {activeTab === 'border' && (
        <>
          <Slider label="Width" value={editorState.strokeW} min={0} max={40} step={1} defaultVal={0} onChange={(v) => updateStyle('strokeW', v)} onCommit={commitHistory} />
          <div><Label>Color</Label><ColorPicker selected={editorState.strokeC} onChange={(c) => updateStyle('strokeC', c)} /></div>
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
  MASK: 'Mask',
  MASK_EDIT: 'Mask',
  ARRANGE: 'Arrange',
  STYLE: 'Style',
};
