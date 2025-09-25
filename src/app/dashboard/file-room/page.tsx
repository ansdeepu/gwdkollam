
// src/app/dashboard/file-room/page.tsx
"use client";

import { useState, useMemo, useEffect } from 'react';
import FileDatabaseTable from "@/components/database/FileDatabaseTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, FilePlus2 } from "lucide-react";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFileEntries } from '@/hooks/useFileEntries';
import { useAuth } from '@/hooks/useAuth';
import type { SiteWorkStatus, DataEntryFormData } from '@/lib/schemas';
import { usePendingUpdates } from '@/hooks/usePendingUpdates';
import { parseISO, isValid } from 'date-fns';
import { usePageHeader } from '@/hooks/usePageHeader';
import { usePageNavigation } from '@/hooks/usePageNavigation';

export const dynamic = 'force-dynamic';

const FINAL_WORK_STATUSES: SiteWorkStatus[] = ['Work Failed', 'Work Completed', 'Bill Prepared', 'Payment Completed', 'Utilization Certificate Issued'];

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
      : 'List of all non-ARS files in the system, sorted by most recent remittance.';
    setHeader('Deposit Works', description);
  }, [setHeader, user]);

  const [searchTerm, setSearchTerm] = useState("");
  const { fileEntries } = useFileEntries(); 
  const router = useRouter();
  const { setIsNavigating } = usePageNavigation();
  
  const canCreate = user?.role === 'editor';
  
  const currentlyEditingFileId = searchParams.get('id');

  const depositWorkEntries = useMemo(() => {
    let entries: DataEntryFormData[];

    if (user?.role === 'supervisor') {
      // For supervisors, show all files where they are assigned to at least one site.
      entries = fileEntries
        .map(entry => {
          const assignedSites = entry.siteDetails?.filter(site => site.supervisorUid === user.uid);
          return { ...entry, siteDetails: assignedSites };
        })
        .filter(entry => entry.siteDetails && entry.siteDetails.length > 0);
    } else {
      // For other roles, filter out ARS-only files.
      entries = fileEntries
        .map(entry => {
          const nonArsSites = entry.siteDetails?.filter(site => site.purpose !== 'ARS' && !site.isArsImport);
          return { ...entry, siteDetails: nonArsSites };
        })
        .filter(entry => entry.siteDetails && entry.siteDetails.length > 0);
    }

    // Clone the array before sorting to avoid mutating the original
    const sortedEntries = [...entries];

    // Sort all entries by the first remittance date, newest first.
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

    return sortedEntries;
  }, [fileEntries, user?.role, user?.uid]);


  const handleAddNewClick = () => {
    setIsNavigating(true);
    router.push('/dashboard/data-entry');
  };

  return (
    <div className="space-y-6">
       <Card>
        <CardContent className="p-4">
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
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                Total Files: <span className="font-bold text-primary">{depositWorkEntries.length}</span>
              </div>
              {canCreate && (
                <Button onClick={handleAddNewClick} className="w-full sm:w-auto shrink-0">
                  <FilePlus2 className="mr-2 h-5 w-5" /> New File Entry
                </Button>
              )}
            </div>
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
