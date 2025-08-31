// src/app/dashboard/file-room/page.tsx
"use client";

import { useState, useMemo } from 'react';
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

export default function FileManagerPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const { fileEntries } = useFileEntries(); 
  const { user } = useAuth();
  const router = useRouter();
  
  const canCreate = user?.role === 'editor';

  // Filter out ARS-only files for the Deposit Works page
  const depositWorkEntries = useMemo(() => {
    if (user?.role === 'supervisor') {
      // Supervisor data is pre-filtered by the hook, which is correct.
      return fileEntries;
    }
    
    // For editors/viewers, filter out ARS data.
    return fileEntries
      .map(entry => {
        // Keep only sites that are NOT ARS sites.
        const nonArsSites = entry.siteDetails?.filter(site => site.purpose !== 'ARS' && !site.isArsImport);
        return { ...entry, siteDetails: nonArsSites };
      })
      // Keep files that still have site details after filtering.
      .filter(entry => entry.siteDetails && entry.siteDetails.length > 0);
  }, [fileEntries, user?.role]);

  return (
    <div className="space-y-6">
       <div className="flex flex-col sm:flex-row justify-between items-center gap-4 my-4">
        <div className="relative flex-grow w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search all fields by File No, Applicant, Site, Purpose, Status..."
            className="w-full rounded-lg bg-background pl-10 md:w-2/3 lg:w-1/2 shadow-sm text-base h-12 border-2 border-primary/20 focus-visible:ring-primary focus-visible:ring-offset-2"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
         {canCreate && (
            <Button onClick={() => router.push('/dashboard/data-entry')} className="w-full sm:w-auto">
              <FilePlus2 className="mr-2 h-5 w-5" /> New File Entry
            </Button>
          )}
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Deposit Works Files</CardTitle>
          <CardDescription>
            {user?.role === 'supervisor'
              ? 'List of active sites assigned to you. Sites with pending updates cannot be edited until reviewed by an admin.'
              : `List of all non-ARS files in the system. Total Files: ${depositWorkEntries.length}`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FileDatabaseTable 
            searchTerm={searchTerm} 
            fileEntries={depositWorkEntries} 
          />
        </CardContent>
      </Card>
    </div>
  );
}
