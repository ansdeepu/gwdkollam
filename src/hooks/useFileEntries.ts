
// src/hooks/useFileEntries.ts
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  writeBatch,
  serverTimestamp,
  Timestamp,
  type DocumentData,
  getDocs,
} from 'firebase/firestore';
import { app } from '@/lib/firebase';
import type { DataEntryFormData, SiteDetailFormData, SitePurpose, SiteWorkStatus } from '@/lib/schemas';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { usePendingUpdates } from './usePendingUpdates';

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

// Global cache for file entries to reduce Firestore reads on re-renders
let cachedFileEntries: DataEntryFormData[] = [];
let isCacheInitialized = false;

export function useFileEntries() {
  const { user } = useAuth();
  const { getPendingUpdatesForFile } = usePendingUpdates();
  const [fileEntries, setFileEntries] = useState<DataEntryFormData[]>(cachedFileEntries);
  const [isLoading, setIsLoading] = useState(!isCacheInitialized);
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      setFileEntries([]);
      cachedFileEntries = [];
      isCacheInitialized = false;
      setIsLoading(false);
      return;
    }
    
    const fileEntriesRef = collection(db, FILE_ENTRIES_COLLECTION);
    let q;

    if (user.role === 'supervisor') {
      q = query(fileEntriesRef, where('assignedSupervisorUids', 'array-contains', user.uid));
    } else {
      q = query(fileEntriesRef);
    }
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      let entriesData = snapshot.docs.map(doc => {
        const data = doc.data();
        const convertedData = convertTimestampsToDates(data);
        return {
          id: doc.id,
          ...convertedData,
        } as DataEntryFormData;
      });

      // After fetching entries, if the user is a supervisor, check for pending updates.
      if (user.role === 'supervisor' && user.uid) {
        // Fetch only the pending updates for the current supervisor.
        const pendingUpdates = await getPendingUpdatesForFile(null, user.uid);
        
        const pendingFileNumbers = new Set(
          pendingUpdates
            .filter(u => u.status === 'pending')
            .map(u => u.fileNo)
        );
        
        if (pendingFileNumbers.size > 0) {
            entriesData = entriesData.map(entry => {
                const isFilePending = pendingFileNumbers.has(entry.fileNo);
                const updatedSiteDetails = entry.siteDetails?.map(site => {
                    if (site.supervisorUid === user.uid) {
                        return { ...site, isPending: isFilePending };
                    }
                    return site;
                });
                return { ...entry, siteDetails: updatedSiteDetails };
            });
        }
      }

      cachedFileEntries = entriesData;
      setFileEntries(entriesData);
      setIsLoading(false);
      isCacheInitialized = true;
      
    }, (error) => {
      console.error("Error fetching file entries:", error);
      toast({
        title: "Error Loading Data",
        description: "Could not fetch file entries.",
        variant: "destructive",
      });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, toast, getPendingUpdatesForFile]);

  const addFileEntry = useCallback(async (entryData: DataEntryFormData, existingFileNo?: string | null) => {
    if (!user) throw new Error("User must be logged in to add an entry.");

    const payload = { ...entryData };
    if (payload.id) delete payload.id; // Don't save the document ID inside the document itself

    if (existingFileNo) {
        const q = query(collection(db, FILE_ENTRIES_COLLECTION), where("fileNo", "==", existingFileNo));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const docId = querySnapshot.docs[0].id;
            const docRef = doc(db, FILE_ENTRIES_COLLECTION, docId);
            await updateDoc(docRef, { ...payload, updatedAt: serverTimestamp() });
        } else {
            await addDoc(collection(db, FILE_ENTRIES_COLLECTION), { ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        }
    } else {
        await addDoc(collection(db, FILE_ENTRIES_COLLECTION), { ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    }
  }, [user]);

  const deleteFileEntry = useCallback(async (fileNo: string): Promise<void> => {
    if (user?.role !== 'editor') {
      toast({ title: "Permission Denied", description: "You don't have permission to delete entries.", variant: "destructive" });
      return;
    }
    try {
        const q = query(collection(db, FILE_ENTRIES_COLLECTION), where("fileNo", "==", fileNo));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const docId = querySnapshot.docs[0].id;
            await deleteDoc(doc(db, FILE_ENTRIES_COLLECTION, docId));
            toast({ title: "Entry Deleted", description: `File No. ${fileNo} has been removed.` });
        } else {
            toast({ title: "Deletion Failed", description: `File No. ${fileNo} not found.`, variant: "destructive" });
        }
    } catch (error: any) {
        console.error(`Error deleting file ${fileNo}:`, error);
        toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  }, [user?.role, toast]);

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
    return { successCount, failureCount: fileNos.length - successCount };
  }, [user, toast]);

  const getFileEntry = useCallback((fileNo: string): DataEntryFormData | undefined => {
    return cachedFileEntries.find(entry => entry.fileNo === fileNo);
  }, []);

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
      
      let entry = { id: docSnap.id, ...convertTimestampsToDates(docSnap.data()) } as DataEntryFormData;

      // For supervisors, we still need to attach the pending status for the UI
      if (user && user.role === 'supervisor' && user.uid) {
         const pendingUpdates = await getPendingUpdatesForFile(entry.fileNo, user.uid);
         const isFilePending = pendingUpdates.some(u => u.status === 'pending');
         if (isFilePending) {
             const updatedSiteDetails = entry.siteDetails?.map(site => ({...site, isPending: true}));
             entry = { ...entry, siteDetails: updatedSiteDetails };
         }
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
      deleteFileEntry, 
      batchDeleteFileEntries,
      getFileEntry,
      fetchEntryForEditing
    };
}
