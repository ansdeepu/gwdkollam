// src/app/dashboard/vehicles/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { usePageHeader } from '@/hooks/usePageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Loader2, PlusCircle, Truck, FileDown } from 'lucide-react';
import { DepartmentVehicleSchema, HiredVehicleSchema, RigCompressorSchema } from '@/lib/schemas';
import type { DepartmentVehicle, HiredVehicle, RigCompressor } from '@/lib/schemas';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from '@/components/ui/form';
import { DepartmentVehicleForm, HiredVehicleForm, RigCompressorForm } from '@/components/vehicles/VehicleForms';
import { DepartmentVehicleTable, HiredVehicleTable, RigCompressorTable } from '@/components/vehicles/VehicleTables';
import { useVehicles } from '@/hooks/useVehicles';
import { useAuth } from '@/hooks/useAuth';
import ExcelJS from 'exceljs';
import { format, isValid } from 'date-fns';
import { toast } from '@/hooks/use-toast';

const safeParseDate = (dateValue: any): Date | null => {
  if (!dateValue) return null;
  if (dateValue instanceof Date) return dateValue;
  if (typeof dateValue === 'object' && dateValue !== null && typeof (dateValue as any).seconds === 'number') {
    return new Date((dateValue as any).seconds * 1000);
  }
  if (typeof dateValue === 'string' || typeof dateValue === 'number') {
    const parsed = new Date(dateValue);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return null;
};

const formatDateSafe = (date: any): string => {
    if (date === null || date === undefined || date === '') {
        return 'N/A';
    }
    const d = safeParseDate(date);
    if (!d || !isValid(d)) {
        return String(date);
    }
    return format(d, 'dd/MM/yyyy');
};

export default function VehiclesPage() {
    const { setHeader } = usePageHeader();
    const { user } = useAuth();
    const canEdit = user?.role === 'editor';

    const {
        departmentVehicles, useAddDepartmentVehicle, useUpdateDepartmentVehicle, useDeleteDepartmentVehicle,
        hiredVehicles, useAddHiredVehicle, useUpdateHiredVehicle, useDeleteHiredVehicle,
        rigCompressors, useAddRigCompressor, useUpdateRigCompressor, useDeleteRigCompressor,
        isLoading
    } = useVehicles();

    const [isDepartmentDialogOpen, setIsDepartmentDialogOpen] = useState(false);
    const [isHiredDialogOpen, setIsHiredDialogOpen] = useState(false);
    const [isRigDialogOpen, setIsRigDialogOpen] = useState(false);

    const [editingDepartmentVehicle, setEditingDepartmentVehicle] = useState<DepartmentVehicle | null>(null);
    const [editingHiredVehicle, setEditingHiredVehicle] = useState<HiredVehicle | null>(null);
    const [editingRigCompressor, setEditingRigCompressor] = useState<RigCompressor | null>(null);
    
    useEffect(() => {
        setHeader("Vehicle Management", "Manage department, hired, and rig/compressor vehicles.");
    }, [setHeader]);

    const handleAddOrEdit = (type: 'department' | 'hired' | 'rig', data: any) => {
        if(type === 'department') {
            setEditingDepartmentVehicle(data);
            setIsDepartmentDialogOpen(true);
        } else if (type === 'hired') {
            setEditingHiredVehicle(data);
            setIsHiredDialogOpen(true);
        } else if (type === 'rig') {
            setEditingRigCompressor(data);
            setIsRigDialogOpen(true);
        }
    };
    
    const handleExportExcel = useCallback(async () => {
        const workbook = new ExcelJS.Workbook();

        // Department Vehicles
        const deptSheet = workbook.addWorksheet('Department Vehicles');
        const deptHeaders = ["Registration Number", "Model", "Type of Vehicle", "Vehicle Class", "Registration Date", "RC Status", "Fuel Consumption Rate", "Fitness Expiry", "Tax Expiry", "Insurance Expiry", "Pollution Expiry"];
        deptSheet.addRow(deptHeaders).font = { bold: true };
        departmentVehicles.forEach(v => {
            deptSheet.addRow([
                v.registrationNumber, v.model, v.typeOfVehicle, v.vehicleClass,
                formatDateSafe(v.registrationDate), v.rcStatus, v.fuelConsumptionRate,
                formatDateSafe(v.fitnessExpiry), formatDateSafe(v.taxExpiry),
                formatDateSafe(v.insuranceExpiry), formatDateSafe(v.pollutionExpiry)
            ]);
        });

        // Hired Vehicles
        const hiredSheet = workbook.addWorksheet('Hired Vehicles');
        const hiredHeaders = ["Registration Number", "Model", "Agreement Validity", "Vehicle Class", "Registration Date", "RC Status", "Hire Charges", "Fuel Consumption"];
        hiredSheet.addRow(hiredHeaders).font = { bold: true };
        hiredVehicles.forEach(v => {
            hiredSheet.addRow([
                v.registrationNumber, v.model, formatDateSafe(v.agreementValidity),
                v.vehicleClass, formatDateSafe(v.registrationDate), v.rcStatus,
                v.hireCharges, v.fuelConsumption
            ]);
        });
        
        // Rig/Compressor Units
        const rigSheet = workbook.addWorksheet('Rig and Compressor');
        const rigHeaders = ["Type of Rig Unit", "Registration Number", "Compressor Details", "Fuel Consumption", "Remarks"];
        rigSheet.addRow(rigHeaders).font = { bold: true };
        rigCompressors.forEach(u => {
            rigSheet.addRow([u.typeOfRigUnit, u.registrationNumber, u.compressorDetails, u.fuelConsumption, u.remarks]);
        });

        // Auto-width columns
        [deptSheet, hiredSheet, rigSheet].forEach(sheet => {
            sheet.columns.forEach(column => {
                let maxLength = 0;
                column.eachCell!({ includeEmpty: true }, cell => {
                    const columnLength = cell.value ? cell.value.toString().length : 10;
                    if (columnLength > maxLength) {
                        maxLength = columnLength;
                    }
                });
                column.width = maxLength < 15 ? 15 : maxLength + 2;
            });
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `GWD_Vehicles_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);

        toast({ title: "Excel Exported", description: "Vehicle data has been downloaded." });
    }, [departmentVehicles, hiredVehicles, rigCompressors]);


    return (
        <div className="space-y-6">
            <Card>
                <CardContent className="p-4">
                     {canEdit && (
                        <div className="flex justify-center items-center space-x-2 mb-4 p-4 border-b">
                            <Button onClick={() => handleAddOrEdit('department', null)}><PlusCircle className="h-4 w-4 mr-2"/> Add Department Vehicle</Button>
                            <Button onClick={() => handleAddOrEdit('hired', null)}><PlusCircle className="h-4 w-4 mr-2"/> Add Hired Vehicle</Button>
                            <Button onClick={() => handleAddOrEdit('rig', null)}><PlusCircle className="h-4 w-4 mr-2"/> Add Rig/Compressor</Button>
                            <Button variant="outline" onClick={handleExportExcel}><FileDown className="h-4 w-4 mr-2" /> Export Excel</Button>
                        </div>
                    )}
                    <Tabs defaultValue="department">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="department">Department Vehicles</TabsTrigger>
                            <TabsTrigger value="hired">Hired Vehicles</TabsTrigger>
                            <TabsTrigger value="rigs">Rig & Compressor</TabsTrigger>
                        </TabsList>
                        
                        {isLoading ? (
                             <div className="flex justify-center items-center h-64">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                             </div>
                        ) : (
                            <>
                                <TabsContent value="department" className="mt-4">
                                    <DepartmentVehicleTable 
                                        data={departmentVehicles} 
                                        onEdit={(v) => handleAddOrEdit('department', v)} 
                                        onDelete={useDeleteDepartmentVehicle()} 
                                        canEdit={canEdit}
                                    />
                                </TabsContent>
                                <TabsContent value="hired" className="mt-4">
                                    <HiredVehicleTable 
                                        data={hiredVehicles} 
                                        onEdit={(v) => handleAddOrEdit('hired', v)} 
                                        onDelete={useDeleteHiredVehicle()}
                                        canEdit={canEdit}
                                    />
                                </TabsContent>
                                <TabsContent value="rigs" className="mt-4">
                                    <RigCompressorTable 
                                        data={rigCompressors} 
                                        onEdit={(v) => handleAddOrEdit('rig', v)} 
                                        onDelete={useDeleteRigCompressor()}
                                        canEdit={canEdit}
                                    />
                                </TabsContent>
                            </>
                        )}
                    </Tabs>
                </CardContent>
            </Card>

            <Dialog open={isDepartmentDialogOpen} onOpenChange={setIsDepartmentDialogOpen}>
                <DialogContent className="max-w-4xl">
                    <DepartmentVehicleForm 
                        initialData={editingDepartmentVehicle}
                        onSubmit={editingDepartmentVehicle ? useUpdateDepartmentVehicle() : useAddDepartmentVehicle()}
                        onClose={() => setIsDepartmentDialogOpen(false)}
                    />
                </DialogContent>
            </Dialog>
            <Dialog open={isHiredDialogOpen} onOpenChange={setIsHiredDialogOpen}>
                <DialogContent className="max-w-4xl">
                     <HiredVehicleForm 
                        initialData={editingHiredVehicle}
                        onSubmit={editingHiredVehicle ? useUpdateHiredVehicle() : useAddHiredVehicle()}
                        onClose={() => setIsHiredDialogOpen(false)}
                    />
                </DialogContent>
            </Dialog>
            <Dialog open={isRigDialogOpen} onOpenChange={setIsRigDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <RigCompressorForm
                        initialData={editingRigCompressor}
                        onSubmit={editingRigCompressor ? useUpdateRigCompressor() : useAddRigCompressor()}
                        onClose={() => setIsRigDialogOpen(false)}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}
