
// src/hooks/useAgencyApplications.ts
"use client";

import { useState, useEffect, useCallback } from 'react';
import {
  getFirestore,
  collection,
  onSnapshot,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  type DocumentData,
  writeBatch,
  query,
  getDocs
} from 'firebase/firestore';
import { app } from '@/lib/firebase';
import type { AgencyApplication as AgencyApplicationFormData, RigRegistration as RigRegistrationFormData, OwnerInfo } from '@/lib/schemas';
import { useAuth } from './useAuth';
import { toast } from './use-toast';

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

// Helper to safely convert Firestore Timestamps and serialized date objects to a serializable format (ISO string)
const processDataForClient = (data: any): any => {
    if (!data) return data;
    if (Array.isArray(data)) {
        return data.map(item => processDataForClient(item));
    }
    if (data instanceof Timestamp) {
        return data.toDate().toISOString();
    }
    if (typeof data === 'object' && data !== null) {
        const processed: { [key: string]: any } = {};
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                processed[key] = processDataForClient(data[key]);
            }
        }
        return processed;
    }
    return data;
};


export function useAgencyApplications() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<AgencyApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setApplications([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const q = collection(db, APPLICATIONS_COLLECTION);
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const appsData = snapshot.docs.map(doc => {
        const data = doc.data();
        // Process data to make it serializable and safe for the client
        const serializableData = processDataForClient(data);
        return {
          id: doc.id,
          ...serializableData
        } as AgencyApplication;
      });
      setApplications(appsData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching agency applications:", error);
      toast({
        title: "Error Loading Data",
        description: "Could not fetch agency registrations.",
        variant: "destructive",
      });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const addApplication = useCallback(async (applicationData: Omit<AgencyApplication, 'id'>) => {
    if (!user) throw new Error("User must be logged in to add an application.");

    const payload = {
        ...applicationData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };
    await addDoc(collection(db, APPLICATIONS_COLLECTION), payload);
  }, [user]);

  const updateApplication = useCallback(async (id: string, applicationData: Partial<AgencyApplication>) => {
    if (!user) throw new Error("User must be logged in to update an application.");
    
    const docRef = doc(db, APPLICATIONS_COLLECTION, id);
    const payload = {
        ...applicationData,
        updatedAt: serverTimestamp(),
    };
    await updateDoc(docRef, payload);
  }, [user]);
  
  const deleteApplication = useCallback(async (id: string) => {
    if (!user || user.role !== 'editor') {
        toast({ title: "Permission Denied", description: "You don't have permission to delete applications.", variant: "destructive" });
        return;
    }
    try {
        await deleteDoc(doc(db, APPLICATIONS_COLLECTION, id));
        toast({ title: "Application Deleted", description: "The agency registration has been removed." });
    } catch (error: any) {
        toast({ title: "Deletion Failed", description: error.message, variant: "destructive" });
    }
  }, [user, toast]);
  
  // This export is needed to match the type imports in other files
  return { applications, isLoading, addApplication, updateApplication, deleteApplication };
}

// Re-exporting types for convenience in other files
export type { AgencyApplication as AgencyApplication, RigRegistration as RigRegistration, OwnerInfo };
