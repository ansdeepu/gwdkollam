"use client";

import * as React from "react";
import { FileNode } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Folder,
  File as FileIcon,
  FolderOpen,
  FileCode2,
  FileJson,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";

interface FileExplorerProps {
  files: FileNode[];
  onFileSelect: (file: FileNode) => void;
  searchTerm: string;
  selectedFile: FileNode | null;
}

const getFileIcon = (file: FileNode) => {
  switch (file.extension) {
    case "js":
    case "ts":
      return <FileCode2 className="h-4 w-4" />;
    case "json":
      return <FileJson className="h-4 w-4" />;
    case "css":
      return <FileIcon className="h-4 w-4" />;
    case "html":
      return <FileCode2 className="h-4 w-4" />;
    default:
      return <FileIcon className="h-4 w-4" />;
  }
};

const FileNodeItem: React.FC<{
  node: FileNode;
  onFileSelect: (file: FileNode) => void;
  searchTerm: string;
  selectedFile: FileNode | null;
  level: number;
}> = ({ node, onFileSelect, searchTerm, selectedFile, level }) => {
  const [isOpen, setIsOpen] = React.useState(true);

  if (
    searchTerm &&
    node.type === "directory" &&
    !node.children?.some((child) =>
      child.name.toLowerCase().includes(searchTerm.toLowerCase())
    ) &&
    !node.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) {
    return null;
  }

  if (
    searchTerm &&
    node.type === "file" &&
    !node.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) {
    return null;
  }

  const isSelected = selectedFile?.id === node.id;

  if (node.type === "directory") {
    const filteredChildren =
      node.children?.filter(
        (child) =>
          !searchTerm ||
          child.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          child.type === 'directory'
      ) || [];
      
    if (searchTerm && filteredChildren.length === 0 && !node.name.toLowerCase().includes(searchTerm.toLowerCase())) return null;

    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button
            style={{ paddingLeft: `${level * 1}rem` }}
            className={cn(
              "w-full flex items-center gap-2 rounded-md p-2 text-sm text-left hover:bg-sidebar-accent transition-colors",
              isSelected && "bg-sidebar-accent"
            )}
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? (
              <FolderOpen className="h-4 w-4 text-primary" />
            ) : (
              <Folder className="h-4 w-4 text-primary" />
            )}
            <span className="truncate">{node.name}</span>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="flex flex-col">
            {filteredChildren.map((child) => (
              <FileNodeItem
                key={child.id}
                node={child}
                onFileSelect={onFileSelect}
                searchTerm={searchTerm}
                selectedFile={selectedFile}
                level={level + 1}
              />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <button
      style={{ paddingLeft: `${level * 1}rem` }}
      className={cn(
        "w-full flex items-center gap-2 rounded-md p-2 text-sm text-left hover:bg-sidebar-accent transition-colors",
        isSelected && "bg-sidebar-accent"
      )}
      onClick={() => onFileSelect(node)}
    >
      <div className="text-muted-foreground">{getFileIcon(node)}</div>
      <span className="truncate">{node.name}</span>
    </button>
  );
};

export const FileExplorer: React.FC<FileExplorerProps> = ({
  files,
  onFileSelect,
  searchTerm,
  selectedFile,
}) => {
  return (
    <div className="flex flex-col gap-1">
      {files.map((node) => (
        <FileNodeItem
          key={node.id}
          node={node}
          onFileSelect={onFileSelect}
          searchTerm={searchTerm}
          selectedFile={selectedFile}
          level={1}
        />
      ))}
    </div>
  );
};
