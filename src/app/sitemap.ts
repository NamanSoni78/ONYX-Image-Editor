import { MetadataRoute } from 'next';
import { FEATURES } from '@/lib/features';
import { BLOG_POSTS } from '@/lib/blog';
import { RESIZE_PRESETS } from '@/lib/resize-presets';
import { CONVERT_PRESETS } from '@/lib/convert-presets';
import { COMPARISONS } from '@/lib/comparisons';

export default function sitemap(): MetadataRoute.Sitemap {
  const features = FEATURES.map(feature => ({
    url: `https://onyx.namansoni.in/tools/${feature.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const blogPosts = BLOG_POSTS.map(post => ({
    url: `https://onyx.namansoni.in/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  const resizePages = RESIZE_PRESETS.map(preset => ({
    url: `https://onyx.namansoni.in/tools/resize/${preset.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  const convertPages = CONVERT_PRESETS.map(preset => ({
    url: `https://onyx.namansoni.in/tools/convert/${preset.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  const comparePages = COMPARISONS.map(comp => ({
    url: `https://onyx.namansoni.in/compare/${comp.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  return [
    {
      url: 'https://onyx.namansoni.in',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: 'https://onyx.namansoni.in/tools',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: 'https://onyx.namansoni.in/blog',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: 'https://onyx.namansoni.in/compare',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    ...features,
    ...blogPosts,
    ...resizePages,
    ...convertPages,
    ...comparePages,
  ];
}
