// src/app/dashboard/file-room/page.tsx
"use client";

import { useState, useMemo } from 'react';
import FileDatabaseTable from "@/components/database/FileDatabaseTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, FilePlus2 } from "lucide-react";
import { Input } from '@/components/ui/input';
import { useFileEntries } from '@/hooks/useFileEntries';
import { useAuth } from '@/hooks/useAuth';
import type { SiteWorkStatus } from '@/lib/schemas';
import { usePendingUpdates } from '@/hooks/usePendingUpdates'; // Import the hook
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function FileManagerPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const { fileEntries } = useFileEntries(); 
  const { user } = useAuth();
  
  const filteredFileEntriesForManager = useMemo(() => {
    // For editors and viewers, filter out files that ONLY contain ARS sites.
    if (user?.role === 'editor' || user?.role === 'viewer') {
      return fileEntries.filter(entry => {
        // If a file has no sites, it's not an ARS-specific file, so we should keep it.
        if (!entry.siteDetails || entry.siteDetails.length === 0) {
          return true; 
        }
        // If a file has sites, we check if EVERY site has the purpose 'ARS'.
        // The `every()` method returns true if all elements in an array pass a test.
        // We want to KEEP files where this is FALSE (i.e., at least one site is NOT ARS).
        return !entry.siteDetails.every(site => site.purpose === 'ARS');
      });
    }
    // For supervisors, the useFileEntries hook already provides the correct, pre-filtered list.
    return fileEntries;
  }, [fileEntries, user?.role]);


  return (
    <div className="space-y-6">
       <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-grow w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search all fields by File No, Applicant, Site, Purpose, Status..."
            className="w-full rounded-lg bg-background pl-10 shadow-sm text-base h-12 border-2 border-primary/20 focus-visible:ring-primary focus-visible:ring-offset-2"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-4 w-full sm:w-auto shrink-0">
            <div className="text-center sm:text-right">
                <p className="text-sm font-medium text-muted-foreground">Total Files</p>
                <p className="text-2xl font-bold text-primary">{filteredFileEntriesForManager.length}</p>
            </div>
            {user?.role === 'editor' && (
            <Link href="/dashboard/data-entry" passHref>
                <Button className="w-full sm:w-auto">
                <FilePlus2 className="mr-2 h-5 w-5" /> New File Data Entry
                </Button>
            </Link>
            )}
        </div>
      </div>

      <Card className="shadow-lg">
        <CardContent className="p-0">
          <FileDatabaseTable 
            searchTerm={searchTerm} 
            fileEntries={filteredFileEntriesForManager} 
          />
        </CardContent>
      </Card>
    </div>
  );
}
