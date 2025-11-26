
// src/app/dashboard/file-room/page.tsx
"use client";

import { useState, useMemo, useEffect } from 'react';
import FileDatabaseTable from "@/components/database/FileDatabaseTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, FilePlus2, Clock } from "lucide-react";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFileEntries } from '@/hooks/useFileEntries';
import { useAuth } from '@/hooks/useAuth';
import type { SiteWorkStatus, DataEntryFormData, ApplicationType } from '@/lib/schemas';
import { usePendingUpdates } from '@/hooks/usePendingUpdates';
import { parseISO, isValid, format } from 'date-fns';
import { usePageHeader } from '@/hooks/usePageHeader';
import { usePageNavigation } from '@/hooks/usePageNavigation';

export const dynamic = 'force-dynamic';

const PRIVATE_APPLICATION_TYPES: ApplicationType[] = ["Private_Domestic", "Private_Irrigation", "Private_Institution", "Private_Industry"];

// Helper function to safely parse dates, whether they are strings or Date objects
const safeParseDate = (dateValue: any): Date | null => {
  if (!dateValue) return null;
  if (dateValue instanceof Date && isValid(dateValue)) {
    return dateValue;
  }
  if (typeof dateValue === 'string') {
    const parsed = parseISO(dateValue);
    if (isValid(parsed)) return parsed;
  }
  // Fallback for other potential date-like objects from Firestore
  if (typeof dateValue === 'object' && dateValue.toDate) {
    const parsed = dateValue.toDate();
    if (isValid(parsed)) return parsed;
  }
  return null;
};


export default function FileManagerPage() {
  const { setHeader } = usePageHeader();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const description = user?.role === 'supervisor'
      ? 'List of all sites assigned to you, including ongoing and completed works.'
      : 'List of all public and government deposit works in the system, sorted by most recent remittance.';
    setHeader('Deposit Works', description);
  }, [setHeader, user]);

  const [searchTerm, setSearchTerm] = useState("");
  const { fileEntries } = useFileEntries(); 
  const router = useRouter();
  const { setIsNavigating } = usePageNavigation();
  
  const canCreate = user?.role === 'editor';
  
  const { depositWorkEntries, lastCreatedDate } = useMemo(() => {
    let entries: DataEntryFormData[];

    if (user?.role === 'supervisor') {
      // For supervisors, show files assigned to them but EXCLUDE private works.
      entries = fileEntries
        .filter(entry => !entry.applicationType || !PRIVATE_APPLICATION_TYPES.includes(entry.applicationType))
        .map(entry => {
          const assignedSites = entry.siteDetails?.filter(site => site.supervisorUid === user.uid);
          return { ...entry, siteDetails: assignedSites };
        })
        .filter(entry => entry.siteDetails && entry.siteDetails.length > 0);
    } else {
      // For other roles, filter out private works and files that are exclusively for ARS.
      entries = fileEntries
        .filter(entry => {
          // 1. Exclude all private application types
          if (entry.applicationType && PRIVATE_APPLICATION_TYPES.includes(entry.applicationType)) {
            return false;
          }
          // 2. Exclude files where EVERY site is an ARS site.
          // This keeps files with no sites yet, or files with a mix of sites.
          if (entry.siteDetails && entry.siteDetails.length > 0) {
              const allSitesAreArs = entry.siteDetails.every(site => site.purpose === 'ARS' || site.isArsImport);
              if (allSitesAreArs) {
                  return false;
              }
          }
          return true; // Keep the entry if it's not private and not exclusively ARS
        });
    }

    const sortedEntries = [...entries];

    sortedEntries.sort((a, b) => {
      const dateAValue = a.remittanceDetails?.[0]?.dateOfRemittance;
      const dateBValue = b.remittanceDetails?.[0]?.dateOfRemittance;
      const dateA = safeParseDate(dateAValue);
      const dateB = safeParseDate(dateBValue);
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1; 
      if (!dateB) return -1;
      return dateB.getTime() - dateA.getTime();
    });

    const lastCreated = sortedEntries.reduce((latest, entry) => {
        const createdAt = (entry as any).createdAt ? safeParseDate((entry as any).createdAt) : null;
        if (createdAt && (!latest || createdAt > latest)) {
            return createdAt;
        }
        return latest;
    }, null as Date | null);
    
    return { depositWorkEntries: sortedEntries, lastCreatedDate: lastCreated };
  }, [fileEntries, user?.role, user?.uid]);


  const handleAddNewClick = () => {
    setIsNavigating(true);
    router.push('/dashboard/data-entry?workType=public');
  };

  return (
    <div className="space-y-6">
       <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative flex-grow w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search all fields by File No, Applicant, Site, Purpose, Status..."
                className="w-full rounded-lg bg-background pl-10 shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {canCreate && (
              <Button onClick={handleAddNewClick} className="w-full sm:w-auto shrink-0">
                <FilePlus2 className="mr-2 h-5 w-5" /> New File Entry
              </Button>
            )}
          </div>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-4 border-t text-sm font-medium text-muted-foreground">
                <div className="whitespace-nowrap">
                    Total Files: <span className="font-bold text-primary">{depositWorkEntries.length}</span>
                </div>
                {lastCreatedDate && (
                    <div className="flex items-center gap-1.5 text-xs">
                        <Clock className="h-3.5 w-3.5"/>
                        Last file created: <span className="font-semibold text-primary/90">{format(lastCreatedDate, 'dd/MM/yyyy, hh:mm a')}</span>
                    </div>
                )}
            </div>
        </CardContent>
      </Card>
      
      <FileDatabaseTable 
        searchTerm={searchTerm} 
        fileEntries={depositWorkEntries} 
      />
    </div>
  );
}
