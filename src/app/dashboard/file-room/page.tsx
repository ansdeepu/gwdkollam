// src/app/dashboard/file-room/page.tsx
"use client";

import { useState, useMemo, useEffect } from 'react';
import FileDatabaseTable from "@/components/database/FileDatabaseTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, FilePlus2 } from "lucide-react";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useFileEntries } from '@/hooks/useFileEntries';
import { useAuth } from '@/hooks/useAuth';
import type { SiteWorkStatus, DataEntryFormData } from '@/lib/schemas';
import { usePendingUpdates } from '@/hooks/usePendingUpdates';
import { parseISO, isValid } from 'date-fns';
import { usePageHeader } from '@/hooks/usePageHeader';
import { usePageNavigation } from '@/hooks/usePageNavigation';

export const dynamic = 'force-dynamic';

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
  
  useEffect(() => {
    const description = user?.role === 'supervisor'
      ? 'List of active sites assigned to you. Sites with pending updates cannot be edited until reviewed by an admin.'
      : 'List of all non-ARS files in the system, sorted by most recent remittance.';
    setHeader('Deposit Works', description);
  }, [setHeader, user]);

  const [searchTerm, setSearchTerm] = useState("");
  const { fileEntries } = useFileEntries(); 
  const router = useRouter();
  const { setIsNavigating } = usePageNavigation();
  
  const canCreate = user?.role === 'editor';

  const depositWorkEntries = useMemo(() => {
    let entries: DataEntryFormData[];

    if (user?.role === 'supervisor') {
      const ongoingStatuses: SiteWorkStatus[] = ["Work Order Issued", "Work in Progress"];
      entries = fileEntries
        .map(entry => {
          const ongoingSites = entry.siteDetails?.filter(site => {
            return site.supervisorUid === user.uid && site.workStatus && ongoingStatuses.includes(site.workStatus as SiteWorkStatus);
          });
          return { ...entry, siteDetails: ongoingSites };
        })
        .filter(entry => entry.siteDetails && entry.siteDetails.length > 0);
    } else {
      entries = fileEntries
        .map(entry => {
          const nonArsSites = entry.siteDetails?.filter(site => site.purpose !== 'ARS' && !site.isArsImport);
          return { ...entry, siteDetails: nonArsSites };
        })
        .filter(entry => entry.siteDetails && entry.siteDetails.length > 0);
    }

    // Clone the array before sorting
    const sortedEntries = [...entries];

    sortedEntries.sort((a, b) => {
      const dateAValue = a.remittanceDetails?.[0]?.dateOfRemittance;
      const dateBValue = b.remittanceDetails?.[0]?.dateOfRemittance;

      const dateA = safeParseDate(dateAValue);
      const dateB = safeParseDate(dateBValue);
      
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1; 
      if (!dateB) return -1;
      
      return dateB.getTime() - a.getTime();
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
