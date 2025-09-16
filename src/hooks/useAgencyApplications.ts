
// src/hooks/useAgencyApplications.ts
"use client";

import { useState, useEffect, useCallback } from 'react';
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
  searchableKeywords: string[];
};

const processDoc = (doc: DocumentSnapshot): AgencyApplication => {
  const data = doc.data() as any;
  // Basic conversion, more complex nested objects might need deeper processing if they have timestamps
  return {
    ...data,
    id: doc.id,
    createdAt: data.createdAt?.toDate(),
    updatedAt: data.updatedAt?.toDate(),
  } as AgencyApplication;
};


export function useAgencyApplications() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<AgencyApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastVisible, setLastVisible] = useState<DocumentSnapshot | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  
  const fetchApplications = useCallback(async (page: number = 1, searchTerm: string = "") => {
    setIsLoading(true);
    try {
      const lowerSearchTerm = searchTerm.toLowerCase();
      
      const constraints = [
          orderBy("createdAt", "desc"),
          limit(itemsPerPage)
      ];

      // Note: A truly robust search requires a dedicated search service like Algolia.
      // Firestore's capabilities are limited. This performs a basic "starts-with" search.
      if (lowerSearchTerm) {
        constraints.unshift(where('searchableKeywords', 'array-contains', lowerSearchTerm));
      }
      
      const q = query(collection(db, APPLICATIONS_COLLECTION), ...constraints);
      
      const countQuery = lowerSearchTerm 
          ? query(collection(db, APPLICATIONS_COLLECTION), where('searchableKeywords', 'array-contains', lowerSearchTerm))
          : query(collection(db, APPLICATIONS_COLLECTION));

      const [documentSnapshots, countSnapshot] = await Promise.all([
          getDocs(q),
          getCountFromServer(countQuery)
      ]);

      const fetchedApplications = documentSnapshots.docs.map(processDoc);
      
      setApplications(fetchedApplications);
      setTotalCount(countSnapshot.data().count);
      setLastVisible(documentSnapshots.docs[documentSnapshots.docs.length - 1]);
      setCurrentPage(1);

    } catch (error) {
      console.error("Error fetching applications:", error);
      toast({ title: "Error", description: "Could not fetch registration data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [itemsPerPage]);
  
  const addApplication = useCallback(async (applicationData: Omit<AgencyApplication, 'id' | 'searchableKeywords'>) => {
    if (!user) throw new Error("User must be logged in to add an application.");

    const searchableKeywords = [
        applicationData.agencyName.toLowerCase(),
        applicationData.owner.name.toLowerCase(),
        ...(applicationData.fileNo ? [applicationData.fileNo.toLowerCase()] : []),
    ];

    const payload = {
        ...applicationData,
        searchableKeywords,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };
    await addDoc(collection(db, APPLICATIONS_COLLECTION), payload);
    await fetchApplications();
  }, [user, fetchApplications]);

  const updateApplication = useCallback(async (id: string, applicationData: Partial<AgencyApplication>) => {
    if (!user) throw new Error("User must be logged in to update an application.");
    
    const searchableKeywords = [
        applicationData.agencyName?.toLowerCase(),
        applicationData.owner?.name?.toLowerCase(),
        applicationData.fileNo?.toLowerCase(),
    ].filter(Boolean) as string[];

    const docRef = doc(db, APPLICATIONS_COLLECTION, id);
    const payload = {
        ...applicationData,
        searchableKeywords,
        updatedAt: serverTimestamp(),
    };
    await updateDoc(docRef, payload);
    await fetchApplications();
  }, [user, fetchApplications]);
  
  const deleteApplication = useCallback(async (id: string) => {
    if (!user || user.role !== 'editor') {
        toast({ title: "Permission Denied", description: "You don't have permission to delete applications.", variant: "destructive" });
        return;
    }
    const docRef = doc(db, APPLICATIONS_COLLECTION, id);
    await deleteDoc(docRef);
    await fetchApplications();
  }, [user, fetchApplications]);
  
  return { 
    applications, 
    isLoading,
    totalCount,
    itemsPerPage,
    fetchApplications,
    addApplication, 
    updateApplication, 
    deleteApplication,
  };
}

// Re-exporting types for convenience in other files
export type { OwnerInfo };
