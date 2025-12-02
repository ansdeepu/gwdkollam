// src/hooks/use-data-store.tsx
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getFirestore, collection, onSnapshot, query, Timestamp, DocumentData, orderBy, getDocs, type QuerySnapshot } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { useAuth } from './useAuth';
import type { DataEntryFormData } from '@/lib/schemas/DataEntrySchema';
import type { ArsEntry } from './useArsEntries';
import type { StaffMember, LsgConstituencyMap, Designation, Bidder as MasterBidder } from '@/lib/schemas';
import type { AgencyApplication } from './useAgencyApplications';
import { toast } from './use-toast';
import { designationOptions } from '@/lib/schemas';

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
  address?: string;
  phoneNo?: string;
  email?: string;
  districtOfficerStaffId?: string;
  districtOfficer?: string;
  districtOfficerPhotoUrl?: string;
  gstNo?: string;
  panNo?: string;
  otherDetails?: string;
}

interface DataStoreContextType {
    allFileEntries: DataEntryFormData[];
    allArsEntries: ArsEntry[];
    allStaffMembers: StaffMember[];
    allAgencyApplications: AgencyApplication[];
    allLsgConstituencyMaps: LsgConstituencyMap[];
    allRateDescriptions: Record<RateDescriptionId, string>;
    allBidders: MasterBidder[];
    officeAddress: OfficeAddress | null;
    isLoading: boolean;
    refetchFileEntries: () => void;
    refetchArsEntries: () => void;
    refetchStaffMembers: () => void;
    refetchAgencyApplications: () => void;
    refetchLsgConstituencyMaps: () => void;
    refetchRateDescriptions: () => void;
    refetchBidders: () => void;
}

const DataStoreContext = createContext<DataStoreContextType | undefined>(undefined);

export function DataStoreProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [allFileEntries, setAllFileEntries] = useState<DataEntryFormData[]>([]);
    const [allArsEntries, setAllArsEntries] = useState<ArsEntry[]>([]);
    const [allStaffMembers, setAllStaffMembers] = useState<StaffMember[]>([]);
    const [allAgencyApplications, setAllAgencyApplications] = useState<AgencyApplication[]>([]);
    const [allLsgConstituencyMaps, setAllLsgConstituencyMaps] = useState<LsgConstituencyMap[]>([]);
    const [allRateDescriptions, setAllRateDescriptions] = useState<Record<RateDescriptionId, string>>(defaultRateDescriptions);
    const [allBidders, setAllBidders] = useState<MasterBidder[]>([]);
    const [officeAddress, setOfficeAddress] = useState<OfficeAddress | null>(null);

    const [loadingStates, setLoadingStates] = useState({
        files: true,
        ars: true,
        staff: true,
        agencies: true,
        lsg: true,
        rates: true,
        bidders: true,
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
    });

    const refetchFileEntries = useCallback(() => setRefetchCounters(c => ({...c, files: c.files + 1})), []);
    const refetchArsEntries = useCallback(() => setRefetchCounters(c => ({...c, ars: c.ars + 1})), []);
    const refetchStaffMembers = useCallback(() => setRefetchCounters(c => ({...c, staff: c.staff + 1})), []);
    const refetchAgencyApplications = useCallback(() => setRefetchCounters(c => ({...c, agencies: c.agencies + 1})), []);
    const refetchLsgConstituencyMaps = useCallback(() => setRefetchCounters(c => ({ ...c, lsg: c.lsg + 1 })), []);
    const refetchRateDescriptions = useCallback(() => setRefetchCounters(c => ({ ...c, rates: c.rates + 1 })), []);
    const refetchBidders = useCallback(() => setRefetchCounters(c => ({ ...c, bidders: c.bidders + 1 })), []);


    useEffect(() => {
        if (!user) {
            setAllFileEntries([]);
            setAllArsEntries([]);
            setAllStaffMembers([]);
            setAllAgencyApplications([]);
            setAllLsgConstituencyMaps([]);
            setAllRateDescriptions(defaultRateDescriptions);
            setAllBidders([]);
            setOfficeAddress(null);
            setLoadingStates({ files: false, ars: false, staff: false, agencies: false, lsg: false, rates: false, bidders: false, officeAddress: false });
            return;
        }

        const collections: Record<string, { setter: React.Dispatch<React.SetStateAction<any>>, loaderKey: keyof typeof loadingStates, q: any }> = {
            fileEntries: { setter: setAllFileEntries, loaderKey: 'files', q: query(collection(db, 'fileEntries')) },
            arsEntries: { setter: setAllArsEntries, loaderKey: 'ars', q: query(collection(db, 'arsEntries')) },
            staffMembers: { setter: setAllStaffMembers, loaderKey: 'staff', q: query(collection(db, 'staffMembers')) },
            agencyApplications: { setter: setAllAgencyApplications, loaderKey: 'agencies', q: query(collection(db, 'agencyApplications')) },
            localSelfGovernments: { setter: setAllLsgConstituencyMaps, loaderKey: 'lsg', q: query(collection(db, 'localSelfGovernments')) },
            rateDescriptions: { setter: setAllRateDescriptions, loaderKey: 'rates', q: query(collection(db, 'rateDescriptions')) },
            bidders: { setter: setAllBidders, loaderKey: 'bidders', q: query(collection(db, 'bidders'), orderBy("order")) },
            officeAddress: { setter: setOfficeAddress, loaderKey: 'officeAddress', q: query(collection(db, 'officeAddresses')) },
        };

        const unsubscribes = Object.entries(collections).map(([collectionName, { setter, loaderKey, q }]) => {
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
                    } else if (collectionName === 'officeAddress') {
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

    return (
        <DataStoreContext.Provider value={{
            allFileEntries,
            allArsEntries,
            allStaffMembers,
            allAgencyApplications,
            allLsgConstituencyMaps,
            allRateDescriptions,
            allBidders,
            officeAddress,
            isLoading,
            refetchFileEntries,
            refetchArsEntries,
            refetchStaffMembers,
            refetchAgencyApplications,
            refetchLsgConstituencyMaps,
            refetchRateDescriptions,
            refetchBidders,
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
