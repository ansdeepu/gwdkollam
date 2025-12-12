// src/app/dashboard/vehicles/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { usePageHeader } from '@/hooks/usePageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Loader2, PlusCircle, Truck } from 'lucide-react';
import { DepartmentVehicleSchema, HiredVehicleSchema, RigCompressorSchema } from '@/lib/schemas';
import type { DepartmentVehicle, HiredVehicle, RigCompressor } from '@/lib/schemas';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from '@/components/ui/form';
import { DepartmentVehicleForm, HiredVehicleForm, RigCompressorForm } from '@/components/vehicles/VehicleForms';
import { DepartmentVehicleTable, HiredVehicleTable, RigCompressorTable } from '@/components/vehicles/VehicleTables';
import { useVehicles } from '@/hooks/useVehicles';
import { useAuth } from '@/hooks/useAuth';

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

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Truck className="h-5 w-5 text-primary"/>Vehicle & Unit Management</CardTitle>
                    <CardDescription>Oversee all vehicles and heavy machinery units.</CardDescription>
                </CardHeader>
                <CardContent>
                    {canEdit && (
                        <div className="flex justify-end space-x-2 mb-4">
                            <Button onClick={() => handleAddOrEdit('department', null)}><PlusCircle className="h-4 w-4 mr-2"/> Add Department Vehicle</Button>
                            <Button onClick={() => handleAddOrEdit('hired', null)}><PlusCircle className="h-4 w-4 mr-2"/> Add Hired Vehicle</Button>
                            <Button onClick={() => handleAddOrEdit('rig', null)}><PlusCircle className="h-4 w-4 mr-2"/> Add Rig/Compressor</Button>
                        </div>
                    )}
                    <Tabs defaultValue="department">
                        <TabsList>
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
                                <TabsContent value="department">
                                    <DepartmentVehicleTable 
                                        data={departmentVehicles} 
                                        onEdit={(v) => handleAddOrEdit('department', v)} 
                                        onDelete={useDeleteDepartmentVehicle()} 
                                        canEdit={canEdit}
                                    />
                                </TabsContent>
                                <TabsContent value="hired">
                                    <HiredVehicleTable 
                                        data={hiredVehicles} 
                                        onEdit={(v) => handleAddOrEdit('hired', v)} 
                                        onDelete={useDeleteHiredVehicle()}
                                        canEdit={canEdit}
                                    />
                                </TabsContent>
                                <TabsContent value="rigs">
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
