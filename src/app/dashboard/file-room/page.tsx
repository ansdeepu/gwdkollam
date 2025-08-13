
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
  const { hasPendingUpdateForFile } = usePendingUpdates(); // Use the hook

  // This state is just to trigger re-renders when a pending status changes for a file.
  // We use a map to track the pending status for each fileNo.
  const [pendingStatusMap, setPendingStatusMap] = useState<Map<string, boolean>>(new Map());

  // We don't need a useEffect to populate this anymore. The table component will do the check.
  // The fileEntries hook will now provide the merged data.

  const filteredFileEntriesForManager = useMemo(() => {
    if (user?.role === 'site-manager' && user.uid) {
      const activeStatuses: SiteWorkStatus[] = ["Work Order Issued", "Work in Progress"];
      
      // Filter the entries to show only those that have sites assigned to the current manager
      // AND those sites are in an active state.
      return fileEntries
        .map(entry => {
          const relevantSites = entry.siteDetails?.filter(site => 
            site.supervisorUid === user.uid
          );

          // If there are no sites for this manager in the entry, filter it out.
          if (!relevantSites || relevantSites.length === 0) {
            return null;
          }

          // Return a new entry object containing ONLY the sites relevant to the manager.
          return { ...entry, siteDetails: relevantSites };
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
    }
    // For other roles, or if not a site manager, return all entries as is.
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
              ? 'List of sites assigned to you. Sites with pending updates cannot be edited until reviewed by an admin.'
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
