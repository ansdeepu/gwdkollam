
// src/hooks/useAgencyApplications.ts
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  serverTimestamp,
  deleteDoc,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  where,
  getCountFromServer,
  type DocumentSnapshot,
  endBefore,
  limitToLast,
} from 'firebase/firestore';
import { app } from '@/lib/firebase';
import type { AgencyApplication as AgencyApplicationFormData, RigRegistration as RigRegistrationFormData, OwnerInfo } from '@/lib/schemas';
import { useAuth } from './useAuth';
import { toast } from './use-toast';
import { useDataStore } from './use-data-store';

const db = getFirestore(app);
const APPLICATIONS_COLLECTION = 'agencyApplications';

export type RigRegistration = RigRegistrationFormData & { id: string };
export type AgencyApplication = Omit<AgencyApplicationFormData, 'rigs'> & {
  id: string;
  rigs: RigRegistration[];
  createdAt?: Date;
  updatedAt?: Date;
};

const processDoc = (doc: DocumentSnapshot): AgencyApplication => {
  const data = doc.data() as any;
  return {
    ...data,
    id: doc.id,
    createdAt: data.createdAt?.toDate(),
    updatedAt: data.updatedAt?.toDate(),
  } as AgencyApplication;
};

export function useAgencyApplications() {
  const { user } = useAuth();
  const { refetchAgencyApplications } = useDataStore();
  const [applications, setApplications] = useState<AgencyApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const addApplication = useCallback(async (applicationData: AgencyApplicationFormData) => {
    if (!user) throw new Error("User must be logged in to add an application.");

    const payload = {
      ...applicationData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await addDoc(collection(db, APPLICATIONS_COLLECTION), payload);
    refetchAgencyApplications();
  }, [user, refetchAgencyApplications]);

  const updateApplication = useCallback(async (id: string, applicationData: Partial<AgencyApplication>) => {
    if (!user) throw new Error("User must be logged in to update an application.");
    
    const docRef = doc(db, APPLICATIONS_COLLECTION, id);
    const payload = {
      ...applicationData,
      updatedAt: serverTimestamp(),
    };
    await updateDoc(docRef, payload);
    refetchAgencyApplications();
  }, [user, refetchAgencyApplications]);

  const deleteApplication = useCallback(async (id: string) => {
    if (!user || user.role !== 'editor') {
        toast({ title: "Permission Denied", description: "You don't have permission to delete applications.", variant: "destructive" });
        return;
    }
    const docRef = doc(db, APPLICATIONS_COLLECTION, id);
    await deleteDoc(docRef);
    refetchAgencyApplications();
  }, [user, refetchAgencyApplications, toast]);

  // This effect will fetch all applications initially.
  // The page component will be responsible for filtering and pagination on the client side.
  useEffect(() => {
    setIsLoading(true);
    const q = query(collection(db, APPLICATIONS_COLLECTION), orderBy("createdAt", "desc"));
    const unsubscribe = getDocs(q).then(snapshot => {
      const fetchedApplications = snapshot.docs.map(processDoc);
      setApplications(fetchedApplications);
      setIsLoading(false);
    }).catch(error => {
      console.error("Error fetching applications: ", error);
      toast({ title: "Error", description: "Could not fetch registrations.", variant: "destructive" });
      setIsLoading(false);
    });

    // In a real scenario with many documents, you would implement server-side pagination here.
    // For now, we fetch all and let the client handle it as per the current structure.
  }, []); // Re-fetch won't be automatic on changes unless we use onSnapshot.

  return { 
    applications, 
    isLoading,
    addApplication, 
    updateApplication, 
    deleteApplication,
  };
}

export type { OwnerInfo };
