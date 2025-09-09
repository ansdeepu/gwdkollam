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
import { format, parseISO, isValid, parse } from 'date-fns';


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

const toDateOrNull = (value: any): Date | null => {
  if (!value) return null;
  if (value instanceof Date && isValid(value)) return value;
  // Handle Firestore Timestamp objects
  if (typeof value === 'object' && value !== null && typeof value.seconds === 'number' && typeof value.nanoseconds === 'number') {
    const date = new Date(value.seconds * 1000 + value.nanoseconds / 1000000);
    if (isValid(date)) return date;
  }
  if (typeof value === 'string') {
    let parsed = parseISO(value);
    if (isValid(parsed)) return parsed;
    parsed = parse(value, 'dd/MM/yyyy', new Date());
    if (isValid(parsed)) return parsed;
  }
  return null;
};

// This function now recursively processes the data and formats dates to 'yyyy-MM-dd' or ""
const processDataForForm = (data: any): any => {
  const transform = (obj: any): any => {
    if (obj === null || obj === undefined) return obj;

    if (Array.isArray(obj)) {
      return obj.map(transform);
    }

    if (typeof obj === 'object') {
      const newObj: { [key: string]: any } = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          const value = obj[key];
          // Check for keys that are likely to be dates
          if (key.toLowerCase().includes('date')) {
            const date = toDateOrNull(value);
            // Format to the string 'yyyy-MM-dd' or an empty string
            newObj[key] = date && isValid(date) ? format(date, 'yyyy-MM-dd') : "";
          } else {
            // Recursively transform nested objects
            newObj[key] = transform(value);
          }
        }
      }
      return newObj;
    }
    return obj;
  };
  return transform(data);
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
      const appsData = snapshot.docs.map(doc => {
        const data = doc.data();
        const serializableData = processDataForForm(data);
        return {
          id: doc.id,
          ...serializableData
        } as AgencyApplication;
      });
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
