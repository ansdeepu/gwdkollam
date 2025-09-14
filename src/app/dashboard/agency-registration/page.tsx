
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
import "client-only";

export const dynamic = 'force-dynamic';

const toDateOrNull = (value: any): Date | null => {
  if (!value) return null;
  if (value instanceof Date && isValid(value)) return value;
  // Handle Firestore Timestamp objects
  if (typeof value === 'object' && value !== null && typeof value.seconds === 'number' && typeof value.nanoseconds === 'number') {
    const date = new Date(value.seconds * 1000 + value.nanoseconds / 1000000);
    if (isValid(date)) return date;
  }
  if (typeof value === 'string') {
    let parsed = parseISO(value); // Handles yyyy-MM-dd from inputs and ISO strings
    if (isValid(parsed)) return parsed;

    parsed = parse(value, 'dd/MM/yyyy', new Date()); // Handle manual entry format
    if (isValid(parsed)) return parsed;
  }
  return null;
};

const toInputDate = (dateValue: any) => {
    const date = toDateOrNull(dateValue);
    return date && isValid(date) ? format(date, 'yyyy-MM-dd') : undefined;
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
  onRenew,
  onActivate,
  onCancel,
  onDeleteRenewal,
  onEditRenewal,
  form,
}: {
  field: RigRegistration;
  index: number;
  isReadOnly: boolean;
  onRemove?: (index: number) => void;
  onRenew: (index: number) => void;
  onActivate: (index: number) => void;
  onCancel: (rigIndex: number) => void;
  onDeleteRenewal: (rigIndex: number, renewalId: string) => void;
  onEditRenewal: (rigIndex: number, renewalId: string) => void;
  form: UseFormReturn<any>;
}) => {
  const rigTypeValue = field.typeOfRig;
  const registrationDate = field.registrationDate ? toDateOrNull(field.registrationDate) : null;
  const enabledSections = useWatch({ control: form.control, name: `rigs.${index}.enabledSections`, defaultValue: [] });

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
    
    const toggleSection = (section: OptionalRigSection) => {
        const currentSections: OptionalRigSection[] = form.getValues(`rigs.${index}.enabledSections`) || [];
        const newSections = currentSections.includes(section)
            ? currentSections.filter(s => s !== section)
            : [...currentSections, section];
        form.setValue(`rigs.${index}.enabledSections`, newSections, { shouldDirty: true });
    };

  return (
    <AccordionItem value={`rig-${field.id}`} className="border bg-background rounded-lg shadow-sm">
      <div className="flex items-center w-full border-b">
        <AccordionTrigger className={cn("flex-1 text-base font-semibold px-4", field.status === 'Cancelled' && "text-destructive line-through", field.status === 'Active' && isExpired && "text-amber-600")}>
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
                <Button type="button" size="sm" variant="outline" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRenew(index); }}><RefreshCw className="mr-2 h-4 w-4" />Renew</Button>
            )}
            {!isReadOnly && field.status === 'Active' && (
                <Button type="button" size="sm" variant="destructive" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onCancel(index); }}><Ban className="mr-2 h-4 w-4" />Cancel</Button>
            )}
            {!isReadOnly && field.status === 'Cancelled' && (
                <Button type="button" size="sm" variant="secondary" onClick={(e) => { e.preventDefault(); onActivate(index); }}><CheckCircle className="mr-2 h-4 w-4" />Activate</Button>
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
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                <FormField name={`rigs.${index}.registrationDate`} control={form.control} render={({ field }) => <FormItem><FormLabel>Last Reg/Renewal Date</FormLabel><FormControl><Input type="date" {...field} value={toInputDate(field.value) ?? ""} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                <FormItem>
                  <FormLabel>Validity Upto</FormLabel>
                  <FormControl><Input value={validityDate ? format(validityDate, 'dd/MM/yyyy') : 'N/A'} disabled className="bg-muted/50" /></FormControl>
                </FormItem>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
                <FormField name={`rigs.${index}.registrationFee`} control={form.control} render={({ field }) => <FormItem><FormLabel>Reg. Fee</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                <FormField name={`rigs.${index}.paymentDate`} control={form.control} render={({ field }) => <FormItem><FormLabel>Payment Date</FormLabel><FormControl><Input type="date" {...field} value={toInputDate(field.value) ?? ""} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                <FormField name={`rigs.${index}.challanNo`} control={form.control} render={({ field }) => <FormItem><FormLabel>Challan No.</FormLabel><FormControl><Input {...field} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
            </div>
             <Separator className="my-2" />
            <div className="grid md:grid-cols-3 gap-4">
                <FormField name={`rigs.${index}.additionalRegistrationFee`} control={form.control} render={({ field }) => <FormItem><FormLabel>Additional Reg. Fee</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                <FormField name={`rigs.${index}.additionalPaymentDate`} control={form.control} render={({ field }) => <FormItem><FormLabel>Payment Date</FormLabel><FormControl><Input type="date" {...field} value={toInputDate(field.value) ?? ""} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                <FormField name={`rigs.${index}.additionalChallanNo`} control={form.control} render={({ field }) => <FormItem><FormLabel>Challan No.</FormLabel><FormControl><Input {...field} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
            </div>
          </div>
          
          {field.status === 'Cancelled' && (
            <div className="p-4 border rounded-lg bg-destructive/10">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold text-destructive">Cancellation Details</h4>
                     {!isReadOnly && (
                        <div className="flex items-center space-x-1">
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/20" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onCancel(index); }}>
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
                            return (
                                <TableRow key={renewal.id}>
                                <TableCell className="font-medium">{`${renewalNum}${getOrdinalSuffix(renewalNum)}`}</TableCell>
                                <TableCell>{renewalDate ? format(renewalDate, 'dd/MM/yyyy') : 'N/A'}</TableCell>
                                <TableCell>{renewal.renewalFee?.toLocaleString() ?? 'N/A'}</TableCell>
                                <TableCell>{paymentDate ? format(paymentDate, 'dd/MM/yyyy') : 'N/A'}</TableCell>
                                <TableCell>{renewal.challanNo || 'N/A'}</TableCell>
                                {!isReadOnly && (
                                    <TableCell className="text-center">
                                        <Button type="button" variant="ghost" size="icon" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEditRenewal(index, renewal.id); }}><Edit className="h-4 w-4"/></Button>
                                        <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDeleteRenewal(index, renewal.id); }}><Trash2 className="h-4 w-4"/></Button>
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
  const [isViewing, setIsViewing] = useState(false);
  
  const [renewalData, setRenewalData] = useState<{ rigIndex: number; data: Partial<RigRenewalFormData> } | null>(null);
  const [editingRenewal, setEditingRenewal] = useState<{ rigIndex: number; renewal: RigRenewalFormData } | null>(null);
  const [deletingRenewal, setDeletingRenewal] = useState<{ rigIndex: number; renewalId: string } | null>(null);
  const [isRenewalDialogOpen, setIsRenewalDialogOpen] = useState(false);

  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [cancellationData, setCancellationData] = useState<{ rigIndex: number; reason: string; date: string }>({ rigIndex: -1, reason: '', date: '' });
  
  const [deletingApplicationId, setDeletingApplicationId] = useState<string | null>(null);

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
      cancellationDate: null,
      cancellationReason: undefined,
      enabledSections: [],
  });

  const form = useForm<AgencyApplication>({
    resolver: zodResolver(AgencyApplicationSchema),
    defaultValues: {
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

  useEffect(() => {
    if (selectedApplicationId) {
      if (selectedApplicationId === 'new') {
        form.reset({
          owner: createDefaultOwner(),
          partners: [],
          rigs: [createDefaultRig()],
          status: 'Pending Verification',
          history: []
        });
        setIsNavigating(false);
      } else {
        const app = applications.find((a: AgencyApplication) => a.id === selectedApplicationId);
        if (app) {
          form.reset(app);
        }
      }
    }
  }, [selectedApplicationId, applications, form, setIsNavigating]);

  const onSubmit = async (data: AgencyApplication) => {
    setIsSubmitting(true);

    try {
      const validationResult = AgencyApplicationSchema.safeParse(data);

      if (!validationResult.success) {
        console.error("Zod Validation Errors:", validationResult.error.flatten());
        toast({ title: "Validation Error", description: "Please check the form for errors.", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }
      
      if (selectedApplicationId && selectedApplicationId !== 'new') {
        await updateApplication(selectedApplicationId, validationResult.data);
        toast({ title: "Application Updated", description: "The registration details have been updated." });
      } else {
        await addApplication(validationResult.data);
        toast({ title: "Application Created", description: "The new agency registration has been saved." });
      }
      setSelectedApplicationId(null);
      setIsViewing(false);
    } catch (error: any) {
      toast({ title: "Submission Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddNew = () => {
    setIsNavigating(true);
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
  
  const handleRenewRig = (rigIndex: number) => {
      setEditingRenewal(null);
      setRenewalData({ rigIndex, data: { renewalDate: format(new Date(), 'yyyy-MM-dd') } });
      setIsRenewalDialogOpen(true);
  };
  
    const handleEditRenewal = (rigIndex: number, renewalId: string) => {
        const rig = rigFields[rigIndex];
        const renewalToEdit = rig.renewals?.find(r => r.id === renewalId);
        if(renewalToEdit) {
            setRenewalData(null);
            const renewalDataForForm = {
              ...renewalToEdit,
              renewalDate: toInputDate(renewalToEdit.renewalDate),
              paymentDate: toInputDate(renewalToEdit.paymentDate)
            }
            setEditingRenewal({ rigIndex, renewal: renewalDataForForm as RigRenewalFormData });
            setIsRenewalDialogOpen(true);
        }
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

  const handleConfirmRenewal = () => {
      if (editingRenewal) { // Handle editing an existing renewal
        const { rigIndex, renewal } = editingRenewal;
        const rigToUpdate = rigFields[rigIndex];
        
        const updatedRenewal = {
            ...renewal,
            renewalDate: renewal.renewalDate ? toDateOrNull(renewal.renewalDate) : null,
            paymentDate: renewal.paymentDate ? toDateOrNull(renewal.paymentDate) : null,
        }

        const updatedRenewals = rigToUpdate.renewals?.map(r => r.id === renewal.id ? updatedRenewal : r) || [];
        updateRig(rigIndex, { ...rigToUpdate, renewals: updatedRenewals });
        toast({ title: "Renewal Updated", description: "Renewal details have been updated." });
      } else if (renewalData?.data.renewalDate) { // Handle adding a new renewal
        const { rigIndex, data } = renewalData;
        const rigToUpdate = rigFields[rigIndex];
        const renewalDateObj = toDateOrNull(data.renewalDate);

        if (!renewalDateObj) {
            toast({ title: "Invalid Date", description: "Please enter a valid renewal date.", variant: "destructive" });
            return;
        }

        const newRenewal: RigRenewalFormData = {
            id: uuidv4(),
            renewalDate: renewalDateObj,
            renewalFee: data.renewalFee,
            paymentDate: data.paymentDate ? toDateOrNull(data.paymentDate) : null,
            challanNo: data.challanNo ?? "",
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
    
    setIsRenewalDialogOpen(false);
    setRenewalData(null);
    setEditingRenewal(null);
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

  const handleCancelRig = (rigIndex: number) => {
      const rig = form.getValues(`rigs.${rigIndex}`);
      const cancellationDate = rig.cancellationDate;
      const formattedDate = cancellationDate && isValid(new Date(cancellationDate)) ? format(new Date(cancellationDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');

      setCancellationData({ 
          rigIndex, 
          reason: rig.cancellationReason || '', 
          date: formattedDate
      });
      setIsCancelDialogOpen(true);
  };

  const handleConfirmCancellation = () => {
    if (cancellationData.rigIndex === -1) return;
    const { rigIndex, reason, date } = cancellationData;
    const rigToUpdate = form.getValues(`rigs.${rigIndex}`);
    
    const dateObject = toDateOrNull(date);
    
    updateRig(rigIndex, {
        ...rigToUpdate,
        status: 'Cancelled',
        cancellationDate: isValid(dateObject) ? dateObject : new Date(),
        cancellationReason: reason,
    });
    toast({ title: "Rig Cancelled", description: "The rig registration has been cancelled." });
    setIsCancelDialogOpen(false);
    setCancellationData({ rigIndex: -1, reason: '', date: '' });
  };
  
  const handleActivateRig = (rigIndex: number) => {
    const rigToUpdate = rigFields[rigIndex];
    updateRig(rigIndex, {
        ...rigToUpdate,
        status: 'Active',
        cancellationDate: null,
        cancellationReason: '',
    });
    toast({ title: "Rig Activated", description: "The rig registration has been reactivated." });
  };

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
      return (
        <div>
          <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Card>
                    <CardContent className="pt-6 space-y-8">
                        <div className="flex justify-end mb-4">
                            <Button type="button" variant="destructive" onClick={handleCancelForm} disabled={isSubmitting}>
                                <ArrowLeft className="mr-2 h-4 w-4"/> Back
                            </Button>
                        </div>
                        {/* Section 1: Application Details */}
                        <Accordion type="single" collapsible defaultValue="item-1" className="w-full">
                            <AccordionItem value="item-1">
                                <AccordionTrigger>1. Application Details</AccordionTrigger>
                                <AccordionContent className="pt-4 space-y-4">
                                    <div className="grid md:grid-cols-3 gap-4">
                                        <FormField name="fileNo" render={({ field }) => <FormItem><FormLabel>File No.</FormLabel><FormControl><Input {...field} value={field.value ?? ""} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                                        <FormField name="agencyName" render={({ field }) => <FormItem><FormLabel>Agency Name & Address</FormLabel><FormControl><Textarea {...field} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                                        {canEdit && (
                                            <FormField name="status" control={form.control} render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Status</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}>
                                                        <FormControl><SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger></FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="Pending Verification">Pending Verification</SelectItem>
                                                            <SelectItem value="Active">Active</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                        )}
                                    </div>
                                    <Separator />
                                     <div className="space-y-2">
                                        <h4 className="font-medium">Owner Details</h4>
                                        <div className="grid md:grid-cols-2 gap-4 p-2 border rounded-md">
                                            <FormField name="owner.name" render={({ field }) => <FormItem className="md:col-span-2"><FormLabel>Name & Address of Owner</FormLabel><FormControl><Textarea {...field} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                                            <FormField name="owner.mobile" render={({ field }) => <FormItem><FormLabel>Mobile No.</FormLabel><FormControl><Input {...field} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                                            <FormField name="owner.secondaryMobile" render={({ field }) => <FormItem><FormLabel>Secondary Mobile No.</FormLabel><FormControl><Input {...field} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="font-medium">Partner Details</h4>
                                        {partnerFields.map((field, index) => (
                                            <div key={field.id} className="grid md:grid-cols-4 gap-4 p-2 border rounded-md items-end">
                                                <FormField name={`partners.${index}.name`} render={({ field }) => <FormItem><FormLabel>Partner Name</FormLabel><FormControl><Input {...field} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                                                <FormField name={`partners.${index}.address`} render={({ field }) => <FormItem><FormLabel>Partner Address</FormLabel><FormControl><Textarea {...field} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                                                <FormField name={`partners.${index}.mobile`} render={({ field }) => <FormItem><FormLabel>Mobile No.</FormLabel><FormControl><Input {...field} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                                                {!isReadOnly && <Button type="button" variant="destructive" size="icon" onClick={() => removePartner(index)}><Trash2 className="h-4 w-4" /></Button>}
                                            </div>
                                        ))}
                                        {partnerFields.length < 2 && !isReadOnly && <Button type="button" variant="outline" size="sm" onClick={() => appendPartner(createDefaultOwner())}><UserPlus className="mr-2 h-4 w-4" /> Add Partner</Button>}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                        
                        {/* Section 2: Agency Registration */}
                        <Accordion type="single" collapsible defaultValue="item-1">
                          <AccordionItem value="item-1">
                            <AccordionTrigger>2. Agency Registration</AccordionTrigger>
                            <AccordionContent className="pt-4 grid md:grid-cols-3 gap-4">
                               <FormField name="agencyRegistrationNo" render={({ field }) => <FormItem><FormLabel>Agency Reg. No.</FormLabel><FormControl><Input {...field} value={field.value ?? ""} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                               <FormField name="agencyRegistrationDate" render={({ field }) => <FormItem><FormLabel>Reg. Date</FormLabel><FormControl><Input type="date" {...field} value={toInputDate(field.value) ?? ""} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                               <FormField name="agencyRegistrationFee" render={({ field }) => <FormItem><FormLabel>Reg. Fee</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                               <FormField name="agencyPaymentDate" render={({ field }) => <FormItem><FormLabel>Payment Date</FormLabel><FormControl><Input type="date" {...field} value={toInputDate(field.value) ?? ""} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                               <FormField name="agencyChallanNo" render={({ field }) => <FormItem className="md:col-span-2"><FormLabel>Challan No.</FormLabel><FormControl><Input {...field} value={field.value ?? ""} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                               <Separator className="md:col-span-3 my-2" />
                               <FormField name="agencyAdditionalRegFee" render={({ field }) => <FormItem><FormLabel>Additional Reg. Fee</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                               <FormField name="agencyAdditionalPaymentDate" render={({ field }) => <FormItem><FormLabel>Payment Date</FormLabel><FormControl><Input type="date" {...field} value={toInputDate(field.value) ?? ""} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                               <FormField name="agencyAdditionalChallanNo" render={({ field }) => <FormItem className="md:col-span-2"><FormLabel>Challan No.</FormLabel><FormControl><Input {...field} value={field.value ?? ""} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>

                        {/* Section 3: Rig Registrations */}
                        <Accordion type="single" collapsible defaultValue="item-1">
                          <AccordionItem value="item-1">
                            <AccordionTrigger>3. Rig Registration ({rigFields.length} Total)</AccordionTrigger>
                            <AccordionContent className="pt-4 space-y-4">
                              <Accordion type="multiple" className="w-full space-y-2">
                                {rigFields.map((field, index) => (
                                  <RigAccordionItem
                                    key={field.id}
                                    field={field as RigRegistration}
                                    index={index}
                                    isReadOnly={isReadOnly}
                                    onRemove={isEditor ? removeRig : undefined}
                                    onRenew={handleRenewRig}
                                    onActivate={handleActivateRig}
                                    onCancel={handleCancelRig}
                                    onEditRenewal={handleEditRenewal}
                                    onDeleteRenewal={handleDeleteRenewal}
                                    form={form}
                                  />
                                ))}
                              </Accordion>
                               {!isReadOnly && isEditor && activeRigCount < 3 && <Button className="mt-4" type="button" variant="outline" size="sm" onClick={handleAddRig}><PlusCircle className="mr-2 h-4 w-4" /> Add Another Rig</Button>}
                               {!isReadOnly && isEditor && activeRigCount >= 3 && <p className="text-sm text-muted-foreground mt-4">A maximum of 3 active rigs are allowed.</p>}
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>

                    </CardContent>
                    {!isReadOnly && (
                      <CardFooter className="flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={handleCancelForm} disabled={isSubmitting}><X className="mr-2 h-4 w-4"/> Cancel</Button>
                          <Button type="submit" disabled={isSubmitting}><Save className="mr-2 h-4 w-4"/> {isSubmitting ? "Saving..." : "Save Registration"}</Button>
                      </CardFooter>
                    )}
                </Card>
            </form>
            <Dialog open={isRenewalDialogOpen} onOpenChange={setIsRenewalDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                    <DialogTitle>{editingRenewal ? 'Edit Renewal' : 'Renew Rig Registration'}</DialogTitle>
                    <DialogDescription>Enter renewal details for the rig.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Renewal Date</Label>
                        <Input type="date" className="col-span-3" value={toInputDate(editingRenewal?.renewal.renewalDate) || toInputDate(renewalData?.data.renewalDate) || ''} onChange={(e) => {
                            const value = e.target.value;
                             if (editingRenewal) {
                                setEditingRenewal(ed => ({ ...ed!, renewal: { ...ed!.renewal, renewalDate: value }}));
                            } else {
                                setRenewalData(d => ({ ...d!, data: { ...d!.data, renewalDate: value } }));
                            }
                        }}/>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="renewalFee" className="text-right">Renewal Fee</Label>
                        <Input id="renewalFee" type="number" 
                         value={editingRenewal?.renewal.renewalFee ?? renewalData?.data.renewalFee ?? ''}
                         onChange={(e) => {
                            const value = +e.target.value;
                            if (editingRenewal) {
                                setEditingRenewal(ed => ({ ...ed!, renewal: { ...ed!.renewal, renewalFee: value }}));
                            } else {
                                setRenewalData(d => ({ ...d!, data: { ...d!.data, renewalFee: value } }));
                            }
                         }}
                        className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Payment Date</Label>
                        <Input type="date" className="col-span-3" value={toInputDate(editingRenewal?.renewal.paymentDate) || toInputDate(renewalData?.data.paymentDate) || ''} onChange={(e) => {
                            const value = e.target.value;
                            if (editingRenewal) {
                                setEditingRenewal(ed => ({ ...ed!, renewal: { ...ed!.renewal, paymentDate: value }}));
                            } else {
                                setRenewalData(d => ({ ...d!, data: { ...d!.data, paymentDate: value } }));
                            }
                        }} />

                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="challanNo" className="text-right">Challan No.</Label>
                        <Input id="challanNo"
                        value={editingRenewal?.renewal.challanNo ?? renewalData?.data.challanNo ?? ''}
                         onChange={(e) => {
                            const value = e.target.value;
                            if (editingRenewal) {
                                setEditingRenewal(ed => ({ ...ed!, renewal: { ...ed!.renewal, challanNo: value }}));
                            } else {
                                setRenewalData(d => ({ ...d!, data: { ...d!.data, challanNo: value } }));
                            }
                         }}
                        className="col-span-3" />
                    </div>
                    </div>
                    <DialogFooter>
                    <Button type="button" onClick={handleConfirmRenewal}>{editingRenewal ? "Save Changes" : "Confirm Renewal"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Cancel Rig Registration</DialogTitle>
                        <DialogDescription>
                            Provide a reason and date for cancelling this rig. This action can be reversed later.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="cancellationReason" className="text-right">Reason</Label>
                            <Textarea
                                id="cancellationReason"
                                value={cancellationData.reason}
                                onChange={(e) => setCancellationData(d => ({ ...d!, reason: e.target.value }))}
                                className="col-span-3"
                                placeholder="Enter reason for cancellation"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="cancellationDate" className="text-right">Date</Label>
                            <Input
                                id="cancellationDate"
                                type="date"
                                value={cancellationData.date}
                                onChange={(e) => setCancellationData(d => ({ ...d, date: e.target.value }))}
                                className="col-span-3"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsCancelDialogOpen(false)}>Cancel</Button>
                        <Button type="button" onClick={handleConfirmCancellation}>Confirm Cancellation</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <AlertDialog open={!!deletingRenewal} onOpenChange={() => setDeletingRenewal(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete this renewal record. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDeleteRenewal}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
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
              {canEdit && (
                <Button onClick={handleAddNew} className="shrink-0 w-full sm:w-auto">
                    <FilePlus className="mr-2 h-4 w-4" /> Add New Registration
                </Button>
              )}
          </div>
          <Tabs defaultValue="completed" onValueChange={onTabChange} className="pt-4 border-t">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="completed">Registration Completed ({completedApplications.length})</TabsTrigger>
                <TabsTrigger value="pending">Pending Applications ({pendingApplications.length})</TabsTrigger>
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
              This action will permanently delete the registration for <strong>{applications.find((a: AgencyApplication) => a.id === deletingApplicationId)?.agencyName}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingApplicationId(null)} disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteApplication} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
