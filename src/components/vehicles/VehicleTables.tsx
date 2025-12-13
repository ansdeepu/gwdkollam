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
import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../ui/dialog";
import { ScrollArea } from "../ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

interface CommonTableProps {
    canEdit: boolean;
    onView: (vehicle: any) => void;
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
    if (!d) return '-';
    const date = safeParseDate(d);
    return date ? format(date, 'dd/MM/yyyy') : '-';
};

const DetailRow = ({ label, value }: { label: string, value?: string | number | null }) => {
    if (value === null || value === undefined || value === '') return null;
    return (
        <div className="grid grid-cols-2 text-sm">
            <span className="text-muted-foreground">{label}:</span>
            <span className="font-semibold">{value}</span>
        </div>
    );
};

export function VehicleViewDialog({ vehicle, onClose }: { vehicle: DepartmentVehicle | HiredVehicle | RigCompressor | null, onClose: () => void }) {
    if (!vehicle) return null;

    let title = "Vehicle Details";
    let details: React.ReactNode;

    if ('registrationNumber' in vehicle) { // Department or Hired Vehicle
        title = vehicle.registrationNumber;
        const v = vehicle as DepartmentVehicle | HiredVehicle;
        details = (
             <div className="space-y-4">
                <DetailRow label="Model" value={v.model} />
                <DetailRow label="Vehicle Class" value={v.vehicleClass} />
                <DetailRow label="Registration Date" value={formatDateSafe(v.registrationDate)} />
                <DetailRow label="RC Status" value={v.rcStatus} />
                {'typeOfVehicle' in v && <DetailRow label="Type of Vehicle" value={v.typeOfVehicle} />}
                {'fuelConsumptionRate' in v && <DetailRow label="Fuel Consumption" value={v.fuelConsumptionRate} />}
                {'hireCharges' in v && <DetailRow label="Hire Charges" value={v.hireCharges?.toLocaleString('en-IN')} />}
                {'agreementValidity' in v && <DetailRow label="Agreement Validity" value={formatDateSafe(v.agreementValidity)} />}
                
                <div className="pt-4 mt-4 border-t">
                    <h4 className="font-semibold text-primary mb-2">Certificates</h4>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                        <DetailRow label="Fitness Expiry" value={formatDateSafe(v.fitnessExpiry)} />
                        <DetailRow label="Tax Expiry" value={formatDateSafe(v.taxExpiry)} />
                        <DetailRow label="Insurance Expiry" value={formatDateSafe(v.insuranceExpiry)} />
                        <DetailRow label="Pollution Expiry" value={formatDateSafe(v.pollutionExpiry)} />
                        {'fuelTestExpiry' in v && <DetailRow label="Fuel Test Expiry" value={formatDateSafe(v.fuelTestExpiry)} />}
                        {'permitExpiry' in v && <DetailRow label="Permit Expiry" value={formatDateSafe(v.permitExpiry)} />}
                    </div>
                </div>
            </div>
        );
    } else { // RigCompressor
        title = (vehicle as RigCompressor).typeOfRigUnit;
        const u = vehicle as RigCompressor;
        details = (
            <div className="space-y-4">
                <DetailRow label="Type of Rig Unit" value={u.typeOfRigUnit} />
                <DetailRow label="Status" value={u.status} />
                <DetailRow label="Fuel Consumption" value={u.fuelConsumption} />
                <DetailRow label="Rig Vehicle Reg. No" value={u.rigVehicleRegNo} />
                <DetailRow label="Compressor Vehicle Reg. No" value={u.compressorVehicleRegNo} />
                <DetailRow label="Supporting Vehicle Reg. No" value={u.supportingVehicleRegNo} />
                <DetailRow label="Compressor Details" value={u.compressorDetails} />
                <DetailRow label="Remarks" value={u.remarks} />
            </div>
        );
    }

    return (
        <DialogContent className="max-w-2xl">
            <DialogHeader>
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription>
                    A detailed overview of the selected vehicle or unit.
                </DialogDescription>
            </DialogHeader>
            <div className="p-6 pt-0">
                {details}
            </div>
            <DialogFooter>
                <Button onClick={onClose} variant="outline">Close</Button>
            </DialogFooter>
        </DialogContent>
    );
}

export function DepartmentVehicleTable({ data, onEdit, onDelete, canEdit, onView }: DepartmentVehicleTableProps) {
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
                        <TableHead className="p-2 text-sm">Sl. No</TableHead>
                        <TableHead className="p-2 text-sm min-w-[200px]">Reg. No</TableHead>
                        <TableHead className="p-2 text-sm">Fitness</TableHead>
                        <TableHead className="p-2 text-sm">Tax</TableHead>
                        <TableHead className="p-2 text-sm">Insurance</TableHead>
                        <TableHead className="p-2 text-sm">Pollution</TableHead>
                        <TableHead className="p-2 text-sm">Fuel Test</TableHead>
                        <TableHead className="p-2 text-sm whitespace-normal">Fuel Consumption Rate</TableHead>
                        {canEdit && <TableHead className="text-right p-2 text-sm">Actions</TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {(data || []).map((v, index) => (
                        <TableRow key={v.id}>
                            <TableCell className="p-2 text-sm">{index + 1}</TableCell>
                            <TableCell className="p-2 text-sm font-medium whitespace-normal break-words">
                                <button onClick={() => onView(v)} className="text-left hover:underline">
                                    <div className="flex flex-col">
                                        <span className="font-bold">{v.registrationNumber}</span>
                                        <span className="text-muted-foreground">{v.model}</span>
                                        <span className="text-muted-foreground">{v.typeOfVehicle}</span>
                                        <span className="text-muted-foreground">{v.vehicleClass}</span>
                                        <span className="text-muted-foreground">Reg. Date: {formatDateSafe(v.registrationDate)}</span>
                                    </div>
                                </button>
                            </TableCell>
                            <TableCell className="p-2 text-sm">{formatDateSafe(v.fitnessExpiry)}</TableCell>
                            <TableCell className="p-2 text-sm">{formatDateSafe(v.taxExpiry)}</TableCell>
                            <TableCell className="p-2 text-sm">{formatDateSafe(v.insuranceExpiry)}</TableCell>
                            <TableCell className="p-2 text-sm">{formatDateSafe(v.pollutionExpiry)}</TableCell>
                            <TableCell className="p-2 text-sm">{formatDateSafe(v.fuelTestExpiry)}</TableCell>
                            <TableCell className="p-2 text-sm">{v.fuelConsumptionRate || '-'}</TableCell>
                            {canEdit && (
                                <TableCell className="text-right p-1">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" onClick={() => onEdit(v)}><Edit className="h-4 w-4"/></Button>
                                        </TooltipTrigger>
                                        <TooltipContent><p>Edit</p></TooltipContent>
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

export function HiredVehicleTable({ data, onEdit, onDelete, canEdit, onView }: HiredVehicleTableProps) {
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
                        <TableHead className="p-2 text-sm">Sl. No</TableHead>
                        <TableHead className="p-2 text-sm min-w-[200px]">Reg. No</TableHead>
                        <TableHead className="p-2 text-sm">Agreement Validity</TableHead>
                        <TableHead className="p-2 text-sm">Hire Charges</TableHead>
                        <TableHead className="p-2 text-sm">Fitness</TableHead>
                        <TableHead className="p-2 text-sm">Tax</TableHead>
                        <TableHead className="p-2 text-sm">Insurance</TableHead>
                        <TableHead className="p-2 text-sm">Pollution</TableHead>
                        <TableHead className="p-2 text-sm">Permit</TableHead>
                        {canEdit && <TableHead className="text-right p-2 text-sm">Actions</TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {(data || []).map((v, index) => (
                        <TableRow key={v.id}>
                            <TableCell className="p-2 text-sm">{index + 1}</TableCell>
                            <TableCell className="p-2 text-sm font-medium whitespace-normal break-words">
                                <button onClick={() => onView(v)} className="text-left hover:underline">
                                    <div className="flex flex-col">
                                        <span className="font-bold">{v.registrationNumber}</span>
                                        <span className="text-muted-foreground">{v.model}</span>
                                        <span className="text-muted-foreground">{v.vehicleClass}</span>
                                        <span className="text-muted-foreground">Reg. Date: {formatDateSafe(v.registrationDate)}</span>
                                    </div>
                                </button>
                            </TableCell>
                            <TableCell className="p-2 text-sm">{formatDateSafe(v.agreementValidity)}</TableCell>
                            <TableCell className="p-2 text-sm">{v.hireCharges?.toLocaleString('en-IN') || '-'}</TableCell>
                            <TableCell className="p-2 text-sm">{formatDateSafe(v.fitnessExpiry)}</TableCell>
                            <TableCell className="p-2 text-sm">{formatDateSafe(v.taxExpiry)}</TableCell>
                            <TableCell className="p-2 text-sm">{formatDateSafe(v.insuranceExpiry)}</TableCell>
                            <TableCell className="p-2 text-sm">{formatDateSafe(v.pollutionExpiry)}</TableCell>
                            <TableCell className="p-2 text-sm">{formatDateSafe(v.permitExpiry)}</TableCell>
                             {canEdit && (
                                <TableCell className="text-right p-1">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" onClick={() => onEdit(v)}><Edit className="h-4 w-4"/></Button>
                                        </TooltipTrigger>
                                        <TooltipContent><p>Edit</p></TooltipContent>
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

export function RigCompressorTable({ data, onEdit, onDelete, canEdit, onView }: RigCompressorTableProps) {
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
                        <TableHead className="p-2 text-sm whitespace-normal">Sl. No</TableHead>
                        <TableHead className="p-2 text-sm whitespace-normal">Type of Rig Unit</TableHead>
                        <TableHead className="p-2 text-sm whitespace-normal">Rig Vehicle Reg. No</TableHead>
                        <TableHead className="p-2 text-sm whitespace-normal">Compressor Vehicle Reg. No</TableHead>
                        <TableHead className="p-2 text-sm whitespace-normal">Supporting Vehicle Reg. No</TableHead>
                        <TableHead className="p-2 text-sm whitespace-normal">Compressor Details</TableHead>
                        {canEdit && <TableHead className="text-right p-2 text-sm whitespace-normal">Actions</TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {(data || []).map((u, index) => (
                        <TableRow key={u.id}>
                            <TableCell className="p-2 text-sm">{index + 1}</TableCell>
                            <TableCell className="p-2 text-sm">
                                <button onClick={() => onView(u)} className="text-left hover:underline font-bold">
                                    {u.typeOfRigUnit || '-'}
                                </button>
                            </TableCell>
                            <TableCell className="p-2 text-sm">{u.rigVehicleRegNo || '-'}</TableCell>
                            <TableCell className="p-2 text-sm">{u.compressorVehicleRegNo || '-'}</TableCell>
                            <TableCell className="p-2 text-sm">{u.supportingVehicleRegNo || '-'}</TableCell>
                            <TableCell className="p-2 text-sm">{u.compressorDetails || '-'}</TableCell>
                            {canEdit && (
                                <TableCell className="text-right p-1">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" onClick={() => onEdit(u)}><Edit className="h-4 w-4"/></Button>
                                        </TooltipTrigger>
                                        <TooltipContent><p>Edit</p></TooltipContent>
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
