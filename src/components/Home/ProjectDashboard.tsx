'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  FaPlus, FaImage, FaTrash, FaPen, FaDownload, FaFileImport, FaChevronDown,
} from 'react-icons/fa6';
import {
  createProject, getAllProjects, deleteProject, renameProject, importProject, getProject,
} from '@/lib/storage';
import { DOC_PRESETS } from '@/components/Editor/constants';

interface Project {
  id: string;
  name: string;
  thumbnail?: string;
  lastModified: number;
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}

export default function ProjectDashboard() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // inline rename
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  // delete confirm
  const [confirmDel, setConfirmDel] = useState<Project | null>(null);

  // new project preset dropdown
  const [presetOpen, setPresetOpen] = useState(false);

  // import failure banner (replaces the native alert())
  const [importError, setImportError] = useState(false);

  async function loadProjects() {
    const list = await getAllProjects();
    setProjects(list.reverse());
    setLoading(false);
  }

  useEffect(() => {
    // Data fetch on mount — setState happens after an await, which the
    // compiler rule cannot prove; the pattern is intentional here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProjects();
  }, []);

  const startScratch = (preset?: string) => {
    router.push(preset ? `/editor?preset=${preset}` : '/editor');
  };

  const handleNewSaved = async () => {
    const id = await createProject();
    router.push(`/editor?project=${id}`);
  };

  const commitRename = async (id: string) => {
    const name = draft.trim();
    setRenaming(null);
    if (name) {
      await renameProject(id, name);
      loadProjects();
    }
  };

  const handleExport = async (e: React.MouseEvent, p: Project) => {
    e.stopPropagation();
    const project = await getProject(p.id);
    if (project) {
      const dataStr = JSON.stringify(project);
      const link = document.createElement('a');
      link.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      link.download = `${p.name.replace(/[^a-z0-9]+/gi, '-')}.onyx`;
      link.click();
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const id = await importProject(file);
    if (id) router.push(`/editor?project=${id}`);
    else {
      setImportError(true);
      setTimeout(() => setImportError(false), 4000);
    }
    e.target.value = '';
  };

  return (
    <section id="projects" className="mx-auto w-full max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-400">Your studio</p>
          <h2 className="text-2xl font-bold md:text-3xl">Recent projects</h2>
          <p className="text-sm text-zinc-500">Saved privately in this browser — nothing is stored online.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* New blank (scratch — no empty project spam) */}
          <button
            onClick={() => startScratch()}
            className="focus-ring flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-black transition-transform hover:bg-zinc-200 active:scale-95"
          >
            <FaPlus /> Start editing
          </button>

          {/* Preset quick-launch */}
          <div className="relative">
            <button
              onClick={() => setPresetOpen((o) => !o)}
              className="focus-ring flex items-center gap-2 rounded-xl border border-white/15 bg-zinc-800/60 px-4 py-3 text-sm font-bold text-zinc-200 transition-colors hover:bg-zinc-800"
            >
              New canvas <FaChevronDown size={11} className={presetOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
            </button>
            {presetOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setPresetOpen(false)} />
                <div className="glass absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-xl border border-white/10 p-1.5 shadow-2xl shadow-black/50">
                  {DOC_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => startScratch(p.id)}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/5"
                    >
                      <span className="text-xs font-bold text-zinc-200">{p.label}</span>
                      <span className="font-mono text-[10px] text-zinc-500">{p.sub}</span>
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      setPresetOpen(false);
                      handleNewSaved();
                    }}
                    className="mt-1 flex w-full items-center gap-2 rounded-lg border-t border-white/10 px-3 py-2.5 text-left text-[11px] font-bold text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-200"
                  >
                    <FaDownload size={10} className="rotate-180" /> Create empty saved project
                  </button>
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="focus-ring flex items-center gap-2 rounded-xl border border-white/15 bg-zinc-800/60 px-4 py-3 text-sm font-bold text-zinc-200 transition-colors hover:bg-zinc-800"
          >
            <FaFileImport /> Import
          </button>
          <input type="file" accept=".onyx" ref={fileInputRef} className="hidden" onChange={handleImportFile} />
          {importError && (
            <p role="alert" className="w-full rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs font-semibold text-red-300">
              Could not import — not a valid Onyx project file.
            </p>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-[148px] animate-pulse rounded-2xl border border-white/5 bg-zinc-900/40" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-white/10 px-6 py-14 text-center">
          <FaImage className="mx-auto mb-3 text-3xl text-zinc-700" />
          <p className="text-sm font-semibold text-zinc-400">No projects yet</p>
          <p className="mt-1 text-xs text-zinc-600">
            Hit <strong className="text-zinc-400">Start editing</strong> — your work autosaves here as you go.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <motion.div
              key={p.id}
              layoutId={p.id}
              onClick={() => router.push(`/editor?project=${p.id}`)}
              className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/40 transition-all hover:-translate-y-0.5 hover:border-indigo-400/40 hover:bg-zinc-900"
            >
              {/* thumb */}
              <div className="checkerboard relative aspect-[16/10] w-full overflow-hidden border-b border-white/5">
                {p.thumbnail ? (
                  <img src={p.thumbnail} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                ) : (
                  <div className="flex h-full items-center justify-center text-3xl text-zinc-700">
                    <FaImage />
                  </div>
                )}
                {/* hover actions (always visible on touch devices) */}
                <div className="touch-visible absolute inset-0 flex items-center justify-center gap-2 bg-black/55 opacity-0 backdrop-blur-[2px] transition-opacity group-hover:opacity-100">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setRenaming(p.id);
                      setDraft(p.name);
                    }}
                    title="Rename"
                    className="rounded-xl bg-white/10 p-3 text-sm text-white transition-colors hover:bg-white/20"
                  >
                    <FaPen size={12} />
                  </button>
                  <button
                    onClick={(e) => handleExport(e, p)}
                    title="Export project file"
                    className="rounded-xl bg-white/10 p-3 text-sm text-white transition-colors hover:bg-white/20"
                  >
                    <FaDownload size={12} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDel(p);
                    }}
                    title="Delete"
                    className="rounded-xl bg-red-500/20 p-3 text-sm text-red-300 transition-colors hover:bg-red-500/40"
                  >
                    <FaTrash size={12} />
                  </button>
                </div>
              </div>

              {/* meta */}
              <div className="flex items-center justify-between gap-2 p-3.5">
                {renaming === p.id ? (
                  <input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onBlur={() => commitRename(p.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename(p.id);
                      if (e.key === 'Escape') setRenaming(null);
                    }}
                    className="w-full rounded-md border border-indigo-400/50 bg-zinc-800 px-2 py-1 text-sm font-bold text-white outline-none"
                    maxLength={60}
                  />
                ) : (
                  <span className="truncate text-sm font-bold text-zinc-100">{p.name}</span>
                )}
                <span className="shrink-0 text-[10px] text-zinc-500">{timeAgo(p.lastModified)}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Delete confirm dialog */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && setConfirmDel(null)}>
          <div className="glass w-full max-w-sm rounded-2xl border border-white/10 p-5 shadow-2xl">
            <h3 className="text-base font-bold text-white">Delete project?</h3>
            <p className="mt-1 text-sm text-zinc-400">
              “{confirmDel.name}” will be removed from this browser. This cannot be undone.
            </p>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setConfirmDel(null)} className="focus-ring flex-1 rounded-xl border border-white/10 bg-zinc-800/70 py-3 text-sm font-bold text-zinc-200 hover:bg-zinc-800">
                Keep it
              </button>
              <button
                onClick={async () => {
                  await deleteProject(confirmDel.id);
                  setConfirmDel(null);
                  loadProjects();
                }}
                className="focus-ring flex-1 rounded-xl border border-red-500/30 bg-red-500/15 py-3 text-sm font-bold text-red-300 hover:bg-red-500/25"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
