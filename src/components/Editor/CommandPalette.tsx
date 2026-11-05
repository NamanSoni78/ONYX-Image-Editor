'use client';

import React, { useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import {
  FaFont, FaImage, FaShapes, FaWandMagicSparkles, FaDownload, FaArrowRotateLeft,
  FaArrowRotateRight, FaMagnifyingGlassPlus, FaMagnifyingGlassMinus, FaExpand,
  FaLayerGroup, FaCropSimple, FaClone, FaTrashCan, FaKeyboard, FaLeftRight,
  FaArrowsUpDown, FaPen, FaFaceSmile, FaSliders, FaPlus,
} from 'react-icons/fa6';
import { useEditor } from './EditorContext';
import { FILTER_PRESETS, DOC_PRESETS } from './constants';

interface Action {
  id: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  run: () => void;
}

/** Simple subsequence fuzzy match */
const fuzzy = (query: string, text: string): boolean => {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  let i = 0;
  for (const ch of t) {
    if (q[i] === ch) i++;
    if (i === q.length) return true;
  }
  return i === q.length;
};

export const CommandPalette: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const editor = useEditor();
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Adjust state during render: typing a new query resets the highlight.
  const [prevQuery, setPrevQuery] = useState(query);
  if (query !== prevQuery) {
    setPrevQuery(query);
    setIndex(0);
  }

  const actions: Action[] = useMemo(() => {
    const a: Action[] = [
      { id: 'add-image', label: 'Add image', hint: 'Upload / drop / paste', icon: <FaImage size={13} />, run: editor.openFilePicker },
      { id: 'add-text', label: 'Add text', icon: <FaFont size={13} />, run: editor.addText },
      { id: 'add-shape', label: 'Add shape', icon: <FaShapes size={13} />, run: () => editor.setMenu('SHAPE') },
      { id: 'add-sticker', label: 'Add sticker', icon: <FaFaceSmile size={13} />, run: () => editor.setMenu('STICKER') },
      { id: 'draw', label: 'Toggle draw mode', icon: <FaPen size={13} />, run: editor.toggleDraw },
      { id: 'adjust', label: 'Open adjustments', icon: <FaSliders size={13} />, run: () => editor.setMenu('ADJUST') },
      { id: 'filters', label: 'Open filters', icon: <FaWandMagicSparkles size={13} />, run: () => editor.setMenu('FILTER') },
      { id: 'crop', label: 'Crop image', icon: <FaCropSimple size={13} />, run: editor.startCrop },
      { id: 'layers', label: 'Open layers', icon: <FaLayerGroup size={13} />, run: () => editor.setMenu('LAYERS') },
      { id: 'document', label: 'Document settings', hint: 'Canvas size', icon: <FaPlus size={13} />, run: () => editor.setMenu('DOCUMENT') },
      { id: 'background', label: 'Canvas background', icon: <FaPlus size={13} />, run: () => editor.setMenu('BG') },
      { id: 'export', label: 'Export image', hint: 'Ctrl+S', icon: <FaDownload size={13} />, run: editor.openExport },
      { id: 'undo', label: 'Undo', icon: <FaArrowRotateLeft size={13} />, run: editor.undo },
      { id: 'redo', label: 'Redo', icon: <FaArrowRotateRight size={13} />, run: editor.redo },
      { id: 'duplicate', label: 'Duplicate selection', icon: <FaClone size={13} />, run: editor.duplicate },
      { id: 'delete', label: 'Delete selection', icon: <FaTrashCan size={13} />, run: editor.deleteSelected },
      { id: 'flip-h', label: 'Flip horizontally', icon: <FaLeftRight size={13} />, run: () => editor.flip('X') },
      { id: 'flip-v', label: 'Flip vertically', icon: <FaArrowsUpDown size={13} />, run: () => editor.flip('Y') },
      { id: 'zoom-in', label: 'Zoom in', icon: <FaMagnifyingGlassPlus size={13} />, run: editor.zoomIn },
      { id: 'zoom-out', label: 'Zoom out', icon: <FaMagnifyingGlassMinus size={13} />, run: editor.zoomOut },
      { id: 'zoom-fit', label: 'Fit to screen', icon: <FaExpand size={13} />, run: editor.zoomFit },
      { id: 'zoom-100', label: 'Zoom 100%', icon: <FaExpand size={13} />, run: editor.zoom100 },
      { id: 'shortcuts', label: 'Keyboard shortcuts', hint: '?', icon: <FaKeyboard size={13} />, run: editor.openShortcuts },
      ...FILTER_PRESETS.filter((f) => f.name !== 'None').map((f) => ({
        id: `filter-${f.name}`,
        label: `Filter: ${f.name}`,
        icon: <FaWandMagicSparkles size={13} />,
        run: () => editor.applyFilterPreset(f.name),
      })),
      ...DOC_PRESETS.map((p) => ({
        id: `size-${p.id}`,
        label: `Canvas: ${p.label}`,
        hint: p.sub,
        icon: <FaPlus size={13} />,
        run: () => editor.setDocSize(p.width, p.height),
      })),
    ];
    return a;
  }, [editor]);

  const filtered = useMemo(() => {
    if (!query.trim()) return actions.slice(0, 9);
    return actions.filter((a) => fuzzy(query, `${a.label} ${a.hint || ''}`)).slice(0, 9);
  }, [actions, query]);

  if (!open) return null;

  const runAt = (i: number) => {
    const a = filtered[i];
    if (!a) return;
    a.run();
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      className="fixed inset-0 z-[115] flex items-start justify-center bg-black/70 p-4 pt-[12vh] backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="glass w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-black/60"
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setIndex((i) => Math.min(i + 1, filtered.length - 1));
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            setIndex((i) => Math.max(i - 1, 0));
          }
          if (e.key === 'Enter') {
            e.preventDefault();
            runAt(index);
          }
          if (e.key === 'Escape') onClose();
        }}
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-4">
          <span className="text-zinc-500">&#8984;</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command... try 'filter', 'story', 'export'"
            className="h-12 flex-1 bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
            autoFocus
          />
          <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">esc</kbd>
        </div>

        <div ref={listRef} className="max-h-[46vh] overflow-y-auto p-2">
          {filtered.length === 0 && (
            <p className="py-8 text-center text-xs text-zinc-500">No matching commands</p>
          )}
          {filtered.map((a, i) => (
            <button
              key={a.id}
              onMouseEnter={() => setIndex(i)}
              onClick={() => runAt(i)}
              className={clsx(
                'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                i === index ? 'bg-indigo-500/20 text-white' : 'text-zinc-300 hover:bg-white/5'
              )}
            >
              <span className={clsx('flex h-7 w-7 items-center justify-center rounded-lg', i === index ? 'bg-indigo-500/30 text-indigo-200' : 'bg-zinc-800 text-zinc-400')}>
                {a.icon}
              </span>
              <span className="flex-1 text-sm font-semibold">{a.label}</span>
              {a.hint && <span className="font-mono text-[10px] text-zinc-500">{a.hint}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
