// src/app/dashboard/report-format-suggestion/page.tsx
"use client";
import React, { useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { usePageHeader } from '@/hooks/usePageHeader';
import CustomReportBuilder from '@/components/ai/ReportFormatSuggester';

export default function ReportFormatSuggestionPage() {
  const { setHeader } = usePageHeader();
  useEffect(() => {
    setHeader('AI-Assisted Report Builder', 'Describe the report you need, and let the AI suggest the columns.');
  }, [setHeader]);

  return (
    <div className="space-y-6">
      <Card>
        <CustomReportBuilder />
      </Card>
    </div>
  );
}
