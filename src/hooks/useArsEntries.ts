
// src/hooks/useArsEntries.ts
"use client";

import type { DataEntryFormData, SiteDetailFormData, SiteWorkStatus, Constituency } from "@/lib/schemas";
import { useState, useEffect, useCallback } from "react";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  type DocumentData,
} from "firebase/firestore";
import { app } from "@/lib/firebase";
import { useAuth } from './useAuth';
import { isValid, parseISO } from 'date-fns';

const db = getFirestore(app);
const FILE_ENTRIES_COLLECTION = 'fileEntries';

// A simplified version of the SiteDetailFormData for the ARS report
export interface ArsReportRow extends SiteDetailFormData {
  id: string; // Unique identifier for the site
  fileNo?: string;
  applicantName?: string;
  constituency?: Constituency;
}

const convertTimestampsToDates = (data: DocumentData): DataEntryFormData => {
  const entry = { ...data } as any;

  const toDate = (value: any): Date | undefined | null => {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (value instanceof Timestamp) return value.toDate();
    if (typeof value === 'object' && value !== null && typeof value.seconds === 'number' && typeof value.nanoseconds === 'number') {
      return new Timestamp(value.seconds, value.nanoseconds).toDate();
    }
     if (typeof value === 'string') {
      const d = parseISO(value);
      if (isValid(d)) return d;
    }
    return null;
  };

  if (entry.siteDetails && Array.isArray(entry.siteDetails)) {
    entry.siteDetails = entry.siteDetails.map((sd: any) => {
      if (!sd) return null;
      const detail = {...sd};
      detail.dateOfCompletion = toDate(sd.dateOfCompletion);
      detail.arsSanctionedDate = toDate(sd.arsSanctionedDate);
      return detail;
    }).filter(Boolean);
  }

  return entry as DataEntryFormData;
};

interface ArsEntriesState {
  arsSites: ArsReportRow[];
  isLoading: boolean;
  refreshArsEntries: () => void;
}

/**
 * A dedicated hook for fetching only ARS-related file entries.
 */
export function useArsEntries(): ArsEntriesState {
  const { user, isLoading: authIsLoading } = useAuth();
  const [arsSites, setArsSites] = useState<ArsReportRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (authIsLoading || !user) {
      setIsLoading(true);
      return;
    }

    if (!user.isApproved) {
      setIsLoading(false);
      setArsSites([]);
      return;
    }

    setIsLoading(true);
    try {
      // Fetch all documents and filter client-side because Firestore doesn't
      // support querying for a specific value in a map within an array.
      const allDocsQuery = query(collection(db, FILE_ENTRIES_COLLECTION));
      const querySnapshot = await getDocs(allDocsQuery);
      
      const entriesFromFirestore = querySnapshot.docs.map(doc => convertTimestampsToDates({ id: doc.id, ...doc.data() }));

      const allArsSites = entriesFromFirestore.flatMap(entry => 
        (entry.siteDetails || [])
          .filter(site => site.isArsImport === true) // Filter by the new isArsImport flag
          .map((site, index) => ({
            ...site,
            id: `${entry.fileNo}-${site.nameOfSite}-${site.purpose}-${index}`,
            fileNo: entry.fileNo,
            applicantName: entry.applicantName,
            constituency: entry.constituency
          }))
      );
      
      const sortedSites = [...allArsSites].sort((a, b) => {
        const dateA = a.dateOfCompletion ? new Date(a.dateOfCompletion) : null;
        const dateB = b.dateOfCompletion ? new Date(b.dateOfCompletion) : null;
        if (dateA && isValid(dateA) && dateB && isValid(dateB)) return dateB.getTime() - dateA.getTime();
        if (dateA && isValid(dateA)) return -1;
        if (dateB && isValid(dateB)) return 1;
        return (a.fileNo || "").localeCompare(b.fileNo || "");
      });

      setArsSites(sortedSites);

    } catch (error) {
      console.error("[useArsEntries] Error fetching ARS entries:", error);
      setArsSites([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, authIsLoading]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { arsSites, isLoading, refreshArsEntries: fetchData };
}
