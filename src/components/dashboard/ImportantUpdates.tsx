// src/components/dashboard/ImportantUpdates.tsx
"use client";

import React, { useMemo, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, MessageSquareWarning } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DataEntryFormData, SiteWorkStatus } from '@/lib/schemas';
import { useAuth } from '@/hooks/useAuth';
import { usePendingUpdates, type PendingUpdate } from '@/hooks/usePendingUpdates';
import { ScrollArea } from '../ui/scroll-area';

interface ImportantUpdatesProps {
  allFileEntries: DataEntryFormData[];
}

interface AlertItem {
  key: string;
  title: string;
  details: string;
  type: 'work' | 'rejection';
}

export default function ImportantUpdates({ allFileEntries }: ImportantUpdatesProps) {
  const { user } = useAuth();
  const { getPendingUpdatesForFile } = usePendingUpdates();
  const [rejectedUpdates, setRejectedUpdates] = useState<PendingUpdate[]>([]);

  useEffect(() => {
    if (user?.role === 'supervisor' && user.uid) {
      getPendingUpdatesForFile(null, user.uid).then(updates => {
        const rejected = updates.filter(u => u.status === 'rejected');
        setRejectedUpdates(rejected);
      });
    }
  }, [user, getPendingUpdatesForFile]);

  const alerts = useMemo(() => {
    const newAlerts: AlertItem[] = [];

    // 1. Work Status Alerts (existing logic)
    const workAlertsMap = new Map<string, { title: string; details: string; }>();
    const siteWorkStatusAlerts: SiteWorkStatus[] = ["To be Refunded", "To be Tendered", "Under Process", "TS Pending", "Addl. AS Awaited"];

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
    workAlertsMap.forEach((alert, key) => {
        newAlerts.push({ key, ...alert, type: 'work' });
    });

    // 2. Rejected Updates for Supervisor
    if (user?.role === 'supervisor') {
        rejectedUpdates.forEach(update => {
            const siteName = update.updatedSiteDetails[0]?.nameOfSite || 'Unknown Site';
            newAlerts.push({
                key: update.id,
                title: `Update Rejected for ${siteName}`,
                details: `Reason: ${update.notes || 'No reason provided.'}`,
                type: 'rejection'
            });
        });
    }

    return newAlerts;
  }, [allFileEntries, rejectedUpdates, user]);

  return (
    <Card className="shadow-lg h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />Important Updates ({alerts.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0">
        <ScrollArea className="h-64 pr-3">
            <div className="space-y-2">
              {alerts.length > 0 ? (
                <>
                  {alerts.map((alert) => (
                    <div key={alert.key} className={cn("p-2 rounded-md", alert.type === 'rejection' ? 'bg-red-500/10' : 'bg-amber-500/10')}>
                      <p className={cn("font-semibold text-sm flex items-center gap-1.5", alert.type === 'rejection' ? 'text-red-700' : 'text-amber-700')}>
                         {alert.type === 'rejection' && <MessageSquareWarning className="h-4 w-4" />} {alert.title}
                      </p>
                      <p className={cn("text-xs", alert.type === 'rejection' ? 'text-red-600' : 'text-amber-600')}>
                        {alert.details}
                      </p>
                    </div>
                  ))}
                </>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-sm text-muted-foreground italic">No important updates.</p>
                </div>
              )}
            </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
