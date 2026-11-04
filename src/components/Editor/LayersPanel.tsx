'use client';

import React from 'react';
import clsx from 'clsx';
import { FaEye, FaEyeSlash, FaLock, FaUnlock, FaArrowUp, FaArrowDown, FaImage, FaFont, FaShapes } from 'react-icons/fa6';
import { useEditor } from './EditorContext';

/** Shared layer list — used in the desktop properties panel and the mobile layers sheet */
export const LayersList: React.FC = () => {
  const { layers, activeObj, selectLayer, toggleLayerVisibility, reorderLayer, lockToggle } = useEditor();

  if (layers.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <FaShapes className="text-2xl text-zinc-700" />
        <p className="text-xs text-zinc-500">No layers yet.<br />Add an image, text or shape.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {layers.map((l) => {
        const selected = activeObj === l.obj;
        const typeIcon =
          l.type === 'image' ? <FaImage size={11} /> :
          (l.type === 'i-text' || l.type === 'text') ? <FaFont size={11} /> :
          <FaShapes size={11} />;
        return (
          <div
            key={l.id}
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

            {/* name */}
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-bold text-zinc-200">{l.name}</div>
              <div className="text-[10px] text-zinc-500">{l.type}</div>
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
        );
      })}
    </div>
  );
};
