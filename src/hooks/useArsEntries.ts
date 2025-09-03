// src/hooks/useArsEntries.ts
"use client";

import { useState, useEffect, useCallback } from 'react';
import { getFirestore, collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, getDoc, type DocumentData, Timestamp, writeBatch, query, getDocs } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import type { ArsEntryFormData } from '@/lib/schemas';
import { useAuth } from './useAuth';
import { toast } from './use-toast';

const db = getFirestore(app);
const ARS_COLLECTION = 'arsEntries';

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
  const [arsEntries, setArsEntries] = useState<ArsEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchArsEntries = useCallback(() => {
    if (!user) {
      setArsEntries([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const q = collection(db, ARS_COLLECTION);
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entriesData = snapshot.docs.map(doc => {
        const data = doc.data();
        const serializableData = processDataForClient(data);
        return {
          id: doc.id,
          ...serializableData
        } as ArsEntry;
      });
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
  }, [user]);

  useEffect(() => {
    const unsubscribe = fetchArsEntries();
    return () => unsubscribe && unsubscribe();
  }, [fetchArsEntries]);

  const addArsEntry = useCallback(async (entryData: ArsEntryFormData) => {
    if (!user) throw new Error("User must be logged in to add an entry.");
    const payload = {
        ...entryData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };
    await addDoc(collection(db, ARS_COLLECTION), payload);
  }, [user]);

  const updateArsEntry = useCallback(async (id: string, entryData: Partial<ArsEntryFormData>) => {
    if (!user) throw new Error("User must be logged in to update an entry.");
    const docRef = doc(db, ARS_COLLECTION, id);
    const payload = {
        ...entryData,
        updatedAt: serverTimestamp(),
    };
    await updateDoc(docRef, payload);
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