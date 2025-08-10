"use client";

import type { HighlightRelevantFilesOutput } from "@/ai/flows/highlight-relevant-files";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Search, Bot } from "lucide-react";

interface AiAnalysisPanelProps {
  result: HighlightRelevantFilesOutput | null;
  isLoading: boolean;
  selectedFile: File | null;
}

export function AiAnalysisPanel({ result, isLoading, selectedFile }: AiAnalysisPanelProps) {
  const renderContent = () => {
    if (isLoading) {
      return <LoadingState />;
    }
    if (result) {
      return <ResultState result={result} />;
    }
    if (selectedFile) {
      return (
        <div className="flex flex-col items-center justify-center text-center p-8 h-full">
            <Bot className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground font-medium">Ready to Analyze</p>
            <p className="text-sm text-muted-foreground mt-1">AI is standing by for your command.</p>
        </div>
      );
    }
    return <InitialState />;
  };

  return (
    <Card className="min-h-[300px] flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          AI Analysis
        </CardTitle>
        <CardDescription>
          {selectedFile ? `Analyzing: ${selectedFile.name}` : "Insights will appear here"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col justify-center">
        {renderContent()}
      </CardContent>
    </Card>
  );
}

function InitialState() {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 h-full">
      <Search className="h-12 w-12 text-muted-foreground mb-4" />
      <p className="text-muted-foreground font-medium">Select a file to begin</p>
      <p className="text-sm text-muted-foreground mt-1">Analysis requires a file and user context.</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  );
}

function ResultState({ result }: { result: HighlightRelevantFilesOutput }) {
  return (
    <div className="space-y-4 p-4 text-sm animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <h3 className="font-semibold text-foreground">Highlight Recommended:</h3>
        <Badge variant={result.shouldHighlight ? "default" : "secondary"}>
          {result.shouldHighlight ? "Yes" : "No"}
        </Badge>
      </div>
      {result.reason && (
        <div className="space-y-2">
          <h3 className="font-semibold text-foreground">Reasoning:</h3>
          <p className="text-muted-foreground leading-relaxed">{result.reason}</p>
        </div>
      )}
    </div>
  );
}
