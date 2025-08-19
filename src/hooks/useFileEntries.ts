
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
import { usePendingUpdates } from './usePendingUpdates';
import { isValid, parseISO } from 'date-fns';

const db = getFirestore(app);
const FILE_ENTRIES_COLLECTION = 'fileEntries';

const convertTimestampsToDates = (data: DocumentData): DataEntryFormData => {
  const entry = { ...data } as any;

  const toDate = (value: any): Date | undefined | null => {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (value instanceof Timestamp) return value.toDate();
    if (typeof value === 'object' && value !== null && typeof value.seconds === 'number' && typeof value.nanoseconds === 'number') {
      return new Timestamp(value.seconds, value.nanoseconds).toDate();
    }
    if (typeof value === 'string') {
      const d = parseISO(value);
      if (isValid(d)) return d;
    }
    return null;
  };

  if (entry.id === null) entry.id = undefined;
  entry.createdAt = toDate(entry.createdAt);
  entry.updatedAt = toDate(entry.updatedAt);

  if (entry.remittanceDetails && Array.isArray(entry.remittanceDetails)) {
    entry.remittanceDetails = entry.remittanceDetails.map((rd: any) => {
      if (!rd) return null;
      const detail = {...rd};
      detail.dateOfRemittance = toDate(rd.dateOfRemittance);
      if (detail.amountRemitted === null) detail.amountRemitted = undefined;
      if (detail.remittedAccount === null) detail.remittedAccount = undefined;
      return detail;
    }).filter(Boolean);
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
      // Do not include the transient 'isPending' field in Firestore writes.
      if (key === 'id' || key === 'isPending') continue;
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
  const { getPendingUpdatesForFile } = usePendingUpdates();
  const [fileEntries, setFileEntries] = useState<DataEntryFormData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEntryForEditing = useCallback(async (fileNo: string): Promise<DataEntryFormData | undefined> => {
    if (authIsLoading || !user) {
        console.warn("[useFileEntries] fetchEntryForEditing called before user was loaded.");
        return undefined;
    }

    try {
        let q;
        // Construct the query based on user role for security.
        if (user.role === 'editor' || user.role === 'viewer') {
            q = query(collection(db, FILE_ENTRIES_COLLECTION), where("fileNo", "==", fileNo));
        } else if (user.role === 'supervisor') {
            q = query(
                collection(db, FILE_ENTRIES_COLLECTION),
                where("fileNo", "==", fileNo),
                where("assignedSupervisorUids", "array-contains", user.uid)
            );
        } else {
            // If user role is not recognized or doesn't have permissions, return nothing.
            return undefined;
        }

        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            return undefined; // File does not exist or user doesn't have access.
        }
        
        let entry = convertTimestampsToDates({ id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() });

        // For supervisor, we need to mark which sites are pending
        if (user.role === 'supervisor' && user.uid && entry.siteDetails) {
            const pendingUpdates = await getPendingUpdatesForFile(entry.fileNo);
            const userPendingUpdate = pendingUpdates.find(p => p.submittedByUid === user.uid);
            if (userPendingUpdate) {
                const pendingSiteNames = new Set(userPendingUpdate.updatedSiteDetails.map(s => s.nameOfSite));
                entry.siteDetails = entry.siteDetails.map(site => 
                    pendingSiteNames.has(site.nameOfSite) ? { ...site, isPending: true } : site
                );
            }
        }
        
        return entry;

    } catch (error) {
        console.error("[useFileEntries] Error fetching single entry for editing:", error);
        return undefined;
    }
  }, [user, authIsLoading, getPendingUpdatesForFile]);


  const fetchData = useCallback(async () => {
    if (authIsLoading || !user) {
      setIsLoading(true);
      return;
    }

    if (!user.isApproved) {
      setIsLoading(false);
      setFileEntries([]);
      return;
    }

    setIsLoading(true);
    try {
      let q;
      if (user.role === 'supervisor' && user.uid) {
        q = query(collection(db, FILE_ENTRIES_COLLECTION), where("assignedSupervisorUids", "array-contains", user.uid));
      } else {
        q = query(collection(db, FILE_ENTRIES_COLLECTION));
      }
      
      const querySnapshot = await getDocs(q);
      let entriesFromFirestore: DataEntryFormData[] = [];
      for (const doc of querySnapshot.docs) {
          entriesFromFirestore.push(convertTimestampsToDates({ id: doc.id, ...doc.data() }));
      }
      
      // Supervisor Specific Filtering Logic
      if (user.role === 'supervisor' && user.uid) {
          const allManagerPendingUpdates = await getPendingUpdatesForFile(null, user.uid);
          const finalSubmittedStatuses: SiteWorkStatus[] = ["Work Failed", "Work Completed"];
          const activeStatuses: SiteWorkStatus[] = ["Work Order Issued", "Work in Progress", "Awaiting Dept. Rig"];

          // Create a "hide list" of sites that are pending completion.
          const sitesPendingCompletion = new Set<string>();
          allManagerPendingUpdates.forEach(update => {
              update.updatedSiteDetails.forEach(site => {
                  if (site.workStatus && finalSubmittedStatuses.includes(site.workStatus as SiteWorkStatus)) {
                      sitesPendingCompletion.add(`${update.fileNo}-${site.nameOfSite}`);
                  }
              });
          });

          const filteredEntriesForManager = entriesFromFirestore.map(entry => {
              const userPendingUpdateForThisFile = allManagerPendingUpdates.find(p => p.fileNo === entry.fileNo);

              const sitesToDisplay = (entry.siteDetails || [])
                  .filter(site => {
                      if (site.supervisorUid !== user.uid) return false;

                      const siteIdentifier = `${entry.fileNo}-${site.nameOfSite}`;
                      
                      // Rule 1: Hide any site that has a pending 'Work Completed' or 'Work Failed' update.
                      if (sitesPendingCompletion.has(siteIdentifier)) {
                          return false;
                      }
                      
                      // Rule 2: From the remaining sites, only show those with an active work status in the main database.
                      return site.workStatus && activeStatuses.includes(site.workStatus as SiteWorkStatus);
                  })
                  .map(site => {
                      // Mark if the site has ANY other pending update (not just completion).
                      const isPending = userPendingUpdateForThisFile?.updatedSiteDetails.some(us => us.nameOfSite === site.nameOfSite);
                      return { ...site, isPending };
                  });
              
              return { ...entry, siteDetails: sitesToDisplay };
          }).filter(entry => entry.siteDetails && entry.siteDetails.length > 0);

          entriesFromFirestore = filteredEntriesForManager;
      }
      
      entriesFromFirestore.sort((a, b) => {
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
      setFileEntries(entriesFromFirestore);
    } catch (error) {
      console.error("[useFileEntries] Error fetching file entries:", error);
      setFileEntries([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, authIsLoading, getPendingUpdatesForFile]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);


  const addFileEntry = useCallback(async (entryData: DataEntryFormData, originalFileNoWhileEditing?: string) => {
    if (!user || user.role !== 'editor') {
      throw new Error("You do not have permission to save file data.");
    }
    
    if (originalFileNoWhileEditing) {
      const q = query(collection(db, FILE_ENTRIES_COLLECTION), where("fileNo", "==", originalFileNoWhileEditing));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) throw new Error(`File No. '${originalFileNoWhileEditing}' not found for update.`);
      const docToUpdateRef = doc(db, FILE_ENTRIES_COLLECTION, querySnapshot.docs[0].id);

      if (entryData.fileNo !== originalFileNoWhileEditing) {
        if (user.role !== 'editor') throw new Error("Only editors can change the file number.");
        const newFileNoQuery = query(collection(db, FILE_ENTRIES_COLLECTION), where("fileNo", "==", entryData.fileNo));
        const newFileNoSnapshot = await getDocs(newFileNoQuery);
        if (!newFileNoSnapshot.empty) {
          throw new Error(`Cannot rename to '${entryData.fileNo}' because this File Number already exists.`);
        }
      }

      const payload = sanitizeObjectForFirestore({ ...entryData, id: undefined, updatedAt: serverTimestamp() });
      await updateDoc(docToUpdateRef, payload);
    } else { 
      if (user.role !== 'editor') throw new Error("Only editors can create new files.");
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
