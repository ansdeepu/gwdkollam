
// src/components/shared/DataEntryForm.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, type FieldErrors, FormProvider, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { CalendarIcon, Loader2, Trash2, PlusCircle, X, Save } from "lucide-react";
import { format } from "date-fns";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  DataEntrySchema,
  type DataEntryFormData,
  siteWorkStatusOptions,
  sitePurposeOptions,
  type SitePurpose,
  siteDiameterOptions,
  siteTypeOfRigOptions,
  fileStatusOptions,
  remittedAccountOptions,
  paymentAccountOptions,
  type RemittanceDetailFormData,
  type PaymentDetailFormData,
  SiteDetailSchema,
  applicationTypeOptions,
  applicationTypeDisplayMap,
  type ApplicationType,
  siteConditionsOptions,
  type UserRole,
  rigAccessibilityOptions,
} from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useCallback } from "react";
import { useFileEntries } from "@/hooks/useFileEntries";
import type { StaffMember } from "@/lib/schemas";
import type { z } from "zod";
import { useAuth } from "@/hooks/useAuth";

const createDefaultPaymentDetail = (): PaymentDetailFormData => ({
  dateOfPayment: undefined, paymentAccount: undefined, revenueHead: undefined,
  contractorsPayment: undefined, gst: undefined, incomeTax: undefined, kbcwb: undefined,
  refundToParty: undefined, totalPaymentPerEntry: 0, paymentRemarks: "",
});

const createDefaultSiteDetail = (): z.infer<typeof SiteDetailSchema> => ({
  nameOfSite: "", latitude: undefined, longitude: undefined, purpose: undefined,
  estimateAmount: undefined, remittedAmount: undefined, siteConditions: undefined, accessibleRig: undefined, tsAmount: undefined,
  tenderNo: "", diameter: undefined, totalDepth: undefined, casingPipeUsed: "",
  outerCasingPipe: "", innerCasingPipe: "", yieldDischarge: "", zoneDetails: "",
  waterLevel: "", drillingRemarks: "", pumpDetails: "", waterTankCapacity: "", noOfTapConnections: undefined,
  noOfBeneficiary: "", dateOfCompletion: null, typeOfRig: undefined,
  contractorName: "", supervisorUid: null, supervisorName: null, totalExpenditure: undefined,
  workStatus: undefined, workRemarks: "",
  surveyOB: "", surveyLocation: "", surveyPlainPipe: "", surveySlottedPipe: "",
  surveyRemarks: "", surveyRecommendedDiameter: "", surveyRecommendedTD: "",
  surveyRecommendedOB: "", surveyRecommendedCasingPipe: "", surveyRecommendedPlainPipe: "",
  surveyRecommendedSlottedPipe: "", surveyRecommendedMsCasingPipe: "",
});

const calculatePaymentEntryTotalGlobal = (payment: PaymentDetailFormData | undefined): number => {
  if (!payment) return 0;
  return (Number(payment.revenueHead) || 0) + (Number(payment.contractorsPayment) || 0) +
         (Number(payment.gst) || 0) + (Number(payment.incomeTax) || 0) +
         (Number(payment.kbcwb) || 0) + (Number(payment.refundToParty) || 0);
};

const PURPOSES_REQUIRING_DIAMETER: SitePurpose[] = ["BWC", "TWC", "FPW", "BW Dev", "TW Dev", "FPW Dev"];
const PURPOSES_REQUIRING_RIG_ACCESSIBILITY: SitePurpose[] = ["BWC", "TWC", "FPW", "BW Dev", "TW Dev", "FPW Dev"];


const getAllErrorMessages = (errors: any): string[] => {
    const messages = new Set<string>();

    function findMessages(obj: any, currentPath: string = "") {
        if (!obj) return;

        Object.keys(obj).forEach(key => {
            const newPath = currentPath ? `${currentPath}.${key}` : key;
            const value = obj[key];
            if (value) {
                if (value.message && typeof value.message === 'string') {
                    messages.add(value.message);
                }
                if (typeof value === 'object' && !Array.isArray(value)) {
                    findMessages(value, newPath);
                } else if (Array.isArray(value)) {
                    value.forEach((item, index) => {
                        findMessages(item, `${newPath}.${index}`);
                    });
                }
            }
        });
    }

    findMessages(errors, '');
    return Array.from(messages);
};

interface DataEntryFormProps {
  fileNoToEdit?: string;
  initialData: DataEntryFormData;
  supervisorList: (StaffMember & { uid: string; name: string })[];
  userRole?: UserRole;
}

export default function DataEntryFormComponent({ 
  fileNoToEdit,
  initialData,
  supervisorList,
  userRole,
}: DataEntryFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { addFileEntry } = useFileEntries();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  
  const isEditor = userRole === 'editor';
  const isSupervisor = userRole === 'supervisor';

  const form = useForm<DataEntryFormData>({
    resolver: zodResolver(DataEntrySchema),
    defaultValues: initialData,
  });

  const { reset: formReset, trigger: formTrigger, getValues: formGetValues, setValue: formSetValue, control } = form;

  const stableInitialData = useCallback(() => initialData, [JSON.stringify(initialData)]);

  useEffect(() => {
    formReset(stableInitialData());
  }, [stableInitialData, formReset]);

  useEffect(() => {
    if (fileNoToEdit) {
      const timer = setTimeout(() => formTrigger(), 500);
      return () => clearTimeout(timer);
    }
  }, [fileNoToEdit, formTrigger, stableInitialData]);

  const watchedSiteDetails = useWatch({ control, name: "siteDetails", defaultValue: [] });

  useEffect(() => {
    if (userRole === 'editor') {
      watchedSiteDetails.forEach((site, index) => {
        if (site.supervisorUid) {
          const supervisorIsActive = supervisorList.some(s => s.uid === site.supervisorUid);
          if (!supervisorIsActive) {
            const supervisorName = site.supervisorName || 'an inactive user';
            const existingRemarks = formGetValues(`siteDetails.${index}.workRemarks`) || "";
            const note = `[System Note: Previous supervisor '${supervisorName}' is now inactive and has been unassigned.]`;
            
            formSetValue(`siteDetails.${index}.supervisorUid`, null);
            formSetValue(`siteDetails.${index}.supervisorName`, null);
            formSetValue(`siteDetails.${index}.workRemarks`, `${existingRemarks}\n${note}`.trim());
            
            toast({
                title: "Supervisor Unassigned",
                description: `Supervisor '${supervisorName}' for Site #${index+1} is inactive and has been automatically unassigned. Please review.`,
                variant: "default",
                duration: 7000
            });
          }
        }
      });
    }
  }, [userRole, supervisorList, watchedSiteDetails, formGetValues, formSetValue, toast]);


  const { fields: siteFields, append: appendSite, remove: removeSite } = useFieldArray({ control: form.control, name: "siteDetails" });
  const { fields: remittanceFields, append: appendRemittance, remove: removeRemittance } = useFieldArray({ control: form.control, name: "remittanceDetails" });
  const { fields: paymentFields, append: appendPayment, remove: removePayment } = useFieldArray({ control: form.control, name: "paymentDetails" });

  const watchedRemittanceDetails = useWatch({ control: form.control, name: "remittanceDetails", defaultValue: [] });
  const watchedPaymentDetails = useWatch({ control: form.control, name: "paymentDetails", defaultValue: [] });
  
  const onInvalid = (errors: FieldErrors<DataEntryFormData>) => {
    const messages = getAllErrorMessages(errors);
    
    if (messages.length > 0) {
      toast({
        title: "Cannot Save File",
        variant: "destructive",
        duration: 8000,
        description: (
          <div className="w-full">
            <p className="font-semibold">Please fix the following errors:</p>
            <ul className="mt-2 list-disc list-inside text-xs space-y-1">
              {messages.slice(0, 5).map((msg, i) => <li key={i}>{msg}</li>)}
            </ul>
            {messages.length > 5 && <p className="mt-2 text-xs font-medium">...and {messages.length - 5} more.</p>}
          </div>
        ),
      });
    } else {
      console.error("Form submission failed with errors, but no messages were extracted.", errors);
      toast({
        title: "Validation Error",
        description: "An unknown validation error occurred. Please review the form for highlighted fields.",
        variant: "destructive",
      });
    }
  };

  async function onValidSubmit(data: DataEntryFormData) {
    if (!userRole) {
        toast({ title: "Authentication Error", description: "You must be logged in to save.", variant: "destructive" });
        return;
    }
    
    if (userRole !== 'editor' && userRole !== 'supervisor') {
        toast({ title: "Permission Denied", description: "You do not have permission to save file data.", variant: "destructive" });
        return;
    }

    if (userRole === 'supervisor' && !fileNoToEdit) {
        toast({ title: "Permission Denied", description: "Supervisors cannot create new files.", variant: "destructive" });
        return;
    }

    setIsSubmitting(true);

    try {
        const supervisorUids = [...new Set(data.siteDetails?.map(s => s.supervisorUid).filter((uid): uid is string => !!uid))];
        const processedPaymentDetails = (data.paymentDetails || []).map(pd => ({ ...pd, totalPaymentPerEntry: calculatePaymentEntryTotalGlobal(pd) }));
        const sumOfAllPayments = processedPaymentDetails.reduce((acc, pd) => acc + (pd.totalPaymentPerEntry || 0), 0);
        const totalRemittance = data.remittanceDetails?.reduce((acc, rd) => acc + (Number(rd.amountRemitted) || 0), 0) || 0;
        
        const payload: DataEntryFormData = {
          ...data,
          assignedSupervisorUids: supervisorUids,
          paymentDetails: processedPaymentDetails,
          totalRemittance: totalRemittance,
          totalPaymentAllEntries: sumOfAllPayments,
          overallBalance: totalRemittance - sumOfAllPayments,
        };

        await addFileEntry(payload, fileNoToEdit);

        toast({
            title: fileNoToEdit ? "File Data Updated" : "File Data Submitted",
            description: `Data for file '${payload.fileNo || "N/A"}' has been successfully ${fileNoToEdit ? 'updated' : 'recorded'}.`,
        });
        router.push('/dashboard/file-room');

    } catch (error: any) {
        toast({ title: "Submission Failed", description: error.message, variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onValidSubmit, onInvalid)} className="space-y-4">
        <Accordion
          type="multiple"
          defaultValue={['application-details', 'remittance-details', 'site-details', 'payment-details', 'final-status']}
          className="w-full space-y-2"
        >
            <AccordionItem value="application-details" className="border bg-card rounded-lg shadow-sm">
                <AccordionTrigger className="p-4 hover:no-underline text-primary">
                    <span className="text-xl font-semibold">Application Details</span>
                </AccordionTrigger>
                <AccordionContent className="p-6 pt-0">
                    <div className="border-t pt-6 space-y-6">
                        <div className="grid md:grid-cols-3 gap-6">
                            <FormField control={form.control} name="fileNo" render={({ field }) => ( <FormItem><FormLabel>File No. <span className="text-destructive">*</span></FormLabel><FormControl><Input placeholder="Enter File Number" {...field} readOnly={!isEditor && !!fileNoToEdit} /></FormControl><FormMessage /></FormItem> )}/>
                            <FormField control={form.control} name="applicantName" render={({ field }) => ( <FormItem><FormLabel>Name of Institution / Applicant <span className="text-destructive">*</span></FormLabel><FormControl><Input placeholder="Enter Name" {...field} readOnly={!isEditor} /></FormControl><FormMessage /></FormItem> )}/>
                            <FormField control={form.control} name="phoneNo" render={({ field }) => ( <FormItem><FormLabel>Phone No.</FormLabel><FormControl><Input type="text" placeholder="Enter phone number" {...field} readOnly={!isEditor} /></FormControl><FormMessage /></FormItem> )}/>
                            <FormField control={form.control} name="applicantAddress" render={({ field }) => ( <FormItem className="md:col-span-2"><FormLabel>Address</FormLabel><FormControl><Textarea placeholder="Enter Full Address" className="min-h-[80px]" {...field} readOnly={!isEditor} /></FormControl><FormMessage /></FormItem> )}/>
                            <FormField control={form.control} name="applicationType" render={({ field }) => ( <FormItem><FormLabel>Type of Application <span className="text-destructive">*</span></FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!isEditor}><FormControl><SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger></FormControl><SelectContent>{applicationTypeOptions.map(o => <SelectItem key={o} value={o}>{applicationTypeDisplayMap[o as ApplicationType]}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
                        </div>
                    </div>
                </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="remittance-details" className="border bg-card rounded-lg shadow-sm">
                <AccordionTrigger className="p-4 hover:no-underline text-primary">
                    <span className="text-xl font-semibold">Remittance Details</span>
                </AccordionTrigger>
                <AccordionContent className="p-6 pt-0">
                    <div className="border-t pt-6 space-y-4">
                        <Accordion type="multiple" defaultValue={remittanceFields.map((_, i) => `remittance-${i}`)} className="w-full space-y-2">
                            {remittanceFields.map((item, index) => {
                            const amountRemitted = watchedRemittanceDetails[index]?.amountRemitted;
                            const isDateAndAccountRequired = amountRemitted && Number(amountRemitted) > 0;
                            return (
                                <AccordionItem value={`remittance-${index}`} key={item.id} className="border bg-card rounded-lg shadow-sm">
                                    <AccordionTrigger className="p-4 hover:no-underline">
                                        <div className="flex flex-1 items-center justify-between">
                                            <span className="text-base font-semibold text-primary">Remittance #{index + 1}</span>
                                             {isEditor && remittanceFields.length > 1 && 
                                                <div role="button" aria-label={`Remove Remittance #${index + 1}`} className="p-2 rounded-full hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); removeRemittance(index); }}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </div>
                                            }
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="p-4 pt-0">
                                        <div className="p-4 grid md:grid-cols-3 gap-6 border-t">
                                            <FormField control={form.control} name={`remittanceDetails.${index}.dateOfRemittance`} render={({ field }) => ( <FormItem><FormLabel>Date{isDateAndAccountRequired && <span className="text-destructive">*</span>}</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full text-left font-normal", !field.value && "text-muted-foreground")} disabled={!isEditor}>{field.value ? format(field.value, "dd/MM/yyyy") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem> )}/>
                                            <FormField control={form.control} name={`remittanceDetails.${index}.amountRemitted`} render={({ field }) => ( <FormItem><FormLabel>Amount (₹)</FormLabel><FormControl><Input type="text" inputMode="numeric" placeholder="0.00" {...field} readOnly={!isEditor} /></FormControl><FormMessage /></FormItem> )}/>
                                            <FormField control={form.control} name={`remittanceDetails.${index}.remittedAccount`} render={({ field }) => ( <FormItem><FormLabel>Account{isDateAndAccountRequired && <span className="text-destructive">*</span>}</FormLabel><Select onValueChange={(value) => field.onChange(value === '_clear_' ? undefined : value)} value={field.value} disabled={!isEditor}><FormControl><SelectTrigger><SelectValue placeholder="Select Account" /></SelectTrigger></FormControl><SelectContent><SelectItem value="_clear_">-- Clear Selection --</SelectItem>{remittedAccountOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            )})}
                        </Accordion>
                        {isEditor && remittanceFields.length < 10 && <Button className="w-full sm:w-auto bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 shadow-sm" type="button" variant="secondary" onClick={() => appendRemittance({ amountRemitted: undefined, dateOfRemittance: undefined, remittedAccount: undefined })}><PlusCircle className="mr-2 h-4 w-4" />Add Remittance</Button>}
                    </div>
                </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="site-details" className="border bg-card rounded-lg shadow-sm">
                <AccordionTrigger className="p-4 hover:no-underline text-primary">
                    <span className="text-xl font-semibold">Site Details</span>
                </AccordionTrigger>
                <AccordionContent className="p-6 pt-0">
                    <div className="border-t pt-6 space-y-4">
                        <Accordion type="multiple" defaultValue={siteFields.map((_, i) => `site-${i}`)} className="w-full space-y-2">
                            {siteFields.map((item, index) => {
                            const isAssignedToCurrentUser = user?.uid && watchedSiteDetails[index]?.supervisorUid === user.uid;
                            const isSiteEditable = isEditor || (isSupervisor && isAssignedToCurrentUser);
                            const purpose = watchedSiteDetails[index]?.purpose;
                            
                            const isWellPurpose = ['BWC', 'TWC', 'FPW'].includes(purpose as string);
                            const isDevPurpose = ['BW Dev', 'TW Dev', 'FPW Dev'].includes(purpose as string);
                            const isMWSSSchemePurpose = ['MWSS', 'MWSS Ext', 'Pumping Scheme', 'MWSS Pump Reno'].includes(purpose as string);
                            const isHPSPurpose = ['HPS', 'HPR'].includes(purpose as string);

                            const isDiameterRequired = purpose && PURPOSES_REQUIRING_DIAMETER.includes(purpose as SitePurpose);
                            const isRigAccessibilityRequired = purpose && PURPOSES_REQUIRING_RIG_ACCESSIBILITY.includes(purpose as SitePurpose);
                            const workStatus = watchedSiteDetails[index]?.workStatus;
                            const isCompletionDateRequired = workStatus === 'Work Completed' || workStatus === 'Work Failed';

                            const workImplementationFields = (
                              <>
                                <Separator className="my-4" />
                                <h4 className="text-md font-medium text-primary mb-2">Work Implementation</h4>
                                <div className="grid md:grid-cols-4 gap-6">
                                    {isRigAccessibilityRequired && (
                                        <FormField control={form.control} name={`siteDetails.${index}.accessibleRig`} render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Rig Accessibility</FormLabel>
                                                <Select onValueChange={(value) => field.onChange(value === '_clear_' ? undefined : value)} value={field.value} disabled={!isSiteEditable}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Select Accessibility" /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="_clear_">-- Clear Selection --</SelectItem>
                                                        {rigAccessibilityOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}/>
                                    )}
                                    <FormField control={form.control} name={`siteDetails.${index}.estimateAmount`} render={({ field }) => (<FormItem><FormLabel>Estimate (₹)</FormLabel><FormControl><Input type="text" inputMode="numeric" {...field} readOnly={!isEditor} /></FormControl><FormMessage/></FormItem>)}/>
                                    <FormField control={form.control} name={`siteDetails.${index}.remittedAmount`} render={({ field }) => (<FormItem><FormLabel>Remitted Amount (₹)</FormLabel><FormControl><Input type="text" inputMode="numeric" {...field} readOnly={!isEditor} /></FormControl><FormMessage/></FormItem>)}/>
                                    <FormField control={form.control} name={`siteDetails.${index}.tsAmount`} render={({ field }) => (<FormItem><FormLabel>TS Amount (₹)</FormLabel><FormControl><Input type="text" inputMode="numeric" {...field} readOnly={!isEditor} /></FormControl><FormMessage/></FormItem>)}/>
                                    <FormField control={form.control} name={`siteDetails.${index}.tenderNo`} render={({ field }) => (<FormItem><FormLabel>Tender No.</FormLabel><FormControl><Input {...field} readOnly={!isEditor} /></FormControl><FormMessage/></FormItem>)}/>
                                    <FormField control={form.control} name={`siteDetails.${index}.contractorName`} render={({ field }) => (<FormItem><FormLabel>Contractor Name</FormLabel><FormControl><Input {...field} readOnly={!isEditor} /></FormControl><FormMessage/></FormItem>)}/>
                                    <FormField
                                        key={item.id}
                                        control={form.control}
                                        name={`siteDetails.${index}.supervisorUid`}
                                        render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Supervisor</FormLabel>
                                        {isEditor ? (
                                            <Select
                                            disabled={!isEditor}
                                            onValueChange={(value) => {
                                                if (value === '_unassign_') {
                                                field.onChange(null);
                                                formSetValue(`siteDetails.${index}.supervisorName`, null);
                                                } else {
                                                field.onChange(value);
                                                const selectedStaff = supervisorList.find(s => s.uid === value);
                                                formSetValue(`siteDetails.${index}.supervisorName`, selectedStaff?.name || null);
                                                }
                                            }}
                                            value={field.value || ''}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Assign a supervisor" /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="_unassign_">-- Unassign Supervisor --</SelectItem>
                                                {supervisorList.map(s => <SelectItem key={s.uid} value={s.uid}>{s.name} ({s.designation})</SelectItem>)}
                                            </SelectContent>
                                            </Select>
                                        ) : (
                                            <Input
                                            readOnly
                                            value={formGetValues(`siteDetails.${index}.supervisorName`) || "Not Assigned"}
                                            className="bg-muted/50"
                                            />
                                        )}
                                        <FormMessage />
                                        </FormItem>
                                    )}/>
                                </div>
                              </>
                            );

                            return (
                                <AccordionItem value={`site-${index}`} key={item.id} className="border bg-card rounded-lg shadow-sm">
                                    <AccordionTrigger className="p-4 hover:no-underline">
                                        <div className="flex flex-1 items-center justify-between">
                                            <span className="text-lg font-semibold text-primary text-left">
                                                Site #{index + 1}
                                                {watchedSiteDetails[index]?.nameOfSite ? `: ${watchedSiteDetails[index].nameOfSite}` : ''}
                                                {watchedSiteDetails[index]?.purpose ? ` (${watchedSiteDetails[index].purpose})` : ''}
                                            </span>
                                            {isEditor && siteFields.length > 1 && 
                                                <div role="button" aria-label={`Remove Site #${index + 1}`} className="p-2 rounded-full hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); removeSite(index); }}>
                                                    <Trash2 className="h-5 w-5 text-destructive" />
                                                </div>
                                            }
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="p-6 pt-0">
                                        <div className="border-t pt-6 space-y-6">
                                            <div className="grid md:grid-cols-2 gap-6">
                                                <FormField control={form.control} name={`siteDetails.${index}.nameOfSite`} render={({ field }) => (<FormItem><FormLabel>Name of Site <span className="text-destructive">*</span></FormLabel><FormControl><Input {...field} readOnly={!isEditor} /></FormControl><FormMessage/></FormItem>)}/>
                                                <FormField control={form.control} name={`siteDetails.${index}.purpose`} render={({ field }) => (<FormItem><FormLabel>Purpose <span className="text-destructive">*</span></FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!isEditor}><FormControl><SelectTrigger><SelectValue placeholder="Select Purpose"/></SelectTrigger></FormControl><SelectContent>{sitePurposeOptions.map(o=><SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>)}/>
                                            </div>
                                            <div className="grid md:grid-cols-2 gap-6">
                                                <FormField control={form.control} name={`siteDetails.${index}.latitude`} render={({ field }) => (<FormItem><FormLabel>Latitude</FormLabel><FormControl><Input type="text" inputMode="numeric" {...field} readOnly={!isSiteEditable} /></FormControl><FormMessage/></FormItem>)}/>
                                                <FormField control={form.control} name={`siteDetails.${index}.longitude`} render={({ field }) => (<FormItem><FormLabel>Longitude</FormLabel><FormControl><Input type="text" inputMode="numeric" {...field} readOnly={!isSiteEditable} /></FormControl><FormMessage/></FormItem>)}/>
                                            </div>
                                            
                                            {isWellPurpose && (
                                                <>
                                                    <Separator className="my-4" />
                                                    <h4 className="text-md font-medium text-primary mb-2">Survey Details (Recommended)</h4>
                                                    {purpose === 'BWC' && ( <div className="grid md:grid-cols-3 gap-6"> <FormField control={form.control} name={`siteDetails.${index}.surveyRecommendedDiameter`} render={({ field }) => (<FormItem><FormLabel>Diameter (mm)</FormLabel><Select onValueChange={(value) => field.onChange(value === '_clear_' ? undefined : value)} value={field.value} disabled={!isSiteEditable}><FormControl><SelectTrigger><SelectValue placeholder="Select Diameter" /></SelectTrigger></FormControl><SelectContent><SelectItem value="_clear_">-- Clear Selection --</SelectItem>{siteDiameterOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)}/> <FormField control={form.control} name={`siteDetails.${index}.surveyRecommendedTD`} render={({ field }) => (<FormItem><FormLabel>TD (m)</FormLabel><FormControl><Input {...field} readOnly={!isSiteEditable} /></FormControl><FormMessage/></FormItem>)}/> <FormField control={form.control} name={`siteDetails.${index}.surveyRecommendedOB`} render={({ field }) => (<FormItem><FormLabel>OB (m)</FormLabel><FormControl><Input {...field} readOnly={!isSiteEditable} /></FormControl><FormMessage/></FormItem>)}/> <FormField control={form.control} name={`siteDetails.${index}.surveyRecommendedCasingPipe`} render={({ field }) => (<FormItem><FormLabel>Casing Pipe (m)</FormLabel><FormControl><Input {...field} readOnly={!isSiteEditable} /></FormControl><FormMessage/></FormItem>)}/> <FormField control={form.control} name={`siteDetails.${index}.surveyLocation`} render={({ field }) => (<FormItem><FormLabel>Location</FormLabel><FormControl><Textarea {...field} readOnly={!isSiteEditable} /></FormControl><FormMessage/></FormItem>)}/> <FormField control={form.control} name={`siteDetails.${index}.surveyRemarks`} render={({ field }) => (<FormItem><FormLabel>Survey Remarks</FormLabel><FormControl><Textarea {...field} readOnly={!isSiteEditable} /></FormControl><FormMessage/></FormItem>)}/> </div> )}
                                                    {purpose === 'TWC' && ( <div className="grid md:grid-cols-3 gap-6"> <FormField control={form.control} name={`siteDetails.${index}.surveyRecommendedDiameter`} render={({ field }) => (<FormItem><FormLabel>Diameter (mm)</FormLabel><Select onValueChange={(value) => field.onChange(value === '_clear_' ? undefined : value)} value={field.value} disabled={!isSiteEditable}><FormControl><SelectTrigger><SelectValue placeholder="Select Diameter" /></SelectTrigger></FormControl><SelectContent><SelectItem value="_clear_">-- Clear Selection --</SelectItem>{siteDiameterOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)}/> <FormField control={form.control} name={`siteDetails.${index}.surveyRecommendedTD`} render={({ field }) => (<FormItem><FormLabel>TD (m)</FormLabel><FormControl><Input {...field} readOnly={!isSiteEditable} /></FormControl><FormMessage/></FormItem>)}/> <FormField control={form.control} name={`siteDetails.${index}.surveyRecommendedPlainPipe`} render={({ field }) => (<FormItem><FormLabel>Plain Pipe (m)</FormLabel><FormControl><Input {...field} readOnly={!isSiteEditable} /></FormControl><FormMessage/></FormItem>)}/> <FormField control={form.control} name={`siteDetails.${index}.surveyRecommendedSlottedPipe`} render={({ field }) => (<FormItem><FormLabel>Slotted Pipe (m)</FormLabel><FormControl><Input {...field} readOnly={!isSiteEditable} /></FormControl><FormMessage/></FormItem>)}/> <FormField control={form.control} name={`siteDetails.${index}.surveyRecommendedMsCasingPipe`} render={({ field }) => (<FormItem><FormLabel>MS Casing (m)</FormLabel><FormControl><Input {...field} readOnly={!isSiteEditable} /></FormControl><FormMessage/></FormItem>)}/> <FormField control={form.control} name={`siteDetails.${index}.surveyLocation`} render={({ field }) => (<FormItem><FormLabel>Location</FormLabel><FormControl><Textarea {...field} readOnly={!isSiteEditable} /></FormControl><FormMessage/></FormItem>)}/> <FormField control={form.control} name={`siteDetails.${index}.surveyRemarks`} render={({ field }) => (<FormItem><FormLabel>Survey Remarks</FormLabel><FormControl><Textarea {...field} readOnly={!isSiteEditable} /></FormControl><FormMessage/></FormItem>)}/> </div> )}
                                                    {purpose === 'FPW' && ( <div className="grid md:grid-cols-3 gap-6"> <FormField control={form.control} name={`siteDetails.${index}.surveyRecommendedDiameter`} render={({ field }) => (<FormItem><FormLabel>Diameter (mm)</FormLabel><Select onValueChange={(value) => field.onChange(value === '_clear_' ? undefined : value)} value={field.value} disabled={!isSiteEditable}><FormControl><SelectTrigger><SelectValue placeholder="Select Diameter" /></SelectTrigger></FormControl><SelectContent><SelectItem value="_clear_">-- Clear Selection --</SelectItem>{siteDiameterOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)}/> <FormField control={form.control} name={`siteDetails.${index}.surveyRecommendedTD`} render={({ field }) => (<FormItem><FormLabel>TD (m)</FormLabel><FormControl><Input {...field} readOnly={!isSiteEditable} /></FormControl><FormMessage/></FormItem>)}/> <FormField control={form.control} name={`siteDetails.${index}.surveyRecommendedCasingPipe`} render={({ field }) => (<FormItem><FormLabel>Casing Pipe (m)</FormLabel><FormControl><Input {...field} readOnly={!isSiteEditable} /></FormControl><FormMessage/></FormItem>)}/> <FormField control={form.control} name={`siteDetails.${index}.surveyLocation`} render={({ field }) => (<FormItem><FormLabel>Location</FormLabel><FormControl><Textarea {...field} readOnly={!isSiteEditable} /></FormControl><FormMessage/></FormItem>)}/> <FormField control={form.control} name={`siteDetails.${index}.surveyRemarks`} render={({ field }) => (<FormItem><FormLabel>Survey Remarks</FormLabel><FormControl><Textarea {...field} readOnly={!isSiteEditable} /></FormControl><FormMessage/></FormItem>)}/> </div> )}

                                                    {workImplementationFields}
                                                    
                                                    <Separator className="my-4" />
                                                    <h4 className="text-md font-medium text-primary mb-2">Drilling Details (Actuals)</h4>
                                                    {purpose === 'BWC' && ( <div className="grid md:grid-cols-3 gap-6"> <FormField control={form.control} name={`siteDetails.${index}.diameter`} render={({ field }) => (<FormItem><FormLabel>Diameter (mm){isDiameterRequired && <span className="text-destructive">*</span>}</FormLabel><Select onValueChange={(value) => field.onChange(value === '_clear_' ? undefined : value)} value={field.value} disabled={!isSiteEditable}><FormControl><SelectTrigger><SelectValue placeholder="Select Diameter"/></SelectTrigger></FormControl><SelectContent><SelectItem value="_clear_">-- Clear Selection --</SelectItem>{siteDiameterOptions.map(o=><SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>)}/> <FormField control={form.control} name={`siteDetails.${index}.totalDepth`} render={({ field }) => (<FormItem><FormLabel>TD (m)</FormLabel><FormControl><Input type="text" inputMode="numeric" {...field} readOnly={!isSiteEditable} /></FormControl><FormMessage/></FormItem>)}/> <FormField control={form.control} name={`siteDetails.${index}.surveyOB`} render={({ field }) => (<FormItem><FormLabel>OB (m)</FormLabel><FormControl><Input type="text" inputMode="numeric" {...field} readOnly={!isSiteEditable} /></FormControl><FormMessage/></FormItem>)}/> <FormField control={form.control} name={`siteDetails.${index}.casingPipeUsed`} render={({ field }) => (<FormItem><FormLabel>Casing Pipe (m)</FormLabel><FormControl><Input {...field} readOnly={!isSiteEditable} /></FormControl><FormMessage/></FormItem>)}/> <FormField control={form.control} name={`siteDetails.${index}.innerCasingPipe`} render={({ field }) => (<FormItem><FormLabel>Inner Casing (m)</FormLabel><FormControl><Input {...field} readOnly={!isSiteEditable} /></FormControl><FormMessage/></FormItem>)}/> <FormField control={form.control} name={`siteDetails.${index}.outerCasingPipe`} render={({ field }) => (<FormItem><FormLabel>Outer Casing (m)</FormLabel><FormControl><Input {...field} readOnly={!isSiteEditable} /></FormControl><FormMessage/></FormItem>)}/> <FormField control={form.control} name={`siteDetails.${index}.yieldDischarge`} render={({ field }) => (<FormItem><FormLabel>Discharge (LPH)</FormLabel><FormControl><Input {...field} readOnly={!isSiteEditable} /></FormControl><FormMessage/></FormItem>)}/> <FormField control={form.control} name={`siteDetails.${index}.zoneDetails`} render={({ field }) => (<FormItem><FormLabel>Zone Details (m)</FormLabel><FormControl><Input {...field} readOnly={!isSiteEditable} /></FormControl><FormMessage/></FormItem>)}/> <FormField control={form.control} name={`siteDetails.${index}.waterLevel`} render={({ field }) => (<FormItem><FormLabel>Water Level (m)</FormLabel><FormControl><Input {...field} readOnly={!isSiteEditable} /></FormControl><FormMessage/></FormItem>)}/> <FormField control={form.control} name={`siteDetails.${index}.drillingRemarks`} render={({ field }) => (<FormItem className="md:col-span-3"><FormLabel>Drilling Remarks</FormLabel><FormControl><Textarea {...field} readOnly={!isSiteEditable} /></FormControl><FormMessage /></FormItem>)}/> </div> )}
                                                    {purpose === 'TWC' && ( <div className="grid md:grid-cols-3 gap-6"> <FormField control={form.control} name={`siteDetails.${index}.diameter`} render={({ field }) => (<FormItem><FormLabel>Diameter (mm){isDiameterRequired && <span className="text-destructive">*</span>}</FormLabel><Select onValueChange={(value) => field.onChange(value === '_clear_' ? undefined : value)} value={field.value} disabled={!isSiteEditable}><FormControl><SelectTrigger><SelectValue placeholder="Select Diameter"/></SelectTrigger></FormControl><SelectContent><SelectItem value="_clear_">-- Clear Selection --</SelectItem>{siteDiameterOptions.map(o=><SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>)}/> <FormField control={form.control} name={`siteDetails.${index}.totalDepth`} render={({ field }) => (<FormItem><FormLabel>TD (m)</FormLabel><FormControl><Input type="text" inputMode="numeric" {...field} readOnly={!isSiteEditable} /></FormControl><FormMessage/></FormItem>)}/> <FormField control={form.control} name={`siteDetails.${index}.surveyPlainPipe`} render={({ field }) => (<FormItem><FormLabel>Plain Pipe (m)</FormLabel><FormControl><Input {...field} readOnly={!isSiteEditable} /></FormControl><FormMessage/></FormItem>)}/> <FormField control={form.control} name={`siteDetails.${index}.surveySlottedPipe`} render={({ field }) => (<FormItem><FormLabel>Slotted Pipe (m)</FormLabel><FormControl><Input {...field} readOnly={!isSiteEditable} /></FormControl><FormMessage/></FormItem>)}/> <FormField control={form.control} name={`siteDetails.${index}.outerCasingPipe`} render={({ field }) => (<FormItem><FormLabel>MS Casing (m)</FormLabel><FormControl><Input {...field} readOnly={!isSiteEditable} /></FormControl><FormMessage/></FormItem>)}/> <FormField control={form.control} name={`siteDetails.${index}.yieldDischarge`} render={({ field }) => (<FormItem><FormLabel>Discharge (LPH)</FormLabel><FormControl><Input {...field} readOnly={!isSiteEditable} /></FormControl><FormMessage/></FormItem>)}/> <FormField control={form.control} name={`siteDetails.${index}.zoneDetails`} render={({ field }) => (<FormItem><FormLabel>Zone Details (m)</FormLabel><FormControl><Input {...field} readOnly={!isSiteEditable} /></FormControl><FormMessage/></FormItem>)}/> <FormField control={form.control} name={`siteDetails.${index}.waterLevel`} render={({ field }) => (<FormItem><FormLabel>Water Level (m)</FormLabel><FormControl><Input {...field} readOnly={!isSiteEditable} /></FormControl><FormMessage/></FormItem>)}/> <FormField control={form.control} name={`siteDetails.${index}.drillingRemarks`} render={({ field }) => (<FormItem className="md:col-span-3"><FormLabel>Drilling Remarks</FormLabel><FormControl><Textarea {...field} readOnly={!isSiteEditable} /></FormControl><FormMessage /></FormItem>)}/> </div> )}
                                                    {purpose === 'FPW' && ( <div className="grid md:grid-cols-3 gap-6"> <FormField control={form.control} name={`siteDetails.${index}.diameter`} render={({ field }) => (<FormItem><FormLabel>Diameter (mm){isDiameterRequired && <span className="text-destructive">*</span>}</FormLabel><Select onValueChange={(value) => field.onChange(value === '_clear_' ? undefined : value)} value={field.value} disabled={!isSiteEditable}><FormControl><SelectTrigger><SelectValue placeholder="Select Diameter"/></SelectTrigger></FormControl><SelectContent><SelectItem value="_clear_">-- Clear Selection --</SelectItem>{siteDiameterOptions.map(o=><SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>)}/> <FormField control={form.control} name={`siteDetails.${index}.totalDepth`} render={({ field }) => (<FormItem><FormLabel>TD (m)</FormLabel><FormControl><Input type="text" inputMode="numeric" {...field} readOnly={!isSiteEditable} /></FormControl><FormMessage/></FormItem>)}/> <FormField control={form.control} name={`siteDetails.${index}.casingPipeUsed`} render={({ field }) => (<FormItem><FormLabel>Casing Pipe (m)</FormLabel><FormControl><Input {...field} readOnly={!isSiteEditable} /></FormControl><FormMessage/></FormItem>)}/> <FormField control={form.control} name={`siteDetails.${index}.yieldDischarge`} render={({ field }) => (<FormItem><FormLabel>Discharge (LPH)</FormLabel><FormControl><Input {...field} readOnly={!isSiteEditable} /></FormControl><FormMessage/></FormItem>)}/> <FormField control={form.control} name={`siteDetails.${index}.zoneDetails`} render={({ field }) => (<FormItem><FormLabel>Zone Details (m)</FormLabel><FormControl><Input {...field} readOnly={!isSiteEditable} /></FormControl><FormMessage/></FormItem>)}/> <FormField control={form.control} name={`siteDetails.${index}.waterLevel`} render={({ field }) => (<FormItem><FormLabel>Water Level (m)</FormLabel><FormControl><Input {...field} readOnly={!isSiteEditable} /></FormControl><FormMessage/></FormItem>)}/> <FormField control={form.control} name={`siteDetails.${index}.drillingRemarks`} render={({ field }) => (<FormItem className="md:col-span-3"><FormLabel>Drilling Remarks</FormLabel><FormControl><Textarea {...field} readOnly={!isSiteEditable} /></FormControl><FormMessage /></FormItem>)}/> </div> )}
                                                </>
                                            )}

                                            {isDevPurpose && (
                                                <>
                                                    {workImplementationFields}
                                                    <Separator className="my-4" />
                                                    <h4 className="text-md font-medium text-primary mb-2">Developing Details</h4>
                                                    <div className="grid md:grid-cols-3 gap-6">
                                                        <FormField control={form.control} name={`siteDetails.${index}.diameter`} render={({ field }) => (<FormItem><FormLabel>Diameter (mm){isDiameterRequired && <span className="text-destructive">*</span>}</FormLabel><Select onValueChange={(value) => field.onChange(value === '_clear_' ? undefined : value)} value={field.value} disabled={!isSiteEditable}><FormControl><SelectTrigger><SelectValue placeholder="Select Diameter"/></SelectTrigger></FormControl><SelectContent><SelectItem value="_clear_">-- Clear Selection --</SelectItem>{siteDiameterOptions.map(o=><SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>)}/>
                                                        <FormField control={form.control} name={`siteDetails.${index}.totalDepth`} render={({ field }) => (<FormItem><FormLabel>TD (m)</FormLabel><FormControl><Input type="text" inputMode="numeric" {...field} readOnly={!isSiteEditable} /></FormControl><FormMessage/></FormItem>)}/>
                                                        <FormField control={form.control} name={`siteDetails.${index}.yieldDischarge`} render={({ field }) => (<FormItem><FormLabel>Discharge (LPH)</FormLabel><FormControl><Input {...field} readOnly={!isSiteEditable} /></FormControl><FormMessage/></FormItem>)}/>
                                                        <FormField control={form.control} name={`siteDetails.${index}.waterLevel`} render={({ field }) => (<FormItem><FormLabel>Water Level (m)</FormLabel><FormControl><Input {...field} readOnly={!isSiteEditable} /></FormControl><FormMessage/></FormItem>)}/>
                                                        <FormField control={form.control} name={`siteDetails.${index}.workRemarks`} render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>Remarks</FormLabel><FormControl><Textarea {...field} readOnly={!isSiteEditable} /></FormControl><FormMessage/></FormItem>)}/>
                                                    </div>
                                                </>
                                            )}

                                            {isMWSSSchemePurpose && (
                                                <>
                                                    {workImplementationFields}
                                                    <Separator className="my-4" />
                                                    <h4 className="text-md font-medium text-primary mb-2">Scheme Details</h4>
                                                    <div className="grid md:grid-cols-3 gap-6">
                                                        <FormField control={form.control} name={`siteDetails.${index}.yieldDischarge`} render={({ field }) => (<FormItem><FormLabel>Well Discharge (LPH)</FormLabel><FormControl><Input type="text" inputMode="numeric" {...field} readOnly={!isSiteEditable} /></FormControl><FormMessage/></FormItem>)}/>
                                                        <FormField control={form.control} name={`siteDetails.${index}.waterTankCapacity`} render={({ field }) => (<FormItem><FormLabel>Water Tank (L)</FormLabel><FormControl><Input type="text" inputMode="numeric" {...field} readOnly={!isSiteEditable} /></FormControl><FormMessage/></FormItem>)}/>
                                                        <FormField control={form.control} name={`siteDetails.${index}.noOfTapConnections`} render={({ field }) => (<FormItem><FormLabel>Tap Connections</FormLabel><FormControl><Input type="text" inputMode="numeric" {...field} readOnly={!isSiteEditable} /></FormControl><FormMessage/></FormItem>)}/>
                                                        <FormField control={form.control} name={`siteDetails.${index}.noOfBeneficiary`} render={({ field }) => (<FormItem><FormLabel>Beneficiaries</FormLabel><FormControl><Input {...field} readOnly={!isSiteEditable} /></FormControl><FormMessage/></FormItem>)}/>
                                                        <FormField control={form.control} name={`siteDetails.${index}.pumpDetails`} render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>Pump Details</FormLabel><FormControl><Textarea {...field} readOnly={!isSiteEditable} /></FormControl><FormMessage/></FormItem>)}/>
                                                        <FormField control={form.control} name={`siteDetails.${index}.workRemarks`} render={({ field }) => (<FormItem className="md:col-span-3"><FormLabel>Remarks</FormLabel><FormControl><Textarea {...field} readOnly={!isSiteEditable} /></FormControl><FormMessage/></FormItem>)}/>
                                                    </div>
                                                </>
                                            )}

                                            {isHPSPurpose && (
                                                <>
                                                    {workImplementationFields}
                                                    <Separator className="my-4" />
                                                    <h4 className="text-md font-medium text-primary mb-2">Scheme Details</h4>
                                                    <div className="grid md:grid-cols-3 gap-6">
                                                        <FormField control={form.control} name={`siteDetails.${index}.totalDepth`} render={({ field }) => (<FormItem><FormLabel>Depth Erected (m)</FormLabel><FormControl><Input type="text" inputMode="numeric" {...field} readOnly={!isSiteEditable} /></FormControl><FormMessage/></FormItem>)}/>
                                                        <FormField control={form.control} name={`siteDetails.${index}.waterLevel`} render={({ field }) => (<FormItem><FormLabel>Water Level (m)</FormLabel><FormControl><Input {...field} readOnly={!isSiteEditable} /></FormControl><FormMessage/></FormItem>)}/>
                                                      <FormField control={form.control} name={`siteDetails.${index}.workRemarks`} render={({ field }) => (<FormItem><FormLabel>Remarks</FormLabel><FormControl><Textarea {...field} readOnly={!isSiteEditable} /></FormControl><FormMessage/></FormItem>)}/>
                                                    </div>
                                                </>
                                            )}

                                            <Separator className="my-4" />
                                            <h4 className="text-md font-medium text-primary mb-2">Work Status</h4>
                                            <div className="grid md:grid-cols-3 gap-6">
                                                <FormField control={form.control} name={`siteDetails.${index}.dateOfCompletion`} render={({ field }) => ( <FormItem><FormLabel>Date of Completion{isCompletionDateRequired && <span className="text-destructive">*</span>}</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full text-left font-normal", !field.value && "text-muted-foreground")} disabled={!isEditor}>{field.value ? format(field.value, "dd/MM/yyyy") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem> )}/>
                                                <FormField control={form.control} name={`siteDetails.${index}.totalExpenditure`} render={({ field }) => (<FormItem><FormLabel>Expenditure (₹)</FormLabel><FormControl><Input type="text" inputMode="numeric" {...field} readOnly={!isSiteEditable} /></FormControl><FormMessage/></FormItem>)}/>
                                                <FormField
                                                    control={form.control}
                                                    name={`siteDetails.${index}.workStatus`}
                                                    render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Work Status <span className="text-destructive">*</span></FormLabel>
                                                        <Select onValueChange={field.onChange} value={field.value} disabled={!isSiteEditable}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                            <SelectValue placeholder="Select Status" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {siteWorkStatusOptions.map((o) => (
                                                            <SelectItem key={o} value={o}>
                                                                {o}
                                                            </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                    )}
                                                />
                                                <FormField control={form.control} name={`siteDetails.${index}.workRemarks`} render={({ field }) => (<FormItem className="md:col-span-3"><FormLabel>Work Remarks</FormLabel><FormControl><Textarea {...field} readOnly={!isSiteEditable} /></FormControl><FormMessage/></FormItem>)}/>
                                            </div>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            )})}
                        </Accordion>
                        {isEditor && <Button className="w-full sm:w-auto bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 shadow-sm" type="button" variant="secondary" onClick={() => appendSite(createDefaultSiteDetail())}><PlusCircle className="mr-2 h-4 w-4" />Add Site</Button>}
                    </div>
                </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="payment-details" className="border bg-card rounded-lg shadow-sm">
                <AccordionTrigger className="p-4 hover:no-underline text-primary">
                    <span className="text-xl font-semibold">Payment Details</span>
                </AccordionTrigger>
                <AccordionContent className="p-6 pt-0">
                    <div className="border-t pt-6 space-y-4">
                        <Accordion type="multiple" defaultValue={paymentFields.map((_, i) => `payment-${i}`)} className="w-full space-y-2">
                            {paymentFields.map((item, index) => {
                            const payment = watchedPaymentDetails[index];
                            const hasAnyAmount = payment && (
                                (Number(payment.revenueHead) || 0) > 0 ||
                                (Number(payment.contractorsPayment) || 0) > 0 ||
                                (Number(payment.gst) || 0) > 0 ||
                                (Number(payment.incomeTax) || 0) > 0 ||
                                (Number(payment.kbcwb) || 0) > 0 ||
                                (Number(payment.refundToParty) || 0) > 0
                            );
                            const paymentTotal = calculatePaymentEntryTotalGlobal(watchedPaymentDetails[index]);
                            return (
                                <AccordionItem value={`payment-${index}`} key={item.id} className="border bg-card rounded-lg shadow-sm">
                                    <AccordionTrigger className="p-4 hover:no-underline">
                                        <div className="flex flex-1 items-center justify-between">
                                            <span className="text-base font-semibold text-primary">Payment #{index + 1}</span>
                                            {isEditor && paymentFields.length > 1 && 
                                                <div role="button" aria-label={`Remove Payment #${index + 1}`} className="p-2 rounded-full hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); removePayment(index); }}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </div>
                                            }
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="p-4 pt-0">
                                        <div className="space-y-6 border-t pt-4">
                                            <div className="grid md:grid-cols-3 gap-6">
                                                <FormField control={form.control} name={`paymentDetails.${index}.dateOfPayment`} render={({ field }) => ( <FormItem><FormLabel>Date{hasAnyAmount && <span className="text-destructive">*</span>}</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full text-left font-normal", !field.value && "text-muted-foreground")} disabled={!isEditor}>{field.value ? format(field.value, "dd/MM/yyyy") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem> )}/>
                                                <FormField control={form.control} name={`paymentDetails.${index}.paymentAccount`} render={({ field }) => ( <FormItem><FormLabel>Account{hasAnyAmount && <span className="text-destructive">*</span>}</FormLabel><Select onValueChange={(value) => field.onChange(value === '_clear_' ? undefined : value)} value={field.value} disabled={!isEditor}><FormControl><SelectTrigger><SelectValue placeholder="Select Account" /></SelectTrigger></FormControl><SelectContent><SelectItem value="_clear_">-- Clear Selection --</SelectItem>{paymentAccountOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
                                                <FormField control={form.control} name={`paymentDetails.${index}.revenueHead`} render={({ field }) => ( <FormItem><FormLabel>Revenue Head (₹)</FormLabel><FormControl><Input type="text" inputMode="numeric" {...field} readOnly={!isEditor} /></FormControl><FormMessage /></FormItem> )}/>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                                <FormField control={form.control} name={`paymentDetails.${index}.contractorsPayment`} render={({ field }) => ( <FormItem><FormLabel>Contractor's Pay (₹)</FormLabel><FormControl><Input type="text" inputMode="numeric" {...field} readOnly={!isEditor} /></FormControl><FormMessage /></FormItem> )}/>
                                                <FormField control={form.control} name={`paymentDetails.${index}.gst`} render={({ field }) => ( <FormItem><FormLabel>GST (₹)</FormLabel><FormControl><Input type="text" inputMode="numeric" {...field} readOnly={!isEditor} /></FormControl><FormMessage /></FormItem> )}/>
                                                <FormField control={form.control} name={`paymentDetails.${index}.incomeTax`} render={({ field }) => ( <FormItem><FormLabel>Income Tax (₹)</FormLabel><FormControl><Input type="text" inputMode="numeric" {...field} readOnly={!isEditor} /></FormControl><FormMessage /></FormItem> )}/>
                                                <FormField control={form.control} name={`paymentDetails.${index}.kbcwb`} render={({ field }) => ( <FormItem><FormLabel>KBCWB (₹)</FormLabel><FormControl><Input type="text" inputMode="numeric" {...field} readOnly={!isEditor} /></FormControl><FormMessage /></FormItem> )}/>
                                            </div>
                                            <div className="grid md:grid-cols-3 gap-6">
                                                <FormField control={form.control} name={`paymentDetails.${index}.refundToParty`} render={({ field }) => ( <FormItem><FormLabel>Refund to Party (₹)</FormLabel><FormControl><Input type="text" inputMode="numeric" {...field} readOnly={!isEditor} /></FormControl><FormMessage /></FormItem> )}/>
                                                <div className="space-y-2">
                                                    <Label htmlFor={`paymentTotalCalculated-${index}`} className="text-muted-foreground">Total (This Entry)</Label>
                                                    <Input id={`paymentTotalCalculated-${index}`} name={`paymentTotalCalculated-${index}`} value={paymentTotal.toFixed(2)} readOnly className="bg-muted/50" />
                                                </div>
                                                <FormField control={form.control} name={`paymentDetails.${index}.paymentRemarks`} render={({ field }) => ( <FormItem><FormLabel>Remarks</FormLabel><FormControl><Textarea {...field} readOnly={!isEditor} /></FormControl><FormMessage /></FormItem> )}/>
                                            </div>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            )})}
                        </Accordion>
                        {isEditor && paymentFields.length < 10 && <Button className="w-full sm:w-auto bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 shadow-sm" type="button" variant="secondary" onClick={() => appendPayment(createDefaultPaymentDetail())}><PlusCircle className="mr-2 h-4 w-4" />Add Payment</Button>}
                    </div>
                </AccordionContent>
            </AccordionItem>
        
            <AccordionItem value="final-status" className="border bg-card rounded-lg shadow-sm">
                <AccordionTrigger className="p-4 hover:no-underline text-primary">
                    <span className="text-xl font-semibold">Final Status</span>
                </AccordionTrigger>
                <AccordionContent className="p-6 pt-0">
                    <div className="space-y-6 border-t pt-6">
                         <div className="grid md:grid-cols-3 gap-6">
                            <FormField control={form.control} name="fileStatus" render={({ field }) => ( <FormItem><FormLabel>File Status <span className="text-destructive">*</span></FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!isEditor}><FormControl><SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger></FormControl><SelectContent>{fileStatusOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
                            <FormField control={form.control} name="remarks" render={({ field }) => ( <FormItem className="md:col-span-2"><FormLabel>Remarks</FormLabel><FormControl><Textarea placeholder="Final remarks" {...field} readOnly={!isEditor} /></FormControl><FormMessage /></FormItem> )}/>
                        </div>
                        <Separator />
                        <div className="grid md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="totalRemittanceCalculated" className="text-muted-foreground">Total Remittance (₹)</Label>
                                <Input id="totalRemittanceCalculated" name="totalRemittanceCalculated" value={form.watch('remittanceDetails', []).reduce((acc, curr) => acc + (Number(curr.amountRemitted) || 0), 0).toFixed(2)} readOnly className="bg-muted/50"/>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="totalPaymentCalculated" className="text-muted-foreground">Total Payment (₹)</Label>
                                <Input id="totalPaymentCalculated" name="totalPaymentCalculated" value={form.watch('paymentDetails', []).reduce((acc, payment) => acc + calculatePaymentEntryTotalGlobal(payment), 0).toFixed(2)} readOnly className="bg-muted/50"/>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="balanceCalculated" className="text-muted-foreground">Balance (₹)</Label>
                                <Input id="balanceCalculated" name="balanceCalculated" value={(form.watch('remittanceDetails', []).reduce((acc, curr) => acc + (Number(curr.amountRemitted) || 0), 0) - form.watch('paymentDetails', []).reduce((acc, payment) => acc + calculatePaymentEntryTotalGlobal(payment), 0)).toFixed(2)} readOnly className="bg-muted/50"/>
                            </div>
                        </div>
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
        
        <div className="flex space-x-4 pt-4">
          {(isEditor || (isSupervisor && fileNoToEdit)) && (
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                  <Save className="mr-2 h-4 w-4" />
              )}
              {isSubmitting ? "Saving..." : (fileNoToEdit ? "Save Changes" : "Create File")}
            </Button>
          )}
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}><X className="mr-2 h-4 w-4" />Cancel</Button>
        </div>
      </form>
    </FormProvider>
  );
}
