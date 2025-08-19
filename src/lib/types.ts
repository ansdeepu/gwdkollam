export type FileNode = {
  id: string;
  name: string;
  type: "file" | "directory";
  extension?: "js" | "css" | "html" | "json" | "md" | "ts";
  content?: string;
  children?: FileNode[];
};
