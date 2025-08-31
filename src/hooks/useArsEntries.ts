// src/hooks/useArsEntries.ts
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useFileEntries } from './useFileEntries';
import type { SiteDetailFormData, Constituency, ArsTypeOfScheme, SiteWorkStatus } from '@/lib/schemas';

// This will be the shape of each row in our ARS report table
export interface ArsReportRow extends SiteDetailFormData {
  id: string;
  fileNo?: string;
  applicantName?: string;
  constituency?: Constituency;
}

export function useArsEntries() {
  const { fileEntries, isLoading: entriesLoading, addFileEntry } = useFileEntries();
  const [arsSites, setArsSites] = useState<ArsReportRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const processArsSites = useCallback(() => {
    if (entriesLoading) {
      setIsLoading(true);
      return;
    }

    const allArsSites = fileEntries.flatMap(entry =>
      (entry.siteDetails ?? [])
        .filter(site => site.isArsImport === true)
        .map((site, index) => ({
          ...site,
          // Create a unique ID for each site row
          id: `${entry.fileNo}-${site.nameOfSite}-${site.purpose}-${index}`,
          fileNo: entry.fileNo,
          applicantName: entry.applicantName,
          constituency: entry.constituency
        }))
    );
    setArsSites(allArsSites);
    setIsLoading(false);
  }, [fileEntries, entriesLoading]);

  // Initial processing
  useEffect(() => {
    processArsSites();
  }, [processArsSites]);

  // Function to allow components to manually trigger a refresh
  const refreshArsEntries = useCallback(() => {
    processArsSites();
  }, [processArsSites]);

  return { arsSites, isLoading, refreshArsEntries };
}
