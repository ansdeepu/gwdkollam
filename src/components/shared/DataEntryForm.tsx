
// src/components/shared/DataEntryForm.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useForm, useFieldArray, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  DataEntrySchema,
  type DataEntryFormData,
  type RemittanceDetailFormData,
  type PaymentDetailFormData,
  type SiteDetailFormData,
  applicationTypeOptions,
  applicationTypeDisplayMap,
  fileStatusOptions,
  siteWorkStatusOptions,
  sitePurposeOptions,
  siteDiameterOptions,
  siteTypeOfRigOptions,
  siteConditionsOptions,
  constituencyOptions,
  remittedAccountOptions,
  paymentAccountOptions,
  type ApplicationType,
  type UserProfile,
  type StaffMember,
  type UserRole,
} from "@/lib/schemas";
import { useFileEntries } from "@/hooks/useFileEntries";
import { usePendingUpdates } from "@/hooks/usePendingUpdates";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { format, isValid } from 'date-fns';

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Save, X, PlusCircle, Trash2, CalendarIcon, UserPlus, ChevronsUpDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";


interface DataEntryFormProps {
  initialData: DataEntryFormData;
  fileNoToEdit?: string;
  supervisorList: Array<{ uid: string; name: string }>;
  userRole?: UserRole;
}

export default function DataEntryFormComponent({ initialData, fileNoToEdit, supervisorList, userRole }: DataEntryFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { addFileEntry, getFileEntry } = useFileEntries();
  const { createPendingUpdate, hasPendingUpdateForFile } = usePendingUpdates();
  const { user } = useAuth();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const isEditor = userRole === 'editor';
  const isSupervisor = userRole === 'supervisor';
  const isViewer = userRole === 'viewer';
  const isEditing = !!fileNoToEdit;
  const isReadOnly = isViewer || (isSupervisor && !isEditing);


  const form = useForm<DataEntryFormData>({
    resolver: zodResolver(DataEntrySchema),
    defaultValues: initialData,
  });
  
  const { fields: remittanceFields, append: appendRemittance, remove: removeRemittance } = useFieldArray({ control: form.control, name: "remittanceDetails" });
  const { fields: siteFields, append: appendSite, remove: removeSite, update: updateSite } = useFieldArray({ control: form.control, name: "siteDetails" });
  const { fields: paymentFields, append: appendPayment, remove: removePayment } = useFieldArray({ control: form.control, name: "paymentDetails" });

  // Watch for changes in remittance and payment to auto-calculate totals
  const remittanceDetails = form.watch("remittanceDetails");
  const paymentDetails = form.watch("paymentDetails");

  useEffect(() => {
    const totalRemittance = remittanceDetails?.reduce((acc, curr) => acc + (Number(curr.amountRemitted) || 0), 0) ?? 0;
    form.setValue("totalRemittance", totalRemittance);
  }, [remittanceDetails, form]);

  useEffect(() => {
    let grandTotalPayment = 0;
    paymentDetails?.forEach((pd, index) => {
      const entryTotal = (Number(pd.contractorsPayment) || 0) + (Number(pd.gst) || 0) + (Number(pd.incomeTax) || 0) + (Number(pd.kbcwb) || 0) + (Number(pd.refundToParty) || 0);
      form.setValue(`paymentDetails.${index}.totalPaymentPerEntry`, entryTotal);
      grandTotalPayment += entryTotal;
    });
    form.setValue("totalPaymentAllEntries", grandTotalPayment);
  }, [paymentDetails, form]);
  
  useEffect(() => {
      const totalRemittance = form.getValues("totalRemittance") || 0;
      const totalPayment = form.getValues("totalPaymentAllEntries") || 0;
      form.setValue("overallBalance", totalRemittance - totalPayment);
  }, [remittanceDetails, paymentDetails, form]);


  const onSubmit = async (data: DataEntryFormData) => {
    if (isViewer) return;
    setIsSubmitting(true);
    
    try {
        if (isEditor) {
            // Editors perform a full create/update
            const fileAlreadyExists = getFileEntry(data.fileNo);
            if (fileAlreadyExists && !isEditing) {
                form.setError("fileNo", { type: "manual", message: "This File No. already exists. Please use a unique File No." });
                throw new Error("Duplicate File No.");
            }
            await addFileEntry(data, fileNoToEdit);
            toast({ title: isEditing ? "File Updated" : "File Created", description: `File No. ${data.fileNo} has been saved.` });
        } else if (isSupervisor && isEditing && user) {
            // Supervisors submit changes for approval
            const updatedSites = data.siteDetails?.filter(site => site.supervisorUid === user.uid) ?? [];
            if (updatedSites.length === 0) {
                 toast({ title: "No Changes", description: "You have not made changes to any sites assigned to you.", variant: "default" });
                 setIsSubmitting(false);
                 return;
            }

            // Check if an update for this file by this supervisor is already pending
             if (await hasPendingUpdateForFile(data.fileNo, user.uid)) {
                toast({ title: "Update Already Pending", description: "You already have an update for this file awaiting approval.", variant: "destructive" });
                setIsSubmitting(false);
                return;
            }

            await createPendingUpdate(data.fileNo, updatedSites, user as UserProfile);
            toast({ title: "Update Submitted", description: "Your changes have been sent for approval." });
        }
        
        router.push('/dashboard/file-room');
    } catch (error: any) {
        if(error.message !== "Duplicate File No.") {
          toast({ title: "Submission Failed", description: error.message, variant: "destructive" });
        }
    } finally {
        if (isEditor) {
           setIsSubmitting(false);
        }
    }
  };

  const handleAddSite = () => {
    appendSite({
      nameOfSite: "",
      purpose: "BWC",
      workStatus: "Under Process",
      additionalAS: 'No',
      drillingRemarks: "",
      workRemarks: "",
      noOfBeneficiary: "",
      supervisorUid: null,
      supervisorName: null,
    });
  };

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Accordion type="multiple" defaultValue={["item-1", "item-2", "item-3", "item-4"]} className="w-full space-y-4">
            
            {/* Section 1: Main Application Details */}
            <AccordionItem value="item-1" className="border-b-0">
                 <AccordionTrigger className="text-lg font-semibold px-4 py-3 bg-secondary/30 rounded-t-lg">1. Main Application Details</AccordionTrigger>
                 <AccordionContent className="p-6 border border-t-0 rounded-b-lg space-y-6">
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <FormField name="fileNo" render={({ field }) => ( <FormItem><FormLabel>File No. *</FormLabel><FormControl><Input {...field} readOnly={isReadOnly || isEditing} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField name="applicationType" render={({ field }) => ( <FormItem><FormLabel>Type of Application *</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl><SelectContent>{applicationTypeOptions.map(o => <SelectItem key={o} value={o}>{applicationTypeDisplayMap[o]}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                        <FormField name="applicantName" render={({ field }) => ( <FormItem className="lg:col-span-2"><FormLabel>Name & Address of Applicant *</FormLabel><FormControl><Textarea {...field} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField name="phoneNo" render={({ field }) => ( <FormItem><FormLabel>Phone No.</FormLabel><FormControl><Input {...field} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField name="constituency" render={({ field }) => ( <FormItem><FormLabel>Constituency (LAC) *</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue placeholder="Select constituency" /></SelectTrigger></FormControl><SelectContent>{[...constituencyOptions].sort((a,b) => a.localeCompare(b)).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                        <FormField name="estimateAmount" render={({ field }) => ( <FormItem><FormLabel>Total Estimate Amount (₹)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem> )} />
                    </div>
                 </AccordionContent>
            </AccordionItem>

            {/* Section 2: Remittance Details */}
             <AccordionItem value="item-2" className="border-b-0">
                 <AccordionTrigger className="text-lg font-semibold px-4 py-3 bg-secondary/30 rounded-t-lg">2. Remittance Details</AccordionTrigger>
                 <AccordionContent className="p-6 border border-t-0 rounded-b-lg space-y-4">
                    {remittanceFields.map((field, index) => (
                        <div key={field.id} className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 p-4 border rounded-md items-end bg-background">
                            <FormField name={`remittanceDetails.${index}.amountRemitted`} render={({ field }) => <FormItem><FormLabel>Amount Remitted (₹)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                            <FormField name={`remittanceDetails.${index}.dateOfRemittance`} render={({ field }) => ( <FormItem><FormLabel>Date of Remittance</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")} disabled={isReadOnly}><CalendarIcon className="mr-2 h-4 w-4"/>{field.value && isValid(new Date(field.value)) ? format(new Date(field.value), 'dd/MM/yyyy') : 'Select Date'}</Button></FormControl></PopoverTrigger><PopoverContent><Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem> )} />
                            <FormField name={`remittanceDetails.${index}.remittedAccount`} render={({ field }) => ( <FormItem><FormLabel>Remitted Account</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger></FormControl><SelectContent>{remittedAccountOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                            {isEditor && <Button type="button" variant="destructive" size="icon" onClick={() => removeRemittance(index)}><Trash2 className="h-4 w-4" /></Button>}
                        </div>
                    ))}
                    {isEditor && <Button type="button" variant="outline" onClick={() => appendRemittance({})} size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Remittance Entry</Button>}
                    <FormField name="totalRemittance" render={({ field }) => ( <FormItem><FormLabel className="font-semibold text-base">Total Remittance (₹)</FormLabel><FormControl><Input type="number" {...field} readOnly className="font-bold text-lg bg-muted" /></FormControl></FormItem> )} />
                 </AccordionContent>
            </AccordionItem>

            {/* Section 3: Site Details */}
             <AccordionItem value="item-3" className="border-b-0">
                 <AccordionTrigger className="text-lg font-semibold px-4 py-3 bg-secondary/30 rounded-t-lg">3. Site Details ({siteFields.length})</AccordionTrigger>
                 <AccordionContent className="p-6 border border-t-0 rounded-b-lg space-y-4">
                    <Accordion type="multiple" className="w-full space-y-4">
                        {siteFields.map((field, index) => {
                            const isSupervisorForSite = isSupervisor && field.supervisorUid === user?.uid;
                            const isSiteEditable = isEditor || isSupervisorForSite;
                            
                            return (
                            <AccordionItem key={field.id} value={`site-${index}`} className="border bg-background rounded-lg shadow-sm">
                               <div className="flex items-center w-full border-b pr-2">
                                  <AccordionTrigger className="flex-1 text-base font-semibold px-4">{`Site #${index + 1}: ${form.watch(`siteDetails.${index}.nameOfSite`) || 'New Site'}`}</AccordionTrigger>
                                  {isEditor && <Button type="button" variant="destructive" size="icon" className="h-8 w-8 ml-auto" onClick={() => removeSite(index)}><Trash2 className="h-4 w-4" /></Button>}
                               </div>
                               <AccordionContent className="p-6 pt-0">
                                <div className="border-t pt-6 space-y-6">
                                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                                     <FormField name={`siteDetails.${index}.nameOfSite`} render={({ field }) => <FormItem><FormLabel>Name of Site *</FormLabel><FormControl><Input {...field} readOnly={!isSiteEditable} /></FormControl><FormMessage /></FormItem>} />
                                     <FormField name={`siteDetails.${index}.purpose`} render={({ field }) => ( <FormItem><FormLabel>Purpose *</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!isSiteEditable}><FormControl><SelectTrigger><SelectValue placeholder="Select purpose" /></SelectTrigger></FormControl><SelectContent>{sitePurposeOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                                     <FormField name={`siteDetails.${index}.workStatus`} render={({ field }) => ( <FormItem><FormLabel>Work Status *</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!isSiteEditable}><FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl><SelectContent>{siteWorkStatusOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                                     <FormField name={`siteDetails.${index}.dateOfCompletion`} render={({ field }) => ( <FormItem><FormLabel>Date of Completion</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")} disabled={!isSiteEditable}><CalendarIcon className="mr-2 h-4 w-4"/>{field.value && isValid(new Date(field.value)) ? format(new Date(field.value), 'dd/MM/yyyy') : 'Select Date'}</Button></FormControl></PopoverTrigger><PopoverContent><Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem> )} />
                                  </div>
                                  <Separator />
                                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                                     <FormField name={`siteDetails.${index}.latitude`} render={({ field }) => <FormItem><FormLabel>Latitude</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={!isSiteEditable} /></FormControl><FormMessage /></FormItem>} />
                                     <FormField name={`siteDetails.${index}.longitude`} render={({ field }) => <FormItem><FormLabel>Longitude</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={!isSiteEditable} /></FormControl><FormMessage /></FormItem>} />
                                     <FormField name={`siteDetails.${index}.totalExpenditure`} render={({ field }) => <FormItem><FormLabel>Total Expenditure (₹)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={!isSiteEditable} /></FormControl><FormMessage /></FormItem>} />
                                     <FormField name={`siteDetails.${index}.noOfBeneficiary`} render={({ field }) => <FormItem><FormLabel>No of Beneficiary</FormLabel><FormControl><Input {...field} readOnly={!isSiteEditable} /></FormControl><FormMessage /></FormItem>} />
                                     <FormField name={`siteDetails.${index}.workRemarks`} render={({ field }) => <FormItem className="lg:col-span-2"><FormLabel>Work Remarks</FormLabel><FormControl><Textarea {...field} readOnly={!isSiteEditable} /></FormControl><FormMessage /></FormItem>} />
                                     <FormField control={form.control} name={`siteDetails.${index}.supervisorUid`} render={({ field: selectField }) => (
                                          <FormItem>
                                          <FormLabel>Assign Supervisor</FormLabel>
                                              <Select onValueChange={(value) => { const selectedStaff = supervisorList.find(s => s.uid === value); form.setValue(`siteDetails.${index}.supervisorUid`, selectedStaff?.uid || null); form.setValue(`siteDetails.${index}.supervisorName`, selectedStaff?.name || null); }} value={selectField.value || ''} disabled={!isEditor}>
                                              <FormControl><SelectTrigger><SelectValue placeholder="Select supervisor" /></SelectTrigger></FormControl>
                                              <SelectContent>
                                                <SelectItem value="_unassign_" onSelect={(e) => { e.preventDefault(); form.setValue(`siteDetails.${index}.supervisorUid`, null); form.setValue(`siteDetails.${index}.supervisorName`, null); }}>-- Unassign --</SelectItem>
                                                {supervisorList.map(s => <SelectItem key={s.uid} value={s.uid}>{s.name}</SelectItem>)}
                                              </SelectContent>
                                              </Select>
                                          <FormMessage />
                                          </FormItem>
                                      )}/>
                                  </div>
                                </div>
                               </AccordionContent>
                            </AccordionItem>
                        )})}
                    </Accordion>
                     {isEditor && <Button type="button" variant="outline" onClick={handleAddSite} size="sm" className="mt-4"><PlusCircle className="mr-2 h-4 w-4" /> Add Site</Button>}
                 </AccordionContent>
            </AccordionItem>

            {/* Section 4: Payment & File Closing */}
             <AccordionItem value="item-4" className="border-b-0">
                 <AccordionTrigger className="text-lg font-semibold px-4 py-3 bg-secondary/30 rounded-t-lg">4. Payment Details & File Closing</AccordionTrigger>
                 <AccordionContent className="p-6 border border-t-0 rounded-b-lg space-y-6">
                    {paymentFields.map((field, index) => (
                        <div key={field.id} className="grid md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6 p-4 border rounded-md items-end bg-background">
                            <FormField name={`paymentDetails.${index}.dateOfPayment`} render={({ field }) => ( <FormItem><FormLabel>Date of Payment</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")} disabled={isReadOnly}><CalendarIcon className="mr-2 h-4 w-4"/>{field.value && isValid(new Date(field.value)) ? format(new Date(field.value), 'dd/MM/yyyy') : 'Select Date'}</Button></FormControl></PopoverTrigger><PopoverContent><Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem> )} />
                            <FormField name={`paymentDetails.${index}.paymentAccount`} render={({ field }) => ( <FormItem><FormLabel>Payment Account</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger></FormControl><SelectContent>{paymentAccountOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                            <FormField name={`paymentDetails.${index}.contractorsPayment`} render={({ field }) => <FormItem><FormLabel>Contractor's Payment (₹)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                            <FormField name={`paymentDetails.${index}.gst`} render={({ field }) => <FormItem><FormLabel>GST (₹)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                            <FormField name={`paymentDetails.${index}.incomeTax`} render={({ field }) => <FormItem><FormLabel>Income Tax (₹)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                            <FormField name={`paymentDetails.${index}.kbcwb`} render={({ field }) => <FormItem><FormLabel>KBCWB (₹)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                            <FormField name={`paymentDetails.${index}.refundToParty`} render={({ field }) => <FormItem><FormLabel>Refund to Party (₹)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                             <FormField name={`paymentDetails.${index}.revenueHead`} render={({ field }) => <FormItem><FormLabel>Revenue Head (₹)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                            <FormField name={`paymentDetails.${index}.totalPaymentPerEntry`} render={({ field }) => ( <FormItem><FormLabel>Total (This Entry)</FormLabel><FormControl><Input type="number" {...field} readOnly className="font-bold bg-muted" /></FormControl></FormItem> )} />
                            {isEditor && <Button type="button" variant="destructive" size="icon" onClick={() => removePayment(index)}><Trash2 className="h-4 w-4" /></Button>}
                        </div>
                    ))}
                    {isEditor && <Button type="button" variant="outline" onClick={() => appendPayment({})} size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Payment Entry</Button>}
                     <FormField name="totalPaymentAllEntries" render={({ field }) => ( <FormItem><FormLabel className="font-semibold text-base">Total Payment (All Entries) (₹)</FormLabel><FormControl><Input type="number" {...field} readOnly className="font-bold text-lg bg-muted" /></FormControl></FormItem> )} />
                     <FormField name="overallBalance" render={({ field }) => ( <FormItem><FormLabel className="font-semibold text-base">Overall Balance (₹)</FormLabel><FormControl><Input type="number" {...field} readOnly className="font-bold text-lg bg-muted" /></FormControl></FormItem> )} />
                     <Separator />
                     <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <FormField name="fileStatus" render={({ field }) => ( <FormItem><FormLabel>File Status *</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl><SelectContent>{fileStatusOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                        <FormField name="remarks" render={({ field }) => ( <FormItem className="lg:col-span-3"><FormLabel>Overall File Remarks</FormLabel><FormControl><Textarea {...field} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem> )} />
                     </div>
                 </AccordionContent>
            </AccordionItem>

        </Accordion>
        {!isViewer && (
            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}><X className="mr-2 h-4 w-4"/> Cancel</Button>
              <Button type="submit" disabled={isSubmitting}><Save className="mr-2 h-4 w-4"/> {isSubmitting ? "Saving..." : (isEditing ? "Save Changes" : "Create File")}</Button>
            </div>
        )}
      </form>
    </FormProvider>
  );
}
