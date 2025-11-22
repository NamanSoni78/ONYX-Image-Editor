import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FaPlus, FaXmark, FaImage, FaHouse, FaTrash } from 'react-icons/fa6';
import { getAllProjects, createProject, deleteProject } from '@/lib/storage';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentProjectId?: string;
}

interface Project {
  id: string;
  name: string;
  lastModified: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, currentProjectId }) => {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    if (isOpen) {
        loadProjects();
    }
  }, [isOpen]);

  const loadProjects = async () => {
    const list = await getAllProjects();
    setProjects(list.reverse());
  };

  const handleNewProject = async () => {
    const id = await createProject();
    router.push(`/editor/${id}`);
    onClose();
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if(confirm("Delete this project?")) {
          await deleteProject(id);
          if(id === currentProjectId) {
              router.push('/');
          } else {
              loadProjects();
          }
      }
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 w-80 bg-zinc-900 z-50 border-r border-white/10 flex flex-col"
          >
            <div className="p-4 border-b border-white/10 flex justify-between items-center">
                <span className="font-black tracking-widest bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">ONYX</span>
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><FaXmark /></button>
            </div>

            <div className="p-4 space-y-2">
                <button
                    onClick={handleNewProject}
                    className="w-full py-3 bg-white text-black rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-50 transition-colors"
                >
                    <FaPlus /> New Project
                </button>

                <Link
                    href="/"
                    className="w-full py-3 bg-zinc-800 text-zinc-400 rounded-xl font-bold flex items-center justify-center gap-2 hover:text-white hover:bg-zinc-700 transition-colors"
                    onClick={onClose}
                >
                    <FaHouse /> Back to Home
                </Link>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                <h4 className="text-xs font-bold text-zinc-500 mb-4 uppercase tracking-wider">Your Projects</h4>
                <div className="space-y-2">
                    {projects.map(p => (
                        <div
                            key={p.id}
                            onClick={() => { router.push(`/editor/${p.id}`); onClose(); }}
                            className={`p-3 rounded-lg cursor-pointer flex items-center gap-3 group transition-colors ${currentProjectId === p.id ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' : 'hover:bg-zinc-800 text-zinc-300'}`}
                        >
                            <FaImage className="text-lg opacity-50" />
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold truncate">{p.name}</div>
                                <div className="text-[10px] opacity-50">{new Date(p.lastModified).toLocaleDateString()}</div>
                            </div>
                            <button
                                onClick={(e) => handleDelete(e, p.id)}
                                className="opacity-0 group-hover:opacity-100 p-2 hover:text-red-400 transition-all"
                            >
                                <FaTrash size={12} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
