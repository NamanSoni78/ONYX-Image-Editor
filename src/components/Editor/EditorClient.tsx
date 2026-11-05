'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
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

/**
 * Remount policy for the editor.
 *
 * Navigating between projects (or project ↔ scratch / preset change) is a
 * SAME-ROUTE soft nav, so the editor must be remounted explicitly — otherwise
 * the old canvas keeps autosaving into the old project.
 *
 * EXCEPTION — "adoption": when a scratch session autosaves for the first time,
 * doSave() creates the project and rewrites the URL to ?project=<id>. That URL
 * change must NOT remount anything: the live canvas IS the document, and the
 * project record is still being written (a remount would race it and load the
 * just-created EMPTY record, wiping the user's work). doSave marks the id on
 * window.__onyxAdoptedPid; we then keep the epoch (no remount).
 */
function EditorWithKey() {
  const params = useSearchParams();
  const pid = params.get('project');
  const preset = params.get('preset');
  const docId = `${pid ?? ''}|${preset ?? ''}`;

  const [epoch, setEpoch] = useState(0);
  const [prevDocId, setPrevDocId] = useState(docId);

  // Sanctioned render-phase adjustment ("state changed since last render"):
  // bump the epoch ONLY for real document switches, never for adoptions.
  if (prevDocId !== docId) {
    const adopting = !!pid && (window as any).__onyxAdoptedPid === pid;
    setPrevDocId(docId);
    if (!adopting) setEpoch((e) => e + 1);
  }

  // Consume the adoption marker outside render (external-system sync).
  useEffect(() => {
    if ((window as any).__onyxAdoptedPid) {
      (window as any).__onyxAdoptedPid = undefined;
    }
  }, [docId]);

  return <CanvasEditor key={epoch} />;
}

export default function EditorClient() {
  return (
    <Suspense fallback={null}>
      <EditorWithKey />
    </Suspense>
  );
}
