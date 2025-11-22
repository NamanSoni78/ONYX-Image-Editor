import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { MORE_FONTS } from '@/lib/fonts';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // App-like feel
  themeColor: "#000000",
};

export const metadata: Metadata = {
  title: "Onyx Image Editor | Free Online Image Editor",
  description: "Professional browser-based image editor. Crop, filter, text, shapes, masking, and more. No sign-up required. Privacy-focused.",
  keywords: ["image editor", "photo editor", "online editor", "free", "privacy", "onyx", "nextjs", "fabricjs", "crop", "mask", "filter"],
  authors: [{ name: "Naman" }],
  openGraph: {
    title: "Onyx Image Editor",
    description: "Create stunning visuals on the go. Advanced features, local processing.",
    url: "https://onyx.namansoni.in/", // Placeholder or actual URL if known, safe to be generic
    siteName: "Onyx Image Editor",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Onyx Image Editor",
    description: "Professional browser-based image editor. No sign-up required.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Construct Google Fonts URL
  const basicFonts = ['Inter:wght@400;600;800', 'Roboto+Slab', 'Pacifico', 'Bebas+Neue', 'Dancing+Script', 'Permanent+Marker'];
  const allFonts = [...basicFonts, ...MORE_FONTS.map(f => f.replace(/ /g, '+'))];
  const fontUrl = `https://fonts.googleapis.com/css2?family=${allFonts.join('&family=')}&display=swap`;

  return (
    <html lang="en">
      <head>
        {/* Load Fonts from Google */}
        <link href={fontUrl} rel="stylesheet" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-white`}
      >
        {children}
      </body>
    </html>
  );
}
