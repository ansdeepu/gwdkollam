
// src/hooks/useFileEntries.ts
"use client";

import type { DataEntryFormData, SiteDetailFormData, SiteWorkStatus } from "@/lib/schemas";
import { useState, useEffect, useCallback } from "react";
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
  getDocs,
  getDoc,
  updateDoc,
  Timestamp,
  serverTimestamp,
  type DocumentData,
} from "firebase/firestore";
import { app } from "@/lib/firebase";
import { useAuth } from './useAuth';
import { isValid, parseISO } from 'date-fns';

const db = getFirestore(app);
const FILE_ENTRIES_COLLECTION = 'fileEntries';

const convertTimestampsToDates = (data: DocumentData): DataEntryFormData => {
  const entry = { ...data } as any;

  // Helper to robustly convert any date-like value to a JS Date object
  const toDate = (value: any): Date | undefined | null => {
    if (!value) return null;
    if (value instanceof Date) return value; // Already a Date
    if (value instanceof Timestamp) return value.toDate(); // Firestore Timestamp
    // Plain object from serialization { seconds: ..., nanoseconds: ... }
    if (typeof value.seconds === 'number' && typeof value.nanoseconds === 'number') {
      return new Timestamp(value.seconds, value.nanoseconds).toDate();
    }
    // ISO string from JSON.stringify or other sources
    if (typeof value === 'string') {
      const d = parseISO(value); // Use parseISO for reliability
      if (isValid(d)) return d;
    }
    return null;
  };

  entry.createdAt = toDate(entry.createdAt);
  entry.updatedAt = toDate(entry.updatedAt);

  if (entry.remittanceDetails && Array.isArray(entry.remittanceDetails)) {
    entry.remittanceDetails = entry.remittanceDetails.map((rd: any) => {
      if (!rd) return null; // Handle null entries in the array
      const detail = {...rd};
      detail.dateOfRemittance = toDate(rd.dateOfRemittance);
      if (detail.amountRemitted === null) detail.amountRemitted = undefined;
      if (detail.remittedAccount === null) detail.remittedAccount = undefined;
      return detail;
    }).filter(Boolean); // Remove any null entries
  }

  if (entry.paymentDetails && Array.isArray(entry.paymentDetails)) {
    entry.paymentDetails = entry.paymentDetails.map((pd: any) => {
       if (!pd) return null;
      const detail = {...pd};
      detail.dateOfPayment = toDate(pd.dateOfPayment);
      if (detail.paymentAccount === null) detail.paymentAccount = undefined;
      if (detail.revenueHead === null) detail.revenueHead = undefined;
      if (detail.contractorsPayment === null) detail.contractorsPayment = undefined;
      if (detail.gst === null) detail.gst = undefined;
      if (detail.incomeTax === null) detail.incomeTax = undefined;
      if (detail.kbcwb === null) detail.kbcwb = undefined;
      if (detail.refundToParty === null) detail.refundToParty = undefined;
      if (detail.totalPaymentPerEntry === null) detail.totalPaymentPerEntry = undefined;
      if (detail.paymentRemarks === null) detail.paymentRemarks = "";
      return detail;
    }).filter(Boolean);
  }

  if (entry.siteDetails && Array.isArray(entry.siteDetails)) {
    entry.siteDetails = entry.siteDetails.map((sd: any) => {
      if (!sd) return null;
      const detail = {...sd};
      detail.dateOfCompletion = toDate(sd.dateOfCompletion);
      if (detail.tsAmount === null) detail.tsAmount = undefined;
      if (detail.totalDepth === null) detail.totalDepth = undefined;
      if (detail.noOfTapConnections === null) detail.noOfTapConnections = undefined;
      if (detail.noOfBeneficiary === null) detail.noOfBeneficiary = undefined;
      if (detail.totalExpenditure === null) detail.totalExpenditure = undefined;
      if (detail.remittedAmount === null) detail.remittedAmount = undefined;
      return detail;
    }).filter(Boolean);
  }
  
  if (entry.estimateAmount === null) entry.estimateAmount = undefined;
  if (entry.totalRemittance === null) entry.totalRemittance = undefined;
  if (entry.totalPaymentAllEntries === null) entry.totalPaymentAllEntries = undefined;
  if (entry.overallBalance === null) entry.overallBalance = undefined;

  return entry as DataEntryFormData;
};

const sanitizeObjectForFirestore = (data: any): any => {
  if (data instanceof Date) {
    return Timestamp.fromDate(data);
  }
  if (data === null || typeof data !== 'object') {
    return data === undefined ? null : data;
  }
  if (Array.isArray(data)) {
    return data.map(item => sanitizeObjectForFirestore(item));
  }
  const sanitizedObject: { [key: string]: any } = {};
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      const value = data[key];
      if (key === 'id') continue;
      sanitizedObject[key] = sanitizeObjectForFirestore(value);
    }
  }
  return sanitizedObject;
};

type ParsedFileNoType = 'alphaNum' | 'yearNum' | 'other';
interface ParsedFileNoDetails { type: ParsedFileNoType; prefix?: string; num?: number; year?: number; original: string; }

const parseFileNoDetails = (fileNoStr?: string | null): ParsedFileNoDetails => {
  const original = fileNoStr || "";
  if (!fileNoStr) return { type: 'other', original };
  const alphaNumMatch = fileNoStr.match(/^([a-zA-Z]+)(\d+)$/);
  if (alphaNumMatch) return { type: 'alphaNum', prefix: alphaNumMatch[1], num: parseInt(alphaNumMatch[2], 10), original };
  const yearNumMatch = fileNoStr.match(/^(\d+)\/(\d{4})$/);
  if (yearNumMatch) {
    const numVal = parseInt(yearNumMatch[1], 10);
    const yearVal = parseInt(yearNumMatch[2], 10);
    if (!isNaN(numVal) && !isNaN(yearVal)) return { type: 'yearNum', num: numVal, year: yearVal, original };
  }
  return { type: 'other', original };
};

interface FileEntriesState {
  fileEntries: DataEntryFormData[];
  isLoading: boolean;
  addFileEntry: (entry: DataEntryFormData, originalFileNoWhileEditing?: string) => Promise<void>;
  deleteFileEntry: (fileNo: string) => Promise<void>;
  getFileEntry: (fileNo: string) => DataEntryFormData | undefined;
  fetchEntryForEditing: (fileNo: string) => Promise<DataEntryFormData | undefined>;
  refreshFileEntries: () => void;
}

export function useFileEntries(): FileEntriesState {
  const { user, isLoading: authIsLoading } = useAuth();
  const [fileEntries, setFileEntries] = useState<DataEntryFormData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEntryForEditing = useCallback(async (fileNo: string): Promise<DataEntryFormData | undefined> => {
    try {
      const q = query(collection(db, FILE_ENTRIES_COLLECTION), where("fileNo", "==", fileNo));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const docData = querySnapshot.docs[0].data();
        return convertTimestampsToDates({ id: querySnapshot.docs[0].id, ...docData });
      }
      return undefined;
    } catch (error) {
      console.error("[useFileEntries] Error fetching single entry:", error);
      return undefined;
    }
  }, []);

  const fetchData = useCallback(async () => {
    if (authIsLoading) return;
    if (!user || !user.isApproved) {
      setIsLoading(false);
      setFileEntries([]);
      return;
    }

    setIsLoading(true);
    try {
      let q;
      if (user.role === 'editor' || user.role === 'viewer') {
        q = query(collection(db, FILE_ENTRIES_COLLECTION));
      } else if (user.role === 'supervisor') {
        q = query(collection(db, FILE_ENTRIES_COLLECTION), where("assignedSupervisorUids", "array-contains", user.uid));
      } else {
        setIsLoading(false);
        setFileEntries([]);
        return;
      }
      
      const querySnapshot = await getDocs(q);
      const entriesFromFirestore: DataEntryFormData[] = [];
      querySnapshot.forEach((doc) => {
        entriesFromFirestore.push(convertTimestampsToDates({ id: doc.id, ...doc.data() }));
      });
      
      let finalEntries = entriesFromFirestore;

      if (user.role === 'supervisor') {
         const supervisorVisibleStatuses: SiteWorkStatus[] = [
          "Work Order Issued",
          "Work in Progress",
          "Awaiting Dept. Rig",
        ];
        finalEntries = entriesFromFirestore.filter(entry => {
          if (!entry.siteDetails || entry.siteDetails.length === 0) {
            return false;
          }
          // The main query already filters for files where the supervisor is assigned.
          // This second filter ensures at least one of their assigned sites has a visible status.
          return entry.siteDetails.some(site => 
            site.supervisorUid === user.uid && 
            site.workStatus && 
            supervisorVisibleStatuses.includes(site.workStatus as SiteWorkStatus)
          );
        });
      }

      finalEntries.sort((a, b) => {
        const dateA_str = a.remittanceDetails?.[0]?.dateOfRemittance;
        const dateB_str = b.remittanceDetails?.[0]?.dateOfRemittance;
        const dateA = dateA_str ? new Date(dateA_str) : null;
        const dateB = dateB_str ? new Date(dateB_str) : null;
        if (dateA && isValid(dateA) && dateB && isValid(dateB)) {
          const timeDiff = dateB.getTime() - dateA.getTime();
          if (timeDiff !== 0) return timeDiff;
        } else if (dateA && isValid(dateA)) return -1;
        else if (dateB && isValid(dateB)) return 1;
        const detailsA = parseFileNoDetails(a.fileNo);
        const detailsB = parseFileNoDetails(b.fileNo);
        const typeOrder: Record<ParsedFileNoType, number> = { alphaNum: 1, yearNum: 2, other: 3 };
        if (typeOrder[detailsA.type] !== typeOrder[detailsB.type]) return typeOrder[detailsA.type] - typeOrder[detailsB.type];
        if (detailsA.type === 'alphaNum') {
          const prefixCompare = (detailsA.prefix || "").toLowerCase().localeCompare((detailsB.prefix || "").toLowerCase());
          if (prefixCompare !== 0) return prefixCompare;
          return (detailsA.num || 0) - (detailsB.num || 0);
        }
        if (detailsA.type === 'yearNum') {
          if ((detailsA.year || 0) < (detailsB.year || 0)) return -1;
          if ((detailsA.year || 0) > (detailsB.year || 0)) return 1;
          if ((detailsA.num || 0) < (detailsA.num || 0)) return -1;
          if ((detailsB.num || 0) > (detailsB.num || 0)) return 1;
          return 0;
        }
        return detailsA.original.localeCompare(detailsB.original);
      });
      setFileEntries(finalEntries);
    } catch (error) {
      console.error("[useFileEntries] Error fetching file entries:", error);
       setFileEntries([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, authIsLoading]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addFileEntry = useCallback(async (entryData: DataEntryFormData, originalFileNoWhileEditing?: string) => {
    if (!user || (user.role !== 'editor' && user.role !== 'supervisor')) {
      throw new Error("You do not have permission to save file data.");
    }
    
    if (originalFileNoWhileEditing) {
      const q = query(collection(db, FILE_ENTRIES_COLLECTION), where("fileNo", "==", originalFileNoWhileEditing));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) throw new Error(`File No. '${originalFileNoWhileEditing}' not found for update.`);
      const docToUpdateRef = doc(db, FILE_ENTRIES_COLLECTION, querySnapshot.docs[0].id);

      // If file number is being changed, check if the new file number already exists
      if (entryData.fileNo !== originalFileNoWhileEditing) {
        const newFileNoQuery = query(collection(db, FILE_ENTRIES_COLLECTION), where("fileNo", "==", entryData.fileNo));
        const newFileNoSnapshot = await getDocs(newFileNoQuery);
        if (!newFileNoSnapshot.empty) {
          throw new Error(`Cannot rename to '${entryData.fileNo}' because this File Number already exists.`);
        }
      }

      const payload = sanitizeObjectForFirestore({ ...entryData, id: undefined, updatedAt: serverTimestamp() });
      await updateDoc(docToUpdateRef, payload);
    } else { 
      const payload = sanitizeObjectForFirestore({ ...entryData, id: undefined, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      const q = query(collection(db, FILE_ENTRIES_COLLECTION), where("fileNo", "==", payload.fileNo));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) throw new Error(`File No. '${payload.fileNo}' already exists.`);
      await addDoc(collection(db, FILE_ENTRIES_COLLECTION), payload);
    }

    await fetchData();
  }, [user, fetchData]);

  const deleteFileEntry = useCallback(async (fileNo: string) => {
    if (!user || user.role !== 'editor') throw new Error("User does not have permission to delete file entries.");
    const q = query(collection(db, FILE_ENTRIES_COLLECTION), where("fileNo", "==", fileNo));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) throw new Error(`File No. '${fileNo}' not found for deletion.`);
    const docToDelete = querySnapshot.docs[0];
    await deleteDoc(doc(db, FILE_ENTRIES_COLLECTION, docToDelete.id));
    await fetchData();
  }, [user, fetchData]);

  const getFileEntry = useCallback((fileNo: string): DataEntryFormData | undefined => {
    return fileEntries.find(e => e.fileNo === fileNo);
  }, [fileEntries]);

  return { fileEntries, isLoading, addFileEntry, deleteFileEntry, getFileEntry, fetchEntryForEditing, refreshFileEntries: fetchData };
}
