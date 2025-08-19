"use client";

import { UploadCloud } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

interface DropZoneProps {
  onDrop: (files: File[]) => void;
}

export function DropZone({ onDrop }: DropZoneProps) {
  const [isDragOver, setIsDragOver] = React.useState(false);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files && files.length > 0) {
      onDrop(files);
    }
  };

  return (
    <div
      className="flex h-full w-full items-center justify-center p-4"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div
        className={cn(
          "flex h-full w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-border transition-colors",
          isDragOver && "border-primary bg-accent"
        )}
      >
        <UploadCloud className="mb-4 h-16 w-16 text-muted-foreground" />
        <p className="text-lg font-semibold text-muted-foreground">
          Select a file to start editing
        </p>
        <p className="text-sm text-muted-foreground">or drag and drop files here</p>
      </div>
    </div>
  );
}
