'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Move, ZoomIn, Check, X } from 'lucide-react';

interface ImageCropperProps {
  imageSrc: string;
  onCrop: (croppedBlob: Blob) => void;
  onCancel: () => void;
}

export function ImageCropper({ imageSrc, onCrop, onCancel }: ImageCropperProps) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX - offset.x, y: clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setOffset({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const getCroppedImage = () => {
    if (!imageRef.current || !containerRef.current) return;

    const canvas = document.createElement('canvas');
    const size = 400; // Output size
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imageRef.current;
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();

    // Calculate source coordinates based on zoom and offset
    // This is a simplified version for the demo
    const displayWidth = img.width * zoom;
    const displayHeight = img.height * zoom;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, size, size);
    
    // Draw circular clip
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();

    // Map container space to canvas space
    const scaleX = img.naturalWidth / img.width;
    const scaleY = img.naturalHeight / img.height;

    // Center of container in image space
    const centerX = (rect.width / 2 - offset.x) / zoom;
    const centerY = (rect.height / 2 - offset.y) / zoom;

    const sWidth = (rect.width / zoom) * scaleX;
    const sHeight = (rect.height / zoom) * scaleY;
    const sX = (centerX * scaleX) - (sWidth / 2);
    const sY = (centerY * scaleY) - (sHeight / 2);

    ctx.drawImage(
      img,
      sX, sY, sWidth, sHeight,
      0, 0, size, size
    );

    canvas.toBlob((blob) => {
      if (blob) onCrop(blob);
    }, 'image/jpeg', 0.9);
  };

  return (
    <div className="flex flex-col items-center gap-6 p-4">
      <div 
        ref={containerRef}
        className="relative w-72 h-72 sm:w-80 sm:h-80 rounded-full border-4 border-primary/20 overflow-hidden cursor-move bg-slate-100 touch-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
      >
        <img
          ref={imageRef}
          src={imageSrc}
          alt="To crop"
          draggable={false}
          className="absolute max-w-none transition-transform duration-75 origin-center"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
            top: '50%',
            left: '50%',
            marginTop: imageRef.current ? -imageRef.current.height / 2 : 0,
            marginLeft: imageRef.current ? -imageRef.current.width / 2 : 0,
          }}
        />
        {/* Visual Guide Overlay */}
        <div className="absolute inset-0 pointer-events-none ring-[100px] ring-black/50" />
      </div>

      <div className="w-full space-y-4">
        <div className="flex items-center gap-4">
          <ZoomIn className="h-4 w-4 text-muted-foreground" />
          <input 
            type="range" 
            min="0.5" 
            max="3" 
            step="0.1" 
            value={zoom} 
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
          />
        </div>
        <p className="text-[10px] text-center font-bold text-muted-foreground uppercase tracking-widest flex items-center justify-center gap-2">
          <Move className="h-3 w-3" /> Drag photo to center
        </p>
      </div>

      <div className="flex gap-3 w-full">
        <Button variant="outline" className="flex-1 rounded-xl h-11" onClick={onCancel}>
          <X className="h-4 w-4 mr-2" /> Cancel
        </Button>
        <Button className="flex-1 rounded-xl h-11 shadow-lg shadow-primary/20" onClick={getCroppedImage}>
          <Check className="h-4 w-4 mr-2" /> Use Photo
        </Button>
      </div>
    </div>
  );
}
