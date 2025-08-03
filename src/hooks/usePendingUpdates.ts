
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
  type DocumentData,
} from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { useAuth, type UserProfile } from './useAuth';
import type { PendingUpdate, DataEntryFormData, SiteDetailFormData } from '@/lib/schemas';

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
  pendingUpdates: PendingUpdate[];
  isLoading: boolean;
  approveUpdate: (updateId: string, fileNo: string, updatedSiteDetails: DataEntryFormData['siteDetails']) => Promise<void>;
  rejectUpdate: (updateId: string) => Promise<void>;
  createPendingUpdate: (fileNo: string, updatedSiteDetails: SiteDetailFormData[], currentUser: UserProfile) => Promise<void>;
}

export function usePendingUpdates(): PendingUpdatesState {
  const { user } = useAuth();
  const [pendingUpdates, setPendingUpdates] = useState<PendingUpdate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== 'editor') {
      setIsLoading(false);
      setPendingUpdates([]);
      return;
    }

    const q = query(collection(db, PENDING_UPDATES_COLLECTION), where("status", "==", "pending"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const updates: PendingUpdate[] = [];
      querySnapshot.forEach((doc) => {
        updates.push(convertTimestampToDate({ id: doc.id, ...doc.data() }));
      });
      setPendingUpdates(updates.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime()));
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching pending updates:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const createPendingUpdate = useCallback(async (fileNo: string, updatedSiteDetails: SiteDetailFormData[], currentUser: UserProfile) => {
    if (currentUser.role !== 'supervisor') {
      throw new Error("Only supervisors can submit updates for review.");
    }
    const payload = {
      fileNo,
      updatedSiteDetails,
      submittedByUid: currentUser.uid,
      submittedByName: currentUser.name || currentUser.email,
      submittedAt: serverTimestamp(),
      status: 'pending',
    };
    await addDoc(collection(db, PENDING_UPDATES_COLLECTION), payload);
  }, []);


  const approveUpdate = useCallback(async (updateId: string, fileNo: string, updatedSiteDetails: DataEntryFormData['siteDetails']) => {
    if (!user || user.role !== 'editor') {
      throw new Error("You do not have permission to approve updates.");
    }

    const fileQuery = query(collection(db, FILE_ENTRIES_COLLECTION), where("fileNo", "==", fileNo));
    const fileSnapshot = await getDocs(fileQuery);

    if (fileSnapshot.empty) {
      throw new Error(`File with File No. ${fileNo} not found.`);
    }
    const fileDocRef = fileSnapshot.docs[0].ref;
    const currentFileData = fileSnapshot.docs[0].data() as DataEntryFormData;

    // Merge logic: Replace existing sites with updated versions
    const newSiteDetails = [...(currentFileData.siteDetails || [])];
    updatedSiteDetails?.forEach(updatedSite => {
      const index = newSiteDetails.findIndex(site => site.nameOfSite === updatedSite.nameOfSite);
      if (index > -1) {
        newSiteDetails[index] = updatedSite;
      } else {
        // This case should ideally not happen if supervisors can only edit existing sites assigned to them
        newSiteDetails.push(updatedSite);
      }
    });
    
    // Recalculate assignedSupervisorUids
    const newSupervisorUids = [...new Set(newSiteDetails.map(s => s.supervisorUid).filter((uid): uid is string => !!uid))];

    const batch = writeBatch(db);

    batch.update(fileDocRef, {
      siteDetails: newSiteDetails,
      assignedSupervisorUids: newSupervisorUids,
      updatedAt: serverTimestamp(),
    });

    const updateDocRef = doc(db, PENDING_UPDATES_COLLECTION, updateId);
    batch.update(updateDocRef, {
      status: 'approved',
      reviewedByUid: user.uid,
      reviewedAt: serverTimestamp(),
    });

    await batch.commit();
  }, [user]);

  const rejectUpdate = useCallback(async (updateId: string) => {
    if (!user || user.role !== 'editor') {
      throw new Error("You do not have permission to reject updates.");
    }
    const updateDocRef = doc(db, PENDING_UPDATES_COLLECTION, updateId);
    await updateDoc(updateDocRef, {
      status: 'rejected',
      reviewedByUid: user.uid,
      reviewedAt: serverTimestamp(),
    });
  }, [user]);

  return { pendingUpdates, isLoading, approveUpdate, rejectUpdate, createPendingUpdate };
}
