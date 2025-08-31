// src/hooks/useAllFileEntriesForReports.ts
"use client";

import { useState, useEffect, useCallback } from 'react';
import {
  getFirestore,
  collection,
  onSnapshot,
  query,
  type DocumentData,
  Timestamp
} from 'firebase/firestore';
import { app } from '@/lib/firebase';
import type { DataEntryFormData } from '@/lib/schemas';
import { useAuth } from './useAuth';
import { toast } from './use-toast';

const db = getFirestore(app);
const FILE_ENTRIES_COLLECTION = 'fileEntries';

// Helper to convert Firestore Timestamps to JS Dates recursively
const convertTimestampsToDates = (data: DocumentData): any => {
  const converted: { [key: string]: any } = {};
  for (const key in data) {
    const value = data[key];
    if (value instanceof Timestamp) {
      converted[key] = value.toDate();
    } else if (Array.isArray(value)) {
      converted[key] = value.map(item =>
        typeof item === 'object' && item !== null && !Array.isArray(item) ? convertTimestampsToDates(item) : item
      );
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      converted[key] = convertTimestampsToDates(value);
    } else {
      converted[key] = value;
    }
  }
  return converted;
};


export function useAllFileEntriesForReports() {
  const { user } = useAuth();
  const [reportEntries, setReportEntries] = useState<DataEntryFormData[]>([]);
  const [isReportLoading, setIsReportLoading] = useState(true);

  useEffect(() => {
    // Only editors and viewers can fetch all data.
    if (!user || !['editor', 'viewer'].includes(user.role)) {
      setReportEntries([]);
      setIsReportLoading(false);
      return;
    }

    setIsReportLoading(true);
    const q = query(collection(db, FILE_ENTRIES_COLLECTION));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entriesData = snapshot.docs.map(doc => {
        const data = doc.data();
        const convertedData = convertTimestampsToDates(data);
        return {
          id: doc.id,
          ...convertedData
        } as DataEntryFormData;
      });
      setReportEntries(entriesData);
      setIsReportLoading(false);
    }, (error) => {
      console.error("Error fetching all file entries for reports:", error);
      toast({
        title: "Error Loading Report Data",
        description: "Could not fetch the complete set of file entries.",
        variant: "destructive",
      });
      setIsReportLoading(false);
    });

    return () => unsubscribe();
  }, [user, toast]);

  return { reportEntries, isReportLoading };
}
