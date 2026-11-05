'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FaPlus, FaXmark, FaImage, FaHouse, FaTrash } from 'react-icons/fa6';
import { getAllProjects, deleteProject } from '@/lib/storage';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentProjectId?: string;
}

interface Project {
  id: string;
  name: string;
  thumbnail?: string;
  lastModified: number;
}

/** Projects drawer (mobile editor + shared look) */
export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, currentProjectId }) => {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [confirmDel, setConfirmDel] = useState<Project | null>(null);

  async function loadProjects() {
    const list = await getAllProjects();
    setProjects(list.reverse().slice(0, 30));
  }

  useEffect(() => {
    // Reload list each time the drawer opens (setState after await — intentional).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isOpen) loadProjects();
  }, [isOpen]);

  const handleDelete = async (id: string) => {
    await deleteProject(id);
    setConfirmDel(null);
    if (id === currentProjectId) {
      onClose();
      router.push('/');
    } else loadProjects();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 340 }}
            className="fixed bottom-0 left-0 top-0 z-50 flex w-80 max-w-[85vw] flex-col border-r border-white/10 bg-onyx-900"
          >
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <span className="text-brand-gradient text-sm font-black tracking-[0.18em]">ONYX</span>
              <button onClick={onClose} aria-label="Close" className="focus-ring rounded-full p-2 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white">
                <FaXmark />
              </button>
            </div>

            <div className="space-y-2 p-4">
              <Link
                href="/editor"
                onClick={() => {
                  // /editor → /editor on a scratch canvas is a no-op soft nav —
                  // hard-navigate so the canvas is truly fresh.
                  if (window.location.pathname === '/editor' && !currentProjectId) {
                    window.location.href = '/editor';
                  }
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-gradient py-3 text-sm font-bold text-white shadow-lg shadow-indigo-950/40 transition-transform active:scale-[0.98]"
              >
                <FaPlus /> New Project
              </Link>
              <Link
                href="/"
                onClick={onClose}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-800/70 py-3 text-sm font-bold text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
              >
                <FaHouse /> Back to Home
              </Link>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <h4 className="mb-3 text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500">Your Projects</h4>
              <div className="space-y-2">
                {projects.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      router.push(`/editor?project=${p.id}`);
                      onClose();
                    }}
                    className={`group flex cursor-pointer items-center gap-3 rounded-xl border p-2.5 transition-all ${
                      currentProjectId === p.id
                        ? 'border-indigo-400/50 bg-indigo-500/15'
                        : 'border-transparent hover:border-white/10 hover:bg-zinc-800/60'
                    }`}
                  >
                    <div className="checkerboard flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10">
                      {p.thumbnail ? (
                        <img src={p.thumbnail} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <FaImage className="text-zinc-600" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-bold text-zinc-200">{p.name}</div>
                      <div className="text-[10px] text-zinc-500">
                        {new Date(p.lastModified).toLocaleDateString()} ·{' '}
                        {new Date(p.lastModified).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDel(p);
                      }}
                      aria-label={`Delete ${p.name}`}
                      className="touch-visible rounded-lg p-2 text-zinc-600 opacity-0 transition-all hover:text-red-400 group-hover:opacity-100"
                    >
                      <FaTrash size={12} />
                    </button>
                  </div>
                ))}
                {projects.length === 0 && (
                  <p className="py-8 text-center text-xs text-zinc-600">No saved projects yet.</p>
                )}
              </div>
            </div>
          </motion.div>

          {/* Delete confirm (replaces the native confirm() dialog) */}
          {confirmDel && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              role="dialog"
              aria-modal="true"
              aria-label="Delete project"
              onClick={() => setConfirmDel(null)}
              className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            >
              <div
                className="glass w-full max-w-sm rounded-2xl border border-white/10 p-5 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-base font-bold text-white">Delete project?</h3>
                <p className="mt-1 text-sm text-zinc-400">
                  “{confirmDel.name}” will be removed from this browser. This cannot be undone.
                </p>
                <div className="mt-5 flex gap-2">
                  <button
                    onClick={() => setConfirmDel(null)}
                    className="focus-ring flex-1 rounded-xl border border-white/10 bg-zinc-800/70 py-3 text-sm font-bold text-zinc-200 hover:bg-zinc-800"
                  >
                    Keep it
                  </button>
                  <button
                    onClick={() => void handleDelete(confirmDel.id)}
                    className="focus-ring flex-1 rounded-xl border border-red-500/30 bg-red-500/15 py-3 text-sm font-bold text-red-300 hover:bg-red-500/25"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
  );
};
