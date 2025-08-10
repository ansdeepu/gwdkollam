"use client";

import { useState, useCallback } from "react";
import type { HighlightRelevantFilesOutput } from "@/ai/flows/highlight-relevant-files";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { FileUploader } from "@/components/file-uploader";
import { FileList } from "@/components/file-list";
import { AiAnalysisPanel } from "@/components/ai-analysis-panel";
import { analyzeFile } from "./actions";
import { Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<HighlightRelevantFilesOutput | null>(null);
  const [fileAnalyses, setFileAnalyses] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [userInteractions, setUserInteractions] = useState("");
  const { toast } = useToast();

  const handleFilesAdded = useCallback((newFiles: File[]) => {
    setFiles((prevFiles) => [...prevFiles, ...newFiles]);
  }, []);

  const handleRemoveFile = useCallback((fileToRemove: File) => {
    setFiles((prevFiles) => prevFiles.filter((file) => file !== fileToRemove));
    if (selectedFile && selectedFile.name === fileToRemove.name) {
      setSelectedFile(null);
      setAnalysisResult(null);
    }
  }, [selectedFile]);

  const handleClearList = useCallback(() => {
    setFiles([]);
    setSelectedFile(null);
    setAnalysisResult(null);
    setFileAnalyses({});
  }, []);

  const handleSelectFile = useCallback(async (file: File) => {
    if (userInteractions.trim() === '') {
      toast({
        title: "Context Required",
        description: "Please provide context about your work for a better analysis.",
        variant: "destructive",
      });
      return;
    }

    if (selectedFile?.name === file.name) return;

    setSelectedFile(file);
    setIsLoading(true);
    setAnalysisResult(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const fileContent = e.target?.result as string;
        const response = await analyzeFile({
          fileContent,
          userInteractions,
        });

        setIsLoading(false);
        if (response.success && response.data) {
          setAnalysisResult(response.data);
          setFileAnalyses(prev => ({ ...prev, [file.name]: response.data.shouldHighlight }));
        } else {
          toast({
            title: "Analysis Failed",
            description: response.error,
            variant: "destructive",
          });
        }
      } catch (error) {
        setIsLoading(false);
        toast({
          title: "Analysis Error",
          description: "An unexpected error occurred during analysis.",
          variant: "destructive",
        });
      }
    };
    reader.onerror = () => {
      setIsLoading(false);
      toast({
        title: "File Read Error",
        description: "Could not read the selected file. It might be corrupted or in an unreadable format.",
        variant: "destructive",
      });
    };
    reader.readAsText(file);
  }, [userInteractions, toast, selectedFile]);

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 md:px-6 md:py-12">
        <PageHeader />

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-10">
          <div className="flex-grow space-y-8 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>1. Upload Files</CardTitle>
                <CardDescription>Drag and drop your files or click to browse.</CardDescription>
              </CardHeader>
              <CardContent>
                <FileUploader onFilesAdded={handleFilesAdded} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>2. Provide Context</CardTitle>
                <CardDescription>Describe your current task for a more relevant AI analysis.</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="e.g., searching for Q3 financial reports, working on the 'Apollo' project, drafting marketing copy..."
                  value={userInteractions}
                  onChange={(e) => setUserInteractions(e.target.value)}
                  className="min-h-[100px] text-base"
                />
              </CardContent>
            </Card>

            {files.length > 0 && (
              <Card className="animate-in fade-in duration-500">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>3. Analyze Files</CardTitle>
                    <CardDescription>Select a file to see the AI-powered analysis.</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleClearList} disabled={files.length === 0}>
                    <Trash2 className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Clear List</span>
                  </Button>
                </CardHeader>
                <CardContent>
                  <FileList
                    files={files}
                    selectedFile={selectedFile}
                    onSelectFile={handleSelectFile}
                    onRemoveFile={handleRemoveFile}
                    fileAnalyses={fileAnalyses}
                  />
                </CardContent>
              </Card>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-8">
               <AiAnalysisPanel result={analysisResult} isLoading={isLoading} selectedFile={selectedFile} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
