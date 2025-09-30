
// src/hooks/use-data-store.tsx
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getFirestore, collection, onSnapshot, query, Timestamp, DocumentData } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { useAuth } from './useAuth';
import type { DataEntryFormData } from '@/lib/schemas/DataEntrySchema';
import type { ArsEntry } from './useArsEntries';
import type { StaffMember, LsgConstituencyMap } from '@/lib/schemas';
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

interface DataStoreContextType {
    allFileEntries: DataEntryFormData[];
    allArsEntries: ArsEntry[];
    allStaffMembers: StaffMember[];
    allAgencyApplications: AgencyApplication[];
    allLsgConstituencyMaps: LsgConstituencyMap[];
    isLoading: boolean;
    refetchFileEntries: () => void;
    refetchArsEntries: () => void;
    refetchStaffMembers: () => void;
    refetchAgencyApplications: () => void;
    refetchLsgConstituencyMaps: () => void;
}

const DataStoreContext = createContext<DataStoreContextType | undefined>(undefined);

export function DataStoreProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [allFileEntries, setAllFileEntries] = useState<DataEntryFormData[]>([]);
    const [allArsEntries, setAllArsEntries] = useState<ArsEntry[]>([]);
    const [allStaffMembers, setAllStaffMembers] = useState<StaffMember[]>([]);
    const [allAgencyApplications, setAllAgencyApplications] = useState<AgencyApplication[]>([]);
    const [allLsgConstituencyMaps, setAllLsgConstituencyMaps] = useState<LsgConstituencyMap[]>([]);
    const [loadingStates, setLoadingStates] = useState({
        files: true,
        ars: true,
        staff: true,
        agencies: true,
        lsg: true,
    });
    
    const [refetchCounters, setRefetchCounters] = useState({
        files: 0,
        ars: 0,
        staff: 0,
        agencies: 0,
        lsg: 0,
    });

    const refetchFileEntries = useCallback(() => setRefetchCounters(c => ({...c, files: c.files + 1})), []);
    const refetchArsEntries = useCallback(() => setRefetchCounters(c => ({...c, ars: c.ars + 1})), []);
    const refetchStaffMembers = useCallback(() => setRefetchCounters(c => ({...c, staff: c.staff + 1})), []);
    const refetchAgencyApplications = useCallback(() => setRefetchCounters(c => ({...c, agencies: c.agencies + 1})), []);
    const refetchLsgConstituencyMaps = useCallback(() => setRefetchCounters(c => ({ ...c, lsg: c.lsg + 1 })), []);


    useEffect(() => {
        if (!user) {
            setAllFileEntries([]);
            setAllArsEntries([]);
            setAllStaffMembers([]);
            setAllAgencyApplications([]);
            setAllLsgConstituencyMaps([]);
            setLoadingStates({ files: false, ars: false, staff: false, agencies: false, lsg: false });
            return;
        }

        const collections = {
            fileEntries: { setter: setAllFileEntries, loaderKey: 'files' },
            arsEntries: { setter: setAllArsEntries, loaderKey: 'ars' },
            staffMembers: { setter: setAllStaffMembers, loaderKey: 'staff' },
            agencyApplications: { setter: setAllAgencyApplications, loaderKey: 'agencies' },
            localSelfGovernments: { setter: setAllLsgConstituencyMaps, loaderKey: 'lsg' },
        };

        const unsubscribes = Object.entries(collections).map(([collectionName, { setter, loaderKey }]) => {
            const q = query(collection(db, collectionName));
            return onSnapshot(q, (snapshot) => {
                const data = snapshot.docs.map(doc => processFirestoreDoc<any>({id: doc.id, data: () => doc.data()}));
                
                if (collectionName === 'staffMembers') {
                    const designationSortOrder: Record<string, number> = designationOptions.reduce((acc, curr, index) => ({ ...acc, [curr]: index }), {});
                    data.sort((a: StaffMember, b: StaffMember) => {
                        const orderA = a.designation ? designationSortOrder[a.designation] ?? designationOptions.length : designationOptions.length;
                        const orderB = b.designation ? designationSortOrder[b.designation] ?? designationOptions.length : designationOptions.length;
                        if (orderA !== orderB) return orderA - orderB;
                        return a.name.localeCompare(b.name);
                    });
                }

                setter(data);
                setLoadingStates(prev => ({ ...prev, [loaderKey]: false }));
            }, (error) => {
                console.error(`Error fetching ${collectionName}:`, error);
                toast({ title: `Error Loading ${collectionName}`, description: error.message, variant: "destructive" });
                setLoadingStates(prev => ({ ...prev, [loaderKey]: false }));
            });
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
            isLoading,
            refetchFileEntries,
            refetchArsEntries,
            refetchStaffMembers,
            refetchAgencyApplications,
            refetchLsgConstituencyMaps,
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
