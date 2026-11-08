'use client';

import React from 'react';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FaPlus, FaFont, FaShapes, FaPen, FaFaceSmile, FaLayerGroup, FaCropSimple,
  FaSliders, FaWandMagicSparkles, FaPalette, FaTrashCan, FaArrowDownUpAcrossLine,
  FaArrowLeft, FaClone, FaClapperboard, FaMask,
  FaArrowsLeftRight, FaArrowsUpDown, FaArrowRotateLeft, FaArrowRotateRight,
} from 'react-icons/fa6';
import { useEditor, MenuTab } from './EditorContext';

/** Toolbar icon button (module-level so it never re-mounts) */
const Btn: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
}> = ({ icon, label, onClick, active, danger }) => (
  <button
    onClick={onClick}
    className="flex w-[62px] shrink-0 flex-col items-center gap-1 rounded-xl py-1.5 transition-transform active:scale-90"
    aria-label={label}
  >
    <span
      className={clsx(
        'flex h-10 w-10 items-center justify-center rounded-xl text-lg transition-colors',
        active
          ? 'bg-indigo-500/25 text-indigo-300'
          : danger
            ? 'bg-red-500/10 text-red-400'
            : 'bg-zinc-800/60 text-zinc-300'
      )}
    >
      {icon}
    </span>
    <span className={clsx('text-[9px] font-bold uppercase tracking-wide', active ? 'text-indigo-300' : 'text-zinc-500')}>
      {label}
    </span>
  </button>
);

/** Compact quick-action pill for the selection bar */
const Quick: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}> = ({ icon, label, onClick, danger }) => (
  <button
    onClick={onClick}
    aria-label={label}
    className="flex h-12 w-[60px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border border-white/10 bg-zinc-800/80 text-zinc-200 transition-all active:scale-90 active:bg-zinc-700"
  >
    <span className={clsx('text-sm leading-none', danger && 'text-red-400')}>{icon}</span>
    <span className={clsx('text-[8px] font-bold uppercase tracking-wide', danger ? 'text-red-400' : 'text-zinc-400')}>{label}</span>
  </button>
);

const Divider: React.FC = () => <span className="mx-1 h-9 w-px shrink-0 bg-white/10" />;

/**
 * Mobile bottom toolbar — CONTEXTUAL, like PicsArt/Canva:
 *
 *  • nothing selected  → creation tools (Add, Text, Shape, Draw, Sticker, …)
 *  • object selected   → editing tools FIRST (Adjust, Filter, Style, Mask,
 *                        Crop, Arrange), creation tools still reachable after
 *  • sheet open        → Done + live tool switching without closing the sheet
 *
 * The sheet header (CanvasEditor's MobileSheet) owns expand/collapse; this
 * toolbar owns the ONLY Done button, so there are never two.
 */
export const MobileToolbar: React.FC = () => {
  const {
    menu, setMenu, setSubTool, activeObj, addText, toggleDraw, startCrop, isDrawing,
    duplicate, deleteSelected, finishMasking, flip, rotate90,
  } = useEditor();

  const isText = activeObj?.type === 'i-text' || activeObj?.type === 'text';
  const hasObj = !!activeObj;
  // must mirror CanvasEditor's sheetOpen exactly — every menu that opens the
  // mobile sheet needs a Done affordance here (the sheet header has none)
  const sheetOpen = menu !== 'HOME' && menu !== 'EXPORT';
  const m: string = menu; // widen for TS-friendly comparisons below

  /** switch to a tool panel; leaving MASK_EDIT mid-flow must clean up */
  const open = (tab: MenuTab) => {
    if (menu === 'MASK_EDIT') finishMasking(false);
    setSubTool(null);
    setMenu(tab);
  };

  const done = () => {
    // Leaving MASK_EDIT must clean up the temp shape + unlock the target image
    if (menu === 'MASK_EDIT') finishMasking(false);
    else {
      // Leaving the DRAW sheet must disarm the brush — or every canvas drag
      // paints an unintended stroke after the sheet is gone.
      if (menu === 'DRAW' && isDrawing) toggleDraw();
      setMenu('HOME');
      setSubTool(null);
    }
  };

  // Fullscreen crop — close whatever sheet is open first so the user returns
  // to a clean canvas afterwards. (MASK_EDIT implies sheetOpen.)
  const cropNow = () => {
    if (sheetOpen) done();
    startCrop();
  };

  /* Editing tools that work on the current selection (switch the live sheet) */
  const editTools = (
    <>
      <Btn icon={<FaSliders />} label="Adjust" onClick={() => open('ADJUST')} active={m === 'ADJUST'} />
      <Btn icon={<FaWandMagicSparkles />} label="Filter" onClick={() => open('FILTER')} active={m === 'FILTER'} />
      <Btn icon={<FaPalette />} label="Style" onClick={() => open('STYLE')} active={m === 'STYLE'} />
      <Btn icon={<FaMask />} label="Mask" onClick={() => open('MASK')} active={m === 'MASK'} />
      <Btn icon={<FaCropSimple />} label="Crop" onClick={cropNow} />
      <Btn icon={<FaArrowDownUpAcrossLine />} label="Arrange" onClick={() => open('ARRANGE')} active={m === 'ARRANGE'} />
    </>
  );

  return (
    <div className="glass z-30 shrink-0 border-t border-white/10 safe-area-pb">
      {/* Selection quick-bar: fast transforms while an object is selected.
          Slides in with a spring — no layout jump, feels native. */}
      <AnimatePresence initial={false}>
        {hasObj && !sheetOpen && (
          <motion.div
            key="selbar"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 32, stiffness: 380 }}
            className="overflow-hidden"
          >
            <div className="mask-fade-x flex items-center gap-1 overflow-x-auto px-2.5 pt-2 hide-scroll">
              <Quick icon={<FaClone />} label="Copy" onClick={duplicate} />
              <Quick icon={<FaArrowsLeftRight />} label="Flip ↔" onClick={() => flip('X')} />
              <Quick icon={<FaArrowsUpDown />} label="Flip ↕" onClick={() => flip('Y')} />
              <Quick icon={<FaArrowRotateLeft />} label="−90°" onClick={() => rotate90(-1)} />
              <Quick icon={<FaArrowRotateRight />} label="+90°" onClick={() => rotate90(1)} />
              <Quick icon={<FaTrashCan />} label="Delete" onClick={deleteSelected} danger />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mask-fade-x flex items-center gap-0.5 overflow-x-auto px-2 py-1.5 hide-scroll">
        {sheetOpen ? (
          <>
            <Btn icon={<FaArrowLeft />} label="Done" onClick={done} active />
            {/* Live tool switching while the sheet is open — no close/reopen
                round-trips. (Not during MASK_EDIT: its temp shape must not be
                abandoned by a tool switch.) */}
            {hasObj && m !== 'MASK_EDIT' && (
              <>
                <Divider />
                {editTools}
              </>
            )}
          </>
        ) : hasObj ? (
          <>
            {/* Contextual editing tools FIRST — the whole point */}
            {editTools}
            <Divider />
            <Btn icon={<FaPlus />} label="Add" onClick={() => open('ADD')} active={m === 'ADD'} />
            <Btn
              icon={<FaFont />}
              label={isText ? 'Text' : 'Add text'}
              onClick={() => {
                // with a text selected → format it; otherwise create a new one
                if (isText) open('TEXT');
                else addText();
              }}
              active={m === 'TEXT'}
            />
            <Btn icon={<FaShapes />} label="Shape" onClick={() => open('SHAPE')} active={m === 'SHAPE'} />
            <Btn icon={<FaPen />} label="Draw" onClick={toggleDraw} active={isDrawing} />
            <Btn icon={<FaFaceSmile />} label="Sticker" onClick={() => open('STICKER')} active={m === 'STICKER'} />
            <Btn icon={<FaLayerGroup />} label="Layers" onClick={() => open('LAYERS')} active={m === 'LAYERS'} />
            <Btn icon={<FaClapperboard />} label="Doc" onClick={() => open('DOCUMENT')} active={m === 'DOCUMENT'} />
            <Btn icon={<FaPalette />} label="Bg" onClick={() => open('BG')} active={m === 'BG'} />
          </>
        ) : (
          <>
            <Btn icon={<FaPlus />} label="Add" onClick={() => open('ADD')} active={m === 'ADD'} />
            <Btn
              icon={<FaFont />}
              label={isText ? 'Text' : 'Add text'}
              onClick={() => {
                if (isText) open('TEXT');
                else addText();
              }}
              active={m === 'TEXT'}
            />
            <Btn icon={<FaShapes />} label="Shape" onClick={() => open('SHAPE')} active={m === 'SHAPE'} />
            <Btn icon={<FaPen />} label="Draw" onClick={toggleDraw} active={isDrawing} />
            <Btn icon={<FaFaceSmile />} label="Sticker" onClick={() => open('STICKER')} active={m === 'STICKER'} />
            <Btn icon={<FaLayerGroup />} label="Layers" onClick={() => open('LAYERS')} active={m === 'LAYERS'} />
            <Btn icon={<FaClapperboard />} label="Doc" onClick={() => open('DOCUMENT')} active={m === 'DOCUMENT'} />
            <Btn icon={<FaPalette />} label="Bg" onClick={() => open('BG')} active={m === 'BG'} />
          </>
        )}
      </div>
    </div>
  );
};
