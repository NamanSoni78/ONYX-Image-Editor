import React from 'react';
import { generateMetadata as getSeoMetadata } from '@/lib/seo-metadata';
import EditorClient from '@/components/Editor/EditorClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  return getSeoMetadata({
    title: 'Edit Image - Onyx Studio',
    description: 'Professional online image editor. Edit, crop, and filter your images securely in your browser.',
    canonicalUrl: `https://onyx.namansoni.in/editor/${id}`,
    keywords: ['online image editor', 'photo editor', 'browser editor'],
  });
}

export default async function EditorPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <div className="h-screen w-screen overflow-hidden bg-black">
      {/* Hidden SEO Content */}
      <h1 className="sr-only">Onyx Image Editor Studio</h1>
      <p className="sr-only">
        You are currently using the Onyx Image Editor.
        This tool runs entirely in your browser using WebAssembly and HTML5 Canvas.
        Your privacy is protected as no images are uploaded to a server.
      </p>

      <EditorClient projectId={id} />
    </div>
  );
}
