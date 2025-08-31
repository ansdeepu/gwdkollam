// src/hooks/useStaffMembers.ts
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
  type DocumentData,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { app } from '@/lib/firebase';
import type { StaffMember as StaffMemberType, StaffMemberFormData, StaffStatusType } from '@/lib/schemas';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

const db = getFirestore(app);
const STAFF_MEMBERS_COLLECTION = 'staffMembers';

// Type that includes the ID from Firestore
export type StaffMember = StaffMemberType;

// Helper to safely convert Firestore Timestamps to JS Dates
const convertTimestamps = (data: DocumentData): any => {
  const converted: { [key: string]: any } = {};
  for (const key in data) {
    const value = data[key];
    if (value instanceof Timestamp) {
      converted[key] = value.toDate();
    } else {
      converted[key] = value;
    }
  }
  return converted;
};


export function useStaffMembers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setStaffMembers([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const q = query(collection(db, STAFF_MEMBERS_COLLECTION), orderBy("name", "asc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const membersData = snapshot.docs.map(doc => {
        const data = doc.data();
        const convertedData = convertTimestamps(data);
        return {
          id: doc.id,
          ...convertedData
        } as StaffMember;
      });
      setStaffMembers(membersData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching staff members:", error);
      toast({
        title: "Error Loading Data",
        description: "Could not fetch staff members.",
        variant: "destructive",
      });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, toast]);

  const addStaffMember = useCallback(async (staffData: StaffMemberFormData) => {
    if (!user || user.role !== 'editor') throw new Error("Permission denied.");

    const payload = {
        ...staffData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };
    await addDoc(collection(db, STAFF_MEMBERS_COLLECTION), payload);
  }, [user]);

  const updateStaffMember = useCallback(async (id: string, staffData: Partial<StaffMemberFormData>) => {
    if (!user || user.role !== 'editor') throw new Error("Permission denied.");
    
    const docRef = doc(db, STAFF_MEMBERS_COLLECTION, id);
    const payload = {
        ...staffData,
        updatedAt: serverTimestamp(),
    };
    await updateDoc(docRef, payload);
  }, [user]);

  const updateStaffStatus = useCallback(async (id: string, newStatus: StaffStatusType) => {
    if (!user || user.role !== 'editor') throw new Error("Permission denied.");
    const docRef = doc(db, STAFF_MEMBERS_COLLECTION, id);
    await updateDoc(docRef, { status: newStatus, updatedAt: serverTimestamp() });
  }, [user]);
  
  const deleteStaffMember = useCallback(async (id: string) => {
    if (!user || user.role !== 'editor') {
        toast({ title: "Permission Denied", variant: "destructive" });
        return;
    }
    try {
        await deleteDoc(doc(db, STAFF_MEMBERS_COLLECTION, id));
        toast({ title: "Staff Member Removed", description: "The staff member has been removed." });
    } catch (error: any) {
        toast({ title: "Deletion Failed", description: error.message, variant: "destructive" });
    }
  }, [user, toast]);
  
  return { staffMembers, isLoading, addStaffMember, updateStaffMember, deleteStaffMember, updateStaffStatus };
}
