import { Metadata } from 'next';

export const generateMetadata = ({
  title,
  description,
  keywords,
  canonicalUrl,
  ogImage,
  author,
}: {
  title: string;
  description: string;
  keywords?: string[];
  canonicalUrl: string;
  ogImage?: string;
  author?: string;
}): Metadata => {
  return {
    title: {
      default: title,
      template: '%s | Onyx Image Editor',
    },
    description: description,
    keywords: keywords || ['image editor', 'photo editor', 'online editor'],
    authors: [{ name: author || 'Naman Soni' }],
    metadataBase: new URL('https://onyx.namansoni.in'),
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: title,
      description: description,
      url: canonicalUrl,
      siteName: 'Onyx Image Editor',
      images: [
        {
          url: ogImage || '/og-image.jpg', // Ensure this exists or use a default
          width: 1200,
          height: 630,
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: title,
      description: description,
      images: [ogImage || '/og-image.jpg'],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
};
