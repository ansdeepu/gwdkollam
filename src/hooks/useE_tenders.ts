// src/hooks/useE_tenders.ts
"use client";

import { useState, useEffect, useCallback } from 'react';
import { getFirestore, collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, getDoc, type DocumentData, Timestamp } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { useAuth } from './useAuth';
import type { E_tenderFormData, Bidder } from '@/lib/schemas/eTenderSchema';
import { toast } from './use-toast';

const db = getFirestore(app);
const TENDERS_COLLECTION = 'eTenders';

export type E_tender = E_tenderFormData & {
    id: string;
    createdAt?: Date;
    updatedAt?: Date;
};

// Helper to convert Firestore Timestamps to JS Dates
const processDoc = (doc: DocumentData): E_tender => {
    const data = doc.data();
    const convertTimestamp = (ts: any) => (ts instanceof Timestamp ? ts.toDate() : ts);

    return {
        ...data,
        id: doc.id,
        tenderDate: convertTimestamp(data.tenderDate),
        lastDateOfReceipt: convertTimestamp(data.lastDateOfReceipt),
        dateOfOpeningTender: convertTimestamp(data.dateOfOpeningTender),
        corrigendumDate: convertTimestamp(data.corrigendumDate),
        dateOfOpeningBid: convertTimestamp(data.dateOfOpeningBid),
        agreementDate: convertTimestamp(data.agreementDate),
        dateWorkOrder: convertTimestamp(data.dateWorkOrder),
        bidders: (data.bidders || []).map((bidder: Bidder) => ({
            ...bidder,
            dateSelectionNotice: convertTimestamp(bidder.dateSelectionNotice),
        })),
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt),
    } as E_tender;
};

export function useE_tenders() {
    const { user } = useAuth();
    const [tenders, setTenders] = useState<E_tender[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setTenders([]);
            setIsLoading(false);
            return;
        }

        const q = collection(db, TENDERS_COLLECTION);
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedTenders = snapshot.docs.map(doc => processDoc({ id: doc.id, data: () => doc.data() }));
            setTenders(fetchedTenders);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching tenders:", error);
            toast({ title: "Error Loading Tenders", description: error.message, variant: "destructive" });
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [user, toast]);

    const addTender = useCallback(async (tenderData: Omit<E_tender, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
        if (!user) throw new Error("User must be logged in to add a tender.");
        const payload = { ...tenderData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
        const docRef = await addDoc(collection(db, TENDERS_COLLECTION), payload);
        return docRef.id;
    }, [user]);

    const updateTender = useCallback(async (id: string, tenderData: Partial<E_tender>) => {
        if (!user) throw new Error("User must be logged in to update a tender.");
        const docRef = doc(db, TENDERS_COLLECTION, id);
        const payload = { ...tenderData, updatedAt: serverTimestamp() };
        if ('id' in payload) delete (payload as any).id;
        await updateDoc(docRef, payload);
    }, [user]);

    const deleteTender = useCallback(async (id: string) => {
        if (!user || user.role !== 'editor') {
            toast({ title: "Permission Denied", description: "You don't have permission to delete tenders.", variant: "destructive" });
            return;
        }
        await deleteDoc(doc(db, TENDERS_COLLECTION, id));
    }, [user, toast]);
    
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

    return { tenders, isLoading, addTender, updateTender, deleteTender, getTender };
}
