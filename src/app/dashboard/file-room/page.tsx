
// src/app/dashboard/file-room/page.tsx
"use client";

import { useState, useMemo, useEffect } from 'react';
import FileDatabaseTable from "@/components/database/FileDatabaseTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, FilePlus2, Clock } from "lucide-react";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import type { SiteWorkStatus, DataEntryFormData, ApplicationType } from '@/lib/schemas';
import { usePendingUpdates } from '@/hooks/usePendingUpdates';
import { parseISO, isValid, format } from 'date-fns';
import { usePageHeader } from '@/hooks/usePageHeader';
import { usePageNavigation } from '@/hooks/usePageNavigation';
import { useFileEntries } from '@/hooks/useFileEntries'; // Correctly import useFileEntries
import { useDataStore } from '@/hooks/use-data-store';

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
  const { fileEntries, isLoading } = useFileEntries(); // Use the hook which handles filtering
  
  useEffect(() => {
    const description = 'List of all public and government deposit works in the system, sorted by most recent remittance.';
    setHeader('Deposit Works', description);
  }, [setHeader, user]);

  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();
  const { setIsNavigating } = usePageNavigation();
  
  const canCreate = user?.role === 'editor';
  
  const { depositWorkEntries, totalSites, lastCreatedDate } = useMemo(() => {
    let entries = fileEntries.filter(entry => 
        !entry.applicationType || !PRIVATE_APPLICATION_TYPES.includes(entry.applicationType)
    );
    
    // Sort all entries by the first remittance date, newest first.
    entries.sort((a, b) => {
      const dateAValue = a.remittanceDetails?.[0]?.dateOfRemittance;
      const dateBValue = b.remittanceDetails?.[0]?.dateOfRemittance;

      const dateA = safeParseDate(dateAValue);
      const dateB = safeParseDate(dateBValue);
      
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      
      return dateB.getTime() - dateA.getTime();
    });

    const totalSiteCount = entries.reduce((acc, entry) => acc + (entry.siteDetails?.length || 0), 0);

    const lastCreated = entries.reduce((latest, entry) => {
        const createdAt = (entry as any).createdAt ? safeParseDate((entry as any).createdAt) : null;
        if (createdAt && (!latest || createdAt > latest)) {
            return createdAt;
        }
        return latest;
    }, null as Date | null);
    
    return { depositWorkEntries: entries, totalSites: totalSiteCount, lastCreatedDate: lastCreated };
  }, [fileEntries]);


  const handleAddNewClick = () => {
    setIsNavigating(true);
    router.push('/dashboard/data-entry?workType=public');
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
                  placeholder="Search all fields..."
                  className="w-full rounded-lg bg-background pl-10 shadow-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
               <div className="flex items-center gap-4 w-full sm:w-auto">
                 <div className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                    Total Files: <span className="font-bold text-primary">{depositWorkEntries.length}</span>
                </div>
                 <div className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                    Total Sites: <span className="font-bold text-primary">{totalSites}</span>
                </div>
                {lastCreatedDate && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                        <Clock className="h-3.5 w-3.5"/>
                        Last created: <span className="font-semibold text-primary/90">{format(lastCreatedDate, 'dd/MM/yy, hh:mm a')}</span>
                    </div>
                )}
                {canCreate && (
                    <Button onClick={handleAddNewClick} className="w-full sm:w-auto shrink-0">
                        <FilePlus2 className="mr-2 h-5 w-5" /> New File
                    </Button>
                )}
               </div>
            </div>
             <div className="flex justify-end items-center gap-4 mt-4 pt-4 border-t text-xs text-muted-foreground">
                <span className="font-semibold">Site Name Color Legend:</span>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-600"></div><span>Active / Ongoing</span></div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-yellow-600"></div><span>To be Refunded</span></div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-600"></div><span>Completed / Failed</span></div>
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
