
// src/hooks/useStaffMembers.ts
"use client";

import type { StaffMember, StaffMemberFormData, Designation, StaffStatusType } from "@/lib/schemas"; 
import { designationOptions, staffStatusOptions } from "@/lib/schemas";
import { useState, useEffect, useCallback } from "react";
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  Timestamp,
  serverTimestamp,
  getDocs, // Changed from onSnapshot
  getDoc,
  type DocumentData,
} from "firebase/firestore";
import { getStorage, ref as storageRef, deleteObject } from "firebase/storage"; 
import { app } from "@/lib/firebase";
import { useAuth } from './useAuth';
import { isValid } from 'date-fns';

const db = getFirestore(app);
const storage = getStorage(app);
const STAFF_MEMBERS_COLLECTION = 'staffMembers';

const designationSortOrder: Record<Designation, number> = designationOptions.reduce((acc, curr, index) => {
  acc[curr] = index;
  return acc;
}, {} as Record<Designation, number>);


const safeParseDate = (value: any): Date | null => {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (value instanceof Timestamp) return value.toDate();
    if (typeof value === 'object' && value !== null && typeof value.seconds === 'number' && typeof value.nanoseconds === 'number') {
        return new Timestamp(value.seconds, value.nanoseconds).toDate();
    }
    if (typeof value === 'string' || typeof value === 'number') {
        const date = new Date(value);
        if (!isNaN(date.getTime())) return date;
    }
    return null;
};


const convertStaffMemberTimestamps = (data: DocumentData): StaffMember => {
  const staff: any = { ...data }; 
  staff.dateOfBirth = safeParseDate(staff.dateOfBirth);
  staff.createdAt = safeParseDate(staff.createdAt) || new Date();
  staff.updatedAt = safeParseDate(staff.updatedAt) || new Date();

  // Determine status, prioritizing the 'status' field.
  let determinedStatus: StaffStatusType = 'Active'; // Default status
  if (staff.status && staffStatusOptions.includes(staff.status)) {
    determinedStatus = staff.status;
  } else if (typeof staff.isTransferred === 'boolean') {
    // Fallback for legacy data using the 'isTransferred' boolean field
    determinedStatus = staff.isTransferred ? 'Transferred' : 'Active';
  }
  staff.status = determinedStatus;

  staff.remarks = typeof staff.remarks === 'string' ? staff.remarks : "";
  
  // Clean up legacy field if it exists
  if ('isTransferred' in staff) {
    delete staff.isTransferred;
  }
  
  return staff as StaffMember;
};

const sanitizeStaffMemberForFirestore = (data: any): any => {
  const sanitized: any = {};
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key) && !['isTransferred', 'place', 'id', 'createdAt', 'updatedAt'].includes(key)) {
      const value = data[key];
      if (value instanceof Date) sanitized[key] = Timestamp.fromDate(value);
      else if (value === undefined) sanitized[key] = null;
      else sanitized[key] = value;
    }
  }
  return sanitized;
};


interface StaffMembersState {
  staffMembers: StaffMember[];
  isLoading: boolean;
  addStaffMember: (staffData: StaffMemberFormData) => Promise<string | undefined>; 
  updateStaffMember: (id: string, staffData: Partial<StaffMemberFormData>) => Promise<void>; 
  deleteStaffMember: (id: string) => Promise<void>;
  getStaffMemberById: (id: string) => Promise<StaffMember | undefined>;
  updateStaffStatus: (id: string, newStatus: StaffStatusType) => Promise<void>; 
}


export function useStaffMembers(): StaffMembersState {
  const { user, isLoading: authIsLoading } = useAuth();
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (authIsLoading) {
      setIsLoading(true);
      return;
    }
    if (!user || !user.isApproved) {
      setIsLoading(false);
      setStaffMembers([]);
      return;
    }

    setIsLoading(true);
    try {
      const q = collection(db, STAFF_MEMBERS_COLLECTION);
      const querySnapshot = await getDocs(q);
      const membersFromFirestore: StaffMember[] = [];
      querySnapshot.forEach((docSnap) => {
        membersFromFirestore.push(convertStaffMemberTimestamps({ id: docSnap.id, ...docSnap.data() }));
      });
      membersFromFirestore.sort((a, b) => {
        const statusOrder: Record<StaffStatusType, number> = { 'Active': 1, 'Transferred': 2, 'Retired': 3 };
        const statusA = statusOrder[a.status] ?? 99;
        const statusB = statusOrder[b.status] ?? 99;
        if (statusA !== statusB) return statusA - statusB;
        const orderA = designationSortOrder[a.designation] ?? designationOptions.length;
        const orderB = designationSortOrder[b.designation] ?? designationOptions.length;
        if (orderA !== orderB) return orderA - orderB;
        return a.name.localeCompare(b.name);
      });
      setStaffMembers(membersFromFirestore);
    } catch(error) {
      console.error("[useStaffMembers] Error fetching staff members:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user, authIsLoading]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);


  const addStaffMember = useCallback(async (staffData: StaffMemberFormData): Promise<string | undefined> => {
    if (!user || user.role !== 'editor') throw new Error("User does not have permission.");
    const payload = { ...sanitizeStaffMemberForFirestore(staffData), createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
    const docRef = await addDoc(collection(db, STAFF_MEMBERS_COLLECTION), payload);
    await fetchData();
    return docRef.id;
  }, [user, fetchData]);

  const updateStaffMember = useCallback(async (id: string, staffData: Partial<StaffMemberFormData>) => {
    if (!user || user.role !== 'editor') throw new Error("User does not have permission.");
    const staffDocRef = doc(db, STAFF_MEMBERS_COLLECTION, id);
    if (staffData.photoUrl === "") {
        const existingMember = staffMembers.find(s => s.id === id);
        if (existingMember?.photoUrl && existingMember.photoUrl.includes("firebasestorage.googleapis.com")) { 
            try { await deleteObject(storageRef(storage, existingMember.photoUrl)); } catch (e) { console.warn("Failed to delete old photo:", e); }
        }
    }
    const payload = { ...sanitizeStaffMemberForFirestore(staffData), updatedAt: serverTimestamp() };
    delete payload.createdAt;
    await updateDoc(staffDocRef, payload);
    await fetchData();
  }, [user, staffMembers, fetchData]);

  const deleteStaffMember = useCallback(async (id: string) => {
    if (!user || user.role !== 'editor') throw new Error("User does not have permission.");
    const staffDocRef = doc(db, STAFF_MEMBERS_COLLECTION, id);
    const staffMemberToDelete = staffMembers.find(s => s.id === id);
    if (staffMemberToDelete?.photoUrl && staffMemberToDelete.photoUrl.includes("firebasestorage.googleapis.com")) { 
      try { await deleteObject(storageRef(storage, staffMemberToDelete.photoUrl)); } catch (e) { console.warn("Failed to delete photo:", e); }
    }
    await deleteDoc(staffDocRef);
    await fetchData();
  }, [user, staffMembers, fetchData]);

  const getStaffMemberById = useCallback(async (id: string): Promise<StaffMember | undefined> => {
     if (!user || !user.isApproved) throw new Error("User not approved to fetch details.");
    const docSnap = await getDoc(doc(db, STAFF_MEMBERS_COLLECTION, id));
    return docSnap.exists() ? convertStaffMemberTimestamps({ id: docSnap.id, ...docSnap.data() }) : undefined;
  }, [user]);

  const updateStaffStatus = useCallback(async (id: string, newStatus: StaffStatusType) => {
    if (!user || user.role !== 'editor') throw new Error("User does not have permission.");
    const staffDocRef = doc(db, STAFF_MEMBERS_COLLECTION, id);
    await updateDoc(staffDocRef, { status: newStatus, updatedAt: serverTimestamp() });
    await fetchData();
  }, [user, fetchData]);

  return { staffMembers, isLoading, addStaffMember, updateStaffMember, deleteStaffMember, getStaffMemberById, updateStaffStatus };
}
