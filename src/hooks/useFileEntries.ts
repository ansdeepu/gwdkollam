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
import type { DataEntryFormData, SiteDetailFormData, SitePurpose } from '@/lib/schemas';
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
    
    // Construct the query based on user role
    const fileEntriesRef = collection(db, FILE_ENTRIES_COLLECTION);
    let q;
    if (user.role === 'supervisor') {
      // Supervisors see files where their UID is in the `assignedSupervisorUids` array
      q = query(fileEntriesRef, where('assignedSupervisorUids', 'array-contains', user.uid));
    } else {
      // Editors and viewers see all files
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

      // For supervisors, further filter the sites within each file
      if (user.role === 'supervisor') {
        const pendingUpdates = await getPendingUpdatesForFile(null, user.uid);
        const pendingSiteNames = new Set(
            pendingUpdates.flatMap(update => 
                update.updatedSiteDetails.map(site => `${update.fileNo}-${site.nameOfSite}`)
            )
        );

        entriesData = entriesData.map(entry => ({
            ...entry,
            siteDetails: entry.siteDetails?.filter(site => 
                site.supervisorUid === user.uid && 
                !pendingSiteNames.has(`${entry.fileNo}-${site.nameOfSite}`)
            )
        })).filter(entry => entry.siteDetails && entry.siteDetails.length > 0);
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
        // Find document with the matching fileNo and update it
        const q = query(collection(db, FILE_ENTRIES_COLLECTION), where("fileNo", "==", existingFileNo));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const docId = querySnapshot.docs[0].id;
            const docRef = doc(db, FILE_ENTRIES_COLLECTION, docId);
            await updateDoc(docRef, { ...payload, updatedAt: serverTimestamp() });
        } else {
             // If for some reason we thought it existed but it doesn't, create it.
            await addDoc(collection(db, FILE_ENTRIES_COLLECTION), { ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        }
    } else {
        // This is a new file entry
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
    fileNo: string,
    purposeType?: 'ARS' | 'non-ARS'
  ): Promise<DataEntryFormData | null> => {
    if (!user) return null;

    let q = query(collection(db, FILE_ENTRIES_COLLECTION), where("fileNo", "==", fileNo));
    
    // This is the new logic to differentiate between ARS and non-ARS files
    // if a purposeType is specified.
    if (purposeType === 'ARS') {
      q = query(q, where('siteDetails.isArsImport', '==', true));
    } else if (purposeType === 'non-ARS') {
      // This is trickier as Firestore doesn't support '!=' on arrays.
      // We'll fetch and filter client-side for this case.
    }
    
    try {
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            console.warn(`[fetchEntryForEditing] No file found with fileNo: ${fileNo} and purposeType: ${purposeType}`);
            return null;
        }

        if (purposeType === 'non-ARS') {
           const docToReturn = querySnapshot.docs.find(doc => {
              const data = doc.data() as DataEntryFormData;
              return data.siteDetails?.some(site => site.isArsImport !== true);
           });
           if (docToReturn) {
             const data = convertTimestampsToDates(docToReturn.data());
             return { id: docToReturn.id, ...data } as DataEntryFormData;
           }
           return null;
        }

        const docSnap = querySnapshot.docs[0];
        const data = convertTimestampsToDates(docSnap.data());
        return { id: docSnap.id, ...data } as DataEntryFormData;
    } catch (error) {
        console.error(`[fetchEntryForEditing] Error fetching fileNo ${fileNo}:`, error);
        return null;
    }
  }, [user]);

  const clearAllArsData = useCallback(async () => {
    if (user?.role !== 'editor') {
        toast({ title: "Permission Denied", variant: "destructive" });
        return;
    }
    const batch = writeBatch(db);
    const q = query(collection(db, FILE_ENTRIES_COLLECTION));
    const querySnapshot = await getDocs(q);

    for (const docSnap of querySnapshot.docs) {
        const entry = docSnap.data() as DataEntryFormData;
        const sitesToKeep = entry.siteDetails?.filter(site => !site.isArsImport);
        
        if (sitesToKeep && sitesToKeep.length < (entry.siteDetails?.length || 0)) {
            if (sitesToKeep.length === 0 && entry.siteDetails?.length) {
                // If removing all sites leaves the file empty, and it was primarily an ARS file, delete it.
                batch.delete(docSnap.ref);
            } else {
                // Otherwise, update the file to remove only the ARS sites.
                batch.update(docSnap.ref, { siteDetails: sitesToKeep });
            }
        }
    }

    await batch.commit();
  }, [user, toast]);

  return { 
      fileEntries, 
      isLoading, 
      addFileEntry, 
      deleteFileEntry, 
      batchDeleteFileEntries,
      getFileEntry,
      fetchEntryForEditing,
      clearAllArsData,
    };
}
