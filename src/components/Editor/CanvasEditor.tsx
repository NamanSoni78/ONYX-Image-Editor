'use client';

import React, { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';
import { INITIAL_STATE, EditorState } from './constants';
import { LayersPanel } from './LayersPanel';
import { ExportPanel } from './ExportPanel';
import { CropModal } from './CropModal';
import { Toolbar } from './Toolbar';
import { FaArrowRotateLeft, FaArrowRotateRight, FaDownload, FaBars } from 'react-icons/fa6';
import { AnimatePresence } from 'framer-motion';
import { getProject, updateProject } from '@/lib/storage';
import { Sidebar } from '@/components/Layout/Sidebar';
import { useDebouncedCallback } from 'use-debounce';

interface CanvasEditorProps {
    projectId?: string;
}

export default function CanvasEditor({ projectId }: CanvasEditorProps) {
    const canvasRef = useRef<fabric.Canvas | null>(null);
    const containerRef = useRef<HTMLCanvasElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const bgInputRef = useRef<HTMLInputElement>(null);

    // History State
    const historyRef = useRef<string[]>([]);
    const historyStepRef = useRef<number>(-1);
    const isLocked = useRef<boolean>(false);
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);

    // App State
    const [activeObj, setActiveObj] = useState<fabric.Object | null>(null);
    const [menu, setMenu] = useState('HOME');
    const [subTool, setSubTool] = useState<string | null>(null);
    const [layers, setLayers] = useState<fabric.Object[]>([]);
    const [cropData, setCropData] = useState<{ src: string } | null>(null);
    const [editorState, setEditorState] = useState<EditorState>(INITIAL_STATE);
    const [canvasBg, setCanvasBg] = useState('#111111');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [projectName, setProjectName] = useState('Untitled Project');

    // Gesture State
    const gestureState = useRef({ scale: 1, dist: 0, angle: 0, startScale: 1, startAngle: 0 });

    // Auto-save
    const debouncedSave = useDebouncedCallback(async () => {
        if(projectId && canvasRef.current) {
            const json = JSON.stringify(canvasRef.current.toJSON(['selectable', 'name', 'id', 'filters', 'shadow']));
            // Capture thumbnail (scaled down)
            const thumbnail = canvasRef.current.toDataURL({ format: 'jpeg', quality: 0.5, multiplier: 0.2 });
            await updateProject(projectId, json, thumbnail);
        }
    }, 1000);

    // --- INITIALIZATION ---
    useEffect(() => {
        if (!containerRef.current || canvasRef.current) return;

        const c = new fabric.Canvas(containerRef.current, {
            backgroundColor: '#111',
            preserveObjectStacking: true,
            selection: false,
            controlsAboveOverlay: true,
            allowTouchScrolling: false,
            enableRetinaScaling: false,
            width: wrapperRef.current?.offsetWidth || window.innerWidth,
            height: wrapperRef.current?.offsetHeight || window.innerHeight,
        });

        fabric.Object.prototype.set({
            transparentCorners: false,
            cornerColor: '#fff',
            cornerStrokeColor: '#3b82f6',
            borderColor: '#3b82f6',
            cornerSize: 24,
            touchCornerSize: 30,
            padding: 10,
            cornerStyle: 'circle',
            borderScaleFactor: 2,
            centeredScaling: true,
            centeredRotation: true
        } as any);

        // Listeners
        c.on('object:modified', () => { saveHistory(); debouncedSave(); });
        c.on('object:added', () => { saveHistory(); updateLayers(); debouncedSave(); });
        c.on('object:removed', () => { saveHistory(); updateLayers(); debouncedSave(); });
        c.on('selection:created', (e) => handleSelect(e.selected?.[0]));
        c.on('selection:updated', (e) => handleSelect(e.selected?.[0]));
        c.on('selection:cleared', () => {
            // If we are in mask mode, don't just clear everything blindly if we clicked outside.
            // Actually, if we click outside, we deselect the mask shape.
            // We should probably cancel masking or just keep the menu open?
            // Current bug: White circle remains. This is because maskShapeRef exists but we lost track.

            if (maskShapeRef.current) {
                // If selection cleared while masking (e.g. clicked empty space),
                // we should cleanup the temporary mask shape.
                c.remove(maskShapeRef.current);
                maskShapeRef.current = null;

                // Also we need to unlock the image that was locked
                const img = c.getObjects().find(o => o.type === 'image' && o.selectable === false && o.evented === false);
                if (img) {
                    img.set({ selectable: true, evented: true });
                }
            }

            setActiveObj(null);
            setMenu('HOME');
        });

        canvasRef.current = c;

        // Load Data
        if(projectId) {
            getProject(projectId).then(p => {
                if(p) {
                    setProjectName(p.name);
                    c.loadFromJSON(p.data, () => {
                         c.renderAll();
                         saveHistory();
                         updateLayers();
                    });
                }
            });
        } else {
             saveHistory();
        }

        // Resize Handler
        const handleResize = () => {
            if (wrapperRef.current && canvasRef.current) {
                // Check if keyboard is likely open (height reduced significantly)
                // This is a simple heuristic. A more robust one involves detecting focus on inputs.
                // However, for this editor, users only type in IText, which might trigger keyboard.
                // If we resize the canvas when keyboard opens, the background image (which is scaled to canvas)
                // might distort if not handled carefully.

                // Instead of resizing canvas immediately, we could check if the resize is substantial width-wise
                // or just ensure background scaling is preserved.

                const newWidth = wrapperRef.current.offsetWidth;
                const newHeight = wrapperRef.current.offsetHeight;

                canvasRef.current.setWidth(newWidth);
                canvasRef.current.setHeight(newHeight);

                // Re-center/scale background image if it exists
                // @ts-ignore
                if (canvasRef.current.backgroundImage && canvasRef.current.backgroundImage.scaleX) {
                     const bg = canvasRef.current.backgroundImage as fabric.Image;
                     // We want 'cover' behavior
                     const ratio = Math.max(newWidth / bg.width!, newHeight / bg.height!);
                     bg.scale(ratio);
                     bg.set({
                         originX: 'center',
                         originY: 'center',
                         left: newWidth / 2,
                         top: newHeight / 2
                     });
                }

                canvasRef.current.renderAll();
            }
        };
        window.addEventListener('resize', handleResize);

        // --- TOUCH GESTURES ---
        // Note: React events are passive by default, but we need non-passive for gestures to prevent scroll
        // We'll attach these to the wrapper div
        const wrap = wrapperRef.current;

        const getDist = (t1: Touch, t2: Touch) => Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const getAngle = (t1: Touch, t2: Touch) => Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX) * 180 / Math.PI;

        const touchStart = (e: TouchEvent) => {
            if (e.touches.length === 2 && canvasRef.current) {
                const obj = canvasRef.current.getActiveObject();
                if(obj) {
                    gestureState.current.dist = getDist(e.touches[0], e.touches[1]);
                    gestureState.current.angle = getAngle(e.touches[0], e.touches[1]);
                    gestureState.current.startScale = obj.scaleX || 1;
                    gestureState.current.startAngle = obj.angle || 0;
                }
            }
        };

        const touchMove = (e: TouchEvent) => {
            if (e.touches.length === 2 && canvasRef.current) {
                const obj = canvasRef.current.getActiveObject();
                if(obj) {
                    e.preventDefault();
                    const dist = getDist(e.touches[0], e.touches[1]);
                    const angle = getAngle(e.touches[0], e.touches[1]);

                    const scaleFactor = dist / gestureState.current.dist;
                    obj.scale(gestureState.current.startScale * scaleFactor);

                    const deltaRotation = angle - gestureState.current.angle;
                    obj.rotate(gestureState.current.startAngle + deltaRotation);

                    canvasRef.current.requestRenderAll();
                }
            }
        };

        if (wrap) {
            wrap.addEventListener('touchstart', touchStart, { passive: false });
            wrap.addEventListener('touchmove', touchMove, { passive: false });
        }

        return () => {
            window.removeEventListener('resize', handleResize);
            if (wrap) {
                wrap.removeEventListener('touchstart', touchStart);
                wrap.removeEventListener('touchmove', touchMove);
            }
            c.dispose();
            canvasRef.current = null;
        };
    }, []);


    // --- HISTORY ---
    const saveHistory = () => {
        if (isLocked.current || !canvasRef.current) return;
        const json = JSON.stringify(canvasRef.current.toJSON(['selectable', 'name', 'id', 'filters', 'shadow']));

        if (historyStepRef.current < historyRef.current.length - 1) {
            historyRef.current = historyRef.current.slice(0, historyStepRef.current + 1);
        }
        historyRef.current.push(json);
        historyStepRef.current = historyRef.current.length - 1;

        if (historyRef.current.length > 30) {
            historyRef.current.shift();
            historyStepRef.current--;
        }

        updateUndoRedoState();
    };

    const updateUndoRedoState = () => {
        setCanUndo(historyStepRef.current > 0);
        setCanRedo(historyStepRef.current < historyRef.current.length - 1);
    };

    const undo = () => {
        if (historyStepRef.current > 0 && canvasRef.current) {
            isLocked.current = true;
            historyStepRef.current--;
            canvasRef.current.loadFromJSON(historyRef.current[historyStepRef.current], () => {
                canvasRef.current?.renderAll();
                updateLayers();
                isLocked.current = false;
                updateUndoRedoState();
            });
        }
    };

    const redo = () => {
        if (historyStepRef.current < historyRef.current.length - 1 && canvasRef.current) {
            isLocked.current = true;
            historyStepRef.current++;
            canvasRef.current.loadFromJSON(historyRef.current[historyStepRef.current], () => {
                canvasRef.current?.renderAll();
                updateLayers();
                isLocked.current = false;
                updateUndoRedoState();
            });
        }
    };

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!canvasRef.current) return;

            // Undo: Ctrl+Z
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                undo();
            }
            // Redo: Ctrl+Y or Ctrl+Shift+Z
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
                e.preventDefault();
                redo();
            }
            // Duplicate: Ctrl+D
            if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
                e.preventDefault();
                handleDuplicate();
            }
            // Delete
            if (e.key === 'Delete' || e.key === 'Backspace') {
                const active = canvasRef.current.getActiveObject();
                // @ts-ignore
                if (active && !active.isEditing) {
                     canvasRef.current.remove(active);
                     saveHistory();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [canUndo, canRedo]); // We depend on closures that use refs, but let's trigger re-bind if state changes just in case, though mainly for safety.

    // --- STATE SYNC ---
    const updateLayers = () => {
        if (canvasRef.current) {
            setLayers(canvasRef.current.getObjects().slice().reverse());
        }
    };

    const handleSelect = (obj: fabric.Object | undefined) => {
        if (!obj) return;
        setActiveObj(obj);

        let sBlur = 0, sOff = 10, sCol = '#000000';
        if (obj.shadow && typeof obj.shadow !== 'string') {
            // @ts-ignore: Fabric shadow types can be weird
            sBlur = obj.shadow.blur || 0;
            // @ts-ignore
            sOff = obj.shadow.offsetX || 10;
            // @ts-ignore
            sCol = obj.shadow.color || '#000000';
        }

        setEditorState(prev => ({
            ...prev,
            opacity: obj.opacity || 1,
            strokeW: obj.strokeWidth || 0,
            strokeC: obj.stroke || '#fff',
            fill: (obj.fill as string) || '#fff',
            bg: (obj.backgroundColor as string) || 'transparent',
            // @ts-ignore
            font: obj.fontFamily || 'Inter',
            shadowB: sBlur,
            shadowO: sOff,
            shadowC: sCol,
            // @ts-ignore
            radius: obj.rx || 0,
            // Reset image filters for slider UI (simplified)
            brightness: 0, contrast: 0, saturation: 0, blur: 0, chroma: 0
        }));
    };

    // --- ACTIONS ---
    const updateStyle = (key: keyof EditorState, v: any) => {
        if (!canvasRef.current) return;

        // Always update local state (UI)
        setEditorState(prev => ({ ...prev, [key]: v }));

        const obj = canvasRef.current.getActiveObject();
        if (!obj) return;

        if (key === 'fill') {
            obj.set('fill', v);
            // Force render for shape fill changes if object is active
            canvasRef.current.requestRenderAll();
        }
        if (key === 'strokeC') obj.set('stroke', v);
        if (key === 'strokeW') obj.set('strokeWidth', parseInt(v));
        if (key === 'bg') obj.set('backgroundColor', v);
        // @ts-ignore
        if (key === 'font') obj.set('fontFamily', v);
        if (key === 'opacity') obj.set('opacity', parseFloat(v));

        // Handle hollow shapes (transparent fill)
        if (key === 'fill' && v === 'transparent') {
             obj.set('fill', 'transparent');
        }

        if (key === 'shadowB' || key === 'shadowO' || key === 'shadowC') {
            const currentShadow = (obj.shadow as fabric.Shadow) || { blur: 0, offsetX: 10, offsetY: 10, color: '#000000' };
            let newBlur = key === 'shadowB' ? parseInt(v) : (currentShadow.blur || 0);
            let newOff = key === 'shadowO' ? parseInt(v) : (currentShadow.offsetX || 10);
            let newCol = key === 'shadowC' ? v : (currentShadow.color || '#000000');

            obj.set('shadow', new fabric.Shadow({
                color: newCol,
                blur: newBlur,
                offsetX: newOff,
                offsetY: newOff
            }));
        }

        // @ts-ignore
        if (key === 'radius' && obj.type === 'rect') obj.set({ rx: parseInt(v), ry: parseInt(v) });

        canvasRef.current.requestRenderAll();
    };

    const applyFilter = (filterObj: any) => {
        if (!activeObj || activeObj.type !== 'image' || !canvasRef.current) return;
        const img = activeObj as fabric.Image;
        img.filters = [];
        if (filterObj.fn) img.filters?.push(filterObj.fn);
        img.applyFilters();
        canvasRef.current.requestRenderAll();
        saveHistory();
    };

    const handleFlip = (axis: 'X' | 'Y') => {
        if (!activeObj || !canvasRef.current) return;
        if (axis === 'X') activeObj.set('flipX', !activeObj.flipX);
        if (axis === 'Y') activeObj.set('flipY', !activeObj.flipY);
        canvasRef.current.requestRenderAll();
        saveHistory();
    };

    const handleLock = () => {
        if (!activeObj || !canvasRef.current) return;
        const locked = !activeObj.lockMovementX;
        activeObj.set({
            lockMovementX: locked,
            lockMovementY: locked,
            lockRotation: locked,
            lockScalingX: locked,
            lockScalingY: locked
        });
        // Force re-render to show/hide controls potentially, although standard fabric controls don't hide automatically without logic
        activeObj.hasControls = !locked;
        canvasRef.current.requestRenderAll();
        saveHistory();
    };

    const handleOrder = (action: 'front' | 'back' | 'forward' | 'backward') => {
        if (!activeObj || !canvasRef.current) return;
        switch(action) {
            case 'front': activeObj.bringToFront(); break;
            case 'back': activeObj.sendToBack(); break;
            case 'forward': activeObj.bringForward(); break;
            case 'backward': activeObj.sendBackwards(); break;
        }
        updateLayers();
        saveHistory();
    };

    const handleTextFormat = (type: 'bold' | 'italic' | 'underline' | 'align-left' | 'align-center' | 'align-right') => {
        if (!activeObj || (activeObj.type !== 'i-text' && activeObj.type !== 'text') || !canvasRef.current) return;
        const text = activeObj as fabric.IText;

        switch(type) {
            case 'bold': text.set('fontWeight', text.fontWeight === 'bold' ? 'normal' : 'bold'); break;
            case 'italic': text.set('fontStyle', text.fontStyle === 'italic' ? 'normal' : 'italic'); break;
            case 'underline': text.set('underline', !text.underline); break;
            case 'align-left': text.set('textAlign', 'left'); break;
            case 'align-center': text.set('textAlign', 'center'); break;
            case 'align-right': text.set('textAlign', 'right'); break;
        }
        canvasRef.current.requestRenderAll();
        saveHistory();
    };

    const adjustImage = (type: string, value: number) => {
        if (!activeObj || activeObj.type !== 'image' || !canvasRef.current) return;
        setEditorState(prev => ({ ...prev, [type]: value }));

        const img = activeObj as fabric.Image;
        const map: Record<string, any> = {
            'brightness': new fabric.Image.filters.Brightness({ brightness: parseFloat(value as any) }),
            'contrast': new fabric.Image.filters.Contrast({ contrast: parseFloat(value as any) }),
            'saturation': new fabric.Image.filters.Saturation({ saturation: parseFloat(value as any) }),
            'blur': new fabric.Image.filters.Blur({ blur: parseFloat(value as any) }),
            // @ts-ignore
            'chroma': new fabric.Image.filters.RemoveColor({ distance: parseFloat(value as any), color: '#00FF00' })
        };

        // Remove existing filter of same type
        // @ts-ignore
        img.filters = img.filters?.filter(f => f.type !== map[type].type);
        if (value !== 0) img.filters?.push(map[type]);

        img.applyFilters();
        canvasRef.current.requestRenderAll();
    };

    const addImage = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0] || !canvasRef.current) return;
        const reader = new FileReader();
        reader.onload = (f) => {
            fabric.Image.fromURL(f.target?.result as string, (img) => {
                if(!canvasRef.current) return; // check again inside callback
                img.scaleToWidth(canvasRef.current.width! * 0.6);
                canvasRef.current.add(img);
                canvasRef.current.centerObject(img);
                canvasRef.current.setActiveObject(img);
                saveHistory();
            });
        };
        reader.readAsDataURL(e.target.files[0]);
        e.target.value = '';
    };

    const handleSetBackgroundColor = (color: string) => {
        if(!canvasRef.current) return;
        setCanvasBg(color);
        // Ensure background image is removed if color is set
        if (canvasRef.current.backgroundImage) {
            // @ts-ignore
            canvasRef.current.setBackgroundImage(null, canvasRef.current.renderAll.bind(canvasRef.current));
        }
        canvasRef.current.setBackgroundColor(color, () => canvasRef.current?.renderAll());
        saveHistory();
    };

    const handleSetGradient = (gradient: string) => {
        if(!canvasRef.current) return;

        // Simple gradient parsing from linear-gradient string to Fabric Gradient
        // This is a basic implementation. Fabric needs specific object.

        // We'll use the visual gradient as a background fill for a rect or directly on canvas?
        // Fabric's setBackgroundColor supports Pattern or color string.
        // For gradients, we need to create a fabric.Gradient object.

        // Parsing 'linear-gradient(to right, #ff7e5f, #feb47b)'
        // or 'radial-gradient(circle, #ff9a9e, #fecfef)'

        let isRadial = gradient.includes('radial');
        let colors = gradient.match(/#[a-fA-F0-9]{6}/g) || ['#000', '#fff'];

        // @ts-ignore
        const grad = new fabric.Gradient({
            type: isRadial ? 'radial' : 'linear',
            coords: isRadial ? {
                r1: 0,
                r2: canvasRef.current.width! / 2,
                x1: canvasRef.current.width! / 2,
                y1: canvasRef.current.height! / 2,
                x2: canvasRef.current.width! / 2,
                y2: canvasRef.current.height! / 2,
            } : {
                x1: 0,
                y1: 0,
                x2: canvasRef.current.width!,
                y2: 0,
            },
            colorStops: [
                { offset: 0, color: colors[0] },
                { offset: 1, color: colors[1] }
            ]
        });

        if (canvasRef.current.backgroundImage) {
            // @ts-ignore
            canvasRef.current.setBackgroundImage(null, canvasRef.current.renderAll.bind(canvasRef.current));
        }

        // @ts-ignore
        canvasRef.current.setBackgroundColor(grad, () => canvasRef.current?.renderAll());
        setCanvasBg(gradient); // Store string representation for UI selection if needed
        saveHistory();
    };

    const setBackground = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0] || !canvasRef.current) return;
        const reader = new FileReader();
        reader.onload = (f) => {
            fabric.Image.fromURL(f.target?.result as string, (img) => {
                 if(!canvasRef.current) return;
                const ratio = Math.max(canvasRef.current.width! / img.width!, canvasRef.current.height! / img.height!);
                img.scale(ratio);
                img.set({ originX: 'center', originY: 'center' });
                canvasRef.current.setBackgroundImage(img, canvasRef.current.renderAll.bind(canvasRef.current), {
                    left: canvasRef.current.width! / 2,
                    top: canvasRef.current.height! / 2
                });
                saveHistory();
            });
        };
        reader.readAsDataURL(e.target.files[0]);
        e.target.value = '';
    };

    const addText = () => {
        if (!canvasRef.current) return;
        const t = new fabric.IText('Tap to Edit', {
            left: canvasRef.current.width! / 2,
            top: canvasRef.current.height! / 2,
            fontFamily: 'Inter',
            fill: '#fff',
            fontSize: 40,
            originX: 'center',
            originY: 'center'
        });
        canvasRef.current.add(t);
        canvasRef.current.setActiveObject(t);
        saveHistory();
        setMenu('TEXT');
    };

    const addShape = (type: 'rect' | 'circle' | 'tri') => {
        if (!canvasRef.current) return;
        let s;
        const opts = { left: canvasRef.current.width! / 2, top: canvasRef.current.height! / 2, fill: '#3b82f6', originX: 'center', originY: 'center' };
        if (type === 'rect') s = new fabric.Rect({ width: 150, height: 150, ...opts });
        if (type === 'circle') s = new fabric.Circle({ radius: 80, ...opts });
        if (type === 'tri') s = new fabric.Triangle({ width: 150, height: 150, ...opts });

        if (s) {
            canvasRef.current.add(s);
            canvasRef.current.setActiveObject(s);
            saveHistory();
        }
        setMenu('HOME');
    };

    const addSticker = (sticker: string) => {
        if (!canvasRef.current) return;
        const t = new fabric.Text(sticker, { fontSize: 80, left: canvasRef.current.width! / 2, top: canvasRef.current.height! / 2, originX: 'center', originY: 'center' });
        canvasRef.current.add(t);
        canvasRef.current.setActiveObject(t);
        saveHistory();
    };

    const toggleDraw = () => {
        if (!canvasRef.current) return;
        const c = canvasRef.current;
        // @ts-ignore
        c.isDrawingMode = !c.isDrawingMode;
        // @ts-ignore
        if (c.isDrawingMode) {
            c.freeDrawingBrush = new fabric.PencilBrush(c);
            c.freeDrawingBrush.width = editorState.brushS;
            c.freeDrawingBrush.color = editorState.brushC;
            setMenu('DRAW');
            setActiveObj(null);
            c.discardActiveObject();
            c.requestRenderAll();
        } else {
            setMenu('HOME');
        }
    };

    // Update drawing brush color/width dynamically when editorState changes
    useEffect(() => {
        if (canvasRef.current && (canvasRef.current as any).isDrawingMode) {
            const c = canvasRef.current;
            if (c.freeDrawingBrush) {
                c.freeDrawingBrush.width = editorState.brushS;
                c.freeDrawingBrush.color = editorState.brushC;
            }
        }
    }, [editorState.brushS, editorState.brushC]);

    const startCrop = () => {
        if (!activeObj || activeObj.type !== 'image') return;
        setCropData({ src: activeObj.toDataURL({}) });
    };

    const handleCrop = (croppedDataUrl: string) => {
        if (!activeObj || !canvasRef.current) return;
        (activeObj as fabric.Image).setSrc(croppedDataUrl, () => {
            canvasRef.current?.renderAll();
            setCropData(null);
            saveHistory();
        });
    };

    // Interactive Masking State
    const maskShapeRef = useRef<fabric.Object | null>(null);

    const handleStartMasking = (maskType: 'circle' | 'rect' | 'triangle' | 'heart' | 'star') => {
        if (!activeObj || !canvasRef.current || activeObj.type !== 'image') return;

        // Remove existing mask if any to start fresh or just overlay
        // If we want to edit existing mask, we would need to retrieve it.
        // For simplicity, we start a new mask shape.

        const img = activeObj as fabric.Image;
        const w = img.width! * img.scaleX!;
        const h = img.height! * img.scaleY!;
        const size = Math.min(w, h) * 0.8;
        const center = img.getCenterPoint();

        let maskShape: fabric.Object | null = null;

        const commonOpts = {
            left: center.x,
            top: center.y,
            originX: 'center',
            originY: 'center',
            fill: 'rgba(255, 255, 255, 0.3)',
            stroke: '#3b82f6',
            strokeWidth: 2,
            strokeDashArray: [5, 5],
            absolutePositioned: true,
            transparentCorners: false,
            cornerColor: '#fff',
            cornerStrokeColor: '#3b82f6',
            borderColor: '#3b82f6',
            cornerSize: 12,
            padding: 0
        };

        switch (maskType) {
            case 'circle':
                maskShape = new fabric.Circle({ ...commonOpts, radius: size / 2 });
                break;
            case 'triangle':
                maskShape = new fabric.Triangle({ ...commonOpts, width: size, height: size });
                break;
            case 'rect':
                maskShape = new fabric.Rect({ ...commonOpts, width: size, height: size });
                break;
            case 'heart':
                const p = "M 10,30 A 20,20 0,0,1 50,30 A 20,20 0,0,1 90,30 Q 90,60 50,90 Q 10,60 10,30 z";
                maskShape = new fabric.Path(p, commonOpts);
                const b = maskShape.getBoundingRect();
                maskShape.scaleX = size / b.width;
                maskShape.scaleY = size / b.height;
                break;
            case 'star':
                const starP = "M 100 10 L 125 80 L 195 80 L 140 120 L 160 190 L 100 150 L 40 190 L 60 120 L 5 80 L 75 80 Z";
                maskShape = new fabric.Path(starP, commonOpts);
                const sb = maskShape.getBoundingRect();
                maskShape.scaleX = size / sb.width;
                maskShape.scaleY = size / sb.height;
                break;
        }

        if (maskShape) {
            canvasRef.current.add(maskShape);
            canvasRef.current.setActiveObject(maskShape);
            maskShapeRef.current = maskShape;
            setMenu('MASK_EDIT');

            // Lock image to prevent accidental movement
            img.set({ selectable: false, evented: false });
            canvasRef.current.requestRenderAll();
        } else {
            // If null (e.g. rect cleared), remove mask
            img.clipPath = undefined;
            canvasRef.current.requestRenderAll();
            saveHistory();
        }
    };

    const handleFinishMasking = (apply: boolean) => {
        if (!canvasRef.current || !maskShapeRef.current) {
            setMenu('HOME');
            return;
        }

        // Find the underlying image (it's the active object before we started, or we find it)
        // We locked it, so we can find the image that corresponds to our masking session.
        // Ideally we tracked it, but for single selection workflow, it's likely the object 'below' or we stored it.
        // Let's iterate or assume activeObj was the image? No, activeObj became the mask.
        // We need to find the image.

        // Simple heuristic: The image is likely the one immediately behind the mask or we find the one we locked.
        const objects = canvasRef.current.getObjects();
        const maskIdx = objects.indexOf(maskShapeRef.current);
        // We should have stored the target image in a ref too ideally.
        // Let's assume we find the first locked image? Or better, iterate and check which one interacts.

        // Better approach: Store activeImageRef when starting.
        // For now, let's search for the image that was locked.
        const targetImg = objects.find(o => o.type === 'image' && o.selectable === false && o.evented === false) as fabric.Image;

        if (targetImg) {
            if (apply) {
                // Apply the mask
                // Use RELATIVE positioning so the mask moves with the image.
                // 1. Get mask center in absolute coordinates
                const maskCenter = maskShapeRef.current.getCenterPoint();

                // 2. Transform absolute mask center to image's local coordinate system
                // This gives us the position of the mask relative to the image's center (0,0)
                const inverseMatrix = fabric.util.invertTransform(targetImg.calcTransformMatrix());
                const localPoint = fabric.util.transformPoint(maskCenter, inverseMatrix);

                // 3. Calculate relative scale and rotation
                const scaleX = maskShapeRef.current.scaleX! / targetImg.scaleX!;
                const scaleY = maskShapeRef.current.scaleY! / targetImg.scaleY!;
                const angle = maskShapeRef.current.angle! - targetImg.angle!;

                maskShapeRef.current.clone((cloned: fabric.Object) => {
                    cloned.set({
                        left: localPoint.x,
                        top: localPoint.y,
                        originX: 'center',
                        originY: 'center',
                        scaleX: scaleX,
                        scaleY: scaleY,
                        angle: angle,
                        fill: 'black',
                        absolutePositioned: false // Crucial: makes clipPath relative to object
                    });
                    targetImg.clipPath = cloned;

                    // Unlock image
                    targetImg.set({ selectable: true, evented: true });
                    canvasRef.current?.remove(maskShapeRef.current!);
                    maskShapeRef.current = null;
                    canvasRef.current?.setActiveObject(targetImg);
                    canvasRef.current?.requestRenderAll();
                    saveHistory();
                });
            } else {
                // Cancel
                targetImg.set({ selectable: true, evented: true });
                canvasRef.current.remove(maskShapeRef.current);
                maskShapeRef.current = null;
                canvasRef.current.setActiveObject(targetImg);
                canvasRef.current.requestRenderAll();
            }
        } else {
            // Fallback cleanup if no image found
            canvasRef.current.remove(maskShapeRef.current);
            maskShapeRef.current = null;
            canvasRef.current.requestRenderAll();
        }
        setMenu('HOME');
    };

    const handleExport = (format: 'png' | 'jpeg', quality: number, options?: { width: number, height: number, ratio: boolean }) => {
        if (!canvasRef.current) return;
        canvasRef.current.discardActiveObject();
        canvasRef.current.renderAll();

        const mult = options ? options.width / canvasRef.current.width! : 2;

        const data = canvasRef.current.toDataURL({
            format: format,
            quality: quality,
            multiplier: mult
        });

        const link = document.createElement('a');
        link.download = `onyx_edit.${format}`;
        link.href = data;
        link.click();
        setMenu('HOME');
    };

    const handleDelete = () => {
        if (canvasRef.current && activeObj) {
            canvasRef.current.remove(activeObj);
            saveHistory();
        }
    };

    const handleReorder = (obj: fabric.Object, dir: 'up' | 'down') => {
        if(dir === 'up') obj.bringForward();
        else obj.sendBackwards();
        if(canvasRef.current) {
            updateLayers();
            saveHistory();
        }
    };

    const handleDuplicate = () => {
        if (!canvasRef.current || !activeObj) return;
        activeObj.clone((cloned: fabric.Object) => {
            canvasRef.current?.discardActiveObject();
            cloned.set({
                left: cloned.left! + 20,
                top: cloned.top! + 20,
                evented: true,
            });
            if (cloned.type === 'activeSelection') {
                // active selection needs a canvas to render.
                // Ensure type safety: cloned.canvas expects Canvas | undefined, not Canvas | null.
                cloned.canvas = canvasRef.current || undefined;
                (cloned as fabric.ActiveSelection).forEachObject((obj: fabric.Object) => {
                    canvasRef.current?.add(obj);
                });
                // this should not happen if we just clone the active object, but standard practice
                cloned.setCoords();
            } else {
                canvasRef.current?.add(cloned);
            }
            canvasRef.current?.setActiveObject(cloned);
            canvasRef.current?.requestRenderAll();
            saveHistory();
        });
    };

    const handleAddSolidLayer = (color: string) => {
        if (!canvasRef.current) return;
        const rect = new fabric.Rect({
            width: canvasRef.current.width! / canvasRef.current.getZoom(),
            height: canvasRef.current.height! / canvasRef.current.getZoom(),
            fill: color,
            left: 0,
            top: 0,
            originX: 'left',
            originY: 'top'
        });
        canvasRef.current.add(rect);
        canvasRef.current.setActiveObject(rect);
        saveHistory();
        setMenu('HOME');
    };

    const handleAddGradientLayer = (gradient: string) => {
        if (!canvasRef.current) return;

        let isRadial = gradient.includes('radial');
        let colors = gradient.match(/#[a-fA-F0-9]{6}/g) || ['#000', '#fff'];
        const w = canvasRef.current.width! / canvasRef.current.getZoom();
        const h = canvasRef.current.height! / canvasRef.current.getZoom();

        // @ts-ignore
        const grad = new fabric.Gradient({
            type: isRadial ? 'radial' : 'linear',
            coords: isRadial ? {
                r1: 0, r2: w / 2, x1: w / 2, y1: h / 2, x2: w / 2, y2: h / 2,
            } : { x1: 0, y1: 0, x2: w, y2: 0 },
            colorStops: [ { offset: 0, color: colors[0] }, { offset: 1, color: colors[1] } ]
        });

        const rect = new fabric.Rect({
            width: w, height: h, fill: grad, left: 0, top: 0, originX: 'left', originY: 'top'
        });
        canvasRef.current.add(rect);
        canvasRef.current.setActiveObject(rect);
        saveHistory();
        setMenu('HOME');
    };

    return (
        <div className="flex flex-col h-[100dvh] bg-black relative overflow-hidden font-sans">
            {/* Crop Modal */}
            {cropData && (
                <CropModal
                    src={cropData.src}
                    onCancel={() => setCropData(null)}
                    onCrop={handleCrop}
                />
            )}

            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} currentProjectId={projectId} />

            {/* Top Bar */}
            <div className="h-14 flex justify-between items-center px-4 bg-zinc-900 border-b border-zinc-800 z-20 shrink-0">
                <div className="flex gap-4 items-center">
                    <button onClick={() => setSidebarOpen(true)} className="text-white text-xl hover:text-blue-400 transition-colors mr-2">
                        <FaBars />
                    </button>
                    <button
                        onClick={undo}
                        className={`text-xl transition-colors ${canUndo ? 'text-white hover:text-blue-400' : 'text-zinc-700 cursor-not-allowed'}`}
                        disabled={!canUndo}
                    >
                        <FaArrowRotateLeft />
                    </button>
                    <button
                        onClick={redo}
                        className={`text-xl transition-colors ${canRedo ? 'text-white hover:text-blue-400' : 'text-zinc-700 cursor-not-allowed'}`}
                        disabled={!canRedo}
                    >
                        <FaArrowRotateRight />
                    </button>
                </div>
                <div className="flex flex-col">
                    <span className="font-black text-sm tracking-widest bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        ONYX IMAGE EDITOR
                    </span>
                    <span className="text-[10px] text-zinc-500 truncate max-w-[120px]">{projectName}</span>
                </div>
                <button
                    onClick={() => setMenu('EXPORT')}
                    className="bg-white text-black px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 hover:bg-zinc-200 transition-colors"
                >
                    <FaDownload /> Save
                </button>
            </div>

            {/* Canvas Wrapper */}
            <div id="canvas-wrapper" ref={wrapperRef} className="flex-1 relative overflow-hidden bg-[#151515] flex items-center justify-center">
                {/* Checkerboard pattern for transparency */}
                <div className="absolute inset-0 opacity-20 pointer-events-none" style={{
                    backgroundImage: 'linear-gradient(45deg, #252525 25%, transparent 25%), linear-gradient(-45deg, #252525 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #252525 75%), linear-gradient(-45deg, transparent 75%, #252525 75%)',
                    backgroundSize: '20px 20px',
                    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                }}></div>
                <canvas ref={containerRef} />
            </div>

            {/* Layers Panel */}
            <AnimatePresence>
                {menu === 'LAYERS' && (
                    <LayersPanel
                        layers={layers}
                        activeObj={activeObj}
                        onSelect={(o) => { canvasRef.current?.setActiveObject(o); canvasRef.current?.renderAll(); }}
                        onClose={() => setMenu('HOME')}
                        onReorder={handleReorder}
                    />
                )}
            </AnimatePresence>

            {/* Export Panel */}
            <AnimatePresence>
                {menu === 'EXPORT' && (
                    <ExportPanel onClose={() => setMenu('HOME')} onExport={handleExport} />
                )}
            </AnimatePresence>

            {/* Bottom Toolbar */}
            <Toolbar
                activeObj={activeObj}
                editorState={editorState}
                menu={menu}
                setMenu={setMenu}
                subTool={subTool}
                setSubTool={setSubTool}
                onUpdateStyle={updateStyle}
                onAddImage={addImage}
                onSetBackground={setBackground}
                onAddText={addText}
                onAddShape={addShape}
                onAddSticker={addSticker}
                onToggleDraw={toggleDraw}
                onApplyFilter={applyFilter}
                onAdjustImage={adjustImage}
                onCropStart={startCrop}
                onDelete={handleDelete}
                onLayersClick={() => { updateLayers(); setMenu('LAYERS'); }}
                fileInputRef={fileInputRef}
                bgInputRef={bgInputRef}
                canvasBg={canvasBg}
                onSetBackgroundColor={handleSetBackgroundColor}
                onSetGradient={handleSetGradient}
                onAddSolidLayer={handleAddSolidLayer}
                onAddGradientLayer={handleAddGradientLayer}
                onDuplicate={handleDuplicate}
                onStartMasking={handleStartMasking}
                onFinishMasking={handleFinishMasking}
                onFlip={handleFlip}
                onLock={handleLock}
                onOrder={handleOrder}
                onTextFormat={handleTextFormat}
            />
        </div>
    );
}
