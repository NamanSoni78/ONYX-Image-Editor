'use client';

import dynamic from 'next/dynamic';
import React from 'react';

const CanvasEditor = dynamic(() => import('./CanvasEditor'), {
    ssr: false,
    loading: () => <div className="h-full w-full flex items-center justify-center bg-zinc-900 text-zinc-500">Loading Editor...</div>
});

interface EmbeddedEditorProps {
    slug: string;
}

export const EmbeddedEditor: React.FC<EmbeddedEditorProps> = ({ slug }) => {
    const getTools = (s: string): string[] => {
        switch(s) {
            case 'crop': return ['add', 'bg', 'crop'];
            case 'resize': return ['add', 'bg', 'crop', 'adjust']; // Resize via Export, but crop often used
            case 'filters':
            case 'blur':
            case 'grayscale':
                return ['add', 'bg', 'filter', 'adjust'];
            case 'flip':
            case 'rotate':
                return ['add', 'bg', 'arrange'];
            case 'add-text': return ['add', 'bg', 'text', 'style', 'arrange', 'layers'];
            case 'masking': return ['add', 'bg', 'mask', 'layers'];
            case 'shapes': return ['add', 'bg', 'shapes', 'style', 'arrange', 'layers'];
            case 'draw': return ['add', 'bg', 'draw', 'layers'];
            case 'convert': return ['add', 'bg'];
            default: return ['all'];
        }
    };

    return (
        <div className="w-full h-[600px] border border-zinc-800 rounded-xl overflow-hidden shadow-2xl my-8 bg-zinc-900/50 backdrop-blur-sm">
            <CanvasEditor
                isEmbedded={true}
                allowedTools={getTools(slug)}
                className="h-full"
            />
        </div>
    );
};
