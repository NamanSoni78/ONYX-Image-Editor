'use client';

import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { FaEye, FaEyeSlash, FaLock, FaUnlock, FaArrowUp, FaArrowDown, FaImage, FaFont, FaShapes, FaLayerGroup } from 'react-icons/fa6';
import { useEditor } from './EditorContext';

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

/** Shared layer list — used in the desktop properties panel and the mobile layers sheet */
export const LayersList: React.FC = () => {
  const {
    layers, activeObj, selectLayer, toggleLayerVisibility, reorderLayer, lockToggle,
    setLayerIndex, renameLayer,
  } = useEditor();

  if (layers.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <FaShapes className="text-2xl text-zinc-700" />
        <p className="text-xs text-zinc-500">No layers yet.<br />Add an image, text or shape.</p>
      </div>
    );
  }

  const activeLayer = layers.find((l) => l.obj === activeObj);

  return (
    <div className="space-y-1.5">
      {layers.map((l) => {
        const selected = activeObj === l.obj;
        const typeIcon =
          l.type === 'image' ? <FaImage size={11} /> :
          (l.type === 'i-text' || l.type === 'text') ? <FaFont size={11} /> :
          <FaShapes size={11} />;
        return (
          <div key={l.id}>
            <div
              onClick={() => selectLayer(l.obj)}
              className={clsx(
                'group flex cursor-pointer items-center gap-2.5 rounded-lg border p-2 transition-all',
                selected
                  ? 'border-indigo-400/50 bg-indigo-500/15'
                  : 'border-transparent bg-zinc-800/50 hover:border-white/10 hover:bg-zinc-800'
              )}
            >
              {/* thumbnail */}
              <div className="checkerboard flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/10">
                {l.thumb ? (
                  <img src={l.thumb} alt="" className="h-full w-full object-contain" />
                ) : (
                  <span className="text-zinc-600">{typeIcon}</span>
                )}
              </div>

              {/* name + type */}
              <div className="min-w-0 flex-1">
                <LayerName name={l.name} onCommit={(v) => renameLayer(l.obj, v)} />
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                  <span>{l.type}</span>
                  <span className="font-mono text-zinc-600">#{l.index}</span>
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
                <button onClick={() => reorderLayer(l.obj, 'up')} title="Bring forward" className="rounded p-1.5 text-zinc-500 transition-colors hover:text-white">
                  <FaArrowUp size={11} />
                </button>
                <button onClick={() => reorderLayer(l.obj, 'down')} title="Send backward" className="rounded p-1.5 text-zinc-500 transition-colors hover:text-white">
                  <FaArrowDown size={11} />
                </button>
              </div>
            </div>

            {/* position slider for the selected layer */}
            {selected && layers.length > 1 && (
              <div className="mb-1 mt-1 flex items-center gap-2 px-2">
                <FaLayerGroup size={10} className="shrink-0 text-indigo-300" />
                <input
                  type="range"
                  min={0}
                  max={layers.length - 1}
                  step={1}
                  value={l.index}
                  onChange={(e) => setLayerIndex(l.obj, parseInt(e.target.value), false)}
                  onPointerUp={(e) => setLayerIndex(l.obj, parseInt((e.target as HTMLInputElement).value), true)}
                  onKeyUp={(e) => setLayerIndex(l.obj, parseInt((e.target as HTMLInputElement).value), true)}
                  className="onyx-range h-1.5 flex-1"
                  aria-label="Layer position"
                />
                <span className="shrink-0 font-mono text-[10px] font-bold text-zinc-400">
                  {l.index + 1}/{layers.length}
                </span>
              </div>
            )}
          </div>
        );
      })}
      {activeLayer && layers.length > 1 && (
        <p className="pt-1 text-center text-[10px] text-zinc-600">Slide to move “{activeLayer.name}” through the stack</p>
      )}
    </div>
  );
};
