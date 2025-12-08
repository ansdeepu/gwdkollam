
// src/hooks/useArsEntries.ts
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getFirestore, collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, getDoc, type DocumentData, Timestamp, writeBatch, query, getDocs, where } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import type { ArsEntryFormData, SiteWorkStatus } from '@/lib/schemas';
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

const SUPERVISOR_ONGOING_STATUSES: SiteWorkStatus[] = ["Work Order Issued", "Work in Progress", "Work Initiated", "Awaiting Dept. Rig"];

export function useArsEntries() {
  const { user } = useAuth();
  const { allArsEntries, isLoading: dataStoreLoading, refetchArsEntries } = useDataStore(); // Use the central store
  const { subscribeToPendingUpdates } = usePendingUpdates();
  const [arsEntries, setArsEntries] = useState<ArsEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || dataStoreLoading) {
      setIsLoading(dataStoreLoading);
      return;
    }

    // This function will be called both on initial load and when updates change
    const processEntries = (updates: any[]) => {
      if (user.role === 'supervisor' && user.uid) {
        const pendingArsIds = new Set(updates.map(u => u.arsId));
        const supervisorEntries = allArsEntries.filter(entry => {
          const isAssigned = entry.supervisorUid === user.uid;
          const hasPendingUpdate = pendingArsIds.has(entry.id);
          return hasPendingUpdate || isAssigned;
        });
        setArsEntries(supervisorEntries);
      } else {
        setArsEntries(allArsEntries);
      }
      setIsLoading(false);
    };

    // Initial processing when the hook loads or dependencies change
    // We pass an empty array initially because the subscription will provide the first real set of updates
    if (!dataStoreLoading) {
        // Run initial processing with no pending updates known, which will filter by assignment
        processEntries([]);
    }

    // Subscribe to real-time updates and re-process when they change
    const unsubscribe = subscribeToPendingUpdates((updates) => {
        processEntries(updates);
    });

    return () => unsubscribe();
  }, [user, allArsEntries, dataStoreLoading, subscribeToPendingUpdates]);


  const addArsEntry = useCallback(async (entryData: ArsEntryFormData) => {
    if (!user || user.role !== 'editor') throw new Error("Permission denied.");
    
    const payload = {
        ...entryData,
        supervisorUid: entryData.supervisorUid ?? null,
        supervisorName: entryData.supervisorName ?? null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };
    await addDoc(collection(db, ARS_COLLECTION), payload);
    refetchArsEntries(); // Trigger refetch
  }, [user, refetchArsEntries]);

  const updateArsEntry = useCallback(async (id: string, entryData: Partial<ArsEntryFormData>, approveUpdateId?: string, approvingUser?: UserProfile) => {
    if (!user) throw new Error("Permission denied.");
    const docRef = doc(db, ARS_COLLECTION, id);

    const payload = {
        ...entryData,
        updatedAt: serverTimestamp(),
    };

    if (approveUpdateId && approvingUser && user.role === 'editor') {
        const batch = writeBatch(db);
        batch.update(docRef, payload);
        const updateRef = doc(db, PENDING_UPDATES_COLLECTION, approveUpdateId);
        batch.update(updateRef, { status: 'approved', reviewedByUid: approvingUser.uid, reviewedAt: serverTimestamp() });
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
            return { id: docSnap.id, ...docSnap.data() } as ArsEntry;
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
