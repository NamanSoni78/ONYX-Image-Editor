'use client';

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { fabric } from 'fabric';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';
import { getProject, updateProject, createProject } from '@/lib/storage';
import {
  INITIAL_STATE,
  EditorState,
  ADJUSTMENTS,
  AdjustmentKey,
  FILTER_PRESETS,
  presetById,
} from './constants';
import {
  EditorProvider,
  useEditor,
  EditorAPI,
  MenuTab,
  DocBg,
  LayerInfo,
  ExportOptions,
  ExportShape,
  BorderStackConfig,
  BorderRing,
} from './EditorContext';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import { Sidebar } from '@/components/Layout/Sidebar';
import { TopBar } from './TopBar';
import { DesktopRail } from './DesktopRail';
import { PropertiesPanel } from './PropertiesPanel';
import { MobileToolbar } from './MobileToolbar';
import { ZoomControls } from './ZoomControls';
import { EmptyState } from './EmptyState';
import { ExportPanel } from './ExportPanel';
import { ShortcutsModal } from './ShortcutsModal';
import { CommandPalette } from './CommandPalette';
import { CropModal } from './CropModal';
import { loadFonts } from '@/lib/fonts';
import { renderToolPanel } from './panels/ToolPanels';
import { LayersList } from './LayersPanel';
import { motion } from 'framer-motion';
import { FaXmark } from 'react-icons/fa6';
/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'onyx-export';

const FRAME_NAME = 'onyx-frame';
const ADJUST_TYPE: Record<AdjustmentKey, string> = {
  brightness: 'Brightness',
  contrast: 'Contrast',
  saturation: 'Saturation',
  hue: 'HueRotation',
  blur: 'Blur',
  noise: 'Noise',
};

const TYPE_LABEL: Record<string, string> = {
  image: 'Image',
  'i-text': 'Text',
  text: 'Text',
  rect: 'Rectangle',
  circle: 'Circle',
  triangle: 'Triangle',
  polygon: 'Polygon',
  path: 'Path',
  group: 'Group',
};

const OBJECT_TABS: MenuTab[] = ['ADJUST', 'FILTER', 'TEXT', 'STYLE', 'ARRANGE', 'MASK', 'MASK_EDIT'];

/** Custom props persisted through history / save / reload */
const CANVAS_EXTRA_PROPS = [
  'selectable', 'name', 'id', 'filters', 'shadow', 'lockMovementX', 'lockMovementY', 'evented', 'visible',
  'onyxBgCss', 'onyxBgTransparent', 'onyxBgImage', 'onyxRing', 'onyxRingCfg', 'onyxRingPart', 'strokeUniform',
  'lockRotation', 'lockScalingX', 'lockScalingY', 'hasControls',
];

const canvasToJson = (c: fabric.Canvas) => JSON.stringify(c.toJSON(CANVAS_EXTRA_PROPS as any));

/** Parse a CSS gradient string → { colors, radial, angleDeg } (supports N stops).
 *  angleDeg is in screen space: 0° = →, +90° = ↓ (matches gradientCoords). */
const parseCssGradient = (css: string): { colors: string[]; radial: boolean; angleDeg: number } => {
  const hexOrRgba = css.match(/#[a-fA-F0-9]{3,8}|rgba?\([^)]+\)/g) || [];
  const colors = hexOrRgba.length >= 2 ? hexOrRgba : ['#6366f1', '#a855f7'];
  const radial = css.includes('radial');
  // Screen-space direction vector (x →, y ↓). CSS default is "to bottom".
  let dx = 0;
  let dy = 1;
  const kw = css.match(/to\s+((?:top|bottom|left|right|center)(?:\s+(?:top|bottom|left|right|center))*)/);
  if (kw) {
    dx = kw[1].includes('left') ? -1 : kw[1].includes('right') ? 1 : 0;
    dy = kw[1].includes('top') ? -1 : kw[1].includes('bottom') ? 1 : 0;
  } else {
    const ang = css.match(/(-?\d+(?:\.\d+)?)(deg|turn|rad)/);
    if (ang) {
      let v = parseFloat(ang[1]);
      if (ang[2] === 'turn') v *= 360;
      else if (ang[2] === 'rad') v = (v * 180) / Math.PI;
      // CSS angles: 0° = ↑, clockwise → convert to screen space.
      const r = ((v - 90) * Math.PI) / 180;
      dx = Math.cos(r);
      dy = Math.sin(r);
    }
  }
  const angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
  return { colors, radial, angleDeg };
};

/** CSS gradient angle (0° = →, grows clockwise) → fabric linear coords over a w×h box */
const gradientCoords = (angleDeg: number, w: number, h: number) => {
  // center of box + direction vector; extend to box bounds
  const rad = (angleDeg * Math.PI) / 180;
  const cx = w / 2;
  const cy = h / 2;
  const len = (Math.abs(w * Math.cos(rad)) + Math.abs(h * Math.sin(rad))) / 2 || 1;
  const dx = Math.cos(rad) * len;
  const dy = Math.sin(rad) * len;
  return { x1: cx - dx, y1: cy - dy, x2: cx + dx, y2: cy + dy, r1: 0, r2: Math.max(w, h) / 2, x1r: cx, y1r: cy, x2r: cx, y2r: cy };
};

/** Interpolate between two hex colors (for gradient border ramps) */
const mixHex = (a: string, b: string, t: number): string => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const p = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  return `#${p.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
};

/** Regular polygon points (sides ≥ 3), centered on (0,0) */
const polygonPoints = (sides: number, radius: number, startAngle = -Math.PI / 2): { x: number; y: number }[] =>
  Array.from({ length: Math.max(3, Math.round(sides)) }, (_, i) => {
    const a = startAngle + (i * 2 * Math.PI) / Math.max(3, Math.round(sides));
    return { x: radius * Math.cos(a), y: radius * Math.sin(a) };
  });

/** Star points (n outer vertices), centered on (0,0) */
const starPoints = (points: number, outer: number, inner: number): { x: number; y: number }[] => {
  const n = Math.max(3, Math.round(points));
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / n;
    pts.push({ x: r * Math.cos(a), y: r * Math.sin(a) });
  }
  return pts;
};

export type ExportShapeLocal = ExportShape;

/** Draw an export mask shape (0..1 normalized space) on a 2d context at w×h */
const traceExportShape = (ctx: CanvasRenderingContext2D, shape: Exclude<ExportShape, 'none'>, w: number, h: number) => {
  const path = new Path2D();
  // Non-square exports: keep the shape's aspect (inscribe in the smaller axis, like circle)
  const s = Math.min(w, h);
  const cx = w / 2;
  const cy = h / 2;
  const map = (x: number, y: number): [number, number] => [cx + x * s, cy + y * s];
  switch (shape) {
    case 'circle': {
      path.ellipse(cx, cy, s / 2, s / 2, 0, 0, Math.PI * 2);
      break;
    }
    case 'rounded': {
      const r = s / 4;
      path.moveTo(r, 0);
      path.arcTo(w, 0, w, h, r);
      path.arcTo(w, h, 0, h, r);
      path.arcTo(0, h, 0, 0, r);
      path.arcTo(0, 0, w, 0, r);
      path.closePath();
      break;
    }
    case 'triangle': {
      const pts = polygonPoints(3, 0.5).map((p) => map(p.x, p.y));
      path.moveTo(...(pts[0] as [number, number]));
      pts.slice(1).forEach((p) => path.lineTo(...(p as [number, number])));
      path.closePath();
      break;
    }
    case 'hexagon':
    case 'pentagon': {
      const pts = polygonPoints(shape === 'hexagon' ? 6 : 5, 0.5).map((p) => map(p.x, p.y));
      path.moveTo(...(pts[0] as [number, number]));
      pts.slice(1).forEach((p) => path.lineTo(...(p as [number, number])));
      path.closePath();
      break;
    }
    case 'diamond': {
      path.moveTo(cx, cy - s / 2);
      path.lineTo(cx + s / 2, cy);
      path.lineTo(cx, cy + s / 2);
      path.lineTo(cx - s / 2, cy);
      path.closePath();
      break;
    }
    case 'star': {
      const pts = starPoints(5, 0.5, 0.21).map((p) => map(p.x, p.y));
      path.moveTo(...(pts[0] as [number, number]));
      pts.slice(1).forEach((p) => path.lineTo(...(p as [number, number])));
      path.closePath();
      break;
    }
    case 'heart': {
      path.moveTo(cx, cy + s * 0.475);
      path.bezierCurveTo(cx - s * 0.49, cy + s * 0.18, cx - s * 0.42, cy - s * 0.34, cx, cy - s * 0.11);
      path.bezierCurveTo(cx + s * 0.42, cy - s * 0.34, cx + s * 0.49, cy + s * 0.18, cx, cy + s * 0.475);
      path.closePath();
      break;
    }
    case 'square':
    default:
      path.rect(0, 0, w, h);
      break;
  }
  return path;
};

let checkerCache: fabric.Pattern | null = null;
const getCheckerPattern = (): fabric.Pattern => {
  if (checkerCache) return checkerCache;
  const c = document.createElement('canvas');
  c.width = c.height = 20;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#17171b';
  ctx.fillRect(0, 0, 20, 20);
  ctx.fillStyle = '#222228';
  ctx.fillRect(0, 0, 10, 10);
  ctx.fillRect(10, 10, 10, 10);
  checkerCache = new fabric.Pattern({ source: c as any, repeat: 'repeat' });
  return checkerCache;
};

/** Build a fabric.Gradient from a CSS gradient string over a w×h box */
const buildFrameGradient = (css: string, w: number, h: number): fabric.Gradient => {
  const { colors, radial, angleDeg } = parseCssGradient(css);
  const stops = colors.map((color, i) => ({ offset: colors.length > 1 ? i / (colors.length - 1) : i, color }));
  const gc = gradientCoords(angleDeg, w, h);
  // @ts-ignore — fabric.Gradient typing quirks
  return new fabric.Gradient({
    type: radial ? 'radial' : 'linear',
    coords: radial
      ? { r1: gc.r1, r2: gc.r2, x1: gc.x1r, y1: gc.y1r, x2: gc.x2r, y2: gc.y2r }
      : { x1: gc.x1, y1: gc.y1, x2: gc.x2, y2: gc.y2 },
    colorStops: stops,
  });
};

/** Derive the DocBg UI state from a document frame's fill (project load / undo) */
const docBgFromFrame = (frame: fabric.Rect | null | undefined): DocBg => {
  const f: any = frame;
  if (!f) return { kind: 'color', value: '#ffffff' };
  if (f.onyxBgCss) return { kind: 'gradient', value: f.onyxBgCss };
  const fill = f.fill;
  // The transparent doc uses a checker Pattern — identity breaks after reload,
  // so prefer the serialized flag and fall back to the instance type.
  if (f.onyxBgTransparent || fill instanceof fabric.Pattern) return { kind: 'transparent' };
  if (fill instanceof fabric.Gradient) {
    const stops: any[] = fill.colorStops || [];
    const colors = stops.map((s) => s.color).filter((c) => typeof c === 'string');
    const cs = colors.length >= 2 ? colors : ['#6366f1', '#a855f7'];
    return { kind: 'gradient', value: `linear-gradient(to right, ${cs.join(', ')})` };
  }
  return { kind: 'color', value: typeof fill === 'string' && fill ? fill : '#ffffff' };
};

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function CanvasEditor({ className = '' }: { className?: string }) {
  return (
    <ToastProvider>
      <CanvasEditorInner className={className} />
    </ToastProvider>
  );
}

function CanvasEditorInner({ className = '' }: { className?: string }) {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get('project');
  const presetParam = searchParams.get('preset');

  /* ---------- refs ---------- */
  const canvasRef = useRef<fabric.Canvas | null>(null);
  const containerRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const frameRef = useRef<fabric.Rect | null>(null);
  const maskShapeRef = useRef<fabric.Object | null>(null);
  const maskTargetRef = useRef<fabric.Image | null>(null);
  const historyRef = useRef<{ json: string; w: number; h: number }[]>([]);
  const historyStepRef = useRef(-1);
  const isLockedRef = useRef(false);
  const projectIdRef = useRef<string | null>(null);
  const docSizeRef = useRef({ width: 1080, height: 1080 });
  const spaceDownRef = useRef(false);
  const panStateRef = useRef<{ panning: boolean; x: number; y: number }>({ panning: false, x: 0, y: 0 });
  const pinchRef = useRef({ active: false, startDist: 0, startMid: { x: 0, y: 0 }, startZoom: 1, startVT: [1, 0, 0, 1, 0, 0] });
  const clipboardRef = useRef<fabric.Object | null>(null);
  const compareStashRef = useRef<fabric.IBaseFilter[] | null>(null);
  const activeObjRef = useRef<fabric.Object | null>(null);
  const projectNameRef = useRef('Untitled Project');
  const brushStateRef = useRef({ size: 5, color: '#ef4444' });
  /** true while export/thumbnail capture runs — selection events are suppressed */
  const isCapturingRef = useRef(false);
  /** set after debouncedSave is created; lets earlier closures schedule saves */
  const scheduleSaveRef = useRef<() => void>(() => {});

  /* ---------- state ---------- */
  const [activeObj, setActiveObj] = useState<fabric.Object | null>(null);
  const [menu, setMenuState] = useState<MenuTab>('HOME');
  const [subTool, setSubTool] = useState<string | null>(null);
  const prevSelRef = useRef<fabric.Object | null | undefined>(undefined);
  const [layers, setLayers] = useState<LayerInfo[]>([]);
  const [cropData, setCropData] = useState<string | null>(null);
  const [editorState, setEditorState] = useState<EditorState>(INITIAL_STATE);
  const [docSize, setDocSizeState] = useState({ width: 1080, height: 1080 });
  const [docBg, setDocBgState] = useState<DocBg>({ kind: 'color', value: '#ffffff' });
  const [zoom, setZoomState] = useState(1);
  const [projectName, setProjectNameState] = useState('Untitled Project');
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [saveState, setSaveState] = useState<'scratch' | 'saving' | 'saved'>('scratch');
  const [isDrawing, setIsDrawing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  /* ---------- tiny wrappers ---------- */
  const setMenu = useCallback((m: MenuTab) => setMenuState(m), []);
  const setProjectName = useCallback((n: string) => {
    setProjectNameState(n);
    projectNameRef.current = n;
  }, []);

  const render = useCallback(() => canvasRef.current?.requestRenderAll(), []);

  /* ---------- apply document size ---------- */
  const zoomFitFn = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const vw = c.getWidth();
    const vh = c.getHeight();
    const { width: dw, height: dh } = docSizeRef.current;
    const z = clamp(Math.min((vw - 90) / dw, (vh - 90) / dh), 0.02, 4);
    c.setViewportTransform([z, 0, 0, z, (vw - dw * z) / 2, (vh - dh * z) / 2]);
    setZoomState(z);
  }, []);

  const applyDocSize = useCallback(
    (w: number, h: number, opts?: { fit?: boolean; centerContent?: boolean }) => {
      const c = canvasRef.current;
      const oldW = docSizeRef.current.width;
      const oldH = docSizeRef.current.height;
      docSizeRef.current = { width: w, height: h };
      setDocSizeState({ width: w, height: h });
      const frame: any = frameRef.current;
      if (frame) {
        frame.set({ width: w, height: h });
        // The frame gradient was baked for the old box — rebuild it for the new size
        if (frame.onyxBgCss) frame.set({ fill: buildFrameGradient(frame.onyxBgCss, w, h) });
      }
      if (c) {
        // Keep the content visually centered when the user resizes the document
        if (opts?.centerContent && (oldW !== w || oldH !== h)) {
          const dx = (w - oldW) / 2;
          const dy = (h - oldH) / 2;
          c.getObjects()
            .filter((o) => (o as any).name !== FRAME_NAME && !(o as any).onyxBgImage)
            .forEach((o) => {
              o.set({ left: (o.left || 0) + dx, top: (o.top || 0) + dy });
              o.setCoords();
            });
        }
        // Background-image layers keep covering the document after resizes
        const bgLayer = c.getObjects().find((o) => (o as any).onyxBgImage) as fabric.Image | undefined;
        if (bgLayer) {
          const s = Math.max(w / (bgLayer.width || 1), h / (bgLayer.height || 1));
          bgLayer.scale(s);
          bgLayer.set({ left: 0, top: 0 });
          bgLayer.setCoords();
        }
        const bg: any = c.backgroundImage;
        if (bg) {
          const s = Math.max(w / (bg.width || 1), h / (bg.height || 1));
          bg.scale(s);
          bg.set({ originX: 'left', originY: 'top', left: 0, top: 0 });
        }
        render();
      }
      if (opts?.fit !== false) zoomFitFn();
    },
    [render, zoomFitFn]
  );

  /* ---------- layers (declared before history: restoreEntry refreshes them) ---------- */
  const updateLayersNow = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const objs = c.getObjects().filter((o) => (o as any).name !== FRAME_NAME);
    const infos: LayerInfo[] = objs.slice().reverse().map((obj) => {
      let thumb: string | undefined;
      try {
        const w = obj.getScaledWidth() || 40;
        const h = obj.getScaledHeight() || 40;
        thumb = obj.toDataURL({ format: 'png', multiplier: 40 / Math.max(w, h) });
      } catch {
        thumb = undefined;
      }
      return {
        id: (obj as any).id || `${obj.type}-${c.getObjects().indexOf(obj)}`,
        name: (obj as any).name || TYPE_LABEL[obj.type || ''] || obj.type || 'Layer',
        type: obj.type || 'object',
        thumb,
        visible: obj.visible !== false,
        locked: !!obj.lockMovementX,
        /** stack position: 0 = bottom-most user layer (matches setLayerIndex) */
        index: objs.indexOf(obj),
        obj,
      };
    });
    setLayers(infos);
  }, []);

  const updateLayersDebounced = useDebouncedCallback(updateLayersNow, 160);

  /* ---------- history ---------- */
  const updateUndoRedoState = useCallback(() => {
    setCanUndo(historyStepRef.current > 0);
    setCanRedo(historyStepRef.current < historyRef.current.length - 1);
  }, []);

  const saveHistory = useCallback(() => {
    const c = canvasRef.current;
    if (!c || isLockedRef.current) return;
    const entry = {
      json: canvasToJson(c),
      w: docSizeRef.current.width,
      h: docSizeRef.current.height,
    };
    if (historyStepRef.current < historyRef.current.length - 1) {
      historyRef.current = historyRef.current.slice(0, historyStepRef.current + 1);
    }
    historyRef.current.push(entry);
    if (historyRef.current.length > 50) {
      historyRef.current.shift();
    }
    historyStepRef.current = historyRef.current.length - 1;
    updateUndoRedoState();
  }, [updateUndoRedoState]);

  const commitHistory = useCallback(() => {
    saveHistory();
    scheduleSaveRef.current();
  }, [saveHistory]);

  /* ---------- document background (after commitHistory: it is undoable) ---------- */
  const setDocBackground = useCallback(
    (bg: DocBg) => {
      const c = canvasRef.current;
      const frame: any = frameRef.current;
      if (!c || !frame) return;
      setDocBgState(bg);
      if (bg.kind === 'color') {
        frame.set({ fill: bg.value });
        frame.onyxBgCss = undefined;
        frame.onyxBgTransparent = false;
      } else if (bg.kind === 'transparent') {
        frame.set({ fill: getCheckerPattern() });
        frame.onyxBgCss = undefined;
        frame.onyxBgTransparent = true;
      } else {
        const { width: dw, height: dh } = docSizeRef.current;
        frame.set({ fill: buildFrameGradient(bg.value, dw, dh) });
        frame.onyxBgCss = bg.value;
        frame.onyxBgTransparent = false;
      }
      render();
      commitHistory();
    },
    [render, commitHistory]
  );

  const restoreEntry = useCallback(
    (entry: { json: string; w: number; h: number }) => {
      const c = canvasRef.current;
      if (!c) return;
      isLockedRef.current = true;
      c.loadFromJSON(entry.json, () => {
        frameRef.current = (c.getObjects().find((o) => (o as any).name === FRAME_NAME) as fabric.Rect) || frameRef.current;
        applyDocSize(entry.w, entry.h, { fit: false });
        setDocBgState(docBgFromFrame(frameRef.current));
        c.renderAll();
        updateLayersNow();
        isLockedRef.current = false;
        updateUndoRedoState();
      });
    },
    [applyDocSize, updateUndoRedoState, updateLayersNow]
  );

  const undo = useCallback(() => {
    if (historyStepRef.current > 0 && historyRef.current.length > 0) {
      historyStepRef.current--;
      restoreEntry(historyRef.current[historyStepRef.current]);
      scheduleSaveRef.current();
    }
  }, [restoreEntry]);

  const redo = useCallback(() => {
    if (historyStepRef.current < historyRef.current.length - 1) {
      historyStepRef.current++;
      restoreEntry(historyRef.current[historyStepRef.current]);
      scheduleSaveRef.current();
    }
  }, [restoreEntry]);

  /* ---------- save ---------- */
  const renderDocDataURL = useCallback(
    (opts: {
      format: 'png' | 'jpeg' | 'webp';
      quality: number;
      scale?: number;
      targetWidth?: number;
      targetHeight?: number;
      transparent?: boolean;
      shape?: ExportShape;
    }): { url: string; w: number; h: number } => {
      const c = canvasRef.current;
      if (!c) return { url: '', w: 0, h: 0 };
      const prevW = c.getWidth();
      const prevH = c.getHeight();
      const prevVT = [...(c.viewportTransform as number[])];
      const frame = frameRef.current;
      const prevFrameVisible = frame ? frame.visible : true;
      const prevFrameFill = frame ? frame.fill : undefined;
      const prevBgColor = c.backgroundColor as string | fabric.Pattern | undefined;
      const prevActive = c.getActiveObject();

      const { width: dw, height: dh } = docSizeRef.current;

      // Resolve the exact output pixel size (aspect-locked unless both are given)
      let outW: number;
      let outH: number;
      if (opts.targetWidth && opts.targetHeight) {
        outW = Math.max(1, Math.round(opts.targetWidth));
        outH = Math.max(1, Math.round(opts.targetHeight));
      } else if (opts.targetWidth) {
        outW = Math.max(1, Math.round(opts.targetWidth));
        outH = Math.max(1, Math.round((outW * dh) / dw));
      } else {
        const s = opts.scale || 1;
        outW = Math.max(1, Math.round(dw * s));
        outH = Math.max(1, Math.round(dh * s));
      }

      // Browser safety caps: 16 384 px per side, ≤ 268 MP total
      const MAX_SIDE = 16384;
      const MAX_MP = 268435456;
      const sideCap = Math.min(1, MAX_SIDE / Math.max(outW, outH));
      const mpCap = Math.min(1, Math.sqrt(MAX_MP / (outW * outH)));
      const cap = Math.min(sideCap, mpCap);
      outW = Math.max(1, Math.floor(outW * cap));
      outH = Math.max(1, Math.floor(outH * cap));

      // Capture at (at least) output resolution so text/shapes stay crisp
      const captureScale = clamp(Math.max(outW / dw, outH / dh), 0.02, 20);

      const isTransparentDoc =
        !!(frame as any)?.onyxBgTransparent || frame?.fill instanceof fabric.Pattern;
      // JPEG has no alpha channel — a "transparent" JPEG would composite onto black
      const wantTransparent = !!opts.transparent && opts.format !== 'jpeg';

      let url = '';
      // Suppress selection events while we discard + restore the selection
      // (otherwise the UI would think the user deselected).
      isCapturingRef.current = true;
      try {
        if (frame) {
          if (wantTransparent) {
            frame.set('visible', false);
            // The canvas backgroundColor paints under everything in toCanvasElement —
            // clear it or transparent PNGs come out filled with the editor backdrop.
            c.backgroundColor = '';
          } else if (isTransparentDoc) {
            frame.set('fill', '#ffffff');
          }
        }

        c.discardActiveObject();
        c.setDimensions({ width: dw, height: dh });
        c.setViewportTransform([1, 0, 0, 1, 0, 0]);
        const captured = c.toCanvasElement(captureScale, { left: 0, top: 0, width: dw, height: dh });

        // Compose the final canvas: exact size, optional shape mask
        const out = document.createElement('canvas');
        out.width = outW;
        out.height = outH;
        const ctx = out.getContext('2d')!;
        if (opts.shape && opts.shape !== 'none') {
          if (opts.format === 'jpeg') {
            // JPEG has no alpha — fill behind the shape with white
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, outW, outH);
          }
          ctx.save();
          const path = traceExportShape(ctx, opts.shape, outW, outH);
          ctx.clip(path);
          ctx.drawImage(captured, 0, 0, outW, outH);
          ctx.restore();
        } else {
          ctx.drawImage(captured, 0, 0, outW, outH);
        }
        url = out.toDataURL(`image/${opts.format === 'jpeg' ? 'jpeg' : opts.format}`, opts.quality);
      } finally {
        c.setDimensions({ width: prevW, height: prevH });
        c.setViewportTransform(prevVT);
        c.backgroundColor = prevBgColor as any;
        if (frame) {
          frame.set('visible', prevFrameVisible);
          frame.set('fill', prevFrameFill);
        }
        if (prevActive) c.setActiveObject(prevActive);
        isCapturingRef.current = false;
      }
      c.requestRenderAll();
      return { url, w: outW, h: outH };
    },
    []
  );

  const doSave = useCallback(async () => {
    const c = canvasRef.current;
    if (!c || isLockedRef.current) return;
    setSaveState('saving');
    try {
      let pid = projectIdRef.current;
      if (!pid) {
        pid = await createProject(projectNameRef.current);
        projectIdRef.current = pid;
        // Mark this as an ADOPTION: the URL change below re-renders the editor
        // wrapper, which must keep this very canvas mounted (no remount — the
        // project record is still being written; a remount would race it and
        // load the empty record, wiping the user's work).
        (window as any).__onyxAdoptedPid = pid;
        window.history.replaceState(null, '', `/editor?project=${pid}`);
      }
      const json = canvasToJson(c);
      let thumb: string | undefined;
      try {
        thumb = renderDocDataURL({ format: 'jpeg', quality: 0.55, targetWidth: 240 }).url;
      } catch {
        thumb = undefined;
      }
      await updateProject(pid, json, thumb, projectNameRef.current, {
        docW: docSizeRef.current.width,
        docH: docSizeRef.current.height,
      });
      setSaveState('saved');
    } catch {
      setSaveState('scratch');
    }
  }, [renderDocDataURL]);

  const debouncedSave = useDebouncedCallback(() => void doSave(), 1100);
  scheduleSaveRef.current = debouncedSave;

  /* ---------- selection sync ---------- */
  const syncFromObject = useCallback(
    (obj: fabric.Object | undefined) => {
      if (!obj) {
        setActiveObj(null);
        activeObjRef.current = null;
        setMenuState((m) => (OBJECT_TABS.includes(m) ? 'HOME' : m));
        return;
      }
      setActiveObj(obj);
      activeObjRef.current = obj;

      // A different object was selected — drop any stale fill sub-mode so the
      // Style panel reflects the NEW object's actual fill (solid/gradient/image).
      if (obj !== prevSelRef.current) {
        prevSelRef.current = obj;
        setSubTool((st) => (st && st.startsWith('fill-') ? null : st));
      }

      const st: Partial<EditorState> = {
        opacity: obj.opacity ?? 1,
        strokeW: obj.strokeWidth || 0,
        strokeC: (obj.stroke as string) || '#ffffff',
        fill: '#ffffff',
        bg: (obj.backgroundColor as string) || 'transparent',
        font: (obj as any).fontFamily || 'Inter',
        fontSize: (obj as any).fontSize || 48,
        charSpacing: (obj as any).charSpacing || 0,
        lineHeight: (obj as any).lineHeight || 1.16,
        radius: (obj as any).rx || 0,
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
      };

      if (obj.shadow && typeof obj.shadow !== 'string') {
        st.shadowB = (obj.shadow as fabric.Shadow).blur || 0;
        st.shadowO = (obj.shadow as fabric.Shadow).offsetX || 10;
        st.shadowC = (obj.shadow as fabric.Shadow).color || '#000000';
      }

      // Gradient / pattern fills are not plain colors — anchor the solid picker on
      // the gradient's first stop (or white) instead of leaking the object into state.
      const rawFill: any = obj.fill;
      if (typeof rawFill === 'string' && rawFill) st.fill = rawFill;
      else if (rawFill instanceof fabric.Gradient) {
        const c0 = (rawFill as any).colorStops?.[0]?.color;
        if (typeof c0 === 'string') st.fill = c0;
      }

      if (obj.type === 'image') {
        const filters: any[] = (obj as fabric.Image).filters || [];
        for (const f of filters) {
          if (!f) continue;
          if ((f as any).onyxPreset) {
            st.filterPreset = (f as any).onyxPreset;
          } else if ((f as any).onyxRemove) {
            st.removeColorOn = true;
            st.removeColorDist = f.distance ?? 0.2;
            st.removeColorHex = f.color || '#ffffff';
          } else {
            switch (f.type) {
              case 'Brightness': st.brightness = f.brightness || 0; break;
              case 'Contrast': st.contrast = f.contrast || 0; break;
              case 'Saturation': st.saturation = f.saturation || 0; break;
              case 'HueRotation': st.hue = f.rotation || 0; break;
              case 'Blur': st.blur = f.blur || 0; break;
              case 'Noise': st.noise = f.noise || 0; break;
            }
          }
        }
      }

      setEditorState((prev) => ({ ...prev, ...st }));

      // Desktop: auto-open the most relevant panel when idle on HOME
      if (!isMobile) {
        setMenuState((m) => {
          if (m !== 'HOME') return m;
          if (obj.type === 'image') return 'ADJUST';
          if (obj.type === 'i-text' || obj.type === 'text') return 'TEXT';
          return 'STYLE';
        });
      }
    },
    [isMobile]
  );

  /* ---------------------------------------------------------------- */
  /* INIT EFFECT                                                       */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    if (!containerRef.current || canvasRef.current) return;

    const mq = window.matchMedia('(max-width: 767px)');
    const applyMq = () => setIsMobile(mq.matches);
    applyMq();
    mq.addEventListener('change', applyMq);

    loadFonts();

    const c = new fabric.Canvas(containerRef.current, {
      backgroundColor: '#101013',
      preserveObjectStacking: true,
      selection: !mq.matches,
      controlsAboveOverlay: true,
      allowTouchScrolling: false,
      enableRetinaScaling: false,
      width: wrapperRef.current?.offsetWidth || window.innerWidth,
      height: wrapperRef.current?.offsetHeight || window.innerHeight,
    });

    fabric.Object.prototype.set({
      transparentCorners: false,
      cornerColor: '#0f0f12',
      cornerStrokeColor: '#818cf8',
      borderColor: '#818cf8',
      cornerSize: 9,
      touchCornerSize: 24,
      padding: 0,
      cornerStyle: 'circle',
      borderScaleFactor: 1.6,
      centeredScaling: true,
      centeredRotation: true,
    } as any);

    canvasRef.current = c;

    /* ----- document frame ----- */
    const frame = new fabric.Rect({
      left: 0,
      top: 0,
      width: docSizeRef.current.width,
      height: docSizeRef.current.height,
      fill: '#ffffff',
      selectable: false,
      evented: false,
      hasControls: false,
      hasBorders: false,
      hoverCursor: 'default',
      name: FRAME_NAME,
      shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.55)', blur: 24, offsetX: 0, offsetY: 4 }),
    } as any);
    c.add(frame);
    frameRef.current = frame;

    /* ----- canvas events ----- */
    c.on('object:modified', () => {
      updateLayersDebounced();
      saveHistory();
      scheduleSaveRef.current();
    });
    c.on('object:added', () => {
      updateLayersDebounced();
      if (!isLockedRef.current) {
        saveHistory();
        scheduleSaveRef.current();
      }
    });
    c.on('object:removed', () => {
      updateLayersDebounced();
      if (!isLockedRef.current) {
        saveHistory();
        scheduleSaveRef.current();
      }
    });
    c.on('text:changed', () => scheduleSaveRef.current());
    c.on('selection:created', (e) => syncFromObject(e.selected?.[0]));
    c.on('selection:updated', (e) => syncFromObject(e.selected?.[0]));
    c.on('selection:cleared', () => {
      // Selection is discarded programmatically during export/thumbnail capture
      // and restored right after — don't wipe the UI state in that window.
      if (isCapturingRef.current) return;
      if (maskShapeRef.current) {
        // Mask mode interrupted — clean up the temporary shape
        c.remove(maskShapeRef.current);
        maskShapeRef.current = null;
        if (maskTargetRef.current) {
          maskTargetRef.current.set({ selectable: true, evented: true });
          maskTargetRef.current = null;
        }
      }
      syncFromObject(undefined);
    });

    /* ----- load project or start fresh ----- */
    if (projectIdParam) {
      projectIdRef.current = projectIdParam;
      setSaveState('saved');
      getProject(projectIdParam).then((p) => {
        if (!p) {
          toast('Project not found — started a new canvas instead', 'warning');
          zoomFitFn();
          saveHistory();
          return;
        }
        setProjectName(p.name);
        isLockedRef.current = true;
        c.loadFromJSON(p.data, () => {
          const existingFrame = c.getObjects().find((o) => (o as any).name === FRAME_NAME) as fabric.Rect | undefined;
          let w = p.docW;
          let h = p.docH;
          if (!existingFrame) {
            // v1 project — derive document size from content bounding box
            const objs = c.getObjects();
            if (w == null || h == null) {
              if (objs.length > 0) {
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                objs.forEach((o) => {
                  const r = o.getBoundingRect();
                  minX = Math.min(minX, r.left);
                  minY = Math.min(minY, r.top);
                  maxX = Math.max(maxX, r.left + r.width);
                  maxY = Math.max(maxY, r.top + r.height);
                });
                w = Math.max(1, Math.round(maxX - minX));
                h = Math.max(1, Math.round(maxY - minY));
              } else {
                w = 1080;
                h = 1080;
              }
            }
            frame.set({ width: w!, height: h! });
            c.add(frame);
            c.sendToBack(frame);
          }
          frameRef.current = (existingFrame || frame) as fabric.Rect;
          // read frame fill to restore docBg state
          setDocBgState(docBgFromFrame(frameRef.current));
          applyDocSize(w || 1080, h || 1080, { fit: false });
          // Legacy saves kept the bg image on the canvas (hidden behind the frame) —
          // lift it into a real layer so it is visible and exportable.
          const legacyBg: any = (c as any).backgroundImage;
          if (legacyBg) {
            const { width: ldw, height: ldh } = docSizeRef.current;
            legacyBg.set({
              selectable: false,
              evented: false,
              name: 'Background',
              originX: 'left',
              originY: 'top',
              left: 0,
              top: 0,
            });
            (legacyBg as any).onyxBgImage = true;
            legacyBg.scale(Math.max(ldw / (legacyBg.width || 1), ldh / (legacyBg.height || 1)));
            (c as any).backgroundImage = null;
            c.add(legacyBg);
            const liveObjs = (c as any)._objects as fabric.Object[];
            const lfi = liveObjs.findIndex((o) => (o as any).name === FRAME_NAME);
            const lfrom = liveObjs.indexOf(legacyBg);
            if (lfi >= 0 && lfrom > lfi + 1) {
              liveObjs.splice(lfrom, 1);
              liveObjs.splice(lfi + 1, 0, legacyBg);
              legacyBg._set('dirty', true);
            }
          }
          c.renderAll();
          updateLayersNow();
          isLockedRef.current = false;
          saveHistory();
          zoomFitFn();
        });
      });
    } else {
      const preset = presetById(presetParam);
      if (preset) {
        applyDocSize(preset.width, preset.height, { fit: false });
        frame.set({ width: preset.width, height: preset.height });
      }
      saveHistory();
      // fit on next frame once layout has settled
      requestAnimationFrame(() => zoomFitFn());
    }

    /* ----- resize observer ----- */
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const ro = new ResizeObserver(() => {
      if (wrapperRef.current && canvasRef.current) {
        canvasRef.current.setDimensions({
          width: wrapperRef.current.offsetWidth,
          height: wrapperRef.current.offsetHeight,
        });
        canvasRef.current.requestRenderAll();
        // After a real viewport change (rotation, keyboard), re-fit the
        // document so it never ends up panned out of view. Debounced.
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => zoomFitFn(), 220);
      }
    });
    if (wrapperRef.current) ro.observe(wrapperRef.current);

    /* ----- wheel zoom ----- */
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const cv = canvasRef.current;
      if (!cv) return;
      const rect = (cv as any).upperCanvasEl.getBoundingClientRect() as DOMRect;
      const point = new fabric.Point(e.clientX - rect.left, e.clientY - rect.top);
      const factor = Math.exp(-e.deltaY * 0.0016);
      const z = clamp(cv.getZoom() * factor, 0.02, 8);
      cv.zoomToPoint(point, z);
      setZoomState(z);
    };
    wrapperRef.current?.addEventListener('wheel', onWheel, { passive: false });

    /* ----- pinch zoom + two-finger pan (capture phase, before fabric) ----- */
    const getDist = (t1: Touch, t2: Touch) => Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
    const getMid = (t1: Touch, t2: Touch) => ({ x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 });

    const onTouchStartCapture = (e: TouchEvent) => {
      if (e.touches.length === 2 && canvasRef.current) {
        const [a, b] = [e.touches[0], e.touches[1]];
        const rect = (canvasRef.current as any).upperCanvasEl.getBoundingClientRect() as DOMRect;
        const mid = getMid(a, b);
        pinchRef.current = {
          active: true,
          startDist: getDist(a, b),
          startMid: { x: mid.x - rect.left, y: mid.y - rect.top },
          startZoom: canvasRef.current.getZoom(),
          startVT: [...(canvasRef.current.viewportTransform as number[])],
        };
        e.preventDefault();
        e.stopPropagation();
      }
    };
    const onTouchMoveCapture = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchRef.current.active && canvasRef.current) {
        e.preventDefault();
        e.stopPropagation();
        const [a, b] = [e.touches[0], e.touches[1]];
        const rect = (canvasRef.current as any).upperCanvasEl.getBoundingClientRect() as DOMRect;
        const dist = getDist(a, b);
        const mid = getMid(a, b);
        const p = pinchRef.current;
        const z = clamp(p.startZoom * (dist / p.startDist), 0.02, 8);
        const m = { x: mid.x - rect.left, y: mid.y - rect.top };
        // keep the world point under the starting midpoint anchored under the current midpoint
        const wx = (p.startMid.x - p.startVT[4]) / p.startZoom;
        const wy = (p.startMid.y - p.startVT[5]) / p.startZoom;
        canvasRef.current.setViewportTransform([z, 0, 0, z, m.x - wx * z, m.y - wy * z]);
        setZoomState(z);
      }
    };
    const onTouchEndCapture = (e: TouchEvent) => {
      if (e.touches.length < 2) pinchRef.current.active = false;
    };
    const wrap = wrapperRef.current;
    wrap?.addEventListener('touchstart', onTouchStartCapture, { capture: true, passive: false });
    wrap?.addEventListener('touchmove', onTouchMoveCapture, { capture: true, passive: false });
    wrap?.addEventListener('touchend', onTouchEndCapture, { capture: true, passive: false });
    wrap?.addEventListener('touchcancel', onTouchEndCapture, { capture: true, passive: false });

    /* ----- space / middle-button panning ----- */
    const onMouseDownCapture = (e: MouseEvent) => {
      if (e.button === 1 || spaceDownRef.current) {
        e.preventDefault();
        e.stopPropagation();
        panStateRef.current = { panning: true, x: e.clientX, y: e.clientY };
        if (wrapperRef.current) wrapperRef.current.style.cursor = 'grabbing';
      }
    };
    const onMouseMoveWindow = (e: MouseEvent) => {
      if (panStateRef.current.panning && canvasRef.current) {
        const dx = e.clientX - panStateRef.current.x;
        const dy = e.clientY - panStateRef.current.y;
        panStateRef.current.x = e.clientX;
        panStateRef.current.y = e.clientY;
        canvasRef.current.relativePan(new fabric.Point(-dx, -dy));
      }
    };
    const onMouseUpWindow = () => {
      if (panStateRef.current.panning) {
        panStateRef.current.panning = false;
        if (wrapperRef.current) wrapperRef.current.style.cursor = '';
      }
    };
    wrap?.addEventListener('mousedown', onMouseDownCapture, { capture: true });
    window.addEventListener('mousemove', onMouseMoveWindow);
    window.addEventListener('mouseup', onMouseUpWindow);

    return () => {
      mq.removeEventListener('change', applyMq);
      ro.disconnect();
      wrap?.removeEventListener('wheel', onWheel);
      wrap?.removeEventListener('touchstart', onTouchStartCapture, { capture: true } as any);
      wrap?.removeEventListener('touchmove', onTouchMoveCapture, { capture: true } as any);
      wrap?.removeEventListener('touchend', onTouchEndCapture, { capture: true } as any);
      wrap?.removeEventListener('touchcancel', onTouchEndCapture, { capture: true } as any);
      wrap?.removeEventListener('mousedown', onMouseDownCapture, { capture: true } as any);
      window.removeEventListener('mousemove', onMouseMoveWindow);
      window.removeEventListener('mouseup', onMouseUpWindow);
      c.dispose();
      canvasRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------------------------------------------------------- */
  /* KEYBOARD SHORTCUTS                                                */
  /* ---------------------------------------------------------------- */
  const isTyping = useCallback(() => {
    const t = document.activeElement as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return true;
    const a = canvasRef.current?.getActiveObject() as any;
    return !!(a && a.isEditing);
  }, []);

  /** Typing in a REAL DOM input (panel fields, palette, topbar) — not fabric's hidden textarea */
  const domTyping = useCallback(() => {
    // fabric IText editing focuses a hidden textarea; the active object tells us
    // that's the case, and canvas-level shortcuts (Ctrl+Z…) should still work there.
    const a = canvasRef.current?.getActiveObject() as any;
    if (a && a.isEditing) return false;
    const t = document.activeElement as HTMLElement | null;
    return !!(t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const c = canvasRef.current;
      if (!c) return;
      const mod = e.ctrlKey || e.metaKey;

      if (e.key === ' ' && !isTyping()) {
        // Space still activates a focused button/link (a11y)
        const ae = document.activeElement as HTMLElement | null;
        const onControl = !!ae && (ae.tagName === 'BUTTON' || ae.tagName === 'A' || ae.tagName === 'SELECT');
        if (!onControl) {
          spaceDownRef.current = true;
          if (wrapperRef.current) wrapperRef.current.style.cursor = 'grab';
          e.preventDefault();
          return;
        }
      }

      /* --- modifier combos (canvas-level; suppressed while typing in DOM inputs) --- */
      if (mod && !domTyping()) {
        if (e.key.toLowerCase() === 'z') {
          e.preventDefault();
          if (e.shiftKey) redo();
          else undo();
          return;
        }
        if (e.key.toLowerCase() === 'y') {
          e.preventDefault();
          redo();
          return;
        }
        if (e.key.toLowerCase() === 'd') {
          e.preventDefault();
          apiDuplicate();
          return;
        }
        if (e.key.toLowerCase() === 's') {
          e.preventDefault();
          setMenuState('EXPORT');
          return;
        }
        if (e.key.toLowerCase() === 'k') {
          e.preventDefault();
          setPaletteOpen(true);
          return;
        }
        if (e.key.toLowerCase() === 'a') {
          e.preventDefault();
          const objs = c.getObjects().filter((o) => (o as any).name !== FRAME_NAME);
          if (objs.length > 1) {
            const sel = new fabric.ActiveSelection(objs, { canvas: c });
            c.setActiveObject(sel);
            c.requestRenderAll();
          }
          return;
        }
        if (e.key.toLowerCase() === 'c') {
          clipboardRef.current = c.getActiveObject();
          if (clipboardRef.current) toast('Copied object', 'info');
          return;
        }
        if (e.key.toLowerCase() === 'v') {
          if (clipboardRef.current) {
            e.preventDefault();
            pasteClipboard();
          }
          return;
        }
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          apiZoomIn();
          return;
        }
        if (e.key === '-') {
          e.preventDefault();
          apiZoomOut();
          return;
        }
      }

      if (isTyping() || paletteOpen || shortcutsOpen || cropData || menu === 'EXPORT') return;

      /* --- plain keys --- */
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const a = c.getActiveObject();
        if (a) {
          e.preventDefault();
          apiDeleteObjects(a);
        }
        return;
      }
      if (e.key === 'Escape') {
        // Leaving MASK_EDIT must clean up the temp shape + unlock the target image
        if (menu === 'MASK_EDIT' && maskShapeRef.current) {
          finishMasking(false);
          return;
        }
        if (menu !== 'HOME') setMenuState('HOME');
        else c.discardActiveObject();
        c.requestRenderAll();
        return;
      }
      if (e.key === '?') {
        setShortcutsOpen(true);
        return;
      }
      if (e.key === '0') { zoomFitFn(); return; }
      if (e.key === '1') { apiZoom100(); return; }
      if (e.key === '[') { apiOrder('backward'); return; }
      if (e.key === ']') { apiOrder('forward'); return; }

      if (e.key.startsWith('Arrow')) {
        const a = c.getActiveObject();
        if (a) {
          e.preventDefault();
          const step = e.shiftKey ? 10 : 1;
          const map: Record<string, [number, number]> = {
            ArrowUp: [0, -step],
            ArrowDown: [0, step],
            ArrowLeft: [-step, 0],
            ArrowRight: [step, 0],
          };
          const [dx, dy] = map[e.key];
          a.set({ left: (a.left || 0) + dx, top: (a.top || 0) + dy });
          a.setCoords();
          c.requestRenderAll();
          scheduleSaveRef.current();
          commitHistoryThrottled();
        }
        return;
      }

      const k = e.key.toLowerCase();
      if (k === 'c') {
        e.preventDefault();
        apiStartCrop();
        return;
      }
      const toolKeys: Record<string, MenuTab | 'draw'> = {
        v: 'HOME', t: 'TEXT', s: 'SHAPE', e: 'STICKER', a: 'ADJUST', f: 'FILTER',
        m: 'MASK', g: 'BG', r: 'ARRANGE', l: 'LAYERS', i: 'ADD', b: 'draw',
      };
      if (toolKeys[k]) {
        e.preventDefault();
        if (toolKeys[k] === 'draw') apiToggleDraw();
        else setMenuState(toolKeys[k] as MenuTab);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        spaceDownRef.current = false;
        if (!panStateRef.current.panning && wrapperRef.current) wrapperRef.current.style.cursor = '';
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKeyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menu, paletteOpen, shortcutsOpen, cropData, zoomFitFn]);

  const commitHistoryThrottled = useDebouncedCallback(() => commitHistory(), 500);

  /* ---------------------------------------------------------------- */
  /* PASTE & actions                                                   */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (isTyping()) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const it of items) {
        if (it.type.startsWith('image/')) {
          const file = it.getAsFile();
          if (file) {
            e.preventDefault();
            apiAddImageFromFile(file);
            toast('Image pasted', 'success');
          }
          return;
        }
      }
      const text = e.clipboardData?.getData('text/plain');
      if (text) {
        e.preventDefault();
        const t = new fabric.IText(text.slice(0, 500), {
          left: docSizeRef.current.width / 2,
          top: docSizeRef.current.height / 2,
          fontFamily: 'Inter',
          fill: '#111111',
          fontSize: clamp(Math.round((docSizeRef.current.width / 1080) * 48), 14, 240),
          originX: 'center',
          originY: 'center',
          name: 'Text',
        });
        canvasRef.current?.add(t);
        canvasRef.current?.setActiveObject(t);
        setMenuState('TEXT');
        toast('Text pasted', 'success');
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- actions (declared after hooks, before api) ---------------- */
  const getActive = useCallback(() => canvasRef.current?.getActiveObject() ?? activeObjRef.current ?? null, []);

  const apiAddImageFromFile = useCallback(
    (file: File) => {
      const c = canvasRef.current;
      if (!file.type.startsWith('image/') || !c) {
        if (!file.type.startsWith('image/')) toast('That file is not an image', 'error');
        return;
      }
      // Guard the memory spike — huge files are fully base64'd into memory
      if (file.size > 50 * 1024 * 1024) {
        toast('Image is too large (max 50 MB) — try downsizing it first', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        fabric.Image.fromURL(ev.target?.result as string, (img) => {
          const cv = canvasRef.current;
          if (!cv) return;
          const userObjs = cv.getObjects().filter((o) => (o as any).name !== FRAME_NAME);
          img.set({ name: 'Image' });
          if (userObjs.length === 0) {
            // First image defines the document (pixel-true editing).
            // Background starts transparent (dark checker) so nothing ever
            // flashes white behind the photo when it is moved around.
            const natW = img.width || 1080;
            const natH = img.height || 1080;
            const scale = Math.min(1, 6000 / Math.max(natW, natH));
            const w = Math.max(1, Math.round(natW * scale));
            const h = Math.max(1, Math.round(natH * scale));
            img.set({ scaleX: scale, scaleY: scale, left: 0, top: 0, originX: 'left', originY: 'top' });
            applyDocSize(w, h, { fit: false });
            setDocBgState({ kind: 'transparent' });
            frameRef.current?.set({ fill: getCheckerPattern(), onyxBgCss: undefined, onyxBgTransparent: true } as any);
            cv.add(img);
            if (projectNameRef.current.startsWith('Untitled')) {
              setProjectName(file.name.replace(/\.[^.]+$/, ''));
            }
            requestAnimationFrame(() => zoomFitFn());
          } else {
            img.scaleToWidth(Math.min(docSizeRef.current.width * 0.7, 900));
            cv.add(img);
            cv.centerObject(img);
          }
          cv.setActiveObject(img);
          cv.requestRenderAll();
          toast('Image added', 'success');
        });
      };
      reader.readAsDataURL(file);
    },
    [applyDocSize, zoomFitFn, setProjectName, toast]
  );

  const openFilePicker = useCallback(() => fileInputRef.current?.click(), []);
  const openBgPickerFn = useCallback(() => bgInputRef.current?.click(), []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) apiAddImageFromFile(f);
      e.target.value = '';
    },
    [apiAddImageFromFile]
  );

  const handleBgInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    const c = canvasRef.current;
    if (!f || !c) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      fabric.Image.fromURL(ev.target?.result as string, (img) => {
        const cv = canvasRef.current;
        if (!cv) return;
        const { width: dw, height: dh } = docSizeRef.current;
        isLockedRef.current = true;
        try {
          // Replace any existing background-image layer
          cv.getObjects().filter((o) => (o as any).onyxBgImage).forEach((o) => cv.remove(o));
          const s = Math.max(dw / (img.width || 1), dh / (img.height || 1));
          img.scale(s);
          img.set({
            originX: 'left',
            originY: 'top',
            left: 0,
            top: 0,
            name: 'Background',
            selectable: false,
            evented: false,
          } as any);
          (img as any).onyxBgImage = true;
          // A real layer directly above the frame: visible in the editor, included
          // in exports, listed in Layers — the canvas-level backgroundImage would be
          // painted underneath the opaque frame and stay invisible.
          cv.add(img);
          const liveObjs = (cv as any)._objects as fabric.Object[];
          const from = liveObjs.indexOf(img);
          const fi = liveObjs.findIndex((o) => (o as any).name === FRAME_NAME);
          if (fi >= 0 && from > fi + 1) {
            liveObjs.splice(from, 1);
            liveObjs.splice(fi + 1, 0, img);
            img._set('dirty', true);
          }
          cv.requestRenderAll();
        } finally {
          isLockedRef.current = false;
        }
        // History/save OUTSIDE the lock — saveHistory is a no-op while locked
        updateLayersNow();
        saveHistory();
        scheduleSaveRef.current();
        toast('Background image set', 'success');
      });
    };
    reader.readAsDataURL(f);
    e.target.value = '';
  }, [toast, updateLayersNow, saveHistory]);

  /* filter stack ops */
  const setAdjustment = useCallback(
    (key: AdjustmentKey, value: number) => {
      const obj = getActive();
      if (!obj || obj.type !== 'image') return;
      const img = obj as fabric.Image;
      const type = ADJUST_TYPE[key];
      img.filters = (img.filters || []).filter((f: any) => f?.type !== type);
      if (value !== 0) {
        const def = ADJUSTMENTS.find((a) => a.key === key)!;
        img.filters.push(def.make(value));
      }
      img.applyFilters();
      setEditorState((prev) => ({ ...prev, [key]: value }));
      canvasRef.current?.requestRenderAll();
      scheduleSaveRef.current();
    },
    [getActive]
  );

  const adjustImage = useCallback(
    (key: string, value: number) => setAdjustment(key as AdjustmentKey, value),
    [setAdjustment]
  );

  const applyFilterPreset = useCallback(
    (name: string) => {
      const obj = getActive();
      if (!obj || obj.type !== 'image') return;
      const img = obj as fabric.Image;
      const preset = FILTER_PRESETS.find((p) => p.name === name);
      if (!preset) return;
      img.filters = (img.filters || []).filter((f: any) => !f?.onyxPreset);
      const f = preset.make() as any;
      if (f) {
        f.onyxPreset = name;
        img.filters.push(f);
      }
      img.applyFilters();
      setEditorState((prev) => ({ ...prev, filterPreset: name }));
      canvasRef.current?.requestRenderAll();
      commitHistory();
      toast(`Filter: ${name}`, 'info');
    },
    [getActive, commitHistory, toast]
  );

  const toggleRemoveColor = useCallback(
    (on: boolean) => {
      const obj = getActive();
      if (!obj || obj.type !== 'image') return;
      const img = obj as fabric.Image;
      img.filters = (img.filters || []).filter((f: any) => !f?.onyxRemove);
      if (on) {
        const f = new (fabric.Image.filters as any).RemoveColor({
          color: editorState.removeColorHex,
          distance: editorState.removeColorDist,
        }) as any;
        f.onyxRemove = true;
        img.filters.push(f);
      }
      img.applyFilters();
      setEditorState((prev) => ({ ...prev, removeColorOn: on }));
      canvasRef.current?.requestRenderAll();
      commitHistory();
    },
    [getActive, editorState.removeColorHex, editorState.removeColorDist, commitHistory]
  );

  const setRemoveColor = useCallback(
    (hex: string, dist: number) => {
      const obj = getActive();
      if (!obj || obj.type !== 'image') return;
      const img = obj as fabric.Image;
      img.filters = (img.filters || []).map((f: any) => {
        if (f?.onyxRemove) {
          f.color = hex;
          f.distance = dist;
        }
        return f;
      });
      img.applyFilters();
      setEditorState((prev) => ({ ...prev, removeColorHex: hex, removeColorDist: dist }));
      canvasRef.current?.requestRenderAll();
      scheduleSaveRef.current();
    },
    [getActive]
  );

  const holdCompare = useCallback(
    (hold: boolean) => {
      const obj = getActive();
      if (!obj || obj.type !== 'image') return;
      const img = obj as fabric.Image;
      if (hold) {
        if (compareStashRef.current) return;
        compareStashRef.current = img.filters || [];
        img.filters = [];
      } else {
        if (!compareStashRef.current) return;
        img.filters = compareStashRef.current;
        compareStashRef.current = null;
      }
      img.applyFilters();
      canvasRef.current?.requestRenderAll();
    },
    [getActive]
  );

  /* object ops */
  const updateStyle = useCallback(
    (key: keyof EditorState, v: any) => {
      setEditorState((prev) => ({ ...prev, [key]: v }));
      const obj = getActive();
      const c = canvasRef.current;
      if (!obj || !c) return;
      switch (key) {
        case 'fill': obj.set('fill', v); break;
        case 'strokeC': obj.set('stroke', v); break;
        case 'strokeW': obj.set('strokeWidth', parseInt(v) || 0); break;
        case 'bg': obj.set('backgroundColor', v); break;
        case 'font': (obj as any).set('fontFamily', v); break;
        case 'fontSize': (obj as any).set('fontSize', v); break;
        case 'charSpacing': (obj as any).set('charSpacing', v); break;
        case 'lineHeight': (obj as any).set('lineHeight', v); break;
        case 'opacity': obj.set('opacity', parseFloat(v)); break;
        case 'radius': if (obj.type === 'rect') (obj as any).set({ rx: parseInt(v) || 0, ry: parseInt(v) || 0 }); break;
        case 'shadowB':
        case 'shadowO':
        case 'shadowC': {
          const cur = (obj.shadow as fabric.Shadow) || { blur: 0, offsetX: 10, color: '#000000' };
          obj.set(
            'shadow',
            new fabric.Shadow({
              color: key === 'shadowC' ? v : cur.color || '#000000',
              blur: key === 'shadowB' ? parseInt(v) || 0 : cur.blur || 0,
              offsetX: key === 'shadowO' ? parseInt(v) || 0 : cur.offsetX || 10,
              offsetY: key === 'shadowO' ? parseInt(v) || 0 : cur.offsetY || 10,
            })
          );
          break;
        }
        case 'brushS': brushStateRef.current.size = v; if ((c as any).isDrawingMode && c.freeDrawingBrush) c.freeDrawingBrush.width = v; break;
        case 'brushC': brushStateRef.current.color = v; if ((c as any).isDrawingMode && c.freeDrawingBrush) c.freeDrawingBrush.color = v; break;
      }
      c.requestRenderAll();
      scheduleSaveRef.current();
    },
    [getActive]
  );

  const handleTextFormat = useCallback(
    (t: 'bold' | 'italic' | 'underline' | 'align-left' | 'align-center' | 'align-right') => {
      const obj = getActive();
      const c = canvasRef.current;
      if (!obj || (obj.type !== 'i-text' && obj.type !== 'text') || !c) return;
      const text = obj as fabric.IText;
      switch (t) {
        case 'bold': text.set('fontWeight', text.fontWeight === 'bold' ? 'normal' : 'bold'); break;
        case 'italic': text.set('fontStyle', text.fontStyle === 'italic' ? 'normal' : 'italic'); break;
        case 'underline': text.set('underline', !text.underline); break;
        case 'align-left': text.set('textAlign', 'left'); break;
        case 'align-center': text.set('textAlign', 'center'); break;
        case 'align-right': text.set('textAlign', 'right'); break;
      }
      c.requestRenderAll();
      scheduleSaveRef.current();
    },
    [getActive]
  );

  const addText = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const t = new fabric.IText('Tap to edit', {
      left: docSizeRef.current.width / 2,
      top: docSizeRef.current.height / 2,
      fontFamily: 'Inter',
      fill: '#111111',
      fontSize: clamp(Math.round((docSizeRef.current.width / 1080) * 48), 14, 240),
      originX: 'center',
      originY: 'center',
      name: 'Text',
    });
    c.add(t);
    c.setActiveObject(t);
    setMenuState('TEXT');
  }, []);

  const addShape = useCallback((type: 'rect' | 'circle' | 'tri') => {
    const c = canvasRef.current;
    if (!c) return;
    const base = Math.round((docSizeRef.current.width / 1080) * 180);
    const opts = {
      left: docSizeRef.current.width / 2,
      top: docSizeRef.current.height / 2,
      fill: '#6366f1',
      originX: 'center',
      originY: 'center',
      name: TYPE_LABEL[type === 'tri' ? 'triangle' : type] || 'Shape',
    };
    const s =
      type === 'rect'
        ? new fabric.Rect({ width: base, height: base, ...opts })
        : type === 'circle'
          ? new fabric.Circle({ radius: base / 2, ...opts })
          : new fabric.Triangle({ width: base, height: base, ...opts });
    c.add(s);
    c.setActiveObject(s);
    setMenuState('STYLE');
  }, []);

  const addSticker = useCallback((s: string) => {
    const c = canvasRef.current;
    if (!c) return;
    const t = new fabric.Text(s, {
      fontSize: clamp(Math.round((docSizeRef.current.width / 1080) * 140), 40, 500),
      left: docSizeRef.current.width / 2,
      top: docSizeRef.current.height / 2,
      originX: 'center',
      originY: 'center',
      name: 'Sticker',
    });
    c.add(t);
    c.setActiveObject(t);
  }, []);

  /** Custom polygon with n sides (3–20) or an n-point star */
  const addPolygon = useCallback((sides: number, star = false) => {
    const c = canvasRef.current;
    if (!c) return;
    const n = clamp(Math.round(sides), 3, 20);
    const base = Math.round((docSizeRef.current.width / 1080) * 220);
    const points = star
      ? starPoints(n, base / 2, base / 2 * 0.42)
      : polygonPoints(n, base / 2);
    const p = new fabric.Polygon(points, {
      left: docSizeRef.current.width / 2,
      top: docSizeRef.current.height / 2,
      originX: 'center',
      originY: 'center',
      fill: '#6366f1',
      name: star ? `${n}-point star` : `${n}-gon`,
    } as any);
    c.add(p);
    c.setActiveObject(p);
    setMenuState('STYLE');
  }, []);

  /* ---------------- border stack (fancy multi-borders) ---------------- */

  const computeRings = (cfg: BorderStackConfig): BorderRing[] => {
    const n = clamp(Math.round(cfg.count), 1, 6);
    if (cfg.mode === 'custom' && cfg.rings?.length) {
      return cfg.rings.slice(0, n).map((r) => ({ width: clamp(r.width, 1, 60), color: r.color }));
    }
    const rings: BorderRing[] = [];
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0 : i / (n - 1);
      rings.push({
        width: cfg.widthMin + (cfg.widthMax - cfg.widthMin) * t,
        color: mixHex(cfg.colorA, cfg.colorB, t),
      });
    }
    return rings;
  };

  /** Unwrap a border-ring group → returns the core object (rings are dropped) */
  const unwrapRingGroup = useCallback((c: fabric.Canvas, group: fabric.Group): fabric.Object | null => {
    const items = [...group.getObjects()];
    group.destroy();
    (group as any)._objects = [];
    c.remove(group);
    let core: fabric.Object | null = null;
    items.forEach((o) => {
      if ((o as any).onyxRingPart) return;
      c.add(o);
      o.setCoords();
      core = o;
    });
    return core;
  }, []);

  /**
   * Wrap the selected object in a stack of concentric outline rings.
   * Re-applying on an existing ring group edits it (unwrap → re-wrap).
   */
  const applyBorderStack = useCallback(
    async (cfg: BorderStackConfig) => {
      const c = canvasRef.current;
      if (!c) return;
      let target = getActive();
      if (!target) {
        toast('Select an object first', 'warning');
        return;
      }
      if ((target as any).type === 'activeSelection') {
        toast('Select a single object to border it', 'warning');
        return;
      }

      // Lock the WHOLE operation (unwrap included) so object:added / object:removed
      // don't push spurious history entries with the core object missing.
      isLockedRef.current = true;
      const ringObjs: fabric.Object[] = [];
      try {
        if (target.type === 'group' && (target as any).onyxRing) {
          const core = unwrapRingGroup(c, target as fabric.Group);
          if (!core) return;
          target = core;
        } else if (target.type === 'group') {
          toast('Borders work on single objects', 'warning');
          return;
        }

        const rings = computeRings(cfg);
        if (!rings.length) return;

        const bw = target.getScaledWidth();
        const bh = target.getScaledHeight();
        if (bw < 4 || bh < 4) {
          toast('Object is too small to border', 'warning');
          return;
        }
        const center = target.getCenterPoint();
        const angle = target.angle || 0;

        const cloneObj = (o: fabric.Object) =>
          new Promise<fabric.Object | null>((res) => {
            try {
              o.clone((cl: fabric.Object) => res(cl));
            } catch {
              res(null);
            }
          });

        // Build ring objects: outermost added first (bottom of stack)
        let offset = 0;
        for (let i = 0; i < rings.length; i++) {
          const { width, color } = rings[i];
          offset += width / 2;
          const ringW = bw + 2 * offset;
          const ringH = bh + 2 * offset;
          let ring: fabric.Object | null = null;
          if (target!.type === 'image') {
            const natW = (target as fabric.Image).width || bw;
            const natH = (target as fabric.Image).height || bh;
            ring = new fabric.Rect({
              width: natW,
              height: natH,
              // images usually display scaled — match the ring to the on-screen size
              scaleX: ringW / natW,
              scaleY: ringH / natH,
              originX: 'center',
              originY: 'center',
              left: center.x,
              top: center.y,
              angle,
              fill: 'transparent',
              stroke: color,
              strokeWidth: width,
              strokeUniform: true,
              strokeLineJoin: 'round',
            } as any);
          } else {
            ring = await cloneObj(target!);
            if (ring) {
              ring.set({
                originX: 'center',
                originY: 'center',
                left: center.x,
                top: center.y,
                angle,
                scaleX: ringW / ((target as any).width || bw),
                scaleY: ringH / ((target as any).height || bh),
                fill: 'transparent',
                stroke: color,
                strokeWidth: width,
                strokeUniform: true,
                strokeLineJoin: 'round',
                shadow: null,
                backgroundColor: 'transparent',
                opacity: 1,
              } as any);
            }
          }
          if (ring) {
            (ring as any).onyxRingPart = true;
            (ring as any).selectable = false;
            ringObjs.unshift(ring); // unshift → outermost ends up first
          }
          offset += cfg.gap; // gap before the next ring
        }

        if (!ringObjs.length) return;

        c.remove(target!);
        const group = new fabric.Group([...ringObjs, target!], {
          name: `${(target as any).name || 'Object'} · bordered`,
        } as any);
        (group as any).onyxRing = true;
        (group as any).onyxRingCfg = cfg;
        c.add(group);
        c.setActiveObject(group);
        c.requestRenderAll();
      } finally {
        isLockedRef.current = false;
      }
      // History/save OUTSIDE the lock — saveHistory is a no-op while locked
      updateLayersNow();
      saveHistory();
      scheduleSaveRef.current();
      toast(`Applied ${ringObjs.length} border${ringObjs.length > 1 ? 's' : ''}`, 'success');
    },
    [getActive, unwrapRingGroup, updateLayersNow, saveHistory, toast]
  );

  /** Remove a border stack, restoring the original object */
  const removeBorderStack = useCallback(() => {
    const c = canvasRef.current;
    const obj = getActive();
    if (!c || !obj) return;
    if (obj.type !== 'group' || !(obj as any).onyxRing) {
      toast('Select a bordered object first', 'warning');
      return;
    }
    isLockedRef.current = true;
    try {
      const core = unwrapRingGroup(c, obj as fabric.Group);
      c.requestRenderAll();
      if (core) c.setActiveObject(core);
    } finally {
      isLockedRef.current = false;
    }
    // History/save OUTSIDE the lock — saveHistory is a no-op while locked
    updateLayersNow();
    saveHistory();
    scheduleSaveRef.current();
    toast('Borders removed', 'info');
  }, [getActive, unwrapRingGroup, updateLayersNow, saveHistory, toast]);

  /* ---------------- advanced fills (gradient / image) ---------------- */

  /** Fill the selected object with a CSS gradient (any number of stops) */
  const setObjectGradientFill = useCallback(
    (css: string) => {
      const obj = getActive();
      const c = canvasRef.current;
      if (!obj || !c) return;
      const w = (obj as any).width || 100;
      const h = (obj as any).height || 100;
      const grad = buildFrameGradient(css, w, h);
      obj.set({ fill: grad } as any);
      c.requestRenderAll();
      scheduleSaveRef.current();
      commitHistory();
    },
    [getActive, commitHistory]
  );

  /** Fill the selected object with an image pattern (cover) */
  const setObjectImageFill = useCallback(
    (dataUrl: string) => {
      const obj = getActive();
      const c = canvasRef.current;
      if (!obj || !c) return;
      const w = Math.max(8, Math.round((obj as any).width || 200));
      const h = Math.max(8, Math.round((obj as any).height || 200));
      fabric.Image.fromURL(dataUrl, (img) => {
        const src = document.createElement('canvas');
        src.width = w;
        src.height = h;
        const ctx = src.getContext('2d')!;
        // cover-fit the image into the pattern tile
        const s = Math.max(w / (img.width || w), h / (img.height || h));
        const dw = (img.width || w) * s;
        const dh = (img.height || h) * s;
        ctx.drawImage(img.getElement(), (w - dw) / 2, (h - dh) / 2, dw, dh);
        const pattern = new fabric.Pattern({ source: src as any, repeat: 'no-repeat' });
        obj.set({ fill: pattern } as any);
        c.requestRenderAll();
        scheduleSaveRef.current();
        commitHistory();
        toast('Image fill applied', 'success');
      });
    },
    [getActive, commitHistory, toast]
  );

  /** Back to a plain solid fill */
  const setObjectSolidFill = useCallback(
    (color: string) => {
      const obj = getActive();
      const c = canvasRef.current;
      if (!obj || !c) return;
      obj.set({ fill: color === 'transparent' ? '' : color } as any);
      c.requestRenderAll();
      scheduleSaveRef.current();
      commitHistory();
    },
    [getActive, commitHistory]
  );

  /* ---------------- layer position ---------------- */

  /** Move a layer to an absolute index within the user-layer stack (0 = bottom) */
  const setLayerIndex = useCallback(
    (obj: fabric.Object, idx: number, commit = true) => {
      const c = canvasRef.current;
      if (!c) return;
      // NB: c.getObjects() returns a COPY — reorder the live internal array instead
      const objs = (c as any)._objects as fabric.Object[];
      const from = objs.indexOf(obj);
      if (from < 0) return;
      const userObjs = objs.filter((o) => (o as any).name !== FRAME_NAME);
      const userIdx = userObjs.indexOf(obj);
      const newUserIdx = clamp(Math.round(idx), 0, userObjs.length - 1);
      if (newUserIdx === userIdx) return;
      const target = userObjs[newUserIdx];
      objs.splice(from, 1);
      let insertAt = objs.length;
      if (target && target !== obj) {
        const tIdx = objs.indexOf(target);
        if (tIdx >= 0) insertAt = newUserIdx > userIdx ? tIdx + 1 : tIdx;
      }
      objs.splice(insertAt, 0, obj);
      obj._set('dirty', true);
      c.requestRenderAll();
      updateLayersNow();
      if (commit) {
        commitHistory();
        scheduleSaveRef.current();
      } else {
        scheduleSaveRef.current();
      }
    },
    [updateLayersNow, commitHistory]
  );

  /** Rename a layer (persisted as the object name) */
  const renameLayer = useCallback(
    (obj: fabric.Object, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      (obj as any).set({ name: trimmed.slice(0, 40) });
      updateLayersNow();
      scheduleSaveRef.current();
      commitHistory();
    },
    [updateLayersNow, commitHistory]
  );

  /** Remove the background image (back to color/gradient bg) */
  const clearBgImage = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const bgLayers = c.getObjects().filter((o) => (o as any).onyxBgImage);
    if (!bgLayers.length && !(c as any).backgroundImage) {
      toast('No background image set', 'info');
      return;
    }
    isLockedRef.current = true;
    try {
      bgLayers.forEach((o) => c.remove(o));
      (c as any).backgroundImage = null; // legacy saves
      c.requestRenderAll();
    } finally {
      isLockedRef.current = false;
    }
    // History/save OUTSIDE the lock — saveHistory is a no-op while locked
    updateLayersNow();
    saveHistory();
    scheduleSaveRef.current();
    toast('Background image removed', 'info');
  }, [updateLayersNow, saveHistory, toast]);

  const addSolidLayer = useCallback((color: string) => {
    const c = canvasRef.current;
    if (!c) return;
    const { width: dw, height: dh } = docSizeRef.current;
    const rect = new fabric.Rect({
      width: dw,
      height: dh,
      fill: color,
      left: 0,
      top: 0,
      originX: 'left',
      originY: 'top',
      name: 'Color layer',
    });
    c.add(rect);
    c.setActiveObject(rect);
    setMenuState('STYLE');
  }, []);

  const addGradientLayer = useCallback((gradient: string) => {
    const c = canvasRef.current;
    if (!c) return;
    const { width: dw, height: dh } = docSizeRef.current;
    // Full CSS parsing (direction + N stops) so the layer matches the preview
    const grad = buildFrameGradient(gradient, dw, dh);
    const rect = new fabric.Rect({
      width: dw,
      height: dh,
      fill: grad,
      left: 0,
      top: 0,
      originX: 'left',
      originY: 'top',
      name: 'Gradient layer',
    });
    c.add(rect);
    c.setActiveObject(rect);
    setMenuState('STYLE');
  }, []);

  const updateTransform = useCallback(
    (patch: { left?: number; top?: number; scaleX?: number; scaleY?: number; angle?: number }) => {
      const obj = getActive();
      const c = canvasRef.current;
      if (!obj || !c) return;
      obj.set(patch as any);
      obj.setCoords();
      c.requestRenderAll();
      scheduleSaveRef.current();
      commitHistory();
    },
    [getActive, commitHistory]
  );

  const apiToggleDraw = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const on = !(c as any).isDrawingMode;
    (c as any).isDrawingMode = on;
    if (on) {
      const brush = new fabric.PencilBrush(c);
      brush.width = brushStateRef.current.size;
      brush.color = brushStateRef.current.color;
      c.freeDrawingBrush = brush;
      setIsDrawing(true);
      c.discardActiveObject();
      setMenuState('DRAW');
      c.requestRenderAll();
    } else {
      setIsDrawing(false);
      setMenuState('HOME');
      c.requestRenderAll();
    }
  }, []);

  const apiDuplicate = useCallback(() => {
    const c = canvasRef.current;
    const obj = getActive();
    if (!c || !obj) return;
    obj.clone((cloned: any) => {
      cloned.set({ left: (cloned.left || 0) + 24, top: (cloned.top || 0) + 24, evented: true });
      if (cloned.type === 'activeSelection') {
        cloned.canvas = c;
        cloned.forEachObject((o: fabric.Object) => c.add(o));
        cloned.setCoords();
      } else {
        c.add(cloned);
      }
      c.setActiveObject(cloned);
      c.requestRenderAll();
    });
  }, [getActive]);

  const pasteClipboard = useCallback(() => {
    const c = canvasRef.current;
    const src = clipboardRef.current;
    if (!c || !src) return;
    src.clone((cloned: any) => {
      cloned.set({ left: (cloned.left || 0) + 32, top: (cloned.top || 0) + 32, evented: true });
      c.add(cloned);
      c.setActiveObject(cloned);
      c.requestRenderAll();
    });
  }, []);

  /** Remove a single object or every object inside an ActiveSelection (multi-select) */
  const apiDeleteObjects = useCallback((a: fabric.Object) => {
    const c = canvasRef.current;
    if (!c) return;
    // Batch the removal so history/save fire once, not per object
    isLockedRef.current = true;
    try {
      if ((a as any).type === 'activeSelection') {
        const members = [...(a as any).getObjects()];
        c.discardActiveObject();
        members.forEach((o) => c.remove(o));
      } else {
        c.discardActiveObject();
        c.remove(a);
      }
      c.requestRenderAll();
    } finally {
      isLockedRef.current = false;
    }
    // History/save OUTSIDE the lock — saveHistory is a no-op while locked
    updateLayersNow();
    saveHistory();
    scheduleSaveRef.current();
  }, [updateLayersNow, saveHistory]);

  const deleteSelected = useCallback(() => {
    const obj = getActive();
    if (!obj) return;
    apiDeleteObjects(obj);
  }, [getActive, apiDeleteObjects]);

  const flip = useCallback(
    (axis: 'X' | 'Y') => {
      const obj = getActive();
      if (!obj) return;
      if (axis === 'X') obj.set('flipX', !obj.flipX);
      else obj.set('flipY', !obj.flipY);
      obj.setCoords();
      canvasRef.current?.requestRenderAll();
      scheduleSaveRef.current();
      commitHistory();
    },
    [getActive, commitHistory]
  );

  const rotate90 = useCallback(
    (dir: 1 | -1) => {
      const obj = getActive();
      if (!obj) return;
      obj.rotate(((obj.angle || 0) + 90 * dir) % 360);
      obj.setCoords();
      canvasRef.current?.requestRenderAll();
      commitHistory();
    },
    [getActive, commitHistory]
  );

  const lockToggle = useCallback(() => {
    const obj = getActive();
    const c = canvasRef.current;
    if (!obj || !c) return;
    const locked = !obj.lockMovementX;
    obj.set({
      lockMovementX: locked,
      lockMovementY: locked,
      lockRotation: locked,
      lockScalingX: locked,
      lockScalingY: locked,
      hasControls: !locked,
    });
    updateLayersNow();
    c.requestRenderAll();
    commitHistory();
    toast(locked ? 'Layer locked' : 'Layer unlocked', 'info');
  }, [getActive, commitHistory, updateLayersNow, toast]);

  const apiOrder = useCallback(
    (action: 'front' | 'back' | 'forward' | 'backward') => {
      const obj = getActive();
      const c = canvasRef.current;
      if (!obj || !c) return;
      // NB: c.getObjects() returns a COPY — reorder the live internal array instead
      const liveObjs = (c as any)._objects as fabric.Object[];
      switch (action) {
        case 'front': obj.bringToFront(); break;
        case 'back': {
          // "To bottom" = bottom of the USER stack, always just above the frame.
          // obj.sendToBack() would land under the opaque frame (invisible), and an
          // ActiveSelection isn't in _objects at all (indexOf → -1 → data loss).
          const moveAboveFrame = (o: fabric.Object) => {
            const from = liveObjs.indexOf(o);
            if (from < 0) return;
            liveObjs.splice(from, 1);
            const fi = liveObjs.findIndex((x) => (x as any).name === FRAME_NAME);
            liveObjs.splice(fi < 0 ? liveObjs.length : fi + 1, 0, o);
            o._set('dirty', true);
          };
          if ((obj as any).type === 'activeSelection') {
            const members = [...(obj as any).getObjects()];
            c.discardActiveObject();
            // process bottom-first so the members keep their relative order
            members.slice().reverse().forEach(moveAboveFrame);
            c.setActiveObject(new fabric.ActiveSelection(members, { canvas: c }));
          } else {
            moveAboveFrame(obj);
          }
          c.requestRenderAll();
          break;
        }
        case 'forward': obj.bringForward(); break;
        case 'backward': {
          // fabric's sendBackwards can drop objects BELOW the frame (idx 0) —
          // guard the floor at frameIdx + 1. Handles single + multi-select.
          const frameIdx = liveObjs.findIndex((x) => (x as any).name === FRAME_NAME);
          const floor = frameIdx + 1;
          const members = (obj as any).type === 'activeSelection' ? [...(obj as any).getObjects()] : [obj];
          let stepped = 0;
          for (const o of members) {
            const idx = liveObjs.indexOf(o);
            if (idx >= floor + 1 + stepped) {
              liveObjs.splice(idx, 1);
              liveObjs.splice(idx - 1, 0, o);
              o._set('dirty', true);
            }
            stepped++;
          }
          c.requestRenderAll();
          break;
        }
      }
      updateLayersNow();
      commitHistory();
    },
    [getActive, commitHistory, updateLayersNow]
  );

  const align = useCallback(
    (mode: 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom') => {
      const obj = getActive();
      if (!obj) return;
      const { width: dw, height: dh } = docSizeRef.current;
      const bw = obj.getScaledWidth();
      const bh = obj.getScaledHeight();
      const cx = obj.get('originX') === 'center';
      const cy = obj.get('originY') === 'center';
      switch (mode) {
        case 'left': obj.set({ left: cx ? bw / 2 : 0 }); break;
        case 'center-h': obj.set({ left: dw / 2 }); if (!cx) obj.set({ left: (dw - bw) / 2 }); break;
        case 'right': obj.set({ left: cx ? dw - bw / 2 : dw - bw }); break;
        case 'top': obj.set({ top: cy ? bh / 2 : 0 }); break;
        case 'center-v': obj.set({ top: cy ? dh / 2 : (dh - bh) / 2 }); break;
        case 'bottom': obj.set({ top: cy ? dh - bh / 2 : dh - bh }); break;
      }
      obj.setCoords();
      canvasRef.current?.requestRenderAll();
      commitHistory();
    },
    [getActive, commitHistory]
  );

  /* crop & mask */
  const apiStartCrop = useCallback(() => {
    const obj = getActive();
    if (!obj || obj.type !== 'image') {
      toast('Select an image to crop', 'warning');
      return;
    }
    setCropData((obj as fabric.Image).toDataURL({}));
  }, [getActive, toast]);

  const handleCrop = useCallback((croppedDataUrl: string) => {
    const obj = getActive();
    const c = canvasRef.current;
    if (!obj || !c) return;
    (obj as fabric.Image).setSrc(croppedDataUrl, () => {
      c?.requestRenderAll();
      setCropData(null);
      commitHistory();
      updateLayersNow();
    });
  }, [getActive, commitHistory, updateLayersNow]);

  const startMasking = useCallback(
    (maskType: 'rect' | 'circle' | 'triangle' | 'heart' | 'star') => {
      const c = canvasRef.current;
      const obj = getActive();
      if (!c || !obj || obj.type !== 'image') {
        toast('Select an image to mask', 'warning');
        return;
      }
      const img = obj as fabric.Image;
      maskTargetRef.current = img;
      const w = img.width! * img.scaleX!;
      const h = img.height! * img.scaleY!;
      const size = Math.min(w, h) * 0.8;
      const center = img.getCenterPoint();

      const commonOpts: any = {
        left: center.x,
        top: center.y,
        originX: 'center',
        originY: 'center',
        fill: 'rgba(129, 140, 248, 0.25)',
        stroke: '#818cf8',
        strokeWidth: 2,
        strokeDashArray: [6, 4],
        absolutePositioned: true,
        cornerColor: '#0f0f12',
        cornerStrokeColor: '#818cf8',
        borderColor: '#818cf8',
        cornerSize: 10,
        padding: 0,
        name: 'Mask',
      };

      let maskShape: fabric.Object | null = null;
      switch (maskType) {
        case 'circle': maskShape = new fabric.Circle({ ...commonOpts, radius: size / 2 }); break;
        case 'triangle': maskShape = new fabric.Triangle({ ...commonOpts, width: size, height: size }); break;
        case 'rect': maskShape = new fabric.Rect({ ...commonOpts, width: size, height: size }); break;
        case 'heart': {
          const p = 'M 10,30 A 20,20 0,0,1 50,30 A 20,20 0,0,1 90,30 Q 90,60 50,90 Q 10,60 10,30 z';
          maskShape = new fabric.Path(p, commonOpts);
          const b = maskShape.getBoundingRect();
          maskShape.scaleX = size / b.width;
          maskShape.scaleY = size / b.height;
          break;
        }
        case 'star': {
          const starP = 'M 100 10 L 125 80 L 195 80 L 140 120 L 160 190 L 100 150 L 40 190 L 60 120 L 5 80 L 75 80 Z';
          maskShape = new fabric.Path(starP, commonOpts);
          const sb = maskShape.getBoundingRect();
          maskShape.scaleX = size / sb.width;
          maskShape.scaleY = size / sb.height;
          break;
        }
      }

      if (maskShape) {
        c.add(maskShape);
        c.setActiveObject(maskShape);
        maskShapeRef.current = maskShape;
        setMenuState('MASK_EDIT');
        img.set({ selectable: false, evented: false });
        c.requestRenderAll();
      }
    },
    [getActive, toast]
  );

  const finishMasking = useCallback(
    (apply: boolean) => {
      const c = canvasRef.current;
      if (!c || !maskShapeRef.current) {
        setMenuState('HOME');
        return;
      }
      const targetImg = maskTargetRef.current;
      const maskShape = maskShapeRef.current;

      if (targetImg && apply) {
        const maskCenter = maskShape.getCenterPoint();
        const inverseMatrix = fabric.util.invertTransform(targetImg.calcTransformMatrix());
        const localPoint = fabric.util.transformPoint(maskCenter, inverseMatrix);
        const scaleX = maskShape.scaleX! / targetImg.scaleX!;
        const scaleY = maskShape.scaleY! / targetImg.scaleY!;
        const angle = maskShape.angle! - targetImg.angle!;

        maskShape.clone((cloned: any) => {
          cloned.set({
            left: localPoint.x,
            top: localPoint.y,
            originX: 'center',
            originY: 'center',
            scaleX,
            scaleY,
            angle,
            fill: 'black',
            absolutePositioned: false,
            stroke: '',
            strokeDashArray: null,
          });
          targetImg.clipPath = cloned;
          targetImg.set({ selectable: true, evented: true });
          c.remove(maskShape);
          maskShapeRef.current = null;
          maskTargetRef.current = null;
          c.setActiveObject(targetImg);
          c.requestRenderAll();
          commitHistory();
          updateLayersNow();
          toast('Mask applied', 'success');
        });
      } else {
        if (targetImg) targetImg.set({ selectable: true, evented: true });
        c.remove(maskShape);
        maskShapeRef.current = null;
        maskTargetRef.current = null;
        c.requestRenderAll();
      }
      setMenuState('HOME');
    },
    [commitHistory, updateLayersNow, toast]
  );

  /* zoom api */
  const applyZoomCenter = useCallback((factor: number) => {
    const c = canvasRef.current;
    if (!c) return;
    const z = clamp(c.getZoom() * factor, 0.02, 8);
    c.zoomToPoint(new fabric.Point(c.getWidth() / 2, c.getHeight() / 2), z);
    setZoomState(z);
  }, []);

  const apiZoomIn = useCallback(() => applyZoomCenter(1.25), [applyZoomCenter]);
  const apiZoomOut = useCallback(() => applyZoomCenter(0.8), [applyZoomCenter]);
  const apiZoom100 = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const z = 1;
    c.setViewportTransform([z, 0, 0, z, (c.getWidth() - docSizeRef.current.width * z) / 2, (c.getHeight() - docSizeRef.current.height * z) / 2]);
    setZoomState(z);
  }, []);
  const zoomFitApi = useCallback(() => zoomFitFn(), [zoomFitFn]);

  /* layers api */
  const selectLayer = useCallback((obj: fabric.Object) => {
    const c = canvasRef.current;
    if (!c) return;
    c.setActiveObject(obj);
    c.requestRenderAll();
  }, []);

  const toggleLayerVisibility = useCallback((obj: fabric.Object) => {
    obj.set('visible', obj.visible === false);
    canvasRef.current?.requestRenderAll();
    updateLayersNow();
    scheduleSaveRef.current();
    commitHistory();
  }, [updateLayersNow, commitHistory]);

  const reorderLayer = useCallback((obj: fabric.Object, dir: 'up' | 'down') => {
    // Reuse the guarded order logic so 'down' can never push a layer below the frame
    if (dir === 'up') {
      obj.bringForward();
      canvasRef.current?.requestRenderAll();
      updateLayersNow();
      commitHistory();
      return;
    }
    apiOrder('backward');
  }, [updateLayersNow, commitHistory, apiOrder]);

  /* export api */
  const exportImage = useCallback(
    async (opts: ExportOptions) => {
      const heavy = (opts.targetW || docSizeRef.current.width * (opts.scale || 1)) * (opts.targetH || docSizeRef.current.height * (opts.scale || 1)) > 40e6;
      if (heavy) toast('Rendering large export — hold on…', 'info');
      let out: { url: string; w: number; h: number } = { url: '', w: 0, h: 0 };
      try {
        out = renderDocDataURL({
          format: opts.format,
          quality: opts.quality,
          scale: opts.scale,
          targetWidth: opts.targetW,
          targetHeight: opts.targetH,
          transparent: opts.transparent,
          shape: opts.shape,
        });
      } catch {
        toast('Export failed — try a smaller size', 'error');
        return;
      }
      if (!out.url || out.url.length < 64) {
        toast('Export failed — this device can not render that size', 'error');
        return;
      }
      const ext = opts.format === 'jpeg' ? 'jpg' : opts.format;
      if (opts.mode === 'copy') {
        try {
          const blob = await (await fetch(out.url)).blob();
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          toast('Copied to clipboard', 'success');
        } catch {
          toast('Clipboard not available in this browser', 'error');
        }
      } else {
        const link = document.createElement('a');
        link.download = `${slugify(projectNameRef.current)}${opts.shape && opts.shape !== 'none' ? `-${opts.shape}` : ''}.${ext}`;
        link.href = out.url;
        link.click();
        // Report the REAL (capped) dimensions, not the requested ones
        toast(`Exported ${out.w} × ${out.h} ${ext.toUpperCase()}`, 'success');
      }
      scheduleSaveRef.current();
    },
    [renderDocDataURL, toast]
  );

  const renameProject = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      setProjectName(trimmed);
      if (projectIdRef.current) {
        updateProject(projectIdRef.current, canvasRef.current ? canvasToJson(canvasRef.current) : JSON.stringify({}), undefined, trimmed).catch(() => {});
      }
      scheduleSaveRef.current();
      toast('Project renamed', 'success');
    },
    [setProjectName, toast]
  );

  /* ---------------------------------------------------------------- */
  /* API object                                                        */
  /* ---------------------------------------------------------------- */
  const api: EditorAPI = useMemo(
    () => ({
      activeObj,
      menu,
      setMenu,
      subTool,
      setSubTool,
      editorState,
      layers,
      docSize,
      docBg,
      zoom,
      projectName,
      canUndo,
      canRedo,
      saveState,
      isDrawing,
      isMobile,
      updateStyle,
      handleTextFormat,
      addImageFromFile: apiAddImageFromFile,
      openFilePicker,
      adjustImage,
      applyFilterPreset,
      toggleRemoveColor,
      setRemoveColor,
      startCrop: apiStartCrop,
      startMasking,
      finishMasking,
      holdCompare,
      setDocSize: (w, h) => {
        applyDocSize(Math.max(16, Math.round(w)), Math.max(16, Math.round(h)), { centerContent: true });
        commitHistory();
      },
      setDocBackground,
      openBgPicker: openBgPickerFn,
      clearBgImage,
      zoomIn: apiZoomIn,
      zoomOut: apiZoomOut,
      zoomFit: zoomFitApi,
      zoom100: apiZoom100,
      addText,
      addShape,
      addPolygon,
      addSticker,
      addSolidLayer,
      addGradientLayer,
      setObjectGradientFill,
      setObjectImageFill,
      setObjectSolidFill,
      applyBorderStack: (cfg: BorderStackConfig) => void applyBorderStack(cfg),
      removeBorderStack,
      updateTransform,
      toggleDraw: apiToggleDraw,
      duplicate: apiDuplicate,
      deleteSelected,
      flip,
      rotate90,
      lockToggle,
      order: apiOrder,
      align,
      selectLayer,
      toggleLayerVisibility,
      reorderLayer,
      setLayerIndex,
      renameLayer,
      undo,
      redo,
      commitHistory,
      openExport: () => setMenuState('EXPORT'),
      exportImage,
      renameProject,
      goHome: () => router.push('/'),
      openDashboardSidebar: () => setSidebarOpen(true),
      openShortcuts: () => setShortcutsOpen(true),
      openPalette: () => setPaletteOpen(true),
      fileInputRef,
    }),
    [
      activeObj, menu, setMenu, subTool, editorState, layers, docSize, docBg, zoom, projectName,
      canUndo, canRedo, saveState, isDrawing, isMobile, updateStyle, handleTextFormat,
      apiAddImageFromFile, openFilePicker, adjustImage, applyFilterPreset, toggleRemoveColor,
      setRemoveColor, apiStartCrop, startMasking, finishMasking, holdCompare, applyDocSize,
      commitHistory, setDocBackground, openBgPickerFn, apiZoomIn, apiZoomOut, zoomFitApi,
      apiZoom100, addText, addShape, addSticker, addSolidLayer, addGradientLayer, updateTransform,
      apiToggleDraw, apiDuplicate, deleteSelected,
      flip, rotate90, lockToggle, apiOrder, align, selectLayer, toggleLayerVisibility,
      reorderLayer, setLayerIndex, renameLayer, clearBgImage, addPolygon,
      applyBorderStack, removeBorderStack, setObjectGradientFill, setObjectImageFill, setObjectSolidFill,
      undo, redo, exportImage, renameProject, router,
    ]
  );

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */
  const sheetOpen = isMobile && menu !== 'HOME' && menu !== 'EXPORT';

  return (
    <EditorProvider api={api}>
      <div className={`relative flex h-[100dvh] w-full flex-col overflow-hidden bg-onyx-950 font-sans text-zinc-100 ${className}`}>
        {/* Crop takes over the whole viewport */}
        {cropData && (
          <CropModal src={cropData} onCancel={() => setCropData(null)} onCrop={handleCrop} />
        )}

        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} currentProjectId={projectIdRef.current || undefined} />

        <TopBar />

        <div className="relative flex min-h-0 flex-1">
          {!isMobile && <DesktopRail />}

          {/* Canvas viewport */}
          <div
            ref={wrapperRef}
            className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[#0c0c0f]"
            style={{ touchAction: 'none' }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) apiAddImageFromFile(f);
            }}
          >
            <canvas ref={containerRef} />

            {/* Dropzone ring */}
            {dragOver && (
              <div className="pointer-events-none absolute inset-3 z-20 rounded-2xl border-2 border-dashed border-indigo-400 bg-indigo-500/10">
                <div className="flex h-full items-center justify-center text-sm font-bold text-indigo-200">
                  Drop image to add it
                </div>
              </div>
            )}

            <EmptyState />

            <ZoomControls />

            {/* Mobile bottom sheet for the active tool */}
            {sheetOpen && (
              <div className="absolute inset-x-0 bottom-0 z-30 md:hidden">
                <Sheet>{menu === 'LAYERS' ? <LayersList /> : renderToolPanel(menu)}</Sheet>
              </div>
            )}
          </div>

          {/* Right properties panel (desktop) */}
          {!isMobile && <PropertiesPanel />}
        </div>

        {/* Mobile toolbar */}
        {isMobile && <MobileToolbar />}

        {/* Hidden file inputs */}
        <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileInput} />
        <input type="file" accept="image/*" ref={bgInputRef} className="hidden" onChange={handleBgInput} />

        {/* Overlays */}
        <ExportPanel open={menu === 'EXPORT'} onClose={() => setMenuState('HOME')} />
        <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      </div>
    </EditorProvider>
  );
}

/* ------------------------------------------------------------------ */
/* Mobile bottom sheet wrapper                                         */
/* ------------------------------------------------------------------ */

const Sheet: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { menu, setMenu, setSubTool, finishMasking } = useEditor();
  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 32, stiffness: 360 }}
      className="glass max-h-[46dvh] overflow-hidden rounded-t-2xl border-t border-white/10 shadow-2xl shadow-black/60"
    >
      <div className="flex items-center justify-between px-4 pb-1 pt-2.5">
        <div className="h-1 w-10 rounded-full bg-white/20" />
        <button
          onClick={() => {
            // Leaving MASK_EDIT must clean up the temp shape + unlock the target image
            if (menu === 'MASK_EDIT') finishMasking(false);
            else {
              setMenu('HOME');
              setSubTool(null);
            }
          }}
          aria-label="Close panel"
          className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
        >
          <FaXmark size={14} />
        </button>
      </div>
      <div className="max-h-[40dvh] overflow-y-auto px-4 pb-5 safe-area-pb">{children}</div>
    </motion.div>
  );
};
