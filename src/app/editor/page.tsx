import React from 'react';
import type { Metadata } from 'next';
import EditorClient from '@/components/Editor/EditorClient';

export const metadata: Metadata = {
  title: 'Editor | Onyx Image Editor',
  description:
    'Professional online image editor. Crop, filter, mask, and design — 100% in your browser, nothing is uploaded.',
  alternates: { canonical: 'https://onyx.namansoni.in/editor' },
};

export default function EditorPage() {
  return (
    <div className="h-[100dvh] w-screen overflow-hidden bg-black">
      {/* Screen-reader context (visual app below) */}
      <h1 className="sr-only">Onyx Image Editor Studio</h1>
      <p className="sr-only">
        Onyx is a browser-based image editor. All editing runs locally using Canvas and WebAssembly;
        images are never uploaded to a server.
      </p>
      <EditorClient />
    </div>
  );
}
