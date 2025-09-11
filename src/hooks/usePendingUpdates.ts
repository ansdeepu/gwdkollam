// src/hooks/usePendingUpdates.ts
"use client";

import { useState, useEffect, useCallback } from 'react';
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  getDocs,
  writeBatch,
  Timestamp,
  serverTimestamp,
  addDoc,
  getDoc,
  type DocumentData,
  deleteDoc,
} from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { useAuth, type UserProfile } from './useAuth';
import type { PendingUpdate, DataEntryFormData, SiteDetailFormData, ArsEntryFormData } from '@/lib/schemas';

const db = getFirestore(app);
const PENDING_UPDATES_COLLECTION = 'pendingUpdates';
const FILE_ENTRIES_COLLECTION = 'fileEntries';

const convertTimestampToDate = (data: DocumentData): PendingUpdate => {
  return {
    ...data,
    id: data.id,
    submittedAt: data.submittedAt instanceof Timestamp ? data.submittedAt.toDate() : new Date(),
    reviewedAt: data.reviewedAt instanceof Timestamp ? data.reviewedAt.toDate() : undefined,
  } as PendingUpdate;
};

interface PendingUpdatesState {
  createPendingUpdate: (fileNo: string, updatedSites: SiteDetailFormData[], currentUser: UserProfile) => Promise<void>;
  createArsPendingUpdate: (arsId: string, updatedArsEntry: ArsEntryFormData, currentUser: UserProfile) => Promise<void>;
  rejectUpdate: (updateId: string, reason?: string) => Promise<void>;
  getPendingUpdateById: (updateId: string) => Promise<PendingUpdate | null>;
  hasPendingUpdateForFile: (fileNo: string, submittedByUid: string) => Promise<boolean>;
  getPendingUpdatesForFile: (fileNo: string | null, submittedByUid?: string) => Promise<PendingUpdate[]>;
}

export function usePendingUpdates(): PendingUpdatesState {
  const { user } = useAuth();
  
  const hasPendingUpdateForFile = useCallback(async (fileNo: string, submittedByUid: string): Promise<boolean> => {
    try {
      const q = query(
        collection(db, PENDING_UPDATES_COLLECTION),
        where('fileNo', '==', fileNo),
        where('status', '==', 'pending'),
        where('submittedByUid', '==', submittedByUid)
      );
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error("Error checking for pending file updates:", error);
      return false; 
    }
  }, []);
  
  const getPendingUpdatesForFile = useCallback(async (fileNo: string | null, submittedByUid?: string): Promise<PendingUpdate[]> => {
    try {
        let conditions = [where('status', 'in', ['pending', 'supervisor-unassigned', 'rejected'])];
        if (fileNo) {
            conditions.push(where('fileNo', '==', fileNo));
        }
        if (submittedByUid) {
            conditions.push(where('submittedByUid', '==', submittedByUid));
        }
        
        const q = query(collection(db, PENDING_UPDATES_COLLECTION), ...conditions);
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            return [];
        }
        return querySnapshot.docs.map(doc => convertTimestampToDate({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error(`Error fetching pending updates for file ${fileNo}:`, error);
        return [];
    }
  }, []);


  const createPendingUpdate = useCallback(async (
    fileNo: string,
    updatedSites: SiteDetailFormData[],
    currentUser: UserProfile
  ) => {
    if (!currentUser.uid || !currentUser.name) {
      throw new Error("Invalid user profile for submitting an update.");
    }

    const batch = writeBatch(db);

    // 1. Find and delete ALL existing pending/rejected updates for this file from this user.
    const existingUpdatesQuery = query(
      collection(db, PENDING_UPDATES_COLLECTION),
      where('fileNo', '==', fileNo),
      where('submittedByUid', '==', currentUser.uid),
      where('status', 'in', ['pending', 'rejected'])
    );
    const existingUpdatesSnapshot = await getDocs(existingUpdatesQuery);
    existingUpdatesSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });

    // 2. Create a single new update document containing ALL changed sites.
    const newUpdateRef = doc(collection(db, PENDING_UPDATES_COLLECTION));
    const newUpdate: Omit<PendingUpdate, 'id' | 'submittedAt'> = {
      fileNo,
      updatedSiteDetails: updatedSites, // Store all site changes in one document
      submittedByUid: currentUser.uid,
      submittedByName: currentUser.name,
      status: 'pending',
    };
    batch.set(newUpdateRef, {
      ...newUpdate,
      submittedAt: serverTimestamp(),
    });

    // 3. Commit all batched writes.
    await batch.commit();

  }, []);

  const createArsPendingUpdate = useCallback(async (
    arsId: string,
    updatedArsEntry: ArsEntryFormData,
    currentUser: UserProfile
  ) => {
    if (!currentUser.uid || !currentUser.name) {
      throw new Error("Invalid user profile for submitting an update.");
    }

    const newUpdate = {
      arsId: arsId,
      fileNo: updatedArsEntry.fileNo, // For display purposes
      updatedSiteDetails: [updatedArsEntry], // Store the ARS data in the same structure
      submittedByUid: currentUser.uid,
      submittedByName: currentUser.name,
      status: 'pending',
      isArsUpdate: true, // Flag to identify this as an ARS update
      submittedAt: serverTimestamp(),
    };

    await addDoc(collection(db, PENDING_UPDATES_COLLECTION), newUpdate);
  }, []);
  
  const getPendingUpdateById = useCallback(async (updateId: string): Promise<PendingUpdate | null> => {
    const docRef = doc(db, PENDING_UPDATES_COLLECTION, updateId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return convertTimestampToDate({ id: docSnap.id, ...docSnap.data() });
    }
    return null;
  }, []);

  const rejectUpdate = useCallback(async (updateId: string, reason?: string) => {
    if (!user || user.role !== 'editor') {
      throw new Error("You do not have permission to reject updates.");
    }
    const updateDocRef = doc(db, PENDING_UPDATES_COLLECTION, updateId);
    await updateDoc(updateDocRef, {
      status: 'rejected',
      reviewedByUid: user.uid,
      reviewedAt: serverTimestamp(),
      notes: reason || "Rejected by administrator without a specific reason.",
    });
  }, [user]);

  return {
    createPendingUpdate,
    createArsPendingUpdate,
    rejectUpdate,
    getPendingUpdateById,
    hasPendingUpdateForFile,
    getPendingUpdatesForFile,
  };
}

// Re-export type for use in other components
export type { PendingUpdate };
