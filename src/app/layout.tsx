import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import JsonLd from '@/components/Seo/JsonLd';
import './globals.css';
import { generateOrganizationSchema, generateWebSiteSchema } from '@/lib/schema';
import { PwaRegister } from '@/components/PwaRegister';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // Required for env(safe-area-inset-*) to resolve in the installed iOS PWA
  // (keeps the mobile toolbar and bottom sheets above the home indicator).
  viewportFit: 'cover',
  themeColor: '#09090b',
};

export const metadata: Metadata = {
  title: 'Onyx Image Editor | Free Online Photo Editor',
  description:
    'Professional browser-based image editor. Crop, filter, mask, add text and export PNG/JPG/WebP — private, free, no signup, works offline.',
  metadataBase: new URL('https://onyx.namansoni.in'),
  manifest: '/manifest.webmanifest',
  applicationName: 'Onyx Image Editor',
  keywords: [
    'image editor', 'photo editor', 'online image editor', 'free photo editor',
    'crop image', 'resize image', 'photo filters', 'image masking', 'privacy',
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Onyx',
  },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  openGraph: {
    title: 'Onyx Image Editor — Free Online Photo Editor',
    description: 'Pro-grade, private, browser-based image editing. Nothing uploads, nothing tracks.',
    type: 'website',
    url: 'https://onyx.namansoni.in',
    siteName: 'Onyx Image Editor',
  },
  twitter: {
    card: 'summary',
    title: 'Onyx Image Editor',
    description: 'Free, private, browser-based image editor with pro tools.',
  },
  alternates: { canonical: 'https://onyx.namansoni.in' },
};

/**
 * Fonts for the canvas text tool.
 * v2: 12 families total (v1 loaded 34 — a large render-blocking request).
 * Loaded via <link> so fabric can render them on canvas; display=swap keeps
 * first paint fast.
 */
const CANVAS_FONTS = [
  'Inter:wght@400;600;800', 'Roboto+Slab', 'Pacifico', 'Bebas+Neue', 'Dancing+Script',
  'Permanent+Marker', 'Montserrat', 'Oswald', 'Anton', 'Lobster', 'Righteous', 'Orbitron',
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const orgSchema = generateOrganizationSchema();
  const webSiteSchema = generateWebSiteSchema();

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href={`https://fonts.googleapis.com/css2?family=${CANVAS_FONTS.join('&family=')}&display=swap`}
          rel="stylesheet"
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <JsonLd data={[orgSchema, webSiteSchema]} />
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
