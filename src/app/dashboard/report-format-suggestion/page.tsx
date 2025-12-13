// src/app/dashboard/report-format-suggestion/page.tsx
"use client";
import React, { useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { usePageHeader } from '@/hooks/usePageHeader';
// CustomReportBuilder component is removed as it depends on AI features.
// import CustomReportBuilder from '@/components/reports/CustomReportBuilder';

export const dynamic = 'force-dynamic';

export default function ReportBuilderPage() {
  const { setHeader } = usePageHeader();
  useEffect(() => {
    setHeader('Report Builder', 'Generate custom reports by selecting data sources, filters, and fields.');
  }, [setHeader]);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-10">
            <h2 className="text-xl font-semibold">Feature Temporarily Unavailable</h2>
            <p className="text-muted-foreground mt-2">The AI-powered report builder is currently disabled to resolve a system issue. It will be restored soon.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
