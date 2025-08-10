"use client";

import { useState, useCallback, useRef, type DragEvent } from 'react';
import { UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface FileUploaderProps {
  onFilesAdded: (files: File[]) => void;
}

export function FileUploader({ onFilesAdded }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFiles = useCallback((files: FileList | null) => {
    if (files) {
      onFilesAdded(Array.from(files));
    }
  }, [onFilesAdded]);

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // This is necessary to allow dropping
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFiles(files);
      e.dataTransfer.clearData();
    }
  };
  
  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      className={cn(
        "relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors duration-300",
        isDragging 
          ? "border-primary bg-accent" 
          : "border-muted-foreground/30 bg-muted/50 hover:border-primary/50 hover:bg-accent/50"
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
        aria-hidden="true"
      />
      <div className="flex flex-col items-center gap-2 text-muted-foreground">
        <UploadCloud className={cn("h-10 w-10", isDragging && "text-primary")} />
        <p className="font-semibold">
          <span className="text-primary">Click to upload</span> or drag and drop
        </p>
        <p className="text-xs">Any text-based files (TXT, MD, JS, etc.)</p>
      </div>
    </div>
  );
}
