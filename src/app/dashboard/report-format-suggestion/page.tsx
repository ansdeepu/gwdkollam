
// src/app/dashboard/report-format-suggestion/page.tsx
"use client";

import CustomReportBuilder from "@/components/ai/ReportFormatSuggester"; 
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function CustomReportBuilderPage() { 
  const router = useRouter();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
            <div className="flex justify-between items-start">
                <div>
                     {/* Intentionally blank to let the component below provide the title */}
                </div>
                <Button variant="destructive" size="sm" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Button>
            </div>
        </CardHeader>
        <CustomReportBuilder />
      </Card>
    </div>
  );
}
