"use client";

import type { FileNode } from "@/lib/types";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "./ui/skeleton";

interface EditorViewProps {
  file: FileNode;
  onContentChange: (content: string) => void;
  isGenerating: boolean;
  documentation: string;
  isPanelOpen: boolean;
  onPanelOpenChange: (isOpen: boolean) => void;
}

export function EditorView({
  file,
  onContentChange,
  isGenerating,
  documentation,
  isPanelOpen,
  onPanelOpenChange,
}: EditorViewProps) {
  return (
    <div className="flex h-full w-full">
      <div className="flex-1 p-4 h-full">
        <Textarea
          value={file.content || ""}
          onChange={(e) => onContentChange(e.target.value)}
          className="h-full w-full resize-none border-0 p-0 text-base font-mono focus-visible:ring-0"
          placeholder="Start typing..."
        />
      </div>
      <Sheet open={isPanelOpen} onOpenChange={onPanelOpenChange}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Generated Documentation</SheetTitle>
            <SheetDescription>
              AI-generated documentation for <span className="font-semibold text-primary">{file.name}</span>.
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="h-[calc(100%-4rem)] mt-4 pr-4">
            {isGenerating ? (
              <div className="space-y-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : (
              <pre className="whitespace-pre-wrap text-sm font-sans">{documentation}</pre>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}
