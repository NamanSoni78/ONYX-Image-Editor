import React from 'react';
import { fabric } from 'fabric';
import { EditorState, FONTS, FILTERS, STICKERS } from './constants';
import { loadFonts, MORE_FONTS } from '@/lib/fonts';
import { Slider } from '../ui/Slider';
import { ColorPicker } from '../ui/ColorPicker';
import { GradientPicker } from '../ui/GradientPicker';
import { IconBtn } from '../ui/IconBtn';
import {
    FaImage, FaFont, FaShapes, FaPen, FaLayerGroup, FaDownload, FaArrowLeft,
    FaPlus, FaCropSimple, FaSliders, FaWandMagicSparkles, FaPalette, FaTrashCan,
    FaFaceSmile, FaSquare, FaCircle, FaPlay, FaClone
} from 'react-icons/fa6';

interface ToolbarProps {
    activeObj: fabric.Object | null;
    editorState: EditorState;
    menu: string;
    setMenu: (menu: string) => void;
    subTool: string | null;
    setSubTool: (tool: string | null) => void;
    onUpdateStyle: (key: keyof EditorState, value: any) => void;
    onAddImage: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSetBackground: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onAddText: () => void;
    onAddShape: (type: 'rect' | 'circle' | 'tri') => void;
    onAddSticker: (sticker: string) => void;
    onToggleDraw: () => void;
    onApplyFilter: (filter: any) => void;
    onAdjustImage: (type: string, value: number) => void;
    onCropStart: () => void;
    onDelete: () => void;
    onLayersClick: () => void;
    onDuplicate?: () => void;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    bgInputRef: React.RefObject<HTMLInputElement | null>;
    canvasBg?: string;
    onSetBackgroundColor?: (color: string) => void;
    onSetGradient?: (gradient: string) => void;
    onAddSolidLayer?: (color: string) => void;
    onAddGradientLayer?: (gradient: string) => void;
    onStartMasking?: (shape: 'circle' | 'rect' | 'triangle' | 'heart' | 'star') => void;
    onFinishMasking?: (apply: boolean) => void;
    onFlip?: (axis: 'X' | 'Y') => void;
    onLock?: () => void;
    onOrder?: (action: 'front' | 'back' | 'forward' | 'backward') => void;
    onTextFormat?: (type: 'bold' | 'italic' | 'underline' | 'align-left' | 'align-center' | 'align-right') => void;
}

import {
    FaArrowUp, FaArrowDown, FaAnglesUp, FaAnglesDown,
    FaLock, FaUnlock, FaBold, FaItalic, FaUnderline,
    FaAlignLeft, FaAlignCenter, FaAlignRight, FaArrowsLeftRight, FaArrowsUpDown,
    FaCheck, FaXmark
} from 'react-icons/fa6';

export const Toolbar: React.FC<ToolbarProps> = ({
    activeObj, editorState, menu, setMenu, subTool, setSubTool,
    onUpdateStyle, onAddImage, onSetBackground, onAddText, onAddShape, onAddSticker,
    onToggleDraw, onApplyFilter, onAdjustImage, onCropStart, onDelete, onLayersClick, onDuplicate,
    fileInputRef, bgInputRef, canvasBg, onSetBackgroundColor, onSetGradient,
    onAddSolidLayer, onAddGradientLayer,
    onStartMasking, onFinishMasking,
    onFlip, onLock, onOrder, onTextFormat
}) => {

    const renderSubMenu = () => {
        switch (menu) {
            case 'ADD':
                return (
                    <div className="p-4 animate-in slide-in-from-bottom-10 duration-200 space-y-4">
                        <button onClick={() => fileInputRef.current?.click()} className="w-full py-3 bg-zinc-800 rounded-lg text-xs font-bold hover:bg-zinc-700 transition-colors flex items-center justify-center">
                            <FaImage className="mr-2" /> Upload Image
                        </button>

                        <div>
                            <p className="text-[10px] font-bold text-zinc-500 mb-2 uppercase">Add Solid Color Layer</p>
                            <ColorPicker selected="" onChange={(c) => onAddSolidLayer && onAddSolidLayer(c)} />
                        </div>

                        <div>
                            <p className="text-[10px] font-bold text-zinc-500 mb-2 uppercase">Add Gradient Layer</p>
                            <GradientPicker selected="" onChange={(g) => onAddGradientLayer && onAddGradientLayer(g)} onCustomGradient={() => {}} />
                        </div>
                    </div>
                );
            case 'MASK':
                return (
                    <div className="flex justify-around p-4 animate-in slide-in-from-bottom-10 duration-200">
                        <button onClick={() => onStartMasking && onStartMasking('rect')} className="w-16 h-16 bg-zinc-800 rounded-xl flex flex-col items-center justify-center hover:bg-zinc-700 transition-colors gap-2">
                            <div className="w-8 h-8 border-2 border-white"></div>
                            <span className="text-[9px] font-bold text-zinc-400">NONE</span>
                        </button>
                        <button onClick={() => onStartMasking && onStartMasking('circle')} className="w-16 h-16 bg-zinc-800 rounded-xl flex flex-col items-center justify-center hover:bg-zinc-700 transition-colors gap-2">
                            <div className="w-8 h-8 border-2 border-white rounded-full"></div>
                            <span className="text-[9px] font-bold text-zinc-400">CIRCLE</span>
                        </button>
                        <button onClick={() => onStartMasking && onStartMasking('triangle')} className="w-16 h-16 bg-zinc-800 rounded-xl flex flex-col items-center justify-center hover:bg-zinc-700 transition-colors gap-2">
                            <div className="w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-b-[32px] border-b-white"></div>
                            <span className="text-[9px] font-bold text-zinc-400">TRIANGLE</span>
                        </button>
                        <button onClick={() => onStartMasking && onStartMasking('heart')} className="w-16 h-16 bg-zinc-800 rounded-xl flex flex-col items-center justify-center hover:bg-zinc-700 transition-colors gap-2">
                            <div className="text-2xl">❤️</div>
                            <span className="text-[9px] font-bold text-zinc-400">HEART</span>
                        </button>
                        <button onClick={() => onStartMasking && onStartMasking('star')} className="w-16 h-16 bg-zinc-800 rounded-xl flex flex-col items-center justify-center hover:bg-zinc-700 transition-colors gap-2">
                            <div className="text-2xl">⭐</div>
                            <span className="text-[9px] font-bold text-zinc-400">STAR</span>
                        </button>
                    </div>
                );
            case 'MASK_EDIT':
                return (
                    <div className="flex justify-center gap-4 p-4 animate-in slide-in-from-bottom-10 duration-200">
                        <button
                            onClick={() => onFinishMasking && onFinishMasking(false)}
                            className="px-6 py-3 bg-zinc-800 text-red-400 hover:bg-zinc-700 rounded-full font-bold flex items-center gap-2"
                        >
                            <FaXmark /> Cancel
                        </button>
                        <button
                            onClick={() => onFinishMasking && onFinishMasking(true)}
                            className="px-6 py-3 bg-blue-600 text-white hover:bg-blue-500 rounded-full font-bold flex items-center gap-2 shadow-lg shadow-blue-900/20"
                        >
                            <FaCheck /> Apply Mask
                        </button>
                    </div>
                );
            case 'ARRANGE':
                return (
                    <div className="p-4 animate-in slide-in-from-bottom-10 duration-200 space-y-4">
                        <div className="flex justify-around">
                            <button onClick={() => onFlip && onFlip('X')} className="flex flex-col items-center gap-1 text-zinc-400 hover:text-white">
                                <FaArrowsLeftRight className="text-xl"/> <span className="text-[9px] font-bold">FLIP X</span>
                            </button>
                            <button onClick={() => onFlip && onFlip('Y')} className="flex flex-col items-center gap-1 text-zinc-400 hover:text-white">
                                <FaArrowsUpDown className="text-xl"/> <span className="text-[9px] font-bold">FLIP Y</span>
                            </button>
                            <button onClick={() => onLock && onLock()} className="flex flex-col items-center gap-1 text-zinc-400 hover:text-white">
                                {activeObj?.lockMovementX ? <FaLock className="text-xl text-red-500"/> : <FaUnlock className="text-xl"/>}
                                <span className="text-[9px] font-bold">LOCK</span>
                            </button>
                        </div>
                        <div className="h-px bg-white/10 w-full"></div>
                        <div className="flex justify-around">
                            <button onClick={() => onOrder && onOrder('forward')} className="flex flex-col items-center gap-1 text-zinc-400 hover:text-white">
                                <FaArrowUp className="text-xl"/> <span className="text-[9px] font-bold">UP</span>
                            </button>
                            <button onClick={() => onOrder && onOrder('backward')} className="flex flex-col items-center gap-1 text-zinc-400 hover:text-white">
                                <FaArrowDown className="text-xl"/> <span className="text-[9px] font-bold">DOWN</span>
                            </button>
                            <button onClick={() => onOrder && onOrder('front')} className="flex flex-col items-center gap-1 text-zinc-400 hover:text-white">
                                <FaAnglesUp className="text-xl"/> <span className="text-[9px] font-bold">TOP</span>
                            </button>
                            <button onClick={() => onOrder && onOrder('back')} className="flex flex-col items-center gap-1 text-zinc-400 hover:text-white">
                                <FaAnglesDown className="text-xl"/> <span className="text-[9px] font-bold">BOTTOM</span>
                            </button>
                        </div>
                    </div>
                );
            case 'BG':
                return (
                    <div className="p-4 animate-in slide-in-from-bottom-10 duration-200">
                        <p className="text-xs font-bold text-zinc-500 mb-2">SOLID COLOR</p>
                        <ColorPicker
                            selected={canvasBg || editorState.bg}
                            onChange={(c) => onSetBackgroundColor ? onSetBackgroundColor(c) : onUpdateStyle('bg', c)}
                        />

                        <p className="text-xs font-bold text-zinc-500 mt-4 mb-2">GRADIENTS</p>
                        <GradientPicker
                            selected={canvasBg || ''}
                            onChange={(g) => onSetGradient && onSetGradient(g)}
                            onCustomGradient={() => {}}
                        />

                        <p className="text-xs font-bold text-zinc-500 mt-4 mb-2">IMAGE BACKGROUND</p>
                        <button onClick={() => bgInputRef.current?.click()} className="w-full py-3 bg-zinc-800 rounded-lg text-xs font-bold hover:bg-zinc-700 transition-colors flex items-center justify-center">
                            <FaPlus className="mr-2" /> Upload Image
                        </button>
                    </div>
                );
            case 'SHAPE':
                return (
                    <div className="flex justify-around p-4 animate-in slide-in-from-bottom-10 duration-200">
                        <button onClick={() => onAddShape('rect')} className="w-16 h-16 bg-zinc-800 rounded-xl flex items-center justify-center hover:bg-zinc-700 transition-colors"><FaSquare className="text-2xl text-zinc-400" /></button>
                        <button onClick={() => onAddShape('circle')} className="w-16 h-16 bg-zinc-800 rounded-xl flex items-center justify-center hover:bg-zinc-700 transition-colors"><FaCircle className="text-2xl text-zinc-400" /></button>
                        <button onClick={() => onAddShape('tri')} className="w-16 h-16 bg-zinc-800 rounded-xl flex items-center justify-center hover:bg-zinc-700 transition-colors"><FaPlay className="text-2xl -rotate-90 text-zinc-400" /></button>
                    </div>
                );
            case 'DRAW':
                return (
                    <div className="p-4 animate-in slide-in-from-bottom-10 duration-200">
                        <div className="flex justify-center mb-2">
                             <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-bold animate-pulse">
                                DRAWING MODE ACTIVE
                            </span>
                        </div>
                        <Slider label="Brush Size" value={editorState.brushS} min={1} max={50} onChange={(v) => onUpdateStyle('brushS', v)} />
                        <ColorPicker selected={editorState.brushC} onChange={(c) => onUpdateStyle('brushC', c)} />
                    </div>
                );
            case 'TEXT':
                return (
                    <div className="p-4 animate-in slide-in-from-bottom-10 duration-200 space-y-4">
                         {/* Format Tools */}
                         <div className="flex gap-4 justify-center border-b border-white/10 pb-4">
                            <div className="flex bg-zinc-800 rounded-lg overflow-hidden">
                                <button onClick={() => onTextFormat && onTextFormat('bold')} className={`p-3 hover:bg-zinc-700 ${activeObj && (activeObj as any).fontWeight === 'bold' ? 'text-blue-400' : 'text-zinc-400'}`}><FaBold/></button>
                                <button onClick={() => onTextFormat && onTextFormat('italic')} className={`p-3 hover:bg-zinc-700 ${activeObj && (activeObj as any).fontStyle === 'italic' ? 'text-blue-400' : 'text-zinc-400'}`}><FaItalic/></button>
                                <button onClick={() => onTextFormat && onTextFormat('underline')} className={`p-3 hover:bg-zinc-700 ${activeObj && (activeObj as any).underline ? 'text-blue-400' : 'text-zinc-400'}`}><FaUnderline/></button>
                            </div>
                            <div className="flex bg-zinc-800 rounded-lg overflow-hidden">
                                <button onClick={() => onTextFormat && onTextFormat('align-left')} className={`p-3 hover:bg-zinc-700 ${activeObj && (activeObj as any).textAlign === 'left' ? 'text-blue-400' : 'text-zinc-400'}`}><FaAlignLeft/></button>
                                <button onClick={() => onTextFormat && onTextFormat('align-center')} className={`p-3 hover:bg-zinc-700 ${activeObj && (activeObj as any).textAlign === 'center' ? 'text-blue-400' : 'text-zinc-400'}`}><FaAlignCenter/></button>
                                <button onClick={() => onTextFormat && onTextFormat('align-right')} className={`p-3 hover:bg-zinc-700 ${activeObj && (activeObj as any).textAlign === 'right' ? 'text-blue-400' : 'text-zinc-400'}`}><FaAlignRight/></button>
                            </div>
                         </div>

                         <div className="flex gap-2 items-center">
                             <div className="flex-1 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                {[...FONTS, ...MORE_FONTS].map(f => (
                                    <button
                                        key={f}
                                        onClick={() => onUpdateStyle('font', f)}
                                        className={`px-4 py-2 rounded-lg bg-zinc-800 text-xs whitespace-nowrap transition-all ${editorState.font === f ? 'text-blue-400 border border-blue-500 bg-zinc-900' : 'text-zinc-400 hover:bg-zinc-700'}`}
                                        style={{ fontFamily: f }}
                                    >
                                        {f}
                                    </button>
                                ))}
                             </div>
                         </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div><span className="text-[10px] font-bold text-zinc-500 mb-2 block">FILL</span><ColorPicker selected={editorState.fill} onChange={(c) => onUpdateStyle('fill', c)} /></div>
                            <div><span className="text-[10px] font-bold text-zinc-500 mb-2 block">BG</span><ColorPicker selected={editorState.bg} onChange={(c) => onUpdateStyle('bg', c)} /></div>
                        </div>
                    </div>
                );
            case 'ADJUST':
                return (
                    <div className="p-4 animate-in slide-in-from-bottom-10 duration-200 grid grid-cols-2 gap-x-4">
                        <Slider label="Brightness" value={editorState.brightness} min={-1} max={1} step={0.05} onChange={(v) => onAdjustImage('brightness', v)} />
                        <Slider label="Contrast" value={editorState.contrast} min={-1} max={1} step={0.05} onChange={(v) => onAdjustImage('contrast', v)} />
                        <Slider label="Saturation" value={editorState.saturation} min={-1} max={1} step={0.05} onChange={(v) => onAdjustImage('saturation', v)} />
                        <Slider label="Green Screen" value={editorState.chroma} min={0} max={1} step={0.05} onChange={(v) => onAdjustImage('chroma', v)} />
                    </div>
                );
            case 'FILTER':
                return (
                    <div className="flex gap-3 p-4 animate-in slide-in-from-bottom-10 duration-200 overflow-x-auto scrollbar-hide">
                        {FILTERS.map((f, i) => (
                            <button key={i} onClick={() => onApplyFilter(f)} className="flex flex-col items-center gap-2 flex-shrink-0 group">
                                <div className="w-16 h-16 bg-zinc-800 rounded-xl border border-zinc-700 overflow-hidden group-hover:border-zinc-500 transition-colors">
                                    <div
                                        className="w-full h-full bg-gradient-to-br from-orange-200 to-blue-500"
                                        style={{ filter: f.name === 'Gray' ? 'grayscale(1)' : f.name === 'Sepia' ? 'sepia(1)' : '' }}
                                    ></div>
                                </div>
                                <span className="text-[9px] font-bold uppercase text-zinc-400 group-hover:text-zinc-200">{f.name}</span>
                            </button>
                        ))}
                    </div>
                );
            case 'STICKER':
                return (
                    <div className="p-4 animate-in slide-in-from-bottom-10 duration-200">
                        <div className="flex items-center justify-center mb-4">
                            <button
                                onClick={() => {
                                    const s = prompt('Enter sticker emoji or text:', '🔥');
                                    if (s) onAddSticker(s);
                                }}
                                className="w-full py-2 bg-zinc-800 rounded-lg text-sm font-bold hover:bg-zinc-700 transition-colors border border-white/10"
                            >
                                <FaPlus className="inline mr-2" /> Custom Sticker
                            </button>
                        </div>
                        <div className="grid grid-cols-6 gap-4 h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700">
                            {STICKERS.map(s => (
                                <button key={s} onClick={() => onAddSticker(s)} className="text-3xl hover:scale-110 transition-transform">{s}</button>
                            ))}
                        </div>
                    </div>
                );
            case 'STYLE':
                return (
                    <div className="p-4 animate-in slide-in-from-bottom-10 duration-200">
                         <div className="flex gap-4 mb-4 border-b border-white/10 pb-2 overflow-x-auto scrollbar-hide">
                            {(activeObj?.type === 'rect' || activeObj?.type === 'circle' || activeObj?.type === 'triangle') &&
                                <button onClick={() => setSubTool('fill')} className={`text-xs font-bold whitespace-nowrap ${subTool === 'fill' ? 'text-blue-400' : 'text-zinc-500 hover:text-zinc-300'}`}>FILL</button>
                            }
                            <button onClick={() => setSubTool('border')} className={`text-xs font-bold whitespace-nowrap ${subTool === 'border' ? 'text-blue-400' : 'text-zinc-500 hover:text-zinc-300'}`}>BORDER</button>
                            <button onClick={() => setSubTool('shadow')} className={`text-xs font-bold whitespace-nowrap ${subTool === 'shadow' ? 'text-blue-400' : 'text-zinc-500 hover:text-zinc-300'}`}>SHADOW</button>
                            <button onClick={() => setSubTool('opacity')} className={`text-xs font-bold whitespace-nowrap ${subTool === 'opacity' ? 'text-blue-400' : 'text-zinc-500 hover:text-zinc-300'}`}>OPACITY</button>
                            {activeObj?.type === 'rect' && <button onClick={() => setSubTool('radius')} className={`text-xs font-bold whitespace-nowrap ${subTool === 'radius' ? 'text-blue-400' : 'text-zinc-500 hover:text-zinc-300'}`}>RADIUS</button>}
                        </div>

                        {subTool === 'fill' && (
                            <div className="space-y-2">
                                <div className="text-[10px] font-bold text-zinc-500 mb-1">FILL COLOR</div>
                                <ColorPicker selected={editorState.fill} onChange={(c) => onUpdateStyle('fill', c)} />
                            </div>
                        )}
                        {subTool === 'border' && <><Slider label="Width" value={editorState.strokeW} min={0} max={20} step={1} onChange={(v) => onUpdateStyle('strokeW', v)} /><ColorPicker selected={editorState.strokeC} onChange={(c) => onUpdateStyle('strokeC', c)} /></>}
                        {subTool === 'shadow' && <>
                            <div className="grid grid-cols-2 gap-4">
                                <Slider label="Blur" value={editorState.shadowB} min={0} max={50} step={1} onChange={(v) => onUpdateStyle('shadowB', v)} />
                                <Slider label="Offset" value={editorState.shadowO} min={0} max={50} step={1} onChange={(v) => onUpdateStyle('shadowO', v)} />
                            </div>
                            <div className="text-[10px] font-bold text-zinc-500 mb-2 mt-2">COLOR</div>
                            <ColorPicker selected={editorState.shadowC} onChange={(c) => onUpdateStyle('shadowC', c)} />
                        </>}
                        {subTool === 'opacity' && <Slider label="Opacity" value={editorState.opacity} min={0} max={1} step={0.05} onChange={(v) => onUpdateStyle('opacity', v)} />}
                        {subTool === 'radius' && <Slider label="Corner Radius" value={editorState.radius} min={0} max={100} onChange={(v) => onUpdateStyle('radius', v)} />}
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="glass w-full z-30 pb-[calc(env(safe-area-inset-bottom)+5px)] transition-all bg-zinc-900/90 backdrop-blur-xl border-t border-white/10">
            {/* Sub Menus */}
            <div className="border-b border-white/5 min-h-[10px]">
                {renderSubMenu()}
            </div>

            {/* Main Icons Row */}
            <div className="flex items-center px-2 py-2 gap-1 overflow-x-auto scrollbar-hide">
                <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={onAddImage} />
                <input type="file" accept="image/*" ref={bgInputRef} className="hidden" onChange={onSetBackground} />

                {menu !== 'HOME' ? (
                    <IconBtn icon={<FaArrowLeft />} label="Done" onClick={() => { setMenu('HOME'); setSubTool(null); }} />
                ) : (
                    <>
                        <IconBtn icon={<FaPlus />} label="Add" onClick={() => setMenu('ADD')} />
                        <IconBtn icon={<FaImage />} label="Backgnd" onClick={() => setMenu('BG')} />
                        <IconBtn icon={<FaFont />} label="Text" onClick={onAddText} />
                        <IconBtn icon={<FaShapes />} label="Shapes" onClick={() => setMenu('SHAPE')} />
                        <IconBtn
                            icon={<FaPen />}
                            label="Draw"
                            onClick={onToggleDraw}
                        />
                        <IconBtn icon={<FaFaceSmile />} label="Sticker" onClick={() => setMenu('STICKER')} />
                        <IconBtn icon={<FaLayerGroup />} label="Layers" onClick={onLayersClick} />

                        {activeObj && <div className="w-px h-8 bg-white/20 mx-2 shrink-0"></div>}

                        {activeObj?.type === 'image' && (
                            <>
                                <IconBtn icon={<FaCropSimple />} label="Crop" onClick={onCropStart} />
                                <IconBtn icon={<FaShapes />} label="Mask" onClick={() => setMenu('MASK')} />
                                <IconBtn icon={<FaSliders />} label="Adjust" onClick={() => setMenu('ADJUST')} />
                                <IconBtn icon={<FaWandMagicSparkles />} label="Filter" onClick={() => setMenu('FILTER')} />
                            </>
                        )}

                        {activeObj && (activeObj.type === 'i-text' || activeObj.type === 'text') && (
                            <IconBtn icon={<FaFont />} label="Edit Txt" onClick={() => setMenu('TEXT')} />
                        )}

                        {activeObj && (
                            <>
                                <IconBtn icon={<FaPalette />} label="Style" onClick={() => { setMenu('STYLE'); setSubTool('border'); }} />
                                <IconBtn icon={<FaClone />} label="Clone" onClick={() => onDuplicate && onDuplicate()} />
                                <IconBtn icon={<FaLayerGroup />} label="Arrange" onClick={() => setMenu('ARRANGE')} />
                                <IconBtn icon={<FaTrashCan />} label="Delete" color="#ef4444" onClick={onDelete} active />
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};
