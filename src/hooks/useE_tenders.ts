
// src/hooks/useE_tenders.ts
"use client";

import { useState, useEffect, useCallback } from 'react';
import { getFirestore, collection, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { useAuth } from './useAuth';
import type { E_tenderFormData } from '@/lib/schemas/eTenderSchema';
import { toast } from './use-toast';
import { useDataStore } from './use-data-store';
import type { E_tender } from './useE_tenders'; // Make sure the type is exported

export type { E_tender };

const db = getFirestore(app);
const TENDERS_COLLECTION = 'eTenders';


export function useE_tenders() {
    const { user } = useAuth();
    const { allE_tenders, isLoading: dataStoreLoading, refetchE_tenders } = useDataStore();

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
                const data = docSnap.data();
                // We trust the processDoc in the data store has already handled timestamps
                return { ...data, id: docSnap.id } as E_tender;
            }
            return null;
        } catch (error) {
            console.error("Error fetching tender by ID:", error);
            return null;
        }
    }, []);

    return { tenders: allE_tenders, isLoading: dataStoreLoading, addTender, updateTender, deleteTender, getTender };
}
