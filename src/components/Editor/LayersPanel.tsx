import React from 'react';
import { fabric } from 'fabric';
import { FaImage, FaFont, FaShapes, FaArrowUp, FaArrowDown, FaXmark } from 'react-icons/fa6';
import { motion, AnimatePresence } from 'framer-motion';

interface LayersPanelProps {
  layers: fabric.Object[];
  activeObj: fabric.Object | null;
  onSelect: (obj: fabric.Object) => void;
  onClose: () => void;
  onReorder: (obj: fabric.Object, direction: 'up' | 'down') => void;
}

export const LayersPanel: React.FC<LayersPanelProps> = ({ layers, activeObj, onSelect, onClose, onReorder }) => {
  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="absolute bottom-0 w-full h-1/2 bg-zinc-900 rounded-t-2xl z-40 shadow-2xl flex flex-col border-t border-zinc-800"
    >
      <div className="flex justify-between p-4 border-b border-zinc-800 items-center">
        <span className="font-bold text-white">Layers</span>
        <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
          <FaXmark className="text-zinc-400 hover:text-white" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin scrollbar-thumb-zinc-700">
        {layers.map((obj, i) => {
            // fabric.Object doesn't have a guaranteed 'id' unless we add it.
            // We use index as key here but it's better to add ID on creation.
            // For now, index is safer than nothing.
            const icon = obj.type === 'image' ? <FaImage /> : (obj.type === 'i-text' || obj.type === 'text' ? <FaFont /> : <FaShapes />);
            const isSelected = activeObj === obj;

            return (
                <div
                  key={i}
                  onClick={() => onSelect(obj)}
                  className={`flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg border transition-all cursor-pointer ${isSelected ? 'border-blue-500 bg-zinc-800' : 'border-transparent hover:bg-zinc-800'}`}
                >
                    <div className="w-8 h-8 bg-black/50 rounded flex items-center justify-center text-xs text-zinc-500">
                        {icon}
                    </div>
                    <span className="flex-1 text-xs truncate text-zinc-300 font-medium">
                        {obj.type} {layers.length - i}
                    </span>
                    <div className="flex gap-1">
                        <button
                            onClick={(e) => { e.stopPropagation(); onReorder(obj, 'up'); }}
                            className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-700 rounded"
                        >
                            <FaArrowUp />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onReorder(obj, 'down'); }}
                            className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-700 rounded"
                        >
                            <FaArrowDown />
                        </button>
                    </div>
                </div>
            );
        })}
        {layers.length === 0 && (
            <div className="text-center text-zinc-600 py-10 text-sm">No layers</div>
        )}
      </div>
    </motion.div>
  );
};
