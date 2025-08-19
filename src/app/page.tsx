"use client";

import * as React from "react";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarInset,
  SidebarTrigger,
  SidebarInput,
} from "@/components/ui/sidebar";
import { Code, Bot, Loader2 } from "lucide-react";
import type { FileNode } from "@/lib/types";
import { mockFiles } from "@/lib/mock-data";
import { FileExplorer } from "@/components/file-explorer";
import { EditorView } from "@/components/editor-view";
import { DropZone } from "@/components/drop-zone";
import { generateDocsAction } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [isPending, startTransition] = React.useTransition();
  const { toast } = useToast();

  const [files, setFiles] = React.useState<FileNode[]>(mockFiles);
  const [selectedFile, setSelectedFile] = React.useState<FileNode | null>(null);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [documentation, setDocumentation] = React.useState<string>("");
  const [isPanelOpen, setIsPanelOpen] = React.useState(false);

  const handleFileSelect = React.useCallback((file: FileNode) => {
    if (file.type === "file") {
      setSelectedFile(file);
    }
  }, []);

  const handleFileContentChange = (content: string) => {
    if (selectedFile) {
      setSelectedFile({ ...selectedFile, content });
      
      const updateFileContent = (nodes: FileNode[], id: string, newContent: string): FileNode[] => {
        return nodes.map(node => {
          if (node.id === id) {
            return { ...node, content: newContent };
          }
          if (node.children) {
            return { ...node, children: updateFileContent(node.children, id, newContent) };
          }
          return node;
        });
      };

      setFiles(prevFiles => updateFileContent(prevFiles, selectedFile.id, content));
    }
  };

  const handleGenerateDocs = () => {
    if (!selectedFile || !selectedFile.content) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No file content to generate documentation from.",
      });
      return;
    }

    startTransition(async () => {
      setDocumentation("");
      setIsPanelOpen(true);
      const result = await generateDocsAction(selectedFile.content || "");
      if (result.error) {
        toast({
          variant: "destructive",
          title: "Documentation Generation Failed",
          description: result.error,
        });
        setDocumentation(`Error: ${result.error}`);
      } else {
        setDocumentation(result.documentation || "");
      }
    });
  };

  const handleDrop = (droppedFiles: File[]) => {
    toast({
      title: "Files Uploaded",
      description: `${droppedFiles.length} file(s) dropped: ${droppedFiles.map(f => f.name).join(', ')}`,
    });
  };

  return (
    <SidebarProvider>
      <Sidebar side="left" className="w-[--sidebar-width]" collapsible="icon">
        <SidebarHeader className="p-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Code className="h-6 w-6 text-primary" />
            </Button>
            <h1 className="text-lg font-semibold tracking-tight">
              File Explorer
            </h1>
          </div>
        </SidebarHeader>
        <div className="p-2">
          <SidebarInput
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <SidebarContent className="p-2">
          <FileExplorer
            files={files}
            onFileSelect={handleFileSelect}
            searchTerm={searchTerm}
            selectedFile={selectedFile}
          />
        </SidebarContent>
      </Sidebar>
      <SidebarInset className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6">
          <SidebarTrigger />
          <h1 className="text-lg font-semibold md:text-xl">
            {selectedFile?.name || "GWD Kollam 19082025"}
          </h1>
          {selectedFile && (
            <div className="ml-auto flex items-center gap-2">
              <Button onClick={handleGenerateDocs} disabled={isPending} variant="outline">
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Bot className="mr-2 h-4 w-4" />
                )}
                Generate Documentation
              </Button>
            </div>
          )}
        </header>

        <main className="flex-1 overflow-auto">
          {selectedFile ? (
            <EditorView
              file={selectedFile}
              onContentChange={handleFileContentChange}
              isGenerating={isPending}
              documentation={documentation}
              isPanelOpen={isPanelOpen}
              onPanelOpenChange={setIsPanelOpen}
            />
          ) : (
            <DropZone onDrop={handleDrop} />
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
