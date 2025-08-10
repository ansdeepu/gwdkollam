"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FileText, X, Sparkles } from "lucide-react";

interface FileListProps {
  files: File[];
  selectedFile: File | null;
  onSelectFile: (file: File) => void;
  onRemoveFile: (file: File) => void;
  fileAnalyses: Record<string, boolean>;
}

export function FileList({ files, selectedFile, onSelectFile, onRemoveFile, fileAnalyses }: FileListProps) {
  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/50 p-8 text-center text-sm text-muted-foreground">
        <p>Your uploaded files will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {files.map((file, index) => {
        const isSelected = selectedFile?.name === file.name;
        const isHighlighted = fileAnalyses[file.name];
        
        return (
          <div
            key={`${file.name}-${index}`}
            className={cn(
              "group flex items-center justify-between rounded-lg border p-3 pr-2 transition-all duration-200 animate-in fade-in slide-in-from-top-2",
              isSelected ? "border-primary bg-accent" : "hover:bg-accent/50 hover:border-accent-foreground/50",
            )}
          >
            <button
              onClick={() => onSelectFile(file)}
              className="flex flex-1 items-center gap-3 truncate"
              aria-current={isSelected}
            >
              {isHighlighted ? (
                 <Sparkles className="h-5 w-5 shrink-0 text-primary" />
              ) : (
                 <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
              )}
              <span className={cn("truncate font-medium", isSelected && "text-primary-foreground")}>
                {file.name}
              </span>
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 opacity-50 transition-opacity group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveFile(file);
              }}
              aria-label={`Remove ${file.name}`}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
