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
  EditorAPI,
  MenuTab,
  DocBg,
  LayerInfo,
  ExportOptions,
  ExportShape,
  CropShapeSpec,
  BorderStackConfig,
  BorderRing,
  ShadowFxConfig,
  MAX_BORDERS,
  exportPixelCaps,
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
import { renderToolPanel, PANEL_TITLES } from './panels/ToolPanels';
import { LayersList } from './LayersPanel';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import clsx from 'clsx';
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
  'onyxBgCss', 'onyxBgTransparent', 'onyxBgImage', 'onyxRing', 'onyxRingCfg', 'onyxRingPart', 'onyxShadowPart', 'onyxShadowCfg', 'strokeUniform',
  'lockRotation', 'lockScalingX', 'lockScalingY', 'hasControls', 'onyxCropShape', 'onyxUid',
  'onyxFilterMeta',
];

const canvasToJson = (c: fabric.Canvas) => JSON.stringify(c.toJSON(CANVAS_EXTRA_PROPS as any));

/** Filter provenance slots ('preset:Name' | 'adjust:key' | 'removeColor' | ''),
 *  serialized 1:1 with the filters array. Live flags on filter INSTANCES do
 *  not round-trip (fabric's BaseFilter.toObject drops unknown props), so after
 *  any undo/redo or project reload the engine could no longer tell a preset
 *  from an adjustment — presets stacked, RemoveColor duplicated. The meta
 *  object lives on the IMAGE (which DOES round-trip via CANVAS_EXTRA_PROPS). */
const syncFilterMeta = (img: fabric.Image) => {
  (img as any).onyxFilterMeta = {
    slots: (img.filters || []).map((f: any) =>
      f?.onyxPreset
        ? `preset:${f.onyxPreset}`
        : f?.onyxRemove
          ? 'removeColor'
          : f?.onyxAdjust
            ? `adjust:${f.onyxAdjust}`
            : ''
    ),
  };
};

/** Rebuild the live filter flags from serialized meta (after undo/redo, project
 *  load or a clone). Slots are position-parallel to the filters array, which
 *  fabric restores in order. */
const retagFiltersFromMeta = (img: fabric.Image) => {
  const slots: string[] = (img as any).onyxFilterMeta?.slots || [];
  (img.filters || []).forEach((f: any, i: number) => {
    if (!f) return;
    const s = slots[i] || '';
    if (s.startsWith('preset:')) f.onyxPreset = s.slice(7);
    else if (s.startsWith('adjust:')) f.onyxAdjust = s.slice(7);
    else if (s === 'removeColor') f.onyxRemove = true;
  });
};

/** Re-tag provenance flags on every image in a cloned tree (a clone copies the
 *  serialized meta, but the new filter instances start unflagged). */
const retagObjectTree = (o: any) => {
  if (!o) return;
  if (o.type === 'image') retagFiltersFromMeta(o as fabric.Image);
  const kids = o.getObjects?.();
  if (Array.isArray(kids)) kids.forEach(retagObjectTree);
};

/** Post-loadFromJSON filter restoration that ALSO descends into border/shadow
 *  attachment groups (onyxRing / onyxShadowCfg): the core image inside the
 *  group needs its provenance flags rebuilt and the guarded applyFiltersSafe
 *  pass just as much as a top-level one — otherwise preset flags stay stale
 *  (presets stack after removing the border) and legacy oversized sources
 *  keep the GL-blank bug after undo/redo/project reload. */
const restoreFiltersDeep = (o: any) => {
  if (!o) return;
  if (o.type === 'image') {
    retagFiltersFromMeta(o as fabric.Image);
    if ((o as fabric.Image).filters?.length) applyFiltersSafe(o as fabric.Image);
    return;
  }
  const kids = o.getObjects?.();
  if (Array.isArray(kids)) kids.forEach(restoreFiltersDeep);
};

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
const HEX6 = /^#[0-9a-fA-F]{6}$/;
const mixHex = (a: string, b: string, t: number): string => {
  // "transparent" (or any non-#rrggbb value) parses to NaN — every ring would
  // silently render black. Fall back to white instead of poisoning the ramp.
  const sa = HEX6.test(a) ? a : '#ffffff';
  const sb = HEX6.test(b) ? b : '#ffffff';
  const pa = [1, 3, 5].map((i) => parseInt(sa.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(sb.slice(i, i + 2), 16));
  const p = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  return `#${p.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
};

/** Linear canvas gradient between two colors across a w×h box (screen-space angle). */
const makeCtxGradient = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  g: { a: string; b: string; angle: number }
): CanvasGradient => {
  const rad = ((g.angle || 0) * Math.PI) / 180;
  const len = (Math.abs(w * Math.cos(rad)) + Math.abs(h * Math.sin(rad))) / 2 || 1;
  const dx = Math.cos(rad) * len;
  const dy = Math.sin(rad) * len;
  const grad = ctx.createLinearGradient(w / 2 - dx, h / 2 - dy, w / 2 + dx, h / 2 + dy);
  grad.addColorStop(0, g.a);
  grad.addColorStop(1, g.b);
  return grad;
};

/* ------------------------------------------------------------------ */
/* WebGL-safe image filtering                                          */
/* ------------------------------------------------------------------ */

/**
 * fabric's WebGL filter backend textures the FULL original element. Anything
 * larger than the GPU's MAX_TEXTURE_SIZE (4096 on many phones, 8192 mid-range)
 * silently renders blank or half-clipped — the "image turns invisible when I
 * touch brightness" bug. We detect the cap once and pre-downscale oversized
 * sources (visual size preserved) before the first applyFilters.
 */
let gpuTexCapCache = 0;
const gpuTexCap = (): number => {
  if (gpuTexCapCache > 0) return gpuTexCapCache;
  if (typeof document !== 'undefined') {
    try {
      const gl = document.createElement('canvas').getContext('webgl');
      if (gl) {
        const v = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
        if (v >= 1024) gpuTexCapCache = v;
      }
    } catch {
      /* probe failed — fall back to a conservative cap */
    }
  }
  if (!gpuTexCapCache) gpuTexCapCache = 4096;
  return gpuTexCapCache;
};

let glLossBound = false;
/** WebGL contexts die silently under memory pressure (16K exports!) — from
 *  then on every applyFilters renders blank. Swap to the CPU backend forever. */
const fallBackTo2DFilters = () => {
  try {
    (fabric as any).enableGLFiltering = false;
    if ((fabric as any).Canvas2dFilterBackend) {
      (fabric as any).filterBackend = new (fabric as any).Canvas2dFilterBackend();
    }
  } catch {
    /* ignore */
  }
};
const bindContextLossGuard = () => {
  if (glLossBound) return;
  glLossBound = true;
  try {
    const fb: any = (fabric as any).filterBackend;
    fb?.canvas?.addEventListener?.('webglcontextlost', (ev: Event) => {
      ev.preventDefault?.();
      fallBackTo2DFilters();
    });
  } catch {
    /* ignore */
  }
};

/** A WebGL applyFilters throw during loadFromJSON's Image.fromObject →
 *  setElement enliven path unwinds through the WHOLE enliven chain: the load
 *  callback never fires and the project opens EMPTY (only the app-drawn frame
 *  rect survives). Wrap the GL backend: on any throw, swap to the CPU 2D
 *  backend for the rest of the session and re-run THIS pass there so enliven
 *  always completes. */
const patchGlApplyFilters = () => {
  const GLB: any = (fabric as any).WebglFilterBackend;
  if (!GLB?.prototype || GLB.prototype.__onyxGlPatch) return;
  GLB.prototype.__onyxGlPatch = true;
  const orig = GLB.prototype.applyFilters;
  GLB.prototype.applyFilters = function (
    this: any,
    filters: any[],
    source: any,
    width: number,
    height: number,
    targetCanvas: HTMLCanvasElement,
    cacheKey?: string
  ) {
    try {
      return orig.call(this, filters, source, width, height, targetCanvas, cacheKey);
    } catch {
      // GL pipeline is now suspect for the whole session — CPU from now on
      fallBackTo2DFilters();
      try {
        const backend: any = (fabric as any).filterBackend;
        // The 2D backend allocates two w·h·4 typed arrays (getImageData +
        // putImageData) — on a huge source that is the exact memory spike that
        // just killed GL. Only take the CPU retry inside a safe pixel budget;
        // above it go straight to the passthrough (unfiltered > crash).
        const pxBudget = 24e6; // ~24 MP ≈ 96 MB per buffer
        if (backend?.applyFilters && backend !== this && width * height <= pxBudget) {
          return backend.applyFilters(filters, source, width, height, targetCanvas);
        }
      } catch {
        /* 2D backend failed too (same memory pressure) — fall through */
      }
      // Last resort: pass the UNFILTERED source through. An unfiltered
      // image always beats a project that loads empty.
      try {
        if (targetCanvas && source) {
          targetCanvas.width = width;
          targetCanvas.height = height;
          targetCanvas.getContext('2d')?.drawImage(source, 0, 0, width, height);
        }
      } catch {
        /* ignore */
      }
      return targetCanvas;
    }
  };
};
patchGlApplyFilters();

/** Downscale an image's source once so filtering never exceeds the GPU texture
 *  cap. Visual size is preserved (width × scaleX stays constant). */
const ensureFilterSafeSource = (img: fabric.Image): boolean => {
  const cap = Math.min(gpuTexCap(), 8192);
  const el: any = (img as any)._originalElement;
  if (!el) return false;
  const w = el.naturalWidth || el.width || 0;
  const h = el.naturalHeight || el.height || 0;
  if (!w || !h || Math.max(w, h) <= cap) return false;
  const f = cap / Math.max(w, h);
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(w * f));
  cv.height = Math.max(1, Math.round(h * f));
  const ctx = cv.getContext('2d');
  if (!ctx) return false;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(el, 0, 0, cv.width, cv.height);
  const oldW = (img as any).width || w;
  const oldH = (img as any).height || h;
  try {
    (img as any).removeTexture?.((img as any).cacheKey);
    (img as any).removeTexture?.((img as any).cacheKey + '_filtered');
  } catch {
    /* ignore */
  }
  (img as any)._originalElement = cv;
  (img as any)._element = cv;
  (img as any)._filteredEl = null;
  if ((img as any).cropX) (img as any).cropX *= f;
  if ((img as any).cropY) (img as any).cropY *= f;
  img.set({
    width: cv.width,
    height: cv.height,
    scaleX: ((img.scaleX || 1) * oldW) / cv.width,
    scaleY: ((img.scaleY || 1) * oldH) / cv.height,
  } as any);
  img.set('dirty', true);
  // A canvas source serializes as a giant PNG dataURL inside EVERY history /
  // autosave snapshot (50 entries × tens of MB → tab OOM). Re-encode opaque
  // sources as JPEG in the background and swap _originalElement to the decoded
  // Image — fabric's getSrc() then returns the compact string instead.
  try {
    const probe = document.createElement('canvas');
    const k = Math.min(1, 64 / Math.max(cv.width, cv.height));
    probe.width = Math.max(1, Math.round(cv.width * k));
    probe.height = Math.max(1, Math.round(cv.height * k));
    const pctx = probe.getContext('2d');
    let hasAlpha = true;
    if (pctx) {
      pctx.drawImage(cv, 0, 0, probe.width, probe.height);
      const d = pctx.getImageData(0, 0, probe.width, probe.height).data;
      hasAlpha = false;
      for (let i = 3; i < d.length; i += 4) {
        if (d[i] < 250) {
          hasAlpha = true;
          break;
        }
      }
    }
    if (!hasAlpha) {
      cv.toBlob(
        (blob) => {
          if (!blob) return;
          const fr = new FileReader();
          fr.onload = () => {
            const im = new Image();
            im.onload = () => {
              // swap only if this canvas is still the live source
              if ((img as any)._originalElement === cv && (img as any).canvas) {
                try {
                  (img as any).removeTexture?.((img as any).cacheKey);
                  (img as any).removeTexture?.((img as any).cacheKey + '_filtered');
                } catch {
                  /* ignore */
                }
                (img as any)._originalElement = im;
                // Preserve fabric's invariant `_element === _originalElement`
                // when no filtered element is live. If the filters were reset
                // to empty WHILE this JPEG encode was in flight, fabric's
                // applyFilters() already did `_element = _originalElement
                // (cv); _filteredEl = null` — leaving _element at the old
                // canvas here breaks the invariant, and the NEXT filter
                // application takes the else-branch (`_element =
                // _filteredEl` → null.getContext throws) leaving the image
                // permanently invisible.
                if (!(img as any)._filteredEl) {
                  (img as any)._element = im;
                }
                img.set('dirty', true);
                (img as any).canvas.requestRenderAll();
              }
            };
            im.src = String(fr.result);
          };
          fr.readAsDataURL(blob);
        },
        'image/jpeg',
        0.92
      );
    }
  } catch {
    /* keep the canvas source */
  }
  return true;
};

/** applyFilters that can never blank the image: the source is pre-scaled to the
 *  GPU texture cap and a lost WebGL context triggers a CPU-backend retry. */
const applyFiltersSafe = (img: fabric.Image) => {
  try {
    if (!(fabric as any).filterBackend) {
      (fabric as any).filterBackend = (fabric as any).initFilterBackend();
    }
    bindContextLossGuard();
  } catch {
    /* ignore */
  }
  try {
    ensureFilterSafeSource(img);
  } catch {
    /* ignore */
  }
  try {
    img.applyFilters();
  } catch {
    fallBackTo2DFilters();
    try {
      img.applyFilters();
    } catch {
      /* ignore */
    }
  }
  try {
    const gl = (fabric as any).filterBackend?.gl;
    if (gl && typeof gl.isContextLost === 'function' && gl.isContextLost()) {
      fallBackTo2DFilters();
      img.applyFilters();
    }
  } catch {
    /* ignore */
  }
};

/** Snapshot an image's UNFILTERED pixels for the crop modal. `toDataURL`
 *  renders through `_element` (the FILTERED copy), and `handleCrop`'s
 *  `setSrc` re-applies `img.filters` via setElement — snapshotting the
 *  filtered pixels would bake every adjustment/preset into the source and
 *  then apply it a SECOND time (brightness +30 becomes +60, permanently,
 *  committed to history). Temporarily neutralize the filters so the crop
 *  base is raw; setSrc re-applies the look exactly once. */
const unfilteredSnapshot = (img: fabric.Image): string => {
  const stashed = img.filters;
  img.filters = [];
  applyFiltersSafe(img); // → _element = _originalElement (raw pixels)
  const url = img.toDataURL({});
  img.filters = stashed;
  applyFiltersSafe(img); // re-establish the filtered look (same JS task — no flash)
  return url;
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

/** Draw an export mask shape (0..1 normalized space) on a 2d context at w×h */
const traceExportShape = (
  ctx: CanvasRenderingContext2D,
  shape: Exclude<ExportShape, 'none'>,
  w: number,
  h: number,
  sides?: number
) => {
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
    case 'polygon':
    case 'hexagon':
    case 'pentagon': {
      const pts = polygonPoints(shape === 'hexagon' ? 6 : shape === 'pentagon' ? 5 : sides || 6, 0.5).map((p) => map(p.x, p.y));
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

/* ------------------------------------------------------------------ */
/* Shape crop + raster engine (works on ANY object)                     */
/* ------------------------------------------------------------------ */

/** Trace a crop/ring shape inscribed in a w×h box (shared geometry). */
const traceShapeInto = (path: Path2D, spec: CropShapeSpec, w: number, h: number) => {
  const s = Math.min(w, h);
  const cx = w / 2;
  const cy = h / 2;
  const map = (x: number, y: number): [number, number] => [cx + x * s, cy + y * s];
  const poly = (n: number) => {
    const p = polygonPoints(n, 0.5).map((q) => map(q.x, q.y));
    path.moveTo(p[0][0], p[0][1]);
    p.slice(1).forEach((q) => path.lineTo(q[0], q[1]));
    path.closePath();
  };
  switch (spec.shape) {
    case 'circle':
      path.ellipse(cx, cy, s / 2, s / 2, 0, 0, Math.PI * 2);
      break;
    case 'triangle':
      poly(3);
      break;
    case 'hexagon':
      poly(6);
      break;
    case 'pentagon':
      poly(5);
      break;
    case 'polygon':
      poly(clamp(spec.sides || 6, 3, 20));
      break;
    case 'star': {
      const p = starPoints(5, 0.5, 0.21).map((q) => map(q.x, q.y));
      path.moveTo(p[0][0], p[0][1]);
      p.slice(1).forEach((q) => path.lineTo(q[0], q[1]));
      path.closePath();
      break;
    }
    case 'diamond':
      path.moveTo(cx, cy - s / 2);
      path.lineTo(cx + s / 2, cy);
      path.lineTo(cx, cy + s / 2);
      path.lineTo(cx - s / 2, cy);
      path.closePath();
      break;
    case 'heart':
      path.moveTo(cx, cy + s * 0.475);
      path.bezierCurveTo(cx - s * 0.49, cy + s * 0.18, cx - s * 0.42, cy - s * 0.34, cx, cy - s * 0.11);
      path.bezierCurveTo(cx + s * 0.42, cy - s * 0.34, cx + s * 0.49, cy + s * 0.18, cx, cy + s * 0.475);
      path.closePath();
      break;
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
    case 'square': {
      // a TRUE square inscribed in the min axis ("Square" crop semantics)
      path.rect(cx - s / 2, cy - s / 2, s, s);
      break;
    }
    default:
      path.rect(0, 0, w, h);
      break;
  }
};

/** Trace a crop shape inscribed in w×h and return its TIGHT bounding box (canvas px). */
const traceCropPath = (
  spec: CropShapeSpec,
  w: number,
  h: number
): { path: Path2D; box: { x: number; y: number; w: number; h: number } } => {
  const path = new Path2D();
  traceShapeInto(path, spec, w, h);
  const s = Math.min(w, h);
  const cx = w / 2;
  const cy = h / 2;
  const boxOfPts = (pts: { x: number; y: number }[]) => {
    const mapped = pts.map((p) => [cx + p.x * s, cy + p.y * s] as [number, number]);
    const xs = mapped.map((p) => p[0]);
    const ys = mapped.map((p) => p[1]);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
  };
  switch (spec.shape) {
    case 'circle':
    case 'diamond':
    case 'square':
      return { path, box: { x: cx - s / 2, y: cy - s / 2, w: s, h: s } };
    case 'rounded':
      return { path, box: { x: 0, y: 0, w, h } };
    case 'triangle':
      return { path, box: boxOfPts(polygonPoints(3, 0.5)) };
    case 'hexagon':
      return { path, box: boxOfPts(polygonPoints(6, 0.5)) };
    case 'pentagon':
      return { path, box: boxOfPts(polygonPoints(5, 0.5)) };
    case 'polygon':
      return { path, box: boxOfPts(polygonPoints(clamp(spec.sides || 6, 3, 20), 0.5)) };
    case 'star':
      return { path, box: boxOfPts(starPoints(5, 0.5, 0.21)) };
    case 'heart':
    default:
      return { path, box: { x: cx - s * 0.49, y: cy - s * 0.34, w: s * 0.98, h: s * 0.815 } };
  }
};

/** Ring outline geometry for border stacks — follows the object's own shape
 *  (circle → ellipse, polygon → n-gon, cropped objects → their crop shape). */
const ringPathFor = (target: fabric.Object): ((w: number, h: number) => Path2D) => {
  const t: any = target;
  const ellipse = (w: number, h: number) => {
    const p = new Path2D();
    p.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    return p;
  };
  // 1) cropped object → rings follow the crop shape (e.g. circle rings on a circle-cropped photo)
  if (t.onyxCropShape) {
    const spec: CropShapeSpec = t.onyxCropShape;
    if (spec.shape === 'circle') return ellipse;
    return (w, h) => {
      const p = new Path2D();
      traceShapeInto(p, spec, w, h);
      return p;
    };
  }
  // 2) reversible MASK (clipPath): the border covers the object's FULL frame —
  //    the masked-away "pseudo area" stays INSIDE the border (square→circle mask
  //    keeps its square border). Shape-following borders need the real Crop.
  if (t.clipPath) {
    return (w, h) => {
      const p = new Path2D();
      p.rect(0, 0, w, h);
      return p;
    };
  }
  // 3) native shape-following rings
  if (t.type === 'circle') return ellipse;
  if (t.type === 'triangle')
    return (w, h) => {
      const p = new Path2D();
      p.moveTo(w / 2, 0);
      p.lineTo(w, h);
      p.lineTo(0, h);
      p.closePath();
      return p;
    };
  if (t.type === 'polygon' && Array.isArray(t.points) && t.points.length >= 3) {
    const tw = Math.abs(t.width) || 1;
    const th = Math.abs(t.height) || 1;
    const po = t.pathOffset || { x: 0, y: 0 };
    const norm = (t.points as { x: number; y: number }[]).map((q) => ({
      u: (q.x - po.x) / tw + 0.5,
      v: (q.y - po.y) / th + 0.5,
    }));
    return (w, h) => {
      const p = new Path2D();
      norm.forEach((q, i) => (i ? p.lineTo(q.u * w, q.v * h) : p.moveTo(q.u * w, q.v * h)));
      p.closePath();
      return p;
    };
  }
  if (t.type === 'rect') {
    const f = clamp((t.rx || 0) / (t.width || 1), 0, 0.5);
    if (f > 0.01)
      return (w, h) => {
        const p = new Path2D();
        const r = f * Math.min(w, h);
        p.moveTo(r, 0);
        p.arcTo(w, 0, w, h, r);
        p.arcTo(w, h, 0, h, r);
        p.arcTo(0, h, 0, 0, r);
        p.arcTo(0, 0, w, 0, r);
        p.closePath();
        return p;
      };
  }
  // 4) default: rectangle rings (images, text, groups, paths)
  return (w, h) => {
    const p = new Path2D();
    p.rect(0, 0, w, h);
    return p;
  };
};

/** Safe image loader. fabric's fromURL builds `new fabric.Image(null)` when
 *  the decode fails, which throws INSIDE its own error handler (addClass on a
 *  null element) BEFORE any caller callback runs — a promise wrapping it would
 *  never settle and the busy-flags (rasterBusy/borderBusy) would wedge undo,
 *  redo and every adjustment for the whole session. Route through
 *  util.loadImage, check the error flag, keep a hard timeout as safety net. */
const loadImageP = (url: string, timeoutMs = 20000): Promise<fabric.Image | null> =>
  new Promise((res) => {
    let settled = false;
    const done = (v: fabric.Image | null) => {
      if (settled) return;
      settled = true;
      res(v);
    };
    try {
      (fabric.util as any).loadImage(
        url,
        (el: any, isError: boolean) => {
          if (!el || isError) {
            done(null);
            return;
          }
          try {
            done(new fabric.Image(el, {}));
          } catch {
            done(null);
          }
        },
        null,
        undefined
      );
    } catch {
      done(null);
    }
    setTimeout(() => done(null), timeoutMs);
  });

/** Render any object axis-aligned (rotation baked in) into an offscreen canvas. */
const rasterizeToCanvas = (
  obj: fabric.Object,
  ignoreShadow = false
): Promise<{ canvas: HTMLCanvasElement; bound: { left: number; top: number; width: number; height: number }; m: number } | null> =>
  new Promise((resolve) => {
    try {
      // NB fabric v5: getBoundingRect(absolute=true) → DOCUMENT coords (no viewport transform).
      // absolute=false leaks the on-screen zoom/pan into the raster math.
      const raw = obj.getBoundingRect(true, true);
      // getBoundingRect ignores shadows — pad so glows survive the raster
      const sh: any = (obj as any).shadow;
      const pad =
        !ignoreShadow && sh && typeof sh !== 'string'
          ? (sh.blur || 0) + Math.max(Math.abs(sh.offsetX || 0), Math.abs(sh.offsetY || 0))
          : 0;
      const bound =
        pad > 0
          ? { left: raw.left - pad, top: raw.top - pad, width: raw.width + 2 * pad, height: raw.height + 2 * pad }
          : raw;
      const bw = Math.max(1, bound.width);
      const bh = Math.max(1, bound.height);
      const m = clamp(Math.min(3, 4096 / Math.max(bw, bh)), 0.2, 3);
      const tmp = new fabric.StaticCanvas(null, {
        width: Math.ceil(bw * m),
        height: Math.ceil(bh * m),
        enableRetinaScaling: false,
        backgroundColor: '',
      } as any);
      obj.clone(
        (cl: any) => {
          if (!cl) {
            tmp.dispose();
            resolve(null);
            return;
          }
          cl.set({ left: (obj.left || 0) - bound.left, top: (obj.top || 0) - bound.top, selectable: false, evented: false });
          if (ignoreShadow) cl.set({ shadow: null });
          tmp.setZoom(m);
          tmp.add(cl);
          tmp.renderAll();
          const out = document.createElement('canvas');
          out.width = tmp.getWidth();
          out.height = tmp.getHeight();
          out.getContext('2d')!.drawImage(tmp.getElement() as HTMLCanvasElement, 0, 0);
          tmp.dispose();
          resolve({ canvas: out, bound, m });
        },
        CANVAS_EXTRA_PROPS as any
      );
      // Safety net: a clone whose nested image fails to decode never calls
      // its callback — resolve null so the caller's busy-flags always clear.
      setTimeout(() => resolve(null), 15000);
    } catch {
      resolve(null);
    }
  });

/** Rasterize an object (optionally shape-cropped to its tight box) into a new fabric.Image.
 *  Rotation is baked in, opacity/shadow are baked in; lock state + name carry over. */
const rasterizeObjectToImage = (obj: fabric.Object, spec: CropShapeSpec | null): Promise<fabric.Image | null> =>
  // Shape crops trace the shape over the object's OWN bbox — rasterizing with
  // the shadow padding would inscribe the crop in bbox+blur+offset (a "circle
  // crop" of a shadowed rect came out oversized on all sides and baked the
  // shadow into the crop geometry / contour borders).
  rasterizeToCanvas(obj, !!spec).then(
    (r) =>
      new Promise<fabric.Image | null>((resolve) => {
        if (!r) {
          resolve(null);
          return;
        }
        const { canvas, bound, m } = r;
        let out = canvas;
        let box = { x: 0, y: 0, w: canvas.width, h: canvas.height };
        if (spec) {
          const t = traceCropPath(spec, canvas.width, canvas.height);
          const c2 = document.createElement('canvas');
          c2.width = Math.max(1, Math.ceil(t.box.w));
          c2.height = Math.max(1, Math.ceil(t.box.h));
          const ctx = c2.getContext('2d')!;
          ctx.save();
          ctx.translate(-t.box.x, -t.box.y);
          ctx.clip(t.path);
          ctx.drawImage(canvas, 0, 0);
          ctx.restore();
          out = c2;
          box = t.box;
        }
        const url = out.toDataURL('image/png');
        loadImageP(url).then((img) => {
          if (!img) {
            resolve(null);
            return;
          }
          const src: any = obj;
          img.set({
            originX: 'left',
            originY: 'top',
            left: bound.left + box.x / m,
            top: bound.top + box.y / m,
            scaleX: 1 / m,
            scaleY: 1 / m,
            name: src.name,
            visible: src.visible !== false,
            lockMovementX: !!src.lockMovementX,
            lockMovementY: !!src.lockMovementY,
            lockRotation: !!src.lockRotation,
            lockScalingX: !!src.lockScalingX,
            lockScalingY: !!src.lockScalingY,
            hasControls: src.hasControls !== false,
          } as any);
          // A shape-cropped object keeps its basic shadow — re-attached to the
          // new image so it wraps the CROPPED contour (instead of being baked
          // into an oversized padded raster).
          if (spec && src.shadow && typeof src.shadow !== 'string') {
            try {
              (img as any).set({
                shadow: new fabric.Shadow((src.shadow as fabric.Shadow).toObject()),
              });
            } catch {
              /* keep shadowless */
            }
          }
          (img as any).onyxCropShape = spec ? { shape: spec.shape, sides: spec.sides } : src.onyxCropShape || undefined;
          resolve(img);
        });
      })
  );


  const computeRings = (cfg: BorderStackConfig): BorderRing[] => {
    const n = clamp(Math.round(cfg.count), 1, MAX_BORDERS);
    if (cfg.mode === 'custom') {
      // custom mode: per-border values, padded with the panel's shown defaults
      // (white 6px) when the rings array is shorter than the count — the
      // gradient-ramp fallback would silently render the wrong thing
      const out: BorderRing[] = [];
      for (let i = 0; i < n; i++) {
        const r = cfg.rings?.[i] || { width: 6, color: '#ffffff' };
        out.push({
          width: clamp(r.width, 1, 60),
          color: r.color,
          gradient: r.gradient ? { a: r.gradient.a, b: r.gradient.b, angle: r.gradient.angle || 0 } : undefined,
        });
      }
      return out;
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

  /** Render ALL rings of a stack into ONE offscreen canvas (that is what makes
   *  up to 1024 borders viable — one image layer, not 1024 fabric objects).
   *  Each ring may use a solid color or its own two-color gradient. */
  const buildRingCanvas = (
    target: fabric.Object,
    cfg: BorderStackConfig
  ): { canvas: HTMLCanvasElement; m: number } | null => {
    const rings = computeRings(cfg);
    if (!rings.length) return null;
    const bw = target.getScaledWidth();
    const bh = target.getScaledHeight();
    if (bw < 4 || bh < 4) return null;

    // Ring geometry: center offset of each ring from the object edge
    let acc = 0;
    const layout = rings.map((r) => {
      acc += r.width / 2;
      const centerOff = acc;
      acc += cfg.gap;
      return { ...r, centerOff };
    });
    const outer = Math.max(1, ...layout.map((l) => l.centerOff + l.width / 2));

    // Hard cap 4096px/side — iOS Safari fails above ~16MP canvases.
    const fullW = bw + 2 * outer;
    const fullH = bh + 2 * outer;
    const CAP = 4096;
    const m = clamp(Math.min(3, CAP / Math.max(fullW, fullH)), 0.02, 3);
    const rc = document.createElement('canvas');
    // +3px guard: the +1.5 path-box fudge plus the stroke's outer half can poke
    // past the exact box and shave the outermost ring.
    rc.width = Math.max(2, Math.ceil(fullW * m) + 3);
    rc.height = Math.max(2, Math.ceil(fullH * m) + 3);
    const rctx = rc.getContext('2d');
    if (!rctx) return null;
    rctx.lineJoin = 'round';
    rctx.lineCap = 'round';
    const trace = ringPathFor(target);
    // Draw outermost first — inner rings overlap the seam, hiding hairline gaps
    for (let i = layout.length - 1; i >= 0; i--) {
      const l = layout[i];
      const rw = (bw + 2 * l.centerOff) * m + 1.5;
      const rh = (bh + 2 * l.centerOff) * m + 1.5;
      rctx.save();
      // paths are built in 0..rw × 0..rh space — center that box on the canvas
      rctx.translate((rc.width - rw) / 2, (rc.height - rh) / 2);
      // Floor the ring WIDTH in object space (0.5px), then scale — an absolute
      // canvas-space floor fattened 1px rings tenfold at low supersample
      // (exactly the 1024-ring regime where the cap forces m≪1).
      rctx.lineWidth = Math.max(0.5, l.width) * m;
      rctx.strokeStyle = l.gradient ? makeCtxGradient(rctx, rw, rh, l.gradient) : l.color;
      rctx.stroke(trace(rw, rh));
      rctx.restore();
    }
    return { canvas: rc, m };
  };

  /** Build the advanced-shadow raster: the object's own silhouette, recolored
   *  (solid or gradient), blurred, spread and offset by direction+distance. */
  const buildShadowCanvas = async (
    target: fabric.Object,
    cfg: ShadowFxConfig
  ): Promise<{ canvas: HTMLCanvasElement; m: number } | null> => {
    // 1. silhouette raster — the object's alpha shape (basic shadow stripped)
    const r = await rasterizeToCanvas(target, true);
    if (!r) return null;
    const { canvas: src, bound } = r;
    const bw = Math.max(1, bound.width);
    const bh = Math.max(1, bound.height);

    // 2. recolor the silhouette: draw it, then flood with color/gradient
    //    through source-in so only the shape's alpha survives
    const rec = document.createElement('canvas');
    rec.width = src.width;
    rec.height = src.height;
    const rctx = rec.getContext('2d');
    if (!rctx) return null;
    rctx.drawImage(src, 0, 0);
    rctx.globalCompositeOperation = 'source-in';
    rctx.fillStyle =
      cfg.mode === 'gradient'
        ? makeCtxGradient(rctx, rec.width, rec.height, { a: cfg.gradA, b: cfg.gradB, angle: cfg.gradAngle })
        : cfg.color;
    rctx.fillRect(0, 0, rec.width, rec.height);

    // 3. blurred + spread + offset shadow canvas, symmetric around the object
    const spread = Math.max(0, cfg.spread || 0);
    const blur = Math.max(0, cfg.blur || 0);
    const rad = ((cfg.angle || 0) * Math.PI) / 180;
    const dx = Math.cos(rad) * (cfg.distance || 0);
    const dy = Math.sin(rad) * (cfg.distance || 0);
    // 3σ blur bleed margin — 2σ hard-clipped the gaussian tail at the raster
    // edge (a faint straight cutoff, worst opposite the offset direction).
    const pad = blur * 3 + 2;
    const fullW = bw + 2 * spread + 2 * pad + 2 * Math.abs(dx);
    const fullH = bh + 2 * spread + 2 * pad + 2 * Math.abs(dy);
    const m = clamp(Math.min(2, 4096 / Math.max(fullW, fullH)), 0.02, 2);
    const cv = document.createElement('canvas');
    cv.width = Math.max(2, Math.ceil(fullW * m));
    cv.height = Math.max(2, Math.ceil(fullH * m));
    const ctx = cv.getContext('2d');
    if (!ctx) return null;

    // 3a. SOLID silhouette at natural size, then ISOTROPIC spread dilation by
    //     stamping it around a circle of radius = spread. The old code stretched
    //     the raster to (bw+2s)×(bh+2s) — an anisotropic scale on non-square
    //     bounds that turned a 360° glow into an egg.
    const solid = document.createElement('canvas');
    solid.width = cv.width;
    solid.height = cv.height;
    const sctx = solid.getContext('2d');
    if (!sctx) return null;
    const silW = bw * m;
    const silH = bh * m;
    sctx.drawImage(rec, cv.width / 2 - silW / 2, cv.height / 2 - silH / 2, silW, silH);
    const spreadPx = spread * m;
    if (spreadPx > 1) {
      const n = Math.max(12, Math.ceil(Math.PI * spreadPx)); // ~2px stamp spacing
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        sctx.drawImage(
          rec,
          cv.width / 2 - silW / 2 + Math.cos(a) * spreadPx,
          cv.height / 2 - silH / 2 + Math.sin(a) * spreadPx,
          silW,
          silH
        );
      }
    }

    // 3b. blur + offset + opacity composite
    ctx.globalAlpha = clamp(cfg.opacity == null ? 0.55 : cfg.opacity, 0.05, 1);
    const cx = cv.width / 2 + dx * m;
    const cy = cv.height / 2 + dy * m;
    const blurPx = blur * m;
    const canFilter = typeof (ctx as any).filter === 'string';
    if (blurPx > 0.5 && canFilter) {
      (ctx as any).filter = `blur(${blurPx}px)`;
      ctx.drawImage(solid, cx - solid.width / 2, cy - solid.height / 2);
      (ctx as any).filter = 'none';
    } else if (blurPx > 0.5) {
      // Old-Safari fallback: layered jittered draws approximate a gaussian
      const N = 9;
      ctx.globalAlpha = clamp(cfg.opacity == null ? 0.55 : cfg.opacity, 0.05, 1) * 0.6;
      ctx.drawImage(solid, cx - solid.width / 2, cy - solid.height / 2);
      ctx.globalAlpha = clamp(cfg.opacity == null ? 0.55 : cfg.opacity, 0.05, 1) * 0.12;
      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2;
        const rr = (blurPx / 2) * Math.sqrt((i + 0.5) / N);
        ctx.drawImage(solid, cx - solid.width / 2 + Math.cos(a) * rr, cy - solid.height / 2 + Math.sin(a) * rr);
      }
    } else {
      ctx.drawImage(solid, cx - solid.width / 2, cy - solid.height / 2);
    }
    return { canvas: cv, m };
  };

/* ---------------- attachment builders (borders + advanced shadow) ---------------- */

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
/* Export render engine                                                */
/* ------------------------------------------------------------------ */

/** Flicker-free region capture. NEVER resizes the live DOM canvas — the old
 *  code (setDimensions + VPT reset) repainted the editor twice per capture,
 *  which read as a black flash on 16K exports. Instead the crop is computed
 *  in viewport space so the visible canvas is completely untouched. */
const captureRegion = (
  c: fabric.Canvas,
  left: number,
  top: number,
  width: number,
  height: number, // doc-space px
  scale: number
): HTMLCanvasElement => {
  const z = c.getZoom() || 1;
  const vp = c.viewportTransform as number[];
  const cropLeft = left * z + (vp[4] || 0);
  const cropTop = top * z + (vp[5] || 0);
  const cropW = Math.max(1, width * z);
  const cropH = Math.max(1, height * z);
  return c.toCanvasElement(scale / z, { left: cropLeft, top: cropTop, width: cropW, height: cropH });
};

/** Resolve the exact output pixel size (aspect-locked unless both given) + caps */
const resolveExportSize = (
  opts: { scale?: number; targetWidth?: number; targetHeight?: number },
  baseW: number,
  baseH: number
): { outW: number; outH: number } => {
  let outW: number;
  let outH: number;
  if (opts.targetWidth && opts.targetHeight) {
    outW = Math.max(1, Math.round(opts.targetWidth));
    outH = Math.max(1, Math.round(opts.targetHeight));
  } else if (opts.targetWidth) {
    outW = Math.max(1, Math.round(opts.targetWidth));
    outH = Math.max(1, Math.round((outW * baseH) / baseW));
  } else {
    const s = opts.scale || 1;
    outW = Math.max(1, Math.round(baseW * s));
    outH = Math.max(1, Math.round(baseH * s));
  }
  // Browser/device safety caps (16 384 px/side, ≤ area limit — iOS is 16.7 MP)
  const { maxSide, maxMP } = exportPixelCaps();
  const sideCap = Math.min(1, maxSide / Math.max(outW, outH));
  const mpCap = Math.min(1, Math.sqrt(maxMP / (outW * outH)));
  const cap = Math.min(sideCap, mpCap);
  return { outW: Math.max(1, Math.floor(outW * cap)), outH: Math.max(1, Math.floor(outH * cap)) };
};

const toBlobP = (canvas: HTMLCanvasElement, type: string, q: number): Promise<Blob | null> =>
  new Promise((res) => {
    try {
      canvas.toBlob((b) => res(b), type, q);
    } catch {
      res(null);
    }
  });

/** Cheap blank-detector: downscale to 32×32 and look for ANY non-transparent
 *  pixel. Catches the "canvas bigger than the device can hold → black/empty
 *  4 MB export" failure mode without allocating anything big. */
const canvasIsBlank = (canvas: HTMLCanvasElement): boolean => {
  try {
    const t = document.createElement('canvas');
    t.width = 32;
    t.height = 32;
    const ctx = t.getContext('2d');
    if (!ctx) return false;
    ctx.drawImage(canvas, 0, 0, 32, 32);
    const d = ctx.getImageData(0, 0, 32, 32).data;
    for (let i = 3; i < d.length; i += 4) if (d[i] !== 0) return false;
    return true;
  } catch {
    return true; // broken canvas → treat as blank so the caller retries smaller
  }
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
  const maskTargetRef = useRef<fabric.Object | null>(null);
  /** Live angle/size badge while transforming (direct DOM — no re-renders) */
  const badgeRef = useRef<HTMLDivElement>(null);
  /** Active center-snap guide positions (drawn on the overlay context) */
  const guidesRef = useRef<{ x: number | null; y: number | null } | null>(null);
  /** guards re-entrant border builds (async image load) */
  const borderBusyRef = useRef(false);
  /** guards re-entrant adjust-rasterize (async — slider ticks retrigger it) */
  const rasterBusyRef = useRef(false);
  /** lock ownership token — async callbacks must not unlock a newer owner's lock */
  const lockTokenRef = useRef(0);
  const historyRef = useRef<{ json: string; w: number; h: number }[]>([]);
  const historyStepRef = useRef(-1);
  const isLockedRef = useRef(false);
  const projectIdRef = useRef<string | null>(null);
  const docSizeRef = useRef({ width: 1080, height: 1080 });
  const spaceDownRef = useRef(false);
  const panStateRef = useRef<{ panning: boolean; x: number; y: number }>({ panning: false, x: 0, y: 0 });
  const pinchRef = useRef({ active: false, startDist: 0, startMid: { x: 0, y: 0 }, startZoom: 1, startVT: [1, 0, 0, 1, 0, 0] });
  const clipboardRef = useRef<fabric.Object | null>(null);
  const compareStashRef = useRef<{ obj: fabric.Image; filters: fabric.IBaseFilter[] } | null>(null);
  const activeObjRef = useRef<fabric.Object | null>(null);
  const projectNameRef = useRef('Untitled Project');
  const brushStateRef = useRef({ size: 5, color: '#ef4444' });
  /** true while export/thumbnail capture runs — selection events are suppressed */
  const isCapturingRef = useRef(false);
  // ONE export at a time, app-wide (see exportImage — per-panel guards can't
  // cover the cross-panel Escape path)
  const exportBusyRef = useRef(false);
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
  /** Full-viewport "Rendering…" overlay while a (possibly huge) export runs */
  const [exportBusy, setExportBusy] = useState<string | null>(null);
  /* ---------- mobile sheet (peek/tall + live canvas refit) ---------- */
  /** snap point of the mobile tool sheet */
  const [sheetMode, setSheetMode] = useState<'peek' | 'tall'>('peek');
  /** live pixel height of the mobile sheet — the canvas viewport pads by this
   *  so the document always stays fully visible above the sheet */
  const [sheetInset, setSheetInset] = useState(0);

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
    const objs = c
      .getObjects()
      // frame + the transient MASK_EDIT scaffolding shape never show as layers
      .filter((o) => (o as any).name !== FRAME_NAME && !(o as any).onyxTempMask);
    const infos: LayerInfo[] = objs.slice().reverse().map((obj) => {
      // stable ids survive reorders (fallback ids change on every reorder → row remounts)
      if (!(obj as any).onyxUid) (obj as any).onyxUid = `l${Math.random().toString(36).slice(2, 9)}`;
      let thumb: string | undefined;
      try {
        const w = obj.getScaledWidth() || 40;
        const h = obj.getScaledHeight() || 40;
        thumb = obj.toDataURL({ format: 'png', multiplier: 40 / Math.max(w, h) });
      } catch {
        thumb = undefined;
      }
      return {
        // onyxUid (generated above, persisted via CANVAS_EXTRA_PROPS): a stable
        // key that survives reorders — the old index-based fallback remounted
        // every row (thumbnail churn, lost rename state, drag desync).
        id: (obj as any).onyxUid as string,
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
    // An adjust-rasterize is mid-flight: the canvas still shows the
    // PRE-adjustment vector state — a push here bakes a duplicate entry and the
    // post-rasterize commit never lands (undo/redo silently no-op).
    if (rasterBusyRef.current) return;
    // Hold-compare has the live filters stripped — a concurrent commit (arrow
    // keys, Ctrl+D, throttled save) must not bake the unfiltered state in.
    if (compareStashRef.current) return;
    const entry = {
      json: canvasToJson(c),
      w: docSizeRef.current.width,
      h: docSizeRef.current.height,
    };
    // A no-op commit (pointer-up without a change, double-click reset on an
    // already-default slider) pushes a JSON-identical entry — the next undo
    // would then be a silent no-op. Collapse it.
    const top = historyRef.current[historyStepRef.current];
    if (top && top.json === entry.json && top.w === entry.w && top.h === entry.h) return;
    if (historyStepRef.current < historyRef.current.length - 1) {
      historyRef.current = historyRef.current.slice(0, historyStepRef.current + 1);
    }
    historyRef.current.push(entry);
    if (historyRef.current.length > 50) {
      historyRef.current.shift();
    }
    // Ring/shadow part canvases embed as multi-MB base64 in every entry — cap
    // the RETAINED bytes so a few maxed-out stacks can't pin ~100MB+ of strings
    // (low-RAM devices). Evict oldest beyond the budget, never below 2 entries.
    let total = 0;
    for (const e of historyRef.current) total += e.json.length;
    while (total > 32 * 1024 * 1024 && historyRef.current.length > 2) {
      total -= historyRef.current[0].json.length;
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
      // invalidate any in-flight async callback's lock ownership
      lockTokenRef.current++;
      c.loadFromJSON(entry.json, () => {
        frameRef.current = (c.getObjects().find((o) => (o as any).name === FRAME_NAME) as fabric.Rect) || frameRef.current;
        applyDocSize(entry.w, entry.h, { fit: false });
        setDocBgState(docBgFromFrame(frameRef.current));
        // fabric's fromObject/setElement runs a RAW applyFilters for images with
        // filters — sources over the GPU texture cap blank out (the v2.2
        // brightness-invisibility bug surviving on the load path). Re-run the
        // guarded pass over every filtered image (incl. images nested inside
        // border/shadow groups) — restoring the filter provenance flags from
        // serialized meta FIRST (see syncFilterMeta).
        c.getObjects().forEach(restoreFiltersDeep);
        c.renderAll();
        updateLayersNow();
        isLockedRef.current = false;
        updateUndoRedoState();
      });
    },
    [applyDocSize, updateUndoRedoState, updateLayersNow]
  );

  const undo = useCallback(() => {
    // an async border/shadow/raster build is mid-flight: swapping the canvas
    // underneath it would resurrect stale objects — wait it out
    if (borderBusyRef.current || rasterBusyRef.current) return;
    if (historyStepRef.current > 0 && historyRef.current.length > 0) {
      historyStepRef.current--;
      restoreEntry(historyRef.current[historyStepRef.current]);
      scheduleSaveRef.current();
    }
  }, [restoreEntry]);

  const redo = useCallback(() => {
    if (borderBusyRef.current || rasterBusyRef.current) return;
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
      shapeSides?: number;
      region?: { left: number; top: number; width: number; height: number };
    }): { url: string; w: number; h: number } => {
      const c = canvasRef.current;
      if (!c) return { url: '', w: 0, h: 0 };
      const frame = frameRef.current;
      const prevFrameVisible = frame ? frame.visible : true;
      const prevFrameFill = frame ? frame.fill : undefined;
      const prevBgColor = c.backgroundColor as string | fabric.Pattern | undefined;
      const prevActive = c.getActiveObject();

      const { width: dw, height: dh } = docSizeRef.current;
      // Pick export grabs a sub-region of the document instead of the full frame
      const reg = opts.region;
      const baseW = reg ? reg.width : dw;
      const baseH = reg ? reg.height : dh;
      const { outW, outH } = resolveExportSize(opts, baseW, baseH);

      // Capture at (at least) output resolution so text/shapes stay crisp
      // The INTERMEDIATE capture canvas must also stay inside the device caps —
      // clamping only the OUTPUT let a ratio-flipping custom export (wide doc →
      // tall target) request a 120 000px-wide capture canvas → guaranteed blank.
      // drawImage already stretches to the output box, so this only trades
      // sharpness on the short axis instead of failing the whole export.
      const capsc = exportPixelCaps();
      const captureScale = clamp(
        Math.min(
          Math.max(outW / baseW, outH / baseH),
          capsc.maxSide / baseW,
          capsc.maxSide / baseH,
          Math.sqrt(capsc.maxMP / (baseW * baseH || 1))
        ),
        0.02,
        20
      );

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
        const captured = captureRegion(c, reg ? reg.left : 0, reg ? reg.top : 0, baseW, baseH, captureScale);

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
          ctx.clip(traceExportShape(ctx, opts.shape, outW, outH, opts.shapeSides));
          ctx.drawImage(captured, 0, 0, outW, outH);
          ctx.restore();
        } else {
          ctx.drawImage(captured, 0, 0, outW, outH);
        }
        url = out.toDataURL(`image/${opts.format === 'jpeg' ? 'jpeg' : opts.format}`, opts.quality);
      } finally {
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

  /**
   * Memory-safe async export renderer (the path every Download/Copy takes):
   * - strip rendering — big exports render in ~4096-px-tall bands instead of one
   *   giant intermediate canvas (halves peak memory),
   * - toBlob instead of toDataURL (no 1.33× base64 string on top),
   * - blank-output detection so the caller can retry smaller instead of
   *   shipping a black 4 MB file.
   */
  const renderDocBlob = useCallback(
    async (opts: {
      format: 'png' | 'jpeg' | 'webp';
      quality: number;
      scale?: number;
      targetWidth?: number;
      targetHeight?: number;
      transparent?: boolean;
      shape?: ExportShape;
      shapeSides?: number;
      region?: { left: number; top: number; width: number; height: number };
    }): Promise<{ blob: Blob; url: string; w: number; h: number } | null> => {
      const c = canvasRef.current;
      if (!c) return null;
      const frame = frameRef.current;
      const prevFrameVisible = frame ? frame.visible : true;
      const prevFrameFill = frame ? frame.fill : undefined;
      const prevBgColor = c.backgroundColor as string | fabric.Pattern | undefined;
      const prevActive = c.getActiveObject();

      const { width: dw, height: dh } = docSizeRef.current;
      const reg = opts.region;
      const baseW = reg ? reg.width : dw;
      const baseH = reg ? reg.height : dh;
      const { outW, outH } = resolveExportSize(opts, baseW, baseH);
      // The INTERMEDIATE capture canvas must also stay inside the device caps —
      // clamping only the OUTPUT let a ratio-flipping custom export (wide doc →
      // tall target) request a 120 000px-wide capture canvas → guaranteed blank.
      // drawImage already stretches to the output box, so this only trades
      // sharpness on the short axis instead of failing the whole export.
      const capsc = exportPixelCaps();
      const captureScale = clamp(
        Math.min(
          Math.max(outW / baseW, outH / baseH),
          capsc.maxSide / baseW,
          capsc.maxSide / baseH,
          Math.sqrt(capsc.maxMP / (baseW * baseH || 1))
        ),
        0.02,
        20
      );

      const isTransparentDoc =
        !!(frame as any)?.onyxBgTransparent || frame?.fill instanceof fabric.Pattern;
      const wantTransparent = !!opts.transparent && opts.format !== 'jpeg';

      const out = document.createElement('canvas');
      out.width = outW;
      out.height = outH;
      const ctx = out.getContext('2d');
      if (!ctx) return null;
      if (opts.shape && opts.shape !== 'none' && opts.format === 'jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, outW, outH);
      }

      // Strips: big outputs render in horizontal bands so the transient canvas
      // stays small; small outputs are a single band.
      const stripDocH = outW * outH > 40e6 ? Math.max(256, Math.floor(4096 / captureScale)) : baseH;
      const nStrips = Math.max(1, Math.ceil(baseH / stripDocH));
      const yScale = outH / baseH;

      isCapturingRef.current = true;
      try {
        if (frame) {
          if (wantTransparent) {
            frame.set('visible', false);
            c.backgroundColor = '';
          } else if (isTransparentDoc) {
            frame.set('fill', '#ffffff');
          }
        }
        c.discardActiveObject();

        const clipShape = opts.shape && opts.shape !== 'none' ? opts.shape : null;
        if (clipShape) {
          ctx.save();
          ctx.clip(traceExportShape(ctx, clipShape, outW, outH, opts.shapeSides));
        }
        // A device-failed oversized capture comes back fully TRANSPARENT —
        // composited over the JPEG/shape white pre-fill that reads as uniform
        // white and slips past the final alpha-only blank check. Track it per
        // strip (a legit white image has OPAQUE pixels and never trips this).
        let stripsBlank = 0;
        for (let i = 0; i < nStrips; i++) {
          const sTop = (reg ? reg.top : 0) + i * stripDocH;
          const sH = Math.min(stripDocH, baseH - i * stripDocH);
          const captured = captureRegion(c, reg ? reg.left : 0, sTop, baseW, sH, captureScale);
          if (canvasIsBlank(captured)) stripsBlank++;
          // Overlapping destinations by 1px hide rounding seams between strips
          const destY = Math.round(i * stripDocH * yScale);
          const destEnd = Math.round((i * stripDocH + sH) * yScale);
          ctx.drawImage(captured, 0, destY, outW, destEnd - destY + (i < nStrips - 1 ? 1 : 0));
          // Yield to the event loop between bands — keeps the tab responsive
          if (nStrips > 1) await new Promise((r) => setTimeout(r, 0));
        }
        if (clipShape) ctx.restore();
        // JPEG + shape is the one path where the white pre-fill can HIDE a
        // total capture failure — if every strip came back empty on a big
        // export, fail so the caller retries smaller instead of shipping a
        // blank white JPEG.
        if (
          opts.shape &&
          opts.shape !== 'none' &&
          opts.format === 'jpeg' &&
          stripsBlank === nStrips &&
          outW * outH > 1e6
        ) {
          return null;
        }
      } finally {
        c.backgroundColor = prevBgColor as any;
        if (frame) {
          frame.set('visible', prevFrameVisible);
          frame.set('fill', prevFrameFill);
        }
        if (prevActive) c.setActiveObject(prevActive);
        isCapturingRef.current = false;
        c.requestRenderAll();
      }

      if (outW * outH > 1e6 && canvasIsBlank(out)) return null;
      const mime = `image/${opts.format === 'jpeg' ? 'jpeg' : opts.format}`;
      const blob = await toBlobP(out, mime, opts.quality);
      if (!blob || (outW * outH > 4e6 && blob.size < 1024)) return null;
      return { blob, url: URL.createObjectURL(blob), w: outW, h: outH };
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
      // A live hold-compare stash must never outlive its context — if the
      // selection moved off the held object (or cleared), restore the stashed
      // filters NOW or the image stays unfiltered while the panel claims
      // adjustments exist (and autosave would persist the stripped state).
      const stash = compareStashRef.current;
      if (stash && stash.obj !== obj) {
        compareStashRef.current = null;
        if (stash.obj.canvas) {
          stash.obj.filters = stash.filters || [];
          applyFiltersSafe(stash.obj);
          stash.obj.canvas.requestRenderAll();
        }
      }
      if (!obj) {
        // A border/shadow rebuild transiently clears the selection (unwrap +
        // re-group): flipping to HOME there would close the mobile sheet and
        // blank the desktop panel mid-Apply. The rebuild re-selects its fresh
        // group when done — only honor a REAL user deselect when idle.
        if (!borderBusyRef.current && !rasterBusyRef.current) {
          setActiveObj(null);
          activeObjRef.current = null;
          setMenuState((m) => (OBJECT_TABS.includes(m) ? 'HOME' : m));
        }
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
        strokeC: typeof obj.stroke === 'string' && obj.stroke ? obj.stroke : '#ffffff',
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
        // `??` not `||`: a 0-offset glow shadow is legitimate and must show as 0,
        // not resurrect the default 10.
        st.shadowB = (obj.shadow as fabric.Shadow).blur ?? 0;
        st.shadowO = (obj.shadow as fabric.Shadow).offsetX ?? 10;
        st.shadowC = (obj.shadow as fabric.Shadow).color || '#000000';
      } else {
        // No shadow — reset, or the sliders keep showing the PREVIOUS
        // object's shadow values (same class as the old adjustment-slider bug).
        st.shadowB = 0;
        st.shadowO = 10;
        st.shadowC = '#000000';
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
        let opened: MenuTab | null = null;
        setMenuState((m) => {
          if (m !== 'HOME') return m;
          opened = obj.type === 'image' ? 'ADJUST' : obj.type === 'i-text' || obj.type === 'text' ? 'TEXT' : 'STYLE';
          return opened;
        });
        // Auto-opening for a freshly selected object: land on the panel's
        // DEFAULT tab, not whatever STYLE sub-tab (Multi-border…) the previous
        // editing session left behind.
        if (opened === 'STYLE') setSubTool(null);
      }
    },
    [isMobile]
  );

  /* The init effect registers canvas handlers ONCE — it would forever hold
     the FIRST syncFromObject closure (isMobile = false on the opening render)
     and auto-open desktop panels on phones. Route through a ref so the
     handlers always call the latest closure. */
  const syncFromObjectRef = useRef(syncFromObject);
  useEffect(() => {
    syncFromObjectRef.current = syncFromObject;
  }, [syncFromObject]);
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
    // Debug/verification hook — the editor's fabric instance (never used by app code)
    (window as any).__onyx = { c };

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
      // Repositioning the temp mask shape is not a document change — no
      // history entry, no autosave (the temp shape must never reach a
      // snapshot or the user's undo stack).
      if (maskShapeRef.current) return;
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
    // NB: no text:editing:exited handler needed — fabric's exitEditing fires
    // 'modified' on the object when the text changed, which forwards to the
    // canvas 'object:modified' handler above (verified: it commits there).
    // Adding a second commit here would push duplicate entries and make the
    // first undo a silent no-op.

    /* ----- transform UX: 45° rotation snap, size/angle badge, center guides ----- */
    const setBadge = (x: number, y: number, text: string, accent: boolean) => {
      const b = badgeRef.current;
      if (!b) return;
      b.style.left = `${Math.max(40, Math.min(x, c.getWidth() - 40))}px`;
      // clamp: keep the badge visible when the object touches the viewport top
      const clamped = y < 4;
      b.style.top = clamped ? '6px' : `${y}px`;
      b.style.transform = clamped ? 'translate(-50%, 0)' : 'translate(-50%, -100%)';
      b.textContent = text;
      b.style.color = accent ? '#6ee7b7' : '';
      b.style.opacity = '1';
    };
    c.on('object:rotating', (e: any) => {
      const o = e.target as fabric.Object;
      const shift = !!(e.e && (e.e as KeyboardEvent).shiftKey);
      let snapped = false;
      // Hold Shift for completely free rotation; default snaps to 45° steps
      if (!shift && !o.lockRotation) {
        const step = 45;
        const nearest = Math.round((o.angle || 0) / step) * step;
        if (Math.abs((o.angle || 0) - nearest) <= 4) {
          o.rotate(nearest);
          snapped = true;
        }
      }
      const r = o.getBoundingRect(false, true);
      const deg = ((Math.round(o.angle || 0) % 360) + 360) % 360;
      setBadge(r.left + r.width / 2, r.top - 12, `${deg}°${snapped ? ' ✓' : ''}`, snapped);
    });
    c.on('object:scaling', (e: any) => {
      const o = e.target as fabric.Object;
      const r = o.getBoundingRect(false, true);
      setBadge(r.left + r.width / 2, r.top - 12, `${Math.round(o.getScaledWidth())} × ${Math.round(o.getScaledHeight())}`, false);
    });
    c.on('object:moving', (e: any) => {
      const o = e.target as fabric.Object;
      if ((o as any).name === FRAME_NAME) return;
      const { width: dw, height: dh } = docSizeRef.current;
      const th = 7 / (c.getZoom() || 1);
      // fabric v5: absolute=true → document coords (snap targets live in doc space)
      const r = o.getBoundingRect(true, true);
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      // Snap candidates: document center + both edges (Canva-style smart guides)
      const bestOf = (cur: number, cands: number[]): number | null => {
        let best: number | null = null;
        let bd = th + 0.0001;
        for (const cd of cands) {
          const d = Math.abs(cur - cd);
          if (d < bd) {
            bd = d;
            best = cd;
          }
        }
        return best;
      };
      const sx = bestOf(cx, [dw / 2, r.width / 2, dw - r.width / 2]);
      const sy = bestOf(cy, [dh / 2, r.height / 2, dh - r.height / 2]);
      if (sx != null) o.set({ left: (o.left || 0) + (sx - cx) });
      if (sy != null) o.set({ top: (o.top || 0) + (sy - cy) });
      guidesRef.current = { x: sx, y: sy };
      o.setCoords();
    });
    // Alignment guides live on the overlay context — zero fabric objects, zero history noise
    c.on('after:render', () => {
      const g = guidesRef.current;
      const ctx = (c as any).contextTop as CanvasRenderingContext2D | undefined;
      if (!g || (!g.x && !g.y) || !ctx) return;
      const v = c.viewportTransform as number[];
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.strokeStyle = '#f472b6';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      if (g.x != null) {
        const sx = g.x * v[0] + v[4];
        ctx.beginPath();
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, c.getHeight());
        ctx.stroke();
      }
      if (g.y != null) {
        const sy = g.y * v[3] + v[5];
        ctx.beginPath();
        ctx.moveTo(0, sy);
        ctx.lineTo(c.getWidth(), sy);
        ctx.stroke();
      }
      ctx.restore();
    });
    c.on('mouse:up', () => {
      guidesRef.current = null;
      if (badgeRef.current) badgeRef.current.style.opacity = '0';
      c.requestRenderAll();
    });
    c.on('selection:created', (e) => syncFromObjectRef.current(e.selected?.[0]));
    c.on('selection:updated', (e) => syncFromObjectRef.current(e.selected?.[0]));
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
      syncFromObjectRef.current(undefined);
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
          // guarded filter pass for legacy / oversized sources (see restoreEntry)
          // + restore filter provenance flags from serialized meta — nested
          // attachment-group images included
          c.getObjects().forEach(restoreFiltersDeep);
          c.renderAll();
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
        // On phones the tool sheet overlays the bottom of the viewport — the
        // wrapper carries a paddingBottom equal to the sheet height so the
        // document re-fits into the space ABOVE it. offsetHeight includes the
        // padding, so subtract it to get the true drawable height.
        const pb = parseFloat(getComputedStyle(wrapperRef.current).paddingBottom) || 0;
        canvasRef.current.setDimensions({
          width: wrapperRef.current.offsetWidth,
          height: Math.max(160, wrapperRef.current.offsetHeight - pb),
        });
        canvasRef.current.requestRenderAll();
        // After a real viewport change (rotation, keyboard, sheet open), re-fit
        // the document so it never ends up panned out of view. Debounced.
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
    const t = document.activeElement as HTMLInputElement | null;
    if (t && t.tagName === 'INPUT') {
      const ty = (t.type || '').toLowerCase();
      // range/color/checkbox inputs don't consume text — keep canvas shortcuts live
      // (otherwise Ctrl+Z dies after touching any slider)
      if (ty === 'range' || ty === 'color' || ty === 'checkbox' || ty === 'radio') return false;
      return true;
    }
    return !!(t && (t.tagName === 'TEXTAREA' || t.isContentEditable));
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

      // Transient-UI guards, evaluated ONCE at the top: modifier combos and
      // plain keys below BOTH need them. They used to run only before the
      // plain section — so Ctrl+Z silently undid the document UNDER the crop
      // modal (and, with the active object gone, handleCrop could never
      // Apply-close it), and Ctrl+D duplicated the temp mask shape.
      const modalOpen = paletteOpen || shortcutsOpen || !!cropData || menu === 'EXPORT';
      const masking = !!maskShapeRef.current;
      const ae = document.activeElement as HTMLInputElement | null;
      const aeBlocks =
        !!ae &&
        (ae.tagName === 'TEXTAREA' ||
          ae.isContentEditable ||
          (ae.tagName === 'INPUT' && !['range', 'color', 'checkbox', 'radio'].includes((ae.type || '').toLowerCase())));
      const fabricEditing = !!(c.getActiveObject() as any)?.isEditing;

      // Escape gets first crack at the topmost transient mode — it must run
      // BEFORE the masking guard or Esc can never finish MASK_EDIT.
      if (e.key === 'Escape' && !aeBlocks) {
        if (masking) {
          finishMasking(false);
          return;
        }
        if (modalOpen) return; // open modals own their Escape handling
      }

      /* --- modifier combos (canvas-level; suppressed while typing in DOM
             inputs, under open modals, or while the temp mask shape is live) --- */
      if (mod && !domTyping()) {
        if (modalOpen || masking) return;
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

      // Plain keys stay live over range/color inputs (shortcuts keep working after
      // touching a slider) but stay blocked for text inputs and fabric text editing.
      if (aeBlocks || fabricEditing || modalOpen) return;

      // While a mask shape is being positioned, the ACTIVE object IS the temp
      // shape — plain shortcuts must not fire (Escape above still finishes it).
      if (masking) return;

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
        if (menu !== 'HOME') {
          // Leaving the DRAW sheet must disarm the brush — or every canvas
          // drag paints an unintended stroke after the sheet is gone.
          if (menu === 'DRAW' && (c as any).isDrawingMode) {
            (c as any).isDrawingMode = false;
            setIsDrawing(false);
          }
          setMenuState('HOME');
        } else c.discardActiveObject();
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
          // native slider/number arrows win while an input holds focus
          if (ae && ae.tagName === 'INPUT') return;
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

  /** Adjust/filter/crop need an image — rasterize shapes & text once (undoable). */
  const pendingAdjustRef = useRef<{ retry: () => void } | null>(null);
  const ensureAdjustableImage = useCallback(
    (retry?: () => void): boolean => {
      const c = canvasRef.current;
      const obj = getActive();
      if (!c || !obj) return false;
      if (obj.type === 'image') return true;
      if ((obj as any).type === 'activeSelection') return false;
      // Slider ticks retrigger this — only ONE rasterize may run per object.
      // Ticks arriving while busy replace the pending replay, so the FINAL
      // slider value is what gets applied (not the first tick).
      if (retry) pendingAdjustRef.current = { retry };
      if (rasterBusyRef.current) return false;
      rasterBusyRef.current = true;
      toast('Rasterizing for adjustments — undo restores the original', 'info');
      const myToken = ++lockTokenRef.current;
      rasterizeObjectToImage(obj, (obj as any).onyxCropShape || null).then((img) => {
        rasterBusyRef.current = false;
        if (!img) {
          pendingAdjustRef.current = null;
          return;
        }
        // the user may have deleted / undone / switched selection mid-flight
        if ((obj as any).canvas !== c) {
          pendingAdjustRef.current = null;
          return;
        }
        const idx = c.getObjects().indexOf(obj);
        const keepSelection = !c.getActiveObject() || c.getActiveObject() === obj;
        isLockedRef.current = true;
        try {
          c.remove(obj);
          c.insertAt(img, Math.max(0, Math.min(idx, c.getObjects().length)), false);
          if (keepSelection) c.setActiveObject(img);
          c.requestRenderAll();
        } finally {
          if (lockTokenRef.current === myToken) isLockedRef.current = false;
        }
        updateLayersNow();
        // The caller's commit (slider onCommit / filter apply) pushes the settle
        // entry — but a FAST FLICK releases the slider BEFORE the rasterize
        // lands, and saveHistory no-ops while rasterBusy, so that commit fired
        // on the pre-rasterize state. The commit after the replay below records
        // the real end state (identical consecutive states are collapsed).
        scheduleSaveRef.current();
        if (keepSelection) syncFromObjectRef.current(img);
        const pending = pendingAdjustRef.current;
        pendingAdjustRef.current = null;
        // Replay ONLY when the rasterized image is (still) the selection: the
        // retry closures re-read getActive(), so replaying after a mid-flight
        // selection switch would apply the OLD object's slider value to
        // whatever is selected now — wrong object, uncommitted.
        if (keepSelection) pending?.retry();
        else if (pending) toast('Selection changed — adjustment not applied', 'info');
        // The rasterize + replayed adjustment is a REAL state change — record it
        // (see the note above: the flick case never got its own entry).
        commitHistory();
      });
      return false;
    },
    [getActive, updateLayersNow, syncFromObject, toast, commitHistory]
  );

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
        void loadImageP(ev.target?.result as string).then((img) => {
          const cv = canvasRef.current;
          if (!cv) return;
          if (!img) {
            toast('Could not decode that image — try another file', 'error');
            return;
          }
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
      void loadImageP(ev.target?.result as string).then((img) => {
        const cv = canvasRef.current;
        if (!cv || !img) return;
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
      if (!obj) return;
      // Adjust works on ANY object — non-images are rasterized once, then adjusted
      if (obj.type !== 'image') {
        if ((obj as any).type === 'activeSelection') return;
        ensureAdjustableImage(() => setAdjustment(key, value));
        return;
      }
      const img = obj as fabric.Image;
      const type = ADJUST_TYPE[key];
      // Remove only THIS key's adjustment filter (tagged). Untagged filters of
      // the same type are legacy saves — claim those too, but NEVER a
      // preset/RemoveColor filter: the old type-based removal let the Blur
      // ADJUSTMENT silently delete the Blur PRESET from under the FilterPanel.
      img.filters = (img.filters || []).filter(
        (f: any) =>
          !(
            f?.onyxAdjust === key ||
            (!f?.onyxPreset && !f?.onyxRemove && !f?.onyxAdjust && f?.type === type)
          )
      );
      if (value !== 0) {
        const def = ADJUSTMENTS.find((a) => a.key === key)!;
        const f = def.make(value) as any;
        f.onyxAdjust = key;
        img.filters.push(f);
      }
      syncFilterMeta(img);
      applyFiltersSafe(img);
      setEditorState((prev) => ({ ...prev, [key]: value }));
      canvasRef.current?.requestRenderAll();
      scheduleSaveRef.current();
    },
    [getActive, ensureAdjustableImage]
  );

  const adjustImage = useCallback(
    (key: string, value: number) => setAdjustment(key as AdjustmentKey, value),
    [setAdjustment]
  );

  const applyFilterPreset = useCallback(
    (name: string) => {
      const obj = getActive();
      if (!obj) return;
      // Filters work on ANY object — non-images are rasterized once, then filtered
      if (obj.type !== 'image') {
        if ((obj as any).type === 'activeSelection') return;
        ensureAdjustableImage(() => applyFilterPreset(name));
        return;
      }
      const img = obj as fabric.Image;
      const preset = FILTER_PRESETS.find((p) => p.name === name);
      if (!preset) return;
      img.filters = (img.filters || []).filter((f: any) => !f?.onyxPreset);
      const f = preset.make() as any;
      let collideKey: AdjustmentKey | undefined;
      if (f) {
        // A preset whose filter type collides with an adjustment (Blur) must
        // SUPERSEDE that adjustment — keeping both stacks two blur passes
        // (double blur) while the panel still shows the old slider value.
        collideKey = (Object.keys(ADJUST_TYPE) as AdjustmentKey[]).find(
          (k) => ADJUST_TYPE[k] === f.type
        );
        if (collideKey) {
          img.filters = img.filters.filter((fl: any) => fl?.onyxAdjust !== collideKey);
        }
        f.onyxPreset = name;
        img.filters.push(f);
      }
      syncFilterMeta(img);
      applyFiltersSafe(img);
      setEditorState((prev) => {
        const next = { ...prev, filterPreset: name };
        // zero the superseded adjustment slider so the panel stops claiming a
        // value that no longer exists in the filter stack
        if (collideKey) (next as any)[collideKey] = 0;
        return next;
      });
      canvasRef.current?.requestRenderAll();
      commitHistory();
      toast(`Filter: ${name}`, 'info');
    },
    [getActive, commitHistory, ensureAdjustableImage, toast]
  );

  const toggleRemoveColor = useCallback(
    (on: boolean) => {
      const obj = getActive();
      if (!obj) return;
      if (obj.type !== 'image') {
        if ((obj as any).type === 'activeSelection') return;
        ensureAdjustableImage(() => toggleRemoveColor(on));
        return;
      }
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
      syncFilterMeta(img);
      applyFiltersSafe(img);
      setEditorState((prev) => ({ ...prev, removeColorOn: on }));
      canvasRef.current?.requestRenderAll();
      commitHistory();
    },
    [getActive, editorState.removeColorHex, editorState.removeColorDist, commitHistory, ensureAdjustableImage]
  );

  const setRemoveColor = useCallback(
    (hex: string, dist: number) => {
      const obj = getActive();
      if (!obj) return;
      if (obj.type !== 'image') {
        if ((obj as any).type === 'activeSelection') return;
        ensureAdjustableImage(() => setRemoveColor(hex, dist));
        return;
      }
      const img = obj as fabric.Image;
      img.filters = (img.filters || []).map((f: any) => {
        if (f?.onyxRemove) {
          f.color = hex;
          f.distance = dist;
        }
        return f;
      });
      applyFiltersSafe(img);
      setEditorState((prev) => ({ ...prev, removeColorHex: hex, removeColorDist: dist }));
      canvasRef.current?.requestRenderAll();
      scheduleSaveRef.current();
    },
    [getActive, ensureAdjustableImage]
  );

  const holdCompare = useCallback(
    (hold: boolean) => {
      const obj = getActive();
      if (!obj) return;
      if (obj.type !== 'image') {
        // Vectors / groups have no filters to compare yet (they rasterize on
        // the FIRST adjustment, after which they are images). The old code
        // called ensureAdjustableImage() here — which RASTERIZED the object —
        // even for a no-stash RELEASE. The AdjustPanel fires holdCompare(false)
        // on unmount, so simply SWITCHING TOOLS away from Adjust destroyed
        // shapes and border-stack groups. A release with nothing stashed must
        // be a strict no-op; holding compare on a not-yet-adjusted vector is
        // equally meaningless — return in both cases.
        return;
      }
      const img = obj as fabric.Image;
      if (hold) {
        if (compareStashRef.current) return;
        // stash the OWNER too — a stale stash must never leak onto another image
        compareStashRef.current = { obj: img, filters: img.filters || [] };
        img.filters = [];
        applyFiltersSafe(img);
      } else {
        // release: restore by the stash OWNER, not by the current selection —
        // the user may have deselected / switched objects while holding
        const stash = compareStashRef.current;
        compareStashRef.current = null;
        if (stash && stash.obj.canvas) {
          stash.obj.filters = stash.filters || [];
          applyFiltersSafe(stash.obj);
        }
      }
      canvasRef.current?.requestRenderAll();
    },
    [getActive, applyFiltersSafe]
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
          const cur: any =
            obj.shadow && typeof obj.shadow !== 'string' ? (obj.shadow as fabric.Shadow) : null;
          obj.set(
            'shadow',
            new fabric.Shadow({
              color: key === 'shadowC' ? v : cur?.color || '#000000',
              blur: key === 'shadowB' ? parseInt(v) || 0 : cur?.blur ?? 0,
              // `??` not `||` on the untouched axes: an explicit 0 offset (glow
              // use-case) must survive a later Blur/Color change as 0.
              offsetX: key === 'shadowO' ? parseInt(v) || 0 : cur?.offsetX ?? 10,
              offsetY: key === 'shadowO' ? parseInt(v) || 0 : cur?.offsetY ?? 10,
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
    setSubTool(null); // fresh object → default STYLE tab, not a stale Multi-border/Shadow tab
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
    setSubTool(null); // fresh object → default STYLE tab
    setMenuState('STYLE');
  }, []);

  /** Unwrap an attachment group (borders / advanced shadow) → the core object
   *  plus the configs that were attached, so either effect can be re-applied
   *  without losing the other. */
  const unwrapAttachGroup = useCallback(
    (c: fabric.Canvas, group: fabric.Group): { core: fabric.Object; ring?: BorderStackConfig; shadow?: ShadowFxConfig } | null => {
      const items = [...group.getObjects()];
      const gIdx = c.getObjects().indexOf(group);
      const cfgs = {
        ring: (group as any).onyxRingCfg as BorderStackConfig | undefined,
        shadow: (group as any).onyxShadowCfg as ShadowFxConfig | undefined,
      };
      group.destroy();
      (group as any)._objects = [];
      c.remove(group);
      let core: fabric.Object | null = null;
      items.forEach((o) => {
        if ((o as any).onyxRingPart || (o as any).onyxShadowPart) return;
        // restore the core at the group's old stack position (no z-order jump)
        c.insertAt(o, Math.max(0, Math.min(gIdx, c.getObjects().length)), false);
        o.setCoords();
        core = o;
      });
      return core ? { core, ...cfgs } : null;
    },
    []
  );

  /** Wrap the target (plus its ring/shadow attachment images) into ONE group.
   *  Shared by the border builder and the shadow builder — re-applying either
   *  edits the same core object and keeps the other effect intact. */
  const rewrapWithAttachments = useCallback(
    (
      target: fabric.Object,
      cfgs: { ring?: BorderStackConfig; shadow?: ShadowFxConfig },
      focus: 'ring' | 'shadow',
      prev: { ring?: BorderStackConfig; shadow?: ShadowFxConfig } = {}
    ) => {
      const c = canvasRef.current;
      if (!c) return;
      borderBusyRef.current = true;
      isLockedRef.current = true;
      const myToken = ++lockTokenRef.current;
      const center = target.getCenterPoint();
      const angle = target.angle || 0;
      (async () => {
        let ok = false;
        try {
          // the user may have deleted / undone the target while we were building
          if ((target as any).canvas !== c) return;
          let ringImg: fabric.Image | null = null;
          let shadowImg: fabric.Image | null = null;
          if (cfgs.ring) {
            const rc = buildRingCanvas(target, cfgs.ring);
            if (rc) {
              ringImg = await loadImageP(rc.canvas.toDataURL('image/png'));
              if (ringImg) {
                ringImg.set({
                  originX: 'center',
                  originY: 'center',
                  left: center.x,
                  top: center.y,
                  angle,
                  // asymmetric crop shapes must flip WITH the object
                  flipX: !!(target as any).flipX,
                  flipY: !!(target as any).flipY,
                  scaleX: 1 / rc.m,
                  scaleY: 1 / rc.m,
                } as any);
                (ringImg as any).onyxRingPart = true;
              }
            }
          }
          if (cfgs.shadow) {
            const sc = await buildShadowCanvas(target, cfgs.shadow);
            if (sc) {
              shadowImg = await loadImageP(sc.canvas.toDataURL('image/png'));
              if (shadowImg) {
                shadowImg.set({
                  originX: 'center',
                  originY: 'center',
                  left: center.x,
                  top: center.y,
                  // NB: the silhouette raster is axis-aligned (rotation baked in
                  // by rasterizeToCanvas) — applying `angle` again would rotate
                  // the shadow 2× the object's rotation.
                  scaleX: 1 / sc.m,
                  scaleY: 1 / sc.m,
                } as any);
                (shadowImg as any).onyxShadowPart = true;
              }
            }
          }
          if (!ringImg && !shadowImg) {
            toast(focus === 'ring' ? 'Object is too small to border' : 'Shadow failed — try smaller values', 'warning');
            // best effort: restore whatever effects the object had before
            if (prev.ring || prev.shadow) rewrapWithAttachments(target, prev, prev.ring ? 'ring' : 'shadow');
            return;
          }
          // re-validate AFTER the async build: undo/delete/move may have happened
          // while we awaited. A stale target must never resurrect onto the canvas.
          if ((target as any).canvas !== c) return;
          const freshCenter = target.getCenterPoint();
          const freshAngle = target.angle || 0;
          if (ringImg)
            ringImg.set({ left: freshCenter.x, top: freshCenter.y, angle: freshAngle } as any);
          if (shadowImg) shadowImg.set({ left: freshCenter.x, top: freshCenter.y } as any);
          const freshIdx = c.getObjects().indexOf(target);
          c.remove(target);
          const members = [shadowImg, ringImg, target].filter(Boolean) as fabric.Object[];
          const label =
            (ringImg && shadowImg && 'bordered + shadow') ||
            (ringImg && 'bordered') ||
            'shadow';
          const group = new fabric.Group(members, {
            name: `${(target as any).name || 'Object'} · ${label}`,
          } as any);
          (group as any).onyxRing = !!ringImg;
          if (cfgs.ring) (group as any).onyxRingCfg = cfgs.ring;
          if (cfgs.shadow) (group as any).onyxShadowCfg = cfgs.shadow;
          // keep the layer where the target lives NOW (fresh z-index after any
          // concurrent layer ops during the build)
          c.insertAt(group, Math.max(0, Math.min(freshIdx, c.getObjects().length)), false);
          c.setActiveObject(group);
          c.requestRenderAll();
          ok = true;
        } catch {
          toast('Effect failed — try smaller values', 'error');
        } finally {
          // Token-guard BOTH flags: the failure-restore path above re-enters
          // rewrapWithAttachments (un-awaited). That recursion bumps the lock
          // token and owns the cleanup from here on — unconditionally clearing
          // borderBusyRef here would re-open the re-entrancy window the guard
          // exists for (concurrent apply/undo racing the in-flight rebuild).
          if (lockTokenRef.current === myToken) {
            isLockedRef.current = false;
            borderBusyRef.current = false;
          }
        }
        if (ok) {
          // History/save OUTSIDE the lock — saveHistory is a no-op while locked
          updateLayersNow();
          saveHistory();
          scheduleSaveRef.current();
          toast(
            focus === 'ring'
              ? 'Border stack applied'
              : cfgs.ring
                ? 'Shadow + borders applied'
                : 'Advanced shadow applied',
            'success'
          );
        }
      })();
    },
    [updateLayersNow, saveHistory, toast]
  );

  /** Resolve the selection into (core object + current attachment cfgs).
   *  Unwraps an existing attachment group; validates everything else. */
  const resolveAttachmentTarget = useCallback(
    (): { core: fabric.Object; ring?: BorderStackConfig; shadow?: ShadowFxConfig } | null => {
      const c = canvasRef.current;
      let target = getActive();
      if (!c || !target) {
        toast('Select an object first', 'warning');
        return null;
      }
      if ((target as any).type === 'activeSelection') {
        toast('Select a single object', 'warning');
        return null;
      }
      if (target.type === 'group') {
        if (!(target as any).onyxRing && !(target as any).onyxShadowCfg) {
          toast('Effects work on single objects — ungroup first', 'warning');
          return null;
        }
        isLockedRef.current = true;
        try {
          const u = unwrapAttachGroup(c, target as fabric.Group);
          if (!u) return null;
          target = u.core;
          return { core: target, ring: u.ring, shadow: u.shadow };
        } finally {
          isLockedRef.current = false;
        }
      }
      return { core: target };
    },
    [getActive, unwrapAttachGroup, toast]
  );

  /**
   * Wrap the selected object in a stack of concentric rings (up to 1024, all
   * rendered into ONE image layer). Ring geometry follows the object: its crop
   * shape, its native shape — or stays on the full frame when only MASKED.
   */
  const applyBorderStack = useCallback(
    (cfg: BorderStackConfig) => {
      const c = canvasRef.current;
      if (!c || borderBusyRef.current) return;
      // validate the size BEFORE unwrapping — an aborted apply must never strip
      // the object's existing border/shadow effects
      const active = getActive();
      const peek: fabric.Object | undefined =
        active?.type === 'group'
          ? (active as fabric.Group)
              .getObjects()
              .find((o) => !(o as any).onyxRingPart && !(o as any).onyxShadowPart)
          : (active as fabric.Object) || undefined;
      if (peek && (peek.getScaledWidth() < 4 || peek.getScaledHeight() < 4)) {
        toast('Object is too small to border', 'warning');
        return;
      }
      const t = resolveAttachmentTarget();
      if (!t) return;
      const target = t.core;
      if (target.getScaledWidth() < 4 || target.getScaledHeight() < 4) {
        toast('Object is too small to border', 'warning');
        return;
      }
      // A reversible MASK keeps the object's full bbox — the border wraps that
      // full frame (square for a square→circle mask). Only the real Crop makes
      // borders follow the shape.
      if ((target as any).clipPath && !(target as any).onyxCropShape) {
        toast('Masked: border wraps the FULL frame — use Crop for shape-following borders', 'info');
      }
      rewrapWithAttachments(target, { ring: cfg, shadow: t.shadow }, 'ring', { ring: t.ring, shadow: t.shadow });
    },
    [getActive, resolveAttachmentTarget, rewrapWithAttachments, toast]
  );

  /** Remove the border stack — an advanced shadow (if any) survives. */
  const removeBorderStack = useCallback(() => {
    const c = canvasRef.current;
    const obj = getActive();
    if (!c || !obj) return;
    if (obj.type !== 'group' || (!(obj as any).onyxRing && !(obj as any).onyxShadowCfg)) {
      toast('Select a bordered object first', 'warning');
      return;
    }
    if (borderBusyRef.current) return; // a rebuild is in flight
    isLockedRef.current = true;
    let u: { core: fabric.Object; ring?: BorderStackConfig; shadow?: ShadowFxConfig } | null = null;
    let rewrap = false;
    try {
      u = unwrapAttachGroup(c, obj as fabric.Group);
      if (u?.shadow) rewrap = true;
      else {
        c.requestRenderAll();
        if (u) c.setActiveObject(u.core);
      }
    } finally {
      // The rewrap path re-locks itself (and owns its own unlock token);
      // only the plain path releases the guard here.
      if (!rewrap) isLockedRef.current = false;
    }
    if (rewrap && u) {
      // borders removed but the shadow stays attached
      rewrapWithAttachments(u.core, { shadow: u.shadow }, 'shadow');
      return;
    }
    // History/save OUTSIDE the lock — saveHistory is a no-op while locked
    updateLayersNow();
    saveHistory();
    scheduleSaveRef.current();
    toast('Borders removed', 'info');
  }, [getActive, unwrapAttachGroup, rewrapWithAttachments, updateLayersNow, saveHistory, toast]);

  /** Apply / re-apply the advanced (gradient / 360°) shadow silhouette. */
  const applyShadowFx = useCallback(
    (cfg: ShadowFxConfig) => {
      const c = canvasRef.current;
      if (!c || borderBusyRef.current) return;
      const t = resolveAttachmentTarget();
      if (!t) return;
      rewrapWithAttachments(t.core, { ring: t.ring, shadow: cfg }, 'shadow', { ring: t.ring, shadow: t.shadow });
    },
    [resolveAttachmentTarget, rewrapWithAttachments]
  );

  /** Remove the advanced shadow — a border stack (if any) survives. */
  const removeShadowFx = useCallback(() => {
    const c = canvasRef.current;
    const obj = getActive();
    if (!c || !obj) return;
    if (obj.type !== 'group' || !(obj as any).onyxShadowCfg) {
      toast('No advanced shadow on this object', 'info');
      return;
    }
    if (borderBusyRef.current) return; // a rebuild is in flight
    isLockedRef.current = true;
    let u: { core: fabric.Object; ring?: BorderStackConfig; shadow?: ShadowFxConfig } | null = null;
    let rewrap = false;
    try {
      u = unwrapAttachGroup(c, obj as fabric.Group);
      if (u?.ring) rewrap = true;
      else {
        c.requestRenderAll();
        if (u) c.setActiveObject(u.core);
      }
    } finally {
      if (!rewrap) isLockedRef.current = false;
    }
    if (rewrap && u) {
      rewrapWithAttachments(u.core, { ring: u.ring }, 'ring');
      return;
    }
    updateLayersNow();
    saveHistory();
    scheduleSaveRef.current();
    toast('Shadow removed', 'info');
  }, [getActive, unwrapAttachGroup, rewrapWithAttachments, updateLayersNow, saveHistory, toast]);

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
      void loadImageP(dataUrl).then((img) => {
        if (!img) return;
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

  /** Gradient stroke for the plain single border (works on shapes, text, images) */
  const setObjectGradientStroke = useCallback(
    (css: string) => {
      const obj = getActive();
      const c = canvasRef.current;
      if (!obj || !c) return;
      const w = (obj as any).width || 100;
      const h = (obj as any).height || 100;
      const grad = buildFrameGradient(css, w, h);
      obj.set({ stroke: grad, strokeUniform: true } as any);
      c.requestRenderAll();
      scheduleSaveRef.current();
      commitHistory();
    },
    [getActive, commitHistory]
  );

  /** Back to a solid single-border stroke */
  const setObjectSolidStroke = useCallback(
    (color: string) => {
      const obj = getActive();
      const c = canvasRef.current;
      if (!obj || !c) return;
      obj.set({ stroke: color } as any);
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
    setSubTool(null); // fresh object → default STYLE tab
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
    setSubTool(null); // fresh object → default STYLE tab
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
    // CANVAS_EXTRA_PROPS keeps name/onyxRing/onyxCropShape/locks through the copy
    obj.clone((cloned: any) => {
      cloned.set({ left: (cloned.left || 0) + 24, top: (cloned.top || 0) + 24, evented: true });
      if (cloned.type === 'activeSelection') {
        cloned.canvas = c;
        cloned.forEachObject((o: fabric.Object) => c.add(o));
        cloned.setCoords();
      } else {
        c.add(cloned);
      }
      // cloned filter instances lost their provenance flags — re-tag from the
      // serialized meta so presets/adjustments/RemoveColor stay identifiable
      retagObjectTree(cloned);
      c.setActiveObject(cloned);
      c.requestRenderAll();
    }, CANVAS_EXTRA_PROPS as any);
  }, [getActive]);

  const pasteClipboard = useCallback(() => {
    const c = canvasRef.current;
    const src = clipboardRef.current;
    if (!c || !src) return;
    src.clone((cloned: any) => {
      cloned.set({ left: (cloned.left || 0) + 32, top: (cloned.top || 0) + 32, evented: true });
      c.add(cloned);
      retagObjectTree(cloned);
      c.setActiveObject(cloned);
      c.requestRenderAll();
    }, CANVAS_EXTRA_PROPS as any);
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
        // a locked layer is protected from accidental deletion
        if ((a as any).lockMovementX) {
          toast('Layer is locked — unlock it first', 'warning');
          return;
        }
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
  }, [updateLayersNow, saveHistory, toast]);

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
    if (!obj) return;
    if ((obj as any).type === 'activeSelection') {
      toast('Select a single object to crop', 'warning');
      return;
    }
    if (obj.type !== 'image') {
      // Crop works on ANY object — rasterize shapes/text once first
      ensureAdjustableImage(() => {
        const o = getActive();
        if (o && o.type === 'image') setCropData(unfilteredSnapshot(o as fabric.Image));
      });
      return;
    }
    setCropData(unfilteredSnapshot(obj as fabric.Image));
  }, [getActive, toast, ensureAdjustableImage]);

  const handleCrop = useCallback((croppedDataUrl: string) => {
    const obj = getActive();
    const c = canvasRef.current;
    if (!obj || !c) return;
    (obj as fabric.Image).setSrc(croppedDataUrl, () => {
      // setSrc internally re-runs the RAW applyFilters — route it through the
      // guarded pass so an oversized crop result can never blank the image
      if ((obj as fabric.Image).filters?.length) applyFiltersSafe(obj as fabric.Image);
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
      // Mask works on ANY single object (images, shapes, text) via clipPath
      if (!c || !obj || (obj as any).type === 'activeSelection') {
        toast('Select an object to mask', 'warning');
        return;
      }
      maskTargetRef.current = obj;
      const w = obj.getScaledWidth();
      const h = obj.getScaledHeight();
      const size = Math.min(w, h) * 0.8;
      const center = obj.getCenterPoint();

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
        // transient scaffolding flag — filtered from the layers list and
        // never serialized (not in CANVAS_EXTRA_PROPS)
        onyxTempMask: true,
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
        // Temp scaffolding — its add/remove must not push history entries or
        // autosave (it would leak into undo states and project snapshots).
        // Save/restore the lock so we never unlock an in-flight async op.
        const wasLocked = isLockedRef.current;
        isLockedRef.current = true;
        try {
          c.add(maskShape);
          c.setActiveObject(maskShape);
        } finally {
          isLockedRef.current = wasLocked;
        }
        maskShapeRef.current = maskShape;
        setMenuState('MASK_EDIT');
        obj.set({ selectable: false, evented: false });
        c.requestRenderAll();
      }
    },
    [getActive, toast]
  );

  /** Drop the temp mask shape + re-enable the target WITHOUT touching the menu.
   *  Used whenever MASK_EDIT is left through a path other than its own buttons. */
  const cancelMasking = useCallback(() => {
    const c = canvasRef.current;
    const shape = maskShapeRef.current;
    if (!c || !shape) return;
    const target = maskTargetRef.current;
    if (target) target.set({ selectable: true, evented: true });
    const wasLocked = isLockedRef.current;
    isLockedRef.current = true;
    try {
      c.remove(shape);
    } finally {
      isLockedRef.current = wasLocked;
    }
    maskShapeRef.current = null;
    maskTargetRef.current = null;
    c.requestRenderAll();
  }, []);

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
          const wasLocked = isLockedRef.current;
          isLockedRef.current = true;
          try {
            c.remove(maskShape);
          } finally {
            isLockedRef.current = wasLocked;
          }
          maskShapeRef.current = null;
          maskTargetRef.current = null;
          c.setActiveObject(targetImg);
          c.requestRenderAll();
          commitHistory();
          updateLayersNow();
          toast('Mask applied', 'success');
        });
      } else {
        cancelMasking();
      }
      setMenuState('HOME');
    },
    [cancelMasking, commitHistory, updateLayersNow, toast]
  );

  /* Leaving MASK_EDIT through ANY path (rail click, palette, tool shortcut…)
     must clean up the temp shape — otherwise it stays on the canvas (and in
     exports) and the target stays unclickable. */
  useEffect(() => {
    if (menu !== 'MASK_EDIT') cancelMasking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menu]);

  /* ---------------- true shape crop (rasterized — works on ANY object) ---------------- */
  const applyShapeCrop = useCallback(
    (spec: CropShapeSpec) => {
      const c = canvasRef.current;
      const obj = getActive();
      if (!c || !obj) {
        toast('Select an object first', 'warning');
        return;
      }
      if ((obj as any).type === 'activeSelection') {
        toast('Select a single object to crop', 'warning');
        return;
      }
      rasterizeObjectToImage(obj, spec).then((img) => {
        if (!img) {
          toast('Crop failed — try again', 'error');
          return;
        }
        // the user may have deleted / undone the object mid-flight
        if ((obj as any).canvas !== c) return;
        const idx = c.getObjects().indexOf(obj);
        const keepSelection = !c.getActiveObject() || c.getActiveObject() === obj;
        const myToken = ++lockTokenRef.current;
        isLockedRef.current = true;
        try {
          c.remove(obj);
          // keep the layer where the object was (no z-order jump)
          c.insertAt(img, Math.max(0, Math.min(idx, c.getObjects().length)), false);
          if (keepSelection) c.setActiveObject(img);
          c.requestRenderAll();
        } finally {
          if (lockTokenRef.current === myToken) isLockedRef.current = false;
        }
        updateLayersNow();
        saveHistory();
        scheduleSaveRef.current();
        if (keepSelection) syncFromObjectRef.current(img);
        toast(`Cropped to ${spec.shape}${spec.shape === 'polygon' ? ` (${clamp(spec.sides || 6, 3, 20)} sides)` : ''}`, 'success');
      });
    },
    [getActive, updateLayersNow, saveHistory, syncFromObject, toast]
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
  const runExport = useCallback(
    async (opts: ExportOptions): Promise<boolean> => {
      // Clamp the estimates to the device caps UP FRONT — otherwise a scale-
      // based export (e.g. 4× of a 6000px doc) gets re-capped to the SAME
      // size on the retry pass and the "half resolution" fallback never shrinks.
      const caps = exportPixelCaps();
      let estW = opts.targetW || Math.round((opts.region ? opts.region.width : docSizeRef.current.width) * (opts.scale || 1));
      let estH = opts.targetH || Math.round((opts.region ? opts.region.height : docSizeRef.current.height) * (opts.scale || 1));
      const capF = Math.min(1, caps.maxSide / Math.max(estW, estH), Math.sqrt(caps.maxMP / (estW * estH || 1)));
      estW = Math.max(1, Math.floor(estW * capF));
      estH = Math.max(1, Math.floor(estH * capF));

      // Safari: clipboard.write needs a ClipboardItem created SYNCHRONOUSLY
      // inside the user gesture — a multi-second render between the click and
      // the write expires the transient activation. Feed it the render PROMISE
      // instead (supported Safari 15.4+ / Chrome 97+), with a sequential
      // fallback for older engines.
      const wantPromiseClipboard =
        opts.mode === 'copy' &&
        typeof ClipboardItem !== 'undefined' &&
        !!navigator.clipboard?.write;
      // mode=copy without promise-clipboard support means the sequential path's
      // ClipboardItem/clipboard.write call is GUARANTEED to throw — fail fast
      // instead of rendering the whole (possibly multi-second 16K) image just
      // to discover the write can never work (non-secure origins etc.).
      if (opts.mode === 'copy' && !wantPromiseClipboard) {
        toast('Clipboard not available in this browser', 'error');
        return false;
      }
      const mime = `image/${opts.format === 'jpeg' ? 'jpeg' : opts.format}`;

      const renderOnce = async (f: number): Promise<{ blob: Blob; url: string; w: number; h: number } | null> => {
        const w = Math.max(1, Math.round(estW * f));
        const h = Math.max(1, Math.round(estH * f));
        setExportBusy(`${w} × ${h} px`);
        // Let the overlay paint before the (blocking) render work
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        try {
          return await renderDocBlob({
            format: opts.format,
            quality: opts.quality,
            scale: (opts.scale || 1) * f,
            targetWidth: opts.targetW ? w : undefined,
            targetHeight: opts.targetH ? h : undefined,
            transparent: opts.format === 'jpeg' ? false : opts.transparent,
            shape: opts.shape,
            shapeSides: opts.shapeSides,
            region: opts.region,
          });
        } catch {
          return null;
        }
      };

      // Two attempts: full size, then half (devices that cannot hold the canvas
      // fail with a black image — better to auto-retry smaller than ship black).
      const renderWithRetry = async (): Promise<{ blob: Blob; url: string; w: number; h: number } | null> => {
        let out = await renderOnce(1);
        if (!out) {
          toast('That size failed on this device — retrying at half resolution…', 'warning');
          out = await renderOnce(0.5);
        }
        setExportBusy(null);
        if (!out) toast('Export failed — try a smaller resolution', 'error');
        return out;
      };

      if (wantPromiseClipboard) {
        const p = renderWithRetry();
        try {
          await navigator.clipboard.write([new ClipboardItem({ [mime]: p.then((r) => r?.blob) } as any)]);
          const done = await p;
          if (done) URL.revokeObjectURL(done.url);
          toast('Copied to clipboard', 'success');
          scheduleSaveRef.current();
          return true;
        } catch {
          // Always settle the render: (a) if it FAILED, its own "Export
          // failed" toast already fired and a clipboard toast here would be
          // misleading; (b) if it SUCCEEDED but the write was refused, the
          // object URL must still be revoked or the blob stays pinned in
          // memory until unload.
          const done = await p.catch(() => null);
          if (done) {
            URL.revokeObjectURL(done.url);
            toast('Clipboard not available in this browser', 'error');
          }
          return false;
        }
      }

      const out = await renderWithRetry();
      if (!out) return false;
      const ext = opts.format === 'jpeg' ? 'jpg' : opts.format;
      if (opts.mode === 'copy') {
        try {
          await navigator.clipboard.write([new ClipboardItem({ [out.blob.type]: out.blob } as any)]);
          URL.revokeObjectURL(out.url);
          toast('Copied to clipboard', 'success');
        } catch {
          toast('Clipboard not available in this browser', 'error');
          URL.revokeObjectURL(out.url);
          return false;
        }
      } else {
        const link = document.createElement('a');
        link.download = `${slugify(projectNameRef.current)}${opts.region ? '-pick' : ''}${
          opts.shape && opts.shape !== 'none' ? `-${opts.shape}` : ''
        }.${ext}`;
        link.href = out.url;
        link.click();
        // Give the download a moment before revoking the object URL
        setTimeout(() => URL.revokeObjectURL(out!.url), 60_000);
        // Report the REAL (capped/retried) dimensions, not the requested ones
        toast(`Exported ${out.w} × ${out.h} ${ext.toUpperCase()}`, 'success');
      }
      scheduleSaveRef.current();
      return true;
    },
    [renderDocBlob, toast]
  );

  const exportImage = useCallback(
    async (opts: ExportOptions): Promise<boolean> => {
      // ONE export at a time, app-wide. The per-panel busy guards can't cover
      // the cross-panel path (Escape closes the pick modal mid-render and
      // re-enables the Download button → two concurrent 268-MP pipelines →
      // renderer OOM, plus a last-writer-wins state restore that can leave the
      // frame invisible).
      if (exportBusyRef.current) {
        toast('An export is already running — let it finish first', 'warning');
        return false;
      }
      exportBusyRef.current = true;
      try {
        return await runExport(opts);
      } finally {
        exportBusyRef.current = false;
      }
    },
    [runExport, toast]
  );

  /** PNG snapshot of the whole document — Pick-export preview */
  const docPreviewUrl = useCallback(() => {
    try {
      const { width: dw, height: dh } = docSizeRef.current;
      const s = clamp(1600 / Math.max(dw, dh), 0.05, 1.5);
      return renderDocDataURL({ format: 'png', quality: 0.92, scale: s }).url;
    } catch {
      return '';
    }
  }, [renderDocDataURL]);

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
      applyShapeCrop,
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
      applyShadowFx,
      removeShadowFx,
      setObjectGradientStroke,
      setObjectSolidStroke,
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
      docPreviewUrl,
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
      apiToggleDraw, apiDuplicate, deleteSelected, applyShapeCrop,
      flip, rotate90, lockToggle, apiOrder, align, selectLayer, toggleLayerVisibility,
      reorderLayer, setLayerIndex, renameLayer, clearBgImage, addPolygon,
      applyBorderStack, removeBorderStack, applyShadowFx, removeShadowFx,
      setObjectGradientStroke, setObjectSolidStroke,
      setObjectGradientFill, setObjectImageFill, setObjectSolidFill,
      undo, redo, exportImage, docPreviewUrl, renameProject, router,
    ]
  );

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */
  const sheetOpen = isMobile && menu !== 'HOME' && menu !== 'EXPORT';

  // Fresh tool → start at the peek snap point (predictable, canvas stays big)
  const [prevMenuForSheet, setPrevMenuForSheet] = useState(menu);
  if (menu !== prevMenuForSheet) {
    setPrevMenuForSheet(menu);
    setSheetMode('peek');
  }

  // Leaving MASK_EDIT mid-flow must clean up the temp shape + unlock the
  // target image — shared by the sheet header close + the toolbar Done.
  const closeSheet = useCallback(() => {
    if (menu === 'MASK_EDIT') finishMasking(false);
    else {
      // Disarm the brush when the DRAW sheet closes — otherwise every canvas
      // drag after Done paints an unintended stroke (the Stop button left
      // the screen together with the sheet).
      const c = canvasRef.current as any;
      if (menu === 'DRAW' && c?.isDrawingMode) {
        c.isDrawingMode = false;
        setIsDrawing(false);
      }
      setMenu('HOME');
      setSubTool(null);
    }
  }, [menu, finishMasking, setMenu, setSubTool]);

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

          {/* Canvas viewport. On phones the bottom sheet reserves space via
              paddingBottom — the ResizeObserver refits the doc above it. */}
          <div
            ref={wrapperRef}
            className={clsx(
              'relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[#0c0c0f]',
              isMobile && 'transition-[padding-bottom] duration-200 ease-out'
            )}
            style={{ touchAction: 'none', paddingBottom: isMobile ? sheetInset : 0 }}
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

            {/* Transform badge: live angle / size readout while rotating or scaling */}
            <div
              ref={badgeRef}
              className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-indigo-400/40 bg-onyx-950/90 px-2 py-0.5 font-mono text-[11px] font-bold text-indigo-200 opacity-0 shadow-lg transition-opacity duration-150"
              style={{ left: 0, top: 0 }}
            />

            {/* Export progress overlay — big renders are strip-rendered async
                and must never look like the site died (or went black) */}
            {exportBusy && (
              <div className="pointer-events-none absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-onyx-950/85 backdrop-blur-sm">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-400/25 border-t-indigo-400" />
                <p className="font-mono text-xs font-bold text-indigo-200">Rendering {exportBusy}</p>
                <p className="text-[10px] text-zinc-500">Large exports render in bands — keep this tab in the foreground</p>
              </div>
            )}

            {/* Dropzone ring */}
            {dragOver && (
              <div className="pointer-events-none absolute inset-3 z-20 rounded-2xl border-2 border-dashed border-indigo-400 bg-indigo-500/10">
                <div className="flex h-full items-center justify-center text-sm font-bold text-indigo-200">
                  Drop image to add it
                </div>
              </div>
            )}

            <EmptyState />

            {/* Zoom cluster hides while a tool sheet is open on phones — it
                would float behind the sheet and just add noise. */}
            {!(isMobile && sheetOpen) && <ZoomControls />}

            {/* Mobile bottom sheet for the active tool — draggable, two snap
                points (peek / tall), opaque, and the canvas refits above it. */}
            <AnimatePresence>
              {sheetOpen && (
                <MobileSheet
                  key="mobile-sheet"
                  title={menu === 'LAYERS' ? 'Layers' : PANEL_TITLES[menu] || 'Tool'}
                  mode={sheetMode}
                  onModeChange={setSheetMode}
                  onClose={closeSheet}
                  onHeight={setSheetInset}
                >
                  {menu === 'LAYERS' ? <LayersList /> : renderToolPanel(menu)}
                </MobileSheet>
              )}
            </AnimatePresence>
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
/* Mobile bottom sheet — peek/tall snap points, header drag, live
   height reporting so the canvas refits above it.                      */
/* ------------------------------------------------------------------ */

const MobileSheet: React.FC<{
  title: string;
  mode: 'peek' | 'tall';
  onModeChange: (m: 'peek' | 'tall') => void;
  onClose: () => void;
  onHeight: (px: number) => void;
  children: React.ReactNode;
}> = ({ title, mode, onModeChange, onClose, onHeight, children }) => {
  const controls = useDragControls();
  const sheetRef = useRef<HTMLDivElement>(null);
  // A drag that moved the sheet must NOT also fire the header's click toggle
  const draggedRef = useRef(false);

  // Report the live sheet height so the canvas viewport can pad + refit.
  // Cleanup releases the padding when the sheet unmounts (incl. exit anim).
  useEffect(() => {
    const el = sheetRef.current;
    if (!el) return;
    onHeight(el.offsetHeight);
    const ro = new ResizeObserver(() => onHeight(el.offsetHeight));
    ro.observe(el);
    return () => {
      ro.disconnect();
      onHeight(0);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Panels with heavy content (e.g. the per-border editor) request the tall
  // snap point via a window event — keeps renderToolPanel decoupled from the
  // sheet implementation.
  useEffect(() => {
    const onExpand = () => onModeChange('tall');
    window.addEventListener('onyx:expand-sheet', onExpand);
    return () => window.removeEventListener('onyx:expand-sheet', onExpand);
  }, [onModeChange]);

  return (
    <motion.div
      ref={sheetRef}
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 34, stiffness: 380 }}
      drag="y"
      dragListener={false}
      dragControls={controls}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0.2, bottom: 0.55 }}
      dragMomentum={false}
      onDragStart={() => {
        draggedRef.current = true;
      }}
      onDragEnd={(_, info) => {
        // Flick down / far down → dismiss; short up → tall; short down → peek.
        // Otherwise the elastic constraint springs it back to y=0.
        if (info.offset.y > 110 || info.velocity.y > 700) onClose();
        else if (info.offset.y < -45) onModeChange('tall');
        else if (info.offset.y > 45) onModeChange('peek');
        // allow the next clean tap to toggle again
        requestAnimationFrame(() => {
          draggedRef.current = false;
        });
      }}
      className="sheet-solid absolute inset-x-0 bottom-0 z-30 overflow-hidden rounded-t-2xl border-t border-white/10 shadow-2xl shadow-black/70"
    >
      {/* Header: grabber + panel title + expand chevron. Tap toggles peek /
          tall, drag down dismisses — the only close affordance lives in the
          toolbar so there are never two "Done" buttons on screen. */}
      <div
        role="button"
        tabIndex={0}
        aria-label={`${title} panel — tap to ${mode === 'peek' ? 'expand' : 'collapse'}`}
        onPointerDown={(e) => controls.start(e)}
        onClick={() => {
          if (draggedRef.current) return;
          onModeChange(mode === 'peek' ? 'tall' : 'peek');
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onModeChange(mode === 'peek' ? 'tall' : 'peek');
        }}
        className="relative flex cursor-grab touch-none select-none items-center gap-2 px-4 pb-2 pt-3 active:cursor-grabbing"
      >
        <div className="absolute left-1/2 top-1.5 h-1 w-10 -translate-x-1/2 rounded-full bg-white/20" aria-hidden />
        <h3 className="min-w-0 flex-1 truncate text-xs font-black uppercase tracking-[0.14em] text-zinc-300">{title}</h3>
        <span
          className={clsx(
            'flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800/80 text-[9px] text-zinc-400 transition-transform duration-200',
            mode === 'tall' && 'rotate-180'
          )}
          aria-hidden
        >
          ▲
        </span>
      </div>
      <div
        className={clsx(
          'max-h-[30dvh] overflow-y-auto overscroll-contain px-4 pb-5 transition-[max-height] duration-200 ease-out',
          mode === 'tall' && 'max-h-[62dvh]'
        )}
      >
        {children}
      </div>
    </motion.div>
  );
};
