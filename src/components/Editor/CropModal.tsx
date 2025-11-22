'use client';

import React, { useRef, useState, useEffect } from 'react';
import Cropper, { ReactCropperElement } from 'react-cropper';
import 'cropperjs/dist/cropper.css';

interface CropModalProps {
  src: string;
  onCancel: () => void;
  onCrop: (croppedDataUrl: string) => void;
}

export const CropModal: React.FC<CropModalProps> = ({ src, onCancel, onCrop }) => {
  const cropperRef = useRef<ReactCropperElement>(null);

  const handleCrop = () => {
    const cropper = cropperRef.current?.cropper;
    if (cropper) {
      onCrop(cropper.getCroppedCanvas().toDataURL());
    }
  };

  return (
    <div className="absolute inset-0 z-50 bg-black flex flex-col animate-in fade-in duration-200">
      <div className="flex-1 p-4 relative bg-black flex items-center justify-center overflow-hidden">
        <Cropper
          src={src}
          style={{ height: '100%', width: '100%' }}
          initialAspectRatio={NaN}
          guides={true}
          ref={cropperRef}
          viewMode={1}
          dragMode="move"
          background={false}
          responsive={true}
        />
      </div>
      <div className="h-16 bg-zinc-900 flex justify-between items-center px-6 border-t border-zinc-800 safe-area-pb">
        <button onClick={onCancel} className="text-red-500 font-bold hover:text-red-400 transition-colors">Cancel</button>
        <button onClick={handleCrop} className="text-blue-500 font-bold hover:text-blue-400 transition-colors">Apply Crop</button>
      </div>
    </div>
  );
};
