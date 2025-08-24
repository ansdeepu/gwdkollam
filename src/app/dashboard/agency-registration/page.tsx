
// src/app/dashboard/agency-registration/page.tsx
"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useAgencyApplications, type AgencyApplication, type RigRegistration, type OwnerInfo, type RigRenewal } from "@/hooks/useAgencyApplications";
import { useForm, useFieldArray, FormProvider, useWatch, Controller } from "react-hook-form";
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
import { Calendar } from "@/components/ui/calendar";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, PlusCircle, Save, X, Edit, Trash2, ShieldAlert, CalendarIcon, UserPlus, FilePlus, History, ChevronsUpDown, RotateCcw, RefreshCw, CheckCircle, Info, Ban, Edit2, FileUp } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { format, addYears, isValid, isBefore } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";


const AgencyTable = ({ 
  applications, 
  onEdit, 
  onDelete, 
  searchTerm 
}: { 
  applications: AgencyApplication[], 
  onEdit: (id: string) => void, 
  onDelete: (id: string) => void,
  searchTerm: string
}) => (
    <Table>
        <TableHeader>
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
                        <TableCell>{app.rigs.filter(r => r.status === 'Active').length} / {app.rigs.length}</TableCell>
                        <TableCell><Badge variant={app.status === 'Active' ? 'default' : 'secondary'}>{app.status}</Badge></TableCell>
                        <TableCell className="text-center">
                            <Button variant="ghost" size="icon" onClick={() => onEdit(app.id!)}><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/90" onClick={() => onDelete(app.id!)}><Trash2 className="h-4 w-4" /></Button>
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
);

const RigAccordionItem = ({
  field,
  index,
  onRemove,
  onUpdate,
  onRenew,
  onCancel,
  form
}: {
  field: RigRegistration;
  index: number;
  onRemove?: (index: number) => void;
  onUpdate: (index: number) => void;
  onRenew: (index: number) => void;
  onCancel: (index: number) => void;
  form: any;
}) => {
  const rigTypeValue = field.typeOfRig;
  const registrationDate = field.registrationDate;

  const latestRenewal = useMemo(() => {
    if (!field.renewals || field.renewals.length === 0) return null;
    return [...field.renewals].sort((a, b) => new Date(b.renewalDate).getTime() - new Date(a.renewalDate).getTime())[0];
  }, [field.renewals]);

  const lastEffectiveDate = latestRenewal ? new Date(latestRenewal.renewalDate) : (registrationDate ? new Date(registrationDate) : null);

  const validityDate = lastEffectiveDate && isValid(lastEffectiveDate)
    ? new Date(addYears(lastEffectiveDate, 1).getTime() - (24 * 60 * 60 * 1000))
    : null;

  const isExpired = field.status === 'Active' && validityDate && isBefore(validityDate, new Date());
  const finalIsReadOnly = false; 

  return (
    <AccordionItem value={`rig-${field.id}`} className="border bg-background rounded-lg shadow-sm">
      <div className="flex items-center w-full border-b">
        <AccordionTrigger className={cn("flex-1 text-base font-semibold px-4", field.status === 'Cancelled' && "text-destructive line-through", isExpired && "text-amber-600")}>
          Rig #{index + 1} - {rigTypeValue || 'Unspecified Type'} ({field.status === 'Active' && isExpired ? <span className="text-destructive">Expired</span> : field.status})
        </AccordionTrigger>
        <div className="flex items-center ml-auto mr-2 shrink-0 space-x-1">
            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onUpdate(index); }}><Edit2 className="h-4 w-4 mr-2" />Update</Button>
            {isExpired && <Button size="sm" onClick={(e) => { e.stopPropagation(); onRenew(index); }}><RefreshCw className="h-4 w-4 mr-2"/>Renew</Button>}
            {field.status === 'Active' && <Button size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); onCancel(index); }}><Ban className="h-4 w-4 mr-2"/>Cancel</Button>}
            {onRemove && (
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
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <FormField name={`rigs.${index}.rigRegistrationNo`} control={form.control} render={({ field }) => <FormItem><FormLabel>Rig Reg. No.</FormLabel><FormControl><Input {...field} readOnly={finalIsReadOnly} /></FormControl><FormMessage /></FormItem>} />
            <FormField name={`rigs.${index}.typeOfRig`} control={form.control} render={({ field }) => (
                <FormItem>
                    <FormLabel>Type of Rig</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={finalIsReadOnly}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select Type of Rig" /></SelectTrigger></FormControl>
                        <SelectContent>{rigTypeOptions.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
            )} />
            <FormField name={`rigs.${index}.registrationDate`} control={form.control} render={({ field }) => (
                <FormItem>
                    <FormLabel>Last Reg/Renewal Date</FormLabel>
                    <Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className="w-full" disabled={finalIsReadOnly}><CalendarIcon className="mr-2 h-4 w-4"/>{field.value ? format(new Date(field.value), 'dd/MM/yyyy') : 'Select'}</Button></FormControl></PopoverTrigger><PopoverContent><Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={field.onChange} /></PopoverContent></Popover>
                    <FormMessage />
                </FormItem>
            )} />
            <FormItem>
              <FormLabel>Validity Upto</FormLabel>
              <FormControl><Input value={validityDate ? format(validityDate, 'dd/MM/yyyy') : 'N/A'} disabled className="bg-muted/50" /></FormControl>
            </FormItem>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <FormField name={`rigs.${index}.registrationFee`} control={form.control} render={({ field }) => <FormItem><FormLabel>Reg. Fee</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={finalIsReadOnly} /></FormControl><FormMessage /></FormItem>} />
            <FormField name={`rigs.${index}.paymentDate`} control={form.control} render={({ field }) => (
                <FormItem>
                    <FormLabel>Payment Date</FormLabel>
                    <Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className="w-full" disabled={finalIsReadOnly}><CalendarIcon className="mr-2 h-4 w-4"/>{field.value ? format(new Date(field.value), 'dd/MM/yyyy') : 'Select'}</Button></FormControl></PopoverTrigger><PopoverContent><Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={field.onChange} /></PopoverContent></Popover>
                    <FormMessage />
                </FormItem>
            )} />
            <FormField name={`rigs.${index}.challanNo`} control={form.control} render={({ field }) => <FormItem><FormLabel>Challan No.</FormLabel><FormControl><Input {...field} readOnly={finalIsReadOnly} /></FormControl><FormMessage /></FormItem>} />
          </div>
          <Separator />
          <p className="font-medium">Rig Vehicle Details</p>
          <div className="grid md:grid-cols-4 gap-4">
             <FormField name={`rigs.${index}.rigVehicle.type`} control={form.control} render={({ field }) => <FormItem><FormLabel>Type</FormLabel><FormControl><Input {...field} readOnly={finalIsReadOnly} /></FormControl><FormMessage /></FormItem>} />
             <FormField name={`rigs.${index}.rigVehicle.regNo`} control={form.control} render={({ field }) => <FormItem><FormLabel>Reg No</FormLabel><FormControl><Input {...field} readOnly={finalIsReadOnly} /></FormControl><FormMessage /></FormItem>} />
             <FormField name={`rigs.${index}.rigVehicle.chassisNo`} control={form.control} render={({ field }) => <FormItem><FormLabel>Chassis No</FormLabel><FormControl><Input {...field} readOnly={finalIsReadOnly} /></FormControl><FormMessage /></FormItem>} />
             <FormField name={`rigs.${index}.rigVehicle.engineNo`} control={form.control} render={({ field }) => <FormItem><FormLabel>Engine No</FormLabel><FormControl><Input {...field} readOnly={finalIsReadOnly} /></FormControl><FormMessage /></FormItem>} />
          </div>
          <Separator />
          <p className="font-medium">Compressor Vehicle Details</p>
          <div className="grid md:grid-cols-4 gap-4">
             <FormField name={`rigs.${index}.compressorVehicle.type`} control={form.control} render={({ field }) => <FormItem><FormLabel>Type</FormLabel><FormControl><Input {...field} readOnly={finalIsReadOnly} /></FormControl><FormMessage /></FormItem>} />
             <FormField name={`rigs.${index}.compressorVehicle.regNo`} control={form.control} render={({ field }) => <FormItem><FormLabel>Reg No</FormLabel><FormControl><Input {...field} readOnly={finalIsReadOnly} /></FormControl><FormMessage /></FormItem>} />
             <FormField name={`rigs.${index}.compressorVehicle.chassisNo`} control={form.control} render={({ field }) => <FormItem><FormLabel>Chassis No</FormLabel><FormControl><Input {...field} readOnly={finalIsReadOnly} /></FormControl><FormMessage /></FormItem>} />
             <FormField name={`rigs.${index}.compressorVehicle.engineNo`} control={form.control} render={({ field }) => <FormItem><FormLabel>Engine No</FormLabel><FormControl><Input {...field} readOnly={finalIsReadOnly} /></FormControl><FormMessage /></FormItem>} />
          </div>
          <Separator />
          <p className="font-medium">Supporting Vehicle Details</p>
          <div className="grid md:grid-cols-4 gap-4">
             <FormField name={`rigs.${index}.supportingVehicle.type`} control={form.control} render={({ field }) => <FormItem><FormLabel>Type</FormLabel><FormControl><Input {...field} readOnly={finalIsReadOnly} /></FormControl><FormMessage /></FormItem>} />
             <FormField name={`rigs.${index}.supportingVehicle.regNo`} control={form.control} render={({ field }) => <FormItem><FormLabel>Reg No</FormLabel><FormControl><Input {...field} readOnly={finalIsReadOnly} /></FormControl><FormMessage /></FormItem>} />
             <FormField name={`rigs.${index}.supportingVehicle.chassisNo`} control={form.control} render={({ field }) => <FormItem><FormLabel>Chassis No</FormLabel><FormControl><Input {...field} readOnly={finalIsReadOnly} /></FormControl><FormMessage /></FormItem>} />
             <FormField name={`rigs.${index}.supportingVehicle.engineNo`} control={form.control} render={({ field }) => <FormItem><FormLabel>Engine No</FormLabel><FormControl><Input {...field} readOnly={finalIsReadOnly} /></FormControl><FormMessage /></FormItem>} />
          </div>
          <Separator />
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="font-medium">Compressor Details</p>
              <div className="grid md:grid-cols-2 gap-4 mt-2">
                <FormField name={`rigs.${index}.compressorDetails.model`} control={form.control} render={({ field }) => <FormItem><FormLabel>Model</FormLabel><FormControl><Input {...field} readOnly={finalIsReadOnly} /></FormControl><FormMessage /></FormItem>} />
                <FormField name={`rigs.${index}.compressorDetails.capacity`} control={form.control} render={({ field }) => <FormItem><FormLabel>Capacity</FormLabel><FormControl><Input {...field} readOnly={finalIsReadOnly} /></FormControl><FormMessage /></FormItem>} />
              </div>
            </div>
            <div>
              <p className="font-medium">Generator Details</p>
              <div className="grid md:grid-cols-2 gap-4 mt-2">
                <FormField name={`rigs.${index}.generatorDetails.model`} control={form.control} render={({ field }) => <FormItem><FormLabel>Model</FormLabel><FormControl><Input {...field} readOnly={finalIsReadOnly} /></FormControl><FormMessage /></FormItem>} />
                <FormField name={`rigs.${index}.generatorDetails.capacity`} control={form.control} render={({ field }) => <FormItem><FormLabel>Capacity</FormLabel><FormControl><Input {...field} readOnly={finalIsReadOnly} /></FormControl><FormMessage /></FormItem>} />
                <FormField name={`rigs.${index}.generatorDetails.type`} control={form.control} render={({ field }) => <FormItem><FormLabel>Type</FormLabel><FormControl><Input {...field} readOnly={finalIsReadOnly} /></FormControl><FormMessage /></FormItem>} />
                <FormField name={`rigs.${index}.generatorDetails.engineNo`} control={form.control} render={({ field }) => <FormItem><FormLabel>Engine No</FormLabel><FormControl><Input {...field} readOnly={finalIsReadOnly} /></FormControl><FormMessage /></FormItem>} />
              </div>
            </div>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};


export default function AgencyRegistrationPage() {
  const { applications, isLoading: applicationsLoading, addApplication, updateApplication, deleteApplication } = useAgencyApplications();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  
  const [renewalData, setRenewalData] = useState<{ rigIndex: number; data: Partial<RigRenewalFormData> } | null>(null);
  const [isRenewalDialogOpen, setIsRenewalDialogOpen] = useState(false);
  
  const [cancellationData, setCancellationData] = useState<{ rigIndex: number; reason: string; date: Date | undefined } | null>(null);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  
  const isEditor = user?.role === 'editor';

  const createDefaultOwner = (): OwnerInfo => ({ name: '', address: '', mobile: '' });
  const createDefaultRig = (): RigRegistration => ({
      id: uuidv4(),
      status: 'Active',
      renewals: [],
      history: [`Rig added on ${format(new Date(), 'dd/MM/yyyy')}`],
  });

  const form = useForm<AgencyApplication>({
    resolver: zodResolver(AgencyApplicationSchema),
    defaultValues: {
      owner: createDefaultOwner(),
      partners: [],
      rigs: [createDefaultRig()],
      status: 'Pending Verification',
      history: [`Application created on ${format(new Date(), 'dd/MM/yyyy')}`]
    },
  });
  
  const { fields: partnerFields, append: appendPartner, remove: removePartner } = useFieldArray({ control: form.control, name: "partners" });
  const { fields: rigFields, append: appendRig, remove: removeRig, update: updateRig } = useFieldArray({ control: form.control, name: "rigs" });
  
  useEffect(() => {
    if (selectedApplicationId) {
      if (selectedApplicationId === 'new') {
        form.reset({
          owner: createDefaultOwner(),
          partners: [],
          rigs: [createDefaultRig()],
          status: 'Pending Verification',
          history: [`Application created on ${format(new Date(), 'dd/MM/yyyy')}`]
        });
      } else {
        const app = applications.find(a => a.id === selectedApplicationId);
        if (app) {
          form.reset(app);
        } else {
          setSelectedApplicationId(null);
          form.reset({ owner: createDefaultOwner(), partners: [], rigs: [], status: 'Pending Verification', history: [] });
        }
      }
    } else {
        form.reset({ owner: createDefaultOwner(), partners: [], rigs: [], status: 'Pending Verification', history: [] });
    }
  }, [selectedApplicationId, applications, form]);
  
  const onSubmit = async (data: AgencyApplication) => {
      setIsSubmitting(true);
      try {
          if (selectedApplicationId && selectedApplicationId !== 'new') {
              await updateApplication(selectedApplicationId, data);
              toast({ title: "Application Updated", description: "The registration details have been updated." });
          } else {
              await addApplication(data);
              toast({ title: "Application Created", description: "The new agency registration has been saved." });
          }
          setSelectedApplicationId(null);
      } catch (error: any) {
          toast({ title: "Submission Failed", description: error.message, variant: "destructive" });
      } finally {
          setIsSubmitting(false);
      }
  };

  const handleAddNew = () => {
    setSelectedApplicationId('new');
  }
  
  const handleCancelEdit = () => {
    setSelectedApplicationId(null);
  }

  const handleAddRig = () => {
    if (rigFields.length < 3) {
      appendRig(createDefaultRig());
    } else {
      toast({ title: "Maximum Rigs Reached", description: "You can only register a maximum of 3 rigs per agency.", variant: "default" });
    }
  };

  const filteredApplications = useMemo(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    if (!lowercasedFilter) return applications;
    return applications.filter(app => 
        (app.agencyName.toLowerCase().includes(lowercasedFilter)) ||
        (app.owner.name.toLowerCase().includes(lowercasedFilter)) ||
        (app.fileNo?.toLowerCase().includes(lowercasedFilter)) ||
        (app.rigs.some(rig => rig.rigRegistrationNo?.toLowerCase().includes(lowercasedFilter)))
      );
  }, [applications, searchTerm]);

  const completedApplications = useMemo(() => {
    return filteredApplications.filter(app => app.status === 'Active');
  }, [filteredApplications]);
  
  const pendingApplications = useMemo(() => {
    return filteredApplications.filter(app => app.status === 'Pending Verification');
  }, [filteredApplications]);

  const handleUpdateRig = (rigIndex: number) => {
    const currentRig = form.getValues(`rigs.${rigIndex}`);
    const changes = Object.entries(currentRig).map(([key, value]) => `${key}: ${value}`).join(', ');
    const historyEntry = `Details updated on ${format(new Date(), 'dd/MM/yyyy')}: ${changes}`;
    
    updateRig(rigIndex, {
      ...currentRig,
      history: [...(currentRig.history || []), historyEntry],
    });
    toast({ title: "Rig Updated", description: "Rig details saved. Remember to save the entire application." });
  };
  
  const handleRenewRig = (rigIndex: number) => {
      setRenewalData({ rigIndex, data: {} });
      setIsRenewalDialogOpen(true);
  };

  const handleConfirmRenewal = () => {
    if (renewalData) {
        const { rigIndex, data } = renewalData;
        const rigToUpdate = rigFields[rigIndex];
        const newRenewal: RigRenewal = {
            id: uuidv4(),
            renewalDate: data.renewalDate!,
            renewalFee: data.renewalFee!,
            paymentDate: data.paymentDate,
            challanNo: data.challanNo,
            validTill: addYears(data.renewalDate!, 1),
        };
        updateRig(rigIndex, {
            ...rigToUpdate,
            registrationDate: newRenewal.renewalDate, // Update the main registration date
            renewals: [...(rigToUpdate.renewals || []), newRenewal],
            history: [...(rigToUpdate.history || []), `Renewed on ${format(new Date(), 'dd/MM/yyyy')}`],
        });
        setIsRenewalDialogOpen(false);
        setRenewalData(null);
        toast({ title: "Rig Renewed", description: "Renewal details added." });
    }
  };

  const handleCancelRig = (rigIndex: number) => {
      setCancellationData({ rigIndex, reason: '', date: new Date() });
      setIsCancelDialogOpen(true);
  };
  
  const handleConfirmCancellation = () => {
    if (cancellationData) {
        const { rigIndex, reason, date } = cancellationData;
        const rigToUpdate = rigFields[rigIndex];
        const historyEntry = `Cancelled on ${format(date!, 'dd/MM/yyyy')}. Reason: ${reason}`;
        updateRig(rigIndex, {
            ...rigToUpdate,
            status: 'Cancelled',
            cancellationDate: date,
            cancellationReason: reason,
            history: [...(rigToUpdate.history || []), historyEntry],
        });
        setIsCancelDialogOpen(false);
        setCancellationData(null);
        toast({ title: "Rig Cancelled", description: "The rig registration has been cancelled." });
    }
  };

  if (applicationsLoading || authLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading registrations...</p>
      </div>
    );
  }
  
  if (!user || user.role === 'supervisor') {
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
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>{selectedApplicationId === 'new' ? 'New Rig Registration' : 'Edit Rig Registration'}</CardTitle>
                        <CardDescription>Manage all details related to an agency and its rigs.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        {/* Section 1: Application Details */}
                        <Accordion type="single" collapsible defaultValue="item-1" className="w-full">
                            <AccordionItem value="item-1">
                                <AccordionTrigger>1. Application Details</AccordionTrigger>
                                <AccordionContent className="pt-4 space-y-4">
                                     <div className="grid md:grid-cols-3 gap-4">
                                        <FormField name="fileNo" render={({ field }) => <FormItem><FormLabel>File No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                                        <FormField name="agencyName" render={({ field }) => <FormItem className="md:col-span-2"><FormLabel>Agency Name & Address</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>} />
                                    </div>
                                    <Separator />
                                     <div className="space-y-2">
                                        <h4 className="font-medium">Owner Details</h4>
                                        <div className="grid md:grid-cols-3 gap-4 p-2 border rounded-md">
                                            <FormField name="owner.name" render={({ field }) => <FormItem><FormLabel>Owner Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                                            <FormField name="owner.address" render={({ field }) => <FormItem><FormLabel>Owner Address</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>} />
                                            <FormField name="owner.mobile" render={({ field }) => <FormItem><FormLabel>Mobile No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="font-medium">Partner Details</h4>
                                        {partnerFields.map((field, index) => (
                                            <div key={field.id} className="grid md:grid-cols-4 gap-4 p-2 border rounded-md items-end">
                                                <FormField name={`partners.${index}.name`} render={({ field }) => <FormItem><FormLabel>Partner Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                                                <FormField name={`partners.${index}.address`} render={({ field }) => <FormItem><FormLabel>Partner Address</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>} />
                                                <FormField name={`partners.${index}.mobile`} render={({ field }) => <FormItem><FormLabel>Mobile No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                                                <Button type="button" variant="destructive" size="icon" onClick={() => removePartner(index)}><Trash2 className="h-4 w-4" /></Button>
                                            </div>
                                        ))}
                                        {partnerFields.length < 2 && <Button type="button" variant="outline" size="sm" onClick={() => appendPartner(createDefaultOwner())}><UserPlus className="mr-2 h-4 w-4" /> Add Partner</Button>}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                        
                        {/* Section 2: Agency Registration */}
                        <Accordion type="single" collapsible defaultValue="item-1">
                          <AccordionItem value="item-1">
                            <AccordionTrigger>2. Agency Registration</AccordionTrigger>
                            <AccordionContent className="pt-4 grid md:grid-cols-3 gap-4">
                               <FormField name="agencyRegistrationNo" render={({ field }) => <FormItem><FormLabel>Agency Reg. No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                               <FormField name="agencyRegistrationDate" render={({ field }) => <FormItem><FormLabel>Reg. Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className="w-full"><CalendarIcon className="mr-2 h-4 w-4"/>{field.value ? format(new Date(field.value), 'dd/MM/yyyy') : 'Select Date'}</Button></FormControl></PopoverTrigger><PopoverContent><Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem>} />
                               <FormField name="agencyRegistrationFee" render={({ field }) => <FormItem><FormLabel>Reg. Fee</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
                               <FormField name="agencyPaymentDate" render={({ field }) => <FormItem><FormLabel>Payment Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className="w-full"><CalendarIcon className="mr-2 h-4 w-4"/>{field.value ? format(new Date(field.value), 'dd/MM/yyyy') : 'Select Date'}</Button></FormControl></PopoverTrigger><PopoverContent><Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem>} />
                               <FormField name="agencyChallanNo" render={({ field }) => <FormItem className="md:col-span-2"><FormLabel>Challan No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>

                        {/* Section 3: Rig Registrations */}
                        <Accordion type="single" collapsible defaultValue="item-1">
                          <AccordionItem value="item-1">
                            <AccordionTrigger>3. Rig Registrations ({rigFields.length} Total)</AccordionTrigger>
                            <AccordionContent className="pt-4 space-y-4">
                              <Accordion type="multiple" className="w-full space-y-2">
                                {rigFields.map((field, index) => (
                                  <RigAccordionItem
                                    key={field.id}
                                    field={field as RigRegistration}
                                    index={index}
                                    onRemove={isEditor ? removeRig : undefined}
                                    onUpdate={handleUpdateRig}
                                    onRenew={handleRenewRig}
                                    onCancel={handleCancelRig}
                                    form={form}
                                  />
                                ))}
                              </Accordion>
                               {isEditor && rigFields.length < 3 && <Button className="mt-4" type="button" variant="outline" size="sm" onClick={handleAddRig}><PlusCircle className="mr-2 h-4 w-4" /> Add Another Rig</Button>}
                               {isEditor && rigFields.length >= 3 && <p className="text-sm text-muted-foreground mt-4">A maximum of 3 rig registrations are allowed.</p>}
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                        
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={handleCancelEdit} disabled={isSubmitting}><X className="mr-2 h-4 w-4"/> Cancel</Button>
                        <Button type="submit" disabled={isSubmitting}><Save className="mr-2 h-4 w-4"/> {isSubmitting ? "Saving..." : "Save Registration"}</Button>
                    </CardFooter>
                </Card>
            </form>
            <Dialog open={isRenewalDialogOpen} onOpenChange={setIsRenewalDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                    <DialogTitle>Renew Rig Registration</DialogTitle>
                    <DialogDescription>Enter renewal details for the rig.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="renewalFee" className="text-right">Renewal Fee</Label>
                        <Input id="renewalFee" type="number" value={renewalData?.data.renewalFee || ''} onChange={(e) => setRenewalData(d => ({ ...d!, data: { ...d!.data, renewalFee: +e.target.value } }))} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Payment Date</Label>
                        <Popover>
                        <PopoverTrigger asChild><Button variant="outline" className="col-span-3"><CalendarIcon className="mr-2 h-4 w-4"/>{renewalData?.data.paymentDate ? format(renewalData.data.paymentDate, 'dd/MM/yyyy') : 'Select'}</Button></PopoverTrigger>
                        <PopoverContent><Calendar mode="single" selected={renewalData?.data.paymentDate} onSelect={(date) => setRenewalData(d => ({ ...d!, data: { ...d!.data, paymentDate: date } }))} /></PopoverContent>
                        </Popover>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="challanNo" className="text-right">Challan No.</Label>
                        <Input id="challanNo" value={renewalData?.data.challanNo || ''} onChange={(e) => setRenewalData(d => ({ ...d!, data: { ...d!.data, challanNo: e.target.value } }))} className="col-span-3" />
                    </div>
                    </div>
                    <DialogFooter>
                    <Button onClick={handleConfirmRenewal}>Confirm Renewal</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                    <DialogTitle>Cancel Rig Registration</DialogTitle>
                    <DialogDescription>Provide details for the cancellation.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Date of Cancellation</Label>
                        <Popover>
                        <PopoverTrigger asChild><Button variant="outline" className="col-span-3"><CalendarIcon className="mr-2 h-4 w-4"/>{cancellationData?.date ? format(cancellationData.date, 'dd/MM/yyyy') : 'Select'}</Button></PopoverTrigger>
                        <PopoverContent><Calendar mode="single" selected={cancellationData?.date} onSelect={(date) => setCancellationData(d => ({ ...d!, date: date }))} /></PopoverContent>
                        </Popover>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="cancellationReason" className="text-right">Reason</Label>
                        <Textarea id="cancellationReason" value={cancellationData?.reason || ''} onChange={(e) => setCancellationData(d => ({ ...d!, reason: e.target.value }))} className="col-span-3" />
                    </div>
                    </div>
                    <DialogFooter>
                    <Button onClick={handleConfirmCancellation} variant="destructive">Confirm Cancellation</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </FormProvider>
      );
  }

  // LIST VIEW
  return (
    <>
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">Rig Registrations</CardTitle>
                <CardDescription>Manage agency and rig registrations.</CardDescription>
              </div>
              <Button onClick={handleAddNew}><FilePlus className="mr-2 h-4 w-4" /> Add New Registration</Button>
          </div>
          <div className="relative pt-4 mt-4 border-t">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input type="search" placeholder="Search by agency, owner, file no, rig no..." className="w-full rounded-lg bg-background pl-10 shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
           <Tabs defaultValue="completed">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="completed">Registration Completed ({completedApplications.length})</TabsTrigger>
                    <TabsTrigger value="pending">Pending Applications ({pendingApplications.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="completed" className="mt-4">
                    <AgencyTable 
                        applications={completedApplications} 
                        onEdit={(id) => setSelectedApplicationId(id)}
                        onDelete={(id) => deleteApplication(id)}
                        searchTerm={searchTerm}
                    />
                </TabsContent>
                <TabsContent value="pending" className="mt-4">
                    <AgencyTable 
                        applications={pendingApplications} 
                        onEdit={(id) => setSelectedApplicationId(id)}
                        onDelete={(id) => deleteApplication(id)}
                        searchTerm={searchTerm}
                    />
                </TabsContent>
           </Tabs>
        </CardContent>
      </Card>
    </div>
    </>
  );
}
