
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
import { Loader2, Trash2, PlusCircle, X, Save, Clock, Edit, Eye } from "lucide-react";
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

const db = getFirestore(app);

const createDefaultRemittanceDetail = (): RemittanceDetailFormData => ({ amountRemitted: undefined, dateOfRemittance: undefined, remittedAccount: undefined, remittanceRemarks: "" });
const createDefaultPaymentDetail = (): PaymentDetailFormData => ({ dateOfPayment: undefined, paymentAccount: undefined, revenueHead: undefined, contractorsPayment: undefined, gst: undefined, incomeTax: undefined, kbcwb: undefined, refundToParty: undefined, totalPaymentPerEntry: 0, paymentRemarks: "" });
const createDefaultSiteDetail = (): z.infer<typeof SiteDetailSchema> => ({ nameOfSite: "", localSelfGovt: "", constituency: undefined, latitude: undefined, longitude: undefined, purpose: undefined, estimateAmount: undefined, remittedAmount: undefined, siteConditions: undefined, accessibleRig: undefined, tsAmount: undefined, additionalAS: 'No', tenderNo: "", diameter: undefined, totalDepth: undefined, casingPipeUsed: "", outerCasingPipe: "", innerCasingPipe: "", yieldDischarge: "", zoneDetails: "", waterLevel: "", drillingRemarks: "", pumpDetails: "", waterTankCapacity: "", noOfTapConnections: undefined, noOfBeneficiary: "", dateOfCompletion: undefined, typeOfRig: undefined, contractorName: "", supervisorUid: null, supervisorName: null, totalExpenditure: undefined, workStatus: undefined, workRemarks: "", surveyOB: "", surveyLocation: "", surveyPlainPipe: "", surveySlottedPipe: "", surveyRemarks: "", surveyRecommendedDiameter: "", surveyRecommendedTD: "", surveyRecommendedOB: "", surveyRecommendedCasingPipe: "", surveyRecommendedPlainPipe: "", surveyRecommendedSlottedPipe: "", surveyRecommendedMsCasingPipe: "", arsTypeOfScheme: undefined, arsPanchayath: undefined, arsBlock: undefined, arsAsTsDetails: undefined, arsSanctionedDate: undefined, arsTenderedAmount: undefined, arsAwardedAmount: undefined, arsNumberOfStructures: undefined, arsStorageCapacity: undefined, arsNumberOfFillings: undefined, isArsImport: false, pilotDrillingDepth: "", pumpingLineLength: "", deliveryLineLength: "" });

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

  const processPath = (path: string, index?: number): string => {
    if (path.startsWith('remittanceDetails')) return `Remittance #${(index ?? 0) + 1}`;
    if (path.startsWith('siteDetails')) return `Site #${(index ?? 0) + 1}`;
    if (path.startsWith('paymentDetails')) return `Payment #${(index ?? 0) + 1}`;
    return path;
  };

  function findMessages(obj: any, parentPath: string = "") {
    if (!obj) return;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];
        const newPath = parentPath ? `${parentPath}.${key}` : key;
        
        if (value?.message && typeof value.message === 'string') {
          const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
          messages.add(`${formattedKey}: ${value.message}`);
        } else if (Array.isArray(value)) {
          value.forEach((item, index) => {
            if (item && typeof item === 'object') {
              for (const itemKey in item) {
                if (item[itemKey]?.message) {
                  const pathPrefix = processPath(newPath, index);
                  const formattedItemKey = itemKey.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
                  messages.add(`${pathPrefix} - ${formattedItemKey}: ${item[itemKey].message}`);
                }
              }
            }
          });
        } else if (value && typeof value === 'object') {
          findMessages(value, newPath);
        }
      }
    }
  }

  findMessages(errors);
  return Array.from(messages);
};

const DetailRow = ({ label, value }: { label: string; value: any }) => {
    if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
        return null;
    }

    let displayValue = String(value);
    
    if (label.toLowerCase().includes('date') && value) {
        try {
            displayValue = format(new Date(value), "dd/MM/yyyy");
        } catch (e) { /* Keep original string if formatting fails */ }
    } else if (typeof value === 'number') {
        displayValue = value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    return (
        <div>
            <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
            <dd className="text-sm">{displayValue}</dd>
        </div>
    );
};


interface DataEntryFormProps { fileNoToEdit?: string; initialData: DataEntryFormData; supervisorList: (StaffMember & { uid: string; name: string })[]; userRole?: UserRole; workTypeContext: 'public' | 'private' | null; }

const PUBLIC_APPLICATION_TYPES = applicationTypeOptions.filter( (type) => !type.startsWith("Private_") );
const PRIVATE_APPLICATION_TYPES = applicationTypeOptions.filter( (type) => type.startsWith("Private_") );

const formatDateForInput = (date: Date | string | null | undefined): string => {
    if (!date) return "";
    try { return format(new Date(date), 'yyyy-MM-dd'); } catch { return ""; }
};

// Dialog Content Components
const ApplicationDialogContent = ({ initialData, onConfirm, onCancel, formOptions }: { initialData: any, onConfirm: (data: any) => void, onCancel: () => void, formOptions: typeof applicationTypeOptions }) => {
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
    const form = useForm<SiteDetailFormData>({
      resolver: zodResolver(SiteDetailSchema),
      defaultValues: { ...initialData, dateOfCompletion: formatDateForInput(initialData.dateOfCompletion), arsSanctionedDate: formatDateForInput(initialData.arsSanctionedDate) },
    });
    
    const { control, setValue, trigger, watch, handleSubmit, getValues } = form;
    
    const watchedPurpose = watch('purpose');
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
                <DialogTitle>{initialData.nameOfSite ? `Edit Site: ${initialData.nameOfSite}` : "Add New Site"}</DialogTitle>
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
                                <FormField name="surveyRecommendedDiameter" control={control} render={({ field }) => <FormItem><FormLabel>Diameter (mm)</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue placeholder="Select Diameter" /></SelectTrigger></FormControl><SelectContent><SelectItem value="_clear_" onSelect={(e) => { e.preventDefault(); field.onChange(undefined); }}>-- Clear Selection --</SelectItem>{siteDiameterOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />
                                <FormField name="surveyRecommendedTD" control={control} render={({ field }) => <FormItem><FormLabel>Total Depth (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                                {watchedPurpose === 'BWC' && <FormField name="surveyRecommendedOB" control={control} render={({ field }) => <FormItem><FormLabel>OB (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />}
                                {watchedPurpose === 'BWC' && <FormField name="surveyRecommendedCasingPipe" control={control} render={({ field }) => <FormItem><FormLabel>Casing Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />}
                                {watchedPurpose === 'TWC' && <FormField name="surveyRecommendedPlainPipe" control={control} render={({ field }) => <FormItem><FormLabel>Plain Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />}
                                {watchedPurpose === 'TWC' && <FormField name="surveyRecommendedSlottedPipe" control={control} render={({ field }) => <FormItem><FormLabel>Slotted Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />}
                                {watchedPurpose === 'TWC' && <FormField name="surveyRecommendedMsCasingPipe" control={control} render={({ field }) => <FormItem><FormLabel>MS Casing Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />}
                                {watchedPurpose === 'FPW' && <FormField name="surveyRecommendedCasingPipe" control={control} render={({ field }) => <FormItem><FormLabel>Casing Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />}
                                <FormField name="surveyLocation" control={control} render={({ field }) => <FormItem><FormLabel>Survey Location</FormLabel><FormControl><Textarea {...field} value={field.value || ''} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                                <FormField name="surveyRemarks" control={control} render={({ field }) => <FormItem className="md:col-span-2"><FormLabel>Survey Remarks</FormLabel><FormControl><Textarea {...field} value={field.value || ''} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
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
                            {!isSupervisor && <FormField name="supervisorUid" control={form.control} render={({ field }) => (<FormItem><FormLabel>Supervisor</FormLabel><Select onValueChange={(uid) => { field.onChange(uid); const name = supervisorList.find(s => s.uid === uid)?.name || null; setValue('supervisorName', name) }} value={field.value || ''} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue placeholder="Select Supervisor" /></SelectTrigger></FormControl><SelectContent><SelectItem value="_clear_" onSelect={(e) => { e.preventDefault(); field.onChange(null); setValue('supervisorName', null); }}>-- Clear Selection --</SelectItem>{supervisorList.map(s => <SelectItem key={s.uid} value={s.uid}>{s.name}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>)} />}
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
                                <FormField name="dateOfCompletion" control={control} render={({ field }) => <FormItem><FormLabel>Completion Date</FormLabel><FormControl><Input type="date" {...field} value={field.value || ''} readOnly={isReadOnly && !isSupervisor} /></FormControl><FormMessage /></FormItem>} />
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

const PaymentDialogContent = ({ initialData, onConfirm, onCancel }: { initialData: any, onConfirm: (data: any) => void, onCancel: () => void }) => {
    const [data, setData] = useState({ ...initialData, dateOfPayment: formatDateForInput(initialData.dateOfPayment) });
    const handleChange = (key: string, value: any) => setData((prev: any) => ({ ...prev, [key]: value }));
    return (
        <div className="flex flex-col h-auto">
            <DialogHeader>
                <DialogTitle>Payment Details</DialogTitle>
            </DialogHeader>
            <div className="p-6 flex-1">
                <ScrollArea className="h-full pr-4">
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2"><Label>Date of Payment</Label><Input type="date" value={data.dateOfPayment} onChange={e => handleChange('dateOfPayment', e.target.value)} /></div>
                          <div className="space-y-2"><Label>Payment Account</Label><Select onValueChange={v => handleChange('paymentAccount', v)} value={data.paymentAccount}><SelectTrigger><SelectValue placeholder="Select Account"/></SelectTrigger><SelectContent>{paymentAccountOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div>
                        </div>
                        <Separator />
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2"><Label>Contractor's Payment</Label><Input type="number" value={data.contractorsPayment} onChange={e => handleChange('contractorsPayment', e.target.valueAsNumber)} /></div>
                          <div className="space-y-2"><Label>GST</Label><Input type="number" value={data.gst} onChange={e => handleChange('gst', e.target.valueAsNumber)} /></div>
                          <div className="space-y-2"><Label>Income Tax</Label><Input type="number" value={data.incomeTax} onChange={e => handleChange('incomeTax', e.target.valueAsNumber)} /></div>
                          <div className="space-y-2"><Label>KBCWB</Label><Input type="number" value={data.kbcwb} onChange={e => handleChange('kbcwb', e.target.valueAsNumber)} /></div>
                          <div className="space-y-2"><Label>Refund to Party</Label><Input type="number" value={data.refundToParty} onChange={e => handleChange('refundToParty', e.target.valueAsNumber)} /></div>
                          <div className="space-y-2"><Label>Revenue Head</Label><Input type="number" value={data.revenueHead} onChange={e => handleChange('revenueHead', e.target.valueAsNumber)} /></div>
                        </div>
                        <div className="space-y-2"><Label>Remarks</Label><Textarea value={data.paymentRemarks} onChange={e => handleChange('paymentRemarks', e.target.value)} /></div>
                    </div>
                </ScrollArea>
            </div>
            <DialogFooter><Button variant="outline" onClick={onCancel}>Cancel</Button><Button onClick={() => onConfirm(data)}>Save</Button></DialogFooter>
        </div>
    );
};

const SiteViewDialogContent = ({ siteData, onCancel }: { siteData: SiteDetailFormData, onCancel: () => void }) => {
  const isWellPurpose = ['BWC', 'TWC', 'FPW'].includes(siteData.purpose as SitePurpose);
  const isDevPurpose = ['BW Dev', 'TW Dev', 'FPW Dev'].includes(siteData.purpose as SitePurpose);
  const isMWSSSchemePurpose = ['MWSS', 'MWSS Ext', 'Pumping Scheme', 'MWSS Pump Reno'].includes(siteData.purpose as SitePurpose);
  const isHPSPurpose = ['HPS', 'HPR'].includes(siteData.purpose as SitePurpose);

  return (
    <DialogContent className="max-w-3xl flex flex-col h-[90vh]">
        <DialogHeader>
            <DialogTitle>View Site: {siteData.nameOfSite}</DialogTitle>
            <DialogDescription>A read-only view of the site's details.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full px-6 py-4">
              <div className="space-y-6">
                  <div className="space-y-2"><h3 className="text-lg font-semibold text-primary border-b pb-2 mb-3">Main Details</h3><DetailRow label="Purpose" value={siteData.purpose} /><DetailRow label="Local Self Govt" value={siteData.localSelfGovt} /><DetailRow label="Constituency" value={siteData.constituency} /><DetailRow label="Latitude" value={siteData.latitude} /><DetailRow label="Longitude" value={siteData.longitude} /></div>

                  {isWellPurpose && (
                      <div className="space-y-2"><h3 className="text-lg font-semibold text-primary border-b pb-2 mb-3">Survey & Drilling Details</h3>
                        <DetailRow label="Recommended Diameter" value={siteData.surveyRecommendedDiameter} /><DetailRow label="Recommended TD (m)" value={siteData.surveyRecommendedTD} />
                        <DetailRow label="Actual Diameter" value={siteData.diameter} /><DetailRow label="Actual TD (m)" value={siteData.totalDepth} />
                        <DetailRow label="Yield (LPH)" value={siteData.yieldDischarge} /><DetailRow label="Static Water Level (m)" value={siteData.waterLevel} />
                        <DetailRow label="Drilling Remarks" value={siteData.drillingRemarks} />
                      </div>
                  )}

                  <div className="space-y-2"><h3 className="text-lg font-semibold text-primary border-b pb-2 mb-3">Work & Financials</h3>
                    <DetailRow label="Work Status" value={siteData.workStatus} /><DetailRow label="Completion Date" value={siteData.dateOfCompletion} />
                    <DetailRow label="Contractor" value={siteData.contractorName} /><DetailRow label="Supervisor" value={siteData.supervisorName} />
                    <DetailRow label="Estimate Amount (₹)" value={siteData.estimateAmount} /><DetailRow label="TS Amount (₹)" value={siteData.tsAmount} />
                    <DetailRow label="Remitted Amount (₹)" value={siteData.remittedAmount} /><DetailRow label="Total Expenditure (₹)" value={siteData.totalExpenditure} />
                    <DetailRow label="Work Remarks" value={siteData.workRemarks} />
                  </div>
              </div>
          </ScrollArea>
        </div>
        <DialogFooter><Button onClick={onCancel} type="button">Close</Button></DialogFooter>
    </DialogContent>
  )
};

export default function DataEntryFormComponent({ fileNoToEdit, initialData, supervisorList, userRole, workTypeContext }: DataEntryFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addFileEntry } = useFileEntries();
  const { createPendingUpdate, getPendingUpdateById } = usePendingUpdates();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { allLsgConstituencyMaps } = useDataStore();

  const [dialogState, setDialogState] = useState<{ type: string | null; data: any; index?: number }>({ type: null, data: null });
  const [itemToDelete, setItemToDelete] = useState<{ type: string; index: number } | null>(null);
  
  const isEditor = userRole === 'editor';
  const isSupervisor = userRole === 'supervisor';
  const isViewer = userRole === 'viewer';
  
  const approveUpdateId = searchParams.get("approveUpdateId");
  const isApprovingUpdate = isEditor && !!approveUpdateId;
  const isReadOnly = isViewer || (isSupervisor && !fileNoToEdit);

  const formOptions = useMemo(() => {
    if (workTypeContext === 'private') return PRIVATE_APPLICATION_TYPES;
    if (workTypeContext === 'public') return PUBLIC_APPLICATION_TYPES;
    return applicationTypeOptions;
  }, [workTypeContext]);

  const form = useForm<DataEntryFormData>({
    resolver: zodResolver(DataEntrySchema),
    defaultValues: { ...initialData, siteDetails: initialData.siteDetails?.length ? initialData.siteDetails : [] },
  });
  const { reset: formReset, trigger: formTrigger, getValues: formGetValues, setValue: formSetValue, control, watch } = form;

  const stableInitialDataString = JSON.stringify(initialData);

  useEffect(() => { formReset(initialData); }, [stableInitialDataString, formReset, initialData]);
  useEffect(() => { if (fileNoToEdit) { const timer = setTimeout(() => formTrigger(), 500); return () => clearTimeout(timer); } }, [fileNoToEdit, formTrigger, stableInitialDataString]);

  const watchedSiteDetails = useWatch({ control, name: "siteDetails", defaultValue: [] });
  const applicationType = watch("applicationType");
  const isPrivateApplication = useMemo(() => { if (!applicationType) return false; return ['Private_Domestic', 'Private_Irrigation', 'Private_Institution', 'Private_Industry'].includes(applicationType); }, [applicationType]);

  useEffect(() => {
    if (userRole === 'editor') {
      (watchedSiteDetails ?? []).forEach((site, index) => {
        if (site.supervisorUid) {
          const supervisorIsActive = supervisorList.some(s => s.uid === site.supervisorUid);
          if (!supervisorIsActive) {
            const supervisorName = site.supervisorName || 'an inactive user';
            const existingRemarks = formGetValues(`siteDetails.${index}.workRemarks`) || "";
            const note = `[System Note: Previous supervisor '${supervisorName}' is now inactive and has been unassigned.]`;
            
            formSetValue(`siteDetails.${index}.supervisorUid`, null);
            formSetValue(`siteDetails.${index}.supervisorName`, null);
            formSetValue(`siteDetails.${index}.workRemarks`, `${existingRemarks}\n${note}`.trim());
            
            toast({ title: "Supervisor Unassigned", description: `Supervisor '${supervisorName}' for Site #${index+1} is inactive and has been automatically unassigned. Please review.`, variant: "default", duration: 7000 });
          }
        }
      });
    }
  }, [userRole, supervisorList, watchedSiteDetails, formGetValues, formSetValue, toast]);

  const { fields: siteFields, append: appendSite, remove: removeSite, update: updateSite } = useFieldArray({ control: form.control, name: "siteDetails" });
  const { fields: remittanceFields, append: appendRemittance, remove: removeRemittance, update: updateRemittance } = useFieldArray({ control: form.control, name: "remittanceDetails" });
  const { fields: paymentFields, append: appendPayment, remove: removePayment, update: updatePayment } = useFieldArray({ control: form.control, name: "paymentDetails" });

  const onInvalid = (errors: FieldErrors<DataEntryFormData>) => {
    const errorMessages = getFormattedErrorMessages(errors);
    toast({
      title: "Validation Error",
      description: (
        <ul className="list-disc pl-5">
          {errorMessages.slice(0, 5).map((msg, i) => <li key={i}>{msg}</li>)}
          {errorMessages.length > 5 && <li>...and {errorMessages.length - 5} more issues.</li>}
        </ul>
      ),
      variant: "destructive",
      duration: 10000,
    });
    console.debug("Form validation errors:", errors);
  };

  async function onValidSubmit(data: DataEntryFormData) {
    if (!user) {
      toast({ title: "Not Authenticated", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      if (fileNoToEdit && user.role === 'editor') {
        const payload = {
          ...data,
          assignedSupervisorUids: [...new Set(data.siteDetails?.map(s => s.supervisorUid).filter(Boolean) as string[])],
        };
        await addFileEntry(payload, fileNoToEdit);
        if (isApprovingUpdate) {
            const pendingUpdateDocRef = doc(db, 'pendingUpdates', approveUpdateId);
            await updateDoc(pendingUpdateDocRef, {
                status: 'approved',
                reviewedByUid: user.uid,
                reviewedAt: serverTimestamp(),
            });
            toast({ title: "Update Approved", description: `Changes for file ${fileNoToEdit} have been saved.` });
        } else {
          toast({ title: "File Updated", description: `File No: ${fileNoToEdit} has been successfully updated.` });
        }
        router.push(isApprovingUpdate ? '/dashboard/pending-updates' : '/dashboard/file-room');
      } else if (fileNoToEdit && user.role === 'supervisor') {
        const originalFile = initialData;
        const supervisorSites = data.siteDetails.filter(s => s.supervisorUid === user.uid);
        const fileLevelUpdates: Partial<Pick<DataEntryFormData, 'fileStatus' | 'remarks'>> = {};
        if (data.fileStatus !== originalFile.fileStatus) fileLevelUpdates.fileStatus = data.fileStatus;
        if (data.remarks !== originalFile.remarks) fileLevelUpdates.remarks = data.remarks;
        await createPendingUpdate(fileNoToEdit, supervisorSites, user, fileLevelUpdates);
        toast({ title: "Update Submitted", description: "Your changes have been submitted for approval." });
        router.push('/dashboard');
      } else {
        await addFileEntry(data);
        toast({ title: "File Created", description: `File No: ${data.fileNo} has been saved.` });
        router.push('/dashboard/file-room');
      }
    } catch (error: any) {
      console.error("Submission failed:", error);
      toast({ title: "Submission Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleLsgChange = useCallback((lsgName: string, siteIndex: number) => {
    formSetValue(`siteDetails.${siteIndex}.localSelfGovt`, lsgName);
    const map = allLsgConstituencyMaps.find(m => m.name === lsgName);
    const constituencies = map?.constituencies || [];
    
    formSetValue(`siteDetails.${siteIndex}.constituency`, undefined);
    if (constituencies.length === 1) {
      formSetValue(`siteDetails.${siteIndex}.constituency`, constituencies[0] as Constituency);
    }
    form.trigger(`siteDetails.${siteIndex}.constituency`);
  }, [formSetValue, allLsgConstituencyMaps, form]);

  useEffect(() => {
    const subscription = watch((value, { name, type }) => {
      if (name && name.startsWith('siteDetails') && name.endsWith('localSelfGovt')) {
        const siteIndex = parseInt(name.split('.')[1], 10);
        const newLsgName = value.siteDetails?.[siteIndex]?.localSelfGovt;
        if (newLsgName !== undefined) {
          handleLsgChange(newLsgName, siteIndex);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, handleLsgChange]);
  
  const sortedLsgMaps = useMemo(() => {
    return [...allLsgConstituencyMaps].sort((a, b) => a.name.localeCompare(b.name));
  }, [allLsgConstituencyMaps]);

  const openDialog = (type: string, index?: number) => {
    let data;
    if (type === 'application') data = { fileNo: form.getValues('fileNo'), applicantName: form.getValues('applicantName'), phoneNo: form.getValues('phoneNo'), secondaryMobileNo: form.getValues('secondaryMobileNo'), applicationType: form.getValues('applicationType') };
    else if (index !== undefined) {
      if (type === 'remittance') data = form.getValues(`remittanceDetails.${index}`);
      else if (type === 'site' || type === 'viewSite') data = form.getValues(`siteDetails.${index}`);
      else if (type === 'payment') data = form.getValues(`paymentDetails.${index}`);
    } else {
      if (type === 'remittance') data = createDefaultRemittanceDetail();
      else if (type === 'site') data = createDefaultSiteDetail();
      else if (type === 'payment') data = createDefaultPaymentDetail();
    }
    setDialogState({ type, data, index });
  };
  const closeDialog = () => setDialogState({ type: null, data: null });

  const handleDialogSave = (formData: any) => {
    const { type, index } = dialogState;
    if (type === 'application') { form.setValue('fileNo', formData.fileNo); form.setValue('applicantName', formData.applicantName); form.setValue('phoneNo', formData.phoneNo); form.setValue('secondaryMobileNo', formData.secondaryMobileNo); form.setValue('applicationType', formData.applicationType); }
    else if (type === 'remittance') { if (index !== undefined) updateRemittance(index, formData); else appendRemittance(formData); }
    else if (type === 'site') { if (index !== undefined) updateSite(index, formData); else appendSite(formData); }
    else if (type === 'payment') { if (index !== undefined) updatePayment(index, formData); else appendPayment(formData); }
    closeDialog();
  };

  const handleDeleteClick = (type: string, index: number) => setItemToDelete({ type, index });
  const confirmDelete = () => { if (itemToDelete) { const { type, index } = itemToDelete; if (type === 'remittance') removeRemittance(index); else if (type === 'site') removeSite(index); else if (type === 'payment') removePayment(index); setItemToDelete(null); toast({ title: 'Entry Removed' }); } };
  
    const totalSiteEstimate = (watch('siteDetails') ?? []).reduce((acc, site) => acc + (Number(site.estimateAmount) || 0), 0);
    const totalRemittance = (watch('remittanceDetails') ?? []).reduce((acc, curr) => acc + (Number(curr.amountRemitted) || 0), 0);
    const totalPayment = (watch('paymentDetails') ?? []).reduce((acc, payment) => acc + calculatePaymentEntryTotalGlobal(payment), 0);
    const overallBalance = totalRemittance - totalPayment;


    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onValidSubmit, onInvalid)} className="space-y-4">
                <Accordion type="multiple" defaultValue={["item-1", "item-2", "item-3", "item-4", "item-5"]} className="w-full space-y-4">
                    <AccordionItem value="item-1">
                      <AccordionPrimitive.Header className="flex items-center rounded-t-lg bg-secondary/30 p-4">
                          <AccordionTrigger className="text-xl font-semibold text-primary flex-1 text-left">
                              1. Application Details
                          </AccordionTrigger>
                          {!isReadOnly && (
                              <Button type="button" variant="link" onClick={(e) => { e.stopPropagation(); openDialog('application'); }} className="mr-4"><Edit className="mr-2 h-4 w-4"/>Edit</Button>
                          )}
                      </AccordionPrimitive.Header>
                        <AccordionContent className="p-4 border border-t-0 rounded-b-lg">
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <DetailRow label="File No" value={watch('fileNo')} />
                                <DetailRow label="Applicant" value={watch('applicantName')} />
                                <DetailRow label="Phone No" value={watch('phoneNo')} />
                                <DetailRow label="Secondary Mobile" value={watch('secondaryMobileNo')} />
                                <DetailRow label="Application Type" value={applicationTypeDisplayMap[watch('applicationType') as ApplicationType]} />
                             </div>
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-2">
                      <AccordionPrimitive.Header className="flex items-center rounded-t-lg bg-secondary/30 p-4">
                        <AccordionTrigger className="text-xl font-semibold text-primary flex-1 text-left">
                           2. Remittance Details
                        </AccordionTrigger>
                        {!isReadOnly && <Button type="button" variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openDialog('remittance'); }} className="mr-4"><PlusCircle className="mr-2 h-4 w-4"/>Add Remittance</Button>}
                      </AccordionPrimitive.Header>
                        <AccordionContent className="p-4 border border-t-0 rounded-b-lg space-y-2">
                           {remittanceFields.map((field, index) => (
                                <div key={field.id} className="flex items-start justify-between p-3 border rounded-lg">
                                    <div>
                                        <p className="font-semibold text-sm mb-1">Remittance #{index + 1}</p>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4">
                                            <DetailRow label="Date" value={watch(`remittanceDetails.${index}.dateOfRemittance`)} />
                                            <DetailRow label="Amount" value={watch(`remittanceDetails.${index}.amountRemitted`)} />
                                            <DetailRow label="Account" value={watch(`remittanceDetails.${index}.remittedAccount`)} />
                                        </div>
                                        <DetailRow label="Remarks" value={watch(`remittanceDetails.${index}.remittanceRemarks`)} />
                                    </div>
                                    {!isReadOnly && (
                                        <div className="flex items-center gap-1">
                                            <Button type="button" variant="ghost" size="icon" onClick={() => openDialog('remittance', index)}><Edit className="h-4 w-4"/></Button>
                                            <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteClick('remittance', index)}><Trash2 className="h-4 w-4"/></Button>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {remittanceFields.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No remittance entries have been added yet.</p>}
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-3">
                        <AccordionPrimitive.Header className="flex items-center rounded-t-lg bg-secondary/30 p-4">
                           <AccordionTrigger className="text-xl font-semibold text-primary flex-1 text-left">
                               3. Site Details
                           </AccordionTrigger>
                           {!isReadOnly && isEditor && <Button type="button" variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openDialog('site'); }} className="mr-4"><PlusCircle className="mr-2 h-4 w-4"/>Add Site</Button>}
                        </AccordionPrimitive.Header>
                        <AccordionContent className="p-4 border border-t-0 rounded-b-lg space-y-2">
                            {siteFields.map((field, index) => {
                                const siteData = watch(`siteDetails.${index}`);
                                const isSiteAssignedToCurrentUser = isSupervisor && siteData.supervisorUid === user?.uid;
                                const isSiteEditableForSupervisor = isSiteAssignedToCurrentUser && !FINAL_WORK_STATUSES.includes(siteData.workStatus as SiteWorkStatus);
                                const isReadOnlyForSite = isViewer || (isSupervisor && !isSiteEditableForSupervisor);
                                const isFinalStatus = ['Work Completed', 'Work Failed'].includes(siteData.workStatus as SiteWorkStatus);

                                return (
                                    <div key={field.id} className="p-4 border rounded-lg">
                                        <div className="flex justify-between items-start mb-2">
                                            <p className={cn("font-semibold text-base", isFinalStatus ? "text-red-600" : "text-green-600")}>Site #{index + 1}: {siteData.nameOfSite}</p>
                                            <div className="flex items-center gap-1">
                                                <Button type="button" variant="outline" size="sm" onClick={() => openDialog('viewSite', index)}><Eye className="mr-2 h-4 w-4"/> View</Button>
                                                {!isReadOnlyForSite && <Button type="button" variant="default" size="sm" onClick={() => openDialog('site', index)}><Edit className="mr-2 h-4 w-4"/> Edit</Button>}
                                                {isEditor && !isReadOnly && (<Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteClick('site', index)}><Trash2 className="h-4 w-4"/></Button>)}
                                            </div>
                                        </div>
                                        <div className="pt-2 border-t grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1">
                                            <DetailRow label="Purpose" value={siteData.purpose} />
                                            <DetailRow label="Work Status" value={siteData.workStatus} />
                                            <DetailRow label="Supervisor" value={siteData.supervisorName} />
                                            <DetailRow label="Latitude" value={siteData.latitude} />
                                            <DetailRow label="Longitude" value={siteData.longitude} />
                                            <DetailRow label="Contractor" value={siteData.contractorName} />
                                            <DetailRow label="Site Estimate (₹)" value={siteData.estimateAmount} />
                                            <DetailRow label="TS Amount (₹)" value={siteData.tsAmount} />
                                            <DetailRow label="Remitted (₹)" value={siteData.remittedAmount} />
                                            <DetailRow label="Expenditure (₹)" value={siteData.totalExpenditure} />
                                            <DetailRow label="Completion Date" value={siteData.dateOfCompletion} />
                                            <div className="md:col-span-3">
                                                <DetailRow label="Work Remarks" value={siteData.workRemarks} />
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                           {siteFields.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No sites have been added yet.</p>}
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-4">
                      <AccordionPrimitive.Header className="flex items-center rounded-t-lg bg-secondary/30 p-4">
                        <AccordionTrigger className="text-xl font-semibold text-primary flex-1 text-left">
                            4. Payment Details
                        </AccordionTrigger>
                        {!isReadOnly && <Button type="button" variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openDialog('payment'); }} className="mr-4"><PlusCircle className="mr-2 h-4 w-4"/>Add Payment</Button>}
                      </AccordionPrimitive.Header>
                        <AccordionContent className="p-4 border border-t-0 rounded-b-lg space-y-2">
                           {paymentFields.map((field, index) => {
                                const paymentData = watch(`paymentDetails.${index}`);
                                if (!paymentData) return null;
                                return (
                                <div key={field.id} className="flex items-start justify-between p-3 border rounded-lg">
                                    <div>
                                        <p className="font-semibold text-sm mb-1">Payment #{index + 1}</p>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4">
                                            <DetailRow label="Date" value={watch(`paymentDetails.${index}.dateOfPayment`)} />
                                            <DetailRow label="Total Paid" value={calculatePaymentEntryTotalGlobal(watch(`paymentDetails.${index}`))} />
                                            <DetailRow label="Account" value={watch(`paymentDetails.${index}.paymentAccount`)} />
                                        </div>
                                    </div>
                                    {!isReadOnly && (
                                        <div className="flex items-center gap-1">
                                            <Button type="button" variant="ghost" size="icon" onClick={() => openDialog('payment', index)}><Edit className="h-4 w-4"/></Button>
                                            <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteClick('payment', index)}><Trash2 className="h-4 w-4"/></Button>
                                        </div>
                                    )}
                                </div>
                            )})}
                            {paymentFields.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No payment entries have been added yet.</p>}
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-5">
                      <AccordionTrigger className="text-xl font-semibold text-primary p-4 bg-secondary/30 rounded-t-lg">5. Final Status & Summary</AccordionTrigger>
                        <AccordionContent className="p-4 border border-t-0 rounded-b-lg space-y-4">
                             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                               <DetailRow label="Total Estimate Amount (₹)" value={totalSiteEstimate} />
                               <DetailRow label="Total Remittance (₹)" value={totalRemittance} />
                               <DetailRow label="Total Payment (₹)" value={totalPayment} />
                               <DetailRow label="Balance (₹)" value={overallBalance} />
                            </div>
                            <Separator/>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField name="fileStatus" control={control} render={({ field }) => <FormItem><FormLabel>File Status <span className="text-destructive">*</span></FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger></FormControl><SelectContent>{fileStatusOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />
                                <FormField name="remarks" control={control} render={({ field }) => <FormItem><FormLabel>Final Remarks</FormLabel><FormControl><Textarea {...field} value={field.value || ''} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
                
                <div className="flex space-x-4 pt-4">{!isViewer && (<Button type="submit" disabled={isSubmitting}>{isSubmitting ? (<Loader2 className="mr-2 h-4 w-4 animate-spin" />) : (<Save className="mr-2 h-4 w-4" />)}{isSubmitting ? "Saving..." : (fileNoToEdit ? (isApprovingUpdate ? "Approve &amp; Save" : "Save Changes") : "Create File")}</Button>)}<Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}><X className="mr-2 h-4 w-4" />Cancel</Button></div>
            </form>
            
            <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete this entry. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

            <Dialog open={!!dialogState.type} onOpenChange={(open) => !open && closeDialog()}>
                {dialogState.type === 'application' && <DialogContent className="max-w-4xl"><ApplicationDialogContent initialData={dialogState.data} onConfirm={handleDialogSave} onCancel={closeDialog} formOptions={formOptions} /></DialogContent>}
                {dialogState.type === 'remittance' && <DialogContent><RemittanceDialogContent initialData={dialogState.data} onConfirm={handleDialogSave} onCancel={closeDialog} /></DialogContent>}
                {dialogState.type === 'site' && <DialogContent className="max-w-4xl h-[90vh] flex flex-col"><SiteDialogContent initialData={dialogState.data} onConfirm={handleDialogSave} onCancel={closeDialog} supervisorList={supervisorList} isReadOnly={isReadOnly} isSupervisor={!!isSupervisor} allLsgConstituencyMaps={allLsgConstituencyMaps} /></DialogContent>}
                {dialogState.type === 'viewSite' && <SiteViewDialogContent siteData={dialogState.data} onCancel={closeDialog} />}
                {dialogState.type === 'payment' && <DialogContent className="max-w-4xl"><PaymentDialogContent initialData={dialogState.data} onConfirm={handleDialogSave} onCancel={closeDialog} /></DialogContent>}
            </Dialog>

        </FormProvider>
    );
}
