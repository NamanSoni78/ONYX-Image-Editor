'use client';

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { FaSpinner } from 'react-icons/fa6';

// Dynamic import for the client-side editor with no SSR
const CanvasEditor = dynamic(() => import('@/components/Editor/CanvasEditor'), {
  ssr: false,
  loading: () => (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-black text-white space-y-4">
        <FaSpinner className="animate-spin text-4xl text-blue-500" />
        <p className="text-zinc-400 font-medium animate-pulse">Loading Editor Environment...</p>
    </div>
  ),
});

export default function EditorClient({ projectId }: { projectId: string }) {
  return (
    <Suspense fallback={null}>
      <CanvasEditor projectId={projectId} />
    </Suspense>
  );
}
