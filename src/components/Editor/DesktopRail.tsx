'use client';

import React from 'react';
import clsx from 'clsx';
import {
  FaArrowPointer, FaImage, FaFont, FaShapes, FaPen, FaFaceSmile, FaCropSimple,
  FaMask, FaSliders, FaWandMagicSparkles, FaPalette, FaLayerGroup,
  FaArrowDownUpAcrossLine, FaKeyboard, FaBolt, FaClapperboard, FaSquarePlus,
} from 'react-icons/fa6';
import { Tooltip } from '@/components/ui/Tooltip';
import { useEditor, MenuTab } from './EditorContext';

interface RailTool {
  id: string;
  label: string;
  shortcut?: string;
  icon: React.ReactNode;
  needsImage?: boolean;
  needsObject?: boolean;
  onClick?: () => void;
}

export const DesktopRail: React.FC = () => {
  const { menu, setMenu, activeObj, addText, toggleDraw, startCrop, openShortcuts, openPalette } = useEditor();

  const isImage = activeObj?.type === 'image';
  const hasObj = !!activeObj;

  const tools: RailTool[] = [
    { id: 'SELECT', label: 'Select', shortcut: 'V', icon: <FaArrowPointer size={16} /> },
    { id: 'ADD', label: 'Add image / layer', shortcut: 'I', icon: <FaImage size={16} /> },
    { id: 'TEXT', label: 'Add text', shortcut: 'T', icon: <FaFont size={16} />, onClick: addText },
    { id: 'SHAPE', label: 'Shapes', shortcut: 'S', icon: <FaShapes size={16} /> },
    { id: 'DRAW', label: 'Draw', shortcut: 'B', icon: <FaPen size={16} />, onClick: toggleDraw },
    { id: 'STICKER', label: 'Stickers', shortcut: 'E', icon: <FaFaceSmile size={16} /> },
    { id: 'CROP', label: 'Crop — rectangle + shapes', shortcut: 'C', icon: <FaCropSimple size={16} />, needsObject: true, onClick: startCrop },
    { id: 'MASK', label: 'Mask', shortcut: 'M', icon: <FaMask size={16} />, needsObject: true },
    { id: 'ADJUST', label: 'Adjustments', shortcut: 'A', icon: <FaSliders size={16} />, needsObject: true },
    { id: 'FILTER', label: 'Filters', shortcut: 'F', icon: <FaWandMagicSparkles size={16} />, needsObject: true },
    { id: 'STYLE', label: 'Style', icon: <FaPalette size={16} />, needsObject: true },
    { id: 'ARRANGE', label: 'Arrange & align', shortcut: 'R', icon: <FaArrowDownUpAcrossLine size={16} />, needsObject: true },
    { id: 'LAYERS', label: 'Layers', shortcut: 'L', icon: <FaLayerGroup size={16} /> },
    { id: 'DOCUMENT', label: 'Document size & aspect', icon: <FaClapperboard size={16} /> },
    { id: 'BG', label: 'Background', shortcut: 'G', icon: <FaSquarePlus size={16} /> },
  ];

  return (
    <nav className="glass z-20 flex w-14 shrink-0 flex-col items-center gap-1 border-r border-white/10 py-3">
      {tools.map((t) => {
        const disabled = (t.needsImage && !isImage) || (t.needsObject && !hasObj);
        // SELECT maps to HOME (matches the V key); CROP never changes the menu
        const active = t.id === 'SELECT' ? menu === 'HOME' : menu === t.id;
        const btn = (
          <button
            key={t.id}
            disabled={disabled}
            onClick={() => {
              t.onClick?.();
              if (t.id === 'SELECT') setMenu('HOME');
              else if (!t.onClick) setMenu(t.id as MenuTab);
              else if (t.id !== 'DRAW' && t.id !== 'CROP') setMenu(t.id as MenuTab);
            }}
            aria-label={t.label}
            className={clsx(
              'focus-ring relative flex h-10 w-10 items-center justify-center rounded-xl transition-all',
              active
                ? 'bg-indigo-500/20 text-indigo-300 shadow-inner'
                : disabled
                  ? 'cursor-not-allowed text-zinc-700'
                  : 'text-zinc-400 hover:bg-white/10 hover:text-zinc-100 active:scale-95',
              t.id === 'DRAW' && menu === 'DRAW' && 'bg-indigo-500/20 text-indigo-300'
            )}
          >
            {t.icon}
            {active && <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-indigo-400" />}
          </button>
        );
        return (
          <Tooltip key={t.id} label={t.label} shortcut={t.shortcut} side="right">
            {btn}
          </Tooltip>
        );
      })}

      <div className="mt-auto flex flex-col items-center gap-1">
        <Tooltip label="Command palette" shortcut="Ctrl+K" side="right">
          <button
            onClick={openPalette}
            aria-label="Command palette"
            className="focus-ring flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-100"
          >
            <FaBolt size={14} />
          </button>
        </Tooltip>
        <Tooltip label="Shortcuts" shortcut="?" side="right">
          <button
            onClick={openShortcuts}
            aria-label="Keyboard shortcuts"
            className="focus-ring flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-100"
          >
            <FaKeyboard size={15} />
          </button>
        </Tooltip>
      </div>
    </nav>
  );
};
