
// src/components/shared/DataEntryForm.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, type FieldErrors, FormProvider, useWatch, useFormContext } from "react-hook-form";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Form,
} from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Loader2, Trash2, PlusCircle, X, Save, Clock, Edit, Eye, ArrowUpDown, Copy } from "lucide-react";
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
  type SiteDetailFormData,
  applicationTypeOptions,
  applicationTypeDisplayMap,
  type ApplicationType,
  siteConditionsOptions,
  type UserRole,
  rigAccessibilityOptions,
  type SiteWorkStatus,
  constituencyOptions,
  type Constituency,
} from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useFileEntries } from "@/hooks/useFileEntries";
import { usePendingUpdates } from "@/hooks/usePendingUpdates";
import type { StaffMember } from "@/lib/schemas";
import type { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../ui/card";
import { getFirestore, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { app } from "@/lib/firebase";
import { useDataStore } from "@/hooks/use-data-store";
import { ScrollArea } from "../ui/scroll-area";
import { format, isValid } from "date-fns";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter as TableFooterComponent } from "@/components/ui/table";
import { v4 as uuidv4 } from 'uuid';


const db = getFirestore(app);

const createDefaultRemittanceDetail = (): RemittanceDetailFormData => ({ amountRemitted: undefined, dateOfRemittance: undefined, remittedAccount: undefined, remittanceRemarks: "" });
const createDefaultPaymentDetail = (): PaymentDetailFormData => ({ dateOfPayment: undefined, paymentAccount: undefined, revenueHead: undefined, contractorsPayment: undefined, gst: undefined, incomeTax: undefined, kbcwb: undefined, refundToParty: undefined, totalPaymentPerEntry: 0, paymentRemarks: "" });
const createDefaultSiteDetail = (): z.infer<typeof SiteDetailSchema> => ({ nameOfSite: "", localSelfGovt: "", constituency: undefined, latitude: undefined, longitude: undefined, purpose: undefined, estimateAmount: undefined, remittedAmount: undefined, siteConditions: undefined, accessibleRig: undefined, tsAmount: undefined, additionalAS: 'No', tenderNo: "", diameter: undefined, totalDepth: undefined, casingPipeUsed: "", outerCasingPipe: "", innerCasingPipe: "", yieldDischarge: "", zoneDetails: "", waterLevel: "", drillingRemarks: "", pumpDetails: "", waterTankCapacity: "", noOfTapConnections: undefined, noOfBeneficiary: "", dateOfCompletion: undefined, typeOfRig: undefined, contractorName: "", supervisorUid: undefined, supervisorName: undefined, totalExpenditure: undefined, workStatus: undefined, workRemarks: "", surveyOB: "", surveyLocation: "", surveyPlainPipe: "", surveySlottedPipe: "", surveyRemarks: "", surveyRecommendedDiameter: "", surveyRecommendedTD: "", surveyRecommendedOB: "", surveyRecommendedCasingPipe: "", surveyRecommendedPlainPipe: "", surveyRecommendedSlottedPipe: "", surveyRecommendedMsCasingPipe: "", arsTypeOfScheme: undefined, arsPanchayath: undefined, arsBlock: undefined, arsAsTsDetails: undefined, arsSanctionedDate: undefined, arsTenderedAmount: undefined, arsAwardedAmount: undefined, arsNumberOfStructures: undefined, arsStorageCapacity: undefined, arsNumberOfFillings: undefined, isArsImport: false, pilotDrillingDepth: "", pumpingLineLength: "", deliveryLineLength: "" });

const calculatePaymentEntryTotalGlobal = (payment: PaymentDetailFormData | undefined): number => {
  if (!payment) return 0;
  return (Number(payment.revenueHead) || 0) + (Number(payment.contractorsPayment) || 0) + (Number(payment.gst) || 0) + (Number(payment.incomeTax) || 0) + (Number(payment.kbcwb) || 0) + (Number(payment.refundToParty) || 0);
};

const PURPOSES_REQUIRING_DIAMETER: SitePurpose[] = ["BWC", "TWC", "FPW", "BW Dev", "TW Dev", "FPW Dev"];
const PURPOSES_REQUIRING_RIG_ACCESSIBILITY: SitePurpose[] = ["BWC", "TWC", "FPW", "BW Dev", "TW Dev", "FPW Dev"];
const FINAL_WORK_STATUSES: SiteWorkStatus[] = ['Work Failed', 'Work Completed', 'Bill Prepared', 'Payment Completed', 'Utilization Certificate Issued'];
const SUPERVISOR_WORK_STATUS_OPTIONS: SiteWorkStatus[] = ["Work Order Issued", "Work in Progress", "Work Initiated", "Work Failed", "Work Completed"];

const getFormattedErrorMessages = (errors: FieldErrors<DataEntryFormData>): string[] => {
  const messages = new Set<string>();

  const processPath = (path: string, index: number): string => {
    if (path === 'siteDetails') return `Site #${index + 1}`;
    if (path === 'remittanceDetails') return `Remittance #${index + 1}`;
    if (path === 'paymentDetails') return `Payment #${index + 1}`;
    return path;
  };

  const formattedFieldName = (fieldName: string) => {
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase());
  };

  function findMessages(obj: any, parentPath: string = "") {
    if (!obj) return;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];
        const newPath = parentPath ? `${parentPath}.${key}` : key;
        
        if (value?.message && typeof value.message === 'string') {
          // This handles top-level errors like 'fileNo', 'applicantName'
          messages.add(`${formattedFieldName(key)}: ${value.message}`);
        } else if (Array.isArray(value)) {
          value.forEach((item, index) => {
            if (item && typeof item === 'object') {
              // This handles errors inside array items (e.g., siteDetails[0].nameOfSite)
              for (const itemKey in item) {
                if (item[itemKey]?.message) {
                  const pathPrefix = processPath(newPath, index);
                  messages.add(`${pathPrefix} - ${formattedFieldName(itemKey)}: ${item[itemKey].message}`);
                }
              }
            }
          });
        } else if (value && typeof value === 'object' && key !== 'root') {
          // This handles nested objects that are not arrays
          findMessages(value, newPath);
        }
      }
    }
  }

  findMessages(errors);
  return Array.from(messages);
};


const DetailRow = ({ label, value, className }: { label: string; value: any, className?: string }) => {
    if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
        return null;
    }

    let displayValue = String(value);
    
    if (label.toLowerCase().includes('date') && value) {
        try {
            displayValue = format(new Date(value), "dd/MM/yyyy");
        } catch (e) { /* Keep original string if formatting fails */ }
    } else if (typeof value === 'number') {
        displayValue = value.toLocaleString('en-IN');
    }

    return (
        <div className={className}>
            <dt className="text-sm font-medium text-primary">{label}</dt>
            <dd className="text-lg text-foreground whitespace-pre-wrap break-words">{displayValue}</dd>
        </div>
    );
};


interface DataEntryFormProps { fileNoToEdit?: string; initialData: DataEntryFormData; supervisorList: (StaffMember & { uid: string; name: string })[]; userRole?: UserRole; workTypeContext: 'public' | 'private' | null; pageToReturnTo: string | null;}

const PUBLIC_APPLICATION_TYPES = applicationTypeOptions.filter(
  (type) => !type.startsWith("Private_")
) as ApplicationType[];
const PRIVATE_APPLICATION_TYPES = applicationTypeOptions.filter(
  (type) => type.startsWith("Private_")
) as ApplicationType[];

const formatDateForInput = (date: Date | string | null | undefined): string => {
    if (!date) return "";
    try { return format(new Date(date), 'yyyy-MM-dd'); } catch { return ""; }
};

// Dialog Content Components
const ApplicationDialogContent = ({ initialData, onConfirm, onCancel, formOptions }: { initialData: any, onConfirm: (data: any) => void, onCancel: () => void, formOptions: readonly ApplicationType[] | ApplicationType[] }) => {
    const [data, setData] = useState(initialData);
    const handleChange = (key: string, value: any) => setData((prev: any) => ({ ...prev, [key]: value }));
    return (
      <div className="flex flex-col h-auto">
        <DialogHeader>
          <DialogTitle>Application Details</DialogTitle>
        </DialogHeader>
        <div className="p-6 space-y-4 flex-1">
            <div className="grid grid-cols-3 gap-4 items-start">
                <div className="space-y-2 col-span-1"><Label>File No *</Label><Input value={data.fileNo} onChange={(e) => handleChange('fileNo', e.target.value)} /></div>
                <div className="space-y-2 col-span-2"><Label>Name & Address of Institution/Applicant *</Label><Textarea value={data.applicantName} onChange={(e) => handleChange('applicantName', e.target.value)} className="min-h-[40px]"/></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2"><Label>Phone No.</Label><Input value={data.phoneNo} onChange={(e) => handleChange('phoneNo', e.target.value)} /></div>
                <div className="space-y-2"><Label>Secondary Mobile No.</Label><Input value={data.secondaryMobileNo} onChange={(e) => handleChange('secondaryMobileNo', e.target.value)} /></div>
                <div className="space-y-2">
                    <Label>Type of Application *</Label>
                    <Select onValueChange={(value) => handleChange('applicationType', value)} value={data.applicationType}>
                        <SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger>
                        <SelectContent>
                            {formOptions.map(o => <SelectItem key={o} value={o}>{applicationTypeDisplayMap[o] || o}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                 <div className="space-y-2">
                    <Label>Constituency (LAC)</Label>
                    <Select onValueChange={(value) => handleChange('constituency', value === '_clear_' ? undefined : value)} value={data.constituency}>
                        <SelectTrigger><SelectValue placeholder="Select Constituency" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="_clear_">-- Clear Selection --</SelectItem>
                            {[...constituencyOptions].sort((a,b) => a.localeCompare(b)).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onCancel}>Cancel</Button><Button onClick={() => onConfirm(data)}>Save</Button></DialogFooter>
      </div>
    );
};

const RemittanceDialogContent = ({ initialData, onConfirm, onCancel }: { initialData: any, onConfirm: (data: any) => void, onCancel: () => void }) => {
    const [data, setData] = useState({ ...initialData, dateOfRemittance: formatDateForInput(initialData.dateOfRemittance) });
    const handleChange = (key: string, value: any) => setData((prev: any) => ({ ...prev, [key]: value }));
    return (
      <div className="flex flex-col h-auto">
        <DialogHeader>
            <DialogTitle>Remittance Details</DialogTitle>
        </DialogHeader>
        <div className="p-6 space-y-4 flex-1">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2"><Label>Date</Label><Input type="date" value={data.dateOfRemittance} onChange={(e) => handleChange('dateOfRemittance', e.target.value)} /></div>
                <div className="space-y-2"><Label>Amount (₹)</Label><Input type="number" value={data.amountRemitted} onChange={(e) => handleChange('amountRemitted', e.target.valueAsNumber)} /></div>
                <div className="space-y-2">
                    <Label>Account</Label>
                    <Select onValueChange={(value) => handleChange('remittedAccount', value)} value={data.remittedAccount}>
                        <SelectTrigger><SelectValue placeholder="Select Account" /></SelectTrigger>
                        <SelectContent>
                            {remittedAccountOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>
             <div className="space-y-2">
                <Label>Remarks</Label>
                <Textarea value={data.remittanceRemarks} onChange={(e) => handleChange('remittanceRemarks', e.target.value)} placeholder="Add any remarks for this remittance entry..." />
            </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onCancel}>Cancel</Button><Button onClick={() => onConfirm(data)}>Save</Button></DialogFooter>
      </div>
    );
};

const SiteDialogContent = ({ initialData, onConfirm, onCancel, supervisorList, isReadOnly, isSupervisor, allLsgConstituencyMaps }: { initialData: any, onConfirm: (data: any) => void, onCancel: () => void, supervisorList: any[], isReadOnly: boolean, isSupervisor: boolean, allLsgConstituencyMaps: any[] }) => {
    const defaults = {
        ...createDefaultSiteDetail(),
        ...(initialData || {}),
    };

    const form = useForm<SiteDetailFormData>({
      resolver: zodResolver(SiteDetailSchema),
      defaultValues: { ...defaults, dateOfCompletion: formatDateForInput(defaults.dateOfCompletion), arsSanctionedDate: formatDateForInput(defaults.arsSanctionedDate) },
    });
    
    const { control, setValue, trigger, watch, handleSubmit, getValues } = form;
    
    const watchedPurpose = watch('purpose');
    const watchedWorkStatus = watch('workStatus');
    const isCompletionDateRequired = watchedWorkStatus && FINAL_WORK_STATUSES.includes(watchedWorkStatus as SiteWorkStatus);
    
    const surveyPurposes: SitePurpose[] = ['BWC', 'TWC', 'FPW'];
    const isWellPurpose = surveyPurposes.includes(watchedPurpose as SitePurpose);
    const isDevPurpose = ['BW Dev', 'TW Dev', 'FPW Dev'].includes(watchedPurpose as SitePurpose);
    const isMWSSSchemePurpose = ['MWSS', 'MWSS Ext', 'Pumping Scheme', 'MWSS Pump Reno'].includes(watchedPurpose as SitePurpose);
    const isHPSPurpose = ['HPS', 'HPR'].includes(watchedPurpose as SitePurpose);
    const isSchemePurpose = isMWSSSchemePurpose || isHPSPurpose;


    const watchedLsg = watch("localSelfGovt");
    
    const sortedLsgMaps = useMemo(() => {
        return [...allLsgConstituencyMaps].sort((a, b) => a.name.localeCompare(b.name));
    }, [allLsgConstituencyMaps]);

    const constituencyOptionsForLsg = useMemo(() => {
        if (!watchedLsg) return [];
        const map = allLsgConstituencyMaps.find(m => m.name === watchedLsg);
        if (!map || !map.constituencies) return [];
        return [...map.constituencies].sort((a,b) => a.localeCompare(b));
    }, [watchedLsg, allLsgConstituencyMaps]);

    const handleLsgChange = useCallback((lsgName: string) => {
        setValue('localSelfGovt', lsgName);
        const map = allLsgConstituencyMaps.find(m => m.name === lsgName);
        const constituencies = map?.constituencies || [];
        
        setValue('constituency', undefined, { shouldValidate: true });
        if (constituencies.length === 1) {
            setValue('constituency', constituencies[0] as Constituency, { shouldValidate: true });
        }
        trigger('constituency');
    }, [setValue, allLsgConstituencyMaps, trigger]);

    useEffect(() => {
        const lsgName = watch("localSelfGovt");
        if (!lsgName) return;

        const map = allLsgConstituencyMaps.find(m => m.name === lsgName);
        const constituencies = map?.constituencies || [];
        
        if (constituencies.length === 1 && getValues("constituency") !== constituencies[0]) {
            setValue('constituency', constituencies[0] as Constituency);
        }
    }, [watchedLsg, allLsgConstituencyMaps, setValue, watch, getValues]);
    
    return (
      <Form {...form}>
        <form onSubmit={handleSubmit(onConfirm)} className="flex flex-col h-full overflow-hidden">
          <DialogHeader>
                <DialogTitle>{initialData?.nameOfSite ? `Edit Site: ${initialData.nameOfSite}` : "Add New Site"}</DialogTitle>
            </DialogHeader>
          <div className="flex-1 min-h-0">
            <ScrollArea className="h-full px-6 py-4">
                <div className="space-y-4">
                    <Card><CardHeader><CardTitle>Main Details</CardTitle></CardHeader><CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField name="nameOfSite" control={control} render={({ field }) => <FormItem><FormLabel>Name of Site <span className="text-destructive">*</span></FormLabel><FormControl><Input {...field} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                            <FormField name="purpose" control={control} render={({ field }) => <FormItem><FormLabel>Purpose <span className="text-destructive">*</span></FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue placeholder="Select Purpose" /></SelectTrigger></FormControl><SelectContent><SelectItem value="_clear_" onSelect={(e) => { e.preventDefault(); field.onChange(undefined); }}>-- Clear Selection --</SelectItem>{sitePurposeOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />
                            <FormField name="localSelfGovt" control={control} render={({ field }) => <FormItem><FormLabel>Local Self Govt.</FormLabel>{isReadOnly ? (<FormControl><Input {...field} value={field.value || ''} readOnly /></FormControl>) : (<Select onValueChange={(value) => handleLsgChange(value)} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select LSG"/></SelectTrigger></FormControl><SelectContent><SelectItem value="_clear_" onSelect={(e) => { e.preventDefault(); field.onChange(undefined); }}>-- Clear Selection --</SelectItem>{sortedLsgMaps.map(map => <SelectItem key={map.id} value={map.name}>{map.name}</SelectItem>)}</SelectContent></Select>)}<FormMessage/></FormItem>} />
                            <FormField name="constituency" control={control} render={({ field }) => <FormItem><FormLabel>Constituency (LAC)</FormLabel>{isReadOnly ? (<FormControl><Input {...field} value={field.value || ''} readOnly /></FormControl>) : (<Select onValueChange={field.onChange} value={field.value} disabled={constituencyOptionsForLsg.length <= 1}><FormControl><SelectTrigger><SelectValue placeholder="Select Constituency"/></SelectTrigger></FormControl><SelectContent><SelectItem value="_clear_" onSelect={(e) => { e.preventDefault(); field.onChange(undefined); }}>-- Clear Selection --</SelectItem>{constituencyOptionsForLsg.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>)}<FormMessage/></FormItem>} />
                            <FormField name="latitude" control={control} render={({ field }) => <FormItem><FormLabel>Latitude</FormLabel><FormControl><Input type="number" step="any" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                            <FormField name="longitude" control={control} render={({ field }) => <FormItem><FormLabel>Longitude</FormLabel><FormControl><Input type="number" step="any" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                        </div>
                    </CardContent></Card>

                    {!isSupervisor && isWellPurpose && (
                        <Card><CardHeader><CardTitle>Survey Details (Recommended)</CardTitle></CardHeader><CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField name="surveyRecommendedDiameter" control={control} render={({ field }) => <FormItem><FormLabel>Diameter (mm)</FormLabel><Select onValueChange={field.onChange} value={field.value || ""} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue placeholder="Select Diameter" /></SelectTrigger></FormControl><SelectContent><SelectItem value="_clear_" onSelect={(e) => { e.preventDefault(); field.onChange(undefined); }}>-- Clear Selection --</SelectItem>{siteDiameterOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />
                                <FormField name="surveyRecommendedTD" control={control} render={({ field }) => <FormItem><FormLabel>Total Depth (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                                {watchedPurpose === 'BWC' && <FormField name="surveyRecommendedOB" control={control} render={({ field }) => <FormItem><FormLabel>OB (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />}
                                {watchedPurpose === 'BWC' && <FormField name="surveyRecommendedCasingPipe" control={control} render={({ field }) => <FormItem><FormLabel>Casing Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />}
                                {watchedPurpose === 'TWC' && <FormField name="surveyRecommendedPlainPipe" control={control} render={({ field }) => <FormItem><FormLabel>Plain Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />}
                                {watchedPurpose === 'TWC' && <FormField name="surveyRecommendedSlottedPipe" control={control} render={({ field }) => <FormItem><FormLabel>Slotted Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />}
                                {watchedPurpose === 'TWC' && <FormField name="surveyRecommendedMsCasingPipe" control={control} render={({ field }) => <FormItem><FormLabel>MS Casing Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />}
                                {watchedPurpose === 'FPW' && <FormField name="surveyRecommendedCasingPipe" control={control} render={({ field }) => <FormItem><FormLabel>Casing Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />}
                                <FormField name="surveyLocation" control={control} render={({ field }) => <FormItem><FormLabel>Survey Location</FormLabel><FormControl><Textarea {...field} value={field.value || ''} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                                <FormField name="surveyRemarks" control={control} render={({ field }) => <FormItem className="md:col-span-1"><FormLabel>Survey Remarks</FormLabel><FormControl><Textarea {...field} value={field.value || ''} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                            </div>
                        </CardContent></Card>
                    )}

                    <Card><CardHeader><CardTitle>Work Implementation</CardTitle></CardHeader><CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                             {!['MWSS', 'MWSS Ext', 'Pumping Scheme', 'MWSS Pump Reno', 'HPS', 'HPR'].includes(watchedPurpose as SitePurpose) && <FormField name="accessibleRig" control={control} render={({ field }) => <FormItem><FormLabel>Rig Accessibility</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue placeholder="Select Accessibility" /></SelectTrigger></FormControl><SelectContent><SelectItem value="_clear_" onSelect={(e) => { e.preventDefault(); field.onChange(undefined); }}>-- Clear Selection --</SelectItem>{rigAccessibilityOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>} />}
                            <FormField name="estimateAmount" control={control} render={({ field }) => <FormItem><FormLabel>Estimate Amount (₹)</FormLabel><FormControl><Input type="number" step="any" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                            {!isSupervisor && <FormField name="tsAmount" control={control} render={({ field }) => <FormItem><FormLabel>TS Amount (₹)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />}
                            <FormField name="remittedAmount" control={control} render={({ field }) => <FormItem><FormLabel>Remitted Amount (₹)</FormLabel><FormControl><Input type="number" step="any" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                            {!isSupervisor && <FormField name="tenderNo" control={control} render={({ field }) => <FormItem><FormLabel>Tender No.</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isReadOnly} /></FormControl><FormMessage/></FormItem>} />}
                            {!isSupervisor && <FormField name="contractorName" control={control} render={({ field }) => <FormItem><FormLabel>Contractor</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isReadOnly} /></FormControl><FormMessage/></FormItem>} />}
                            {!isSupervisor && <FormField name="supervisorUid" control={form.control} render={({ field }) => (<FormItem><FormLabel>Supervisor</FormLabel><Select onValueChange={(uid) => { field.onChange(uid); const name = supervisorList.find(s => s.uid === uid)?.name; setValue('supervisorName', name || undefined) }} value={field.value || ''} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue placeholder="Select Supervisor" /></SelectTrigger></FormControl><SelectContent><SelectItem value="_clear_" onSelect={(e) => { e.preventDefault(); field.onChange(undefined); setValue('supervisorName', undefined); }}>-- Clear Selection --</SelectItem>{supervisorList.map(s => <SelectItem key={s.uid} value={s.uid}>{s.name}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>)} />}
                        </div>
                    </CardContent></Card>
                    
                    {isWellPurpose && (
                        <Card><CardHeader><CardTitle>Drilling Details (Actuals)</CardTitle></CardHeader><CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField name="diameter" control={control} render={({field}) => <FormItem><FormLabel>Actual Diameter {PURPOSES_REQUIRING_DIAMETER.includes(watchedPurpose as SitePurpose) && <span className="text-destructive">*</span>}</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue placeholder="Select Diameter"/></SelectTrigger></FormControl><SelectContent><SelectItem value="_clear_" onSelect={(e) => { e.preventDefault(); field.onChange(undefined); }}>-- Clear Selection --</SelectItem>{siteDiameterOptions.map(o=><SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>}/>
                                {watchedPurpose === 'TWC' && <FormField name="pilotDrillingDepth" control={control} render={({field})=> <FormItem><FormLabel>Pilot Drilling (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isReadOnly}/></FormControl><FormMessage/></FormItem>} />}
                                <FormField name="totalDepth" control={control} render={({field})=> <FormItem><FormLabel>Actual TD (m)</FormLabel><FormControl><Input type="number" {...field} onChange={e=>field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isReadOnly}/></FormControl><FormMessage/></FormItem>} />
                                {watchedPurpose === 'BWC' && <FormField name="surveyOB" control={control} render={({field})=> <FormItem><FormLabel>Actual OB (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isReadOnly}/></FormControl><FormMessage/></FormItem>} />}
                                {watchedPurpose !== 'TWC' && <FormField name="casingPipeUsed" control={control} render={({field})=> <FormItem><FormLabel>Casing Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isReadOnly}/></FormControl><FormMessage/></FormItem>} />}
                                {watchedPurpose === 'BWC' && <FormField name="outerCasingPipe" control={control} render={({field})=> <FormItem><FormLabel>Outer Casing (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isReadOnly}/></FormControl><FormMessage/></FormItem>} />}
                                {watchedPurpose === 'BWC' && <FormField name="innerCasingPipe" control={control} render={({field})=> <FormItem><FormLabel>Inner Casing (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isReadOnly}/></FormControl><FormMessage/></FormItem>} />}
                                {watchedPurpose === 'TWC' && <FormField name="surveyPlainPipe" control={control} render={({field})=> <FormItem><FormLabel>Plain Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isReadOnly}/></FormControl><FormMessage/></FormItem>} />}
                                {watchedPurpose === 'TWC' && <FormField name="surveySlottedPipe" control={control} render={({field})=> <FormItem><FormLabel>Slotted Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isReadOnly}/></FormControl><FormMessage/></FormItem>} />}
                                {watchedPurpose === 'TWC' && <FormField name="outerCasingPipe" control={control} render={({field})=> <FormItem><FormLabel>MS Casing Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isReadOnly}/></FormControl><FormMessage/></FormItem>} />}
                                <FormField name="yieldDischarge" control={control} render={({field})=> <FormItem><FormLabel>Yield (LPH)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isReadOnly}/></FormControl><FormMessage/></FormItem>} />
                                <FormField name="zoneDetails" control={control} render={({ field }) => <FormItem><FormLabel>Zone Details (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                                <FormField name="waterLevel" control={control} render={({field})=> <FormItem><FormLabel>Static Water (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isReadOnly}/></FormControl><FormMessage/></FormItem>} />
                                <FormField name="typeOfRig" control={control} render={({field})=> <FormItem><FormLabel>Type of Rig</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue placeholder="Select Rig Type"/></SelectTrigger></FormControl><SelectContent><SelectItem value="_clear_" onSelect={(e) => { e.preventDefault(); field.onChange(undefined); }}>-- Clear Selection --</SelectItem>{siteTypeOfRigOptions.map(o=><SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>} />
                                <FormField name="drillingRemarks" control={control} render={({ field }) => <FormItem><FormLabel>Drilling Remarks</FormLabel><FormControl><Textarea {...field} value={field.value || ''} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                            </div>
                        </CardContent></Card>
                    )}

                    {isDevPurpose && (
                        <Card><CardHeader><CardTitle>Developing Details</CardTitle></CardHeader><CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField name="diameter" control={control} render={({field})=> <FormItem><FormLabel>Diameter (mm) <span className="text-destructive">*</span></FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isReadOnly}/></FormControl><FormMessage/></FormItem>} />
                            <FormField name="totalDepth" control={control} render={({field})=> <FormItem><FormLabel>TD (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isReadOnly}/></FormControl><FormMessage/></FormItem>} />
                            <FormField name="yieldDischarge" control={control} render={({field})=> <FormItem><FormLabel>Discharge (LPH)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isReadOnly}/></FormControl><FormMessage/></FormItem>} />
                            <FormField name="waterLevel" control={control} render={({field})=> <FormItem><FormLabel>Water Level (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isReadOnly}/></FormControl><FormMessage/></FormItem>} />
                             <FormField name="workRemarks" control={control} render={({ field }) => <FormItem><FormLabel>Remarks</FormLabel><FormControl><Textarea {...field} value={field.value || ''} readOnly={isReadOnly && !isSupervisor} /></FormControl><FormMessage /></FormItem>} />
                        </div>
                        </CardContent></Card>
                    )}
                    
                    {isSchemePurpose && (
                        <Card><CardHeader><CardTitle>Scheme Details</CardTitle></CardHeader><CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {isMWSSSchemePurpose && <>
                                <FormField name="yieldDischarge" control={control} render={({field})=> <FormItem><FormLabel>Well Discharge (LPH)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isReadOnly}/></FormControl><FormMessage/></FormItem>} />
                                <FormField name="pumpDetails" control={control} render={({field})=> <FormItem><FormLabel>Pump Details</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isReadOnly}/></FormControl><FormMessage/></FormItem>} />
                                <FormField name="pumpingLineLength" control={control} render={({field})=> <FormItem><FormLabel>Pumping Line (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isReadOnly}/></FormControl><FormMessage/></FormItem>} />
                                <FormField name="deliveryLineLength" control={control} render={({field})=> <FormItem><FormLabel>Delivery Line (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isReadOnly}/></FormControl><FormMessage/></FormItem>} />
                                <FormField name="waterTankCapacity" control={control} render={({field})=> <FormItem><FormLabel>Tank Capacity (L)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isReadOnly}/></FormControl><FormMessage/></FormItem>} />
                                <FormField name="noOfTapConnections" control={control} render={({field})=> <FormItem><FormLabel># Taps</FormLabel><FormControl><Input type="number" {...field} onChange={e=>field.onChange(e.target.value==='' ? undefined : +e.target.value)} readOnly={isReadOnly}/></FormControl><FormMessage/></FormItem>} />
                            </>}
                            {isHPSPurpose && <>
                                <FormField name="totalDepth" control={control} render={({field})=> <FormItem><FormLabel>Depth Erected (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isReadOnly}/></FormControl><FormMessage/></FormItem>} />
                                <FormField name="waterLevel" control={control} render={({field})=> <FormItem><FormLabel>Water Level (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isReadOnly}/></FormControl><FormMessage/></FormItem>} />
                            </>}
                            <FormField name="noOfBeneficiary" control={control} render={({field})=> <FormItem><FormLabel># Beneficiaries</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isReadOnly}/></FormControl><FormMessage/></FormItem>} />
                            <FormField name="workRemarks" control={control} render={({ field }) => <FormItem><FormLabel>Remarks</FormLabel><FormControl><Textarea {...field} value={field.value || ''} readOnly={isReadOnly && !isSupervisor} /></FormControl><FormMessage /></FormItem>} />
                        </div>
                    </CardContent></Card>
                    )}

                    <Card>
                        <CardHeader><CardTitle>Work Status</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField name="workStatus" control={control} render={({ field }) => <FormItem><FormLabel>Work Status <span className="text-destructive">*</span></FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly && !isSupervisor}><FormControl><SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger></FormControl><SelectContent><SelectItem value="_clear_" onSelect={(e) => { e.preventDefault(); field.onChange(undefined); }}>-- Clear Selection --</SelectItem>{(isSupervisor ? SUPERVISOR_WORK_STATUS_OPTIONS : siteWorkStatusOptions).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>} />
                                <FormField name="dateOfCompletion" control={control} render={({ field }) => <FormItem><FormLabel>Completion Date {isCompletionDateRequired && <span className="text-destructive">*</span>}</FormLabel><FormControl><Input type="date" {...field} value={field.value || ''} readOnly={isReadOnly && !isSupervisor} /></FormControl><FormMessage /></FormItem>} />
                                {!isSupervisor && <FormField name="totalExpenditure" control={control} render={({ field }) => <FormItem><FormLabel>Total Expenditure (₹)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />}
                                <FormField name="workRemarks" control={control} render={({ field }) => <FormItem><FormLabel>Work Remarks</FormLabel><FormControl><Textarea {...field} value={field.value || ''} readOnly={isReadOnly && !isSupervisor} /></FormControl><FormMessage /></FormItem>} />
                            </div>
                        </CardContent>
                    </Card>

                </div>
              </ScrollArea>
            </div>
          <DialogFooter><Button variant="outline" type="button" onClick={onCancel}>Cancel</Button><Button type="submit">Save</Button></DialogFooter>
        </form>
      </Form>
    );
};

export default function DataEntryFormComponent({ fileNoToEdit, initialData, supervisorList, userRole, workTypeContext, pageToReturnTo }: DataEntryFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileIdToEdit = searchParams.get("id");
  const approveUpdateId = searchParams.get("approveUpdateId");

  const { addFileEntry } = useFileEntries();
  const { createPendingUpdate } = usePendingUpdates();
  const { toast } = useToast();
  const { user } = useAuth();
  const { allLsgConstituencyMaps } = useDataStore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeAccordionItem, setActiveAccordionItem] = useState<string | null>(null);

  const [dialogState, setDialogState] = useState<{ type: null | 'application' | 'remittance' | 'payment' | 'site'; data: any }>({ type: null, data: null });
  const [itemToDelete, setItemToDelete] = useState<{ type: 'remittance' | 'payment' | 'site'; index: number } | null>(null);

  const isEditor = userRole === 'editor';
  const isSupervisor = userRole === 'supervisor';
  const isViewer = userRole === 'viewer';

  const form = useForm<DataEntryFormData>({
    resolver: zodResolver(DataEntrySchema),
    defaultValues: initialData,
  });

  const { control, handleSubmit, setValue, getValues, watch, trigger } = form;

  const { fields: remittanceFields, append: appendRemittance, remove: removeRemittance, update: updateRemittance } = useFieldArray({ control, name: "remittanceDetails" });
  const { fields: siteFields, append: appendSite, remove: removeSite, update: updateSite } = useFieldArray({ control, name: "siteDetails" });
  const { fields: paymentFields, append: appendPayment, remove: removePayment, update: updatePayment } = useFieldArray({ control, name: "paymentDetails" });

  const watchedPaymentDetails = useWatch({ control, name: "paymentDetails" });
  const watchedRemittanceDetails = useWatch({ control, name: "remittanceDetails" });

  const isReadOnly = (fieldName: keyof SiteDetailFormData) => {
    if (isEditor) return false;
    if (isViewer) return true;
    if (isSupervisor) {
      // Supervisor can ONLY edit specific fields.
      const supervisorEditableFields: (keyof SiteDetailFormData)[] = ['workStatus', 'dateOfCompletion', 'drillingRemarks', 'workRemarks', 'totalDepth', 'yieldDischarge', 'waterLevel', 'zoneDetails'];
      return !supervisorEditableFields.includes(fieldName);
    }
    return true; // Default to read-only
  };
  
  const returnPath = useMemo(() => {
    let base = '/dashboard/file-room';
    if (workTypeContext === 'private') base = '/dashboard/private-deposit-works';
    if (approveUpdateId) base = '/dashboard/pending-updates';
    
    return pageToReturnTo ? `${base}?page=${pageToReturnTo}` : base;
  }, [workTypeContext, approveUpdateId, pageToReturnTo]);


  useEffect(() => {
    const totalRemittance = watchedRemittanceDetails?.reduce((sum, item) => sum + (Number(item.amountRemitted) || 0), 0) || 0;
    const totalPayment = watchedPaymentDetails?.reduce((sum, item) => sum + calculatePaymentEntryTotalGlobal(item), 0) || 0;
    setValue("totalRemittance", totalRemittance);
    setValue("totalPaymentAllEntries", totalPayment);
    setValue("overallBalance", totalRemittance - totalPayment);
  }, [watchedRemittanceDetails, watchedPaymentDetails, setValue]);

  const onInvalid = (errors: FieldErrors<DataEntryFormData>) => {
    console.error("Form validation errors:", errors);
    const messages = getFormattedErrorMessages(errors);
    toast({
      title: "Validation Error",
      description: (
        <div className="max-h-60 overflow-y-auto">
          <p>Please fix the following issues:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            {messages.map((msg, i) => <li key={i} className="text-xs">{msg}</li>)}
          </ul>
        </div>
      ),
      variant: "destructive",
      duration: 10000,
    });
  };
  
  const onSubmit = async (data: DataEntryFormData) => {
    setIsSubmitting(true);
    try {
      if (!user) throw new Error("Authentication error. Please log in again.");
      
      const fileId = fileIdToEdit || getValues("id");

      if (isSupervisor) {
        // Supervisors can only submit updates, not save directly.
        await createPendingUpdate(data.fileNo, data.siteDetails!, user, {});
        toast({ title: "Update Submitted", description: "Your changes have been submitted for approval." });
        router.push(returnPath);
        return;
      }

      // Editors can save directly.
      await addFileEntry(data, fileId);
      toast({ title: fileId ? "File Updated" : "File Created", description: `File No. ${data.fileNo} has been successfully saved.` });
      router.push(returnPath);

    } catch (error: any) {
      console.error("Form submission error:", error);
      toast({ title: "Submission Failed", description: error.message || "An unknown error occurred.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDialog = (type: 'application' | 'remittance' | 'payment' | 'site', data: any) => {
    setDialogState({ type, data });
  };

  const handleDialogConfirm = (data: any) => {
    const { type, data: originalData } = dialogState;
    if (!type) return;

    switch (type) {
      case 'application':
        setValue('fileNo', data.fileNo);
        setValue('applicantName', data.applicantName);
        setValue('phoneNo', data.phoneNo);
        setValue('secondaryMobileNo', data.secondaryMobileNo);
        setValue('applicationType', data.applicationType);
        setValue('constituency', data.constituency === '_clear_' ? undefined : data.constituency);
        break;
      case 'remittance':
        if (originalData.index !== undefined) {
          updateRemittance(originalData.index, data);
        } else {
          appendRemittance(data);
        }
        break;
      case 'payment':
        const total = calculatePaymentEntryTotalGlobal(data);
        if (originalData.index !== undefined) {
          updatePayment(originalData.index, { ...data, totalPaymentPerEntry: total });
        } else {
          appendPayment({ ...data, totalPaymentPerEntry: total });
        }
        break;
      case 'site':
        if (originalData.index !== undefined) {
          updateSite(originalData.index, data);
        } else {
          appendSite(data);
        }
        break;
    }
    closeDialog();
  };

  const handleDeleteItem = () => {
    if (!itemToDelete) return;
    const { type, index } = itemToDelete;
    if (type === 'remittance') removeRemittance(index);
    if (type === 'payment') removePayment(index);
    if (type === 'site') removeSite(index);
    toast({ title: `${type.charAt(0).toUpperCase() + type.slice(1)} Removed`, description: "The entry has been removed from this file.", variant: "destructive" });
    setItemToDelete(null);
  };
  
  const closeDialog = () => setDialogState({ type: null, data: null });
  const applicationTypeOptionsForForm = workTypeContext === 'private' ? PRIVATE_APPLICATION_TYPES : PUBLIC_APPLICATION_TYPES;

  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
        
        {/* Application Details */}
        <Card>
            <CardHeader className="flex flex-row justify-between items-start">
                <div>
                    <CardTitle className="text-xl">1. Application Details</CardTitle>
                </div>
                {!isViewer && <Button type="button" onClick={() => openDialog('application', getValues())}><Edit className="h-4 w-4 mr-2" />Edit</Button>}
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <DetailRow label="File No." value={watch('fileNo')} />
                    <DetailRow label="Applicant Name & Address" value={watch('applicantName')} className="md:col-span-2" />
                    <DetailRow label="Phone No." value={watch('phoneNo')} />
                    <DetailRow label="Secondary Mobile No." value={watch('secondaryMobileNo')} />
                    <DetailRow label="Type of Application" value={watch('applicationType') ? applicationTypeDisplayMap[watch('applicationType') as ApplicationType] : ''} />
                    <DetailRow label="Constituency (LAC)" value={watch('constituency')} />
                </div>
            </CardContent>
        </Card>

        {/* Remittance Details */}
        <Card>
            <CardHeader className="flex flex-row justify-between items-start">
                <div><CardTitle className="text-xl">2. Remittance Details</CardTitle></div>
                {!isViewer && <Button type="button" onClick={() => openDialog('remittance', {})}><PlusCircle className="h-4 w-4 mr-2" />Add</Button>}
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Amount (₹)</TableHead><TableHead>Account</TableHead><TableHead>Remarks</TableHead>{!isViewer && <TableHead>Actions</TableHead>}</TableRow></TableHeader>
                    <TableBody>
                        {remittanceFields.length > 0 ? remittanceFields.map((item, index) => (
                            <TableRow key={item.id}>
                                <TableCell>{item.dateOfRemittance ? format(new Date(item.dateOfRemittance), 'dd/MM/yyyy') : 'N/A'}</TableCell>
                                <TableCell>{(Number(item.amountRemitted) || 0).toLocaleString('en-IN')}</TableCell>
                                <TableCell>{item.remittedAccount}</TableCell>
                                <TableCell>{item.remittanceRemarks}</TableCell>
                                {!isViewer && <TableCell><div className="flex gap-1"><Button type="button" variant="ghost" size="icon" onClick={() => openDialog('remittance', { index, ...item })}><Edit className="h-4 w-4"/></Button><Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => setItemToDelete({type: 'remittance', index})}><Trash2 className="h-4 w-4"/></Button></div></TableCell>}
                            </TableRow>
                        )) : <TableRow><TableCell colSpan={!isViewer ? 5 : 4} className="text-center h-24">No remittance details added.</TableCell></TableRow>}
                    </TableBody>
                    <TableFooterComponent><TableRow><TableCell colSpan={!isViewer ? 4 : 3} className="text-right font-bold">Total Remittance</TableCell><TableCell className="font-bold">₹{getValues('totalRemittance')?.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2}) || '0.00'}</TableCell></TableRow></TableFooterComponent>
                </Table>
            </CardContent>
        </Card>

        {/* Site Details */}
        <Card>
            <CardHeader className="flex flex-row justify-between items-start">
                <div><CardTitle className="text-xl">3. Site Details</CardTitle></div>
                {!isViewer && <Button type="button" onClick={() => openDialog('site', {})}><PlusCircle className="h-4 w-4 mr-2" />Add Site</Button>}
            </CardHeader>
            <CardContent>
                <Accordion type="single" collapsible className="w-full space-y-2" value={activeAccordionItem} onValueChange={setActiveAccordionItem}>
                    {siteFields.length > 0 ? siteFields.map((site, index) => {
                        const siteErrors = form.formState.errors.siteDetails?.[index];
                        const isFinalStatus = site.workStatus && FINAL_WORK_STATUSES.includes(site.workStatus as SiteWorkStatus);
                        const hasError = (isFinalStatus && !site.dateOfCompletion) || !!siteErrors;
                        
                        return (
                            <AccordionItem key={site.id} value={`site-${index}`} className="border bg-background rounded-lg shadow-sm">
                                <AccordionTrigger className={cn("flex-1 text-base font-semibold px-4 text-primary group", hasError && "text-destructive", site.isPending && "text-amber-600")}>
                                    <div className="flex justify-between items-center w-full">
                                        <div className="flex items-center gap-2">
                                            {hasError && <Info className="h-4 w-4" />}
                                            {site.isPending && <Clock className="h-4 w-4" />}
                                            Site #{index + 1}: {site.nameOfSite || "Unnamed Site"} ({site.workStatus || "No Status"})
                                        </div>
                                        {!isViewer && <Button type="button" size="sm" variant="outline" className="mr-4" onClick={(e) => { e.stopPropagation(); openDialog('site', { index, ...site }); }}><Edit className="h-4 w-4 mr-2"/>Edit Site</Button>}
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="p-6 pt-0">
                                    <div className="border-t pt-6 space-y-4">
                                        <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-4">
                                            <DetailRow label="Purpose" value={site.purpose} />
                                            <DetailRow label="Site Estimate (₹)" value={site.estimateAmount} />
                                            <DetailRow label="Remitted for Site (₹)" value={site.remittedAmount} />
                                            <DetailRow label="Total Expenditure (₹)" value={site.totalExpenditure} />
                                            <DetailRow label="Contractor" value={site.contractorName} />
                                            <DetailRow label="Supervisor" value={site.supervisorName} />
                                            <DetailRow label="Completion Date" value={site.dateOfCompletion ? format(new Date(site.dateOfCompletion), 'dd/MM/yyyy') : 'N/A'} />
                                            <div className="md:col-span-4"><DetailRow label="Work Remarks" value={site.workRemarks} /></div>
                                        </dl>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        );
                    }) : <div className="text-center py-8 text-muted-foreground">No sites added yet.</div>}
                </Accordion>
            </CardContent>
        </Card>

        {/* Payment Details */}
        <Card>
            <CardHeader className="flex flex-row justify-between items-start">
                <div><CardTitle className="text-xl">4. Payment Details</CardTitle></div>
                {!isViewer && <Button type="button" onClick={() => openDialog('payment', {})}><PlusCircle className="h-4 w-4 mr-2" />Add</Button>}
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Account</TableHead><TableHead>Revenue Head</TableHead><TableHead>Contractor Payment</TableHead><TableHead>GST</TableHead><TableHead>Income Tax</TableHead><TableHead>KBCWB</TableHead><TableHead>Refund</TableHead><TableHead>Total Payment</TableHead>{!isViewer && <TableHead>Actions</TableHead>}</TableRow></TableHeader>
                    <TableBody>
                         {paymentFields.length > 0 ? paymentFields.map((item, index) => (
                            <TableRow key={item.id}>
                                <TableCell>{item.dateOfPayment ? format(new Date(item.dateOfPayment), 'dd/MM/yyyy') : 'N/A'}</TableCell>
                                <TableCell>{item.paymentAccount}</TableCell>
                                <TableCell>{(item.revenueHead || 0).toLocaleString('en-IN')}</TableCell>
                                <TableCell>{(item.contractorsPayment || 0).toLocaleString('en-IN')}</TableCell>
                                <TableCell>{(item.gst || 0).toLocaleString('en-IN')}</TableCell>
                                <TableCell>{(item.incomeTax || 0).toLocaleString('en-IN')}</TableCell>
                                <TableCell>{(item.kbcwb || 0).toLocaleString('en-IN')}</TableCell>
                                <TableCell>{(item.refundToParty || 0).toLocaleString('en-IN')}</TableCell>
                                <TableCell className="font-bold">{(item.totalPaymentPerEntry || 0).toLocaleString('en-IN')}</TableCell>
                                {!isViewer && <TableCell><div className="flex gap-1"><Button type="button" variant="ghost" size="icon" onClick={() => openDialog('payment', { index, ...item })}><Edit className="h-4 w-4"/></Button><Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => setItemToDelete({type: 'payment', index})}><Trash2 className="h-4 w-4"/></Button></div></TableCell>}
                            </TableRow>
                        )) : <TableRow><TableCell colSpan={!isViewer ? 10 : 9} className="text-center h-24">No payment details added.</TableCell></TableRow>}
                    </TableBody>
                     <TableFooterComponent><TableRow><TableCell colSpan={!isViewer ? 9 : 8} className="text-right font-bold">Total Payment</TableCell><TableCell className="font-bold">₹{getValues('totalPaymentAllEntries')?.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2}) || '0.00'}</TableCell></TableRow></TableFooterComponent>
                </Table>
            </CardContent>
        </Card>

        {/* Final Details */}
        <Card>
            <CardHeader><CardTitle className="text-xl">5. Final Details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 border rounded-lg space-y-4 bg-secondary/30">
                     <h3 className="font-semibold text-lg text-primary">Financial Summary</h3>
                     <dl className="space-y-2">
                        <div className="flex justify-between items-baseline"><dt>Total Remittance</dt><dd className="font-mono">₹{getValues('totalRemittance')?.toLocaleString('en-IN') || '0'}</dd></div>
                        <div className="flex justify-between items-baseline"><dt>Total Payment</dt><dd className="font-mono">₹{getValues('totalPaymentAllEntries')?.toLocaleString('en-IN') || '0'}</dd></div>
                        <Separator />
                        <div className="flex justify-between items-baseline font-bold"><dt>Overall Balance</dt><dd className="font-mono text-xl">₹{getValues('overallBalance')?.toLocaleString('en-IN') || '0'}</dd></div>
                     </dl>
                </div>
                 <div className="p-4 border rounded-lg space-y-4 bg-secondary/30">
                    <FormField control={control} name="fileStatus" render={({ field }) => <FormItem><FormLabel>File Status <span className="text-destructive">*</span></FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isViewer}><FormControl><SelectTrigger><SelectValue placeholder="Select final file status" /></SelectTrigger></FormControl><SelectContent>{fileStatusOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />
                    <FormField control={control} name="remarks" render={({ field }) => <FormItem><FormLabel>Final Remarks</FormLabel><FormControl><Textarea {...field} placeholder="Add any final remarks for this file..." readOnly={isViewer} /></FormControl><FormMessage /></FormItem>} />
                </div>
            </CardContent>
        </Card>

        {!isViewer && (
            <CardFooter className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => router.push(returnPath)} disabled={isSubmitting}><X className="mr-2 h-4 w-4"/> Cancel</Button>
                <Button type="submit" disabled={isSubmitting}><Save className="mr-2 h-4 w-4"/> {isSubmitting ? "Saving..." : (fileIdToEdit ? 'Save Changes' : 'Save New File')}</Button>
            </CardFooter>
        )}
        
        {/* Dialogs */}
        <Dialog open={dialogState.type === 'application'} onOpenChange={closeDialog}>
            <DialogContent className="max-w-4xl"><ApplicationDialogContent initialData={dialogState.data} onConfirm={handleDialogConfirm} onCancel={closeDialog} formOptions={applicationTypeOptionsForForm} /></DialogContent>
        </Dialog>
        <Dialog open={dialogState.type === 'remittance'} onOpenChange={closeDialog}>
            <DialogContent className="max-w-3xl"><RemittanceDialogContent initialData={dialogState.data} onConfirm={handleDialogConfirm} onCancel={closeDialog} /></DialogContent>
        </Dialog>
         <Dialog open={dialogState.type === 'site'} onOpenChange={closeDialog}>
            <DialogContent className="max-w-6xl h-[90vh] flex flex-col"><SiteDialogContent initialData={dialogState.data} onConfirm={handleDialogConfirm} onCancel={closeDialog} supervisorList={supervisorList} isReadOnly={isReadOnly(dialogState.data?.fieldName)} isSupervisor={isSupervisor} allLsgConstituencyMaps={allLsgConstituencyMaps}/></DialogContent>
        </Dialog>
        <Dialog open={dialogState.type === 'payment'} onOpenChange={closeDialog}>
            <DialogContent className="max-w-3xl">
                {/* PaymentDialogContent would be here */}
            </DialogContent>
        </Dialog>

        <AlertDialog open={itemToDelete !== null} onOpenChange={() => setItemToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently remove the selected {itemToDelete?.type} entry from this file.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteItem}>Delete</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

      </form>
    </FormProvider>
  );
}
