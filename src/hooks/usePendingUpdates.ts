
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
  createPendingUpdate: (fileNo: string, siteDetails: SiteDetailFormData[], currentUser: UserProfile, fileLevelUpdates: Partial<Pick<DataEntryFormData, 'fileStatus' | 'remarks'>>) => Promise<void>;
  createArsPendingUpdate: (arsId: string, updatedArsEntry: ArsEntryFormData, currentUser: UserProfile) => Promise<void>;
  rejectUpdate: (updateId: string, reason?: string) => Promise<void>;
  deleteUpdate: (updateId: string) => Promise<void>;
  getPendingUpdateById: (updateId: string) => Promise<PendingUpdate | null>;
  hasPendingUpdateForFile: (fileNo: string, submittedByUid: string) => Promise<boolean>;
  getPendingUpdates: (fileNo: string | null, submittedByUid?: string) => () => void; // Returns unsubscribe function
  subscribeToPendingUpdates: (
    callback: (updates: PendingUpdate[]) => void,
    submittedByUid?: string | null
  ) => () => void;
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
  
  const subscribeToPendingUpdates = useCallback((
    callback: (updates: PendingUpdate[]) => void,
    submittedByUid: string | null = null
  ) => {
    if (!user) {
      callback([]);
      return () => {};
    }

    const statusesToQuery = user.role === 'editor' 
      ? ['pending', 'supervisor-unassigned'] 
      : ['pending', 'rejected'];
      
    let conditions = [where('status', 'in', statusesToQuery)];
    if (user.role === 'supervisor' && user.uid) {
        conditions.push(where('submittedByUid', '==', user.uid));
    }
    
    const q = query(collection(db, PENDING_UPDATES_COLLECTION), ...conditions);

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const updates = snapshot.docs.map(doc => convertTimestampToDate({ id: doc.id, ...doc.data() }));
        updates.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
        callback(updates);
    }, (error) => {
        console.error("Error subscribing to pending updates:", error);
        callback([]);
    });

    return unsubscribe;
  }, [user]);


  const getPendingUpdates = useCallback((fileNo: string | null, submittedByUid?: string) => {
    // This function can be deprecated or kept for one-off fetches if needed,
    // but the real-time subscription is now preferred.
    const q = query(collection(db, PENDING_UPDATES_COLLECTION)); // Simplified for demonstration
    return onSnapshot(q, () => {}); // No-op, recommend using subscribeToPendingUpdates
  }, []);
  

  const createPendingUpdate = useCallback(async (
    fileNo: string,
    siteDetails: SiteDetailFormData[],
    currentUser: UserProfile,
    fileLevelUpdates: Partial<Pick<DataEntryFormData, 'fileStatus' | 'remarks'>>
  ) => {
    if (!currentUser.uid || !currentUser.name) {
      throw new Error("Invalid user profile for submitting an update.");
    }

    const batch = writeBatch(db);

    const existingUpdatesQuery = query(
      collection(db, PENDING_UPDATES_COLLECTION),
      where('fileNo', '==', fileNo),
      where('submittedByUid', '==', currentUser.uid)
    );
    const existingUpdatesSnapshot = await getDocs(existingUpdatesQuery);
    existingUpdatesSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });

    const newUpdateRef = doc(collection(db, PENDING_UPDATES_COLLECTION));
    const newUpdateData = {
      fileNo,
      updatedSiteDetails: siteDetails,
      fileLevelUpdates: fileLevelUpdates,
      submittedByUid: currentUser.uid,
      submittedByName: currentUser.name,
      status: 'pending',
      isArsUpdate: false,
      submittedAt: serverTimestamp(),
    };
    batch.set(newUpdateRef, newUpdateData);

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

  const deleteUpdate = useCallback(async (updateId: string) => {
    if (!user || user.role !== 'editor') {
        throw new Error("You do not have permission to delete updates.");
    }
    const updateDocRef = doc(db, PENDING_UPDATES_COLLECTION, updateId);
    await deleteDoc(updateDocRef);
  }, [user]);

  return {
    createPendingUpdate,
    createArsPendingUpdate,
    rejectUpdate,
    deleteUpdate,
    getPendingUpdateById,
    hasPendingUpdateForFile,
    getPendingUpdates,
    subscribeToPendingUpdates,
  };
}

// Re-export type for use in other components
export type { PendingUpdate };
