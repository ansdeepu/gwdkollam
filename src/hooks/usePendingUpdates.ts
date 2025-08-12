
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
  // All supervisor-specific functions are removed as the role is being deleted.
}

export function usePendingUpdates(): PendingUpdatesState {
  const { user } = useAuth();
  const [pendingUpdates, setPendingUpdates] = useState<PendingUpdate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Since supervisor role is removed, this component no longer needs to fetch data.
    setIsLoading(false);
    setPendingUpdates([]);
  }, [user]);

  return { 
    pendingUpdates: [], 
    isLoading: false,
    // Provide empty functions to prevent crashes in any component that might still call them during transition.
    approveUpdate: async () => Promise.resolve(),
    rejectUpdate: async () => Promise.resolve(),
    createPendingUpdate: async () => Promise.resolve(),
    getPendingUpdateById: async () => Promise.resolve(null),
  };
}
