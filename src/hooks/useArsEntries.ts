
// src/hooks/useArsEntries.ts
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getFirestore, collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, getDoc, type DocumentData, Timestamp, writeBatch, query, getDocs, where } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import type { ArsEntryFormData, SiteWorkStatus, ArsStatus } from '@/lib/schemas';
import { useAuth, type UserProfile } from './useAuth';
import { toast } from './use-toast';
import { parse, isValid } from 'date-fns';
import { usePendingUpdates } from './usePendingUpdates';
import { useDataStore } from './use-data-store'; // Import the new central store hook

const db = getFirestore(app);
const ARS_COLLECTION = 'arsEntries';
const PENDING_UPDATES_COLLECTION = 'pendingUpdates';

// This is the shape of the data as it's stored and used in the app
export type ArsEntry = ArsEntryFormData & {
  id: string;
  createdAt?: Date;
  updatedAt?: Date;
  isPending?: boolean;
};

const SUPERVISOR_EDITABLE_STATUSES: ArsStatus[] = ["Work Order Issued", "Work in Progress", "Work Completed", "Work Failed"];

const processArsDoc = (docSnap: DocumentData): ArsEntry => {
    const data = docSnap.data();
    const processed: { [key: string]: any } = { id: docSnap.id };

    for (const key in data) {
        const value = data[key];
        if (value instanceof Timestamp) {
            processed[key] = value.toDate();
        } else {
            processed[key] = value;
        }
    }
    return processed as ArsEntry;
};

export function useArsEntries() {
  const { user } = useAuth();
  const { allArsEntries, isLoading: dataStoreLoading, refetchArsEntries } = useDataStore(); // Use the central store
  const [arsEntries, setArsEntries] = useState<ArsEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { getPendingUpdates } = usePendingUpdates();

  useEffect(() => {
    const processEntries = async () => {
      if (dataStoreLoading || !user) {
        setIsLoading(dataStoreLoading);
        return;
      }
  
      setIsLoading(true);
      let finalEntries = allArsEntries;
  
      if (user.role === "supervisor") {
          const updates = await getPendingUpdates(null, user.uid);
      
          const pendingFileNos = new Set(
              updates
                  .filter(u => u.submittedByUid === user.uid && u.status === 'pending')
                  .map(u => u.fileNo)
          );
      
          finalEntries = allArsEntries.filter(entry => {
              const isAssigned = entry.supervisorUid === user.uid;
              if (!isAssigned) return false;
      
              const isCompletedOrFailed =
                  entry.workStatus === "Work Completed" ||
                  entry.workStatus === "Work Failed";
      
              const isPendingSupervisorUpdate = pendingFileNos.has(entry.fileNo);
      
              // RULE 1: If supervisor submitted update and admin approval is pending -> show
              if (isPendingSupervisorUpdate) return true;
      
              // RULE 2: If work is completed/failed and admin has approved (i.e., no longer pending) -> hide
              if (isCompletedOrFailed && !isPendingSupervisorUpdate) {
                  return false;
              }
      
              // RULE 3: Ongoing work always visible
              return true;
          });
      }
      
      setArsEntries(finalEntries);
      setIsLoading(false);
    };

    if (!dataStoreLoading) {
      processEntries();
    }
  }, [user, allArsEntries, dataStoreLoading, getPendingUpdates]);


  const addArsEntry = useCallback(async (entryData: ArsEntryFormData): Promise<string> => {
    if (!user || user.role !== 'editor') throw new Error("Permission denied.");
    
    const payload = {
        ...entryData,
        supervisorUid: entryData.supervisorUid ?? null,
        supervisorName: entryData.supervisorName ?? null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, ARS_COLLECTION), payload);
    refetchArsEntries(); // Trigger refetch
    return docRef.id;
  }, [user, refetchArsEntries]);

  const updateArsEntry = useCallback(async (id: string, entryData: Partial<ArsEntryFormData>, approveUpdateId?: string, approvingUser?: UserProfile) => {
    if (!user) throw new Error("Permission denied.");
    const docRef = doc(db, ARS_COLLECTION, id);

    const payload = {
        ...entryData,
        updatedAt: serverTimestamp(),
    };
    
    delete (payload as any).id;
    delete (payload as any).createdAt;


    if (approveUpdateId && approvingUser && user.role === 'editor') {
        const batch = writeBatch(db);
        // Apply the actual changes to the ARS entry
        batch.update(docRef, payload);
        
        // Mark the pending update as approved
        const updateRef = doc(db, PENDING_UPDATES_COLLECTION, approveUpdateId);
        batch.update(updateRef, { 
            status: 'approved', 
            reviewedByUid: approvingUser.uid, 
            reviewedAt: serverTimestamp() 
        });
        
        await batch.commit();
    } else if (user.role === 'editor') {
        await updateDoc(docRef, payload);
    } else {
        throw new Error("Permission denied for direct update.");
    }
    refetchArsEntries(); // Trigger refetch
  }, [user, refetchArsEntries]);
  
  const deleteArsEntry = useCallback(async (id: string) => {
    if (!user || user.role !== 'editor') {
        toast({ title: "Permission Denied", description: "You don't have permission to delete entries.", variant: "destructive" });
        return;
    }
    await deleteDoc(doc(db, ARS_COLLECTION, id));
    refetchArsEntries(); // Trigger refetch
  }, [user, refetchArsEntries, toast]);
  
  const getArsEntryById = useCallback(async (id: string): Promise<ArsEntry | null> => {
    try {
        const docRef = doc(db, ARS_COLLECTION, id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return processArsDoc(docSnap);
        }
        return null;
    } catch (error) {
        console.error("Error fetching ARS entry by ID:", error);
        return null;
    }
  }, []);

  const clearAllArsData = useCallback(async () => {
    if (!user || user.role !== 'editor') {
        toast({ title: "Permission Denied", variant: "destructive" });
        return;
    }
    const q = query(collection(db, ARS_COLLECTION));
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    refetchArsEntries(); // Trigger refetch
  }, [user, toast, refetchArsEntries]);
  
  return { 
    arsEntries, 
    isLoading, 
    addArsEntry, 
    updateArsEntry, 
    deleteArsEntry, 
    getArsEntryById,
    clearAllArsData,
    refreshArsEntries: refetchArsEntries 
  };
}
