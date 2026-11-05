'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FaCircleCheck, FaCircleExclamation, FaCircleInfo, FaTriangleExclamation } from 'react-icons/fa6';

export type ToastKind = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastAPI {
  toast: (message: string, kind?: ToastKind) => void;
}

const ToastCtx = createContext<ToastAPI>({ toast: () => {} });

/** Hook — call from any component under <ToastProvider> */
export const useToast = () => useContext(ToastCtx);

let toastId = 0;

const ICONS: Record<ToastKind, React.ReactNode> = {
  success: <FaCircleCheck className="text-emerald-400" />,
  error: <FaCircleExclamation className="text-red-400" />,
  warning: <FaTriangleExclamation className="text-amber-400" />,
  info: <FaCircleInfo className="text-indigo-400" />,
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = ++toastId;
    setItems((prev) => [...prev.slice(-3), { id, kind, message }]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 2600);
  }, []);

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      {/* Toast viewport: bottom-center on mobile (above toolbar), bottom-right on desktop */}
      <div className="pointer-events-none fixed left-1/2 bottom-28 z-[120] flex w-full max-w-sm -translate-x-1/2 flex-col items-center gap-2 px-4 md:bottom-6 md:left-auto md:right-6 md:translate-x-0 md:items-end">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.97 }}
              transition={{ type: 'spring', damping: 28, stiffness: 400 }}
              className="glass pointer-events-auto flex w-full items-center gap-3 rounded-xl border border-white/10 px-4 py-3 shadow-2xl shadow-black/50"
            >
              <span className="text-base leading-none">{ICONS[t.kind]}</span>
              <span className="text-sm font-medium text-zinc-100">{t.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
};
