
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
import { Loader2, Trash2, PlusCircle, X, Save, Clock, Edit } from "lucide-react";
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
    if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) return null;
    let displayValue = String(value);
    
    if (label.toLowerCase().includes('date') && value) {
        try {
            displayValue = format(new Date(value), "dd/MM/yyyy");
        } catch (e) { /* Keep original string if formatting fails */ }
    } else if (typeof value === 'number') {
        displayValue = value.toLocaleString('en-IN');
    }

    return (
        <div className="text-sm">
            <span className="font-medium text-muted-foreground">{label}:</span>
            {' '}
            {displayValue}
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

type SiteDialogSection = 'main' | 'survey' | 'drilling' | 'developing' | 'scheme' | 'work' | 'financials';


// Dialog Content Components
const ApplicationDialogContent = ({ initialData, onConfirm, onCancel, formOptions }: { initialData: any, onConfirm: (data: any) => void, onCancel: () => void, formOptions: typeof applicationTypeOptions }) => {
    const [data, setData] = useState(initialData);
    const handleChange = (key: string, value: any) => setData((prev: any) => ({ ...prev, [key]: value }));
    return (
        <div className="space-y-4 py-4">
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
            <DialogFooter><Button variant="outline" onClick={onCancel}>Cancel</Button><Button onClick={() => onConfirm(data)}>Save</Button></DialogFooter>
        </div>
    );
};

const RemittanceDialogContent = ({ initialData, onConfirm, onCancel }: { initialData: any, onConfirm: (data: any) => void, onCancel: () => void }) => {
    const [data, setData] = useState({ ...initialData, dateOfRemittance: formatDateForInput(initialData.dateOfRemittance) });
    const handleChange = (key: string, value: any) => setData((prev: any) => ({ ...prev, [key]: value }));
    return (
        <div className="space-y-4 py-4">
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
            <DialogFooter><Button variant="outline" onClick={onCancel}>Cancel</Button><Button onClick={() => onConfirm(data)}>Save</Button></DialogFooter>
        </div>
    );
};

const SiteDialogContent = ({ initialData, onConfirm, onCancel, supervisorList, isReadOnly, isSupervisor, allLsgConstituencyMaps }: { initialData: any, onConfirm: (data: any) => void, onCancel: () => void, supervisorList: any[], isReadOnly: boolean, isSupervisor: boolean, allLsgConstituencyMaps: any[] }) => {
    const form = useForm<SiteDetailFormData>({
      resolver: zodResolver(SiteDetailSchema),
      defaultValues: { ...initialData, dateOfCompletion: formatDateForInput(initialData.dateOfCompletion), arsSanctionedDate: formatDateForInput(initialData.arsSanctionedDate) },
    });
    
    const { control, setValue, trigger, watch } = form;
    const [activeSection, setActiveSection] = useState<SiteDialogSection>(isSupervisor ? 'work' : 'main');

    const watchedLsg = watch('localSelfGovt');
    const watchedPurpose = watch('purpose');

    const handleLsgChange = useCallback((lsgName: string) => {
        setValue('localSelfGovt', lsgName);
        const map = allLsgConstituencyMaps.find(m => m.name === lsgName);
        const constituencies = map?.constituencies || [];
        
        setValue('constituency', undefined);
        if (constituencies.length === 1) {
          setValue('constituency', constituencies[0] as Constituency);
        }
        trigger('constituency');
    }, [setValue, trigger, allLsgConstituencyMaps]);
    
    const sortedLsgMaps = useMemo(() => {
        return [...allLsgConstituencyMaps].sort((a, b) => a.name.localeCompare(b.name));
    }, [allLsgConstituencyMaps]);
    
    const constituencyOptionsForSite = useMemo(() => {
        if (!watchedLsg) return [...constituencyOptions].sort((a,b) => a.localeCompare(b));
        const map = allLsgConstituencyMaps.find(m => m.name === watchedLsg);
        return map?.constituencies.sort((a: string, b: string) => a.localeCompare(b)) || [];
    }, [watchedLsg, allLsgConstituencyMaps]);
    
    const isConstituencyDisabled = isReadOnly || constituencyOptionsForSite.length <= 1;

    const isWellPurpose = ['BWC', 'TWC', 'FPW'].includes(watchedPurpose as SitePurpose);
    const isDevPurpose = ['BW Dev', 'TW Dev', 'FPW Dev'].includes(watchedPurpose as SitePurpose);
    const isMWSSSchemePurpose = ['MWSS', 'MWSS Ext', 'Pumping Scheme', 'MWSS Pump Reno'].includes(watchedPurpose as SitePurpose);
    const isHPSPurpose = ['HPS', 'HPR'].includes(watchedPurpose as SitePurpose);

    const navButtons = [
        { id: 'main', label: 'Main Details', visible: !isSupervisor },
        { id: 'survey', label: 'Survey Details', visible: !isSupervisor },
        { id: 'drilling', label: 'Drilling Details', visible: isWellPurpose },
        { id: 'developing', label: 'Developing Details', visible: isDevPurpose },
        { id: 'scheme', label: 'Scheme Details', visible: isMWSSSchemePurpose || isHPSPurpose },
        { id: 'work', label: 'Work Implementation', visible: true },
        { id: 'financials', label: 'Financials', visible: !isSupervisor },
    ];

    return (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onConfirm)}>
            <div className="border-b mb-4 shrink-0">
                <ScrollArea className="w-full whitespace-nowrap">
                    <div className="flex items-center px-1">
                        {navButtons.filter(b => b.visible).map(button => (
                            <Button
                                key={button.id}
                                type="button"
                                variant="ghost"
                                onClick={() => setActiveSection(button.id as SiteDialogSection)}
                                className={cn(
                                    "flex-shrink-0 px-3 py-2.5 text-sm font-semibold rounded-none",
                                    activeSection === button.id
                                    ? "border-b-2 border-primary text-primary"
                                    : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {button.label}
                            </Button>
                        ))}
                    </div>
                </ScrollArea>
            </div>
            
            <div className="flex-1 min-h-0">
              <ScrollArea className="max-h-[60vh] h-full pr-4">
                <div className="space-y-4 py-4 pr-1">
                  
                  {!isSupervisor && activeSection === 'main' && (
                      <Card><CardHeader><CardTitle>Main Details</CardTitle></CardHeader><CardContent className="space-y-4">
                          <FormField name="nameOfSite" control={control} render={({field}) => <FormItem><FormLabel>Name of Site <span className="text-destructive">*</span></FormLabel><FormControl><Input {...field} readOnly={isReadOnly} /></FormControl><FormMessage/></FormItem>} />
                          <div className="grid grid-cols-2 gap-4">
                              <FormField name="localSelfGovt" control={control} render={({ field }) => ( <FormItem><FormLabel>Local Self Govt.</FormLabel><Select onValueChange={(value) => { const norm = value === '_clear_' ? '' : value; field.onChange(norm); handleLsgChange(norm); }} value={field.value ?? ""} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue placeholder="Select LSG"/></SelectTrigger></FormControl><SelectContent><SelectItem value="_clear_">-- Clear --</SelectItem>{sortedLsgMaps.map(map => <SelectItem key={map.id} value={map.name}>{map.name}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem> )}/>
                              <FormField name="constituency" control={control} render={({ field }) => ( <FormItem><FormLabel>Constituency</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isConstituencyDisabled}><FormControl><SelectTrigger><SelectValue placeholder="Select Constituency"/></SelectTrigger></FormControl><SelectContent>{constituencyOptionsForSite.map((o: string) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem> )}/>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                              <FormField name="latitude" control={control} render={({field}) => <FormItem><FormLabel>Latitude</FormLabel><FormControl><Input type="number" step="any" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isReadOnly} /></FormControl><FormMessage/></FormItem>} />
                              <FormField name="longitude" control={control} render={({field}) => <FormItem><FormLabel>Longitude</FormLabel><FormControl><Input type="number" step="any" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isReadOnly} /></FormControl><FormMessage/></FormItem>} />
                          </div>
                          <FormField name="purpose" control={control} render={({field}) => <FormItem><FormLabel>Purpose <span className="text-destructive">*</span></FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue placeholder="Select Purpose"/></SelectTrigger></FormControl><SelectContent>{sitePurposeOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>} />
                      </CardContent></Card>
                  )}
                  
                  {!isSupervisor && activeSection === 'survey' && (
                      <Card><CardHeader><CardTitle>Survey Details (Recommended)</CardTitle></CardHeader><CardContent className="space-y-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <FormField name="surveyRecommendedDiameter" control={control} render={({field})=> <FormItem><FormLabel>Diameter (mm)</FormLabel><FormControl><Input {...field} readOnly={isReadOnly}/></FormControl></FormItem>} />
                              <FormField name="surveyRecommendedTD" control={control} render={({field})=> <FormItem><FormLabel>TD (m)</FormLabel><FormControl><Input {...field} readOnly={isReadOnly}/></FormControl></FormItem>} />
                              {isWellPurpose && <FormField name="surveyRecommendedOB" control={control} render={({field})=> <FormItem><FormLabel>OB (m)</FormLabel><FormControl><Input {...field} readOnly={isReadOnly}/></FormControl></FormItem>} />}
                              {isWellPurpose && <FormField name="surveyRecommendedCasingPipe" control={control} render={({field})=> <FormItem><FormLabel>Casing Pipe (m)</FormLabel><FormControl><Input {...field} readOnly={isReadOnly}/></FormControl></FormItem>} />}
                              {watchedPurpose === 'TWC' && <FormField name="surveyRecommendedPlainPipe" control={control} render={({field})=> <FormItem><FormLabel>Plain Pipe (m)</FormLabel><FormControl><Input {...field} readOnly={isReadOnly}/></FormControl></FormItem>} />}
                              {watchedPurpose === 'TWC' && <FormField name="surveyRecommendedSlottedPipe" control={control} render={({field})=> <FormItem><FormLabel>Slotted Pipe (m)</FormLabel><FormControl><Input {...field} readOnly={isReadOnly}/></FormControl></FormItem>} />}
                              {watchedPurpose === 'TWC' && <FormField name="surveyRecommendedMsCasingPipe" control={control} render={({field})=> <FormItem><FormLabel>MS Casing Pipe (m)</FormLabel><FormControl><Input {...field} readOnly={isReadOnly}/></FormControl></FormItem>} />}
                          </div>
                          <FormField name="surveyLocation" control={control} render={({field})=> <FormItem><FormLabel>Location</FormLabel><FormControl><Textarea {...field} readOnly={isReadOnly}/></FormControl></FormItem>} />
                          <FormField name="surveyRemarks" control={control} render={({field})=> <FormItem><FormLabel>Remarks</FormLabel><FormControl><Textarea {...field} readOnly={isReadOnly}/></FormControl></FormItem>} />
                      </CardContent></Card>
                  )}

                  {activeSection === 'drilling' && isWellPurpose && (
                      <Card><CardHeader><CardTitle>Drilling Details (Actuals)</CardTitle></CardHeader><CardContent className="space-y-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <FormField name="diameter" control={control} render={({field}) => <FormItem><FormLabel>Actual Diameter</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue placeholder="Select Diameter"/></SelectTrigger></FormControl><SelectContent>{siteDiameterOptions.map(o=><SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>}/>
                              {watchedPurpose === 'TWC' && <FormField name="pilotDrillingDepth" control={control} render={({field})=> <FormItem><FormLabel>Pilot Drilling (m)</FormLabel><FormControl><Input {...field} readOnly={isReadOnly}/></FormControl></FormItem>} />}
                              <FormField name="totalDepth" control={control} render={({field})=> <FormItem><FormLabel>Actual TD (m)</FormLabel><FormControl><Input type="number" {...field} onChange={e=>field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isReadOnly}/></FormControl></FormItem>} />
                              <FormField name="casingPipeUsed" control={control} render={({field})=> <FormItem><FormLabel>Casing Pipe (m)</FormLabel><FormControl><Input {...field} readOnly={isReadOnly}/></FormControl></FormItem>} />
                              {watchedPurpose === 'BWC' && <FormField name="outerCasingPipe" control={control} render={({field})=> <FormItem><FormLabel>Outer Casing (m)</FormLabel><FormControl><Input {...field} readOnly={isReadOnly}/></FormControl></FormItem>} />}
                              {watchedPurpose === 'BWC' && <FormField name="innerCasingPipe" control={control} render={({field})=> <FormItem><FormLabel>Inner Casing (m)</FormLabel><FormControl><Input {...field} readOnly={isReadOnly}/></FormControl></FormItem>} />}
                              {watchedPurpose === 'TWC' && <FormField name="surveyPlainPipe" control={control} render={({field})=> <FormItem><FormLabel>Plain Pipe (m)</FormLabel><FormControl><Input {...field} readOnly={isReadOnly}/></FormControl></FormItem>} />}
                              {watchedPurpose === 'TWC' && <FormField name="surveySlottedPipe" control={control} render={({field})=> <FormItem><FormLabel>Slotted Pipe (m)</FormLabel><FormControl><Input {...field} readOnly={isReadOnly}/></FormControl></FormItem>} />}
                              {watchedPurpose === 'TWC' && <FormField name="outerCasingPipe" control={control} render={({field})=> <FormItem><FormLabel>MS Casing Pipe (m)</FormLabel><FormControl><Input {...field} readOnly={isReadOnly}/></FormControl></FormItem>} />}
                              <FormField name="yieldDischarge" control={control} render={({field})=> <FormItem><FormLabel>Yield (LPH)</FormLabel><FormControl><Input {...field} readOnly={isReadOnly}/></FormControl></FormItem>} />
                              <FormField name="waterLevel" control={control} render={({field})=> <FormItem><FormLabel>Static Water (m)</FormLabel><FormControl><Input {...field} readOnly={isReadOnly}/></FormControl></FormItem>} />
                              <FormField name="typeOfRig" control={control} render={({field})=> <FormItem><FormLabel>Type of Rig</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue placeholder="Select Rig Type"/></SelectTrigger></FormControl><SelectContent>{siteTypeOfRigOptions.map(o=><SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></FormItem>} />
                          </div>
                          <FormField name="zoneDetails" control={control} render={({field})=> <FormItem><FormLabel>Zone Details (m)</FormLabel><FormControl><Textarea {...field} readOnly={isReadOnly}/></FormControl></FormItem>} />
                          <FormField name="drillingRemarks" control={control} render={({field})=> <FormItem><FormLabel>Drilling Remarks</FormLabel><FormControl><Textarea {...field} readOnly={isReadOnly}/></FormControl></FormItem>} />
                      </CardContent></Card>
                  )}

                  {activeSection === 'developing' && isDevPurpose && (
                      <Card><CardHeader><CardTitle>Developing Details</CardTitle></CardHeader><CardContent className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <FormField name="diameter" control={control} render={({field})=> <FormItem><FormLabel>Diameter (mm)</FormLabel><FormControl><Input {...field} readOnly={isReadOnly}/></FormControl></FormItem>} />
                          <FormField name="totalDepth" control={control} render={({field})=> <FormItem><FormLabel>TD (m)</FormLabel><FormControl><Input {...field} readOnly={isReadOnly}/></FormControl></FormItem>} />
                          <FormField name="yieldDischarge" control={control} render={({field})=> <FormItem><FormLabel>Discharge (LPH)</FormLabel><FormControl><Input {...field} readOnly={isReadOnly}/></FormControl></FormItem>} />
                          <FormField name="waterLevel" control={control} render={({field})=> <FormItem><FormLabel>Water Level (m)</FormLabel><FormControl><Input {...field} readOnly={isReadOnly}/></FormControl></FormItem>} />
                      </div>
                      </CardContent></Card>
                  )}
                  
                  {activeSection === 'scheme' && (isMWSSSchemePurpose || isHPSPurpose) && (
                      <Card><CardHeader><CardTitle>Scheme Details</CardTitle></CardHeader><CardContent className="space-y-4">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                              {isMWSSSchemePurpose && <>
                                  <FormField name="yieldDischarge" control={control} render={({field})=> <FormItem><FormLabel>Well Discharge (LPH)</FormLabel><FormControl><Input {...field} readOnly={isReadOnly}/></FormControl></FormItem>} />
                                  <FormField name="pumpDetails" control={control} render={({field})=> <FormItem><FormLabel>Pump Details</FormLabel><FormControl><Input {...field} readOnly={isReadOnly}/></FormControl></FormItem>} />
                                  <FormField name="pumpingLineLength" control={control} render={({field})=> <FormItem><FormLabel>Pumping Line (m)</FormLabel><FormControl><Input {...field} readOnly={isReadOnly}/></FormControl></FormItem>} />
                                  <FormField name="deliveryLineLength" control={control} render={({field})=> <FormItem><FormLabel>Delivery Line (m)</FormLabel><FormControl><Input {...field} readOnly={isReadOnly}/></FormControl></FormItem>} />
                                  <FormField name="waterTankCapacity" control={control} render={({field})=> <FormItem><FormLabel>Tank Capacity (L)</FormLabel><FormControl><Input {...field} readOnly={isReadOnly}/></FormControl></FormItem>} />
                                  <FormField name="noOfTapConnections" control={control} render={({field})=> <FormItem><FormLabel># Taps</FormLabel><FormControl><Input type="number" {...field} onChange={e=>field.onChange(e.target.value==='' ? undefined : +e.target.value)} readOnly={isReadOnly}/></FormControl></FormItem>} />
                              </>}
                              {isHPSPurpose && <>
                                  <FormField name="totalDepth" control={control} render={({field})=> <FormItem><FormLabel>Depth Erected (m)</FormLabel><FormControl><Input {...field} readOnly={isReadOnly}/></FormControl></FormItem>} />
                                  <FormField name="waterLevel" control={control} render={({field})=> <FormItem><FormLabel>Water Level (m)</FormLabel><FormControl><Input {...field} readOnly={isReadOnly}/></FormControl></FormItem>} />
                              </>}
                              <FormField name="noOfBeneficiary" control={control} render={({field})=> <FormItem><FormLabel># Beneficiaries</FormLabel><FormControl><Input {...field} readOnly={isReadOnly}/></FormControl></FormItem>} />
                          </div>
                      </CardContent></Card>
                  )}

                  {activeSection === 'work' && (
                      <Card><CardHeader><CardTitle>Work Implementation</CardTitle></CardHeader><CardContent className="space-y-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <FormField name="siteConditions" control={control} render={({ field }) => <FormItem><FormLabel>Site Conditions</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly && !isSupervisor}><FormControl><SelectTrigger><SelectValue placeholder="Select Condition" /></SelectTrigger></FormControl><SelectContent>{siteConditionsOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></FormItem>} />
                              <FormField name="accessibleRig" control={control} render={({ field }) => <FormItem><FormLabel>Rig Accessibility</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly && !isSupervisor}><FormControl><SelectTrigger><SelectValue placeholder="Select Accessibility" /></SelectTrigger></FormControl><SelectContent>{rigAccessibilityOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></FormItem>} />
                              {!isSupervisor && <FormField name="tenderNo" control={control} render={({ field }) => <FormItem><FormLabel>Tender No.</FormLabel><FormControl><Input {...field} readOnly={isReadOnly} /></FormControl></FormItem>} />}
                              {!isSupervisor && <FormField name="contractorName" control={control} render={({ field }) => <FormItem><FormLabel>Contractor</FormLabel><FormControl><Input {...field} readOnly={isReadOnly} /></FormControl></FormItem>} />}
                              {!isSupervisor && <FormField name="supervisorUid" control={form.control} render={({ field }) => (<FormItem><FormLabel>Supervisor</FormLabel><Select onValueChange={(uid) => { field.onChange(uid); const name = supervisorList.find(s => s.uid === uid)?.name || null; setValue('supervisorName', name) }} value={field.value || ''} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue placeholder="Select Supervisor" /></SelectTrigger></FormControl><SelectContent>{supervisorList.map(s => <SelectItem key={s.uid} value={s.uid}>{s.name}</SelectItem>)}</SelectContent></Select></FormItem>)} />}
                              <FormField name="workStatus" control={control} render={({ field }) => <FormItem><FormLabel>Work Status <span className="text-destructive">*</span></FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly && !isSupervisor}><FormControl><SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger></FormControl><SelectContent>{(isSupervisor ? SUPERVISOR_WORK_STATUS_OPTIONS : siteWorkStatusOptions).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>} />
                              <FormField name="dateOfCompletion" control={control} render={({ field }) => <FormItem><FormLabel>Completion Date</FormLabel><FormControl><Input type="date" {...field} readOnly={isReadOnly && !isSupervisor} /></FormControl><FormMessage/></FormItem>} />
                          </div>
                          <FormField name="workRemarks" control={control} render={({ field }) => <FormItem><FormLabel>Work Remarks</FormLabel><FormControl><Textarea {...field} readOnly={isReadOnly && !isSupervisor} /></FormControl></FormItem>} />
                      </CardContent></Card>
                  )}

                  {!isSupervisor && activeSection === 'financials' && (
                    <Card><CardHeader><CardTitle>Financials</CardTitle></CardHeader><CardContent className="space-y-4">
                       <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <FormField name="tsAmount" control={control} render={({ field }) => <FormItem><FormLabel>TS Amount (₹)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isReadOnly} /></FormControl></FormItem>} />
                            <FormField name="additionalAS" control={control} render={({ field }) => <FormItem><FormLabel>Addl. AS</FormLabel><Select onValueChange={field.onChange} value={field.value ?? 'No'} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Yes">Yes</SelectItem><SelectItem value="No">No</SelectItem></SelectContent></Select></FormItem>} />
                             <FormField name="totalExpenditure" control={control} render={({ field }) => <FormItem><FormLabel>Expenditure (₹)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isReadOnly} /></FormControl></FormItem>} />
                        </div>
                    </CardContent></Card>
                  )}

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
        <ScrollArea className="max-h-[70vh] p-1">
          <div className="space-y-4 py-4 pr-4">
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
             <DialogFooter><Button variant="outline" onClick={onCancel}>Cancel</Button><Button onClick={() => onConfirm(data)}>Save</Button></DialogFooter>
        </ScrollArea>
    );
};

const FinalStatusDialogContent = ({ initialData, onConfirm, onCancel }: { initialData: any, onConfirm: (data: any) => void, onCancel: () => void }) => {
    const [data, setData] = useState(initialData);
    const handleChange = (key: string, value: any) => setData((prev: any) => ({ ...prev, [key]: value }));
    return (
        <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>File Status</Label><Select onValueChange={v => handleChange('fileStatus', v)} value={data.fileStatus}><SelectTrigger><SelectValue placeholder="Select Status"/></SelectTrigger><SelectContent>{fileStatusOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Final Remarks</Label><Textarea value={data.remarks} onChange={e => handleChange('remarks', e.target.value)} /></div>
            <DialogFooter><Button variant="outline" onClick={onCancel}>Cancel</Button><Button onClick={() => onConfirm(data)}>Save</Button></DialogFooter>
        </div>
    );
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

  const form = useForm<DataEntryFormData>({ resolver: zodResolver(DataEntrySchema), defaultValues: initialData });

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
    else if (type === 'finalStatus') data = { fileStatus: form.getValues('fileStatus'), remarks: form.getValues('remarks') };
    else if (index !== undefined) {
      if (type === 'remittance') data = form.getValues(`remittanceDetails.${index}`);
      else if (type === 'site') data = form.getValues(`siteDetails.${index}`);
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
    else if (type === 'finalStatus') { form.setValue('fileStatus', formData.fileStatus); form.setValue('remarks', formData.remarks); }
    closeDialog();
  };

  const handleDeleteClick = (type: string, index: number) => setItemToDelete({ type, index });
  const confirmDelete = () => { if (itemToDelete) { const { type, index } = itemToDelete; if (type === 'remittance') removeRemittance(index); else if (type === 'site') removeSite(index); else if (type === 'payment') removePayment(index); setItemToDelete(null); toast({ title: 'Entry Removed' }); } };
  
    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onValidSubmit, onInvalid)} className="space-y-4">
                <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle>Application Details</CardTitle>{!isReadOnly && (<Button type="button" variant="outline" size="sm" onClick={() => openDialog('application')}><Edit className="mr-2 h-4 w-4" /> Edit</Button>)}</CardHeader><CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"><DetailRow label="File No" value={watch('fileNo')} /><DetailRow label="Applicant" value={watch('applicantName')} /><DetailRow label="Phone No" value={watch('phoneNo')} /><DetailRow label="Secondary Mobile" value={watch('secondaryMobileNo')} /><DetailRow label="Application Type" value={applicationTypeDisplayMap[watch('applicationType') as ApplicationType]} /></CardContent></Card>
                <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle>Remittance Details</CardTitle>{!isReadOnly && (<Button type="button" variant="outline" size="sm" onClick={() => openDialog('remittance')}><PlusCircle className="mr-2 h-4 w-4" /> Add</Button>)}</CardHeader><CardContent className="space-y-2">{remittanceFields.map((field, index) => (<div key={field.id} className="flex items-center justify-between p-3 border rounded-lg bg-secondary/20"><div><div className="grid grid-cols-1 md:grid-cols-3 gap-x-4"><DetailRow label={`Date #${index + 1}`} value={watch(`remittanceDetails.${index}.dateOfRemittance`)} /><DetailRow label="Amount" value={watch(`remittanceDetails.${index}.amountRemitted`)} /><DetailRow label="Account" value={watch(`remittanceDetails.${index}.remittedAccount`)} /></div><DetailRow label="Remarks" value={watch(`remittanceDetails.${index}.remittanceRemarks`)} /></div>{!isReadOnly && (<div className="flex items-center gap-1 pl-4"><Button type="button" variant="ghost" size="icon" onClick={() => openDialog('remittance', index)}><Edit className="h-4 w-4"/></Button><Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteClick('remittance', index)}><Trash2 className="h-4 w-4"/></Button></div>)}</div>))}</CardContent></Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Site Details</CardTitle>
                        {!isReadOnly && isEditor && (<Button type="button" variant="outline" size="sm" onClick={() => openDialog('site')}><PlusCircle className="mr-2 h-4 w-4" /> Add Site</Button>)}
                    </CardHeader>
                    <CardContent>
                        <Accordion type="multiple" className="w-full space-y-2">
                            {siteFields.map((field, index) => {
                                const siteData = watch(`siteDetails.${index}`);
                                const purpose = siteData.purpose as SitePurpose;
                                const isWellPurpose = ['BWC', 'TWC', 'FPW'].includes(purpose);
                                const isDevPurpose = ['BW Dev', 'TW Dev', 'FPW Dev'].includes(purpose);
                                const isMWSSSchemePurpose = ['MWSS', 'MWSS Ext', 'Pumping Scheme', 'MWSS Pump Reno'].includes(purpose);
                                const isHPSPurpose = ['HPS', 'HPR'].includes(purpose);
                                const isSiteAssignedToCurrentUser = isSupervisor && siteData.supervisorUid === user?.uid;
                                const isSiteEditableForSupervisor = isSiteAssignedToCurrentUser && !FINAL_WORK_STATUSES.includes(siteData.workStatus as SiteWorkStatus);


                                return (
                                    <AccordionItem key={field.id} value={`site-${index}`} className="border bg-background rounded-lg">
                                        <AccordionTrigger className="p-4">
                                            <div className="flex justify-between items-center w-full">
                                                <div>
                                                    <p className="font-semibold">{siteData.nameOfSite}</p>
                                                    <p className="text-sm text-muted-foreground">{siteData.purpose} - {siteData.workStatus}</p>
                                                </div>
                                                <div className="flex items-center gap-1 pr-2">
                                                    {isEditor && !isReadOnly && (
                                                      <>
                                                        <Button type="button" variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openDialog('site', index); }}><Edit className="h-4 w-4" /></Button>
                                                        <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={(e) => { e.stopPropagation(); handleDeleteClick('site', index); }}><Trash2 className="h-4 w-4" /></Button>
                                                      </>
                                                    )}
                                                     {isSiteEditableForSupervisor && (
                                                        <Button type="button" variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openDialog('site', index); }}>
                                                            <Edit className="mr-2 h-4 w-4" /> Edit Site
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="p-6 pt-0">
                                            <div className="border-t pt-4 space-y-4">
                                                <div className="space-y-1">
                                                    <h4 className="font-semibold">Main Details</h4>
                                                    <DetailRow label="Purpose" value={siteData.purpose} />
                                                    <DetailRow label="Latitude" value={siteData.latitude} />
                                                    <DetailRow label="Longitude" value={siteData.longitude} />
                                                </div>
                                                {!isSupervisor && (
                                                    <div className="space-y-1">
                                                        <h4 className="font-semibold pt-2 border-t">Survey Details (Recommended)</h4>
                                                        <DetailRow label="Recommended Diameter (mm)" value={siteData.surveyRecommendedDiameter} />
                                                        <DetailRow label="Recommended TD (m)" value={siteData.surveyRecommendedTD} />
                                                        {isWellPurpose && <DetailRow label="Recommended OB (m)" value={siteData.surveyRecommendedOB} />}
                                                    </div>
                                                )}
                                                {isWellPurpose && (
                                                    <div className="space-y-1">
                                                        <h4 className="font-semibold pt-2 border-t">Drilling Details (Actuals)</h4>
                                                        <DetailRow label="Actual Diameter" value={siteData.diameter} />
                                                        <DetailRow label="Actual TD (m)" value={siteData.totalDepth} />
                                                        <DetailRow label="Yield (LPH)" value={siteData.yieldDischarge} />
                                                    </div>
                                                )}
                                                 {isDevPurpose && (
                                                    <div className="space-y-1">
                                                        <h4 className="font-semibold pt-2 border-t">Developing Details</h4>
                                                        <DetailRow label="Diameter (mm)" value={siteData.diameter} />
                                                        <DetailRow label="TD (m)" value={siteData.totalDepth} />
                                                        <DetailRow label="Discharge (LPH)" value={siteData.yieldDischarge} />
                                                    </div>
                                                )}
                                                {(isMWSSSchemePurpose || isHPSPurpose) && (
                                                    <div className="space-y-1">
                                                        <h4 className="font-semibold pt-2 border-t">Scheme Details</h4>
                                                        <DetailRow label="Well Discharge (LPH)" value={siteData.yieldDischarge} />
                                                        <DetailRow label="Pump Details" value={siteData.pumpDetails} />
                                                        <DetailRow label="# Beneficiaries" value={siteData.noOfBeneficiary} />
                                                    </div>
                                                )}
                                                <div className="space-y-1">
                                                    <h4 className="font-semibold pt-2 border-t">Work & Financials</h4>
                                                    <DetailRow label="Work Status" value={siteData.workStatus} />
                                                    <DetailRow label="Contractor" value={siteData.contractorName} />
                                                    <DetailRow label="Supervisor" value={siteData.supervisorName} />
                                                    <DetailRow label="Total Expenditure (₹)" value={siteData.totalExpenditure} />
                                                </div>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                )
                            })}
                        </Accordion>
                    </CardContent>
                </Card>
                <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle>Payment Details</CardTitle>{!isReadOnly && (<Button type="button" variant="outline" size="sm" onClick={() => openDialog('payment')}><PlusCircle className="mr-2 h-4 w-4" /> Add</Button>)}</CardHeader><CardContent className="space-y-2">{paymentFields.map((field, index) => (<div key={field.id} className="flex items-center justify-between p-3 border rounded-lg bg-secondary/20"><div className="grid grid-cols-2 gap-x-4 w-full"><DetailRow label={`Date #${index + 1}`} value={watch(`paymentDetails.${index}.dateOfPayment`)} /><DetailRow label="Total Paid" value={calculatePaymentEntryTotalGlobal(watch(`paymentDetails.${index}`))} /></div>{!isReadOnly && (<div className="flex items-center gap-1 pl-4"><Button type="button" variant="ghost" size="icon" onClick={() => openDialog('payment', index)}><Edit className="h-4 w-4"/></Button><Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteClick('payment', index)}><Trash2 className="h-4 w-4"/></Button></div>)}</div>))}</CardContent></Card>
                <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle>Final Status &amp; Summary</CardTitle>{!isReadOnly && (<Button type="button" variant="outline" size="sm" onClick={() => openDialog('finalStatus')}><Edit className="mr-2 h-4 w-4" /> Edit</Button>)}</CardHeader><CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4"><DetailRow label="File Status" value={watch('fileStatus')} /><DetailRow label="Remarks" value={watch('remarks')} /><DetailRow label="Total Remittance (₹)" value={(watch('remittanceDetails') ?? []).reduce((acc, curr) => acc + (Number(curr.amountRemitted) || 0), 0).toFixed(2)} /><DetailRow label="Total Payment (₹)" value={(watch('paymentDetails') ?? []).reduce((acc, payment) => acc + calculatePaymentEntryTotalGlobal(payment), 0).toFixed(2)} /><DetailRow label="Balance (₹)" value={((watch('remittanceDetails') ?? []).reduce((acc, curr) => acc + (Number(curr.amountRemitted) || 0), 0) - (watch('paymentDetails') ?? []).reduce((acc, payment) => acc + calculatePaymentEntryTotalGlobal(payment), 0)).toFixed(2)} /></CardContent></Card>
                <div className="flex space-x-4 pt-4">{!isViewer && (<Button type="submit" disabled={isSubmitting}>{isSubmitting ? (<Loader2 className="mr-2 h-4 w-4 animate-spin" />) : (<Save className="mr-2 h-4 w-4" />)}{isSubmitting ? "Saving..." : (fileNoToEdit ? (isApprovingUpdate ? "Approve &amp; Save" : "Save Changes") : "Create File")}</Button>)}<Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}><X className="mr-2 h-4 w-4" />Cancel</Button></div>
            </form>
            
            <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete this entry. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

            <Dialog open={!!dialogState.type} onOpenChange={(open) => !open && closeDialog()}>
              <DialogContent className="max-w-4xl flex flex-col h-[90vh]">
                  <DialogHeader className="p-6 pb-4 border-b shrink-0">
                      <DialogTitle>
                        {dialogState.type === 'application' && "Application Details"}
                        {dialogState.type === 'remittance' && (dialogState.index !== undefined ? "Edit Remittance" : "Add Remittance")}
                        {dialogState.type === 'site' && (dialogState.index !== undefined ? "Edit Site" : "Add Site")}
                        {dialogState.type === 'payment' && (dialogState.index !== undefined ? "Edit Payment" : "Add Payment")}
                        {dialogState.type === 'finalStatus' && "Final Status &amp; Summary"}
                      </DialogTitle>
                  </DialogHeader>
                    {dialogState.type === 'application' && <ApplicationDialogContent initialData={dialogState.data} onConfirm={handleDialogSave} onCancel={closeDialog} formOptions={formOptions} />}
                    {dialogState.type === 'remittance' && <RemittanceDialogContent initialData={dialogState.data} onConfirm={handleDialogSave} onCancel={closeDialog} />}
                    {dialogState.type === 'site' && <SiteDialogContent initialData={dialogState.data} onConfirm={handleDialogSave} onCancel={closeDialog} supervisorList={supervisorList} isReadOnly={isReadOnly} isSupervisor={!!isSupervisor} allLsgConstituencyMaps={allLsgConstituencyMaps} />}
                    {dialogState.type === 'payment' && <PaymentDialogContent initialData={dialogState.data} onConfirm={handleDialogSave} onCancel={closeDialog} />}
                    {dialogState.type === 'finalStatus' && <FinalStatusDialogContent initialData={dialogState.data} onConfirm={handleDialogSave} onCancel={closeDialog} />}
              </DialogContent>
            </Dialog>

        </FormProvider>
    );
}
