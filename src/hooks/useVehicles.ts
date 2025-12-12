// src/hooks/useVehicles.ts
"use client";

import { useDataStore } from './use-data-store';

export function useVehicles() {
    const {
        allDepartmentVehicles, addDepartmentVehicle, updateDepartmentVehicle, deleteDepartmentVehicle,
        allHiredVehicles, addHiredVehicle, updateHiredVehicle, deleteHiredVehicle,
        allRigCompressors, addRigCompressor, updateRigCompressor, deleteRigCompressor,
        isLoading
    } = useDataStore();

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
