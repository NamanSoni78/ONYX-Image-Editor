import { fabric } from 'fabric';

/* ------------------------------------------------------------------ */
/* Fonts                                                               */
/* ------------------------------------------------------------------ */

export const FONTS = ['Inter', 'Roboto Slab', 'Pacifico', 'Bebas Neue', 'Dancing Script', 'Permanent Marker'];

/* ------------------------------------------------------------------ */
/* Document presets                                                    */
/* ------------------------------------------------------------------ */

export interface DocPreset {
  id: string;
  label: string;
  sub: string;
  width: number;
  height: number;
}

export const DOC_PRESETS: DocPreset[] = [
  { id: 'instagram', label: 'Instagram Post', sub: '1080 × 1080', width: 1080, height: 1080 },
  { id: 'story', label: 'Story / Reel', sub: '1080 × 1920', width: 1080, height: 1920 },
  { id: 'youtube', label: 'YouTube Thumb', sub: '1280 × 720', width: 1280, height: 720 },
  { id: 'x-post', label: 'X Post', sub: '1600 × 900', width: 1600, height: 900 },
  { id: 'pinterest', label: 'Pinterest Pin', sub: '1000 × 1500', width: 1000, height: 1500 },
  { id: 'facebook', label: 'Facebook Cover', sub: '1640 × 924', width: 1640, height: 924 },
];

export const presetById = (id: string | null | undefined): DocPreset | undefined =>
  DOC_PRESETS.find((p) => p.id === id);

/* ------------------------------------------------------------------ */
/* Filter presets (creative looks)                                     */
/* ------------------------------------------------------------------ */

export interface FilterPreset {
  name: string;
  /** fabric filter instance factory (fresh instance per apply) */
  make: () => fabric.IBaseFilter | null;
  /** CSS approximation for the UI chip preview */
  css?: string;
}

export const FILTER_PRESETS: FilterPreset[] = [
  { name: 'None', make: () => null, css: '' },
  { name: 'Gray', make: () => new fabric.Image.filters.Grayscale(), css: 'grayscale(1)' },
  { name: 'Sepia', make: () => new fabric.Image.filters.Sepia(), css: 'sepia(0.85)' },
  // @ts-ignore — Vintage/Kodachrome/Technicolor/Polaroid/Brownie exist in fabric but typings lag
  { name: 'Vintage', make: () => new fabric.Image.filters.Vintage(), css: 'sepia(0.35) saturate(0.75) brightness(0.95)' },
  // @ts-ignore
  { name: 'Kodak', make: () => new fabric.Image.filters.Kodachrome(), css: 'saturate(1.45) contrast(1.1)' },
  // @ts-ignore
  { name: 'Techni', make: () => new fabric.Image.filters.Technicolor(), css: 'saturate(1.9) hue-rotate(-12deg)' },
  // @ts-ignore
  { name: 'Polaroid', make: () => new fabric.Image.filters.Polaroid(), css: 'sepia(0.12) contrast(1.06) brightness(1.06)' },
  // @ts-ignore
  { name: 'Brownie', make: () => new fabric.Image.filters.Brownie(), css: 'sepia(0.5) saturate(1.2) brightness(0.9)' },
  { name: 'Invert', make: () => new fabric.Image.filters.Invert(), css: 'invert(1)' },
  { name: 'Cool', make: () => new fabric.Image.filters.BlendColor({ color: '#3b82f6', mode: 'tint', alpha: 0.18 }), css: 'hue-rotate(180deg) saturate(1.1)' },
  { name: 'Warm', make: () => new fabric.Image.filters.BlendColor({ color: '#f59e0b', mode: 'tint', alpha: 0.18 }), css: 'sepia(0.3) saturate(1.2)' },
  { name: 'Pixel', make: () => new fabric.Image.filters.Pixelate({ blocksize: 8 }), css: 'contrast(1.2)' },
  { name: 'Blur', make: () => new fabric.Image.filters.Blur({ blur: 0.35 }), css: 'blur(3px)' },
  {
    name: 'Sharpen',
    make: () => new fabric.Image.filters.Convolute({ matrix: [0, -1, 0, -1, 5, -1, 0, -1, 0] }),
    css: 'contrast(1.3)',
  },
  {
    name: 'Emboss',
    make: () => new fabric.Image.filters.Convolute({ matrix: [1, 1, 1, 1, 0.7, -1, -1, -1, -1] }),
    css: 'grayscale(0.6) contrast(1.4)',
  },
];

/* ------------------------------------------------------------------ */
/* Adjustments (stackable, independent of presets)                     */
/* ------------------------------------------------------------------ */

export type AdjustmentKey = 'brightness' | 'contrast' | 'saturation' | 'hue' | 'blur' | 'noise';

export const ADJUSTMENTS: {
  key: AdjustmentKey;
  label: string;
  min: number;
  max: number;
  step: number;
  zero: number;
  format: (v: number) => string;
  make: (v: number) => fabric.IBaseFilter;
}[] = [
  {
    key: 'brightness',
    label: 'Brightness',
    min: -1,
    max: 1,
    step: 0.01,
    zero: 0,
    format: (v) => `${Math.round(v * 100)}`,
    make: (v) => new fabric.Image.filters.Brightness({ brightness: v }),
  },
  {
    key: 'contrast',
    label: 'Contrast',
    min: -1,
    max: 1,
    step: 0.01,
    zero: 0,
    format: (v) => `${Math.round(v * 100)}`,
    make: (v) => new fabric.Image.filters.Contrast({ contrast: v }),
  },
  {
    key: 'saturation',
    label: 'Saturation',
    min: -1,
    max: 1,
    step: 0.01,
    zero: 0,
    format: (v) => `${Math.round(v * 100)}`,
    make: (v) => new fabric.Image.filters.Saturation({ saturation: v }),
  },
  {
    key: 'hue',
    label: 'Hue',
    min: -1,
    max: 1,
    step: 0.01,
    zero: 0,
    format: (v) => `${Math.round(v * 180)}°`,
    make: (v) => new fabric.Image.filters.HueRotation({ rotation: v }),
  },
  {
    key: 'blur',
    label: 'Blur',
    min: 0,
    max: 1,
    step: 0.01,
    zero: 0,
    format: (v) => `${Math.round(v * 100)}`,
    make: (v) => new fabric.Image.filters.Blur({ blur: v }),
  },
  {
    key: 'noise',
    label: 'Grain',
    min: 0,
    max: 100,
    step: 1,
    zero: 0,
    format: (v) => `${Math.round(v)}`,
    make: (v) => new fabric.Image.filters.Noise({ noise: v }),
  },
];

/* ------------------------------------------------------------------ */
/* Stickers                                                            */
/* ------------------------------------------------------------------ */

export const STICKERS = [
  '🔥', '💯', '❤️', '😍', '😂', '👑', '✨', '🚀', '💀', '👀', '🎉', '💸',
  '🍕', '🌈', '🕶️', '💡', '📸', '🏝️', '⚡', '🎯', '💎', '🦄', '🍀', '🎈',
];

/* ------------------------------------------------------------------ */
/* Editor state (UI mirror of the selected object)                     */
/* ------------------------------------------------------------------ */

export interface EditorState {
  opacity: number;
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  blur: number;
  noise: number;
  removeColorOn: boolean;
  removeColorDist: number;
  removeColorHex: string;
  filterPreset: string;
  strokeW: number;
  strokeC: string;
  fill: string;
  bg: string;
  font: string;
  fontSize: number;
  charSpacing: number;
  lineHeight: number;
  shadowB: number;
  shadowO: number;
  shadowC: string;
  radius: number;
  brushS: number;
  brushC: string;
}

export const INITIAL_STATE: EditorState = {
  opacity: 1,
  brightness: 0,
  contrast: 0,
  saturation: 0,
  hue: 0,
  blur: 0,
  noise: 0,
  removeColorOn: false,
  removeColorDist: 0.2,
  removeColorHex: '#ffffff',
  filterPreset: 'None',
  strokeW: 0,
  strokeC: '#ffffff',
  fill: '#ffffff',
  bg: 'transparent',
  font: 'Inter',
  fontSize: 48,
  charSpacing: 0,
  lineHeight: 1.16,
  shadowB: 0,
  shadowO: 10,
  shadowC: '#000000',
  radius: 0,
  brushS: 5,
  brushC: '#ef4444',
};

/* ------------------------------------------------------------------ */
/* Shortcut definitions (single source for the cheat sheet)            */
/* ------------------------------------------------------------------ */

export interface ShortcutDef {
  keys: string;
  action: string;
  group: string;
}

export const SHORTCUTS: ShortcutDef[] = [
  { keys: 'Ctrl+Z', action: 'Undo', group: 'Edit' },
  { keys: 'Ctrl+Shift+Z', action: 'Redo', group: 'Edit' },
  { keys: 'Ctrl+D', action: 'Duplicate', group: 'Edit' },
  { keys: 'Ctrl+C / Ctrl+V', action: 'Copy / paste object', group: 'Edit' },
  { keys: 'Ctrl+A', action: 'Select all', group: 'Edit' },
  { keys: 'Del / Backspace', action: 'Delete selection', group: 'Edit' },
  { keys: 'Ctrl+S', action: 'Export image', group: 'File' },
  { keys: 'Ctrl+K', action: 'Command palette', group: 'File' },
  { keys: 'V', action: 'Select tool', group: 'Tools' },
  { keys: 'T', action: 'Add text', group: 'Tools' },
  { keys: 'B', action: 'Draw tool', group: 'Tools' },
  { keys: 'S', action: 'Shapes', group: 'Tools' },
  { keys: 'E', action: 'Stickers', group: 'Tools' },
  { keys: 'A', action: 'Adjustments', group: 'Tools' },
  { keys: 'F', action: 'Filters', group: 'Tools' },
  { keys: 'C', action: 'Crop', group: 'Tools' },
  { keys: 'M', action: 'Mask', group: 'Tools' },
  { keys: 'G', action: 'Background', group: 'Tools' },
  { keys: 'R', action: 'Arrange', group: 'Tools' },
  { keys: 'L', action: 'Layers', group: 'Tools' },
  { keys: 'Space + drag', action: 'Pan canvas', group: 'View' },
  { keys: 'Scroll / Pinch', action: 'Zoom canvas', group: 'View' },
  { keys: 'Ctrl + +/−', action: 'Zoom in / out', group: 'View' },
  { keys: '0', action: 'Fit to screen', group: 'View' },
  { keys: '1', action: 'Zoom 100%', group: 'View' },
  { keys: 'Arrow keys', action: 'Nudge 1px (Shift = 10px)', group: 'Edit' },
  { keys: '[ / ]', action: 'Send backward / forward', group: 'Edit' },
  { keys: '?', action: 'Shortcut cheat sheet', group: 'Help' },
  { keys: 'Esc', action: 'Deselect / close panel', group: 'Help' },
];
