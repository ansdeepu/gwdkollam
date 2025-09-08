// src/app/dashboard/report-format-suggestion/page.tsx
"use client";
import React, { useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { usePageHeader } from '@/hooks/usePageHeader';
import CustomReportBuilder from '@/components/reports/CustomReportBuilder';

export const dynamic = 'force-dynamic';

export default function ReportFormatSuggestionPage() {
  const { setHeader } = usePageHeader();
  useEffect(() => {
    setHeader('Report Builders', 'Generate custom reports by selecting filters and data fields.');
  }, [setHeader]);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <CustomReportBuilder />
        </CardContent>
      </Card>
    </div>
  );
}
