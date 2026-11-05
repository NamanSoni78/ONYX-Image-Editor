'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { SHORTCUTS } from './constants';

export const ShortcutsModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const groups = Array.from(new Set(SHORTCUTS.map((s) => s.group)));

  return (
    <Modal open={open} onClose={onClose} title="Keyboard shortcuts" subtitle="Work fast like a pro" widthClass="max-w-lg">
      <div className="grid gap-6 sm:grid-cols-2">
        {groups.map((g) => (
          <div key={g}>
            <h4 className="mb-2.5 text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500">{g}</h4>
            <div className="space-y-1.5">
              {SHORTCUTS.filter((s) => s.group === g).map((s) => (
                <div key={s.keys} className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 odd:bg-white/[0.03]">
                  <span className="text-xs text-zinc-300">{s.action}</span>
                  <kbd className="shrink-0 rounded-md border border-white/15 bg-white/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-zinc-200">
                    {s.keys}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-5 border-t border-white/5 pt-4 text-center text-[11px] text-zinc-500">
        On mobile: pinch to zoom, two fingers to pan, double-tap text to edit.
      </p>
    </Modal>
  );
};
