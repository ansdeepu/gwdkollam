// src/components/vehicles/VehicleTables.tsx
"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Eye } from "lucide-react";
import type { DepartmentVehicle, HiredVehicle, RigCompressor } from "@/lib/schemas";
import { format, isValid } from "date-fns";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useState } from "react";
import { Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

interface CommonTableProps {
    canEdit: boolean;
}
interface DepartmentVehicleTableProps extends CommonTableProps {
    data: DepartmentVehicle[];
    onEdit: (vehicle: DepartmentVehicle) => void;
    onDelete: (id: string, name: string) => Promise<void>;
}
interface HiredVehicleTableProps extends CommonTableProps {
    data: HiredVehicle[];
    onEdit: (vehicle: HiredVehicle) => void;
    onDelete: (id: string, name: string) => Promise<void>;
}
interface RigCompressorTableProps extends CommonTableProps {
    data: RigCompressor[];
    onEdit: (unit: RigCompressor) => void;
    onDelete: (id: string, name: string) => Promise<void>;
}

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

export function DepartmentVehicleTable({ data, onEdit, onDelete, canEdit }: DepartmentVehicleTableProps) {
    const [itemToDelete, setItemToDelete] = useState<DepartmentVehicle | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (!itemToDelete) return;
        setIsDeleting(true);
        await onDelete(itemToDelete.id!, itemToDelete.registrationNumber);
        setIsDeleting(false);
        setItemToDelete(null);
    };

    return (
        <TooltipProvider>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="p-2 text-xs">Sl. No</TableHead>
                        <TableHead className="p-2 text-xs min-w-[200px]">Reg. No</TableHead>
                        <TableHead className="p-2 text-xs">Fitness</TableHead>
                        <TableHead className="p-2 text-xs">Tax</TableHead>
                        <TableHead className="p-2 text-xs">Insurance</TableHead>
                        <TableHead className="p-2 text-xs">Pollution</TableHead>
                        <TableHead className="p-2 text-xs">Fuel Test</TableHead>
                        {canEdit && <TableHead className="text-right p-2 text-xs">Actions</TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {(data || []).map((v, index) => (
                        <TableRow key={v.id}>
                            <TableCell className="p-2 text-xs">{index + 1}</TableCell>
                            <TableCell className="p-2 text-xs font-medium whitespace-normal break-words">
                                <div className="flex flex-col">
                                    <span>{v.registrationNumber}</span>
                                    <span className="text-muted-foreground">{v.model}</span>
                                    <span className="text-muted-foreground">{v.typeOfVehicle}</span>
                                    <span className="text-muted-foreground">{v.vehicleClass}</span>
                                </div>
                            </TableCell>
                            <TableCell className="p-2 text-xs">{formatDateSafe(v.fitnessExpiry)}</TableCell>
                            <TableCell className="p-2 text-xs">{formatDateSafe(v.taxExpiry)}</TableCell>
                            <TableCell className="p-2 text-xs">{formatDateSafe(v.insuranceExpiry)}</TableCell>
                            <TableCell className="p-2 text-xs">{formatDateSafe(v.pollutionExpiry)}</TableCell>
                            <TableCell className="p-2 text-xs">{formatDateSafe(v.fuelTestExpiry)}</TableCell>
                            {canEdit && (
                                <TableCell className="text-right p-1">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" onClick={() => onEdit(v)}><Eye className="h-4 w-4"/></Button>
                                        </TooltipTrigger>
                                        <TooltipContent><p>View / Edit</p></TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setItemToDelete(v)}><Trash2 className="h-4 w-4"/></Button>
                                        </TooltipTrigger>
                                        <TooltipContent><p>Delete</p></TooltipContent>
                                    </Tooltip>
                                </TableCell>
                            )}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            <ConfirmDeleteDialog isOpen={!!itemToDelete} onOpenChange={() => setItemToDelete(null)} onConfirm={handleDelete} itemName={itemToDelete?.registrationNumber} isDeleting={isDeleting} />
        </TooltipProvider>
    );
}

export function HiredVehicleTable({ data, onEdit, onDelete, canEdit }: HiredVehicleTableProps) {
     const [itemToDelete, setItemToDelete] = useState<HiredVehicle | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (!itemToDelete) return;
        setIsDeleting(true);
        await onDelete(itemToDelete.id!, itemToDelete.registrationNumber);
        setIsDeleting(false);
        setItemToDelete(null);
    };

    return (
        <TooltipProvider>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="p-2 text-xs">Sl. No</TableHead>
                        <TableHead className="p-2 text-xs">Reg. No</TableHead>
                        <TableHead className="p-2 text-xs">Model</TableHead>
                        <TableHead className="p-2 text-xs">Agreement Validity</TableHead>
                        <TableHead className="p-2 text-xs">Hire Charges</TableHead>
                        {canEdit && <TableHead className="text-right p-2 text-xs">Actions</TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {(data || []).map((v, index) => (
                        <TableRow key={v.id}>
                            <TableCell className="p-2 text-xs">{index + 1}</TableCell>
                            <TableCell className="p-2 text-xs">{v.registrationNumber}</TableCell>
                            <TableCell className="p-2 text-xs">{v.model}</TableCell>
                            <TableCell className="p-2 text-xs">{formatDateSafe(v.agreementValidity)}</TableCell>
                            <TableCell className="p-2 text-xs">{v.hireCharges}</TableCell>
                             {canEdit && (
                                <TableCell className="text-right p-1">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" onClick={() => onEdit(v)}><Eye className="h-4 w-4"/></Button>
                                        </TooltipTrigger>
                                        <TooltipContent><p>View / Edit</p></TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setItemToDelete(v)}><Trash2 className="h-4 w-4"/></Button>
                                        </TooltipTrigger>
                                        <TooltipContent><p>Delete</p></TooltipContent>
                                    </Tooltip>
                                </TableCell>
                            )}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            <ConfirmDeleteDialog isOpen={!!itemToDelete} onOpenChange={() => setItemToDelete(null)} onConfirm={handleDelete} itemName={itemToDelete?.registrationNumber} isDeleting={isDeleting} />
        </TooltipProvider>
    );
}

export function RigCompressorTable({ data, onEdit, onDelete, canEdit }: RigCompressorTableProps) {
     const [itemToDelete, setItemToDelete] = useState<RigCompressor | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (!itemToDelete) return;
        setIsDeleting(true);
        await onDelete(itemToDelete.id!, itemToDelete.typeOfRigUnit);
        setIsDeleting(false);
        setItemToDelete(null);
    };

    return (
        <TooltipProvider>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="p-2 text-xs whitespace-normal">Sl. No</TableHead>
                        <TableHead className="p-2 text-xs whitespace-normal">Type of Rig Unit</TableHead>
                        <TableHead className="p-2 text-xs whitespace-normal">Status</TableHead>
                        <TableHead className="p-2 text-xs whitespace-normal">Rig Vehicle Reg. No</TableHead>
                        <TableHead className="p-2 text-xs whitespace-normal">Compressor Vehicle Reg. No</TableHead>
                        <TableHead className="p-2 text-xs whitespace-normal">Supporting Vehicle Reg. No</TableHead>
                        <TableHead className="p-2 text-xs whitespace-normal">Compressor Details</TableHead>
                        {canEdit && <TableHead className="text-right p-2 text-xs whitespace-normal">Actions</TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {(data || []).map((u, index) => (
                        <TableRow key={u.id}>
                            <TableCell className="p-2 text-xs">{index + 1}</TableCell>
                            <TableCell className="p-2 text-xs">{u.typeOfRigUnit}</TableCell>
                            <TableCell className="p-2 text-xs">{u.status}</TableCell>
                            <TableCell className="p-2 text-xs">{u.rigVehicleRegNo}</TableCell>
                            <TableCell className="p-2 text-xs">{u.compressorVehicleRegNo}</TableCell>
                            <TableCell className="p-2 text-xs">{u.supportingVehicleRegNo}</TableCell>
                            <TableCell className="p-2 text-xs">{u.compressorDetails}</TableCell>
                            {canEdit && (
                                <TableCell className="text-right p-1">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" onClick={() => onEdit(u)}><Eye className="h-4 w-4"/></Button>
                                        </TooltipTrigger>
                                        <TooltipContent><p>View / Edit</p></TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setItemToDelete(u)}><Trash2 className="h-4 w-4"/></Button>
                                        </TooltipTrigger>
                                        <TooltipContent><p>Delete</p></TooltipContent>
                                    </Tooltip>
                                </TableCell>
                            )}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            <ConfirmDeleteDialog isOpen={!!itemToDelete} onOpenChange={() => setItemToDelete(null)} onConfirm={handleDelete} itemName={itemToDelete?.typeOfRigUnit} isDeleting={isDeleting} />
        </TooltipProvider>
    );
}

const ConfirmDeleteDialog = ({ isOpen, onOpenChange, onConfirm, itemName, isDeleting }: { isOpen: boolean, onOpenChange: (open: boolean) => void, onConfirm: () => void, itemName?: string, isDeleting: boolean }) => (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action will permanently delete <strong>{itemName || 'this item'}</strong>. This cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onConfirm} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Delete
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
);
