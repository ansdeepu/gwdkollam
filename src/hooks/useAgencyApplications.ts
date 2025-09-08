
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
  serverTimestamp,
  Timestamp,
  type DocumentData,
  writeBatch,
  query,
  getDocs,
  deleteDoc
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

let cachedApplications: AgencyApplication[] = [];
let isApplicationsCacheInitialized = false;

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
                // Recursively process each property of the object
                processed[key] = processDataForClient(data[key]);
            }
        }
        return processed;
    }
    return data;
};


export function useAgencyApplications() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<AgencyApplication[]>(cachedApplications);
  const [isLoading, setIsLoading] = useState(!isApplicationsCacheInitialized);

  useEffect(() => {
    if (!user) {
      setApplications([]);
      cachedApplications = [];
      isApplicationsCacheInitialized = false;
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const q = collection(db, APPLICATIONS_COLLECTION);
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let appsData = snapshot.docs.map(doc => {
        const data = doc.data();
        // Process data to make it serializable and safe for the client
        const serializableData = processDataForClient(data);
        return {
          id: doc.id,
          ...serializableData
        } as AgencyApplication;
      });

      if (user.role === 'supervisor') {
        // Supervisors only see agencies where they are assigned to at least one rig.
        appsData = appsData.filter(app => 
            app.rigs.some(rig => (rig as any).supervisorUid === user.uid)
        );
      }

      cachedApplications = appsData;
      setApplications(appsData);
      setIsLoading(false);
      isApplicationsCacheInitialized = true;
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
    const docRef = doc(db, APPLICATIONS_COLLECTION, id);
    await deleteDoc(docRef);
  }, [user]);
  
  // This export is needed to match the type imports in other files
  return { applications, isLoading, addApplication, updateApplication, deleteApplication };
}

// Re-exporting types for convenience in other files
export type { OwnerInfo };
