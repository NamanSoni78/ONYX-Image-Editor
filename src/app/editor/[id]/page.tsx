'use client';

import dynamic from 'next/dynamic';
import React, { use } from 'react';

const CanvasEditor = dynamic(() => import('@/components/Editor/CanvasEditor'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[100dvh] w-full items-center justify-center bg-black text-white">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-zinc-800 border-t-blue-500"></div>
        <p className="text-sm font-bold tracking-widest text-zinc-500 animate-pulse">LOADING PROJECT...</p>
      </div>
    </div>
  ),
});

// We need to handle params async in Next 15+ but standard props in 14/15 works for client components or Page props
// Since this is a Page component, params is a Promise in latest Next.js or object in older.
// Let's treat it safely.
type Props = {
  params: Promise<{ id: string }>;
}

export default function EditorPage({ params }: Props) {
  const { id } = use(params);
  return <CanvasEditor projectId={id} />;
}
