// src/hooks/useFileEntries.ts
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getFirestore,
  collection,
  query,
  where,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  writeBatch,
  serverTimestamp,
  getDocs,
} from 'firebase/firestore';
import { app } from '@/lib/firebase';
import type { DataEntryFormData, SiteWorkStatus } from '@/lib/schemas';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { usePendingUpdates } from './usePendingUpdates';
import { useDataStore } from './use-data-store'; // Import the new central store hook

const db = getFirestore(app);
const FILE_ENTRIES_COLLECTION = 'fileEntries';

// This list defines which statuses are considered "active" or relevant for a supervisor's main view.
const SUPERVISOR_VISIBLE_STATUSES: SiteWorkStatus[] = ["Work Order Issued", "Work in Progress", "Work Initiated", "Awaiting Dept. Rig"];


export function useFileEntries() {
  const { user } = useAuth();
  const { allFileEntries, isLoading: dataStoreLoading, refetchFileEntries } = useDataStore(); // Use the central store
  const { getPendingUpdatesForFile } = usePendingUpdates();
  const [fileEntries, setFileEntries] = useState<DataEntryFormData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const processEntries = async () => {
      if (!user) {
        setFileEntries([]);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);

      let entries: DataEntryFormData[];

      if (user.role === 'supervisor' && user.uid) {
        const pendingUpdates = await getPendingUpdatesForFile(null, user.uid);
        const pendingFileNumbers = new Set(
            pendingUpdates.filter(u => u.status === 'pending').map(u => u.fileNo)
        );

        entries = allFileEntries
          .map(entry => {
            const supervisedSites = (entry.siteDetails || []).filter(
              site => site.supervisorUid === user.uid
            );

            if (supervisedSites.length === 0) return null;

            // For the dashboard list view, we only want to show sites with an active status.
            const activeSitesForDisplay = supervisedSites.filter(site =>
              site.workStatus &&
              SUPERVISOR_VISIBLE_STATUSES.includes(site.workStatus as SiteWorkStatus)
            );
            
            // The file should always be in the dataset, but the siteDetails for the UI should be filtered.
            return {
              ...entry,
              siteDetails: activeSitesForDisplay,
              isPending: pendingFileNumbers.has(entry.fileNo),
            };
          })
          .filter((entry): entry is DataEntryFormData => entry !== null);

      } else {
        // For editors and viewers, use the complete list.
        entries = allFileEntries;
      }
      
      setFileEntries(entries);
      setIsLoading(false);
    };

    if (!dataStoreLoading) {
      processEntries();
    }
  }, [user, allFileEntries, dataStoreLoading, getPendingUpdatesForFile]);

    const addFileEntry = useCallback(async (entryData: DataEntryFormData): Promise<string> => {
        if (!user) throw new Error("User must be logged in to add an entry.");

        const payload = { ...entryData };
        if (payload.id) delete payload.id;

        const docRef = await addDoc(collection(db, FILE_ENTRIES_COLLECTION), { ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        refetchFileEntries();
        return docRef.id;
    }, [user, refetchFileEntries]);

    const updateFileEntry = useCallback(async (fileId: string, entryData: DataEntryFormData): Promise<void> => {
        if (!user) throw new Error("User must be logged in to update an entry.");
        
        const docRef = doc(db, FILE_ENTRIES_COLLECTION, fileId);
        const payload = { ...entryData };
        if (payload.id) delete payload.id;
        
        await updateDoc(docRef, { ...payload, updatedAt: serverTimestamp() });
        refetchFileEntries();
    }, [user, refetchFileEntries]);


  const deleteFileEntry = useCallback(async (docId: string): Promise<void> => {
    if (user?.role !== 'editor') {
        toast({ title: "Permission Denied", description: "You don't have permission to delete entries.", variant: "destructive" });
        return;
    }
    if (!docId) {
        toast({ title: "Deletion Failed", description: "Invalid item ID provided.", variant: "destructive" });
        return;
    }
    try {
        await deleteDoc(doc(db, FILE_ENTRIES_COLLECTION, docId));
        refetchFileEntries();
        toast({ title: "Entry Deleted", description: "The file entry has been removed." });
    } catch (error: any) {
        console.error(`Error deleting file with ID ${docId}:`, error);
        toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  }, [user?.role, toast, refetchFileEntries]);

  const batchDeleteFileEntries = useCallback(async (fileNos: string[]): Promise<{ successCount: number; failureCount: number }> => {
    if (user?.role !== 'editor') {
        toast({ title: "Permission Denied", variant: "destructive" });
        return { successCount: 0, failureCount: fileNos.length };
    }
    const batch = writeBatch(db);
    let successCount = 0;
    
    for (const fileNo of fileNos) {
        const q = query(collection(db, FILE_ENTRIES_COLLECTION), where("fileNo", "==", fileNo));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const docId = querySnapshot.docs[0].id;
            batch.delete(doc(db, FILE_ENTRIES_COLLECTION, docId));
            successCount++;
        }
    }
    
    await batch.commit();
    refetchFileEntries(); // Trigger a refetch
    return { successCount, failureCount: fileNos.length - successCount };
  }, [user, toast, refetchFileEntries]);

  const getFileEntry = useCallback((fileNo: string): DataEntryFormData | undefined => {
    return allFileEntries.find(entry => entry.fileNo === fileNo);
  }, [allFileEntries]);

  const fetchEntryForEditing = useCallback(async (
    docId: string
  ): Promise<DataEntryFormData | null> => {
    try {
      const docRef = doc(db, FILE_ENTRIES_COLLECTION, docId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        console.warn(`[fetchEntryForEditing] No file found with ID: ${docId}`);
        return null;
      }
      
      let entry = { id: docSnap.id, ...(docSnap.data()) } as DataEntryFormData;

      // For supervisors, we still need to attach the pending status for the UI
      // AND crucially, we filter the siteDetails to ONLY what they are assigned to.
      if (user && user.role === 'supervisor' && user.uid) {
         const supervisedSites = (entry.siteDetails || []).filter(site => site.supervisorUid === user.uid);
         
         if (supervisedSites.length === 0) {
             console.warn(`[fetchEntryForEditing] Supervisor ${user.uid} has no assigned sites in file ${docId}. Denying access.`);
             return null; // No assigned sites in this file for this supervisor
         }

         const pendingUpdates = await getPendingUpdatesForFile(entry.fileNo, user.uid);
         const isFilePending = pendingUpdates.some(u => u.status === 'pending');
         
         const sitesWithPendingStatus = supervisedSites.map(site => ({...site, isPending: isFilePending}));
         
         entry = { ...entry, siteDetails: sitesWithPendingStatus };
      }
      return entry;
    } catch (error) {
      console.error(`[fetchEntryForEditing] Error fetching docId ${docId}:`, error);
      return null;
    }
  }, [user, getPendingUpdatesForFile]);

  return { 
      fileEntries, 
      isLoading, 
      addFileEntry,
      updateFileEntry,
      deleteFileEntry, 
      batchDeleteFileEntries,
      getFileEntry,
      fetchEntryForEditing
    };
}
