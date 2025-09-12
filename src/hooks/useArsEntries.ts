
// src/hooks/useArsEntries.ts
"use client";

import { useState, useEffect, useCallback } from 'react';
import { getFirestore, collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, getDoc, type DocumentData, Timestamp, writeBatch, query, getDocs, where } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import type { ArsEntryFormData } from '@/lib/schemas';
import { useAuth, type UserProfile } from './useAuth';
import { toast } from './use-toast';
import { parse, isValid } from 'date-fns';
import { usePendingUpdates } from './usePendingUpdates';

const db = getFirestore(app);
const ARS_COLLECTION = 'arsEntries';
const PENDING_UPDATES_COLLECTION = 'pendingUpdates';

// This is the shape of the data as it's stored and used in the app
export type ArsEntry = ArsEntryFormData & {
  id: string;
  createdAt?: Date;
  updatedAt?: Date;
};

// Helper to safely convert Firestore Timestamps and serialized date objects to a serializable format (ISO string)
const processDataForClient = (data: DocumentData): any => {
    if (!data) return data;
    const processed: { [key: string]: any } = {};
    for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
            const value = data[key];
            if (value instanceof Timestamp) {
                // Convert Timestamps to ISO strings for serialization
                processed[key] = value.toDate().toISOString();
            } else if (value && typeof value === 'object' && !Array.isArray(value)) {
                // Recursively process nested objects
                processed[key] = processDataForClient(value);
            } else if (Array.isArray(value)) {
                // Recursively process arrays of objects
                processed[key] = value.map(item => (item && typeof item === 'object') ? processDataForClient(item) : item);
            } else {
                processed[key] = value;
            }
        }
    }
    return processed;
};


export function useArsEntries() {
  const { user } = useAuth();
  const { getPendingUpdatesForFile } = usePendingUpdates();
  const [arsEntries, setArsEntries] = useState<ArsEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchArsEntries = useCallback(async () => {
    if (!user) {
      setArsEntries([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    let q;
    const arsCollectionRef = collection(db, ARS_COLLECTION);
    if (user.role === 'supervisor') {
      q = query(arsCollectionRef, where('supervisorUid', '==', user.uid));
    } else {
      q = query(arsCollectionRef);
    }
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      let entriesData = snapshot.docs.map(doc => {
        const data = doc.data();
        const serializableData = processDataForClient(data);
        return {
          id: doc.id,
          ...serializableData
        } as ArsEntry;
      });

      if (user.role === 'supervisor' && user.uid) {
        const pendingUpdates = await getPendingUpdatesForFile(null, user.uid);
        const pendingArsIds = new Set(
          pendingUpdates
            .filter(u => u.isArsUpdate && u.status === 'pending')
            .map(u => u.arsId)
        );
        if (pendingArsIds.size > 0) {
            entriesData = entriesData.map(entry => ({
                ...entry,
                isPending: pendingArsIds.has(entry.id),
            }));
        }
      }

      setArsEntries(entriesData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching ARS entries:", error);
      toast({
        title: "Error Loading Data",
        description: "Could not fetch ARS entries.",
        variant: "destructive",
      });
      setIsLoading(false);
    });

    return unsubscribe;
  }, [user, getPendingUpdatesForFile]);

  useEffect(() => {
    const unsubscribePromise = fetchArsEntries();
    return () => {
      unsubscribePromise.then(unsubscribe => unsubscribe && unsubscribe());
    };
  }, [fetchArsEntries]);

  const addArsEntry = useCallback(async (entryData: ArsEntryFormData) => {
    if (!user || user.role !== 'editor') throw new Error("Permission denied.");
    
    const entryForFirestore = {
        ...entryData,
        arsSanctionedDate: entryData.arsSanctionedDate ? parse(entryData.arsSanctionedDate, 'yyyy-MM-dd', new Date()) : null,
        dateOfCompletion: entryData.dateOfCompletion ? parse(entryData.dateOfCompletion, 'yyyy-MM-dd', new Date()) : null,
    };
    
    const payload = {
        ...entryForFirestore,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };
    await addDoc(collection(db, ARS_COLLECTION), payload);
  }, [user]);

  const updateArsEntry = useCallback(async (id: string, entryData: Partial<ArsEntryFormData>, approveUpdateId?: string, approvingUser?: UserProfile) => {
    if (!user) throw new Error("Permission denied.");
    const docRef = doc(db, ARS_COLLECTION, id);

    const entryForFirestore = {
        ...entryData,
        arsSanctionedDate: entryData.arsSanctionedDate ? parse(entryData.arsSanctionedDate, 'yyyy-MM-dd', new Date()) : null,
        dateOfCompletion: entryData.dateOfCompletion ? parse(entryData.dateOfCompletion, 'yyyy-MM-dd', new Date()) : null,
    };

    const payload = {
        ...entryForFirestore,
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
  }, [user]);
  
  const deleteArsEntry = useCallback(async (id: string) => {
    if (!user || user.role !== 'editor') {
        toast({ title: "Permission Denied", description: "You don't have permission to delete entries.", variant: "destructive" });
        return;
    }
    await deleteDoc(doc(db, ARS_COLLECTION, id));
  }, [user, toast]);
  
  const getArsEntryById = useCallback(async (id: string): Promise<ArsEntry | null> => {
    try {
        const docRef = doc(db, ARS_COLLECTION, id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return processDataForClient({ id: docSnap.id, ...docSnap.data() }) as ArsEntry;
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
  }, [user, toast]);
  
  const refreshArsEntries = useCallback(() => {
    fetchArsEntries();
  }, [fetchArsEntries]);

  return { 
    arsEntries, 
    isLoading, 
    addArsEntry, 
    updateArsEntry, 
    deleteArsEntry, 
    getArsEntryById,
    clearAllArsData,
    refreshArsEntries 
  };
}
