'use client';

import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FaXmark } from 'react-icons/fa6';
import clsx from 'clsx';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Max width class, e.g. 'max-w-md' */
  widthClass?: string;
  /** Hide the default header row (custom headers inside content) */
  hideHeader?: boolean;
}

/**
 * Responsive modal: bottom sheet on mobile, centered dialog on desktop.
 * Escape closes. Backdrop click closes.
 */
export const Modal: React.FC<ModalProps> = ({ open, onClose, title, subtitle, children, widthClass = 'max-w-md', hideHeader }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          role="dialog"
          aria-modal="true"
          aria-label={title || 'Dialog'}
          className="fixed inset-0 z-[110] flex items-end justify-center bg-black/70 backdrop-blur-sm md:items-center md:p-6"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ y: 60, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', damping: 30, stiffness: 380 }}
            className={clsx(
              'glass flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-white/10 shadow-2xl shadow-black/60 md:rounded-2xl',
              widthClass
            )}
          >
            {/* Drag handle (mobile affordance) */}
            <div className="flex justify-center pt-2.5 md:hidden">
              <div className="h-1 w-10 rounded-full bg-white/20" />
            </div>

            {!hideHeader && (
              <div className="flex items-start justify-between gap-4 px-5 pb-3 pt-4">
                <div className="min-w-0">
                  {title && <h2 className="truncate text-base font-bold text-white">{title}</h2>}
                  {subtitle && <p className="mt-0.5 text-xs text-zinc-400">{subtitle}</p>}
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="focus-ring shrink-0 rounded-lg p-2 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <FaXmark />
                </button>
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
