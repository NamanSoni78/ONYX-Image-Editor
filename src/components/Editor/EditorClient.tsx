'use client';

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { FaSpinner } from 'react-icons/fa6';

// Client-only editor; reads ?project= / ?preset= from the URL inside Suspense
const CanvasEditor = dynamic(() => import('@/components/Editor/CanvasEditor'), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-onyx-950 text-white">
      <FaSpinner className="animate-spin text-3xl text-indigo-400" />
      <p className="animate-pulse font-medium text-zinc-400">Loading editor…</p>
    </div>
  ),
});

export default function EditorClient() {
  return (
    <Suspense fallback={null}>
      <CanvasEditor />
    </Suspense>
  );
}
