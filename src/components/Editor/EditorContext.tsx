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
  | { kind: 'gradient'; value: string } // CSS gradient string (parsed)
  | { kind: 'transparent' };

export interface LayerInfo {
  id: string;
  name: string;
  type: string;
  thumb?: string;
  visible: boolean;
  locked: boolean;
  obj: fabric.Object;
}

export interface ExportOptions {
  format: 'png' | 'jpeg' | 'webp';
  quality: number;
  scale: number;
  transparent: boolean;
  mode: 'download' | 'copy';
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
  zoomIn: () => void;
  zoomOut: () => void;
  zoomFit: () => void;
  zoom100: () => void;

  /* ---- objects ---- */
  addText: () => void;
  addShape: (t: 'rect' | 'circle' | 'tri') => void;
  addSticker: (s: string) => void;
  /** full-canvas solid color layer */
  addSolidLayer: (color: string) => void;
  /** full-canvas gradient layer from a CSS gradient string */
  addGradientLayer: (gradient: string) => void;
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
