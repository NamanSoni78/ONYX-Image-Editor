import React, { createContext, useContext } from 'react';
import type { fabric } from 'fabric';
import type { EditorState } from './constants';

export type MenuTab =
  | 'HOME'
  | 'ADD'
  | 'DOCUMENT'
  | 'BG'
  | 'TEXT'
  | 'SHAPE'
  | 'DRAW'
  | 'STICKER'
  | 'ADJUST'
  | 'FILTER'
  | 'MASK'
  | 'MASK_EDIT'
  | 'ARRANGE'
  | 'STYLE'
  | 'LAYERS'
  | 'EXPORT';

export type DocBg =
  | { kind: 'color'; value: string }
  | { kind: 'gradient'; value: string } // CSS gradient string (parsed, N stops)
  | { kind: 'transparent' };

export interface LayerInfo {
  id: string;
  name: string;
  type: string;
  thumb?: string;
  visible: boolean;
  locked: boolean;
  /** 0 = bottom-most user layer */
  index: number;
  obj: fabric.Object;
}

/** Shape mask applied at export time (like masking, but for the final image) */
export type ExportShape =
  | 'none'
  | 'circle'
  | 'square'
  | 'rounded'
  | 'triangle'
  | 'star'
  | 'heart'
  | 'hexagon'
  | 'pentagon'
  | 'diamond';

export interface ExportOptions {
  format: 'png' | 'jpeg' | 'webp';
  quality: number;
  /** Uniform multiplier (used when targetW/targetH are absent) */
  scale: number;
  /** Exact output width (px) */
  targetW?: number;
  /** Exact output height (px) — absent + targetW set → aspect-locked */
  targetH?: number;
  transparent: boolean;
  shape?: ExportShape;
  mode: 'download' | 'copy';
}

/** One ring of a decorative border stack */
export interface BorderRing {
  width: number;
  color: string;
}

/** Configuration for the fancy multi-border feature */
export interface BorderStackConfig {
  /** number of borders, 1–6 */
  count: number;
  /** 'gradient' = ramp between colorA/colorB · 'custom' = per-border colors/widths */
  mode: 'gradient' | 'custom';
  colorA: string;
  colorB: string;
  /** thickness ramp (gradient mode): innermost → outermost width */
  widthMin: number;
  widthMax: number;
  /** gap between borders in px */
  gap: number;
  /** custom mode: per-border overrides */
  rings?: BorderRing[];
}

export interface EditorAPI {
  /* ---- state ---- */
  activeObj: fabric.Object | null;
  menu: MenuTab;
  setMenu: (m: MenuTab) => void;
  subTool: string | null;
  setSubTool: (t: string | null) => void;
  editorState: EditorState;
  layers: LayerInfo[];
  docSize: { width: number; height: number };
  docBg: DocBg;
  zoom: number;
  projectName: string;
  canUndo: boolean;
  canRedo: boolean;
  saveState: 'scratch' | 'saving' | 'saved';
  isDrawing: boolean;
  isMobile: boolean;

  /* ---- object styling ---- */
  updateStyle: (key: keyof EditorState, v: any) => void;
  handleTextFormat: (t: 'bold' | 'italic' | 'underline' | 'align-left' | 'align-center' | 'align-right') => void;

  /* ---- images ---- */
  addImageFromFile: (file: File) => void;
  openFilePicker: () => void;
  adjustImage: (key: string, value: number) => void;
  applyFilterPreset: (name: string) => void;
  toggleRemoveColor: (on: boolean) => void;
  setRemoveColor: (hex: string, dist: number) => void;
  startCrop: () => void;
  startMasking: (shape: 'rect' | 'circle' | 'triangle' | 'heart' | 'star') => void;
  finishMasking: (apply: boolean) => void;
  holdCompare: (hold: boolean) => void;

  /* ---- canvas / document ---- */
  setDocSize: (w: number, h: number) => void;
  setDocBackground: (bg: DocBg) => void;
  openBgPicker: () => void;
  clearBgImage: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomFit: () => void;
  zoom100: () => void;

  /* ---- objects ---- */
  addText: () => void;
  addShape: (t: 'rect' | 'circle' | 'tri') => void;
  /** custom polygon: sides 3–20, or an n-point star when star = true */
  addPolygon: (sides: number, star?: boolean) => void;
  addSticker: (s: string) => void;
  /** full-canvas solid color layer */
  addSolidLayer: (color: string) => void;
  /** full-canvas gradient layer from a CSS gradient string */
  addGradientLayer: (gradient: string) => void;
  /** fill the selected object (gradient / image / back to solid) */
  setObjectGradientFill: (css: string) => void;
  setObjectImageFill: (dataUrl: string) => void;
  setObjectSolidFill: (color: string) => void;
  /** decorative multi-border stack around the selected object */
  applyBorderStack: (cfg: BorderStackConfig) => void;
  removeBorderStack: () => void;
  /** numeric transform inputs from the Arrange panel */
  updateTransform: (patch: { left?: number; top?: number; scaleX?: number; scaleY?: number; angle?: number }) => void;
  toggleDraw: () => void;
  duplicate: () => void;
  deleteSelected: () => void;
  flip: (axis: 'X' | 'Y') => void;
  rotate90: (dir: 1 | -1) => void;
  lockToggle: () => void;
  order: (action: 'front' | 'back' | 'forward' | 'backward') => void;
  align: (mode: 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom') => void;
  selectLayer: (obj: fabric.Object) => void;
  toggleLayerVisibility: (obj: fabric.Object) => void;
  reorderLayer: (obj: fabric.Object, dir: 'up' | 'down') => void;
  /** move a layer to an absolute index (0 = bottom); commit=false → no history entry */
  setLayerIndex: (obj: fabric.Object, idx: number, commit?: boolean) => void;
  renameLayer: (obj: fabric.Object, name: string) => void;

  /* ---- history ---- */
  undo: () => void;
  redo: () => void;
  /** Push a history checkpoint (call after finishing a slider drag etc.) */
  commitHistory: () => void;

  /* ---- export & persistence ---- */
  openExport: () => void;
  exportImage: (opts: ExportOptions) => Promise<void>;
  renameProject: (name: string) => void;
  goHome: () => void;
  openDashboardSidebar: () => void;

  /* ---- overlays ---- */
  openShortcuts: () => void;
  openPalette: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

const EditorCtx = createContext<EditorAPI | null>(null);

export const EditorProvider: React.FC<{ api: EditorAPI; children: React.ReactNode }> = ({ api, children }) => (
  <EditorCtx.Provider value={api}>{children}</EditorCtx.Provider>
);

export const useEditor = (): EditorAPI => {
  const ctx = useContext(EditorCtx);
  if (!ctx) throw new Error('useEditor must be used inside <EditorProvider>');
  return ctx;
};
