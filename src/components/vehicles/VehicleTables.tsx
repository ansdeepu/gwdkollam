// src/components/vehicles/VehicleTables.tsx
"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Eye, Building, Truck, AlertTriangle } from "lucide-react";
import type { DepartmentVehicle, HiredVehicle, RigCompressor } from "@/lib/schemas";
import { format, isValid, isBefore, addDays } from "date-fns";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useState } from "react";
import { Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogDescription, DialogTitle, DialogFooter } from "../ui/dialog";
import { ScrollArea } from "../ui/scroll-area";
import { Card, CardContent } from "../ui/card";
import { cn } from "@/lib/utils";
import { Separator } from "../ui/separator";
import Image from "next/image";

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

const getExpiryStatus = (expiryDate: Date | null): { status: 'Expired' | 'Expiring Soon' | 'Valid'; colorClass: string; } => {
    if (!expiryDate || !isValid(expiryDate)) {
        return { status: 'Valid', colorClass: 'text-gray-500' };
    }
    const today = new Date();
    const thirtyDaysFromNow = addDays(today, 30);

    if (isBefore(expiryDate, today)) {
        return { status: 'Expired', colorClass: 'text-destructive font-bold' };
    }
    if (isBefore(expiryDate, thirtyDaysFromNow)) {
        return { status: 'Expiring Soon', colorClass: 'text-orange-500 font-semibold' };
    }
    return { status: 'Valid', colorClass: 'text-gray-700' };
};


const DetailRow = ({ label, value }: { label: string, value?: string | number | null }) => {
    if (value === null || value === undefined || value === '') {
        return (
            <div>
                <span className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
                <span className="block font-bold text-xs text-gray-800">-</span>
            </div>
        );
    }
    const displayValue = String(value);
    return (
        <div>
            <span className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
            <span className="block font-bold text-xs text-gray-800">{displayValue}</span>
        </div>
    );
};

const CertificateRow = ({ label, date }: { label: string, date?: any }) => {
    const expiryDate = safeParseDate(date);
    const { status, colorClass } = getExpiryStatus(expiryDate);

    return (
        <div className="flex justify-between items-center text-sm py-1">
            <span className="font-medium text-gray-700">{label}</span>
            <div className="text-right">
                <span className={cn("font-mono font-semibold", colorClass)}>
                    {formatDateSafe(date)}
                </span>
            </div>
        </div>
    );
};

export function VehicleViewDialog({ vehicle, onClose }: { vehicle: DepartmentVehicle | HiredVehicle | RigCompressor | null, onClose: () => void }) {
    if (!vehicle) return null;

    let title = "Vehicle Details";
    let details: React.ReactNode;

    if ('registrationNumber' in vehicle) { // Department or Hired Vehicle
        const v = vehicle as DepartmentVehicle | HiredVehicle;
        title = `Details for ${v.registrationNumber}`;
        details = (
             <>
                <DialogHeader className="sr-only">
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>Details for {title}.</DialogDescription>
                </DialogHeader>
                <div className="relative font-sans text-sm bg-white rounded-lg shadow-lg p-4 border border-gray-300 w-full max-w-2xl mx-auto my-8">
                    {/* Header */}
                    <div className="text-center mb-2">
                        <h1 className="font-bold text-base tracking-wider">CERTIFICATE OF REGISTRATION</h1>
                        <p className="text-xs font-semibold text-gray-500">GROUND WATER DEPARTMENT, KOLLAM</p>
                    </div>

                    {/* Main Content */}
                    <div className="grid grid-cols-12 gap-2">
                        {/* Left Side */}
                        <div className="col-span-3 flex flex-col items-center space-y-2">
                            <Image src="https://i.postimg.cc/PqYp5d6B/kerala-logo-png-3.png" alt="Emblem" width={48} height={48} className="w-12 h-12" data-ai-hint="emblem logo" />
                            <div className="w-16 h-16 bg-gray-200 border border-gray-400 rounded-sm flex items-center justify-center">
                                <div className="w-8 h-10 border-2 border-gray-500 rounded-sm"></div>
                            </div>
                            <p className="text-[8px] font-bold transform -rotate-90 origin-center whitespace-nowrap" style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>FORM 23A</p>
                        </div>
                        {/* Right Side */}
                        <div className="col-span-9 grid grid-cols-2 gap-x-2 gap-y-1 text-gray-800">
                             <div className="col-span-2">
                                <span className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider">REGD. NO.</span>
                                <span className="block font-bold text-lg text-black">{v.registrationNumber}</span>
                            </div>

                            <DetailRow label="REGD. DATE" value={formatDateSafe(v.registrationDate)} />
                            <DetailRow label="CLASS" value={v.vehicleClass} />

                            <div className="col-span-2">
                               <DetailRow label="TYPE OF VEHICLE" value={'typeOfVehicle' in v ? v.typeOfVehicle : v.model} />
                            </div>

                             {'chassisNo' in v && <DetailRow label="CH. NO" value={v.chassisNo} />}
                             {'fuelConsumptionRate' in v && <DetailRow label="FUEL CONSUMPTION" value={v.fuelConsumptionRate} />}
                             {'hireCharges' in v && <DetailRow label="HIRE CHARGES" value={v.hireCharges ? `₹ ${v.hireCharges.toLocaleString('en-IN')}` : '-'} />}
                             {'agreementValidity' in v && <DetailRow label="AGREEMENT VALIDITY" value={formatDateSafe(v.agreementValidity)} />}
                        </div>
                    </div>
                </div>
            </>
        );
    } else { // RigCompressor
        title = (vehicle as RigCompressor).typeOfRigUnit;
        const u = vehicle as RigCompressor;
        details = (
             <Card className="shadow-none border-0">
                <CardHeader>
                    <DialogTitle>{u.typeOfRigUnit}</DialogTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <DetailRow label="Status" value={u.status} />
                    <DetailRow label="Fuel Consumption" value={u.fuelConsumption} />
                    <Separator />
                    <DetailRow label="Rig Vehicle Reg. No" value={u.rigVehicleRegNo} />
                    <DetailRow label="Compressor Vehicle Reg. No" value={u.compressorVehicleRegNo} />
                    <DetailRow label="Supporting Vehicle Reg. No" value={u.supportingVehicleRegNo} />
                    <Separator/>
                    <DetailRow label="Compressor Details" value={u.compressorDetails} />
                    <DetailRow label="Remarks" value={u.remarks} />
                </CardContent>
            </Card>
        );
    }

    return (
        <DialogContent className="max-w-2xl p-0 bg-transparent border-0 shadow-none">
             {details}
            <DialogFooter className="p-4 pt-0 sm:justify-center">
                <Button onClick={onClose} variant="secondary" className="w-full sm:w-auto">Close</Button>
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
                        <TableHead className="p-2 text-sm min-w-[250px]">Vehicle Details</TableHead>
                        <TableHead className="p-2 text-sm">Fuel Consumption</TableHead>
                        <TableHead className="p-2 text-sm">Fitness</TableHead>
                        <TableHead className="p-2 text-sm">Tax</TableHead>
                        <TableHead className="p-2 text-sm">Insurance</TableHead>
                        <TableHead className="p-2 text-sm">Pollution</TableHead>
                        <TableHead className="p-2 text-sm">Fuel Test</TableHead>
                        {canEdit && <TableHead className="text-right p-2 text-sm">Actions</TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {(data || []).map((v, index) => (
                        <TableRow key={v.id}>
                            <TableCell className="p-2 text-sm">{index + 1}</TableCell>
                            <TableCell className="p-2 text-sm font-medium">
                                <button onClick={() => onView(v)} className="text-left hover:underline">
                                    <div className="flex flex-col">
                                        <span className="font-bold">{v.registrationNumber}</span>
                                        <span className="text-muted-foreground text-xs">{v.model}</span>
                                        <span className="text-muted-foreground text-xs">{v.typeOfVehicle}</span>
                                        <span className="text-muted-foreground text-xs">{v.vehicleClass}</span>
                                        <span className="text-muted-foreground text-xs">Reg: {formatDateSafe(v.registrationDate)}</span>
                                    </div>
                                </button>
                            </TableCell>
                            <TableCell className="p-2 text-sm">{v.fuelConsumptionRate || '-'}</TableCell>
                            <TableCell className="p-2 text-sm">{formatDateSafe(v.fitnessExpiry)}</TableCell>
                            <TableCell className="p-2 text-sm">{formatDateSafe(v.taxExpiry)}</TableCell>
                            <TableCell className="p-2 text-sm">{formatDateSafe(v.insuranceExpiry)}</TableCell>
                            <TableCell className="p-2 text-sm">{formatDateSafe(v.pollutionExpiry)}</TableCell>
                            <TableCell className="p-2 text-sm">{formatDateSafe(v.fuelTestExpiry)}</TableCell>
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
                        <TableHead className="p-2 text-sm min-w-[200px]">Vehicle Details</TableHead>
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
                            <TableCell className="p-2 text-sm font-medium">
                                <button onClick={() => onView(v)} className="text-left hover:underline">
                                    <div className="flex flex-col">
                                        <span className="font-bold">{v.registrationNumber}</span>
                                        <span className="text-muted-foreground text-xs">{v.model}</span>
                                        <span className="text-muted-foreground text-xs">{v.vehicleClass}</span>
                                        <span className="text-muted-foreground text-xs">Reg: {formatDateSafe(v.registrationDate)}</span>
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
