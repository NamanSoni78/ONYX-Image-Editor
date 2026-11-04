import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="grid-bg flex min-h-screen flex-col items-center justify-center bg-onyx-950 p-6 text-center">
      <h1 className="text-brand-gradient text-7xl font-black">404</h1>
      <h2 className="mt-4 text-2xl font-bold text-white">This page slipped off the canvas</h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-400">
        The link you followed doesn&apos;t exist (v2 removed the old blog pages).
        Head into the editor and make something instead.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/editor"
          className="focus-ring rounded-full bg-brand-gradient px-7 py-3 text-sm font-bold text-white shadow-xl shadow-indigo-950/40 transition-transform active:scale-95"
        >
          Open the editor
        </Link>
        <Link
          href="/"
          className="focus-ring rounded-full border border-white/15 bg-zinc-800/60 px-7 py-3 text-sm font-bold text-zinc-200 transition-colors hover:bg-zinc-800"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
