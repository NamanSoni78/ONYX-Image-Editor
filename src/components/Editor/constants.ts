import { fabric } from 'fabric';

export const FONTS = ['Inter', 'Roboto Slab', 'Pacifico', 'Bebas Neue', 'Dancing Script', 'Permanent Marker'];

export const FILTERS = [
  { name: 'None', fn: null },
  { name: 'Gray', fn: new fabric.Image.filters.Grayscale() },
  { name: 'Sepia', fn: new fabric.Image.filters.Sepia() },
  // @ts-ignore
  { name: 'Vintage', fn: new fabric.Image.filters.Vintage() },
  // @ts-ignore
  { name: 'Kodak', fn: new fabric.Image.filters.Kodachrome() },
  // @ts-ignore
  { name: 'Techni', fn: new fabric.Image.filters.Technicolor() },
  // @ts-ignore
  { name: 'Polaroid', fn: new fabric.Image.filters.Polaroid() },
  { name: 'Invert', fn: new fabric.Image.filters.Invert() },
  { name: 'Pixel', fn: new fabric.Image.filters.Pixelate({ blocksize: 8 }) },
  { name: 'Blur', fn: new fabric.Image.filters.Blur({ blur: 0.5 }) },
  // @ts-ignore
  { name: 'Sharpen', fn: new fabric.Image.filters.Convolute({ matrix: [0, -1, 0, -1, 5, -1, 0, -1, 0] }) },
  // @ts-ignore
  { name: 'Emboss', fn: new fabric.Image.filters.Convolute({ matrix: [1, 1, 1, 1, 0.7, -1, -1, -1, -1] }) }
];

export const STICKERS = ["🔥", "💯", "❤️", "😍", "😂", "👑", "✨", "🚀", "💀", "👀", "🎉", "💸", "🍕", "🌈", "🕶️", "💡", "📸", "🏝️"];

export interface EditorState {
  opacity: number;
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
  chroma: number;
  strokeW: number;
  strokeC: string;
  fill: string;
  bg: string;
  font: string;
  shadowB: number;
  shadowO: number;
  shadowC: string;
  radius: number;
  brushS: number;
  brushC: string;
}

export const INITIAL_STATE: EditorState = {
  opacity: 1, brightness: 0, contrast: 0, saturation: 0, blur: 0, chroma: 0,
  strokeW: 0, strokeC: '#fff', fill: '#fff', bg: 'transparent', font: 'Inter',
  shadowB: 0, shadowO: 10, shadowC: '#000000', radius: 0, brushS: 5, brushC: '#ef4444'
};
