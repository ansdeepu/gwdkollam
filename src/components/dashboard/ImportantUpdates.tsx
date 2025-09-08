
// src/components/dashboard/ImportantUpdates.tsx
"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DataEntryFormData, SiteWorkStatus } from '@/lib/schemas';

interface ImportantUpdatesProps {
  allFileEntries: DataEntryFormData[];
}

export default function ImportantUpdates({ allFileEntries }: ImportantUpdatesProps) {
  const workAlerts = useMemo(() => {
    if (!allFileEntries) return []; // Guard against undefined input
    const workAlertsMap = new Map<string, { title: string; details: string; }>();
    const siteWorkStatusAlerts: SiteWorkStatus[] = ["To be Refunded", "To be Tendered", "Under Process"];

    for (const entry of allFileEntries) {
      entry.siteDetails?.forEach(site => {
        if (site.workStatus && siteWorkStatusAlerts.includes(site.workStatus as SiteWorkStatus)) {
          const details = `Site: ${site.nameOfSite || 'Unnamed Site'}, App: ${entry.applicantName}, File: ${entry.fileNo}`;
          const key = `${entry.fileNo}-${site.nameOfSite}-${site.workStatus}`;
          if (!workAlertsMap.has(key)) {
            workAlertsMap.set(key, { title: site.workStatus, details });
          }
        }
      });
    }

    return Array.from(workAlertsMap.values());
  }, [allFileEntries]);

  const shouldAnimateUpdates = workAlerts.length > 3;
  const updatesToDisplay = workAlerts.slice(0, 3);

  return (
    <Card className="shadow-lg flex flex-col h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-primary" />Important Updates ({workAlerts.length})</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-0 flex-1">
        <div className={cn("border rounded-lg p-3 bg-background flex-1 flex flex-col min-h-0", shouldAnimateUpdates && "marquee-v-container")}>
            <div className={cn("no-scrollbar flex-1 relative h-full", shouldAnimateUpdates && "marquee-v-container")}>
            <div className={cn("space-y-2", shouldAnimateUpdates && "marquee-v-content", !shouldAnimateUpdates && "overflow-y-auto h-full")}>
              {updatesToDisplay.length > 0 ? (
                <>
                  {updatesToDisplay.map((alert, index) => (
                    <div key={index} className="p-2 rounded-md bg-amber-500/10">
                      <p className="font-semibold text-sm text-amber-700">{alert.title}</p>
                      <p className="text-xs text-amber-600">{alert.details}</p>
                    </div>
                  ))}
                  {shouldAnimateUpdates && updatesToDisplay.map((alert, index) => (
                    <div key={`clone-${index}`} className="p-2 rounded-md bg-amber-500/10" aria-hidden="true">
                      <p className="font-semibold text-sm text-amber-700">{alert.title}</p>
                      <p className="text-xs text-amber-600">{alert.details}</p>
                    </div>
                  ))}
                </>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-sm text-muted-foreground italic">No important updates.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
