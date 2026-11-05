'use client';

import React, { useState } from 'react';
import clsx from 'clsx';
import { FaChevronDown } from 'react-icons/fa6';
import { useEditor, MenuTab } from './EditorContext';
import { renderToolPanel, PANEL_TITLES } from './panels/ToolPanels';
import { LayersList } from './LayersPanel';

/**
 * Desktop right panel: contextual tool tabs + tool content + collapsible layers.
 * The tab chips adapt to the current selection (image / text / shape / none).
 */
export const PropertiesPanel: React.FC = () => {
  const { menu, setMenu, activeObj, setSubTool } = useEditor();
  const [layersOpen, setLayersOpen] = useState(true);

  const isImage = activeObj?.type === 'image';
  const isText = activeObj?.type === 'i-text' || activeObj?.type === 'text';

  /* Which tabs make sense right now — Adjust/Filters/Mask work on ANY object
     (shapes & text rasterize on first use), matching the mobile toolbar. */
  let tabs: { id: MenuTab; label: string }[];
  if (isImage) {
    tabs = [
      { id: 'ADJUST', label: 'Adjust' },
      { id: 'FILTER', label: 'Filters' },
      { id: 'MASK', label: 'Mask' },
      { id: 'STYLE', label: 'Style' },
      { id: 'ARRANGE', label: 'Arrange' },
    ];
  } else if (isText) {
    tabs = [
      { id: 'TEXT', label: 'Text' },
      { id: 'ADJUST', label: 'Adjust' },
      { id: 'FILTER', label: 'Filters' },
      { id: 'MASK', label: 'Mask' },
      { id: 'STYLE', label: 'Style' },
      { id: 'ARRANGE', label: 'Arrange' },
    ];
  } else if (activeObj) {
    tabs = [
      { id: 'ADJUST', label: 'Adjust' },
      { id: 'FILTER', label: 'Filters' },
      { id: 'MASK', label: 'Mask' },
      { id: 'STYLE', label: 'Style' },
      { id: 'ARRANGE', label: 'Arrange' },
    ];
  } else {
    tabs = [
      { id: 'DOCUMENT', label: 'Document' },
      { id: 'BG', label: 'Background' },
    ];
  }

  const panelVisible = menu !== 'HOME' && menu !== 'EXPORT';
  const activeTab = tabs.find((t) => t.id === menu);
  const showPanel = panelVisible && (activeTab || ['ADD', 'SHAPE', 'DRAW', 'STICKER', 'MASK_EDIT', 'TEXT', 'DOCUMENT', 'BG'].includes(menu));

  return (
    <aside className="glass z-20 flex w-[300px] shrink-0 flex-col border-l border-white/10">
      {/* Tab chips (always visible — also lets users open tools without the rail) */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-white/5 px-3 py-2.5 hide-scroll">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setMenu(t.id);
              setSubTool(null);
            }}
            className={clsx(
              'shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-all',
              menu === t.id
                ? 'bg-indigo-500/20 text-indigo-200'
                : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-200'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tool content */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {showPanel ? (
          <>
            <h3 className="mb-4 text-xs font-black uppercase tracking-[0.14em] text-zinc-400">
              {PANEL_TITLES[menu] || ''}
            </h3>
            {renderToolPanel(menu)}
          </>
        ) : menu === 'LAYERS' ? (
          <>
            <h3 className="mb-4 text-xs font-black uppercase tracking-[0.14em] text-zinc-400">Layers</h3>
            <LayersList />
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-zinc-800/60 text-xl">🎨</div>
            <p className="max-w-[200px] text-xs leading-relaxed text-zinc-500">
              Select an object to edit its properties, or use the left rail to add content.
            </p>
            <p className="text-[10px] text-zinc-600">Tip: press <kbd className="rounded border border-white/15 bg-white/5 px-1 font-mono">?</kbd> for shortcuts</p>
          </div>
        )}
      </div>

      {/* Layers (collapsible) */}
      <div className={clsx('border-t border-white/10 transition-all', layersOpen ? 'h-[240px]' : 'h-[44px]')}>
        <button
          onClick={() => setLayersOpen((o) => !o)}
          className="flex w-full items-center justify-between px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-zinc-400 transition-colors hover:text-zinc-200"
        >
          Layers
          <FaChevronDown size={12} className={clsx('transition-transform', !layersOpen && '-rotate-90')} />
        </button>
        {layersOpen && (
          <div className="h-[190px] overflow-y-auto px-3 pb-3">
            <LayersList />
          </div>
        )}
      </div>
    </aside>
  );
};
