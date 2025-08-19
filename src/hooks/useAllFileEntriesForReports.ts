
// src/hooks/useAllFileEntriesForReports.ts
"use client";

import type { DataEntryFormData } from "@/lib/schemas";
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

// This is a simplified converter for report-specific data.
const convertTimestampsToDatesForReport = (data: DocumentData): DataEntryFormData => {
  const entry = { ...data } as any;

  const toDate = (value: any): Date | null => {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (value instanceof Timestamp) return value.toDate();
     if (typeof value === 'string') {
      const d = parseISO(value);
      if (isValid(d)) return d;
    }
    return null;
  };

  if (entry.siteDetails && Array.isArray(entry.siteDetails)) {
    entry.siteDetails = entry.siteDetails.map((sd: any) => {
      if (!sd) return null;
      return { ...sd, dateOfCompletion: toDate(sd.dateOfCompletion) };
    }).filter(Boolean);
  }

  if (entry.remittanceDetails && Array.isArray(entry.remittanceDetails)) {
    entry.remittanceDetails = entry.remittanceDetails.map((rd: any) => {
        if (!rd) return null;
        return {...rd, dateOfRemittance: toDate(rd.dateOfRemittance)};
    }).filter(Boolean);
  }

  return entry as DataEntryFormData;
};


interface ReportEntriesState {
  reportEntries: DataEntryFormData[];
  isReportLoading: boolean;
}

/**
 * A dedicated hook for fetching all file entries without the complex visibility
 * filtering applied in useFileEntries. This is suitable for generating historical
 * reports where completed or pending-completion items must be included in calculations.
 */
export function useAllFileEntriesForReports(): ReportEntriesState {
  const { user, isLoading: authIsLoading } = useAuth();
  const [reportEntries, setReportEntries] = useState<DataEntryFormData[]>([]);
  const [isReportLoading, setIsReportLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (authIsLoading || !user || !user.isApproved) {
      setIsReportLoading(true);
      return;
    }

    setIsReportLoading(true);
    try {
      let q;
      if (user.role === 'supervisor' && user.uid) {
        // Fetch all files ever assigned to this supervisor.
        q = query(collection(db, FILE_ENTRIES_COLLECTION), where("assignedSupervisorUids", "array-contains", user.uid));
      } else {
        // Editors and viewers get all files.
        q = query(collection(db, FILE_ENTRIES_COLLECTION));
      }
      
      const querySnapshot = await getDocs(q);
      const entriesFromFirestore = querySnapshot.docs.map(doc => 
        convertTimestampsToDatesForReport({ id: doc.id, ...doc.data() })
      );
      
      setReportEntries(entriesFromFirestore);

    } catch (error) {
      console.error("[useAllFileEntriesForReports] Error fetching report entries:", error);
      setReportEntries([]);
    } finally {
      setIsReportLoading(false);
    }
  }, [user, authIsLoading]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { reportEntries, isReportLoading };
}
