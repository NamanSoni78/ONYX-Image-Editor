import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-6 text-center space-y-8">
      <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">404</h1>
      <h2 className="text-2xl font-bold">Page Not Found</h2>
      <p className="text-zinc-400 max-w-md">
        The page you are looking for does not exist or has been moved.
        Try searching for a tool or go back home.
      </p>

      <div className="flex gap-4 flex-wrap justify-center">
        <Link href="/" className="bg-white text-black px-6 py-3 rounded-full font-bold hover:bg-zinc-200 transition-colors">
          Go Home
        </Link>
        <Link href="/tools" className="bg-zinc-800 text-white px-6 py-3 rounded-full font-bold hover:bg-zinc-700 transition-colors">
          Browse Tools
        </Link>
      </div>

      <div className="pt-8 border-t border-white/10 w-full max-w-md">
         <h3 className="text-sm font-bold text-zinc-500 mb-4">Popular Tools</h3>
         <div className="flex flex-wrap gap-2 justify-center text-sm">
             <Link href="/tools/crop" className="px-3 py-1 bg-zinc-900 rounded-lg hover:text-blue-400 transition-colors">Crop</Link>
             <Link href="/tools/resize" className="px-3 py-1 bg-zinc-900 rounded-lg hover:text-blue-400 transition-colors">Resize</Link>
             <Link href="/tools/filters" className="px-3 py-1 bg-zinc-900 rounded-lg hover:text-blue-400 transition-colors">Filters</Link>
             <Link href="/tools/convert" className="px-3 py-1 bg-zinc-900 rounded-lg hover:text-blue-400 transition-colors">Convert</Link>
         </div>
      </div>
    </div>
  );
}
