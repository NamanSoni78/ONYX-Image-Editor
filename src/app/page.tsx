'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { FaPlus, FaArrowRight, FaImage, FaTrash, FaPen, FaDownload, FaFileImport } from 'react-icons/fa6';
import { createProject, getAllProjects, deleteProject, renameProject, importProject, getProject } from '@/lib/storage';

interface Project {
  id: string;
  name: string;
  thumbnail?: string;
  lastModified: number;
}

export default function LandingPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    const list = await getAllProjects();
    // Sort by date desc
    setProjects(list.reverse());
    setLoading(false);
  };

  const handleNewProject = async () => {
    const id = await createProject();
    router.push(`/editor/${id}`);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this project?')) {
        await deleteProject(id);
        loadProjects();
    }
  };

  const handleRename = async (e: React.MouseEvent, id: string, currentName: string) => {
      e.stopPropagation();
      const newName = prompt('Enter new project name:', currentName);
      if (newName && newName !== currentName) {
          await renameProject(id, newName);
          loadProjects();
      }
  };

  const handleExport = async (e: React.MouseEvent, id: string, name: string) => {
      e.stopPropagation();
      const project = await getProject(id);
      if (project) {
          const dataStr = JSON.stringify(project);
          const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

          const exportFileDefaultName = `${name}.onyx`;

          const linkElement = document.createElement('a');
          linkElement.setAttribute('href', dataUri);
          linkElement.setAttribute('download', exportFileDefaultName);
          linkElement.click();
      }
  };

  const handleImportClick = () => {
      fileInputRef.current?.click();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const id = await importProject(file);
      if (id) {
          router.push(`/editor/${id}`);
      } else {
          alert('Failed to import project. Invalid file format.');
      }
      e.target.value = ''; // Reset
  };

  return (
    <div className="h-[100dvh] bg-black text-white flex flex-col font-sans overflow-y-auto pb-20">
      {/* Hero Section */}
      <header className="p-6 flex justify-between items-center border-b border-white/10 glass sticky top-0 z-20 shrink-0">
        <h1 className="text-2xl font-black tracking-widest bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">ONYX IMAGE EDITOR</h1>
      </header>

      <main className="flex-1 p-6 max-w-4xl mx-auto w-full">
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12 space-y-6"
        >
            <h2 className="text-4xl md:text-6xl font-bold leading-tight">
                Create Stunning Visuals <br/>
                <span className="text-blue-500">On The Go.</span>
            </h2>
            <p className="text-zinc-400 text-lg max-w-xl mx-auto">
                The advanced, browser-based image editor for professionals. No sign-up required. Data stays on your device.
            </p>

            <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
                <button
                    onClick={handleNewProject}
                    className="bg-white text-black px-8 py-4 rounded-full text-lg font-bold hover:bg-blue-50 transition-transform active:scale-95 shadow-xl shadow-blue-900/20 flex items-center gap-3"
                >
                    <FaPlus /> Start New Project
                </button>

                <button
                    onClick={handleImportClick}
                    className="bg-zinc-800 text-white px-8 py-4 rounded-full text-lg font-bold hover:bg-zinc-700 transition-transform active:scale-95 flex items-center gap-3"
                >
                    <FaFileImport /> Import Onyx Project
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    accept=".onyx"
                    className="hidden"
                    onChange={handleImportFile}
                />
            </div>
        </motion.div>

        {/* Projects List */}
        <div className="mt-12">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><FaImage className="text-blue-500" /> Your Projects</h3>

            {loading ? (
                <div className="flex justify-center py-10"><div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div></div>
            ) : projects.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-zinc-800 rounded-2xl">
                    <p className="text-zinc-500">No projects yet. Start creating!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {projects.map((p) => (
                        <motion.div
                            key={p.id}
                            layoutId={p.id}
                            onClick={() => router.push(`/editor/${p.id}`)}
                            className="bg-zinc-900/50 border border-white/5 rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:bg-zinc-900 hover:border-blue-500/50 transition-all group relative overflow-hidden"
                        >
                            <div className="w-20 h-20 bg-black rounded-lg flex-shrink-0 overflow-hidden border border-zinc-800 flex items-center justify-center">
                                {p.thumbnail ? (
                                    <img src={p.thumbnail} className="w-full h-full object-cover" alt="thumb" />
                                ) : (
                                    <FaImage className="text-zinc-700 text-2xl" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold truncate pr-8">{p.name}</h4>
                                <p className="text-xs text-zinc-500">Edited {new Date(p.lastModified).toLocaleDateString()}</p>
                            </div>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900/80 backdrop-blur rounded-lg p-1 z-10">
                                <button
                                    onClick={(e) => handleRename(e, p.id, p.name)}
                                    className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                                    title="Rename"
                                >
                                    <FaPen />
                                </button>
                                <button
                                    onClick={(e) => handleExport(e, p.id, p.name)}
                                    className="p-2 text-green-400 hover:bg-green-500/20 rounded-lg transition-colors"
                                    title="Export Project"
                                >
                                    <FaDownload />
                                </button>
                                <button
                                    onClick={(e) => handleDelete(e, p.id)}
                                    className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                                    title="Delete"
                                >
                                    <FaTrash />
                                </button>
                            </div>
                             <FaArrowRight className="text-zinc-600 group-hover:text-white transition-colors group-hover:translate-x-1" />
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
      </main>

      <footer className="p-6 text-center text-zinc-600 text-xs">
        <p>&copy; 2025 Onyx Editor. All rights reserved locally.Made By Naman!</p>
      </footer>
    </div>
  );
}
