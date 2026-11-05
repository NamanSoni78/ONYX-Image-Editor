/**
 * (site) layout — marketing pages.
 * Each page composes its own header/footer (SiteHeader is shared);
 * this layout just provides the shell.
 */
export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="flex min-h-screen flex-col">{children}</div>;
}
