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

// Helper to safely convert Firestore Timestamps to JS Dates
const convertTimestamps = (data: DocumentData): any => {
  const converted: { [key: string]: any } = {};
  for (const key in data) {
    const value = data[key];
    if (value instanceof Timestamp) {
      converted[key] = value.toDate();
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
       // Check for seconds and nanoseconds to identify Timestamp-like objects from JSON serialization
      if (typeof value.seconds === 'number' && typeof value.nanoseconds === 'number') {
        converted[key] = new Timestamp(value.seconds, value.nanoseconds).toDate();
      } else {
        converted[key] = convertTimestamps(value); // Recurse for nested objects
      }
    } else if (Array.isArray(value)) {
       converted[key] = value.map(item =>
        item && typeof item === 'object' && !Array.isArray(item) ? convertTimestamps(item) : item
      );
    } else {
      converted[key] = value;
    }
  }
  return converted;
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
        const convertedData = convertTimestamps(data);
        return {
          id: doc.id,
          ...convertedData
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
            return convertTimestamps({ id: docSnap.id, ...docSnap.data() }) as ArsEntry;
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
