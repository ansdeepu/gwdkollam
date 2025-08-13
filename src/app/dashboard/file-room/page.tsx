
// src/app/dashboard/file-room/page.tsx
"use client";

import { useState, useMemo } from 'react';
import FileDatabaseTable from "@/components/database/FileDatabaseTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search } from "lucide-react";
import { Input } from '@/components/ui/input';
import { useFileEntries } from '@/hooks/useFileEntries';
import { useAuth } from '@/hooks/useAuth';
import type { SiteWorkStatus } from '@/lib/schemas';
import { usePendingUpdates } from '@/hooks/usePendingUpdates'; // Import the hook

export default function FileManagerPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const { fileEntries } = useFileEntries(); 
  const { user } = useAuth();
  
  const filteredFileEntriesForManager = useMemo(() => {
    if (user?.role === 'site-manager' && user.uid) {
      // The useFileEntries hook now handles the complex filtering logic.
      // We just need to filter out files that have no visible sites left for the manager.
      return fileEntries
        .map(entry => {
          if (!entry.siteDetails || entry.siteDetails.length === 0) {
            return null;
          }
          // The hook has already filtered the sites, so if siteDetails exist, they are relevant.
          return entry;
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
    }
    return fileEntries;
  }, [fileEntries, user]);


  return (
    <div className="space-y-6">
      <div className="relative my-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search all fields by File No, Applicant, Site, Purpose, Status..."
          className="w-full rounded-lg bg-background pl-10 md:w-2/3 lg:w-1/2 shadow-sm text-base h-12 border-2 border-primary/20 focus-visible:ring-primary focus-visible:ring-offset-2"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>File Manager</CardTitle>
          <CardDescription>
            {user?.role === 'site-manager'
              ? 'List of active sites assigned to you. Sites with pending updates cannot be edited until reviewed by an admin.'
              : 'List of all files in the system.'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FileDatabaseTable 
            searchTerm={searchTerm} 
            fileEntries={filteredFileEntriesForManager} 
          />
        </CardContent>
      </Card>
    </div>
  );
}
