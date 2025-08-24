
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
import { Loader2, Search, PlusCircle, Save, X, Edit, Trash2, ShieldAlert, CalendarIcon, UserPlus, FilePlus, History, ChevronsUpDown, RotateCcw, RefreshCw, CheckCircle, Info } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { format, addYears, isValid, isBefore } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";


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
    control, 
    index, 
    field, 
    removeRig, 
    onToggleStatus,
}: { 
    control: any, 
    index: number, 
    field: any, 
    removeRig: (index: number) => void, 
    onToggleStatus: (index: number, status: 'Active' | 'Cancelled') => void,
}) => {
    const rigTypeValue = useWatch({
        control,
        name: `rigs.${index}.typeOfRig`,
    });
    
    const registrationDate = useWatch({
        control,
        name: `rigs.${index}.registrationDate`
    });
    
    const latestRenewal = useMemo(() => {
      if (!field.renewals || field.renewals.length === 0) return null;
      return [...field.renewals].sort((a,b) => new Date(b.renewalDate).getTime() - new Date(a.renewalDate).getTime())[0];
    }, [field.renewals]);

    const lastEffectiveDate = latestRenewal ? new Date(latestRenewal.renewalDate) : (registrationDate ? new Date(registrationDate) : null);

    const validityDate = lastEffectiveDate && isValid(lastEffectiveDate) 
        ? new Date(addYears(lastEffectiveDate, 1).getTime() - (24 * 60 * 60 * 1000))
        : null;

    const isExpired = field.status === 'Active' && validityDate && isBefore(validityDate, new Date());
    const finalIsReadOnly = field.status === 'Cancelled';

    return (
        <AccordionItem value={`rig-${index}`} key={field.id} className="border bg-background rounded-lg shadow-sm">
            <div className="flex items-center w-full border-b">
                <AccordionTrigger className={cn("flex-1 text-base font-semibold px-4", field.status === 'Cancelled' && "text-destructive line-through", isExpired && "text-amber-600")}>
                    Rig #{index+1} - {rigTypeValue || 'Unspecified Type'} 
                     ({field.status === 'Active' && isExpired ? <span className="text-destructive">Expired</span> : field.status})
                </AccordionTrigger>
                <div className="ml-auto mr-2 shrink-0">
                    {field.status !== 'Cancelled' && (
                        <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive hover:text-destructive/90"
                            onClick={(e) => {
                                e.stopPropagation(); // prevent accordion from toggling
                                removeRig(index);
                            }}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>
            <AccordionContent className="p-6 pt-0">
                <div className="border-t pt-6 space-y-4">
                {field.status === 'Cancelled' && (
                    <div className="p-4 bg-destructive/10 border-l-4 border-destructive text-center rounded-r-md">
                        <p className="font-semibold text-destructive mb-2">This rig registration is Cancelled.</p>
                         <Button type="button" size="sm" onClick={() => onToggleStatus(index, 'Active')}><RefreshCw className="mr-2 h-4 w-4" />Re-Activate Rig</Button>
                    </div>
                )}
                {/* Rig registration details form fields go here */}
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <FormField name={`rigs.${index}.rigRegistrationNo`} render={({ field }) => <FormItem><FormLabel>Rig Reg. No.</FormLabel><FormControl><Input {...field} readOnly={finalIsReadOnly} /></FormControl></FormItem>} />
                    <FormField
                        control={control}
                        name={`rigs.${index}.typeOfRig`}
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Type of Rig</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={finalIsReadOnly}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select Type of Rig" /></SelectTrigger></FormControl>
                                <SelectContent>
                                    {rigTypeOptions.map(option => (
                                        <SelectItem key={option} value={option}>{option}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField name={`rigs.${index}.registrationDate`} render={({ field }) => <FormItem><FormLabel>Last Reg/Renewal Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className="w-full" disabled={finalIsReadOnly}><CalendarIcon className="mr-2 h-4 w-4"/>{lastEffectiveDate ? format(new Date(lastEffectiveDate), 'dd/MM/yyyy') : 'Select'}</Button></FormControl></PopoverTrigger><PopoverContent><Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={field.onChange} disabled={finalIsReadOnly} /></PopoverContent></Popover></FormItem>} />
                    <FormItem>
                        <FormLabel>Validity Upto</FormLabel>
                        <FormControl>
                            <Input 
                                value={validityDate ? format(validityDate, 'dd/MM/yyyy') : 'N/A'}
                                disabled 
                                className="bg-muted/50"
                            />
                        </FormControl>
                    </FormItem>
                </div>
                 <div className="grid md:grid-cols-3 gap-4">
                    <FormField name={`rigs.${index}.registrationFee`} render={({ field }) => <FormItem><FormLabel>Reg. Fee</FormLabel><FormControl><Input type="number" {...field} readOnly={finalIsReadOnly} /></FormControl></FormItem>} />
                    <FormField name={`rigs.${index}.paymentDate`} render={({ field }) => <FormItem><FormLabel>Payment Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className="w-full" disabled={finalIsReadOnly}><CalendarIcon className="mr-2 h-4 w-4"/>{field.value ? format(new Date(field.value), 'dd/MM/yyyy') : 'Select'}</Button></FormControl></PopoverTrigger><PopoverContent><Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={field.onChange} disabled={finalIsReadOnly}/></PopoverContent></Popover></FormItem>} />
                    <FormField name={`rigs.${index}.challanNo`} render={({ field }) => <FormItem><FormLabel>Challan No.</FormLabel><FormControl><Input {...field} readOnly={finalIsReadOnly} /></FormControl></FormItem>} />
                </div>
                <Separator />
                <p className="font-medium">Rig Vehicle Details</p>
                <div className="grid md:grid-cols-4 gap-4">
                    <FormField name={`rigs.${index}.rigVehicle.type`} render={({ field }) => <FormItem><FormLabel>Type</FormLabel><FormControl><Input {...field} readOnly={finalIsReadOnly} /></FormControl></FormItem>} />
                    <FormField name={`rigs.${index}.rigVehicle.regNo`} render={({ field }) => <FormItem><FormLabel>Reg No</FormLabel><FormControl><Input {...field} readOnly={finalIsReadOnly} /></FormControl></FormItem>} />
                    <FormField name={`rigs.${index}.rigVehicle.chassisNo`} render={({ field }) => <FormItem><FormLabel>Chassis No</FormLabel><FormControl><Input {...field} readOnly={finalIsReadOnly} /></FormControl></FormItem>} />
                    <FormField name={`rigs.${index}.rigVehicle.engineNo`} render={({ field }) => <FormItem><FormLabel>Engine No</FormLabel><FormControl><Input {...field} readOnly={finalIsReadOnly} /></FormControl></FormItem>} />
                </div>
                 <Separator />
                <p className="font-medium">Compressor Vehicle Details</p>
                <div className="grid md:grid-cols-4 gap-4">
                    <FormField name={`rigs.${index}.compressorVehicle.type`} render={({ field }) => <FormItem><FormLabel>Type</FormLabel><FormControl><Input {...field} readOnly={finalIsReadOnly} /></FormControl></FormItem>} />
                    <FormField name={`rigs.${index}.compressorVehicle.regNo`} render={({ field }) => <FormItem><FormLabel>Reg No</FormLabel><FormControl><Input {...field} readOnly={finalIsReadOnly} /></FormControl></FormItem>} />
                    <FormField name={`rigs.${index}.compressorVehicle.chassisNo`} render={({ field }) => <FormItem><FormLabel>Chassis No</FormLabel><FormControl><Input {...field} readOnly={finalIsReadOnly} /></FormControl></FormItem>} />
                    <FormField name={`rigs.${index}.compressorVehicle.engineNo`} render={({ field }) => <FormItem><FormLabel>Engine No</FormLabel><FormControl><Input {...field} readOnly={finalIsReadOnly} /></FormControl></FormItem>} />
                </div>
                 <Separator />
                <p className="font-medium">Supporting Vehicle Details</p>
                <div className="grid md:grid-cols-4 gap-4">
                    <FormField name={`rigs.${index}.supportingVehicle.type`} render={({ field }) => <FormItem><FormLabel>Type</FormLabel><FormControl><Input {...field} readOnly={finalIsReadOnly} /></FormControl></FormItem>} />
                    <FormField name={`rigs.${index}.supportingVehicle.regNo`} render={({ field }) => <FormItem><FormLabel>Reg No</FormLabel><FormControl><Input {...field} readOnly={finalIsReadOnly} /></FormControl></FormItem>} />
                    <FormField name={`rigs.${index}.supportingVehicle.chassisNo`} render={({ field }) => <FormItem><FormLabel>Chassis No</FormLabel><FormControl><Input {...field} readOnly={finalIsReadOnly} /></FormControl></FormItem>} />
                    <FormField name={`rigs.${index}.supportingVehicle.engineNo`} render={({ field }) => <FormItem><FormLabel>Engine No</FormLabel><FormControl><Input {...field} readOnly={finalIsReadOnly} /></FormControl></FormItem>} />
                </div>
                <Separator />
                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <p className="font-medium">Compressor Details</p>
                        <div className="grid md:grid-cols-2 gap-4 mt-2">
                             <FormField name={`rigs.${index}.compressorDetails.model`} render={({ field }) => <FormItem><FormLabel>Model</FormLabel><FormControl><Input {...field} readOnly={finalIsReadOnly} /></FormControl></FormItem>} />
                             <FormField name={`rigs.${index}.compressorDetails.capacity`} render={({ field }) => <FormItem><FormLabel>Capacity</FormLabel><FormControl><Input {...field} readOnly={finalIsReadOnly} /></FormControl></FormItem>} />
                        </div>
                    </div>
                     <div>
                        <p className="font-medium">Generator Details</p>
                        <div className="grid md:grid-cols-2 gap-4 mt-2">
                             <FormField name={`rigs.${index}.generatorDetails.model`} render={({ field }) => <FormItem><FormLabel>Model</FormLabel><FormControl><Input {...field} readOnly={finalIsReadOnly} /></FormControl></FormItem>} />
                             <FormField name={`rigs.${index}.generatorDetails.capacity`} render={({ field }) => <FormItem><FormLabel>Capacity</FormLabel><FormControl><Input {...field} readOnly={finalIsReadOnly} /></FormControl></FormItem>} />
                             <FormField name={`rigs.${index}.generatorDetails.type`} render={({ field }) => <FormItem><FormLabel>Type</FormLabel><FormControl><Input {...field} readOnly={finalIsReadOnly} /></FormControl></FormItem>} />
                             <FormField name={`rigs.${index}.generatorDetails.engineNo`} render={({ field }) => <FormItem><FormLabel>Engine No</FormLabel><FormControl><Input {...field} readOnly={finalIsReadOnly} /></FormControl></FormItem>} />
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
  
  const canManage = user?.role === 'editor';

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
  const { fields: rigFields, append: appendRig, remove: removeRig, update: updateRig, replace: replaceRigs } = useFieldArray({ control: form.control, name: "rigs" });
  
  useEffect(() => {
    if (selectedApplicationId === 'new') {
        return;
    }
    if (selectedApplicationId) {
      const app = applications.find(a => a.id === selectedApplicationId);
      if (app) {
        form.reset(app);
      } else {
        setSelectedApplicationId(null);
        form.reset({ owner: createDefaultOwner(), partners: [], rigs: [createDefaultRig()], status: 'Pending Verification', history: [`Application created on ${format(new Date(), 'dd/MM/yyyy')}`]});
      }
    } else if (selectedApplicationId === null) {
        form.reset({ owner: createDefaultOwner(), partners: [], rigs: [createDefaultRig()], status: 'Pending Verification', history: [`Application created on ${format(new Date(), 'dd/MM/yyyy')}`]});
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
    form.reset({
        owner: createDefaultOwner(),
        partners: [],
        rigs: [createDefaultRig()],
        status: 'Pending Verification',
        history: [`Application created on ${format(new Date(), 'dd/MM/yyyy')}`]
    });
  }
  
  const handleCancelEdit = () => {
    setSelectedApplicationId(null);
  }

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

  const toggleRigStatus = (rigIndex: number, newStatus: 'Active' | 'Cancelled') => {
    const rig = form.getValues(`rigs.${rigIndex}`);
    const historyEntry = `Status changed to ${newStatus} on ${format(new Date(), 'dd/MM/yyyy')}`;
    updateRig(rigIndex, {
      ...rig,
      status: newStatus,
      history: [...(rig.history || []), historyEntry]
    });
  };

  if (applicationsLoading || authLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading registrations...</p>
      </div>
    );
  }
  
  if (!canManage) {
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

                        {/* Section 3: Rig Registration */}
                        <Accordion type="single" collapsible defaultValue="item-1">
                            <AccordionItem value="item-1">
                                <AccordionTrigger>3. Rig Registrations ({rigFields.length} Total)</AccordionTrigger>
                                <AccordionContent className="pt-4 space-y-4">
                                     {rigFields.length > 0 ? (
                                        <Accordion type="multiple" className="w-full space-y-2">
                                            {rigFields.map((field, index) => (
                                                <RigAccordionItem 
                                                    key={field.id}
                                                    control={form.control} 
                                                    index={index}
                                                    field={field}
                                                    removeRig={() => removeRig(index)}
                                                    onToggleStatus={toggleRigStatus}
                                                />
                                            ))}
                                        </Accordion>
                                    ) : (
                                        <p className="text-sm text-muted-foreground p-4 text-center">No rigs found. Add one to get started.</p>
                                    )}
                                    {rigFields.filter(r => r.status === 'Active').length < 3 && <Button className="mt-4" type="button" variant="outline" size="sm" onClick={() => appendRig(createDefaultRig())}><PlusCircle className="mr-2 h-4 w-4" /> Add Another Rig</Button>}
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                        
                         {/* Section 4: Removed */}
                        
                        {/* Section 5: Agency Overview */}
                        <Accordion type="single" collapsible>
                            <AccordionItem value="item-1">
                                <AccordionTrigger>4. Agency Overview</AccordionTrigger>
                                <AccordionContent className="pt-4 space-y-2">
                                    <div className="flex items-center gap-4 p-4 bg-secondary/30 rounded-lg">
                                        <Info className="h-8 w-8 text-primary" />
                                        <div>
                                            <h4 className="font-semibold text-foreground">Application Summary</h4>
                                            <p className="text-sm text-muted-foreground">
                                                This application has {rigFields.filter(r=>r.status === 'Active').length} currently active rig(s).
                                                The overall status of this agency application is <Badge>{form.getValues('status')}</Badge>.
                                            </p>
                                        </div>
                                    </div>
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
