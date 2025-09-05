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
import { usePendingUpdates } from '@/hooks/usePendingUpdates'; // Import the hook
import { parse, parseISO, isValid } from 'date-fns';
import { usePageHeader } from '@/hooks/usePageHeader';

export default function FileManagerPage() {
  const { setHeader } = usePageHeader();
  const { user } = useAuth();
  
  useEffect(() => {
    const description = user?.role === 'supervisor'
      ? 'List of active sites assigned to you. Sites with pending updates cannot be edited until reviewed by an admin.'
      : 'List of all non-ARS files in the system, sorted by most recent remittance.';
    setHeader('Deposit Works Files', description);
  }, [setHeader, user]);

  const [searchTerm, setSearchTerm] = useState("");
  const { fileEntries } = useFileEntries(); 
  const router = useRouter();
  
  const canCreate = user?.role === 'editor';

  // Filter out ARS-only files and sort them
  const depositWorkEntries = useMemo(() => {
    let entries = user?.role === 'supervisor' ? fileEntries : fileEntries
      .map(entry => {
        const nonArsSites = entry.siteDetails?.filter(site => site.purpose !== 'ARS' && !site.isArsImport);
        return { ...entry, siteDetails: nonArsSites };
      })
      .filter(entry => entry.siteDetails && entry.siteDetails.length > 0);

    // Sort entries by the first remittance date, descending
    return entries.sort((a, b) => {
        const dateA = a.remittanceDetails?.[0]?.dateOfRemittance;
        const dateB = b.remittanceDetails?.[0]?.dateOfRemittance;

        if (!dateA && !dateB) return 0;
        if (!dateA) return 1; // Put entries with no date at the end
        if (!dateB) return -1; // Keep entries with a date at the front

        // Safely parse the date string (which could be in 'dd/MM/yyyy' or other formats)
        const parsedA = parse(String(dateA), 'dd/MM/yyyy', new Date());
        const parsedB = parse(String(dateB), 'dd/MM/yyyy', new Date());

        if (!isValid(parsedA)) return 1;
        if (!isValid(parsedB)) return -1;

        return parsedB.getTime() - parsedA.getTime();
    });
  }, [fileEntries, user?.role]);

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
            {canCreate && (
              <Button onClick={() => router.push('/dashboard/data-entry')} className="w-full sm:w-auto shrink-0">
                <FilePlus2 className="mr-2 h-5 w-5" /> New File Entry
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      <Card className="shadow-lg">
        <CardContent className="pt-6">
          <FileDatabaseTable 
            searchTerm={searchTerm} 
            fileEntries={depositWorkEntries} 
          />
        </CardContent>
      </Card>
    </div>
  );
}
