export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      {children}
      <footer className="p-8 text-center text-zinc-600 text-sm border-t border-white/10 bg-zinc-950">
          <p>&copy; 2026 Onyx Image Editor. All rights reserved.</p>
      </footer>
    </div>
  );
}
