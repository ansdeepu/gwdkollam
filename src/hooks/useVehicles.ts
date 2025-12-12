// src/hooks/useVehicles.ts
"use client";

import { useCallback } from 'react';
import { getFirestore, collection, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import type { DepartmentVehicle, HiredVehicle, RigCompressor } from '@/lib/schemas';
import { useAuth } from './useAuth';
import { toast } from './use-toast';
import { useDataStore } from './use-data-store';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const db = getFirestore(app);

const COLLECTIONS = {
    DEPARTMENT: 'departmentVehicles',
    HIRED: 'hiredVehicles',
    RIG_COMPRESSOR: 'rigCompressors',
};

// Generic function to add a document
const useAddVehicle = <T extends {}>(collectionName: string, refetch: () => void) => {
    const { user } = useAuth();
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

// Generic function to update a document
const useUpdateVehicle = <T extends { id?: string }>(collectionName: string, refetch: () => void) => {
    const { user } = useAuth();
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

// Generic function to delete a document
const useDeleteVehicle = (collectionName: string, refetch: () => void) => {
    const { user } = useAuth();
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


export function useVehicles() {
    const {
        allDepartmentVehicles, refetchDepartmentVehicles,
        allHiredVehicles, refetchHiredVehicles,
        allRigCompressors, refetchRigCompressors,
        isLoading
    } = useDataStore();

    const addDepartmentVehicle = useAddVehicle<DepartmentVehicle>(COLLECTIONS.DEPARTMENT, refetchDepartmentVehicles);
    const updateDepartmentVehicle = useUpdateVehicle<DepartmentVehicle>(COLLECTIONS.DEPARTMENT, refetchDepartmentVehicles);
    const deleteDepartmentVehicle = useDeleteVehicle(COLLECTIONS.DEPARTMENT, refetchDepartmentVehicles);

    const addHiredVehicle = useAddVehicle<HiredVehicle>(COLLECTIONS.HIRED, refetchHiredVehicles);
    const updateHiredVehicle = useUpdateVehicle<HiredVehicle>(COLLECTIONS.HIRED, refetchHiredVehicles);
    const deleteHiredVehicle = useDeleteVehicle(COLLECTIONS.HIRED, refetchHiredVehicles);

    const addRigCompressor = useAddVehicle<RigCompressor>(COLLECTIONS.RIG_COMPRESSOR, refetchRigCompressors);
    const updateRigCompressor = useUpdateVehicle<RigCompressor>(COLLECTIONS.RIG_COMPRESSOR, refetchRigCompressors);
    const deleteRigCompressor = useDeleteVehicle(COLLECTIONS.RIG_COMPRESSOR, refetchRigCompressors);

    return {
        // Department Vehicles
        departmentVehicles: allDepartmentVehicles,
        addDepartmentVehicle,
        updateDepartmentVehicle,
        deleteDepartmentVehicle,
        
        // Hired Vehicles
        hiredVehicles: allHiredVehicles,
        addHiredVehicle,
        updateHiredVehicle,
        deleteHiredVehicle,
        
        // Rig & Compressor Units
        rigCompressors: allRigCompressors,
        addRigCompressor,
        updateRigCompressor,
        deleteRigCompressor,

        isLoading
    };
}
