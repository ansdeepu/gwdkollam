// src/hooks/useE_tenders.ts
"use client";

import { useCallback, useState, useEffect } from 'react';
import { getFirestore, collection, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, getDoc, type DocumentData, Timestamp, onSnapshot, query } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { useAuth } from './useAuth';
import type { E_tenderFormData } from '@/lib/schemas/eTenderSchema';
import { toast } from './use-toast';

const db = getFirestore(app);
const TENDERS_COLLECTION = 'eTenders';

export type E_tender = E_tenderFormData & {
  id: string;
  createdAt?: Date;
  updatedAt?: Date;
};

const processDoc = (docSnap: DocumentData) => {
    const data = docSnap.data();
    const processed: { [key: string]: any } = {};
    for (const key in data) {
        const value = data[key];
        if (value instanceof Timestamp) {
            processed[key] = value.toDate();
        } else if (Array.isArray(value)) {
            // Recursively process arrays of objects (like bidders, corrigendums)
            processed[key] = value.map(item => 
                (item instanceof Timestamp) ? item.toDate() : 
                (typeof item === 'object' && item !== null && !(item instanceof Date)) ? processDoc({ data: () => item }) : item
            );
        } else if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
            processed[key] = processDoc({ data: () => value });
        } else {
            processed[key] = value;
        }
    }
    return { ...processed, id: docSnap.id } as E_tender;
};

export function useE_tenders() {
    const { user } = useAuth();
    const [tenders, setTenders] = useState<E_tender[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refetchCounter, setRefetchCounter] = useState(0);

    const refetchE_tenders = useCallback(() => setRefetchCounter(c => c + 1), []);

    useEffect(() => {
        if (!user) {
            setTenders([]);
            setIsLoading(false);
            return;
        }
        
        setIsLoading(true);
        const q = query(collection(db, TENDERS_COLLECTION));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => processDoc(doc));
            setTenders(data);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching e-tenders: ", error);
            toast({ title: "Error", description: "Could not fetch e-tender data.", variant: "destructive" });
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [user, refetchCounter, toast]);


    const addTender = useCallback(async (tenderData: Omit<E_tender, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
        if (!user) throw new Error("User must be logged in to add a tender.");
        const payload = { ...tenderData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
        const docRef = await addDoc(collection(db, TENDERS_COLLECTION), payload);
        refetchE_tenders();
        return docRef.id;
    }, [user, refetchE_tenders]);

    const updateTender = useCallback(async (id: string, tenderData: Partial<E_tender>) => {
        if (!user) throw new Error("User must be logged in to update a tender.");
        const docRef = doc(db, TENDERS_COLLECTION, id);
        const payload = { ...tenderData, updatedAt: serverTimestamp() };
        if ('id' in payload) delete (payload as any).id;
        await updateDoc(docRef, payload);
        refetchE_tenders();
    }, [user, refetchE_tenders]);

    const deleteTender = useCallback(async (id: string) => {
        if (!user || user.role !== 'editor') {
            toast({ title: "Permission Denied", description: "You don't have permission to delete tenders.", variant: "destructive" });
            return;
        }
        await deleteDoc(doc(db, TENDERS_COLLECTION, id));
        refetchE_tenders();
    }, [user, toast, refetchE_tenders]);
    
    const getTender = useCallback(async (id: string): Promise<E_tender | null> => {
        try {
            const docRef = doc(db, TENDERS_COLLECTION, id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return processDoc(docSnap);
            }
            return null;
        } catch (error) {
            console.error("Error fetching tender by ID:", error);
            return null;
        }
    }, []);

    return { tenders, isLoading, addTender, updateTender, deleteTender, getTender, refetchE_tenders };
}
