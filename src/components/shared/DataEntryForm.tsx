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

    return ( <div className="text-sm"> <span className="font-medium text-muted-foreground">{label}:</span> {displayValue} </div> );
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

    return (
        <Form {...form}>
        <form onSubmit={form.handleSubmit(onConfirm)}>
        <ScrollArea className="max-h-[70vh] p-1">
          <div className="space-y-4 py-4 pr-4">
            <FormField name="nameOfSite" control={control} render={({field}) => <FormItem><FormLabel>Name of Site</FormLabel><FormControl><Input {...field} readOnly={isReadOnly} /></FormControl><FormMessage/></FormItem>} />
             <div className="grid grid-cols-2 gap-4">
               <FormField name="localSelfGovt" control={control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Local Self Govt.</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        const normalized = value === '_clear_' ? '' : value;
                        field.onChange(normalized);
                        handleLsgChange(normalized);
                      }}
                      value={field.value ?? ""}
                      disabled={isReadOnly}
                    >
                      <FormControl><SelectTrigger><SelectValue placeholder="Select Local Self Govt."/></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="_clear_" onSelect={(e) => { e.preventDefault(); field.onChange(''); handleLsgChange(''); }}>-- Clear --</SelectItem>
                        {sortedLsgMaps.map(map => <SelectItem key={map.id} value={map.name}>{map.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage/>
                  </FormItem>
                )}/>
                <FormField name="constituency" control={control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Constituency</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isConstituencyDisabled}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select Constituency"/></SelectTrigger></FormControl>
                      <SelectContent>{constituencyOptionsForSite.map((o: string) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage/>
                  </FormItem>
                )}/>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <FormField name="latitude" control={control} render={({field}) => <FormItem><FormLabel>Latitude</FormLabel><FormControl><Input type="number" {...field} readOnly={isReadOnly || (isSupervisor && !!initialData.latitude)} /></FormControl><FormMessage/></FormItem>} />
               <FormField name="longitude" control={control} render={({field}) => <FormItem><FormLabel>Longitude</FormLabel><FormControl><Input type="number" {...field} readOnly={isReadOnly || (isSupervisor && !!initialData.longitude)} /></FormControl><FormMessage/></FormItem>} />
            </div>
             <div className="grid grid-cols-2 gap-4">
              <FormField name="purpose" control={control} render={({field}) => <FormItem><FormLabel>Purpose</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{sitePurposeOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>} />
              <FormField name="workStatus" control={control} render={({field}) => <FormItem><FormLabel>Work Status</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{(isSupervisor ? SUPERVISOR_WORK_STATUS_OPTIONS : siteWorkStatusOptions).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>} />
            </div>

            {isWellPurpose && (
              <div className="space-y-4 pt-4 mt-4 border-t">
                <h4 className="font-semibold text-primary">Drilling Details</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <FormField name="diameter" control={control} render={({field}) => <FormItem><FormLabel>Diameter</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{siteDiameterOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>} />
                  <FormField name="totalDepth" control={control} render={({field}) => <FormItem><FormLabel>Total Depth (m)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage/></FormItem>} />
                  <FormField name="yieldDischarge" control={control} render={({field}) => <FormItem><FormLabel>Yield (LPH)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>} />
                  <FormField name="waterLevel" control={control} render={({field}) => <FormItem><FormLabel>Water Level (m)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>} />
                </div>
              </div>
            )}
            {isMWSSSchemePurpose && (
               <div className="space-y-4 pt-4 mt-4 border-t">
                 <h4 className="font-semibold text-primary">Scheme Details</h4>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <FormField name="pumpDetails" control={control} render={({field}) => <FormItem><FormLabel>Pump Details</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>} />
                    <FormField name="waterTankCapacity" control={control} render={({field}) => <FormItem><FormLabel>Tank Capacity (L)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>} />
                    <FormField name="noOfTapConnections" control={control} render={({field}) => <FormItem><FormLabel># of Taps</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage/></FormItem>} />
                    <FormField name="noOfBeneficiary" control={control} render={({field}) => <FormItem><FormLabel># of Beneficiaries</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>} />
                 </div>
               </div>
            )}
            
            <Separator />

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <FormField name="supervisorUid" control={control} render={({field}) => <FormItem><FormLabel>Assigned Supervisor</FormLabel>
                <Select onValueChange={(uid) => { field.onChange(uid); const name = supervisorList.find(s=>s.uid === uid)?.name || null; setValue('supervisorName', name) }} value={field.value || ''} disabled={isReadOnly}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select Supervisor"/></SelectTrigger></FormControl>
                  <SelectContent>{supervisorList.map(s => <SelectItem key={s.uid} value={s.uid}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              <FormMessage/></FormItem>} />
              <FormField name="dateOfCompletion" control={control} render={({field}) => <FormItem><FormLabel>Date of Completion</FormLabel><FormControl><Input type="date" {...field} readOnly={isReadOnly} /></FormControl><FormMessage/></FormItem>} />
              <FormField name="totalExpenditure" control={control} render={({field}) => <FormItem><FormLabel>Expenditure (₹)</FormLabel><FormControl><Input type="number" {...field} readOnly={isReadOnly} /></FormControl><FormMessage/></FormItem>} />
            </div>
            <FormField name="workRemarks" control={control} render={({field}) => <FormItem><FormLabel>Work Remarks</FormLabel><FormControl><Textarea {...field} readOnly={isReadOnly} /></FormControl><FormMessage/></FormItem>} />

          </div>
           <DialogFooter><Button variant="outline" type="button" onClick={onCancel}>Cancel</Button><Button type="submit">Save</Button></DialogFooter>
        </ScrollArea>
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
            <div className="space-y-2"><Label>File Status</Label><Select onValueChange={v => handleChange('fileStatus', v)} value={data.fileStatus}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{fileStatusOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div>
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

  const onInvalid = (errors: FieldErrors<DataEntryFormData>) => { /* ... existing onInvalid ... */ };
  async function onValidSubmit(data: DataEntryFormData) { /* ... existing onValidSubmit ... */ };
  const handleLsgChange = useCallback((lsgName: string, siteIndex: number) => { /* ... existing handleLsgChange ... */ }, [formSetValue, allLsgConstituencyMaps, form]);
  useEffect(() => { /* ... existing useEffect ... */ }, [watchedSiteDetails, allLsgConstituencyMaps, formSetValue]);
  const sortedLsgMaps = useMemo(() => { return [...allLsgConstituencyMaps].sort((a, b) => a.name.localeCompare(b.name)); }, [allLsgConstituencyMaps]);

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
                <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle>Site Details</CardTitle>{!isReadOnly && (<Button type="button" variant="outline" size="sm" onClick={() => openDialog('site')}><PlusCircle className="mr-2 h-4 w-4" /> Add Site</Button>)}</CardHeader><CardContent className="space-y-2">{siteFields.map((field, index) => (<div key={field.id} className="flex items-center justify-between p-3 border rounded-lg bg-secondary/20"><div><p className="font-semibold">{watch(`siteDetails.${index}.nameOfSite`)}</p><p className="text-sm text-muted-foreground">{watch(`siteDetails.${index}.purpose`)} - {watch(`siteDetails.${index}.workStatus`)}</p></div>{!isReadOnly && (<div className="flex items-center gap-1 pl-4"><Button type="button" variant="ghost" size="icon" onClick={() => openDialog('site', index)}><Edit className="h-4 w-4"/></Button><Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteClick('site', index)}><Trash2 className="h-4 w-4"/></Button></div>)}</div>))}</CardContent></Card>
                <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle>Payment Details</CardTitle>{!isReadOnly && (<Button type="button" variant="outline" size="sm" onClick={() => openDialog('payment')}><PlusCircle className="mr-2 h-4 w-4" /> Add</Button>)}</CardHeader><CardContent className="space-y-2">{paymentFields.map((field, index) => (<div key={field.id} className="flex items-center justify-between p-3 border rounded-lg bg-secondary/20"><div className="grid grid-cols-2 gap-x-4 w-full"><DetailRow label={`Date #${index + 1}`} value={watch(`paymentDetails.${index}.dateOfPayment`)} /><DetailRow label="Total Paid" value={calculatePaymentEntryTotalGlobal(watch(`paymentDetails.${index}`))} /></div>{!isReadOnly && (<div className="flex items-center gap-1 pl-4"><Button type="button" variant="ghost" size="icon" onClick={() => openDialog('payment', index)}><Edit className="h-4 w-4"/></Button><Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteClick('payment', index)}><Trash2 className="h-4 w-4"/></Button></div>)}</div>))}</CardContent></Card>
                <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle>Final Status &amp; Summary</CardTitle>{!isReadOnly && (<Button type="button" variant="outline" size="sm" onClick={() => openDialog('finalStatus')}><Edit className="mr-2 h-4 w-4" /> Edit</Button>)}</CardHeader><CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4"><DetailRow label="File Status" value={watch('fileStatus')} /><DetailRow label="Remarks" value={watch('remarks')} /><DetailRow label="Total Remittance (₹)" value={(watch('remittanceDetails') ?? []).reduce((acc, curr) => acc + (Number(curr.amountRemitted) || 0), 0).toFixed(2)} /><DetailRow label="Total Payment (₹)" value={(watch('paymentDetails') ?? []).reduce((acc, payment) => acc + calculatePaymentEntryTotalGlobal(payment), 0).toFixed(2)} /><DetailRow label="Balance (₹)" value={((watch('remittanceDetails') ?? []).reduce((acc, curr) => acc + (Number(curr.amountRemitted) || 0), 0) - (watch('paymentDetails') ?? []).reduce((acc, payment) => acc + calculatePaymentEntryTotalGlobal(payment), 0)).toFixed(2)} /></CardContent></Card>
                <div className="flex space-x-4 pt-4">{!isViewer && (<Button type="submit" disabled={isSubmitting}>{isSubmitting ? (<Loader2 className="mr-2 h-4 w-4 animate-spin" />) : (<Save className="mr-2 h-4 w-4" />)}{isSubmitting ? "Saving..." : (fileNoToEdit ? (isApprovingUpdate ? "Approve &amp; Save" : "Save Changes") : "Create File")}</Button>)}<Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}><X className="mr-2 h-4 w-4" />Cancel</Button></div>
            </form>
            
            <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete this entry. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

            <Dialog open={!!dialogState.type} onOpenChange={(open) => !open && closeDialog()}>
              <DialogContent className="max-w-4xl">
                  <DialogHeader>
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
