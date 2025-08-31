// src/hooks/useAgencyApplications.ts
"use client";

import { useState, useEffect, useCallback } from 'react';
import {
  getFirestore,
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  type DocumentData,
} from 'firebase/firestore';
import { app } from '@/lib/firebase';
import type { AgencyApplication, AgencyApplicationFormData, RigRegistration, OwnerInfo, RigRenewal } from '@/lib/schemas';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

const db = getFirestore(app);
const APPLICATIONS_COLLECTION = 'agencyApplications';

const convertTimestampToDate = (data: DocumentData): AgencyApplication => {
    const toDate = (value: any): Date | undefined => {
        if (value instanceof Timestamp) return value.toDate();
        if (typeof value === 'string') {
            const parsed = new Date(value);
            if (!isNaN(parsed.getTime())) return parsed;
        }
        return undefined;
    };

    const convertRigs = (rigs: any[] = []): RigRegistration[] => {
        return rigs.map(rig => ({
            ...rig,
            registrationDate: toDate(rig.registrationDate),
            paymentDate: toDate(rig.paymentDate),
            renewals: (rig.renewals || []).map((renewal: any) => ({
                ...renewal,
                renewalDate: toDate(renewal.renewalDate),
                paymentDate: toDate(renewal.paymentDate),
            }))
        }));
    };

  return {
    ...data,
    id: data.id,
    agencyRegistrationDate: toDate(data.agencyRegistrationDate),
    agencyPaymentDate: toDate(data.agencyPaymentDate),
    rigs: convertRigs(data.rigs),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  } as AgencyApplication;
};

const sanitizeForFirestore = (data: any) => {
    if (!data) return data;
    const sanitized = { ...data };
    for (const key in sanitized) {
        if (sanitized[key] === undefined) {
            sanitized[key] = null;
        }
        if (sanitized[key] instanceof Date) {
            sanitized[key] = Timestamp.fromDate(sanitized[key]);
        }
    }
    return sanitized;
};


interface UseAgencyApplicationsState {
  applications: AgencyApplication[];
  isLoading: boolean;
  addApplication: (formData: AgencyApplicationFormData) => Promise<void>;
  updateApplication: (id: string, data: Partial<AgencyApplicationFormData>) => Promise<void>;
  deleteApplication: (id: string) => Promise<void>;
}

export function useAgencyApplications(): UseAgencyApplicationsState {
  const { user } = useAuth();
  const { toast } = useToast();
  const [applications, setApplications] = useState<AgencyApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role === 'supervisor') {
      setIsLoading(false);
      setApplications([]);
      return;
    }

    setIsLoading(true);
    const q = query(collection(db, APPLICATIONS_COLLECTION), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const appsFromFirestore = snapshot.docs.map(doc => convertTimestampToDate({ id: doc.id, ...doc.data() }));
      setApplications(appsFromFirestore);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching agency applications:", error);
      toast({ title: "Error Loading Data", description: "Could not fetch agency applications.", variant: "destructive" });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, toast]);

  const addApplication = useCallback(async (formData: AgencyApplicationFormData) => {
    if (!user || user.role !== 'editor') {
        toast({ title: "Permission Denied", description: "You are not authorized to add new registrations.", variant: "destructive" });
        throw new Error("Permission denied.");
    }
    const payload = sanitizeForFirestore({
        ...formData,
        applicantId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
    await addDoc(collection(db, APPLICATIONS_COLLECTION), payload);
  }, [user, toast]);

  const updateApplication = useCallback(async (id: string, data: Partial<AgencyApplicationFormData>) => {
    if (user?.role !== 'editor') {
      toast({ title: "Permission Denied", description: "You are not authorized to update applications.", variant: "destructive" });
      throw new Error("Permission denied.");
    }
    const appDocRef = doc(db, APPLICATIONS_COLLECTION, id);
    const payload = sanitizeForFirestore({ ...data, updatedAt: serverTimestamp() });
    await updateDoc(appDocRef, payload);
  }, [user, toast]);

  const deleteApplication = useCallback(async (id: string) => {
    if (user?.role !== 'editor') {
      toast({ title: "Permission Denied", description: "You are not authorized to delete applications.", variant: "destructive" });
      throw new Error("Permission denied.");
    }
    const appDocRef = doc(db, APPLICATIONS_COLLECTION, id);
    await deleteDoc(appDocRef);
  }, [user, toast]);

  return { applications, isLoading, addApplication, updateApplication, deleteApplication };
}

export type { AgencyApplication, RigRegistration, OwnerInfo, RigRenewal };
