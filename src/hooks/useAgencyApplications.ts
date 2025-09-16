
// src/hooks/useAgencyApplications.ts
"use client";

import { useCallback } from 'react';
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';
import { app } from '@/lib/firebase';
import type { AgencyApplication as AgencyApplicationFormData, RigRegistration as RigRegistrationFormData, OwnerInfo } from '@/lib/schemas';
import { useAuth } from './useAuth';
import { toast } from './use-toast';
import { useDataStore } from './use-data-store'; // Import the central store hook

const db = getFirestore(app);
const APPLICATIONS_COLLECTION = 'agencyApplications';

// Type definitions that include the ID and handle Date objects
export type RigRegistration = RigRegistrationFormData & { id: string };
export type AgencyApplication = Omit<AgencyApplicationFormData, 'rigs'> & {
  id: string;
  rigs: RigRegistration[];
  createdAt?: Date;
  updatedAt?: Date;
};

export function useAgencyApplications() {
  const { user } = useAuth();
  const { allAgencyApplications, isLoading: dataStoreLoading, refetchAgencyApplications } = useDataStore(); // Use the central store

  const addApplication = useCallback(async (applicationData: Omit<AgencyApplication, 'id'>) => {
    if (!user) throw new Error("User must be logged in to add an application.");

    const payload = {
        ...applicationData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };
    await addDoc(collection(db, APPLICATIONS_COLLECTION), payload);
    refetchAgencyApplications(); // Trigger refetch
  }, [user, refetchAgencyApplications]);

  const updateApplication = useCallback(async (id: string, applicationData: Partial<AgencyApplication>) => {
    if (!user) throw new Error("User must be logged in to update an application.");
    
    const docRef = doc(db, APPLICATIONS_COLLECTION, id);
    const payload = {
        ...applicationData,
        updatedAt: serverTimestamp(),
    };
    await updateDoc(docRef, payload);
    refetchAgencyApplications(); // Trigger refetch
  }, [user, refetchAgencyApplications]);
  
  const deleteApplication = useCallback(async (id: string) => {
    if (!user || user.role !== 'editor') {
        toast({ title: "Permission Denied", description: "You don't have permission to delete applications.", variant: "destructive" });
        return;
    }
    const docRef = doc(db, APPLICATIONS_COLLECTION, id);
    await deleteDoc(docRef);
    refetchAgencyApplications(); // Trigger refetch
  }, [user, refetchAgencyApplications]);
  
  return { 
    applications: allAgencyApplications, 
    isLoading: dataStoreLoading, 
    addApplication, 
    updateApplication, 
    deleteApplication 
  };
}

// Re-exporting types for convenience in other files
export type { OwnerInfo };
