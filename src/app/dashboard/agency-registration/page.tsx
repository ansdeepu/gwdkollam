
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
import { Loader2, Search, PlusCircle, Save, X, Edit, Trash2, ShieldAlert, UserPlus, FilePlus, ChevronsUpDown, RotateCcw, RefreshCw, CheckCircle, Info, Ban, Edit2, FileUp, MoreVertical, ArrowLeft, Eye } from "lucide-react";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
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
    // First, try to parse dd/MM/yyyy format, which is common in our app's manual entry
    let parsed = parseISO(value);
    if (isValid(parsed)) return parsed;
    // Then, try to parse ISO format, which is how dates are often stored/transmitted
    parsed = parse(value, 'dd/MM/yyyy', new Date());
    if (isValid(parsed)) return parsed;
  }
  return null;
};

// Recursively processes an object to convert all date-like values to 'yyyy-MM-dd' strings for native date inputs.
const processDataForForm = (data: any): any => {
    if (!data) return data;
    if (Array.isArray(data)) {
        return data.map(item => processDataForForm(item));
    }
    if (typeof data === 'object' && data !== null) {
        const processed: { [key: string]: any } = {};
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                const value = data[key];
                 // Check for keys that typically represent dates
                 if (key.toLowerCase().includes('date') || key.toLowerCase().includes('till')) {
                    const date = toDateOrNull(value);
                    processed[key] = date ? format(date, 'yyyy-MM-dd') : '';
                } else {
                    // Recursively process nested objects/arrays
                    processed[key] = processDataForForm(value);
                }
            }
        }
        return processed;
    }
    return data;
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

type OptionalSection = "rigVehicle" | "compressorVehicle" | "supportingVehicle" | "compressorDetails" | "generatorDetails";

const RigAccordionItem = ({
  field,
  index,
  isReadOnly,
  onRemove,
  openDialog,
  onDeleteRenewal,
  onEditRenewal,
  form,
}: {
  field: RigRegistration;
  index: number;
  isReadOnly: boolean;
  onRemove?: (index: number) => void;
  openDialog: (type: 'renew' | 'cancel' | 'activate' | 'deleteRig', data: any) => void;
  onDeleteRenewal: (rigIndex: number, renewalId: string) => void;
  onEditRenewal: (rigIndex: number, renewal: RigRenewalFormData) => void;
  form: UseFormReturn<any>;
}) => {
  const rigTypeValue = field.typeOfRig;
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
    
   const detailSections: { key: OptionalSection, label: string }[] = [
    { key: "rigVehicle", label: "Rig Vehicle" },
    { key: "compressorVehicle", label: "Compressor Vehicle" },
    { key: "supportingVehicle", label: "Supporting Vehicle" },
    { key: "compressorDetails", label: "Compressor Details" },
    { key: "generatorDetails", label: "Generator Details" },
  ];

  const handleSectionToggle = (sectionKey: OptionalSection, checked: boolean) => {
    const showFieldKey = `rigs.${index}.show${sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1)}`;
    form.setValue(showFieldKey, checked);
    if (!checked) {
      form.setValue(`rigs.${index}.${sectionKey}`, undefined);
    }
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
                  <DropdownMenuTrigger asChild><Button type="button" size="sm" variant="outline"><PlusCircle className="mr-2 h-4 w-4" /> Add Details</Button></DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>Optional Details</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {detailSections.map(({ key, label }) => (
                      <DropdownMenuCheckboxItem
                        key={key}
                        checked={form.watch(`rigs.${index}.show${key.charAt(0).toUpperCase() + key.slice(1)}`)}
                        onCheckedChange={(checked) => handleSectionToggle(key, checked)}
                      >
                        {label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
            )}
            {!isReadOnly && field.status === 'Active' && (
                <Button type="button" size="sm" variant="outline" onClick={(e) => { e.preventDefault(); e.stopPropagation(); openDialog('renew', { rigIndex: index }); }}><RefreshCw className="mr-2 h-4 w-4" />Renew</Button>
            )}
            {!isReadOnly && field.status === 'Active' && (
                <Button type="button" size="sm" variant="destructive" onClick={(e) => { e.preventDefault(); e.stopPropagation(); openDialog('cancel', { rigIndex: index }); }}><Ban className="mr-2 h-4 w-4" />Cancel</Button>
            )}
            {!isReadOnly && field.status === 'Cancelled' && (
                <Button type="button" size="sm" variant="secondary" onClick={(e) => { e.preventDefault(); openDialog('activate', { rigIndex: index }); }}><CheckCircle className="mr-2 h-4 w-4" />Activate</Button>
            )}

            {!isReadOnly && onRemove && (
                <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive/90"
                onClick={(e) => { e.stopPropagation(); openDialog('deleteRig', { rigIndex: index }); }}
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
                <FormField name={`rigs.${index}.registrationDate`} control={form.control} render={({ field }) => <FormItem><FormLabel>Last Reg/Renewal Date</FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ""} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
            </div>
            <div className="grid md:grid-cols-4 gap-4">
                <FormItem>
                  <FormLabel>Validity Upto</FormLabel>
                  <FormControl><Input value={validityDate ? format(validityDate, 'dd/MM/yyyy') : 'N/A'} disabled className="bg-muted/50" /></FormControl>
                </FormItem>
                <FormField name={`rigs.${index}.registrationFee`} control={form.control} render={({ field }) => <FormItem><FormLabel>Reg. Fee</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                <FormField name={`rigs.${index}.paymentDate`} control={form.control} render={({ field }) => <FormItem><FormLabel>Payment Date</FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ""} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                <FormField name={`rigs.${index}.challanNo`} control={form.control} render={({ field }) => <FormItem><FormLabel>Challan No.</FormLabel><FormControl><Input {...field} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
            </div>
             <Separator className="my-2" />
            <div className="grid md:grid-cols-3 gap-4">
                <FormField name={`rigs.${index}.additionalRegistrationFee`} control={form.control} render={({ field }) => <FormItem><FormLabel>Additional Reg. Fee</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                <FormField name={`rigs.${index}.additionalPaymentDate`} control={form.control} render={({ field }) => <FormItem><FormLabel>Payment Date</FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ""} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                <FormField name={`rigs.${index}.additionalChallanNo`} control={form.control} render={({ field }) => <FormItem><FormLabel>Challan No.</FormLabel><FormControl><Input {...field} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
            </div>
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

          {form.watch(`rigs.${index}.showRigVehicle`) && (
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
          
          {form.watch(`rigs.${index}.showCompressorVehicle`) && (
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
          
          {form.watch(`rigs.${index}.showSupportingVehicle`) && (
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

          {form.watch(`rigs.${index}.showCompressorDetails`) && (
            <div className="p-4 border rounded-lg space-y-4 bg-secondary/20">
                <p className="font-medium text-base text-primary">Compressor Details</p>
                <div className="grid md:grid-cols-2 gap-4">
                <FormField name={`rigs.${index}.compressorDetails.model`} control={form.control} render={({ field }) => <FormItem><FormLabel>Model</FormLabel><FormControl><Input {...field} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                <FormField name={`rigs.${index}.compressorDetails.capacity`} control={form.control} render={({ field }) => <FormItem><FormLabel>Capacity</FormLabel><FormControl><Input {...field} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                </div>
            </div>
           )}

          {form.watch(`rigs.${index}.showGeneratorDetails`) && (
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
                                        <Button type="button" variant="ghost" size="icon" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEditRenewal(index, renewal); }}><Edit className="h-4 w-4"/></Button>
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
  
  const [dialogState, setDialogState] = useState<{ type: null | 'renew' | 'cancel' | 'activate' | 'editRenewal' | 'deleteRig'; data: any }>({ type: null, data: null });
  
  const [deletingRenewal, setDeletingRenewal] = useState<{ rigIndex: number; renewalId: string } | null>(null);
  
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

  // Robust useEffect to handle loading and parsing data from Firestore
  useEffect(() => {
    if (selectedApplicationId) {
        if (selectedApplicationId === 'new') {
            form.reset({
                owner: createDefaultOwner(),
                partners: [],
                rigs: [createDefaultRig()],
                history: []
            });
            // Stop the spinner once the new form is ready
            setIsNavigating(false);
        } else {
            const app = applications.find((a: AgencyApplication) => a.id === selectedApplicationId);
            if (app) {
                 const processedApp = processDataForForm(app);
                 form.reset(processedApp);
            } else {
                setSelectedApplicationId(null);
                form.reset({ owner: createDefaultOwner(), partners: [], rigs: [], history: [] });
            }
        }
    } else {
        form.reset({ owner: createDefaultOwner(), partners: [], rigs: [], history: [] });
    }
  }, [selectedApplicationId, applications, form, setIsNavigating]);
  
    const generateHistoryEntry = (rig: RigRegistration): string | null => {
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
      setIsSubmitting(true);
      try {
            // Determine status based on agencyRegistrationNo
            const finalStatus = data.agencyRegistrationNo ? 'Active' : 'Pending Verification';

            const dataWithHistoryAndStatus = {
                ...data,
                status: finalStatus,
                rigs: data.rigs.map(rig => {
                    const historyEntry = generateHistoryEntry(rig);
                    const newHistory = historyEntry ? [...(rig.history || []), historyEntry] : (rig.history || []);
                    return { ...rig, history: newHistory };
                })
            };

          if (selectedApplicationId && selectedApplicationId !== 'new') {
              await updateApplication(selectedApplicationId, dataWithHistoryAndStatus);
              toast({ title: "Application Updated", description: "The registration details have been updated." });
          } else {
              await addApplication(dataWithHistoryAndStatus);
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
  
  const openDialog = (type: 'renew' | 'cancel' | 'activate' | 'editRenewal' | 'deleteRig', data: any) => {
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
                                <AccordionTrigger className="text-xl font-semibold text-primary">1. Application Details</AccordionTrigger>
                                <AccordionContent className="pt-4 space-y-4">
                                     <div className="grid md:grid-cols-3 gap-4">
                                        <FormField name="fileNo" render={({ field }) => <FormItem><FormLabel>File No.</FormLabel><FormControl><Input {...field} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                                        <FormField name="agencyName" render={({ field }) => <FormItem className="md:col-span-2"><FormLabel>Agency Name & Address</FormLabel><FormControl><Textarea {...field} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
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
                            <AccordionTrigger className="text-xl font-semibold text-primary">2. Agency Registration</AccordionTrigger>
                            <AccordionContent className="pt-4 grid md:grid-cols-3 gap-4">
                               <FormField name="agencyRegistrationNo" render={({ field }) => <FormItem><FormLabel>Agency Reg. No.</FormLabel><FormControl><Input {...field} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                               <FormField name="agencyRegistrationDate" render={({ field }) => <FormItem><FormLabel>Reg. Date</FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ""} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                               <FormField name="agencyRegistrationFee" render={({ field }) => <FormItem><FormLabel>Reg. Fee</FormLabel><FormControl><Input type="number" {...field} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                               <FormField name="agencyPaymentDate" render={({ field }) => <FormItem><FormLabel>Payment Date</FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ""} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                               <FormField name="agencyChallanNo" render={({ field }) => <FormItem className="md:col-span-2"><FormLabel>Challan No.</FormLabel><FormControl><Input {...field} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                               <Separator className="md:col-span-3 my-2" />
                               <FormField name="agencyAdditionalRegFee" render={({ field }) => <FormItem><FormLabel>Additional Reg. Fee</FormLabel><FormControl><Input type="number" {...field} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                               <FormField name="agencyAdditionalPaymentDate" render={({ field }) => <FormItem><FormLabel>Payment Date</FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ""} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                               <FormField name="agencyAdditionalChallanNo" render={({ field }) => <FormItem className="md:col-span-2"><FormLabel>Challan No.</FormLabel><FormControl><Input {...field} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>

                        {/* Section 3: Rig Registrations */}
                        <Accordion type="single" collapsible defaultValue="item-1">
                          <AccordionItem value="item-1">
                            <AccordionTrigger className="text-xl font-semibold text-primary">3. Rig Registration ({rigFields.length} Total)</AccordionTrigger>
                            <AccordionContent className="pt-4 space-y-4">
                              <Accordion type="multiple" className="w-full space-y-2">
                                {rigFields.map((field, index) => (
                                  <RigAccordionItem
                                    key={field.id}
                                    field={field as RigRegistration}
                                    index={index}
                                    isReadOnly={isReadOnly}
                                    onRemove={isEditor ? removeRig : undefined}
                                    openDialog={openDialog}
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
            <AlertDialog open={dialogState.type === 'cancel'} onOpenChange={(isOpen) => !isOpen && closeDialog()}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Rig Registration</AlertDialogTitle>
                        <AlertDialogDescription>
                            Provide a reason and date for cancelling this rig. This action can be reversed later.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    {dialogState.data && (
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
                        <AlertDialogCancel onClick={closeDialog}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteRig}>Delete</AlertDialogAction>
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
                        <AlertDialogCancel onClick={closeDialog}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleActivateRig}>Activate</AlertDialogAction>
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
              This action will permanently delete the registration for <strong>{applications.find((a: AgencyApplication) => a.id === deletingApplicationId)?.agencyName}</strong>. This action cannot be undone.
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

function RenewalDialogContent({ initialData, onConfirm, onCancel }: { initialData: Partial<RigRenewalFormData>, onConfirm: (data: any) => void, onCancel: () => void }) {
    const [data, setData] = useState(initialData);

    return (
        <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                    <Label className="text-right">Renewal Date</Label>
                    <Input type="date" value={data.renewalDate || ''} onChange={(e) => setData(d => ({ ...d, renewalDate: e.target.value }))} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="renewalFee">Renewal Fee</Label>
                    <Input id="renewalFee" type="number" value={data.renewalFee ?? ''} onChange={(e) => setData(d => ({ ...d, renewalFee: +e.target.value }))} />
                </div>
                 <div className="space-y-2">
                    <Label className="text-right">Payment Date</Label>
                    <Input type="date" value={data.paymentDate || ''} onChange={(e) => setData(d => ({ ...d, paymentDate: e.target.value }))} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="challanNo">Challan No.</Label>
                    <Input id="challanNo" value={data.challanNo ?? ''} onChange={(e) => setData(d => ({ ...d, challanNo: e.target.value }))} />
                </div>
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
                <Button type="button" onClick={() => onConfirm(data)}>Confirm</Button>
            </DialogFooter>
        </>
    );
}

function CancellationDialogContent({ initialData, onConfirm, onCancel }: { initialData: Partial<RigRegistration>, onConfirm: (data: any) => void, onCancel: () => void }) {
    const [cancellationData, setCancellationData] = useState({ 
        reason: initialData?.cancellationReason || '', 
        date: initialData?.cancellationDate ? format(new Date(initialData.cancellationDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
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
                <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onConfirm(cancellationData)}>Confirm Cancellation</AlertDialogAction>
            </AlertDialogFooter>
        </>
    );
}
    

    