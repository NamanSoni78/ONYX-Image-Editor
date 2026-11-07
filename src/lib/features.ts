/**
 * Tool cards for the /tools page (v2).
 * Replaces the v1 programmatic-SEO FEATURES data (blog-style long-form
 * content) with a compact, useful catalogue that links straight into the editor.
 */

export interface ToolInfo {
  slug: string;
  title: string;
  description: string;
  icon: 'crop' | 'resize' | 'filter' | 'adjust' | 'text' | 'shape' | 'draw' | 'sticker' | 'mask' | 'layers' | 'convert' | 'offline';
}

export const TOOLS: ToolInfo[] = [
  {
    slug: 'crop',
    title: 'Crop & resize',
    description: 'Free or ratio-locked cropping with 1:1, 4:5, 16:9 and 9:16 presets, plus pixel-exact canvas resizing.',
    icon: 'crop',
  },
  {
    slug: 'filters',
    title: 'Filters',
    description: '12 one-tap looks — Vintage, Kodak, Polaroid, Techni, Brownie and more, stackable with adjustments.',
    icon: 'filter',
  },
  {
    slug: 'adjust',
    title: 'Pro adjustments',
    description: 'Brightness, contrast, saturation, hue, blur and film grain with live sliders and hold-to-compare.',
    icon: 'adjust',
  },
  {
    slug: 'text',
    title: 'Text & typography',
    description: '12 curated fonts, size, letter-spacing, line height, highlight, alignment and shadows.',
    icon: 'text',
  },
  {
    slug: 'shapes',
    title: 'Shapes & layers',
    description: 'Rectangles, circles, triangles, color and gradient layers with full stacking control.',
    icon: 'shape',
  },
  {
    slug: 'draw',
    title: 'Draw & annotate',
    description: 'Freehand brush with size and color control — perfect for quick annotations and highlights.',
    icon: 'draw',
  },
  {
    slug: 'stickers',
    title: 'Stickers',
    description: 'Emoji stickers and custom text stickers with one-tap placement.',
    icon: 'sticker',
  },
  {
    slug: 'mask',
    title: 'Image masking',
    description: 'Clip photos into circles, hearts, stars and more with an interactive live preview.',
    icon: 'mask',
  },
  {
    slug: 'remove-color',
    title: 'Remove color',
    description: 'Knock out a background color (green screen / white) with a tolerance slider — all on-device.',
    icon: 'layers',
  },
  {
    slug: 'export',
    title: 'Powerful export',
    description: 'PNG with transparency, JPG with quality control, WebP, 0.5×–4× scaling, exact-pixel resize with aspect lock, shape-cropped exports and up to 16K resolution.',
    icon: 'convert',
  },
  {
    slug: 'projects',
    title: 'Autosaved projects',
    description: 'Work is saved privately in your browser. Rename, export and import project files.',
    icon: 'layers',
  },
  {
    slug: 'offline',
    title: 'Works offline',
    description: 'Installable PWA with a service worker — keep editing on a plane or in a dead zone.',
    icon: 'offline',
  },
];
