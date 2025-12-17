
// src/hooks/use-data-store.tsx
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getFirestore, collection, onSnapshot, query, Timestamp, DocumentData, orderBy, getDocs, type QuerySnapshot, where, deleteDoc, doc, addDoc, updateDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { useAuth, type UserProfile } from './useAuth';
import type { DataEntryFormData } from '@/lib/schemas/DataEntrySchema';
import type { ArsEntry } from './useArsEntries';
import type { StaffMember, LsgConstituencyMap, Designation, Bidder as MasterBidder, DepartmentVehicle, HiredVehicle, RigCompressor } from '@/lib/schemas';
import type { AgencyApplication } from './useAgencyApplications';
import { toast } from './use-toast';
import { designationOptions } from '@/lib/schemas';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


const db = getFirestore(app);

// Helper to convert Firestore Timestamps to JS Dates recursively
const processFirestoreDoc = <T,>(doc: DocumentData): T => {
    const data = doc.data();
    const converted: { [key: string]: any } = { id: doc.id };

    for (const key in data) {
        const value = data[key];
        if (value instanceof Timestamp) {
            converted[key] = value.toDate();
        } else if (Array.isArray(value)) {
            converted[key] = value.map(item =>
                typeof item === 'object' && item !== null && !(item instanceof Timestamp)
                    ? processFirestoreDoc({ data: () => item, id: '' })
                    : (item instanceof Timestamp ? item.toDate() : item)
            );
        } else if (typeof value === 'object' && value !== null) {
            converted[key] = processFirestoreDoc({ data: () => value, id: '' });
        } else {
            converted[key] = value;
        }
    }
    return converted as T;
};

export type RateDescriptionId = 'tenderFee' | 'emd' | 'performanceGuarantee' | 'additionalPerformanceGuarantee' | 'stampPaper';

export const defaultRateDescriptions: Record<RateDescriptionId, string> = {
    tenderFee: "For Works:\n- Up to Rs 1 Lakh: No Fee\n- Over 1 Lakh up to 10 Lakhs: Rs 500\n- Over 10 Lakhs up to 50 Lakhs: Rs 2500\n- Over 50 Lakhs up to 1 Crore: Rs 5000\n- Above 1 Crore: Rs 10000\n\nFor Purchase:\n- Up to Rs 1 Lakh: No Fee\n- Over 1 Lakh up to 10 Lakhs: Rs 800\n- Over 10 Lakhs up to 25 Lakhs: Rs 1600\n- Above 25 Lakhs: Rs 3000",
    emd: "For Works:\n- Up to Rs. 2 Crore: 2.5% of the project cost, subject to a maximum of Rs. 50,000\n- Above Rs. 2 Crore up to Rs. 5 Crore: Rs. 1 Lakh\n- Above Rs. 5 Crore up to Rs. 10 Crore: Rs. 2 Lakh\n- Above Rs. 10 Crore: Rs. 5 Lakh\n\nFor Purchase:\n- Up to 2 Crore: 1.00% of the project cost\n- Above 2 Crore: No EMD",
    performanceGuarantee: "Performance Guarantee , the amount collected at the time of executing contract agreement will be 5% of the contract value(agrecd PAC)and the deposit will be retained till the texpiry of Defect Liability Period. At least fifty percent(50%) of this deposit shall be collected in the form of Treasury Fixed Deposit and the rest in the form of Bank Guarantee or any other forms prescribed in the revised PWD Manual.",
    additionalPerformanceGuarantee: "Additional Performance Security for abnormally low quoted tenders will be collected at the time of executing contract agreement from the successful tenderer if the tender is below the estimate cost by more than 15%. This deposit is calculated as 25% of the difference between the estimate cost and the tender amount, but it will not exceed 10% of the estimate cost. This deposit will be released after satisfactory completion of the work.",
    stampPaper: "For agreements or memorandums, stamp duty shall be ₹1 for every ₹1,000 (or part) of the contract amount, subject to a minimum of ₹200 and a maximum of ₹1,00,000. For supplementary deeds, duty shall be based on the amount in the supplementary agreement.",
};

export interface OfficeAddress {
  id: string;
  officeName?: string;
  officeNameMalayalam?: string;
  address?: string;
  addressMalayalam?: string;
  phoneNo?: string;
  email?: string;
  districtOfficerStaffId?: string;
  districtOfficer?: string;
  districtOfficerPhotoUrl?: string;
  gstNo?: string;
  panNo?: string;
  otherDetails?: string;
}

const COLLECTIONS = {
    DEPARTMENT: 'departmentVehicles',
    HIRED: 'hiredVehicles',
    RIG_COMPRESSOR: 'rigCompressors',
};

interface DataStoreContextType {
    allFileEntries: DataEntryFormData[];
    allArsEntries: ArsEntry[];
    allStaffMembers: StaffMember[];
    allAgencyApplications: AgencyApplication[];
    allLsgConstituencyMaps: LsgConstituencyMap[];
    allRateDescriptions: Record<RateDescriptionId, string>;
    allBidders: MasterBidder[];
    allDepartmentVehicles: DepartmentVehicle[];
    allHiredVehicles: HiredVehicle[];
    allRigCompressors: RigCompressor[];
    officeAddress: OfficeAddress | null;
    isLoading: boolean;
    refetchFileEntries: () => void;
    refetchArsEntries: () => void;
    deleteArsEntry: (id: string) => Promise<void>;
    refetchStaffMembers: () => void;
    refetchAgencyApplications: () => void;
    refetchLsgConstituencyMaps: () => void;
    refetchRateDescriptions: () => void;
    refetchBidders: () => void;
    addDepartmentVehicle: (data: DepartmentVehicle) => Promise<void>;
    updateDepartmentVehicle: (data: DepartmentVehicle) => Promise<void>;
    deleteDepartmentVehicle: (id: string, name: string) => Promise<void>;
    addHiredVehicle: (data: HiredVehicle) => Promise<void>;
    updateHiredVehicle: (data: HiredVehicle) => Promise<void>;
    deleteHiredVehicle: (id: string, name: string) => Promise<void>;
    addRigCompressor: (data: RigCompressor) => Promise<void>;
    updateRigCompressor: (data: RigCompressor) => Promise<void>;
    deleteRigCompressor: (id: string, name: string) => Promise<void>;
    refetchOfficeAddress: () => void;
}

const DataStoreContext = createContext<DataStoreContextType | undefined>(undefined);

export function DataStoreProvider({ children, user }: { children: ReactNode, user: UserProfile | null }) {
    const [allFileEntries, setAllFileEntries] = useState<DataEntryFormData[]>([]);
    const [allArsEntries, setAllArsEntries] = useState<ArsEntry[]>([]);
    const [allStaffMembers, setAllStaffMembers] = useState<StaffMember[]>([]);
    const [allAgencyApplications, setAllAgencyApplications] = useState<AgencyApplication[]>([]);
    const [allLsgConstituencyMaps, setAllLsgConstituencyMaps] = useState<LsgConstituencyMap[]>([]);
    const [allRateDescriptions, setAllRateDescriptions] = useState<Record<RateDescriptionId, string>>(defaultRateDescriptions);
    const [allBidders, setAllBidders] = useState<MasterBidder[]>([]);
    const [allDepartmentVehicles, setAllDepartmentVehicles] = useState<DepartmentVehicle[]>([]);
    const [allHiredVehicles, setAllHiredVehicles] = useState<HiredVehicle[]>([]);
    const [allRigCompressors, setAllRigCompressors] = useState<RigCompressor[]>([]);
    const [officeAddress, setOfficeAddress] = useState<OfficeAddress | null>(null);

    const [loadingStates, setLoadingStates] = useState({
        files: true,
        ars: true,
        staff: true,
        agencies: true,
        lsg: true,
        rates: true,
        bidders: true,
        departmentVehicles: true,
        hiredVehicles: true,
        rigCompressors: true,
        officeAddress: true,
    });
    
    const [refetchCounters, setRefetchCounters] = useState({
        files: 0,
        ars: 0,
        staff: 0,
        agencies: 0,
        lsg: 0,
        rates: 0,
        bidders: 0,
        departmentVehicles: 0,
        hiredVehicles: 0,
        rigCompressors: 0,
        officeAddress: 0,
    });

    const refetchFileEntries = useCallback(() => setRefetchCounters(c => ({...c, files: c.files + 1})), []);
    const refetchArsEntries = useCallback(() => setRefetchCounters(c => ({...c, ars: c.ars + 1})), []);
    const refetchStaffMembers = useCallback(() => setRefetchCounters(c => ({...c, staff: c.staff + 1})), []);
    const refetchAgencyApplications = useCallback(() => setRefetchCounters(c => ({...c, agencies: c.agencies + 1})), []);
    const refetchLsgConstituencyMaps = useCallback(() => setRefetchCounters(c => ({ ...c, lsg: c.lsg + 1 })), []);
    const refetchRateDescriptions = useCallback(() => setRefetchCounters(c => ({ ...c, rates: c.rates + 1 })), []);
    const refetchBidders = useCallback(() => setRefetchCounters(c => ({ ...c, bidders: c.bidders + 1 })), []);
    const refetchDepartmentVehicles = useCallback(() => setRefetchCounters(c => ({...c, departmentVehicles: c.departmentVehicles + 1})), []);
    const refetchHiredVehicles = useCallback(() => setRefetchCounters(c => ({...c, hiredVehicles: c.hiredVehicles + 1})), []);
    const refetchRigCompressors = useCallback(() => setRefetchCounters(c => ({...c, rigCompressors: c.rigCompressors + 1})), []);
    const refetchOfficeAddress = useCallback(() => setRefetchCounters(c => ({...c, officeAddress: c.officeAddress + 1})), []);


     const deleteArsEntry = useCallback(async (id: string) => {
        if (!user || user.role !== 'editor') {
            toast({ title: "Permission Denied", description: "You don't have permission to delete entries.", variant: "destructive" });
            return;
        }
        await deleteDoc(doc(db, 'arsEntries', id));
        refetchArsEntries(); // This will trigger the listener to refetch
    }, [user, refetchArsEntries]);


    useEffect(() => {
        if (!user) {
            setAllFileEntries([]);
            setAllArsEntries([]);
            setAllStaffMembers([]);
            setAllAgencyApplications([]);
            setAllLsgConstituencyMaps([]);
            setAllRateDescriptions(defaultRateDescriptions);
            setAllBidders([]);
            setAllDepartmentVehicles([]);
            setAllHiredVehicles([]);
            setAllRigCompressors([]);
            setOfficeAddress(null);
            setLoadingStates({ files: false, ars: false, staff: false, agencies: false, lsg: false, rates: false, bidders: false, officeAddress: false, departmentVehicles: false, hiredVehicles: false, rigCompressors: false });
            return;
        }

        const getQueryForCollection = (collectionName: string) => {
            if (collectionName === 'fileEntries' && user?.role === 'supervisor' && user.uid) {
                return query(collection(db, 'fileEntries'), where('assignedSupervisorUids', 'array-contains', user.uid));
            }
            return query(collection(db, collectionName));
        };
        
        const collections: Record<string, { setter: React.Dispatch<React.SetStateAction<any>>, loaderKey: keyof typeof loadingStates, collectionName: string }> = {
            fileEntries: { setter: setAllFileEntries, loaderKey: 'files', collectionName: 'fileEntries' },
            arsEntries: { setter: setAllArsEntries, loaderKey: 'ars', collectionName: 'arsEntries' },
            staffMembers: { setter: setAllStaffMembers, loaderKey: 'staff', collectionName: 'staffMembers' },
            agencyApplications: { setter: setAllAgencyApplications, loaderKey: 'agencies', collectionName: 'agencyApplications' },
            localSelfGovernments: { setter: setAllLsgConstituencyMaps, loaderKey: 'lsg', collectionName: 'localSelfGovernments' },
            rateDescriptions: { setter: setAllRateDescriptions, loaderKey: 'rates', collectionName: 'rateDescriptions' },
            bidders: { setter: setAllBidders, loaderKey: 'bidders', collectionName: 'bidders' },
            departmentVehicles: { setter: setAllDepartmentVehicles, loaderKey: 'departmentVehicles', collectionName: 'departmentVehicles' },
            hiredVehicles: { setter: setAllHiredVehicles, loaderKey: 'hiredVehicles', collectionName: 'hiredVehicles' },
            rigCompressors: { setter: setAllRigCompressors, loaderKey: 'rigCompressors', collectionName: 'rigCompressors' },
            officeAddress: { setter: setOfficeAddress, loaderKey: 'officeAddress', collectionName: 'officeAddresses' },
        };

        const unsubscribes = Object.entries(collections).map(([key, { setter, loaderKey, collectionName }]) => {
            let q;
            if(collectionName === 'bidders'){
                 q = query(collection(db, collectionName), orderBy("order"));
            } else {
                 q = getQueryForCollection(collectionName);
            }
            
            return onSnapshot(
                q,
                (snapshot: QuerySnapshot<DocumentData>) => {
                    if (collectionName === 'rateDescriptions') {
                        if (snapshot.empty) {
                            setter(defaultRateDescriptions);
                        } else {
                            const descriptions: Partial<Record<RateDescriptionId, string>> = {};
                            snapshot.forEach(doc => {
                                descriptions[doc.id as RateDescriptionId] = doc.data().description;
                            });
                            setter((prev: Record<RateDescriptionId, string>) => ({ ...defaultRateDescriptions, ...prev, ...descriptions }));
                        }
                    } else if (collectionName === 'officeAddresses') { // Corrected collection name
                        if (snapshot.empty) {
                            setter(null);
                        } else {
                            const doc = snapshot.docs[0];
                            setter({ id: doc.id, ...doc.data() } as OfficeAddress);
                        }
                    } else if (collectionName === 'bidders') {
                        const data = snapshot.docs.map(doc => ({
                            ...doc.data(),
                            id: doc.id,
                        })) as MasterBidder[];
                        setter(data);
                    } else {
                        const data = snapshot.docs.map(doc => {
                            const docData = doc.data();
                            const processed = processFirestoreDoc<any>({ id: doc.id, data: () => docData });
                            processed.id = doc.id;
                            return processed;
                        });

                        if (collectionName === 'staffMembers') {
                            const designationSortOrder = designationOptions.reduce((acc, curr, index) => ({ ...acc, [curr]: index }), {} as Record<string, number>);
                            data.sort((a: StaffMember, b: StaffMember) => {
                                const orderA = a.designation ? designationSortOrder[a.designation] ?? designationOptions.length : designationOptions.length;
                                const orderB = b.designation ? designationSortOrder[b.designation] ?? designationOptions.length : designationOptions.length;
                                if (orderA !== orderB) return orderA - orderB;
                                return a.name.localeCompare(b.name);
                            });
                        }

                        setter(data);
                    }

                    setLoadingStates(prev => ({ ...prev, [loaderKey]: false }));
                },
                (error) => {
                    console.error(`Error fetching ${collectionName}:`, error);
                    toast({ title: `Error Loading ${collectionName}`, description: error.message, variant: "destructive" });
                    setLoadingStates(prev => ({ ...prev, [loaderKey]: false }));
                }
            );
        });

        return () => {
            unsubscribes.forEach(unsub => unsub());
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, refetchCounters]);

    const isLoading = Object.values(loadingStates).some(Boolean);

    // --- Vehicle Management Logic ---

    const useAddVehicle = <T extends {}>(collectionName: string, refetch: () => void) => {
      return useCallback(async (data: T) => {
          if (!user) throw new Error("User must be logged in.");
          const payload = { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
          if ('id' in payload) delete (payload as any).id;
  
          addDoc(collection(db, collectionName), payload)
              .then(() => {
                  toast({ title: 'Item Added', description: 'The new item has been saved.' });
                  refetch();
              })
              .catch(error => {
                  if (error.code === 'permission-denied') {
                      errorEmitter.emit('permission-error', new FirestorePermissionError({
                          path: `/${collectionName}`,
                          operation: 'create',
                          requestResourceData: payload,
                      }));
                  } else {
                      toast({ title: "Error Adding Item", description: error.message, variant: "destructive" });
                  }
              });
      }, [user, collectionName, refetch]);
    };
  
    const useUpdateVehicle = <T extends { id?: string }>(collectionName: string, refetch: () => void) => {
      return useCallback(async (data: T) => {
          if (!user) throw new Error("User must be logged in.");
          if (!data.id) throw new Error("Document ID is missing for update.");
          const docRef = doc(db, collectionName, data.id);
          const payload = { ...data, updatedAt: serverTimestamp() };
          if ('id' in payload) delete (payload as any).id;
          
          updateDoc(docRef, payload)
              .then(() => {
                  toast({ title: 'Item Updated', description: 'Your changes have been saved.' });
                  refetch();
              })
              .catch(error => {
                  if (error.code === 'permission-denied') {
                      errorEmitter.emit('permission-error', new FirestorePermissionError({
                          path: docRef.path,
                          operation: 'update',
                          requestResourceData: payload,
                      }));
                  } else {
                      toast({ title: "Error Updating Item", description: error.message, variant: "destructive" });
                  }
              });
      }, [user, collectionName, refetch]);
    };
  
    const useDeleteVehicle = (collectionName: string, refetch: () => void) => {
      return useCallback(async (id: string, name: string) => {
          if (!user) throw new Error("User must be logged in.");
          const docRef = doc(db, collectionName, id);
          
          deleteDoc(docRef)
              .then(() => {
                  toast({ title: 'Item Deleted', description: `${name} has been removed.` });
                  refetch();
              })
              .catch(error => {
                  if (error.code === 'permission-denied') {
                      errorEmitter.emit('permission-error', new FirestorePermissionError({
                          path: docRef.path,
                          operation: 'delete',
                      }));
                  } else {
                      toast({ title: "Error Deleting Item", description: error.message, variant: "destructive" });
                  }
              });
      }, [user, collectionName, refetch]);
    };

    const addDepartmentVehicle = useAddVehicle<DepartmentVehicle>(COLLECTIONS.DEPARTMENT, refetchDepartmentVehicles);
    const updateDepartmentVehicle = useUpdateVehicle<DepartmentVehicle>(COLLECTIONS.DEPARTMENT, refetchDepartmentVehicles);
    const deleteDepartmentVehicle = useDeleteVehicle(COLLECTIONS.DEPARTMENT, refetchDepartmentVehicles);

    const addHiredVehicle = useAddVehicle<HiredVehicle>(COLLECTIONS.HIRED, refetchHiredVehicles);
    const updateHiredVehicle = useUpdateVehicle<HiredVehicle>(COLLECTIONS.HIRED, refetchHiredVehicles);
    const deleteHiredVehicle = useDeleteVehicle(COLLECTIONS.HIRED, refetchHiredVehicles);

    const addRigCompressor = useAddVehicle<RigCompressor>(COLLECTIONS.RIG_COMPRESSOR, refetchRigCompressors);
    const updateRigCompressor = useUpdateVehicle<RigCompressor>(COLLECTIONS.RIG_COMPRESSOR, refetchRigCompressors);
    const deleteRigCompressor = useDeleteVehicle(COLLECTIONS.RIG_COMPRESSOR, refetchRigCompressors);


    return (
        <DataStoreContext.Provider value={{
            allFileEntries,
            allArsEntries,
            allStaffMembers,
            allAgencyApplications,
            allLsgConstituencyMaps,
            allRateDescriptions,
            allBidders,
            allDepartmentVehicles,
            allHiredVehicles,
            allRigCompressors,
            officeAddress,
            isLoading,
            refetchFileEntries,
            refetchArsEntries,
            deleteArsEntry,
            refetchStaffMembers,
            refetchAgencyApplications,
            refetchLsgConstituencyMaps,
            refetchRateDescriptions,
            refetchBidders,
            addDepartmentVehicle,
            updateDepartmentVehicle,
            deleteDepartmentVehicle,
            addHiredVehicle,
            updateHiredVehicle,
            deleteHiredVehicle,
            addRigCompressor,
            updateRigCompressor,
            deleteRigCompressor,
            refetchOfficeAddress,
        }}>
            {children}
        </DataStoreContext.Provider>
    );
}

export function useDataStore() {
    const context = useContext(DataStoreContext);
    if (!context) {
        throw new Error('useDataStore must be used within a DataStoreProvider');
    }
    return context;
}
