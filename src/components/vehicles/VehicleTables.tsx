// src/components/vehicles/VehicleTables.tsx
"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Eye, Building, Truck, AlertTriangle } from "lucide-react";
import type { DepartmentVehicle, HiredVehicle, RigCompressor } from "@/lib/schemas";
import { format, isValid, isBefore, addDays } from "date-fns";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useState, useMemo } from "react";
import { Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../ui/dialog";
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
             <div className="text-xs">
                <span className="font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
                <p className="font-bold text-black">-</p>
            </div>
        );
    }
    const displayValue = String(value);
    return (
        <div className="text-xs">
            <span className="font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
            <p className="font-bold text-black whitespace-pre-wrap break-words">{displayValue}</p>
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
        const isHired = 'hireCharges' in v;
        const isDepartment = 'fuelConsumptionRate' in v;

        details = (
            <>
                <DialogHeader className="sr-only">
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>Details for {title}.</DialogDescription>
                </DialogHeader>
                 <div className="bg-orange-50 font-serif text-black p-4 border-2 border-black max-w-4xl mx-auto my-8">
                    <div className="text-center mb-2">
                        <h1 className="font-bold text-lg">VEHICLE REGISTRATION</h1>
                        <p className="text-xs font-semibold">GROUND WATER DEPARTMENT, KOLLAM</p>
                    </div>

                    <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-12">
                             <div className="text-center py-2">
                                <span className="block font-bold text-2xl text-black tracking-wider">{v.registrationNumber}</span>
                            </div>
                        </div>

                        {/* Details Grid */}
                        <div className="col-span-12 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3 text-xs border-t-2 border-b-2 border-black py-2">
                            <DetailRow label="REGD. DATE" value={formatDateSafe(v.registrationDate)} />
                            <DetailRow label="OWNER" value={isDepartment ? "Ground Water Department" : "Hired"}/>
                            <DetailRow label="ADDRESS" value="Kollam, Kerala"/>
                             <DetailRow label="CLASS" value={v.vehicleClass} />
                            <DetailRow label="MFG" value={v.model} />
                            <DetailRow label="FUEL USED" value={"DIESEL"} />
                             <DetailRow label="CHASSIS NO" value={isDepartment ? (v as DepartmentVehicle).chassisNo : 'N/A'} />
                            <DetailRow label="RC Status" value={v.rcStatus} />
                             {isDepartment && <DetailRow label="FUEL RATE" value={(v as DepartmentVehicle).fuelConsumptionRate} />}
                             {isHired && <DetailRow label="HIRE CHARGES" value={`₹ ${v.hireCharges?.toLocaleString('en-IN') ?? '-'}`} />}
                             {isHired && <DetailRow label="AGREEMENT" value={formatDateSafe(v.agreementValidity)} />}
                             <DetailRow label="TAX" value={"LIFETIME"} />
                        </div>
                    </div>
                     {/* Certificate Details */}
                    <div className="mt-2 pt-2 border-b-2 border-black pb-2">
                        <h3 className="text-center font-bold text-sm mb-1">CERTIFICATE VALIDITY</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 text-xs">
                             <div className="flex justify-between font-semibold"><span>FITNESS:</span><span>{formatDateSafe(v.fitnessExpiry)}</span></div>
                             <div className="flex justify-between font-semibold"><span>TAX:</span><span>{formatDateSafe(v.taxExpiry)}</span></div>
                             <div className="flex justify-between font-semibold"><span>INSURANCE:</span><span>{formatDateSafe(v.insuranceExpiry)}</span></div>
                             <div className="flex justify-between font-semibold"><span>POLLUTION:</span><span>{formatDateSafe(v.pollutionExpiry)}</span></div>
                            {isDepartment && <div className="flex justify-between font-semibold"><span>FUEL TEST:</span><span>{formatDateSafe((v as DepartmentVehicle).fuelTestExpiry)}</span></div>}
                            {isHired && <div className="flex justify-between font-semibold"><span>PERMIT:</span><span>{formatDateSafe(v.permitExpiry)}</span></div>}
                        </div>
                    </div>
                    {/* Footer */}
                     <div className="mt-2 flex justify-end">
                        <div className="text-center">
                            <div className="w-24 h-10"></div> {/* Spacer for signature */}
                            <p className="text-xs font-bold border-t border-black">Signing Authority</p>
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
        <DialogContent className="max-w-4xl p-0 bg-transparent border-0 shadow-none">
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

    