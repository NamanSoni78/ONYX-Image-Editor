'use client';

import React from 'react';
import clsx from 'clsx';
import {
  FaPlus, FaFont, FaShapes, FaPen, FaFaceSmile, FaLayerGroup, FaCropSimple,
  FaSliders, FaWandMagicSparkles, FaPalette, FaTrashCan, FaArrowDownUpAcrossLine,
  FaArrowLeft, FaClone, FaClapperboard, FaMask,
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

/**
 * Mobile bottom toolbar: primary tools, horizontally scrollable with fade mask.
 * Object-specific tools appear contextually when something is selected.
 */
export const MobileToolbar: React.FC = () => {
  const { menu, setMenu, setSubTool, activeObj, addText, toggleDraw, startCrop, isDrawing, duplicate, deleteSelected, finishMasking } = useEditor();

  const isImage = activeObj?.type === 'image';
  const isText = activeObj?.type === 'i-text' || activeObj?.type === 'text';
  const hasObj = !!activeObj;
  const sheetOpen = menu !== 'HOME' && menu !== 'EXPORT' && menu !== 'LAYERS';
  const m: string = menu; // widen for TS-friendly comparisons below

  const open = (tab: MenuTab) => {
    setSubTool(null);
    setMenu(tab);
  };

  const done = () => {
    // Leaving MASK_EDIT must clean up the temp shape + unlock the target image
    if (menu === 'MASK_EDIT') finishMasking(false);
    else {
      setMenu('HOME');
      setSubTool(null);
    }
  };

  return (
    <div className="glass z-30 shrink-0 border-t border-white/10 safe-area-pb">
      {/* Sheet handle row */}
      {sheetOpen && (
        <div className="flex items-center justify-between px-4 pb-0.5 pt-2">
          <div className="h-1 w-10 rounded-full bg-white/20" />
          <button
            onClick={done}
            className="flex items-center gap-1.5 rounded-full bg-zinc-800/80 px-3 py-1.5 text-[11px] font-bold text-zinc-300"
          >
            <FaArrowLeft size={10} /> Done
          </button>
        </div>
      )}

      <div className="mask-fade-x flex items-center gap-0.5 overflow-x-auto px-2 py-1.5 hide-scroll">
        {sheetOpen ? (
          <Btn icon={<FaArrowLeft />} label="Done" onClick={done} active />
        ) : (
          <>
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

            {isImage && (
              <>
                <span className="mx-1 h-9 w-px shrink-0 bg-white/10" />
                <Btn icon={<FaCropSimple />} label="Crop" onClick={startCrop} />
                <Btn icon={<FaMask />} label="Mask" onClick={() => open('MASK')} active={m === 'MASK'} />
                <Btn icon={<FaSliders />} label="Adjust" onClick={() => open('ADJUST')} active={m === 'ADJUST'} />
                <Btn icon={<FaWandMagicSparkles />} label="Filter" onClick={() => open('FILTER')} active={m === 'FILTER'} />
              </>
            )}

            {hasObj && (
              <>
                <span className="mx-1 h-9 w-px shrink-0 bg-white/10" />
                <Btn icon={<FaPalette />} label="Style" onClick={() => open('STYLE')} active={m === 'STYLE'} />
                <Btn icon={<FaArrowDownUpAcrossLine />} label="Arrange" onClick={() => open('ARRANGE')} active={m === 'ARRANGE'} />
                <Btn icon={<FaClone />} label="Clone" onClick={duplicate} />
                <Btn icon={<FaTrashCan />} label="Delete" onClick={deleteSelected} danger />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};
