// src/app/dashboard/agency-registration/page.tsx
"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useAgencyApplications, type AgencyApplication, type RigRegistration as RigRegistrationType, type OwnerInfo } from "@/hooks/useAgencyApplications";
import { useForm, useFieldArray, FormProvider, useWatch, Controller, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AgencyApplicationSchema, rigTypeOptions, RigRegistrationSchema, RigRenewalSchema, type RigRenewal as RigRenewalFormData, applicationFeeTypes, ApplicationFeeSchema, ApplicationFeeType, type ApplicationFee, OwnerInfoSchema, type RigType } from "@/lib/schemas";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, PlusCircle, Save, X, Edit, Trash2, ShieldAlert, UserPlus, FilePlus, ChevronsUpDown, RotateCcw, RefreshCw, CheckCircle, Info, Ban, Edit2, FileUp, MoreVertical, ArrowLeft, Eye, FileDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { format, addYears, isValid, parseISO, parse, toDate } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { usePageHeader } from "@/hooks/usePageHeader";
import { usePageNavigation } from "@/hooks/usePageNavigation";
import PaginationControls from "@/components/shared/PaginationControls";
import ExcelJS from "exceljs";


export const dynamic = 'force-dynamic';

const createDefaultRig = (): RigRegistrationType => ({
    id: uuidv4(),
    status: 'Active',
    renewals: [],
    history: [],
    cancellationDate: null,
    cancellationReason: undefined,
});

const toDateOrNull = (value: any): Date | null => {
  if (value === null || value === undefined || value === '') return null;

  // Already a valid Date
  if (value instanceof Date && !isNaN(value.getTime())) return value;

  // Firestore-like Timestamp ({ seconds, nanoseconds })
  if (typeof value === 'object' && value !== null && typeof value.seconds === 'number') {
    try {
      const ms = value.seconds * 1000 + (value.nanoseconds ? Math.round(value.nanoseconds / 1e6) : 0);
      const d = new Date(ms);
      if (!isNaN(d.getTime())) return d;
    } catch { /* fallthrough */ }
  }

  // Numeric epoch (seconds or milliseconds)
  if (typeof value === 'number' && isFinite(value)) {
    // Heuristic: if < 1e12 treat as seconds
    const ms = value < 1e12 ? value * 1000 : value;
    const d = new Date(ms);
    if (!isNaN(d.getTime())) return d;
  }

  // String parsing: try ISO first, then common patterns
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return null;

    // ISO / RFC parsable
    const iso = Date.parse(trimmed);
    if (!isNaN(iso)) return new Date(iso);

    // yyyy-MM-dd (common for <input type=date>)
    const ymd = /^(\d{4})-(\d{2})-(\d{2})$/;
    const ymdMatch = trimmed.match(ymd);
    if (ymdMatch) {
      const [_, y, m, d] = ymdMatch;
      const dt = new Date(Number(y), Number(m) - 1, Number(d));
      if (!isNaN(dt.getTime())) return dt;
    }

    // dd/MM/yyyy
    const dmy = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const dmyMatch = trimmed.match(dmy);
    if (dmyMatch) {
      const [_, dd, mm, yyyy] = dmyMatch;
      const dt = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
      if (!isNaN(dt.getTime())) return dt;
    }

    // fallback: attempt Date constructor
    try {
      const fallback = new Date(trimmed);
      if (!isNaN(fallback.getTime())) return fallback;
    } catch { /* ignore */ }
  }

  return null;
};

const formatDateForInput = (d: Date | null | string | undefined) => {
    if (!d) return '';
    const date = typeof d === 'string' ? parseISO(d) : d;
    if (!date || !isValid(date)) return '';
    try {
        return format(date, 'yyyy-MM-dd');
    } catch {
        return '';
    }
};

const formatDateSafe = (d: any): string => {
    if (!d) return 'N/A';
    const date = toDateOrNull(d);
    return date ? format(date, 'dd/MM/yyyy') : 'N/A';
}

const processDataForForm = (data: any): any => {
  if (data === null || data === undefined) return data;

  if (Array.isArray(data)) {
    return data.map(item => processDataForForm(item));
  }

  if (typeof data === 'object') {
    // handle Date-like or timestamp objects directly
    const maybeDate = toDateOrNull(data);
    if (maybeDate) {
      return formatDateForInput(maybeDate);
    }

    // otherwise recursively process keys
    const out: any = {};
    for (const [k, v] of Object.entries(data)) {
      // treat anything with "date" or "till" in key name as date-ish
      if (typeof v !== 'function' && (k.toLowerCase().includes('date') || k.toLowerCase().includes('till') || k.toLowerCase().includes('valid'))) {
        const dt = toDateOrNull(v);
        out[k] = formatDateForInput(dt);
      } else {
        out[k] = processDataForForm(v);
      }
    }
    return out;
  }

  // primitives
  return data;
};

const processDataForSaving = (data: any): any => {
  if (data === null || data === undefined) return data;

  if (Array.isArray(data)) {
    return data.map(item => processDataForSaving(item));
  }

  if (typeof data === 'object') {
    // If object itself looks like a date-like (timestamp), convert
    const maybeDate = toDateOrNull(data);
    if (maybeDate) return maybeDate;

    const out: any = {};
    for (const [k, v] of Object.entries(data)) {
      if (typeof v === 'string') {
        const trimmed = v.trim();
        // For fields that look like date keys, convert to Date or null
        if (k.toLowerCase().includes('date') || k.toLowerCase().includes('till') || k.toLowerCase().includes('valid')) {
          if (trimmed === '') {
            out[k] = null;
          } else {
            const parsed = toDateOrNull(trimmed);
            out[k] = parsed ? parsed : null;
          }
          continue;
        }
        // For non-date strings, keep as-is (but convert empty -> undefined only if needed)
        out[k] = trimmed === '' ? undefined : v;
        continue;
      }

      // numbers, booleans: keep as-is
      if (typeof v === 'number' || typeof v === 'boolean') {
        out[k] = v;
        continue;
      }

      // nested objects/arrays: recurse
      out[k] = processDataForSaving(v);
    }
    return out;
  }

  // primitves (string/number/bool) : return as-is
  return data;
};

const RegistrationTable = ({ 
  applications, 
  onView,
  onEdit, 
  onDelete, 
  searchTerm,
  canEdit,
  currentPage,
  itemsPerPage,
  isPendingTable = false,
}: { 
  applications: AgencyApplication[],
  onView: (id: string) => void,
  onEdit: (id: string) => void, 
  onDelete: (id: string) => void,
  searchTerm: string,
  canEdit: boolean,
  currentPage: number,
  itemsPerPage: number,
  isPendingTable?: boolean,
}) => (
    <div className="max-h-[70vh] overflow-auto">
      <Table>
          <TableHeader className="bg-secondary sticky top-0">
              <TableRow>
                  <TableHead className="w-[80px]">Sl. No.</TableHead>
                  <TableHead>File No.</TableHead>
                  <TableHead>Agency Name</TableHead>
                  <TableHead>Owner</TableHead>
                  {!isPendingTable && <TableHead>Active Rigs</TableHead>}
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
              </TableRow>
          </TableHeader>
          <TableBody>
              {applications.length > 0 ? (
                  applications.map((app, index) => (
                      <TableRow key={app.id}>
                          <TableCell>{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                          <TableCell>{app.fileNo || 'N/A'}</TableCell>
                          <TableCell className="font-medium">{app.agencyName}</TableCell>
                          <TableCell>{app.owner.name}</TableCell>
                           {!isPendingTable && <TableCell>{(app.rigs || []).filter(r => r.status === 'Active').length} / {(app.rigs || []).length}</TableCell>}
                          <TableCell><Badge variant={app.status === 'Active' ? 'default' : 'secondary'}>{app.status}</Badge></TableCell>
                          <TableCell className="text-center">
                              <div className="flex items-center justify-center">
                                  <Button variant="ghost" size="icon" onClick={() => onView(app.id!)}><Eye className="h-4 w-4" /></Button>
                                  {canEdit && (
                                    <>
                                    <Button variant="ghost" size="icon" onClick={() => onEdit(app.id!)}><Edit className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/90" onClick={() => onDelete(app.id!)}><Trash2 className="h-4 w-4" /></Button>
                                    </>
                                  )}
                              </div>
                          </TableCell>
                      </TableRow>
                  ))
              ) : (
                  <TableRow>
                      <TableCell colSpan={isPendingTable ? 6 : 7} className="h-24 text-center">
                          No registrations found {searchTerm ? "matching your search" : ""}.
                      </TableCell>
                  </TableRow>
              )}
          </TableBody>
      </Table>
    </div>
);

const getOrdinalSuffix = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
};

const DetailRow = ({ label, value }: { label: string; value: any }) => {
    if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
        return null;
    }

    let displayValue = String(value);
    const isDate = label.toLowerCase().includes('date') || label.toLowerCase().includes('validity');

    if (isDate) {
        const date = toDateOrNull(value);
        displayValue = date ? format(date, 'dd/MM/yyyy') : 'N/A';
        if (displayValue === 'N/A' && String(value)) displayValue = String(value); // fallback for non-standard date strings
    } else if (typeof value === 'number') {
        displayValue = value.toLocaleString('en-IN');
    } else if (typeof value === 'boolean') {
        displayValue = value ? 'Yes' : 'No';
    } else if (typeof value === 'object' && value !== null) {
        displayValue = Object.entries(value)
            .map(([key, val]) => (val ? `${key}: ${val}` : null))
            .filter(Boolean)
            .join(', ');
        if (!displayValue) return null;
    }

    return (
        <div>
            <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
            <dd className="text-sm">{displayValue}</dd>
        </div>
    );
};

const RigAccordionItem = ({
  field,
  index,
  displayIndex,
  isReadOnly,
  onRemove,
  openDialog,
  onDeleteRenewal,
  onEditRenewal,
  form,
}: {
  field: RigRegistrationType;
  index: number; // The original index for react-hook-form
  displayIndex: number; // The UI index for display
  isReadOnly: boolean;
  onRemove?: (index: number) => void;
  openDialog: (type: 'renew' | 'cancel' | 'activate' | 'deleteRig' | 'editRigDetails', data: any) => void;
  onDeleteRenewal: (rigIndex: number, renewalId: string) => void;
  onEditRenewal: (rigIndex: number, renewal: RigRenewalFormData) => void;
  form: UseFormReturn<any>;
}) => {
  const rigTypeValue = field.typeOfRig || 'Unspecified Type';
  const registrationDate = field.registrationDate ? toDateOrNull(field.registrationDate) : null;

  const latestRenewal = useMemo(() => {
    if (!field.renewals || field.renewals.length === 0) return null;
    return [...field.renewals].sort((a, b) => {
        const dateA = a.renewalDate ? toDateOrNull(a.renewalDate)?.getTime() ?? 0 : 0;
        const dateB = b.renewalDate ? toDateOrNull(b.renewalDate)?.getTime() ?? 0 : 0;
        return dateB - dateA;
    })[0];
  }, [field.renewals]);

  const lastEffectiveDate = latestRenewal?.renewalDate ? toDateOrNull(latestRenewal.renewalDate) : registrationDate;

  const validityDate = lastEffectiveDate && isValid(lastEffectiveDate)
    ? new Date(addYears(lastEffectiveDate, 1).getTime() - (24 * 60 * 60 * 1000))
    : null;
    
  const isExpired = validityDate ? new Date() > validityDate : false;
  
  const cancellationDateValue = form.watch(`rigs.${index}.cancellationDate`);
  const formattedCancellationDate = cancellationDateValue && isValid(new Date(cancellationDateValue))
    ? format(new Date(cancellationDateValue), 'dd/MM/yyyy')
    : 'N/A';
    
  return (
    <AccordionItem value={`rig-${field.id}`} className="border bg-background rounded-lg shadow-sm">
      <AccordionTrigger className={cn("flex-1 text-base font-semibold px-4 text-primary group", field.status === 'Cancelled' && "text-destructive line-through", field.status === 'Active' && isExpired && "text-amber-600")}>
            <div className="flex justify-between items-center w-full">
                <div className="flex items-center gap-2">
                    Rig #{displayIndex + 1} - {rigTypeValue} ({field.status === 'Active' && isExpired ? <span className="text-destructive">Expired</span> : field.status})
                </div>
                 {!isReadOnly && (
                    <div className="flex items-center space-x-1 mr-2">
                         <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.preventDefault(); e.stopPropagation(); openDialog('editRigDetails', { rigIndex: index }); }}><Edit className="h-4 w-4" /></Button>
                         {field.status === 'Active' && <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.preventDefault(); e.stopPropagation(); openDialog('renew', { rigIndex: index }); }}><RefreshCw className="h-4 w-4" /></Button>}
                         {field.status === 'Active' && <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={(e) => { e.preventDefault(); e.stopPropagation(); openDialog('cancel', { rigIndex: index }); }}><Ban className="h-4 w-4" /></Button>}
                         {field.status === 'Cancelled' && <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.preventDefault(); e.stopPropagation(); openDialog('activate', { rigIndex: index }); }}><CheckCircle className="h-4 w-4" /></Button>}
                         <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={(e) => { e.preventDefault(); e.stopPropagation(); openDialog('deleteRig', { rigIndex: index }); }}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                )}
            </div>
        </AccordionTrigger>
      <AccordionContent className="p-6 pt-0">
        <div className="border-t pt-6 space-y-4">
          
          <div className="p-4 border rounded-lg space-y-4 bg-secondary/20">
            <div className="flex justify-between items-center mb-2">
                <p className="font-medium text-base text-primary">Registration Details</p>
                {!isReadOnly && (
                    <Button type="button" variant="outline" size="sm" onClick={() => openDialog('editRigDetails', { rigIndex: index })}>
                        <Edit className="mr-2 h-4 w-4" /> Edit Details
                    </Button>
                )}
            </div>
            
             <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-4">
                <div className="md:col-span-2"><DetailRow label="Rig Reg. No." value={field.rigRegistrationNo} /></div>
                <div className="md:col-span-1"><DetailRow label="Type of Rig" value={field.typeOfRig} /></div>
                <div className="md:col-span-2"><DetailRow label="Last Reg/Renewal Date" value={field.registrationDate} /></div>
                <div className="md:col-span-1"><DetailRow label="Validity Upto" value={validityDate} /></div>
                
                <div className="col-span-full border-t pt-4 mt-2"></div>
                <DetailRow label="Reg. Fee" value={field.registrationFee} />
                <DetailRow label="Payment Date" value={field.paymentDate} />
                <DetailRow label="Challan No." value={field.challanNo} />
                <div className="col-span-full border-t pt-4 mt-2"></div>
                <DetailRow label="Additional Reg. Fee" value={field.additionalRegistrationFee} />
                <DetailRow label="Additional Payment Date" value={field.additionalPaymentDate} />
                <DetailRow label="Additional Challan No." value={field.additionalChallanNo} />
                
                <div className="col-span-full border-t pt-4 mt-2"></div>
                
                {field.rigVehicle && <div className="col-span-full pt-4 mt-4 border-t"><h4 className="font-medium text-sm text-primary">Rig Vehicle</h4></div>}
                {field.rigVehicle?.type && <DetailRow label="Type" value={field.rigVehicle.type} />}
                {field.rigVehicle?.regNo && <DetailRow label="Reg No" value={field.rigVehicle.regNo} />}
                {field.rigVehicle?.chassisNo && <DetailRow label="Chassis No" value={field.rigVehicle.chassisNo} />}
                {field.rigVehicle?.engineNo && <DetailRow label="Engine No" value={field.rigVehicle.engineNo} />}

                {field.compressorVehicle && <div className="col-span-full pt-4 mt-4 border-t"><h4 className="font-medium text-sm text-primary">Compressor Vehicle</h4></div>}
                {field.compressorVehicle?.type && <DetailRow label="Type" value={field.compressorVehicle.type} />}
                {field.compressorVehicle?.regNo && <DetailRow label="Reg No" value={field.compressorVehicle.regNo} />}
                {field.compressorVehicle?.chassisNo && <DetailRow label="Chassis No" value={field.compressorVehicle.chassisNo} />}
                {field.compressorVehicle?.engineNo && <DetailRow label="Engine No" value={field.compressorVehicle.engineNo} />}

                {field.supportingVehicle && <div className="col-span-full pt-4 mt-4 border-t"><h4 className="font-medium text-sm text-primary">Supporting Vehicle</h4></div>}
                {field.supportingVehicle?.type && <DetailRow label="Type" value={field.supportingVehicle.type} />}
                {field.supportingVehicle?.regNo && <DetailRow label="Reg No" value={field.supportingVehicle.regNo} />}
                {field.supportingVehicle?.chassisNo && <DetailRow label="Chassis No" value={field.supportingVehicle.chassisNo} />}
                {field.supportingVehicle?.engineNo && <DetailRow label="Engine No" value={field.supportingVehicle.engineNo} />}

                {field.compressorDetails && <div className="col-span-full pt-4 mt-4 border-t"><h4 className="font-medium text-sm text-primary">Compressor</h4></div>}
                {field.compressorDetails?.model && <DetailRow label="Model" value={field.compressorDetails.model} />}
                {field.compressorDetails?.capacity && <DetailRow label="Capacity" value={field.compressorDetails.capacity} />}
                
                {field.generatorDetails && <div className="col-span-full pt-4 mt-4 border-t"><h4 className="font-medium text-sm text-primary">Generator</h4></div>}
                {field.generatorDetails?.model && <DetailRow label="Model" value={field.generatorDetails.model} />}
                {field.generatorDetails?.capacity && <DetailRow label="Capacity" value={field.generatorDetails.capacity} />}
                {field.generatorDetails?.type && <DetailRow label="Type" value={field.generatorDetails.type} />}
                {field.generatorDetails?.engineNo && <DetailRow label="Engine No" value={field.generatorDetails.engineNo} />}

            </dl>
          </div>
          

          {field.status === 'Cancelled' && (
            <div className="p-4 border rounded-lg bg-destructive/10">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold text-destructive">Cancellation Details</h4>
                     {!isReadOnly && (
                        <div className="flex items-center space-x-1">
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/20" onClick={(e) => { e.preventDefault(); e.stopPropagation(); openDialog('cancel', { rigIndex: index }); }}>
                                <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/20" onClick={(e) => { e.preventDefault(); e.stopPropagation(); openDialog('activate', { rigIndex: index }); }}>
                                <RotateCcw className="h-4 w-4" />
                            </Button>
                        </div>
                     )}
                </div>
                <p className="text-destructive"><strong>Reason:</strong> {field.cancellationReason || 'N/A'}</p>
                 <p className="text-destructive">
                  <strong>Date of Cancellation:</strong> {formattedCancellationDate}
                </p>
            </div>
          )}

           <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <p className="font-medium text-base text-primary">Renewal History</p>
                 {!isReadOnly && (
                    <div className="flex items-center space-x-1">
                         {field.status === 'Active' && <Button type="button" size="sm" variant="outline" onClick={(e) => { e.preventDefault(); openDialog('renew', { rigIndex: index }); }}><RefreshCw className="mr-2 h-4 w-4" />Renew</Button>}
                    </div>
                )}
              </div>
              <ScrollArea className="h-72 w-full rounded-md border">
                <Table>
                    <TableHeader className="sticky top-0 bg-secondary">
                    <TableRow>
                        <TableHead>Renewal No.</TableHead>
                        <TableHead>Renewal Date</TableHead>
                        <TableHead>Validity Upto</TableHead>
                        <TableHead>Fee (₹)</TableHead>
                        <TableHead>Payment Date</TableHead>
                        <TableHead>Challan No.</TableHead>
                        {!isReadOnly && <TableHead className="text-center">Actions</TableHead>}
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {field.renewals && field.renewals.length > 0 ? (
                        field.renewals.map((renewal, renewalIndex) => {
                        const renewalNum = renewalIndex + 1;
                        const renewalDate = renewal.renewalDate ? toDateOrNull(renewal.renewalDate) : null;
                        const paymentDate = renewal.paymentDate ? toDateOrNull(renewal.paymentDate) : null;
                        const validityUpto = renewalDate ? new Date(addYears(renewalDate, 1).getTime() - (24 * 60 * 60 * 1000)) : null;
                        return (
                            <TableRow key={renewal.id}>
                            <TableCell className="font-medium">{`${renewalNum}${getOrdinalSuffix(renewalNum)}`}</TableCell>
                            <TableCell>{renewalDate ? format(renewalDate, 'dd/MM/yyyy') : 'N/A'}</TableCell>
                            <TableCell>{validityUpto ? format(validityUpto, 'dd/MM/yyyy') : 'N/A'}</TableCell>
                            <TableCell>{renewal.renewalFee?.toLocaleString() ?? 'N/A'}</TableCell>
                            <TableCell>{paymentDate ? format(paymentDate, 'dd/MM/yyyy') : 'N/A'}</TableCell>
                            <TableCell>{renewal.challanNo || 'N/A'}</TableCell>
                            {!isReadOnly && (
                                <TableCell className="text-center">
                                    <div className="flex justify-center space-x-1">
                                    <Button type="button" variant="ghost" size="icon" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEditRenewal(index, renewal); }}><Edit className="h-4 w-4"/></Button>
                                    <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDeleteRenewal(index, renewal.id); }}><Trash2 className="h-4 w-4"/></Button>
                                    </div>
                                </TableCell>
                            )}
                            </TableRow>
                        );
                        })
                    ) : (
                        <TableRow><TableCell colSpan={!isReadOnly ? 7 : 6} className="h-24 text-center text-muted-foreground bg-background/50">No renewal history for this rig.</TableCell></TableRow>
                    )}
                    </TableBody>
                </Table>
              </ScrollArea>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  )
};


export default function AgencyRegistrationPage() {
  const { setHeader } = usePageHeader();
  const { applications, isLoading: applicationsLoading, addApplication, updateApplication, deleteApplication } = useAgencyApplications();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const { setIsNavigating } = usePageNavigation();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  
  const [dialogState, setDialogState] = useState<{ type: null | 'renew' | 'cancel' | 'activate' | 'editRenewal' | 'deleteRig' | 'view' | 'editFee' | 'addFee' | 'editRigDetails' | 'addRig' | 'editAgencyReg' | 'addPartner' | 'editPartner'; data: any }>({ type: null, data: null });
  
  const [deletingRenewal, setDeletingRenewal] = useState<{ rigIndex: number; renewalId: string } | null>(null);
  
  const [deletingApplicationId, setDeletingApplicationId] = useState<string | null>(null);
  const [deletingFeeIndex, setDeletingFeeIndex] = useState<number | null>(null);
  const [deletingPartnerIndex, setDeletingPartnerIndex] = useState<number | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  const isEditor = user?.role === 'editor';
  const isSupervisor = user?.role === 'supervisor';
  const isViewer = user?.role === 'viewer';
  
  const isViewing = dialogState.type === 'view';

  const isReadOnlyForForm = isViewing || isSupervisor || isViewer;
  const canEdit = isEditor;

  useEffect(() => {
    if (selectedApplicationId) {
      let title = isViewing ? `View Rig Registration` : `Edit Rig Registration`;
      if (selectedApplicationId === 'new') title = 'New Rig Registration';
      setHeader(title, 'Manage all details related to an agency and its rigs.');
    } else {
      setHeader('Rig Registration', 'Manage agency and rig registrations.');
    }
  }, [selectedApplicationId, isViewing, setHeader, applications]);

  const createDefaultOwner = (): OwnerInfo => ({ name: '', address: '', mobile: '', secondaryMobile: '' });
  const createDefaultFee = (): ApplicationFee => ({ id: uuidv4() });
  
  const form = useForm<AgencyApplication>({
    resolver: zodResolver(AgencyApplicationSchema),
    defaultValues: {
      owner: createDefaultOwner(),
      partners: [],
      applicationFees: [],
      rigs: [],
      status: 'Active',
      remarks: '',
    },
  });
  
  const { fields: partnerFields, append: appendPartner, remove: removePartner, update: updatePartner } = useFieldArray({ control: form.control, name: "partners" });
  const { fields: feeFields, append: appendFee, remove: removeFee, update: updateFee } = useFieldArray({ control: form.control, name: "applicationFees" });
  const { fields: rigFields, append: appendRig, remove: removeRig, update: updateRig } = useFieldArray({ control: form.control, name: "rigs" });
  
  const activeRigCount = useMemo(() => rigFields.filter(rig => rig.status === 'Active').length, [rigFields]);

  useEffect(() => {
    if (selectedApplicationId) {
        if (selectedApplicationId === 'new') {
            form.reset({
                owner: createDefaultOwner(),
                partners: [],
                applicationFees: [],
                rigs: [],
                history: [],
                status: 'Active',
                remarks: '',
            });
            setIsNavigating(false);
        } else {
            const app = applications.find((a: AgencyApplication) => a.id === selectedApplicationId);
            if (app) {
                 const processedApp = processDataForForm(app);
                 form.reset(processedApp);
            } else {
                setSelectedApplicationId(null);
                form.reset({ owner: createDefaultOwner(), partners: [], applicationFees: [], rigs: [], history: [], remarks: '' });
            }
        }
    } else {
        form.reset({ owner: createDefaultOwner(), partners: [], applicationFees: [], rigs: [], history: [], remarks: '' });
    }
  }, [selectedApplicationId, applications, form, setIsNavigating]);
  
    const generateHistoryEntry = (rig: RigRegistrationType): string | null => {
        const logParts: string[] = [];

        const addPart = (label: string, value: any) => {
            if (value !== undefined && value !== null && value !== '' && !(Array.isArray(value) && value.length === 0)) {
            logParts.push(`${label}: ${value}`);
            }
        };

        const addVehiclePart = (vehicleName: string, vehicle: any) => {
            if (!vehicle) return;
            const vehicleParts: string[] = [];
            if (vehicle.type) vehicleParts.push(`Type: ${vehicle.type}`);
            if (vehicle.regNo) vehicleParts.push(`Reg No: ${vehicle.regNo}`);
            if (vehicle.chassisNo) vehicleParts.push(`Chassis No: ${vehicle.chassisNo}`);
            if (vehicle.engineNo) vehicleParts.push(`Engine No: ${vehicle.engineNo}`);
            if (vehicleParts.length > 0) {
                logParts.push(`${vehicleName}: ${vehicleParts.join(', ')}`);
            }
        };

        const addDetailsPart = (detailsName: string, details: any) => {
            if (!details) return;
            const detailParts: string[] = [];
            if (details.model) detailParts.push(`Model: ${details.model}`);
            if (details.capacity) detailParts.push(`Capacity: ${details.capacity}`);
            if (details.type) detailParts.push(`Type: ${details.type}`);
            if (details.engineNo) detailParts.push(`Engine No: ${details.engineNo}`);
             if (detailParts.length > 0) {
                logParts.push(`${detailsName}: ${detailParts.join(', ')}`);
            }
        }

        addPart('Rig Reg. No.', rig.rigRegistrationNo);
        addPart('Type of Rig', rig.typeOfRig);
        const regDate = toDateOrNull(rig.registrationDate);
        if (regDate) {
            addPart('Last Reg/Renewal Date', format(regDate, 'dd/MM/yyyy'));
        }

        const lastEffectiveDate = regDate;
        const validityDate = lastEffectiveDate && isValid(lastEffectiveDate)
            ? new Date(addYears(lastEffectiveDate, 1).getTime() - (24 * 60 * 60 * 1000))
            : null;
        if(validityDate) {
            addPart('Validity Upto', format(validityDate, 'dd/MM/yyyy'));
        }
        
        addPart('Reg. Fee', rig.registrationFee);
        const paymentDate = toDateOrNull(rig.paymentDate);
        if (paymentDate) {
            addPart('Payment Date', format(paymentDate, 'dd/MM/yyyy'));
        }
        addPart('Challan No.', rig.challanNo);

        addVehiclePart('Rig Vehicle', rig.rigVehicle);
        addVehiclePart('Compressor Vehicle', rig.compressorVehicle);
        addVehiclePart('Supporting Vehicle', rig.supportingVehicle);

        addDetailsPart('Compressor Details', rig.compressorDetails);
        addDetailsPart('Generator Details', rig.generatorDetails);
        

        if (logParts.length === 0) return null;

        const timestamp = format(new Date(), 'dd/MM/yyyy HH:mm');
        return `[${timestamp}] - ${logParts.join(' | ')}`;
    };

  const onSubmit = async (data: AgencyApplication) => {
    console.debug("onSubmit called, data snapshot:", data);
    setIsSubmitting(true);
    try {
        const finalStatus = data.agencyRegistrationNo ? 'Active' : 'Pending Verification';
        const dataForSave = processDataForSaving(data);

        if (selectedApplicationId && selectedApplicationId !== 'new') {
            const originalApp = applications.find(a => a.id === selectedApplicationId);
            if (originalApp) {
                 const mergedRigs = (dataForSave.rigs || []).map((updatedRig: RigRegistrationType) => {
                    const originalRig = (originalApp.rigs || []).find(r => r.id === updatedRig.id);
                    return {
                        ...originalRig,
                        ...updatedRig,
                        renewals: updatedRig.renewals || originalRig?.renewals || [],
                        history: updatedRig.history || originalRig?.history || [],
                    };
                });

                const finalPayload = {
                    ...originalApp,
                    ...dataForSave,
                    rigs: mergedRigs,
                    status: finalStatus
                };

                await updateApplication(selectedApplicationId, finalPayload);
                toast({ title: "Application Updated", description: "The registration details have been updated." });
            } else {
                throw new Error("Original application not found for update.");
            }
        } else {
            const dataWithHistory = {
                ...dataForSave,
                status: finalStatus,
                rigs: (dataForSave.rigs || []).map((rig: any) => {
                    const historyEntry = generateHistoryEntry(rig);
                    const newHistory = historyEntry ? [...(rig.history || []), historyEntry] : (rig.history || []);
                    return { ...rig, history: newHistory };
                })
            };
            await addApplication(dataWithHistory);
            toast({ title: "Application Created", description: "The new agency registration has been saved." });
        }
        setSelectedApplicationId(null);
    } catch (error: any) {
        console.error("Submission failed:", error);
        toast({ title: "Submission Failed", description: error.message, variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };


  const handleAddNew = () => {
    setIsNavigating(true);
    setSelectedApplicationId('new');
  }

  const handleEdit = (id: string) => {
    setSelectedApplicationId(id);
  }
  
  const handleView = (id: string) => {
    const appToView = applications.find(a => a.id === id);
    if(appToView) {
      openDialog('view', appToView);
    }
  }

  const handleCancelForm = () => {
    setSelectedApplicationId(null);
  }

  const handleAddRig = () => {
    if (activeRigCount >= 3) {
      toast({ title: "Maximum Rigs Reached", description: "You can only register a maximum of 3 active rigs per agency.", variant: "default" });
      return;
    }
    openDialog('addRig', {});
  };

  const filteredApplications = useMemo(() => {
    let sortedApps = [...applications].sort((a, b) => {
        const dateA = toDateOrNull(a.agencyRegistrationDate)?.getTime() ?? 0;
        const dateB = toDateOrNull(b.agencyRegistrationDate)?.getTime() ?? 0;
        return dateA - dateB;
    });

    const lowercasedFilter = searchTerm.toLowerCase();
    if (!lowercasedFilter) return sortedApps;

    return sortedApps.filter((app: AgencyApplication) => {
        const searchableContent = [
            app.agencyName,
            app.fileNo,
            app.agencyRegistrationNo,
            app.agencyChallanNo,
            app.agencyAdditionalChallanNo,
            app.owner?.name,
            app.owner?.mobile,
            app.owner?.secondaryMobile,
            app.owner?.address,
            ...(app.partners || []).flatMap(p => [p.name, p.mobile, p.secondaryMobile, p.address]),
            ...(app.applicationFees || []).flatMap(fee => [fee.applicationFeeType, fee.applicationFeeChallanNo]),
            ...(app.rigs || []).flatMap(rig => [
                rig.rigRegistrationNo,
                rig.typeOfRig,
                rig.challanNo,
                rig.additionalChallanNo,
                rig.rigVehicle?.regNo,
                rig.compressorVehicle?.regNo,
                rig.supportingVehicle?.regNo,
                ...(rig.renewals || []).map(r => r.challanNo)
            ]),
        ].filter(Boolean).map(String).join(' ').toLowerCase();

        return searchableContent.includes(lowercasedFilter);
    });
  }, [applications, searchTerm]);

  const completedApplications = useMemo(() => {
    return filteredApplications.filter((app: AgencyApplication) => app.status === 'Active');
  }, [filteredApplications]);
  
  const pendingApplications = useMemo(() => {
    return filteredApplications.filter((app: AgencyApplication) => app.status === 'Pending Verification');
  }, [filteredApplications]);
  
  const openDialog = (type: 'renew' | 'cancel' | 'activate' | 'editRenewal' | 'deleteRig' | 'view' | 'editFee' | 'addFee' | 'editRigDetails' | 'addRig' | 'editAgencyReg' | 'addPartner' | 'editPartner', data: any) => {
    setDialogState({ type, data });
  };

  const closeDialog = () => {
    setDialogState({ type: null, data: null });
  };
    
    const handleEditRenewal = (rigIndex: number, renewal: RigRenewalFormData) => {
        openDialog('editRenewal', { rigIndex, renewal: { ...renewal } });
    };
    
    const handleDeleteRenewal = (rigIndex: number, renewalId: string) => {
        setDeletingRenewal({ rigIndex, renewalId });
    };
    
    const handleDeleteApplication = (id: string) => {
      setDeletingApplicationId(id);
    };

    const confirmDeleteApplication = async () => {
      if (!deletingApplicationId) return;
      setIsSubmitting(true);
      try {
        await deleteApplication(deletingApplicationId);
        toast({ title: "Registration Removed", description: `The registration has been permanently deleted.` });
      } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: 'destructive' });
      } finally {
        setIsSubmitting(false);
        setDeletingApplicationId(null);
      }
    };

    const handleConfirmFeeChange = (feeData: ApplicationFee) => {
        if (!dialogState.data) return;
        
        if (dialogState.type === 'editFee') {
            const { index } = dialogState.data;
            updateFee(index, feeData);
            toast({ title: "Application Fee Updated", description: "The fee details have been saved." });
        } else if (dialogState.type === 'addFee') {
            appendFee({ ...feeData, id: uuidv4() });
            toast({ title: "Application Fee Added", description: "A new fee has been added." });
        }
        
        closeDialog();
    };

    const confirmDeleteFee = () => {
        if (deletingFeeIndex === null) return;
        removeFee(deletingFeeIndex);
        toast({ title: "Application Fee Removed", description: `The fee entry has been removed from the form.` });
        setDeletingFeeIndex(null);
    };
    
    const handleConfirmPartner = (partnerData: OwnerInfo) => {
        if (!dialogState.data) return;
        
        if (dialogState.type === 'addPartner') {
            appendPartner(partnerData);
            toast({ title: "Partner Added" });
        } else if (dialogState.type === 'editPartner') {
             const { index } = dialogState.data;
            updatePartner(index, partnerData);
            toast({ title: "Partner Updated" });
        }
        closeDialog();
    };

    const confirmDeletePartner = () => {
        if (deletingPartnerIndex === null) return;
        removePartner(deletingPartnerIndex);
        toast({ title: "Partner Removed", description: "The partner has been removed from the list." });
        setDeletingPartnerIndex(null);
    };

  const handleConfirmRenewal = (renewalData: any) => {
      if (dialogState.type === 'editRenewal') {
        const { rigIndex, renewal } = dialogState.data;
        const rigToUpdate = rigFields[rigIndex];
        const updatedRenewals = rigToUpdate.renewals?.map(r => r.id === renewal.id ? renewalData : r) || [];
        updateRig(rigIndex, { ...rigToUpdate, renewals: updatedRenewals });
        toast({ title: "Renewal Updated", description: "Renewal details have been updated." });
      } else if (dialogState.type === 'renew') {
        const { rigIndex } = dialogState.data;
        const rigToUpdate = rigFields[rigIndex];
        const renewalDateObj = toDateOrNull(renewalData.renewalDate);
        if (!renewalDateObj) {
            toast({ title: "Invalid Date", description: "Please enter a valid renewal date.", variant: "destructive" });
            return;
        }

        const newRenewal: RigRenewalFormData = {
            id: uuidv4(),
            renewalDate: renewalData.renewalDate ?? "",
            renewalFee: renewalData.renewalFee,
            paymentDate: renewalData.paymentDate ?? "",
            challanNo: renewalData.challanNo ?? "",
            validTill: addYears(renewalDateObj, 1),
        };
        updateRig(rigIndex, {
            ...rigToUpdate,
            registrationDate: newRenewal.renewalDate,
            status: 'Active',
            renewals: [...(rigToUpdate.renewals || []), newRenewal],
        });
        toast({ title: "Rig Renewed", description: "Renewal details added." });
    }
    
    closeDialog();
  };
  
    const handleConfirmDeleteRenewal = () => {
        if (!deletingRenewal) return;
        const { rigIndex, renewalId } = deletingRenewal;
        const rigToUpdate = rigFields[rigIndex];
        const updatedRenewals = rigToUpdate.renewals?.filter(r => r.id !== renewalId) || [];
        updateRig(rigIndex, { ...rigToUpdate, renewals: updatedRenewals });
        toast({ title: "Renewal Deleted", description: "The renewal record has been removed." });
        setDeletingRenewal(null);
    };

  const handleConfirmCancellation = (cancellationData: any) => {
    if (dialogState.type !== 'cancel') return;
    const { rigIndex } = dialogState.data;
    const { reason, date } = cancellationData;
    const rigToUpdate = form.getValues(`rigs.${rigIndex}`);
    const dateObject = toDateOrNull(date);
    
    updateRig(rigIndex, {
        ...rigToUpdate,
        status: 'Cancelled',
        cancellationDate: isValid(dateObject) ? dateObject : new Date(),
        cancellationReason: reason,
    });
    toast({ title: "Rig Cancelled", description: "The rig registration has been cancelled." });
    closeDialog();
  };
  
  const handleActivateRig = () => {
    if (dialogState.type !== 'activate') return;
    const { rigIndex } = dialogState.data;
    const rigToUpdate = rigFields[rigIndex];
    updateRig(rigIndex, {
        ...rigToUpdate,
        status: 'Active',
        cancellationDate: null,
        cancellationReason: '',
    });
    toast({ title: "Rig Activated", description: "The rig registration has been reactivated." });
    closeDialog();
  };

  const confirmDeleteRig = () => {
      if (dialogState.type !== 'deleteRig') return;
      const { rigIndex } = dialogState.data;
      removeRig(rigIndex);
      toast({ title: "Rig Removed", description: `Rig #${rigIndex + 1} has been removed from the form.` });
      closeDialog();
  };
  
  const handleConfirmRigDetails = (rigData: RigRegistrationType) => {
    if (dialogState.type === 'editRigDetails') {
      const { rigIndex } = dialogState.data;
      const currentRig = form.getValues(`rigs.${rigIndex}`);
      updateRig(rigIndex, { ...currentRig, ...rigData });
      toast({ title: "Rig Details Updated" });
    } else if (dialogState.type === 'addRig') {
      appendRig({ ...createDefaultRig(), ...rigData });
      toast({ title: "New Rig Added" });
    }
    closeDialog();
  }

  const handleConfirmAgencyReg = (regData: any) => {
    form.setValue('agencyRegistrationNo', regData.agencyRegistrationNo);
    form.setValue('agencyRegistrationDate', regData.agencyRegistrationDate);
    form.setValue('agencyRegistrationFee', regData.agencyRegistrationFee);
    form.setValue('agencyPaymentDate', regData.agencyPaymentDate);
    form.setValue('agencyChallanNo', regData.agencyChallanNo);
    form.setValue('agencyAdditionalRegFee', regData.agencyAdditionalRegFee);
    form.setValue('agencyAdditionalPaymentDate', regData.agencyAdditionalPaymentDate);
    form.setValue('agencyAdditionalChallanNo', regData.agencyAdditionalChallanNo);
    toast({ title: "Agency Registration Updated" });
    closeDialog();
  }

  const paginatedCompletedApplications = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return completedApplications.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [completedApplications, currentPage]);

  const paginatedPendingApplications = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return pendingApplications.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [pendingApplications, currentPage]);

  const totalCompletedPages = Math.ceil(completedApplications.length / ITEMS_PER_PAGE);
  const totalPendingPages = Math.ceil(pendingApplications.length / ITEMS_PER_PAGE);

  const [activeTab, setActiveTab] = useState('completed');

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const onTabChange = (value: string) => {
    setActiveTab(value);
  };
  
  const { activeRigs, cancelledRigs } = useMemo(() => {
    const active: { field: RigRegistrationType, originalIndex: number }[] = [];
    const cancelled: { field: RigRegistrationType, originalIndex: number }[] = [];
    rigFields.forEach((field, index) => {
      if (field.status === 'Cancelled') {
        cancelled.push({ field, originalIndex: index });
      } else {
        active.push({ field, originalIndex: index });
      }
    });
    return { activeRigs: active, cancelledRigs: cancelled };
  }, [rigFields]);
  
  const handleExportExcel = useCallback(async () => {
    if (filteredApplications.length === 0) {
      toast({ title: "No Data", description: "There is no data to export." });
      return;
    }
    const reportTitle = "Agency Rig Registration Report";
    const fileNamePrefix = "gwd_rig_reg_report";
    
    const headers = [
      "Sl. No.", "Agency Name & Address", "Owner & Partner Details", "Mobile No.",
      "Agency Reg. No. & Date", "Active Rigs", "Expired Rigs", "Cancelled Rigs"
    ];

    const dataForExport = filteredApplications.map((app, index) => {
        const ownerDetails = `Owner: ${app.owner.name}${app.owner.address ? `, ${app.owner.address}` : ''}`;
        const partnerDetails = (app.partners || []).map((p, i) => `Partner ${i+1}: ${p.name}${p.address ? `, ${p.address}`: ''}`).join('\n');
        const allMobiles = [app.owner.mobile, app.owner.secondaryMobile, ...(app.partners || []).flatMap(p => [p.mobile, p.secondaryMobile])].filter(Boolean).join(', ');

        const agencyRegInfo = app.agencyRegistrationNo ? `${app.agencyRegistrationNo} (${formatDateSafe(app.agencyRegistrationDate)})` : 'N/A';
        
        let activeRigsStr = '';
        let expiredRigsStr = '';
        let cancelledRigsStr = '';

        (app.rigs || []).forEach(rig => {
            const lastEffectiveDate = rig.renewals && rig.renewals.length > 0
                ? toDateOrNull([...rig.renewals].sort((a,b) => (toDateOrNull(b.renewalDate)?.getTime() ?? 0) - (toDateOrNull(a.renewalDate)?.getTime() ?? 0))[0].renewalDate)
                : toDateOrNull(rig.registrationDate);

            const validityDate = lastEffectiveDate && isValid(lastEffectiveDate)
                ? new Date(addYears(lastEffectiveDate, 1).getTime() - (24 * 60 * 60 * 1000))
                : null;
            
            const isExpired = validityDate ? new Date() > validityDate : false;
            
            const rigDetails = [
              `Type: ${rig.typeOfRig || 'N/A'}`,
              `Rig Vehicle Reg: ${rig.rigVehicle?.regNo || 'N/A'}`,
              `Compressor Vehicle Reg: ${rig.compressorVehicle?.regNo || 'N/A'}`,
              `Support Vehicle Reg: ${rig.supportingVehicle?.regNo || 'N/A'}`,
              `Validity: ${formatDateSafe(validityDate)}`
            ].join(', ');

            if (rig.status === 'Cancelled') {
                cancelledRigsStr += (cancelledRigsStr ? '\n\n' : '') + rigDetails;
            } else if (isExpired) {
                expiredRigsStr += (expiredRigsStr ? '\n\n' : '') + rigDetails;
            } else {
                activeRigsStr += (activeRigsStr ? '\n\n' : '') + rigDetails;
            }
        });

        return {
          "Sl. No.": index + 1,
          "Agency Name & Address": app.agencyName,
          "Owner & Partner Details": [ownerDetails, partnerDetails].filter(Boolean).join('\n'),
          "Mobile No.": allMobiles,
          "Agency Reg. No. & Date": agencyRegInfo,
          "Active Rigs": activeRigsStr || 'None',
          "Expired Rigs": expiredRigsStr || 'None',
          "Cancelled Rigs": cancelledRigsStr || 'None'
        };
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("RigRegistrationReport");

    worksheet.addRow([reportTitle]).commit();
    worksheet.addRow([`Report generated on: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`]).commit();
    worksheet.addRow([]).commit();

    worksheet.mergeCells('A1:H1');
    worksheet.getCell('A1').alignment = { horizontal: 'center' };
    worksheet.getRow(1).font = { bold: true, size: 16 };
    worksheet.getRow(2).font = { bold: false, size: 10 };
    worksheet.getCell('A2').alignment = { horizontal: 'center' };

    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true };
    headerRow.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F0F0F0' } };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        cell.alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' };
    });

    dataForExport.forEach(row => {
        const values = headers.map(header => row[header as keyof typeof row]);
        const newRow = worksheet.addRow(values);
        newRow.eachCell(cell => {
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            cell.alignment = { wrapText: true, vertical: 'top' };
        });
    });

    worksheet.columns.forEach((column, i) => {
        if (i > 0) { // Don't resize Sl. No.
          column.width = 30;
        }
    });
    worksheet.getColumn(1).width = 8; // Sl. No.

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileNamePrefix}_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({ title: "Excel Exported", description: `Report downloaded.` });
  }, [filteredApplications, toast]);

  if (applicationsLoading || authLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading registrations...</p>
      </div>
    );
  }
  
  if (!user) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
         <div className="space-y-6 p-6 text-center">
            <ShieldAlert className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Access Denied</h1>
            <p className="text-muted-foreground">You do not have permission to access this page.</p>
        </div>
      </div>
    );
  }

  // FORM VIEW
  if (selectedApplicationId) {
      const hasCancelledRigs = cancelledRigs.length > 0;
      
      const remarksSectionNumber = hasCancelledRigs ? 6 : 5;
      
      return (
        <div>
          <FormProvider {...form}>
            <form
              onSubmit={form.handleSubmit(
                onSubmit,
                (errors) => {
                  console.debug("Form validation errors:", errors);
                  toast({ title: "Validation Error", description: "Please check highlighted fields.", variant: "destructive" });
                }
              )}
              className="space-y-6"
            >
                <Card>
                    <CardHeader className="p-4 flex flex-row justify-end">
                        <Button type="button" variant="destructive" onClick={handleCancelForm} disabled={isSubmitting}>
                            <ArrowLeft className="mr-2 h-4 w-4"/> Back
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-8 pt-0">
                        {/* Section 1: Application Details */}
                        <Accordion type="single" collapsible defaultValue="item-1" className="w-full">
                            <AccordionItem value="item-1">
                                <AccordionTrigger className="text-xl font-semibold text-primary">1. Application Details</AccordionTrigger>
                                <AccordionContent className="pt-4 space-y-4">
                                     <div className="grid md:grid-cols-3 gap-4">
                                        <FormField name="fileNo" render={({ field }) => <FormItem><FormLabel>File No.</FormLabel><FormControl><Input {...field} value={field.value ?? ""} readOnly={isReadOnlyForForm} /></FormControl><FormMessage /></FormItem>} />
                                        <FormField name="agencyName" render={({ field }) => <FormItem className="md:col-span-2"><FormLabel>Agency Name &amp; Address</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} readOnly={isReadOnlyForForm} /></FormControl><FormMessage /></FormItem>} />
                                    </div>
                                    <Separator />
                                     <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <h4 className="font-medium">Owner Details</h4>
                                            {!isReadOnlyForForm && (
                                                <Button type="button" variant="outline" size="sm" onClick={() => openDialog('addPartner', { index: 'new' })}><UserPlus className="mr-2 h-4 w-4"/> Add Partner</Button>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-2 border rounded-md items-end">
                                            <FormItem className="md:col-span-1">
                                                <FormLabel>Name &amp; Address of Owner</FormLabel>
                                                <FormControl>
                                                <Textarea {...form.register("owner.name")} className="min-h-[40px]" readOnly={isReadOnlyForForm} />
                                                </FormControl>
                                                <FormMessage>{form.formState.errors.owner?.name?.message}</FormMessage>
                                            </FormItem>
                                            <FormField name="owner.mobile" render={({ field }) => <FormItem><FormLabel>Mobile No.</FormLabel><FormControl><Input {...field} value={field.value ?? ""} readOnly={isReadOnlyForForm} /></FormControl><FormMessage /></FormItem>} />
                                            <FormField name="owner.secondaryMobile" render={({ field }) => <FormItem><FormLabel>Secondary Mobile No.</FormLabel><FormControl><Input {...field} value={field.value ?? ""} readOnly={isReadOnlyForForm} /></FormControl><FormMessage /></FormItem>} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        
                                        {partnerFields.length > 0 ? (
                                            <div className="space-y-2">
                                                {partnerFields.map((field, index) => (
                                                    <div key={field.id} className="flex items-center justify-between p-3 border rounded-lg bg-secondary/20">
                                                        <div>
                                                            <p className="font-semibold">{field.name}</p>
                                                            <p className="text-sm text-muted-foreground">{field.mobile}</p>
                                                        </div>
                                                        {!isReadOnlyForForm && (
                                                            <div className="flex items-center gap-1">
                                                                <Button type="button" variant="ghost" size="icon" onClick={() => openDialog('editPartner', { index, partner: field })}><Edit className="h-4 w-4"/></Button>
                                                                <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => setDeletingPartnerIndex(index)}><Trash2 className="h-4 w-4"/></Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground text-center py-4">No partners added.</p>
                                        )}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                         
                        <Accordion type="single" collapsible defaultValue="item-1">
                            <AccordionItem value="item-1">
                                <AccordionTrigger className="text-xl font-semibold text-primary">
                                    <div className="flex justify-between items-center w-full">
                                        <span>2. Application Fees</span>
                                        {!isReadOnlyForForm && (
                                            <Button type="button" variant="outline" size="sm" className="mr-4" onClick={(e) => { e.stopPropagation(); openDialog('addFee', {}) }}>
                                                <PlusCircle className="mr-2 h-4 w-4" /> Add Application Fee
                                            </Button>
                                        )}
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="pt-4 space-y-4">
                                    {feeFields.length > 0 ? feeFields.map((field, index) => (
                                        <div key={field.id} className="p-4 border rounded-lg bg-secondary/20">
                                          <div className="flex justify-between items-center mb-2">
                                             <div className="flex items-center gap-3">
                                                <div className="font-bold text-sm text-muted-foreground">Sl. No. {index + 1}</div>
                                                <h4 className="font-medium text-primary">{field.applicationFeeType || 'Not Set'}</h4>
                                             </div>
                                            {!isReadOnlyForForm && (
                                                <div className="flex items-center gap-1">
                                                    <Button type="button" variant="ghost" size="icon" onClick={() => openDialog('editFee', { index, fee: field })}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => setDeletingFeeIndex(index)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            )}
                                          </div>
                                          <dl className="grid md:grid-cols-3 gap-4 border-t pt-2">
                                            <DetailRow label="Type of Application" value={field.applicationFeeType} />
                                            <DetailRow label="Fees Amount" value={field.applicationFeeAmount} />
                                            <DetailRow label="Payment Date" value={field.applicationFeePaymentDate} />
                                            <div className="md:col-span-3"><DetailRow label="Challan No." value={field.applicationFeeChallanNo} /></div>
                                          </dl>
                                        </div>
                                    )) : (
                                        <p className="text-sm text-muted-foreground text-center py-4">No application fees added.</p>
                                    )}
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>

                        {/* Section 2: Agency Registration */}
                        <Accordion type="single" collapsible defaultValue="item-1">
                          <AccordionItem value="item-1">
                            <AccordionTrigger className="text-xl font-semibold text-primary">
                                <div className="flex justify-between items-center w-full">
                                    <span>3. Agency Registration</span>
                                    {!isReadOnlyForForm && (
                                        <Button type="button" variant="outline" size="sm" className="mr-4" onClick={(e) => { e.stopPropagation(); openDialog('editAgencyReg', { regData: form.getValues() }) }}>
                                            <Edit className="mr-2 h-4 w-4" /> Add
                                        </Button>
                                    )}
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-4 space-y-4">
                               <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-4">
                                <DetailRow label="Agency Reg. No." value={form.watch('agencyRegistrationNo')} />
                                <DetailRow label="Reg. Date" value={form.watch('agencyRegistrationDate')} />
                                <DetailRow label="Reg. Fee" value={form.watch('agencyRegistrationFee')} />
                                <DetailRow label="Payment Date" value={form.watch('agencyPaymentDate')} />
                                <DetailRow label="Challan No." value={form.watch('agencyChallanNo')} />
                                <div className="col-span-full border-t pt-4 mt-2"></div>
                                <DetailRow label="Additional Reg. Fee" value={form.watch('agencyAdditionalRegFee')} />
                                <DetailRow label="Additional Payment Date" value={form.watch('agencyAdditionalPaymentDate')} />
                                <DetailRow label="Additional Challan No." value={form.watch('agencyAdditionalChallanNo')} />
                               </dl>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                        
                        <Accordion type="single" collapsible defaultValue="item-1">
                            <AccordionItem value="item-1">
                                <AccordionTrigger className="text-xl font-semibold text-primary">
                                    <div className="flex justify-between items-center w-full">
                                        <span>4. Rig Registration ({activeRigs.length} Active)</span>
                                        {!isReadOnlyForForm && (
                                            <Button type="button" variant="outline" size="sm" className="mr-4" onClick={(e) => { e.stopPropagation(); handleAddRig(); }}>
                                                <PlusCircle className="mr-2 h-4 w-4" /> Add Rig
                                            </Button>
                                        )}
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="pt-4 space-y-4">
                                <Accordion type="multiple" className="w-full space-y-2">
                                    {activeRigs.map(({ field, originalIndex }, displayIndex) => (
                                    <RigAccordionItem
                                        key={field.id}
                                        field={field}
                                        index={originalIndex}
                                        displayIndex={displayIndex}
                                        isReadOnly={isReadOnlyForForm}
                                        onRemove={isEditor ? removeRig : undefined}
                                        openDialog={openDialog}
                                        onEditRenewal={handleEditRenewal}
                                        onDeleteRenewal={handleDeleteRenewal}
                                        form={form}
                                    />
                                    ))}
                                </Accordion>
                                {!isReadOnlyForForm && isEditor && activeRigCount >= 3 && <p className="text-sm text-muted-foreground mt-4">A maximum of 3 active rigs are allowed.</p>}
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                        
                        {hasCancelledRigs && (
                            <Accordion type="single" collapsible defaultValue="item-1">
                                <AccordionItem value="item-1">
                                <AccordionTrigger className="text-xl font-semibold text-destructive">5. Cancelled Rigs ({cancelledRigs.length})</AccordionTrigger>
                                <AccordionContent className="pt-4 space-y-4">
                                    <Accordion type="multiple" className="w-full space-y-2">
                                    {cancelledRigs.map(({ field, originalIndex }, displayIndex) => (
                                        <RigAccordionItem
                                        key={field.id}
                                        field={field}
                                        index={originalIndex}
                                        displayIndex={displayIndex}
                                        isReadOnly={isReadOnlyForForm}
                                        onRemove={isEditor ? removeRig : undefined}
                                        openDialog={openDialog}
                                        onEditRenewal={handleEditRenewal}
                                        onDeleteRenewal={handleDeleteRenewal}
                                        form={form}
                                        />
                                    ))}
                                    </Accordion>
                                </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        )}

                        <Separator />

                        <FormField
                            name="remarks"
                            control={form.control}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xl font-semibold text-primary">{remarksSectionNumber}. Remarks</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            {...field}
                                            value={field.value ?? ""}
                                            readOnly={isReadOnlyForForm}
                                            placeholder="Add any final remarks for this agency registration..."
                                            rows={4}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />


                    </CardContent>
                    {!isReadOnlyForForm && (
                      <CardFooter className="flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={handleCancelForm} disabled={isSubmitting}><X className="mr-2 h-4 w-4"/> Cancel</Button>
                          <Button type="submit" disabled={isSubmitting}><Save className="mr-2 h-4 w-4"/> {isSubmitting ? "Saving..." : (selectedApplicationId === 'new' ? 'Save Registration' : 'Save Changes')}</Button>
                      </CardFooter>
                    )}
                </Card>
            </form>
            <Dialog open={dialogState.type === 'editAgencyReg'} onOpenChange={(isOpen) => !isOpen && closeDialog()}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Add Agency Registration</DialogTitle>
                    </DialogHeader>
                    <AgencyRegistrationDialogContent
                        initialData={dialogState.data?.regData}
                        onConfirm={handleConfirmAgencyReg}
                        onCancel={closeDialog}
                    />
                </DialogContent>
            </Dialog>
             <Dialog open={dialogState.type === 'renew' || dialogState.type === 'editRenewal'} onOpenChange={(isOpen) => !isOpen && closeDialog()}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{dialogState.type === 'editRenewal' ? 'Edit Renewal' : 'Renew Rig Registration'}</DialogTitle>
                        <DialogDescription>Enter renewal details for the rig.</DialogDescription>
                    </DialogHeader>
                    <RenewalDialogContent
                        initialData={dialogState.data?.renewal ?? { renewalDate: format(new Date(), 'yyyy-MM-dd') }}
                        onConfirm={handleConfirmRenewal}
                        onCancel={closeDialog}
                    />
                </DialogContent>
            </Dialog>
            <Dialog open={dialogState.type === 'editFee' || dialogState.type === 'addFee'} onOpenChange={(isOpen) => !isOpen && closeDialog()}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{dialogState.type === 'addFee' ? 'Add Application Fee' : 'Edit Application Fee'}</DialogTitle>
                    </DialogHeader>
                    <ApplicationFeeDialogContent
                        initialData={dialogState.type === 'editFee' ? dialogState.data?.fee : createDefaultFee()}
                        onConfirm={handleConfirmFeeChange}
                        onCancel={closeDialog}
                    />
                </DialogContent>
            </Dialog>
            <Dialog open={dialogState.type === 'addPartner' || dialogState.type === 'editPartner'} onOpenChange={(isOpen) => !isOpen && closeDialog()}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{dialogState.type === 'addPartner' ? 'Add New Partner' : 'Edit Partner'}</DialogTitle>
                    </DialogHeader>
                    <PartnerDialogContent
                        initialData={dialogState.type === 'editPartner' ? dialogState.data?.partner : createDefaultOwner()}
                        onConfirm={handleConfirmPartner}
                        onCancel={closeDialog}
                    />
                </DialogContent>
            </Dialog>
            <AlertDialog open={deletingPartnerIndex !== null} onOpenChange={() => setDeletingPartnerIndex(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>This will remove this partner from the list. This action cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <Button variant="outline" onClick={() => setDeletingPartnerIndex(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmDeletePartner}>Delete</Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={deletingFeeIndex !== null} onOpenChange={() => setDeletingFeeIndex(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>This will remove this application fee from the form. This action cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <Button variant="outline" onClick={() => setDeletingFeeIndex(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmDeleteFee}>Delete</Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={dialogState.type === 'cancel'} onOpenChange={(isOpen) => !isOpen && closeDialog()}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Rig Registration</AlertDialogTitle>
                        <AlertDialogDescription>
                            Provide a reason and date for cancelling this rig. This action can be reversed later.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    {dialogState.type === 'cancel' && dialogState.data && (
                      <CancellationDialogContent
                          initialData={rigFields[dialogState.data.rigIndex]}
                          onConfirm={handleConfirmCancellation}
                          onCancel={closeDialog}
                      />
                    )}
                </AlertDialogContent>
            </AlertDialog>
             <AlertDialog open={dialogState.type === 'deleteRig'} onOpenChange={(isOpen) => !isOpen && closeDialog()}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently remove this rig from the form. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <Button variant="outline" onClick={closeDialog}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmDeleteRig}>Delete</Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={dialogState.type === 'activate'} onOpenChange={(isOpen) => !isOpen && closeDialog()}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Activate Rig</AlertDialogTitle>
                        <AlertDialogDescription>Are you sure you want to reactivate this rig?</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <Button variant="outline" onClick={closeDialog}>Cancel</Button>
                        <Button variant="default" onClick={handleActivateRig}>Activate</Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={!!deletingRenewal} onOpenChange={() => setDeletingRenewal(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete this renewal record. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                       <Button variant="outline" onClick={() => setDeletingRenewal(null)}>Cancel</Button>
                       <Button variant="destructive" onClick={handleConfirmDeleteRenewal}>Delete</Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
             <Dialog open={dialogState.type === 'editRigDetails' || dialogState.type === 'addRig'} onOpenChange={(isOpen) => !isOpen && closeDialog()}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>{dialogState.type === 'addRig' ? 'Add New Rig' : 'Edit Rig Details'}</DialogTitle>
                        <DialogDescription>
                            {dialogState.type === 'addRig' ? 'Enter the details for the new rig.' : 'Modify the registration and optional details for this rig.'}
                        </DialogDescription>
                    </DialogHeader>
                    {(dialogState.type === 'editRigDetails' || dialogState.type === 'addRig') && (
                        <RigDetailsDialog
                            form={form}
                            rigIndex={dialogState.data.rigIndex}
                            onConfirm={handleConfirmRigDetails}
                            onCancel={closeDialog}
                            isAdding={dialogState.type === 'addRig'}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </FormProvider>
      </div>
      );
  }

  // LIST VIEW
  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative flex-grow w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                    type="search" 
                    placeholder="Search by Agency, Owner, File No, or Rig No..." 
                    className="w-full rounded-lg bg-background pl-10 shadow-sm" 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                />
              </div>
              <div className="flex items-center gap-2">
                {canEdit && (
                  <Button onClick={handleAddNew} className="shrink-0 w-full sm:w-auto">
                      <FilePlus className="mr-2 h-4 w-4" /> Add New Registration
                  </Button>
                )}
                <Button onClick={handleExportExcel} variant="outline" className="shrink-0 w-full sm:w-auto">
                    <FileDown className="mr-2 h-4 w-4" /> Export Excel
                </Button>
              </div>
          </div>
          <Tabs defaultValue="completed" onValueChange={onTabChange} className="pt-4 border-t">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="completed">
                    <div className="flex items-center gap-2">Registration Completed <Badge>{completedApplications.length}</Badge></div>
                </TabsTrigger>
                <TabsTrigger value="pending">
                    <div className="flex items-center gap-2">Pending Applications <Badge>{pendingApplications.length}</Badge></div>
                </TabsTrigger>
            </TabsList>
            <TabsContent value="completed" className="mt-4">
                {totalCompletedPages > 1 && (
                    <div className="flex items-center justify-center py-4">
                        <PaginationControls currentPage={currentPage} totalPages={totalCompletedPages} onPageChange={setCurrentPage} />
                    </div>
                )}
                <RegistrationTable 
                    applications={paginatedCompletedApplications}
                    onView={handleView}
                    onEdit={handleEdit}
                    onDelete={handleDeleteApplication}
                    searchTerm={searchTerm}
                    canEdit={canEdit}
                    currentPage={currentPage}
                    itemsPerPage={ITEMS_PER_PAGE}
                />
                 {totalCompletedPages > 1 && (
                    <div className="flex items-center justify-center py-4">
                        <PaginationControls currentPage={currentPage} totalPages={totalCompletedPages} onPageChange={setCurrentPage} />
                    </div>
                )}
            </TabsContent>
            <TabsContent value="pending" className="mt-4">
                 {totalPendingPages > 1 && (
                    <div className="flex items-center justify-center py-4">
                        <PaginationControls currentPage={currentPage} totalPages={totalPendingPages} onPageChange={setCurrentPage} />
                    </div>
                )}
                <RegistrationTable 
                    applications={paginatedPendingApplications}
                    onView={handleView}
                    onEdit={handleEdit}
                    onDelete={handleDeleteApplication}
                    searchTerm={searchTerm}
                    canEdit={canEdit}
                    currentPage={currentPage}
                    itemsPerPage={ITEMS_PER_PAGE}
                    isPendingTable={true}
                />
                 {totalPendingPages > 1 && (
                    <div className="flex items-center justify-center py-4">
                        <PaginationControls currentPage={currentPage} totalPages={totalPendingPages} onPageChange={setCurrentPage} />
                    </div>
                )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      <AlertDialog open={!!deletingApplicationId} onOpenChange={() => setDeletingApplicationId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete the registration for <strong>{applications.find((a: AgencyApplication) => a.id === deletingApplicationId)?.agencyName}</strong>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setDeletingApplicationId(null)} disabled={isSubmitting}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDeleteApplication} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <span>Delete</span>}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ViewDialog
        isOpen={dialogState.type === 'view'}
        onClose={closeDialog}
        application={dialogState.type === 'view' ? dialogState.data : null}
      />
    </div>
  );
}

function AgencyRegistrationDialogContent({ initialData, onConfirm, onCancel }: { initialData: Partial<AgencyApplication>, onConfirm: (data: any) => void, onCancel: () => void }) {
    const [data, setData] = useState({
        agencyRegistrationNo: initialData?.agencyRegistrationNo ?? '',
        agencyRegistrationDate: formatDateForInput(toDateOrNull(initialData?.agencyRegistrationDate)),
        agencyRegistrationFee: initialData?.agencyRegistrationFee,
        agencyPaymentDate: formatDateForInput(toDateOrNull(initialData?.agencyPaymentDate)),
        agencyChallanNo: initialData?.agencyChallanNo ?? '',
        agencyAdditionalRegFee: initialData?.agencyAdditionalRegFee,
        agencyAdditionalPaymentDate: formatDateForInput(toDateOrNull(initialData?.agencyAdditionalPaymentDate)),
        agencyAdditionalChallanNo: initialData?.agencyAdditionalChallanNo ?? '',
    });

    return (
      <>
        <ScrollArea className="max-h-[60vh] p-1">
          <div className="space-y-6 p-4">
            <div className="space-y-4 rounded-lg border p-4">
                <div className="grid grid-cols-3 gap-4 items-end">
                    <div className="col-span-2 space-y-2">
                        <Label htmlFor="agencyRegistrationNo">Agency Reg. No.</Label>
                        <Input id="agencyRegistrationNo" value={data.agencyRegistrationNo} onChange={(e) => setData(d => ({ ...d, agencyRegistrationNo: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="agencyRegistrationDate">Reg. Date</Label>
                        <Input id="agencyRegistrationDate" type="date" value={data.agencyRegistrationDate} onChange={(e) => setData(d => ({ ...d, agencyRegistrationDate: e.target.value }))} />
                    </div>
                </div>
            </div>
            
            <div className="space-y-4 rounded-lg border p-4">
                 <h4 className="font-medium text-primary">Registration Fee Details</h4>
                 <div className="grid grid-cols-1 gap-4 md:grid-cols-3 pt-4 border-t">
                    <div className="space-y-2">
                      <Label htmlFor="agencyRegistrationFee">Reg. Fee</Label>
                      <Input id="agencyRegistrationFee" type="number" value={data.agencyRegistrationFee ?? ''} onChange={(e) => setData(d => ({ ...d, agencyRegistrationFee: e.target.value === '' ? undefined : +e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="agencyPaymentDate">Payment Date</Label>
                      <Input id="agencyPaymentDate" type="date" value={data.agencyPaymentDate} onChange={(e) => setData(d => ({ ...d, agencyPaymentDate: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="agencyChallanNo">Challan No.</Label>
                      <Input id="agencyChallanNo" value={data.agencyChallanNo} onChange={(e) => setData(d => ({ ...d, agencyChallanNo: e.target.value }))} />
                    </div>
                </div>
            </div>
            <div className="space-y-4 rounded-lg border p-4">
                 <h4 className="font-medium text-primary">Additional Registration Fee</h4>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3 pt-4 border-t">
                        <div className="space-y-2">
                        <Label htmlFor="agencyAdditionalRegFee">Additional Reg. Fee</Label>
                        <Input id="agencyAdditionalRegFee" type="number" value={data.agencyAdditionalRegFee ?? ''} onChange={(e) => setData(d => ({ ...d, agencyAdditionalRegFee: e.target.value === '' ? undefined : +e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="agencyAdditionalPaymentDate">Payment Date</Label>
                        <Input id="agencyAdditionalPaymentDate" type="date" value={data.agencyAdditionalPaymentDate} onChange={(e) => setData(d => ({ ...d, agencyAdditionalPaymentDate: e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="agencyAdditionalChallanNo">Challan No.</Label>
                        <Input id="agencyAdditionalChallanNo" value={data.agencyAdditionalChallanNo} onChange={(e) => setData(d => ({ ...d, agencyAdditionalChallanNo: e.target.value }))} />
                        </div>
                    </div>
            </div>
          </div>
        </ScrollArea>
        <DialogFooter className="mt-4">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="button" onClick={() => onConfirm(data)}>Save Changes</Button>
        </DialogFooter>
      </>
    );
}

function ApplicationFeeDialogContent({ initialData, onConfirm, onCancel }: { initialData?: Partial<ApplicationFee>, onConfirm: (data: any) => void, onCancel: () => void }) {
    const { toast } = useToast();
    const [data, setData] = useState({
        ...initialData,
        applicationFeePaymentDate: formatDateForInput(initialData?.applicationFeePaymentDate),
    });

    const handleConfirm = () => {
        if (!data.applicationFeeType) {
            toast({ title: "Validation Error", description: "Please select a type of application.", variant: "destructive" });
            return;
        }
        onConfirm({ ...data, id: data.id || uuidv4() });
    };

    return (
        <>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label>Type of Application</Label>
                    <Select onValueChange={(value) => setData(d => ({ ...d, applicationFeeType: value as ApplicationFeeType }))} value={data.applicationFeeType}>
                        <SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger>
                        <SelectContent>{applicationFeeTypes.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Fees Amount</Label>
                    <Input type="number" value={data.applicationFeeAmount ?? ''} onChange={(e) => setData(d => ({ ...d, applicationFeeAmount: e.target.value === '' ? undefined : +e.target.value }))} />
                </div>
                <div className="space-y-2">
                    <Label>Payment Date</Label>
                    <Input type="date" value={data.applicationFeePaymentDate ?? ''} onChange={(e) => setData(d => ({ ...d, applicationFeePaymentDate: e.target.value }))} />
                </div>
                <div className="space-y-2">
                    <Label>Challan No.</Label>
                    <Input value={data.applicationFeeChallanNo ?? ''} onChange={(e) => setData(d => ({ ...d, applicationFeeChallanNo: e.target.value }))} />
                </div>
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
                <Button type="button" onClick={handleConfirm}>Confirm</Button>
            </DialogFooter>
        </>
    );
}

function RenewalDialogContent({ initialData, onConfirm, onCancel }: { initialData: Partial<RigRenewalFormData>, onConfirm: (data: any) => void, onCancel: () => void }) {
  const [data, setData] = useState({
    renewalDate: formatDateForInput(toDateOrNull(initialData.renewalDate)),
    paymentDate: formatDateForInput(toDateOrNull(initialData.paymentDate)),
    renewalFee: initialData.renewalFee,
    challanNo: initialData.challanNo,
  });

  const handleConfirm = () => {
    onConfirm({ ...initialData, ...data });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value, type } = e.target as HTMLInputElement;
    setData(prev => ({
      ...prev,
      [id]: type === 'number' ? (value === '' ? undefined : +value) : value,
    }));
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="renewalDate">Renewal Date</Label>
          <Input id="renewalDate" type="date" value={data.renewalDate} onChange={handleChange} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="renewalFee">Renewal Fee</Label>
          <Input id="renewalFee" type="number" value={data.renewalFee ?? ''} onChange={handleChange} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="paymentDate">Payment Date</Label>
          <Input id="paymentDate" type="date" value={data.paymentDate} onChange={handleChange} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="challanNo">Challan No.</Label>
          <Input id="challanNo" value={data.challanNo ?? ''} onChange={handleChange} />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="button" onClick={handleConfirm}>Confirm</Button>
      </DialogFooter>
    </>
  );
}

function CancellationDialogContent({ initialData, onConfirm, onCancel }: { initialData: Partial<RigRegistrationType>, onConfirm: (data: any) => void, onCancel: () => void }) {
    const [cancellationData, setCancellationData] = useState({ 
        reason: initialData?.cancellationReason ?? '', 
        date: initialData?.cancellationDate ? format(toDateOrNull(initialData.cancellationDate)!, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
    });
    
    return (
        <>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="cancellationReason">Reason</Label>
                    <Textarea id="cancellationReason" value={cancellationData.reason} onChange={(e) => setCancellationData(d => ({ ...d, reason: e.target.value }))} placeholder="Enter reason" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="cancellationDate">Date</Label>
                    <Input id="cancellationDate" type="date" value={cancellationData.date} onChange={(e) => setCancellationData(d => ({ ...d, date: e.target.value }))} />
                </div>
            </div>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onConfirm(cancellationData)}>Confirm Cancellation</AlertDialogAction>
            </AlertDialogFooter>
        </>
    );
}

const ViewDetailRow = ({ label, value }: { label: string; value: any }) => {
  if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
    return null;
  }

  let displayValue = String(value);
  const isDate = label.toLowerCase().includes('date') || label.toLowerCase().includes('validity');
  
  if (isDate) {
    const date = toDateOrNull(value);
    displayValue = date ? format(date, 'dd/MM/yyyy') : 'N/A';
    if(displayValue === 'N/A' && String(value)) displayValue = String(value); // fallback for non-standard date strings
  } else if (typeof value === 'number') {
    displayValue = value.toLocaleString('en-IN');
  } else if (typeof value === 'boolean') {
    displayValue = value ? 'Yes' : 'No';
  } else if (typeof value === 'object' && value !== null) {
      displayValue = Object.entries(value)
        .map(([key, val]) => (val ? `${key}: ${val}` : null))
        .filter(Boolean)
        .join(', ');
      if (!displayValue) return null;
  }

  return (
    <div className="grid grid-cols-3 gap-4 py-1.5 border-b last:border-b-0">
      <dt className="text-sm font-medium text-muted-foreground col-span-1">{label}</dt>
      <dd className="text-sm col-span-2 break-words">{displayValue}</dd>
    </div>
  );
};


function ViewDialog({ isOpen, onClose, application }: { isOpen: boolean; onClose: () => void; application: AgencyApplication | null }) {
    if (!application) return null;

    const detailSections = [
        { title: "Application Details", data: { "File No": application.fileNo, "Agency Name & Address": application.agencyName, Status: application.status } },
        { title: "Owner Details", data: application.owner },
        ...(application.partners?.map((p, i) => ({ title: `Partner #${i + 1}`, data: p })) || []),
        { title: "Agency Registration", data: { "Agency Reg. No": application.agencyRegistrationNo, "Reg. Date": application.agencyRegistrationDate, "Reg. Fee": application.agencyRegistrationFee, "Payment Date": application.agencyPaymentDate, "Challan No": application.agencyChallanNo, "Additional Reg. Fee": application.agencyAdditionalRegFee, "Additional Payment Date": application.agencyAdditionalPaymentDate, "Additional Challan No.": application.agencyAdditionalChallanNo, } },
    ];
    
    const camelCaseToTitle = (s: string) => {
        const result = s.replace(/([A-Z])/g, ' $1');
        return result.charAt(0).toUpperCase() + result.slice(1);
    };

    const activeRigs = (application.rigs || []).filter(rig => rig.status === 'Active');
    const cancelledRigs = (application.rigs || []).filter(rig => rig.status === 'Cancelled');
    
    const RigDetails = ({ rig, index }: { rig: RigRegistrationType; index: number }) => {
        const lastEffDate = rig.renewals && rig.renewals.length > 0 ? [...rig.renewals].sort((a,b) => new Date(b.renewalDate).getTime() - new Date(a.renewalDate).getTime())[0].renewalDate : rig.registrationDate;
        const validityDate = lastEffDate ? new Date(addYears(new Date(lastEffDate), 1).getTime() - 24 * 60 * 60 * 1000) : null;

        const rigDetails = [
            { title: `Rig #${index + 1} - ${rig.typeOfRig || 'N/A'} (${rig.status})`, data: { "Rig Reg. No": rig.rigRegistrationNo, "Type": rig.typeOfRig, "Last Reg./Renewal": rig.registrationDate, "Validity Upto": validityDate, "Reg. Fee": rig.registrationFee, "Payment Date": rig.paymentDate, "Challan No": rig.challanNo, "Additional Fee": rig.additionalRegistrationFee, "Additional Payment Date": rig.additionalPaymentDate, "Additional Challan No.": rig.additionalChallanNo, "Status": rig.status} },
            { title: "Cancellation Details", data: { "Reason": rig.cancellationReason, "Date": rig.cancellationDate }, condition: rig.status === 'Cancelled' },
            { title: "Rig Vehicle", data: rig.rigVehicle },
            { title: "Compressor Vehicle", data: rig.compressorVehicle },
            { title: "Supporting Vehicle", data: rig.supportingVehicle },
            { title: "Compressor", data: rig.compressorDetails },
            { title: "Generator", data: rig.generatorDetails },
        ];

        return (
            <div className="mt-4 pt-4 border-t">
                {rigDetails.filter(s => s.condition !== false).map((section, sIdx) => {
                    if (!section.data || Object.values(section.data).every(v => v === null || v === undefined || v === '')) return null;
                    return (
                    <div key={sIdx} className="mb-4">
                        <h4 className="text-base font-semibold text-primary mb-2">{section.title}</h4>
                        <dl className="space-y-1">
                            {Object.entries(section.data).map(([key, value]) => <ViewDetailRow key={key} label={camelCaseToTitle(key)} value={value} />)}
                        </dl>
                    </div>
                )})}
                
                 {rig.renewals && rig.renewals.length > 0 && (
                    <div>
                        <h4 className="text-base font-semibold text-primary mb-2">Renewal History</h4>
                        <Table>
                            <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Date</TableHead><TableHead>Validity</TableHead><TableHead>Fee</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {rig.renewals.map((r, rIdx) => {
                                    const validity = r.renewalDate ? new Date(addYears(new Date(r.renewalDate), 1).getTime() - 24 * 60 * 60 * 1000) : null;
                                    return (
                                    <TableRow key={r.id}>
                                        <TableCell>{rIdx + 1}</TableCell>
                                        <TableCell>{r.renewalDate ? format(new Date(r.renewalDate), 'dd/MM/yyyy') : 'N/A'}</TableCell>
                                        <TableCell>{validity ? format(validity, 'dd/MM/yyyy') : 'N/A'}</TableCell>
                                        <TableCell>{r.renewalFee?.toLocaleString('en-IN') ?? 'N/A'}</TableCell>
                                    </TableRow>
                                )})}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>
        )
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl p-0 flex flex-col h-[90vh]">
                <DialogHeader className="p-6 pb-4 border-b">
                    <DialogTitle>View Registration: {application.agencyName}</DialogTitle>
                    <DialogDescription>A summary of the registration details.</DialogDescription>
                </DialogHeader>
                <div className="flex-1 min-h-0">
                  <ScrollArea className="h-full">
                      <div className="space-y-6 px-6 py-4">
                        {detailSections.map((section, idx) => (
                            <div key={idx}>
                                <h4 className="text-base font-semibold text-primary mb-2">{section.title}</h4>
                                <dl className="space-y-1">
                                    {Object.entries(section.data).map(([key, value]) => <ViewDetailRow key={key} label={camelCaseToTitle(key)} value={value} />)}
                                </dl>
                            </div>
                        ))}
                        
                        {(application.applicationFees && application.applicationFees.length > 0) && (
                            <div>
                                <h4 className="text-base font-semibold text-primary mb-2">Application Fees</h4>
                                {application.applicationFees.map((fee, idx) => (
                                    <div key={fee.id} className="mb-2 p-2 border-t">
                                        <ViewDetailRow label={`Fee #${idx + 1} Type`} value={fee.applicationFeeType} />
                                        <ViewDetailRow label="Fee Amount" value={fee.applicationFeeAmount} />
                                        <ViewDetailRow label="Payment Date" value={fee.applicationFeePaymentDate} />
                                        <ViewDetailRow label="Challan No." value={fee.applicationFeeChallanNo} />
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        {activeRigs.length > 0 && (
                          <div className="pt-4 mt-4 border-t">
                            <h3 className="text-xl font-bold text-primary mb-2">Active Rigs ({activeRigs.length})</h3>
                            {activeRigs.map((rig, idx) => <RigDetails key={rig.id} rig={rig} index={idx} />)}
                          </div>
                        )}

                        {cancelledRigs.length > 0 && (
                           <div className="pt-4 mt-4 border-t">
                             <h3 className="text-xl font-bold text-destructive mb-2">Cancelled Rigs ({cancelledRigs.length})</h3>
                             {cancelledRigs.map((rig, idx) => <RigDetails key={rig.id} rig={rig} index={idx} />)}
                           </div>
                        )}

                         {application.remarks && (
                            <div className="pt-4 mt-4 border-t">
                                <h3 className="text-base font-semibold text-primary mb-2">Remarks</h3>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{application.remarks}</p>
                            </div>
                         )}
                    </div>
                  </ScrollArea>
                </div>
                <DialogFooter className="p-6 pt-4 border-t">
                    <DialogClose asChild>
                        <Button>Close</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function RigDetailsDialog({ form, rigIndex, onConfirm, onCancel, isAdding }: { form: UseFormReturn<any>, rigIndex?: number, onConfirm: (data: any) => void, onCancel: () => void, isAdding?: boolean }) {
    const currentRigData = rigIndex !== undefined ? form.getValues(`rigs.${rigIndex}`) : createDefaultRig();
    const [localRigData, setLocalRigData] = useState<RigRegistrationType>(currentRigData);

    const handleConfirm = () => {
        onConfirm(localRigData);
    };

    return (
        <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-6 py-4">
                <Card>
                    <CardHeader><CardTitle>Registration Details</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid md:grid-cols-3 gap-4">
                            <FormItem><FormLabel>Rig Reg. No.</FormLabel><Input value={localRigData.rigRegistrationNo ?? ""} onChange={e => setLocalRigData(d => ({ ...d, rigRegistrationNo: e.target.value }))} /></FormItem>
                            <FormItem>
                                <FormLabel>Type of Rig</FormLabel>
                                <Select onValueChange={(value) => setLocalRigData(d => ({ ...d, typeOfRig: value as RigType }))} value={localRigData.typeOfRig}>
                                    <SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger>
                                    <SelectContent>{rigTypeOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                </Select>
                            </FormItem>
                            <FormItem><FormLabel>Last Reg/Renewal Date</FormLabel><Input type="date" value={formatDateForInput(localRigData.registrationDate)} onChange={e => setLocalRigData(d => ({ ...d, registrationDate: e.target.value ? new Date(e.target.value) : null }))} /></FormItem>
                        </div>
                        <div className="grid md:grid-cols-3 gap-4">
                            <FormItem><FormLabel>Reg. Fee</FormLabel><Input type="number" value={localRigData.registrationFee ?? ""} onChange={e => setLocalRigData(d => ({ ...d, registrationFee: e.target.value === '' ? undefined : +e.target.value }))} /></FormItem>
                            <FormItem><FormLabel>Payment Date</FormLabel><Input type="date" value={formatDateForInput(localRigData.paymentDate)} onChange={e => setLocalRigData(d => ({ ...d, paymentDate: e.target.value ? new Date(e.target.value) : null }))} /></FormItem>
                            <FormItem><FormLabel>Challan No.</FormLabel><Input value={localRigData.challanNo ?? ""} onChange={e => setLocalRigData(d => ({ ...d, challanNo: e.target.value }))} /></FormItem>
                        </div>
                        <Separator />
                        <div className="grid md:grid-cols-3 gap-4">
                            <FormItem><FormLabel>Additional Reg. Fee</FormLabel><Input type="number" value={localRigData.additionalRegistrationFee ?? ""} onChange={e => setLocalRigData(d => ({ ...d, additionalRegistrationFee: e.target.value === '' ? undefined : +e.target.value }))} /></FormItem>
                            <FormItem><FormLabel>Payment Date</FormLabel><Input type="date" value={formatDateForInput(localRigData.additionalPaymentDate)} onChange={e => setLocalRigData(d => ({ ...d, additionalPaymentDate: e.target.value ? new Date(e.target.value) : null }))} /></FormItem>
                            <FormItem><FormLabel>Challan No.</FormLabel><Input value={localRigData.additionalChallanNo ?? ""} onChange={e => setLocalRigData(d => ({ ...d, additionalChallanNo: e.target.value }))} /></FormItem>
                        </div>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader><CardTitle>Optional Details</CardTitle></CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2"><h4 className="font-medium text-primary">Rig Vehicle</h4><div className="grid md:grid-cols-4 gap-4"><FormItem><FormLabel>Type</FormLabel><Input value={localRigData.rigVehicle?.type ?? ""} onChange={e => setLocalRigData(d => ({...d, rigVehicle: {...d.rigVehicle, type: e.target.value}}))} /></FormItem><FormItem><FormLabel>Reg No</FormLabel><Input value={localRigData.rigVehicle?.regNo ?? ""} onChange={e => setLocalRigData(d => ({...d, rigVehicle: {...d.rigVehicle, regNo: e.target.value}}))} /></FormItem><FormItem><FormLabel>Chassis No</FormLabel><Input value={localRigData.rigVehicle?.chassisNo ?? ""} onChange={e => setLocalRigData(d => ({...d, rigVehicle: {...d.rigVehicle, chassisNo: e.target.value}}))} /></FormItem><FormItem><FormLabel>Engine No</FormLabel><Input value={localRigData.rigVehicle?.engineNo ?? ""} onChange={e => setLocalRigData(d => ({...d, rigVehicle: {...d.rigVehicle, engineNo: e.target.value}}))} /></FormItem></div></div>
                        <div className="space-y-2"><h4 className="font-medium text-primary">Compressor Vehicle</h4><div className="grid md:grid-cols-4 gap-4"><FormItem><FormLabel>Type</FormLabel><Input value={localRigData.compressorVehicle?.type ?? ""} onChange={e => setLocalRigData(d => ({...d, compressorVehicle: {...d.compressorVehicle, type: e.target.value}}))} /></FormItem><FormItem><FormLabel>Reg No</FormLabel><Input value={localRigData.compressorVehicle?.regNo ?? ""} onChange={e => setLocalRigData(d => ({...d, compressorVehicle: {...d.compressorVehicle, regNo: e.target.value}}))} /></FormItem><FormItem><FormLabel>Chassis No</FormLabel><Input value={localRigData.compressorVehicle?.chassisNo ?? ""} onChange={e => setLocalRigData(d => ({...d, compressorVehicle: {...d.compressorVehicle, chassisNo: e.target.value}}))} /></FormItem><FormItem><FormLabel>Engine No</FormLabel><Input value={localRigData.compressorVehicle?.engineNo ?? ""} onChange={e => setLocalRigData(d => ({...d, compressorVehicle: {...d.compressorVehicle, engineNo: e.target.value}}))} /></FormItem></div></div>
                        <div className="space-y-2"><h4 className="font-medium text-primary">Supporting Vehicle</h4><div className="grid md:grid-cols-4 gap-4"><FormItem><FormLabel>Type</FormLabel><Input value={localRigData.supportingVehicle?.type ?? ""} onChange={e => setLocalRigData(d => ({...d, supportingVehicle: {...d.supportingVehicle, type: e.target.value}}))} /></FormItem><FormItem><FormLabel>Reg No</FormLabel><Input value={localRigData.supportingVehicle?.regNo ?? ""} onChange={e => setLocalRigData(d => ({...d, supportingVehicle: {...d.supportingVehicle, regNo: e.target.value}}))} /></FormItem><FormItem><FormLabel>Chassis No</FormLabel><Input value={localRigData.supportingVehicle?.chassisNo ?? ""} onChange={e => setLocalRigData(d => ({...d, supportingVehicle: {...d.supportingVehicle, chassisNo: e.target.value}}))} /></FormItem><FormItem><FormLabel>Engine No</FormLabel><Input value={localRigData.supportingVehicle?.engineNo ?? ""} onChange={e => setLocalRigData(d => ({...d, supportingVehicle: {...d.supportingVehicle, engineNo: e.target.value}}))} /></FormItem></div></div>
                        <div className="space-y-2"><h4 className="font-medium text-primary">Compressor Details</h4><div className="grid md:grid-cols-2 gap-4"><FormItem><FormLabel>Model</FormLabel><Input value={localRigData.compressorDetails?.model ?? ""} onChange={e => setLocalRigData(d => ({...d, compressorDetails: {...d.compressorDetails, model: e.target.value}}))} /></FormItem><FormItem><FormLabel>Capacity</FormLabel><Input value={localRigData.compressorDetails?.capacity ?? ""} onChange={e => setLocalRigData(d => ({...d, compressorDetails: {...d.compressorDetails, capacity: e.target.value}}))} /></FormItem></div></div>
                        <div className="space-y-2"><h4 className="font-medium text-primary">Generator Details</h4><div className="grid md:grid-cols-4 gap-4"><FormItem><FormLabel>Model</FormLabel><Input value={localRigData.generatorDetails?.model ?? ""} onChange={e => setLocalRigData(d => ({...d, generatorDetails: {...d.generatorDetails, model: e.target.value}}))} /></FormItem><FormItem><FormLabel>Capacity</FormLabel><Input value={localRigData.generatorDetails?.capacity ?? ""} onChange={e => setLocalRigData(d => ({...d, generatorDetails: {...d.generatorDetails, capacity: e.target.value}}))} /></FormItem><FormItem><FormLabel>Type</FormLabel><Input value={localRigData.generatorDetails?.type ?? ""} onChange={e => setLocalRigData(d => ({...d, generatorDetails: {...d.generatorDetails, type: e.target.value}}))} /></FormItem><FormItem><FormLabel>Engine No</FormLabel><Input value={localRigData.generatorDetails?.engineNo ?? ""} onChange={e => setLocalRigData(d => ({...d, generatorDetails: {...d.generatorDetails, engineNo: e.target.value}}))} /></FormItem></div></div>
                        
                    </CardContent>
                </Card>
            </div>
             <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
                <Button type="button" onClick={handleConfirm}>{isAdding ? 'Add Rig' : 'Save Details'}</Button>
            </DialogFooter>
        </ScrollArea>
    );
}

function PartnerDialogContent({ initialData, onConfirm, onCancel }: { initialData: OwnerInfo, onConfirm: (data: OwnerInfo) => void, onCancel: () => void }) {
    const { toast } = useToast();
    const form = useForm<OwnerInfo>({
        resolver: zodResolver(OwnerInfoSchema),
        defaultValues: initialData || { name: '', address: '', mobile: '', secondaryMobile: '' }
    });

    const handleConfirm = (data: OwnerInfo) => {
        onConfirm(data);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleConfirm)} className="space-y-4 pt-4">
                <FormField name="name" control={form.control} render={({ field }) => (
                    <FormItem>
                        <FormLabel>Partner Name & Address</FormLabel>
                        <FormControl><Textarea placeholder="Enter name and address" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
                <div className="grid grid-cols-2 gap-4">
                    <FormField name="mobile" control={form.control} render={({ field }) => (
                        <FormItem>
                            <FormLabel>Mobile No.</FormLabel>
                            <FormControl><Input placeholder="Enter mobile number" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                    <FormField name="secondaryMobile" control={form.control} render={({ field }) => (
                        <FormItem>
                            <FormLabel>Secondary Mobile No.</FormLabel>
                            <FormControl><Input placeholder="Enter secondary mobile" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
                    <Button type="submit">Confirm</Button>
                </DialogFooter>
            </form>
        </Form>
    );
}
    

    

    



    

    

    



    

      

    









    

    

    




    

