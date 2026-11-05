'use client';

import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { FaEye, FaEyeSlash, FaLock, FaUnlock, FaImage, FaFont, FaShapes, FaGripLines } from 'react-icons/fa6';
import { useEditor } from './EditorContext';

const clampN = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Inline layer-name editor (double-click the name) */
const LayerName: React.FC<{ name: string; onCommit: (v: string) => void }> = ({ name, onCommit }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const ref = useRef<HTMLInputElement>(null);

  // Adjust-state-during-render: keep the draft in sync with external renames
  // without an effect-driven setState.
  const [prevName, setPrevName] = useState(name);
  if (name !== prevName) {
    setPrevName(name);
    if (!editing) setDraft(name);
  }

  useEffect(() => {
    if (editing) ref.current?.select();
  }, [editing]);

  if (editing) {
    return (
      <input
        ref={ref}
        value={draft}
        maxLength={40}
        autoFocus
        onChange={(e) => setDraft(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        onBlur={() => {
          setEditing(false);
          if (draft.trim() && draft.trim() !== name) onCommit(draft);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'Escape') {
            setDraft(name);
            setEditing(false);
          }
        }}
        className="focus-ring w-full rounded-md border border-indigo-400/50 bg-zinc-900 px-1.5 py-0.5 text-xs font-bold text-white outline-none"
      />
    );
  }
  return (
    <span
      onDoubleClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
      title="Double-click to rename"
      className="block truncate text-xs font-bold text-zinc-200"
    >
      {name}
    </span>
  );
};

interface DragState {
  id: string;
  fromIdx: number;
  curIdx: number;
  startY: number;
  rowH: number;
}

/** Shared layer list — Canva-style drag-to-reorder (used on desktop + mobile) */
export const LayersList: React.FC = () => {
  const {
    layers, activeObj, selectLayer, toggleLayerVisibility, lockToggle, reorderLayer, setLayerIndex, renameLayer,
  } = useEditor();

  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  useEffect(() => {
    dragRef.current = drag;
  }, [drag]);

  if (layers.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <FaShapes className="text-2xl text-zinc-700" />
        <p className="text-xs text-zinc-500">No layers yet.<br />Add an image, text or shape.</p>
      </div>
    );
  }

  /* ---------- drag-to-reorder (pointer based, touch friendly) ---------- */
  const onHandleDown = (e: React.PointerEvent, idx: number, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const row = (e.currentTarget as HTMLElement).closest('[data-row]') as HTMLElement | null;
    const rowH = (row?.offsetHeight ?? 56) + 6; // + space-y-1.5 gap
    const d = { id, fromIdx: idx, curIdx: idx, startY: e.clientY, rowH };
    dragRef.current = d;
    setDrag(d);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onHandleMove = (e: React.PointerEvent) => {
    const d = drag ?? dragRef.current;
    if (!d) return;
    const step = Math.round((e.clientY - d.startY) / d.rowH);
    const cur = clampN(d.fromIdx + step, 0, layers.length - 1);
    if (cur !== d.curIdx) {
      const nd = { ...d, curIdx: cur };
      dragRef.current = nd;
      setDrag(nd);
    }
  };
  const onHandleUp = () => {
    const d = drag ?? dragRef.current;
    dragRef.current = null;
    setDrag(null);
    if (!d || d.curIdx === d.fromIdx) return;
    const fromNow = layers.findIndex((l) => l.id === d.id);
    if (fromNow < 0) return;
    // The list is top-first; the stack index is bottom-first (0 = bottom)
    const stackIdx = layers.length - 1 - clampN(d.curIdx, 0, layers.length - 1);
    setLayerIndex(layers[fromNow].obj, stackIdx, true);
  };

  /** Visual offset while dragging: the dragged row follows the pointer, the
   *  rows it passes slide out of the way (Canva-style live preview). */
  const offsetFor = (idx: number): number => {
    if (!drag) return 0;
    const { fromIdx, curIdx, rowH } = drag;
    if (idx === fromIdx) return (curIdx - fromIdx) * rowH;
    if (fromIdx < curIdx) return idx > fromIdx && idx <= curIdx ? -rowH : 0;
    if (fromIdx > curIdx) return idx >= curIdx && idx < fromIdx ? rowH : 0;
    return 0;
  };

  return (
    <div className="space-y-1.5 select-none">
      {layers.map((l, i) => {
        const selected = activeObj === l.obj;
        const dragging = drag?.id === l.id;
        const typeIcon =
          l.type === 'image' ? <FaImage size={11} /> :
          (l.type === 'i-text' || l.type === 'text') ? <FaFont size={11} /> :
          <FaShapes size={11} />;
        return (
          <div
            key={l.id}
            data-row
            onClick={() => selectLayer(l.obj)}
            className={clsx(
              'group relative flex cursor-pointer items-center gap-2 rounded-lg border p-2 transition-colors',
              selected
                ? 'border-indigo-400/50 bg-indigo-500/15'
                : 'border-transparent bg-zinc-800/50 hover:border-white/10 hover:bg-zinc-800'
            )}
            style={{
              transform: drag ? `translateY(${offsetFor(i)}px)` : undefined,
              transition: drag && dragging ? 'none' : 'transform 150ms ease, border-color 150ms, background-color 150ms',
              zIndex: dragging ? 10 : undefined,
              boxShadow: dragging ? '0 8px 24px rgba(0,0,0,0.45)' : undefined,
            }}
          >
            {/* drag handle — pinch & slide the row, exactly like Canva.
                Keyboard: Enter selects, ↑/↓ moves the layer through the stack. */}
            <button
              onPointerDown={(e) => onHandleDown(e, i, l.id)}
              onPointerMove={onHandleMove}
              onPointerUp={onHandleUp}
              onPointerCancel={onHandleUp}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  selectLayer(l.obj);
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  reorderLayer(l.obj, 'up');
                } else if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  reorderLayer(l.obj, 'down');
                }
              }}
              aria-label={`Reorder layer ${l.name}. Use arrow keys to move up or down.`}
              title="Drag up or down to reorder (or focus + arrow keys)"
              className={clsx(
                '-ml-1 flex h-8 w-5 shrink-0 cursor-grab items-center justify-center rounded text-zinc-600 transition-colors hover:text-zinc-200 active:cursor-grabbing',
                dragging && 'text-indigo-300'
              )}
              style={{ touchAction: 'none' }}
            >
              <FaGripLines size={12} />
            </button>

            {/* thumbnail */}
            <div className="checkerboard flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/10">
              {l.thumb ? (
                <img src={l.thumb} alt="" className="h-full w-full object-contain" draggable={false} />
              ) : (
                <span className="text-zinc-600">{typeIcon}</span>
              )}
            </div>

            {/* name + type */}
            <div className="min-w-0 flex-1">
              <LayerName name={l.name} onCommit={(v) => renameLayer(l.obj, v)} />
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                <span>{l.type}</span>
                <span className="font-mono text-zinc-600">#{l.index + 1}</span>
              </div>
            </div>

            {/* actions */}
            <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => toggleLayerVisibility(l.obj)}
                title={l.visible ? 'Hide' : 'Show'}
                className={clsx('rounded p-1.5 transition-colors', l.visible ? 'text-zinc-500 hover:text-white' : 'text-amber-400')}
              >
                {l.visible ? <FaEye size={11} /> : <FaEyeSlash size={11} />}
              </button>
              <button
                onClick={() => {
                  selectLayer(l.obj);
                  setTimeout(lockToggle, 0);
                }}
                title={l.locked ? 'Unlock' : 'Lock'}
                className={clsx('rounded p-1.5 transition-colors', l.locked ? 'text-amber-400' : 'text-zinc-500 hover:text-white')}
              >
                {l.locked ? <FaLock size={11} /> : <FaUnlock size={11} />}
              </button>
            </div>
          </div>
        );
      })}
      {layers.length > 1 && (
        <p className="pt-1 text-center text-[10px] text-zinc-600">
          Drag <FaGripLines size={8} className="inline" /> to reorder — the top row renders in front
        </p>
      )}
    </div>
  );
};
