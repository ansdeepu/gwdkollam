
// src/app/dashboard/vehicles/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { usePageHeader } from '@/hooks/usePageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Loader2, PlusCircle, Truck, FileDown } from 'lucide-react';
import type { DepartmentVehicle, HiredVehicle, RigCompressor } from '@/lib/schemas';
import { DepartmentVehicleForm, HiredVehicleForm, RigCompressorForm } from '@/components/vehicles/VehicleForms';
import { useVehicles } from '@/hooks/useVehicles';
import { useAuth } from '@/hooks/useAuth';
import ExcelJS from 'exceljs';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { DepartmentVehicleTable, HiredVehicleTable, RigCompressorTable } from '@/components/vehicles/VehicleTables';

const safeParseDate = (dateValue: any): Date | null => {
  if (!dateValue) return null;
  if (dateValue instanceof Date) return dateValue;
  if (typeof dateValue === 'object' && dateValue !== null && typeof (dateValue as any).seconds === 'number') {
    return new Date((dateValue as any).seconds * 1000);
  }
  if (typeof dateValue === 'string') {
    const parsed = new Date(dateValue);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return null;
};

const formatDateSafe = (d: any): string => {
    if (!d) return 'N/A';
    const date = safeParseDate(d);
    return date ? format(date, 'dd/MM/yyyy') : 'N/A';
};


export default function VehiclesPage() {
    const { setHeader } = usePageHeader();
    const { user } = useAuth();
    const canEdit = user?.role === 'editor';

    const {
        departmentVehicles, addDepartmentVehicle, updateDepartmentVehicle, deleteDepartmentVehicle,
        hiredVehicles, addHiredVehicle, updateHiredVehicle, deleteHiredVehicle,
        rigCompressors, addRigCompressor, updateRigCompressor, deleteRigCompressor,
        isLoading
    } = useVehicles();

    const [isDepartmentDialogOpen, setIsDepartmentDialogOpen] = useState(false);
    const [isHiredDialogOpen, setIsHiredDialogOpen] = useState(false);
    const [isRigDialogOpen, setIsRigDialogOpen] = useState(false);

    const [editingDepartmentVehicle, setEditingDepartmentVehicle] = useState<DepartmentVehicle | null>(null);
    const [editingHiredVehicle, setEditingHiredVehicle] = useState<HiredVehicle | null>(null);
    const [editingRigCompressor, setEditingRigCompressor] = useState<RigCompressor | null>(null);
    
    useEffect(() => {
        setHeader("Vehicle & Rig Management", "Manage department, hired, and rig/compressor vehicles and units.");
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
    
    const handleDepartmentFormSubmit = async (data: DepartmentVehicle) => {
        if (editingDepartmentVehicle) {
            await updateDepartmentVehicle(data);
        } else {
            await addDepartmentVehicle(data);
        }
    };

    const handleHiredFormSubmit = async (data: HiredVehicle) => {
        if (editingHiredVehicle) {
            await updateHiredVehicle(data);
        } else {
            await addHiredVehicle(data);
        }
    };

    const handleRigCompressorFormSubmit = async (data: RigCompressor) => {
        if (editingRigCompressor) {
            await updateRigCompressor(data);
        } else {
            await addRigCompressor(data);
        }
    };

    const handleExportExcel = useCallback(async (
        dataType: 'department' | 'hired' | 'rig'
    ) => {
        const workbook = new ExcelJS.Workbook();
        let data, headers, sheetName, fileNamePrefix;

        switch (dataType) {
            case 'department':
                data = departmentVehicles;
                headers = ["Registration Number", "Model", "Type of Vehicle", "Vehicle Class", "Registration Date", "RC Status", "Fuel Consumption Rate", "Fitness Expiry", "Tax Expiry", "Insurance Expiry", "Pollution Expiry", "Fuel Test Expiry"];
                sheetName = 'Department Vehicles';
                fileNamePrefix = 'GWD_Department_Vehicles';
                break;
            case 'hired':
                data = hiredVehicles;
                headers = ["Registration Number", "Model", "Agreement Validity", "Vehicle Class", "Registration Date", "RC Status", "Hire Charges", "Fuel Consumption"];
                sheetName = 'Hired Vehicles';
                fileNamePrefix = 'GWD_Hired_Vehicles';
                break;
            case 'rig':
                data = rigCompressors;
                headers = ["Type of Rig Unit", "Registration Number", "Compressor Details", "Fuel Consumption", "Remarks"];
                sheetName = 'Rig and Compressor';
                fileNamePrefix = 'GWD_Rig_Compressor';
                break;
        }

        const sheet = workbook.addWorksheet(sheetName);
        sheet.addRow(headers).font = { bold: true };

        data.forEach(item => {
            const row = headers.map(header => {
                const key = header.toLowerCase().replace(/ & /g, 'And').replace(/ /g, '');
                let value = (item as any)[Object.keys(item).find(k => k.toLowerCase().replace(/ /g, '') === key) || ''];
                if (header.toLowerCase().includes('date') || header.toLowerCase().includes('validity') || header.toLowerCase().includes('expiry')) {
                    value = formatDateSafe(value);
                }
                return value;
            });
            sheet.addRow(row);
        });

        // Auto-width columns
        sheet.columns.forEach(column => {
            let maxLength = 0;
            if(column.eachCell){
                column.eachCell({ includeEmpty: true }, cell => {
                    const columnLength = cell.value ? cell.value.toString().length : 10;
                    if (columnLength > maxLength) {
                        maxLength = columnLength;
                    }
                });
            }
            column.width = maxLength < 15 ? 15 : maxLength + 2;
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${fileNamePrefix}_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);

        toast({ title: "Excel Exported", description: `${sheetName} data has been downloaded.` });
    }, [departmentVehicles, hiredVehicles, rigCompressors, toast]);


    return (
        <div className="space-y-6">
            {isLoading ? (
                 <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                 </div>
            ) : (
                <div className="space-y-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Department Vehicles</CardTitle>
                             <div className="flex items-center gap-2">
                                {canEdit && <Button onClick={() => handleAddOrEdit('department', null)}><PlusCircle className="h-4 w-4 mr-2"/> Add</Button>}
                                <Button variant="outline" onClick={() => handleExportExcel('department')}><FileDown className="h-4 w-4 mr-2" /> Export</Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <DepartmentVehicleTable 
                                data={departmentVehicles} 
                                onEdit={(v) => handleAddOrEdit('department', v)} 
                                onDelete={deleteDepartmentVehicle} 
                                canEdit={canEdit}
                            />
                        </CardContent>
                    </Card>

                    <Card>
                         <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Hired Vehicles</CardTitle>
                             <div className="flex items-center gap-2">
                                {canEdit && <Button onClick={() => handleAddOrEdit('hired', null)}><PlusCircle className="h-4 w-4 mr-2"/> Add</Button>}
                                <Button variant="outline" onClick={() => handleExportExcel('hired')}><FileDown className="h-4 w-4 mr-2" /> Export</Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <HiredVehicleTable 
                                data={hiredVehicles} 
                                onEdit={(v) => handleAddOrEdit('hired', v)} 
                                onDelete={deleteHiredVehicle}
                                canEdit={canEdit}
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Rig & Compressor Units</CardTitle>
                             <div className="flex items-center gap-2">
                                {canEdit && <Button onClick={() => handleAddOrEdit('rig', null)}><PlusCircle className="h-4 w-4 mr-2"/> Add</Button>}
                                <Button variant="outline" onClick={() => handleExportExcel('rig')}><FileDown className="h-4 w-4 mr-2" /> Export</Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <RigCompressorTable 
                                data={rigCompressors} 
                                onEdit={(v) => handleAddOrEdit('rig', v)} 
                                onDelete={deleteRigCompressor}
                                canEdit={canEdit}
                            />
                        </CardContent>
                    </Card>
                </div>
            )}

            <Dialog open={isDepartmentDialogOpen} onOpenChange={setIsDepartmentDialogOpen}>
                <DialogContent className="max-w-4xl">
                    <DepartmentVehicleForm 
                        initialData={editingDepartmentVehicle}
                        onFormSubmit={handleDepartmentFormSubmit}
                        onClose={() => setIsDepartmentDialogOpen(false)}
                    />
                </DialogContent>
            </Dialog>
            <Dialog open={isHiredDialogOpen} onOpenChange={setIsHiredDialogOpen}>
                <DialogContent className="max-w-4xl">
                     <HiredVehicleForm 
                        initialData={editingHiredVehicle}
                        onFormSubmit={handleHiredFormSubmit}
                        onClose={() => setIsHiredDialogOpen(false)}
                    />
                </DialogContent>
            </Dialog>
            <Dialog open={isRigDialogOpen} onOpenChange={setIsRigDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <RigCompressorForm
                        initialData={editingRigCompressor}
                        onFormSubmit={handleRigCompressorFormSubmit}
                        onClose={() => setIsRigDialogOpen(false)}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}
