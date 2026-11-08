'use client';

import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { FaArrowRotateLeft, FaArrowRotateRight, FaBars, FaDownload, FaHouse, FaBolt, FaCircleCheck, FaSpinner } from 'react-icons/fa6';
import { Tooltip } from '@/components/ui/Tooltip';
import { useEditor } from './EditorContext';

export const TopBar: React.FC = () => {
  const {
    projectName, renameProject, undo, redo, canUndo, canRedo, openExport,
    saveState, isMobile, zoom, zoomFit, openPalette, openDashboardSidebar, goHome,
  } = useEditor();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(projectName);
  const inputRef = useRef<HTMLInputElement>(null);

  // Adjust-state-during-render: keep the draft in sync with external renames
  // (autosave naming, command palette) without an effect-driven setState.
  const [prevName, setPrevName] = useState(projectName);
  if (projectName !== prevName) {
    setPrevName(projectName);
    if (!editing) setDraft(projectName);
  }

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commit = () => {
    setEditing(false);
    if (draft.trim() && draft.trim() !== projectName) renameProject(draft);
    else setDraft(projectName);
  };

  return (
    <header className="glass safe-area-pt z-30 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-white/10 px-2 sm:h-12 sm:px-3">
      {/* Left cluster */}
      <div className="flex min-w-0 items-center gap-1.5">
        {isMobile ? (
          <button
            onClick={openDashboardSidebar}
            aria-label="Menu"
            className="focus-ring flex h-11 w-11 items-center justify-center rounded-lg text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <FaBars />
          </button>
        ) : (
          <Tooltip label="Back to dashboard" side="bottom">
            <button
              onClick={goHome}
              aria-label="Home"
              className="focus-ring rounded-lg p-2.5 text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <FaHouse size={15} />
            </button>
          </Tooltip>
        )}
        <span className="text-brand-gradient hidden text-sm font-black tracking-[0.18em] sm:block">ONYX</span>
      </div>

      {/* Center: project name + save state */}
      <div className="flex min-w-0 flex-1 flex-col items-center">
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') {
                setDraft(projectName);
                setEditing(false);
              }
            }}
            className="focus-ring w-56 max-w-full rounded-md border border-indigo-400/50 bg-zinc-800 px-2 py-1 text-center text-xs font-bold text-white outline-none"
            maxLength={60}
            autoFocus
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            title="Click to rename"
            className="focus-ring max-w-[220px] truncate rounded-md px-2 py-1 text-xs font-bold text-zinc-200 transition-colors hover:bg-white/5 sm:max-w-[320px]"
          >
            {projectName}
          </button>
        )}
        <span className="flex items-center gap-1 text-[10px] font-medium text-zinc-500">
          {saveState === 'saving' && (<><FaSpinner className="animate-spin" size={8} /> Saving…</>)}
          {saveState === 'saved' && (<><FaCircleCheck size={8} className="text-emerald-500" /> Saved</>)}
          {saveState === 'scratch' && 'Not saved yet — autosaves on first edit'}
        </span>
      </div>

      {/* Right cluster */}
      <div className="flex items-center gap-0.5 sm:gap-1">
        {!isMobile && (
          <>
            <button
              onClick={zoomFit}
              className="focus-ring rounded-lg px-2 py-1.5 font-mono text-[11px] font-bold text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
              title="Click to fit (0)"
            >
              {Math.round(zoom * 100)}%
            </button>
            <Tooltip label="Command palette" shortcut="Ctrl+K" side="bottom">
              <button
                onClick={openPalette}
                aria-label="Command palette"
                className="focus-ring rounded-lg p-2.5 text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                <FaBolt size={14} />
              </button>
            </Tooltip>
          </>
        )}
        <Tooltip label="Undo" shortcut="Ctrl+Z" side="bottom">
          <button
            onClick={undo}
            disabled={!canUndo}
            aria-label="Undo"
            className={clsx(
              'focus-ring flex h-11 w-11 items-center justify-center rounded-lg transition-colors sm:h-auto sm:w-auto sm:p-2.5',
              canUndo ? 'text-zinc-300 hover:bg-white/10 hover:text-white' : 'cursor-not-allowed text-zinc-700'
            )}
          >
            <FaArrowRotateLeft size={14} />
          </button>
        </Tooltip>
        <Tooltip label="Redo" shortcut="Ctrl+Shift+Z" side="bottom">
          <button
            onClick={redo}
            disabled={!canRedo}
            aria-label="Redo"
            className={clsx(
              'focus-ring flex h-11 w-11 items-center justify-center rounded-lg transition-colors sm:h-auto sm:w-auto sm:p-2.5',
              canRedo ? 'text-zinc-300 hover:bg-white/10 hover:text-white' : 'cursor-not-allowed text-zinc-700'
            )}
          >
            <FaArrowRotateRight size={14} />
          </button>
        </Tooltip>
        <button
          onClick={openExport}
          className="focus-ring ml-1 flex h-11 items-center gap-2 rounded-full bg-brand-gradient px-4 text-xs font-bold text-white shadow-lg shadow-indigo-950/40 transition-transform active:scale-95"
        >
          <FaDownload size={12} /> Export
        </button>
      </div>
    </header>
  );
};
