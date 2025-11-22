import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Onyx Image Editor",
  description: "Advanced image editor built with Next.js and Fabric.js",
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
