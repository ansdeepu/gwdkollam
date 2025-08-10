
// src/hooks/useNotices.ts
"use client";

import { useState, useEffect, useCallback } from 'react';
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
  serverTimestamp,
  doc, // Import doc
  deleteDoc, // Import deleteDoc
  type DocumentData,
  type QuerySnapshot,
} from 'firebase/firestore';
import { app } from '@/lib/firebase';
import type { Notice, NoticeFormData } from '@/lib/schemas';
import type { UserProfile } from './useAuth';
import { useToast } from "@/hooks/use-toast";


const db = getFirestore(app);
const NOTICES_COLLECTION = 'notices';

const convertTimestampToDate = (data: DocumentData): Notice => {
  return {
    ...data,
    id: data.id,
    title: data.title,
    content: data.content,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    postedByUid: data.postedByUid,
    postedByName: data.postedByName,
  } as Notice;
};

interface UseNoticesState {
  notices: Notice[];
  isLoading: boolean;
  addNotice: (noticeData: NoticeFormData, currentUser: UserProfile | null) => Promise<void>;
  deleteNotice: (noticeId: string, currentUser: UserProfile | null) => Promise<void>; // Added deleteNotice
}

export function useNotices(): UseNoticesState {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    setIsLoading(true);
    const q = query(collection(db, NOTICES_COLLECTION), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
      const noticesFromFirestore: Notice[] = [];
      querySnapshot.forEach((docSnap) => { // Renamed doc to docSnap to avoid conflict
        noticesFromFirestore.push(convertTimestampToDate({ id: docSnap.id, ...docSnap.data() }));
      });
      setNotices(noticesFromFirestore);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching notices from Firestore:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const addNotice = useCallback(async (noticeData: NoticeFormData, currentUser: UserProfile | null) => {
    if (!currentUser) {
      throw new Error("User must be logged in to post a notice.");
    }
    if (currentUser.role !== 'editor') {
      throw new Error("User does not have permission to post notices.");
    }

    const newNotice = {
      ...noticeData,
      createdAt: serverTimestamp(),
      postedByUid: currentUser.uid,
      postedByName: currentUser.name || currentUser.email || 'Unknown User',
    };

    try {
      await addDoc(collection(db, NOTICES_COLLECTION), newNotice);
    } catch (error) {
      console.error("Error adding notice to Firestore:", error);
      throw error;
    }
  }, []);

  const deleteNotice = useCallback(async (noticeId: string, currentUser: UserProfile | null) => {
    if (!currentUser) {
      toast({ title: "Authentication Error", description: "You must be logged in to delete notices.", variant: "destructive" });
      throw new Error("User must be logged in to delete a notice.");
    }
    if (currentUser.role !== 'editor') {
      toast({ title: "Permission Denied", description: "You do not have permission to delete notices.", variant: "destructive" });
      throw new Error("User does not have permission to delete notices.");
    }

    const noticeDocRef = doc(db, NOTICES_COLLECTION, noticeId);
    try {
      await deleteDoc(noticeDocRef);
      toast({ title: "Notice Deleted", description: "The notice has been successfully deleted." });
    } catch (error) {
      console.error("Error deleting notice from Firestore:", error);
      toast({ title: "Error Deleting Notice", description: "Could not delete the notice. Please try again.", variant: "destructive" });
      throw error;
    }
  }, [toast]);


  return { notices, isLoading, addNotice, deleteNotice };
}
