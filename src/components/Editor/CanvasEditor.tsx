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
  path: 'Path',
  group: 'Group',
};

const OBJECT_TABS: MenuTab[] = ['ADJUST', 'FILTER', 'TEXT', 'STYLE', 'ARRANGE', 'MASK', 'MASK_EDIT'];

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

/** Parse a CSS gradient string into two hex stops (enough for our presets) */
const parseGradientStops = (g: string): [string, string] => {
  const colors = g.match(/#[a-fA-F0-9]{6}/g);
  return [(colors?.[0] as string) || '#000000', (colors?.[1] as string) || '#ffffff'];
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
    (w: number, h: number, opts?: { fit?: boolean }) => {
      const c = canvasRef.current;
      docSizeRef.current = { width: w, height: h };
      setDocSizeState({ width: w, height: h });
      frameRef.current?.set({ width: w, height: h });
      if (c) {
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

  /* ---------- document background ---------- */
  const setDocBackground = useCallback(
    (bg: DocBg) => {
      const c = canvasRef.current;
      const frame = frameRef.current;
      if (!c || !frame) return;
      setDocBgState(bg);
      if (bg.kind === 'color') {
        frame.set('fill', bg.value);
      } else if (bg.kind === 'transparent') {
        frame.set('fill', getCheckerPattern());
      } else {
        const [c1, c2] = parseGradientStops(bg.value);
        const isRadial = bg.value.includes('radial');
        // @ts-ignore — fabric.Gradient typing quirks
        const grad = new fabric.Gradient({
          type: isRadial ? 'radial' : 'linear',
          coords: isRadial
            ? { r1: 0, r2: docSizeRef.current.width / 2, x1: docSizeRef.current.width / 2, y1: docSizeRef.current.height / 2, x2: docSizeRef.current.width / 2, y2: docSizeRef.current.height / 2 }
            : { x1: 0, y1: 0, x2: docSizeRef.current.width, y2: 0 },
          colorStops: [
            { offset: 0, color: c1 },
            { offset: 1, color: c2 },
          ],
        });
        frame.set('fill', grad);
      }
      render();
    },
    [render]
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
      json: JSON.stringify(c.toJSON(['selectable', 'name', 'id', 'filters', 'shadow', 'lockMovementX', 'evented', 'visible'])),
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

  const restoreEntry = useCallback(
    (entry: { json: string; w: number; h: number }) => {
      const c = canvasRef.current;
      if (!c) return;
      isLockedRef.current = true;
      c.loadFromJSON(entry.json, () => {
        frameRef.current = (c.getObjects().find((o) => (o as any).name === FRAME_NAME) as fabric.Rect) || frameRef.current;
        applyDocSize(entry.w, entry.h, { fit: false });
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
    (opts: { format: 'png' | 'jpeg' | 'webp'; quality: number; scale?: number; targetWidth?: number; transparent?: boolean }): string => {
      const c = canvasRef.current;
      if (!c) return '';
      const prevW = c.getWidth();
      const prevH = c.getHeight();
      const prevVT = [...(c.viewportTransform as number[])];
      const frame = frameRef.current;
      const prevFrameVisible = frame ? frame.visible : true;
      const prevFrameFill = frame ? frame.fill : undefined;
      const prevActive = c.getActiveObject();

      const { width: dw, height: dh } = docSizeRef.current;
      const scale = opts.targetWidth ? clamp(opts.targetWidth / dw, 0.02, 1) : opts.scale || 1;

      const isTransparentDoc = (frame?.fill as any) === getCheckerPattern();

      let url = '';
      // Suppress selection events while we discard + restore the selection
      // (otherwise the UI would think the user deselected).
      isCapturingRef.current = true;
      try {
        if (frame) {
          if (opts.transparent) frame.set('visible', false);
          else if (isTransparentDoc) frame.set('fill', '#ffffff');
        }

        c.discardActiveObject();
        c.setDimensions({ width: dw, height: dh });
        c.setViewportTransform([1, 0, 0, 1, 0, 0]);
        url = c.toDataURL({ format: opts.format, quality: opts.quality, multiplier: scale });
      } finally {
        c.setDimensions({ width: prevW, height: prevH });
        c.setViewportTransform(prevVT);
        if (frame) {
          frame.set('visible', prevFrameVisible);
          frame.set('fill', prevFrameFill);
        }
        if (prevActive) c.setActiveObject(prevActive);
        isCapturingRef.current = false;
      }
      c.requestRenderAll();
      return url;
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
        window.history.replaceState(null, '', `/editor?project=${pid}`);
      }
      const json = JSON.stringify(c.toJSON(['selectable', 'name', 'id', 'filters', 'shadow', 'lockMovementX', 'evented', 'visible']));
      let thumb: string | undefined;
      try {
        thumb = renderDocDataURL({ format: 'jpeg', quality: 0.55, targetWidth: 240 });
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

      const st: Partial<EditorState> = {
        opacity: obj.opacity ?? 1,
        strokeW: obj.strokeWidth || 0,
        strokeC: (obj.stroke as string) || '#ffffff',
        fill: (obj.fill as string) || '#ffffff',
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
          const fill: any = frameRef.current.fill;
          if (typeof fill === 'string' && fill.startsWith('#')) {
            setDocBgState({ kind: 'color', value: fill });
          } else if (fill === getCheckerPattern()) {
            setDocBgState({ kind: 'transparent' });
          }
          applyDocSize(w || 1080, h || 1080, { fit: false });
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const c = canvasRef.current;
      if (!c) return;
      const mod = e.ctrlKey || e.metaKey;

      if (e.key === ' ' && !isTyping()) {
        spaceDownRef.current = true;
        if (wrapperRef.current) wrapperRef.current.style.cursor = 'grab';
        e.preventDefault();
        return;
      }

      /* --- modifier combos (work even when object editing) --- */
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
        return;
      }
      if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        apiDuplicate();
        return;
      }
      if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setMenuState('EXPORT');
        return;
      }
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }
      if (mod && e.key.toLowerCase() === 'a' && !isTyping()) {
        e.preventDefault();
        const objs = c.getObjects().filter((o) => (o as any).name !== FRAME_NAME);
        if (objs.length > 1) {
          const sel = new fabric.ActiveSelection(objs, { canvas: c });
          c.setActiveObject(sel);
          c.requestRenderAll();
        }
        return;
      }
      if (mod && e.key.toLowerCase() === 'c' && !isTyping()) {
        clipboardRef.current = c.getActiveObject();
        if (clipboardRef.current) toast('Copied object', 'info');
        return;
      }
      if (mod && e.key.toLowerCase() === 'v' && !isTyping()) {
        if (clipboardRef.current) {
          e.preventDefault();
          pasteClipboard();
        }
        return;
      }
      if (mod && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        apiZoomIn();
        return;
      }
      if (mod && e.key === '-') {
        e.preventDefault();
        apiZoomOut();
        return;
      }

      if (isTyping() || paletteOpen || shortcutsOpen || cropData || menu === 'EXPORT') return;

      /* --- plain keys --- */
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const a = c.getActiveObject();
        if (a) {
          e.preventDefault();
          c.remove(a);
          c.requestRenderAll();
        }
        return;
      }
      if (e.key === 'Escape') {
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
      const reader = new FileReader();
      reader.onload = (ev) => {
        fabric.Image.fromURL(ev.target?.result as string, (img) => {
          const cv = canvasRef.current;
          if (!cv) return;
          const userObjs = cv.getObjects().filter((o) => (o as any).name !== FRAME_NAME);
          img.set({ name: 'Image' });
          if (userObjs.length === 0) {
            // First image defines the document (pixel-true editing)
            const w = clamp(img.width || 1080, 1, 6000);
            const h = clamp(img.height || 1080, 1, 6000);
            img.scaleToWidth(w);
            img.set({ left: 0, top: 0, originX: 'left', originY: 'top' });
            applyDocSize(w, h, { fit: false });
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
        const s = Math.max(dw / (img.width || 1), dh / (img.height || 1));
        img.scale(s);
        img.set({ originX: 'left', originY: 'top', left: 0, top: 0 });
        cv.setBackgroundImage(img, () => cv.requestRenderAll());
        toast('Background image set', 'success');
      });
    };
    reader.readAsDataURL(f);
    e.target.value = '';
  }, [toast]);

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
    const [c1, c2] = parseGradientStops(gradient);
    const isRadial = gradient.includes('radial');
    // @ts-ignore — fabric.Gradient typing quirks
    const grad = new fabric.Gradient({
      type: isRadial ? 'radial' : 'linear',
      coords: isRadial
        ? { r1: 0, r2: dw / 2, x1: dw / 2, y1: dh / 2, x2: dw / 2, y2: dh / 2 }
        : { x1: 0, y1: 0, x2: dw, y2: 0 },
      colorStops: [
        { offset: 0, color: c1 },
        { offset: 1, color: c2 },
      ],
    });
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
    },
    [getActive]
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

  const deleteSelected = useCallback(() => {
    const c = canvasRef.current;
    const obj = getActive();
    if (!c || !obj) return;
    c.remove(obj);
    c.requestRenderAll();
  }, [getActive]);

  const flip = useCallback(
    (axis: 'X' | 'Y') => {
      const obj = getActive();
      if (!obj) return;
      if (axis === 'X') obj.set('flipX', !obj.flipX);
      else obj.set('flipY', !obj.flipY);
      obj.setCoords();
      canvasRef.current?.requestRenderAll();
      scheduleSaveRef.current();
    },
    [getActive]
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
      switch (action) {
        case 'front': obj.bringToFront(); break;
        case 'back': {
          // never behind the frame
          const idx = c.getObjects().findIndex((o) => (o as any).name === FRAME_NAME);
          if (idx > 0) {
            const objs = c.getObjects();
            const from = objs.indexOf(obj);
            objs.splice(from, 1);
            objs.splice(idx, 0, obj);
            obj._set('dirty', true);
            c.requestRenderAll();
          } else obj.sendToBack();
          break;
        }
        case 'forward': obj.bringForward(); break;
        case 'backward': obj.sendBackwards(); break;
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
  }, [updateLayersNow]);

  const reorderLayer = useCallback((obj: fabric.Object, dir: 'up' | 'down') => {
    if (dir === 'up') obj.bringForward();
    else obj.sendBackwards();
    canvasRef.current?.requestRenderAll();
    updateLayersNow();
    commitHistory();
  }, [updateLayersNow, commitHistory]);

  /* export api */
  const exportImage = useCallback(
    async (opts: ExportOptions) => {
      const url = renderDocDataURL({
        format: opts.format,
        quality: opts.quality,
        scale: opts.scale,
        transparent: opts.transparent,
      });
      if (!url) return;
      const ext = opts.format === 'jpeg' ? 'jpg' : opts.format;
      if (opts.mode === 'copy') {
        try {
          const blob = await (await fetch(url)).blob();
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          toast('Copied to clipboard', 'success');
        } catch {
          toast('Clipboard not available in this browser', 'error');
        }
      } else {
        const link = document.createElement('a');
        link.download = `${slugify(projectNameRef.current)}.${ext}`;
        link.href = url;
        link.click();
        toast(`Exported ${docSizeRef.current.width * opts.scale} × ${docSizeRef.current.height * opts.scale} ${ext.toUpperCase()}`, 'success');
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
        updateProject(projectIdRef.current, JSON.stringify(canvasRef.current?.toJSON() || {}), undefined, trimmed).catch(() => {});
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
        applyDocSize(Math.max(16, Math.round(w)), Math.max(16, Math.round(h)));
        commitHistory();
      },
      setDocBackground,
      openBgPicker: openBgPickerFn,
      zoomIn: apiZoomIn,
      zoomOut: apiZoomOut,
      zoomFit: zoomFitApi,
      zoom100: apiZoom100,
      addText,
      addShape,
      addSticker,
      addSolidLayer,
      addGradientLayer,
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
      reorderLayer, undo, redo, exportImage, renameProject, router,
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
  const { setMenu, setSubTool } = useEditor();
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
            setMenu('HOME');
            setSubTool(null);
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
