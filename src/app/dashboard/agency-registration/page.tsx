
// src/app/dashboard/agency-registration/page.tsx
"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useAgencyApplications, type AgencyApplication, type RigRegistration, type OwnerInfo } from "@/hooks/useAgencyApplications";
import { useForm, useFieldArray, FormProvider, useWatch, Controller, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AgencyApplicationSchema, rigTypeOptions, RigRegistrationSchema, RigRenewalSchema, type RigRenewal as RigRenewalFormData } from "@/lib/schemas";
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
import { Loader2, Search, PlusCircle, Save, X, Edit, Trash2, ShieldAlert, UserPlus, FilePlus, ChevronsUpDown, RotateCcw, RefreshCw, CheckCircle, Info, Ban, Edit2, FileUp, MoreVertical, ArrowLeft, Eye, Settings } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { format, addYears, isValid, parseISO, parse } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { usePageHeader } from "@/hooks/usePageHeader";
import { usePageNavigation } from "@/hooks/usePageNavigation";
import PaginationControls from "@/components/shared/PaginationControls";
"client-only";

export const dynamic = 'force-dynamic';

type DialogState = {
  type: 'renew' | 'cancel' | 'deleteRenewal' | 'deleteApplication' | 'editRenewal' | null;
  data: any;
};

const toDateOrNull = (value: any): Date | null => {
  if (!value) return null;
  if (value instanceof Date && isValid(value)) return value;
  if (typeof value === 'string') {
    let parsed = parseISO(value);
    if (isValid(parsed)) return parsed;
    parsed = parse(value, 'yyyy-MM-dd', new Date());
    if (isValid(parsed)) return parsed;
  }
  return null;
};

const toInputDate = (value: any): string => {
  const date = toDateOrNull(value);
  return date ? format(date, "yyyy-MM-dd") : "";
};

const RegistrationTable = ({ 
  applications, 
  onView,
  onEdit, 
  onDelete, 
  searchTerm,
  canEdit
}: { 
  applications: AgencyApplication[],
  onView: (id: string) => void,
  onEdit: (id: string) => void, 
  onDelete: (id: string) => void,
  searchTerm: string,
  canEdit: boolean
}) => (
    <div className="max-h-[70vh] overflow-auto">
      <Table>
          <TableHeader className="bg-secondary sticky top-0">
              <TableRow>
                  <TableHead>File No.</TableHead>
                  <TableHead>Agency Name</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Active Rigs</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
              </TableRow>
          </TableHeader>
          <TableBody>
              {applications.length > 0 ? (
                  applications.map((app) => (
                      <TableRow key={app.id}>
                          <TableCell>{app.fileNo || 'N/A'}</TableCell>
                          <TableCell className="font-medium">{app.agencyName}</TableCell>
                          <TableCell>{app.owner.name}</TableCell>
                          <TableCell>{(app.rigs || []).filter(r => r.status === 'Active').length} / {(app.rigs || []).length}</TableCell>
                          <TableCell><Badge variant={app.status === 'Active' ? 'default' : 'secondary'}>{app.status}</Badge></TableCell>
                          <TableCell className="text-center">
                              <Button variant="ghost" size="icon" onClick={() => onView(app.id!)}><Eye className="h-4 w-4" /></Button>
                              {canEdit && (
                                <>
                                <Button variant="ghost" size="icon" onClick={() => onEdit(app.id!)}><Edit className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/90" onClick={() => onDelete(app.id!)}><Trash2 className="h-4 w-4" /></Button>
                                </>
                              )}
                          </TableCell>
                      </TableRow>
                  ))
              ) : (
                  <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
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

type OptionalRigSection = 'rigVehicle' | 'compressorVehicle' | 'supportingVehicle' | 'compressorDetails' | 'generatorDetails';

const optionalSectionLabels: Record<OptionalRigSection, string> = {
    rigVehicle: 'Rig Vehicle Details',
    compressorVehicle: 'Compressor Vehicle Details',
    supportingVehicle: 'Supporting Vehicle Details',
    compressorDetails: 'Compressor Details',
    generatorDetails: 'Generator Details'
};

const RigAccordionItem = ({
  field,
  index,
  isReadOnly,
  onRemove,
  onActivate,
  onAction,
  form,
}: {
  field: RigRegistration;
  index: number;
  isReadOnly: boolean;
  onRemove?: (index: number) => void;
  onActivate: (index: number) => void;
  onAction: (type: 'renew' | 'cancel' | 'deleteRenewal' | 'editRenewal', rigIndex: number, renewalId?: string) => void;
  form: UseFormReturn<any>;
}) => {
  const rigTypeValue = field.typeOfRig;
  const registrationDate = toDateOrNull(field.registrationDate);
  const enabledSections = useWatch({ control: form.control, name: `rigs.${index}.enabledSections`, defaultValue: [] });

  const latestRenewal = useMemo(() => {
    if (!field.renewals || field.renewals.length === 0) return null;
    return [...field.renewals].sort((a, b) => {
        const dateA = toDateOrNull(a.renewalDate)?.getTime() ?? 0;
        const dateB = toDateOrNull(b.renewalDate)?.getTime() ?? 0;
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
    
    const toggleSection = (section: OptionalRigSection) => {
        const currentSections: OptionalRigSection[] = form.getValues(`rigs.${index}.enabledSections`) || [];
        const newSections = currentSections.includes(section)
            ? currentSections.filter(s => s !== section)
            : [...currentSections, section];
        form.setValue(`rigs.${index}.enabledSections`, newSections, { shouldDirty: true });
    };

  return (
    <AccordionItem value={`rig-${field.id}`} className="border bg-background rounded-lg shadow-sm">
      <div className="flex items-center w-full">
        <AccordionTrigger className={cn("flex-1 text-base font-semibold px-4 py-2 hover:no-underline", field.status === 'Cancelled' && "text-destructive line-through", field.status === 'Active' && isExpired && "text-amber-600")}>
          Rig #{index + 1} - {rigTypeValue || 'Unspecified Type'} ({field.status === 'Active' && isExpired ? <span className="text-destructive">Expired</span> : field.status})
        </AccordionTrigger>
        <div className="flex items-center ml-auto mr-2 shrink-0 space-x-1">
             {!isReadOnly && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button type="button" size="sm" variant="outline"><PlusCircle className="mr-2 h-4 w-4" /> Add Details</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuLabel>Optional Sections</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {Object.keys(optionalSectionLabels).map(key => (
                            <DropdownMenuCheckboxItem
                                key={key}
                                checked={enabledSections?.includes(key as OptionalRigSection)}
                                onCheckedChange={() => toggleSection(key as OptionalRigSection)}
                                onSelect={(e) => e.preventDefault()}
                            >
                                {optionalSectionLabels[key as OptionalRigSection]}
                            </DropdownMenuCheckboxItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
            {!isReadOnly && field.status === 'Active' && (
                <Button type="button" size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onAction('renew', index); }}><RefreshCw className="mr-2 h-4 w-4" />Renew</Button>
            )}
            {!isReadOnly && field.status === 'Active' && (
                <Button type="button" size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); onAction('cancel', index); }}><Ban className="mr-2 h-4 w-4" />Cancel</Button>
            )}
            {!isReadOnly && field.status === 'Cancelled' && (
                <Button type="button" size="sm" variant="secondary" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onActivate(index); }}><CheckCircle className="mr-2 h-4 w-4" />Activate</Button>
            )}

            {!isReadOnly && onRemove && (
                <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive/90"
                onClick={(e) => { e.stopPropagation(); onRemove(index); }}
                >
                <Trash2 className="h-4 w-4" />
                </Button>
            )}
        </div>
      </div>
      <AccordionContent className="p-6 pt-0">
        <div className="border-t pt-6 space-y-4">
          
          <div className="p-4 border rounded-lg space-y-4 bg-secondary/20">
            <p className="font-medium text-base text-primary">Registration Details</p>
            <div className="grid md:grid-cols-3 gap-4">
                <FormField name={`rigs.${index}.rigRegistrationNo`} control={form.control} render={({ field }) => <FormItem><FormLabel>Rig Reg. No.</FormLabel><FormControl><Input {...field} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                <FormField name={`rigs.${index}.typeOfRig`} control={form.control} render={({ field }) => (
                    <FormItem>
                        <FormLabel>Type of Rig</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select Type of Rig" /></SelectTrigger></FormControl>
                            <SelectContent>{rigTypeOptions.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField name={`rigs.${index}.registrationDate`} control={form.control} render={({ field }) => <FormItem><FormLabel>Last Reg/Renewal Date</FormLabel><FormControl><Input type="date" {...field} value={toInputDate(field.value)} onChange={e => field.onChange(e.target.value)} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
            </div>
             <div className="grid md:grid-cols-4 gap-4">
                <FormItem>
                  <FormLabel>Validity Upto</FormLabel>
                  <FormControl><Input value={validityDate ? format(validityDate, 'dd/MM/yyyy') : 'N/A'} disabled className="bg-muted/50" /></FormControl>
                </FormItem>
                <FormField name={`rigs.${index}.registrationFee`} control={form.control} render={({ field }) => <FormItem><FormLabel>Reg. Fee</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                <FormField name={`rigs.${index}.paymentDate`} control={form.control} render={({ field }) => <FormItem><FormLabel>Payment Date</FormLabel><FormControl><Input type="date" {...field} value={toInputDate(field.value)} onChange={e => field.onChange(e.target.value)} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                <FormField name={`rigs.${index}.challanNo`} control={form.control} render={({ field }) => <FormItem><FormLabel>Challan No.</FormLabel><FormControl><Input {...field} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
            </div>
             <Separator className="my-2" />
            <div className="grid md:grid-cols-3 gap-4">
                <FormField name={`rigs.${index}.additionalRegistrationFee`} control={form.control} render={({ field }) => <FormItem><FormLabel>Additional Reg. Fee</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                <FormField name={`rigs.${index}.additionalPaymentDate`} control={form.control} render={({ field }) => <FormItem><FormLabel>Payment Date</FormLabel><FormControl><Input type="date" {...field} value={toInputDate(field.value)} onChange={e => field.onChange(e.target.value)} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                <FormField name={`rigs.${index}.additionalChallanNo`} control={form.control} render={({ field }) => <FormItem><FormLabel>Challan No.</FormLabel><FormControl><Input {...field} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
            </div>
          </div>
          
          {enabledSections.includes('rigVehicle') && (
            <div className="p-4 border rounded-lg space-y-4 bg-secondary/20">
                <p className="font-medium text-base text-primary">Rig Vehicle Details</p>
                <div className="grid md:grid-cols-4 gap-4">
                <FormField name={`rigs.${index}.rigVehicle.type`} control={form.control} render={({ field }) => <FormItem><FormLabel>Type</FormLabel><FormControl><Input {...field} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                <FormField name={`rigs.${index}.rigVehicle.regNo`} control={form.control} render={({ field }) => <FormItem><FormLabel>Reg No</FormLabel><FormControl><Input {...field} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                <FormField name={`rigs.${index}.rigVehicle.chassisNo`} control={form.control} render={({ field }) => <FormItem><FormLabel>Chassis No</FormLabel><FormControl><Input {...field} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                <FormField name={`rigs.${index}.rigVehicle.engineNo`} control={form.control} render={({ field }) => <FormItem><FormLabel>Engine No</FormLabel><FormControl><Input {...field} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                </div>
            </div>
          )}
          
          {enabledSections.includes('compressorVehicle') && (
            <div className="p-4 border rounded-lg space-y-4 bg-secondary/20">
                <p className="font-medium text-base text-primary">Compressor Vehicle Details</p>
                <div className="grid md:grid-cols-4 gap-4">
                <FormField name={`rigs.${index}.compressorVehicle.type`} control={form.control} render={({ field }) => <FormItem><FormLabel>Type</FormLabel><FormControl><Input {...field} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                <FormField name={`rigs.${index}.compressorVehicle.regNo`} control={form.control} render={({ field }) => <FormItem><FormLabel>Reg No</FormLabel><FormControl><Input {...field} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                <FormField name={`rigs.${index}.compressorVehicle.chassisNo`} control={form.control} render={({ field }) => <FormItem><FormLabel>Chassis No</FormLabel><FormControl><Input {...field} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                <FormField name={`rigs.${index}.compressorVehicle.engineNo`} control={form.control} render={({ field }) => <FormItem><FormLabel>Engine No</FormLabel><FormControl><Input {...field} readOnly={isReadOnly} /></FormControl></FormItem>} />
                </div>
            </div>
          )}
          
          {enabledSections.includes('supportingVehicle') && (
            <div className="p-4 border rounded-lg space-y-4 bg-secondary/20">
                <p className="font-medium text-base text-primary">Supporting Vehicle Details</p>
                <div className="grid md:grid-cols-4 gap-4">
                <FormField name={`rigs.${index}.supportingVehicle.type`} control={form.control} render={({ field }) => <FormItem><FormLabel>Type</FormLabel><FormControl><Input {...field} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                <FormField name={`rigs.${index}.supportingVehicle.regNo`} control={form.control} render={({ field }) => <FormItem><FormLabel>Reg No</FormLabel><FormControl><Input {...field} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                <FormField name={`rigs.${index}.supportingVehicle.chassisNo`} control={form.control} render={({ field }) => <FormItem><FormLabel>Chassis No</FormLabel><FormControl><Input {...field} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                <FormField name={`rigs.${index}.supportingVehicle.engineNo`} control={form.control} render={({ field }) => <FormItem><FormLabel>Engine No</FormLabel><FormControl><Input {...field} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                </div>
            </div>
          )}
          
          {enabledSections.includes('compressorDetails') && (
            <div className="p-4 border rounded-lg space-y-4 bg-secondary/20">
                <p className="font-medium text-base text-primary">Compressor Details</p>
                <div className="grid md:grid-cols-2 gap-4">
                <FormField name={`rigs.${index}.compressorDetails.model`} control={form.control} render={({ field }) => <FormItem><FormLabel>Model</FormLabel><FormControl><Input {...field} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                <FormField name={`rigs.${index}.compressorDetails.capacity`} control={form.control} render={({ field }) => <FormItem><FormLabel>Capacity</FormLabel><FormControl><Input {...field} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                </div>
            </div>
          )}
          
          {enabledSections.includes('generatorDetails') && (
            <div className="p-4 border rounded-lg space-y-4 bg-secondary/20">
                <p className="font-medium text-base text-primary">Generator Details</p>
                <div className="grid md:grid-cols-4 gap-4">
                <FormField name={`rigs.${index}.generatorDetails.model`} control={form.control} render={({ field }) => <FormItem><FormLabel>Model</FormLabel><FormControl><Input {...field} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                <FormField name={`rigs.${index}.generatorDetails.capacity`} control={form.control} render={({ field }) => <FormItem><FormLabel>Capacity</FormLabel><FormControl><Input {...field} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                <FormField name={`rigs.${index}.generatorDetails.type`} control={form.control} render={({ field }) => <FormItem><FormLabel>Type</FormLabel><FormControl><Input {...field} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                <FormField name={`rigs.${index}.generatorDetails.engineNo`} control={form.control} render={({ field }) => <FormItem><FormLabel>Engine No</FormLabel><FormControl><Input {...field} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                </div>
            </div>
          )}
          
          {field.status === 'Cancelled' && (
            <div className="p-4 border rounded-lg bg-destructive/10">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold text-destructive">Cancellation Details</h4>
                     {!isReadOnly && (
                        <div className="flex items-center space-x-1">
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/20" onClick={(e) => { e.stopPropagation(); onAction('cancel', index); }}>
                                <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/20" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onActivate(index); }}>
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

          {field.renewals && field.renewals.length > 0 && (
            <div className="space-y-2 p-4 border rounded-lg bg-secondary/20">
                <h4 className="font-medium text-base text-primary">Renewal History</h4>
                <div className="border rounded-lg p-2 bg-background/50">
                    <Table>
                        <TableHeader>
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
                        {field.renewals.map((renewal, renewalIndex) => {
                            const renewalNum = renewalIndex + 1;
                            const renewalDate = renewal.renewalDate ? toDateOrNull(renewal.renewalDate) : null;
                            const paymentDate = renewal.paymentDate ? toDateOrNull(renewal.paymentDate) : null;
                            const validTillDate = renewalDate ? addYears(renewalDate, 1) : null;
                            return (
                                <TableRow key={renewal.id}>
                                <TableCell className="font-medium">{`${renewalNum}${getOrdinalSuffix(renewalNum)}`}</TableCell>
                                <TableCell>{renewalDate ? format(renewalDate, 'dd/MM/yyyy') : 'N/A'}</TableCell>
                                <TableCell>{validTillDate ? format(new Date(validTillDate.getTime() - 24 * 60 * 60 * 1000), 'dd/MM/yyyy') : 'N/A'}</TableCell>
                                <TableCell>{renewal.renewalFee?.toLocaleString() ?? 'N/A'}</TableCell>
                                <TableCell>{paymentDate ? format(paymentDate, 'dd/MM/yyyy') : 'N/A'}</TableCell>
                                <TableCell>{renewal.challanNo || 'N/A'}</TableCell>
                                {!isReadOnly && (
                                    <TableCell className="text-center">
                                      <div className="flex items-center justify-center space-x-0">
                                        <Button type="button" variant="ghost" size="icon" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAction('editRenewal', index, renewal.id); }}><Edit className="h-4 w-4"/></Button>
                                        <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAction('deleteRenewal', index, renewal.id); }}><Trash2 className="h-4 w-4"/></Button>
                                      </div>
                                    </TableCell>
                                )}
                                </TableRow>
                            );
                        })}
                        </TableBody>
                    </Table>
                </div>
            </div>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};


export default function AgencyRegistrationPage() {
  const { setHeader } = usePageHeader();
  const { applications, isLoading: applicationsLoading, addApplication, updateApplication, deleteApplication } = useAgencyApplications();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [isViewing, setIsViewing] = useState(false);
  
  const [dialogState, setDialogState] = useState<DialogState>({ type: null, data: null });

  // Separate states for input values in dialogs to avoid premature form updates
  const [renewalInput, setRenewalInput] = useState<Partial<RigRenewalFormData>>({});
  const [cancellationInput, setCancellationInput] = useState<{ reason: string; date: string }>({ reason: '', date: '' });

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  const isEditor = user?.role === 'editor';
  const isReadOnly = isViewing || user?.role === 'supervisor' || user?.role === 'viewer';
  const canEdit = isEditor;

  useEffect(() => {
    if (selectedApplicationId) {
      let title = 'Edit Rig Registration';
      if (isViewing) title = 'View Rig Registration';
      else if (selectedApplicationId === 'new') title = 'New Rig Registration';
      setHeader(title, 'Manage all details related to an agency and its rigs.');
    } else {
      setHeader('Rig Registration', 'Manage agency and rig registrations.');
    }
  }, [selectedApplicationId, isViewing, setHeader]);

  const createDefaultOwner = (): OwnerInfo => ({ name: '', address: '', mobile: '', secondaryMobile: '' });
  const createDefaultRig = (): RigRegistration => ({
      id: uuidv4(),
      status: 'Active',
      renewals: [],
      history: [],
      cancellationDate: undefined,
      cancellationReason: undefined,
      enabledSections: [],
  });

  const form = useForm<AgencyApplication>({
    resolver: zodResolver(AgencyApplicationSchema),
    defaultValues: {
      fileNo: '',
      agencyName: '',
      owner: createDefaultOwner(),
      partners: [],
      rigs: [],
      status: 'Pending Verification',
      history: []
    },
  });
  
  const { fields: partnerFields, append: appendPartner, remove: removePartner } = useFieldArray({ control: form.control, name: "partners" });
  const { fields: rigFields, append: appendRig, remove: removeRig, update: updateRig } = useFieldArray({ control: form.control, name: "rigs" });
  
  const activeRigCount = useMemo(() => rigFields.filter(rig => rig.status === 'Active').length, [rigFields]);
  
  const formatDataForForm = useCallback((data: any): any => {
    if (!data) return data;
  
    const transform = (obj: any): any => {
      if (obj === null || obj === undefined) return obj;
  
      if (Array.isArray(obj)) {
        return obj.map(transform);
      }
  
      if (typeof obj === 'object') {
        const newObj: { [key: string]: any } = {};
        for (const key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const value = obj[key];
            if (key.toLowerCase().includes('date')) {
              newObj[key] = toInputDate(value);
            } else {
              newObj[key] = transform(value);
            }
          }
        }
        return newObj;
      }
      return obj;
    };
  
    return transform(data);
  }, []);
  

  useEffect(() => {
    if (selectedApplicationId) {
      if (selectedApplicationId === 'new') {
        form.reset({
            fileNo: '',
            agencyName: '',
            agencyRegistrationNo: '',
            agencyRegistrationDate: toInputDate(new Date()),
            agencyRegistrationFee: undefined,
            agencyPaymentDate: toInputDate(new Date()),
            agencyChallanNo: '',
            agencyAdditionalRegFee: undefined,
            agencyAdditionalPaymentDate: undefined,
            agencyAdditionalChallanNo: '',
            owner: createDefaultOwner(),
            partners: [],
            rigs: [createDefaultRig()],
            status: 'Pending Verification',
            history: []
        });
      } else {
        const app = applications.find((a: AgencyApplication) => a.id === selectedApplicationId);
        if (app) {
          const appDataForForm = formatDataForForm(JSON.parse(JSON.stringify(app)));
          form.reset(appDataForForm);
        }
      }
    }
  }, [selectedApplicationId, applications, form, formatDataForForm]);

  const onSubmit = async (data: AgencyApplication) => {
    setIsSubmitting(true);

    const convertStringsToDates = (obj: any): any => {
        if (!obj) return obj;
        if (Array.isArray(obj)) {
            return obj.map(convertStringsToDates);
        }
        if (typeof obj === 'object' && obj !== null) {
            const newObj: { [key: string]: any } = {};
            for (const key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    let value = obj[key];
                    if (key.toLowerCase().includes('date') && typeof value === 'string' && value) {
                        const parsedDate = toDateOrNull(value);
                        newObj[key] = parsedDate && isValid(parsedDate) ? parsedDate : undefined;
                    } else if (typeof value === 'object') {
                        newObj[key] = convertStringsToDates(value);
                    } else {
                        newObj[key] = value;
                    }
                }
            }
            return newObj;
        }
        return obj;
    };
    
    let payload = convertStringsToDates(data);

    try {
      if (selectedApplicationId && selectedApplicationId !== 'new') {
        await updateApplication(selectedApplicationId, payload);
        toast({ title: "Application Updated", description: "The registration details have been updated." });
      } else {
        payload.status = payload.agencyRegistrationNo ? 'Active' : 'Pending Verification';
        await addApplication(payload as AgencyApplication);
        toast({ title: "Application Created", description: "The new agency registration has been saved." });
      }
      setSelectedApplicationId(null);
      setIsViewing(false);
    } catch (error: any) {
      console.error("Submission error:", error);
      toast({ title: "Submission Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddNew = () => {
    setIsViewing(false);
    setSelectedApplicationId('new');
  }

  const handleEdit = (id: string) => {
    setIsViewing(false);
    setSelectedApplicationId(id);
  }
  
  const handleView = (id: string) => {
    setIsViewing(true);
    setSelectedApplicationId(id);
  }

  const handleCancelForm = () => {
    setSelectedApplicationId(null);
    setIsViewing(false);
  }

  const handleAddRig = () => {
    if (activeRigCount < 3) {
      appendRig(createDefaultRig());
    } else {
      toast({ title: "Maximum Rigs Reached", description: "You can only register a maximum of 3 active rigs per agency.", variant: "default" });
    }
  };

  const filteredApplications = useMemo(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    if (!lowercasedFilter) return applications;

    return applications.filter((app: AgencyApplication) => 
        (app.agencyName.toLowerCase().includes(lowercasedFilter)) ||
        (app.owner.name.toLowerCase().includes(lowercasedFilter)) ||
        (app.fileNo?.toLowerCase().includes(lowercasedFilter)) ||
        (app.rigs.some(rig => rig.rigRegistrationNo?.toLowerCase().includes(lowercasedFilter)))
      );
  }, [applications, searchTerm]);

  const completedApplications = useMemo(() => {
    return filteredApplications.filter((app: AgencyApplication) => app.status === 'Active');
  }, [filteredApplications]);
  
  const pendingApplications = useMemo(() => {
    return filteredApplications.filter((app: AgencyApplication) => app.status === 'Pending Verification');
  }, [filteredApplications]);
  
  const totalPages = Math.ceil(filteredApplications.length / ITEMS_PER_PAGE);

    const handleAction = (type: 'renew' | 'cancel' | 'deleteRenewal' | 'editRenewal', rigIndex: number, renewalId?: string) => {
      switch (type) {
        case 'renew':
          setRenewalInput({ renewalDate: toInputDate(new Date()) });
          setDialogState({ type: 'renew', data: { rigIndex, isEditing: false } });
          break;
        case 'cancel':
          setCancellationInput({ reason: '', date: format(new Date(), 'yyyy-MM-dd') });
          setDialogState({ type: 'cancel', data: { rigIndex } });
          break;
        case 'editRenewal':
          const rig = rigFields[rigIndex];
          const renewalToEdit = rig.renewals?.find(r => r.id === renewalId);
          if (renewalToEdit) {
            setRenewalInput({
              ...renewalToEdit,
              renewalDate: toInputDate(renewalToEdit.renewalDate),
              paymentDate: toInputDate(renewalToEdit.paymentDate)
            });
            setDialogState({ type: 'editRenewal', data: { rigIndex, renewalId } });
          }
          break;
        case 'deleteRenewal':
          setDialogState({ type: 'deleteRenewal', data: { rigIndex, renewalId } });
          break;
      }
    };

    const confirmDeleteApplication = async () => {
      if (dialogState.type !== 'deleteApplication' || !dialogState.data.id) return;
      setIsSubmitting(true);
      try {
        await deleteApplication(dialogState.data.id);
        toast({ title: "Registration Removed", description: `The registration has been permanently deleted.` });
      } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: 'destructive' });
      } finally {
        setIsSubmitting(false);
        setDialogState({ type: null, data: null });
      }
    };

    const handleConfirmRenewal = () => {
        if (dialogState.type !== 'renew' && dialogState.type !== 'editRenewal' || !dialogState.data) return;
        const { rigIndex, renewalId } = dialogState.data;
        const currentRig = form.getValues(`rigs.${rigIndex}`);
        if (!currentRig) return;
        
        let updatedRenewals: RigRenewalFormData[];
        const isEditing = dialogState.type === 'editRenewal';

        if(isEditing) {
             updatedRenewals = (currentRig.renewals || []).map(r =>
                r.id === renewalId ? { ...r, ...renewalInput } : r
            );
        } else {
            const newRenewal: RigRenewalFormData = {
                id: uuidv4(),
                renewalDate: renewalInput.renewalDate || '',
                renewalFee: renewalInput.renewalFee,
                paymentDate: renewalInput.paymentDate,
                challanNo: renewalInput.challanNo,
            };
            updatedRenewals = [...(currentRig.renewals || []), newRenewal];
        }

        updateRig(rigIndex, { ...currentRig, renewals: updatedRenewals });
        form.trigger(`rigs.${rigIndex}.renewals`);
        toast({ title: isEditing ? "Renewal Updated" : "Renewal Added", description: `The renewal details have been ${isEditing ? 'updated' : 'added'} in the form.` });
        
        setDialogState({ type: null, data: null });
    };
  
    const confirmDeleteRenewal = () => {
        if (dialogState.type !== 'deleteRenewal' || !dialogState.data) return;
        const { rigIndex, renewalId } = dialogState.data;
        
        const rig = form.getValues(`rigs.${rigIndex}`);
        const updatedRenewals = rig.renewals?.filter(r => r.id !== renewalId);
        updateRig(rigIndex, { ...rig, renewals: updatedRenewals });
        
        toast({ title: "Renewal Removed", description: "The renewal record has been removed." });
        setDialogState({ type: null, data: null });
    };
  
  const handleActivateRig = (rigIndex: number) => {
    const currentRig = form.getValues(`rigs.${rigIndex}`);
    if (currentRig) {
        updateRig(rigIndex, {
            ...currentRig,
            status: 'Active',
            cancellationDate: undefined,
            cancellationReason: undefined,
        });
    }
  };

  const handleConfirmCancellation = () => {
    if (dialogState.type !== 'cancel' || !dialogState.data) return;
    const { rigIndex } = dialogState.data;
    const { reason, date } = cancellationInput;
    
    const currentRig = form.getValues(`rigs.${rigIndex}`);
    if (currentRig) {
        updateRig(rigIndex, {
            ...currentRig,
            status: 'Cancelled',
            cancellationDate: date,
            cancellationReason: reason,
        });
    }
    setDialogState({ type: null, data: null });
  };

  if (authLoading || applicationsLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading registration data...</p>
      </div>
    );
  }
  
  if (selectedApplicationId) {
    return (
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
               <div className="flex justify-between items-start">
                    <div>
                         {isViewing ? <CardTitle>View Rig Registration</CardTitle> : <CardTitle>{selectedApplicationId === 'new' ? 'New Rig Registration' : 'Edit Rig Registration'}</CardTitle>}
                         {isViewing ? <CardDescription>Viewing agency and rig details.</CardDescription> : <CardDescription>Manage agency and rig details.</CardDescription>}
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleCancelForm}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to List
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <Accordion type="multiple" defaultValue={['application-details', 'agency-registration', 'rig-details']} className="w-full space-y-4">
                  <AccordionItem value="application-details" className="border bg-card rounded-lg shadow-sm">
                      <AccordionTrigger className="p-4 hover:no-underline text-primary text-xl font-semibold">1. Application Details</AccordionTrigger>
                      <AccordionContent className="p-6 pt-0">
                          <div className="border-t pt-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <FormField name="fileNo" control={form.control} render={({ field }) => <FormItem><FormLabel>File No.</FormLabel><FormControl><Input {...field} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                              <FormField name="agencyName" control={form.control} render={({ field }) => <FormItem><FormLabel>Agency Name & Address</FormLabel><FormControl><Textarea {...field} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                            </div>
                            <Separator />
                            <p className="font-semibold text-lg text-primary/90">Owner Information</p>
                            <div className="grid md:grid-cols-3 gap-6">
                                <FormField name="owner.name" control={form.control} render={({ field }) => <FormItem><FormLabel>Name & Address of Owner</FormLabel><FormControl><Textarea {...field} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                                <FormField name="owner.mobile" control={form.control} render={({ field }) => <FormItem><FormLabel>Mobile No.</FormLabel><FormControl><Input {...field} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                                <FormField name="owner.secondaryMobile" control={form.control} render={({ field }) => <FormItem><FormLabel>Secondary Mobile No.</FormLabel><FormControl><Input {...field} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                            </div>
                             <Separator />
                            <div className="flex justify-between items-center">
                                <p className="font-semibold text-lg text-primary/90">Partner Details</p>
                                {!isReadOnly && (<Button type="button" size="sm" variant="outline" onClick={() => appendPartner(createDefaultOwner())}><UserPlus className="mr-2 h-4 w-4" />Add Partner</Button>)}
                            </div>
                            <div className="space-y-4">
                                {partnerFields.map((field, index) => (
                                    <div key={field.id} className="p-4 border rounded-lg bg-secondary/20 relative">
                                        {!isReadOnly && (<Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive" onClick={() => removePartner(index)}><Trash2 className="h-4 w-4" /></Button>)}
                                        <div className="grid md:grid-cols-3 gap-6">
                                            <FormField name={`partners.${index}.name`} control={form.control} render={({ field }) => <FormItem><FormLabel>Name & Address of Partner #{index + 1}</FormLabel><FormControl><Textarea {...field} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                                            <FormField name={`partners.${index}.mobile`} control={form.control} render={({ field }) => <FormItem><FormLabel>Mobile No.</FormLabel><FormControl><Input {...field} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                                            <FormField name={`partners.${index}.secondaryMobile`} control={form.control} render={({ field }) => <FormItem><FormLabel>Secondary Mobile No.</FormLabel><FormControl><Input {...field} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                          </div>
                      </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="agency-registration" className="border bg-card rounded-lg shadow-sm">
                      <AccordionTrigger className="p-4 hover:no-underline text-primary text-xl font-semibold">2. Agency Registration</AccordionTrigger>
                      <AccordionContent className="p-6 pt-0">
                          <div className="border-t pt-6 space-y-6">
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField name="agencyRegistrationNo" control={form.control} render={({ field }) => <FormItem><FormLabel>Agency Reg. No.</FormLabel><FormControl><Input {...field} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                                <FormField name="agencyRegistrationDate" control={form.control} render={({ field }) => <FormItem><FormLabel>Reg. Date</FormLabel><FormControl><Input type="date" {...field} value={toInputDate(field.value)} onChange={e => field.onChange(e.target.value)} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                              </div>
                               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <FormField name="agencyRegistrationFee" control={form.control} render={({ field }) => <FormItem><FormLabel>Reg. Fee</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                                <FormField name="agencyPaymentDate" control={form.control} render={({ field }) => <FormItem><FormLabel>Payment Date</FormLabel><FormControl><Input type="date" {...field} value={toInputDate(field.value)} onChange={e => field.onChange(e.target.value)} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                                <FormField name="agencyChallanNo" control={form.control} render={({ field }) => <FormItem><FormLabel>Challan No.</FormLabel><FormControl><Input {...field} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                              </div>
                               <Separator />
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <FormField name="agencyAdditionalRegFee" control={form.control} render={({ field }) => <FormItem><FormLabel>Additional Reg. Fee</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                                    <FormField name="agencyAdditionalPaymentDate" control={form.control} render={({ field }) => <FormItem><FormLabel>Payment Date</FormLabel><FormControl><Input type="date" {...field} value={toInputDate(field.value)} onChange={e => field.onChange(e.target.value)} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                                    <FormField name="agencyAdditionalChallanNo" control={form.control} render={({ field }) => <FormItem><FormLabel>Challan No.</FormLabel><FormControl><Input {...field} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                                </div>

                          </div>
                      </AccordionContent>
                  </AccordionItem>
                   <AccordionItem value="rig-details" className="border bg-card rounded-lg shadow-sm">
                      <AccordionTrigger className="p-4 hover:no-underline text-primary text-xl font-semibold">3. Rig Registration ({rigFields.length} Total)</AccordionTrigger>
                      <AccordionContent className="p-6 pt-0">
                          <div className="border-t pt-6 space-y-4">
                            <Accordion type="multiple" className="space-y-4" defaultValue={rigFields.map(f => `rig-${f.id}`)}>
                               {rigFields.map((field, index) => (
                                <RigAccordionItem
                                    key={field.id}
                                    field={field}
                                    index={index}
                                    isReadOnly={isReadOnly}
                                    onRemove={!isReadOnly && rigFields.length > 1 ? removeRig : undefined}
                                    onActivate={handleActivateRig}
                                    onAction={handleAction}
                                    form={form}
                                />
                               ))}
                            </Accordion>
                            {!isReadOnly && activeRigCount < 3 && <Button type="button" variant="outline" onClick={handleAddRig}><PlusCircle className="mr-2 h-4 w-4" /> Add Another Rig</Button>}
                          </div>
                      </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end space-x-2">
              {!isReadOnly && (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {selectedApplicationId === 'new' ? "Save Registration" : "Save Changes"}
                </Button>
              )}
              <Button variant="outline" onClick={handleCancelForm}>
                <X className="mr-2 h-4 w-4" /> Cancel
              </Button>
            </CardFooter>
          </Card>
        </form>
      </FormProvider>
    );
  }
  
  return (
    <div className="space-y-6">
      <Card>
          <CardHeader>
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative flex-grow min-w-[250px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input type="search" placeholder="Search by Agency, Owner, File No, Rig No..." className="w-full rounded-lg bg-background pl-10 shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                 <div className="flex flex-wrap items-center gap-2">
                    {canEdit && <Button size="sm" onClick={handleAddNew}> <PlusCircle className="mr-2 h-4 w-4" /> Add New Registration</Button>}
                 </div>
            </div>
          </CardHeader>
          <CardContent>
             <Tabs defaultValue="completed">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="completed">Registration Completed ({completedApplications.length})</TabsTrigger>
                    <TabsTrigger value="pending">Pending Applications ({pendingApplications.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="completed">
                    <RegistrationTable applications={completedApplications} onEdit={handleEdit} onDelete={(id) => setDialogState({ type: 'deleteApplication', data: { id } })} onView={handleView} searchTerm={searchTerm} canEdit={canEdit} />
                </TabsContent>
                <TabsContent value="pending">
                     <RegistrationTable applications={pendingApplications} onEdit={handleEdit} onDelete={(id) => setDialogState({ type: 'deleteApplication', data: { id } })} onView={handleView} searchTerm={searchTerm} canEdit={canEdit} />
                </TabsContent>
             </Tabs>
          </CardContent>
          {totalPages > 1 && (
            <CardFooter>
                <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </CardFooter>
          )}
      </Card>
      
      <AlertDialog open={dialogState.type === 'deleteApplication'} onOpenChange={() => setDialogState({ type: null, data: null })}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the registration and all its data. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDeleteApplication} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90">{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Delete"}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={dialogState.type === 'renew' || dialogState.type === 'editRenewal'} onOpenChange={() => setDialogState({ type: null, data: null })}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>{dialogState.type === 'editRenewal' ? 'Edit' : 'Renew'} Rig Registration</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                  <div className="space-y-2">
                      <Label>Renewal Date</Label>
                      <Input type="date" value={toInputDate(renewalInput.renewalDate)} onChange={e => setRenewalInput(prev => ({...prev, renewalDate: e.target.value}))} />
                  </div>
                   <div className="space-y-2">
                      <Label>Renewal Fee (₹)</Label>
                      <Input type="number" value={renewalInput.renewalFee ?? ''} onChange={e => setRenewalInput(prev => ({...prev, renewalFee: e.target.value === '' ? undefined : +e.target.value}))}/>
                  </div>
                  <div className="space-y-2">
                      <Label>Payment Date</Label>
                      <Input type="date" value={toInputDate(renewalInput.paymentDate)} onChange={e => setRenewalInput(prev => ({...prev, paymentDate: e.target.value}))} />
                  </div>
                  <div className="space-y-2">
                      <Label>Challan No.</Label>
                      <Input value={renewalInput.challanNo ?? ''} onChange={e => setRenewalInput(prev => ({...prev, challanNo: e.target.value}))} />
                  </div>
              </div>
              <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogState({ type: null, data: null })}>Cancel</Button>
                  <Button type="button" onClick={handleConfirmRenewal}>Save</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
      
      <AlertDialog open={dialogState.type === 'deleteRenewal'} onOpenChange={() => setDialogState({ type: null, data: null })}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Renewal?</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete this renewal record? This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDeleteRenewal} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={dialogState.type === 'cancel'} onOpenChange={() => setDialogState({ type: null, data: null })}>
          <DialogContent>
              <DialogHeader><DialogTitle>Cancel Rig Registration</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4">
                  <div className="space-y-2"><Label>Reason for Cancellation</Label><Input value={cancellationInput.reason} onChange={(e) => setCancellationInput(prev => ({...prev, reason: e.target.value}))}/></div>
                  <div className="space-y-2"><Label>Date of Cancellation</Label><Input type="date" value={cancellationInput.date} onChange={(e) => setCancellationInput(prev => ({...prev, date: e.target.value}))} /></div>
              </div>
              <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogState({ type: null, data: null })}>Cancel</Button><Button type="button" onClick={handleConfirmCancellation}>Confirm Cancellation</Button></DialogFooter>
          </DialogContent>
      </Dialog>
    </div>
  );
}
