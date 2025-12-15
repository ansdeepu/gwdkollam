// src/app/dashboard/data-entry/site/page.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, FormProvider } from "react-hook-form";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Loader2, X, Save, Info, ArrowLeft } from "lucide-react";
import {
  SiteDetailSchema,
  type SiteDetailFormData,
  siteWorkStatusOptions,
  sitePurposeOptions,
  type SitePurpose,
  siteDiameterOptions,
  siteTypeOfRigOptions,
  siteConditionsOptions,
  type UserRole,
  type SiteWorkStatus,
  constituencyOptions,
  type Constituency,
} from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useFileEntries } from "@/hooks/useFileEntries";
import type { StaffMember } from "@/lib/schemas";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDataStore } from "@/hooks/use-data-store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { usePageHeader } from "@/hooks/usePageHeader";

const createDefaultSiteDetail = (): SiteDetailFormData => ({ nameOfSite: "", localSelfGovt: "", constituency: undefined, latitude: undefined, longitude: undefined, purpose: undefined, estimateAmount: undefined, remittedAmount: undefined, siteConditions: undefined, tsAmount: undefined, tenderNo: "", diameter: undefined, totalDepth: undefined, casingPipeUsed: "", outerCasingPipe: "", innerCasingPipe: "", yieldDischarge: "", zoneDetails: "", waterLevel: "", drillingRemarks: "", developingRemarks: "", pumpDetails: "", waterTankCapacity: "", noOfTapConnections: undefined, noOfBeneficiary: "", dateOfCompletion: undefined, typeOfRig: undefined, contractorName: "", supervisorUid: undefined, supervisorName: undefined, supervisorDesignation: undefined, totalExpenditure: undefined, workStatus: undefined, workRemarks: "", surveyOB: "", surveyLocation: "", surveyPlainPipe: "", surveySlottedPipe: "", surveyRemarks: "", surveyRecommendedDiameter: "", surveyRecommendedTD: "", surveyRecommendedOB: "", surveyRecommendedCasingPipe: "", surveyRecommendedPlainPipe: "", surveyRecommendedSlottedPipe: "", surveyRecommendedMsCasingPipe: "", arsTypeOfScheme: undefined, arsPanchayath: undefined, arsBlock: undefined, arsAsTsDetails: undefined, arsSanctionedDate: undefined, arsTenderedAmount: undefined, arsAwardedAmount: undefined, arsNumberOfStructures: undefined, arsStorageCapacity: undefined, arsNumberOfFillings: undefined, isArsImport: false, pilotDrillingDepth: "", pumpingLineLength: "", deliveryLineLength: "", additionalAS: null });

const PURPOSES_REQUIRING_DIAMETER: SitePurpose[] = ["BWC", "TWC", "FPW", "BW Dev", "TW Dev", "FPW Dev"];
const PURPOSES_REQUIRING_RIG_ACCESSIBILITY: SitePurpose[] = ["BWC", "TWC", "FPW", "BW Dev", "TW Dev", "FPW Dev"];
const FINAL_WORK_STATUSES: SiteWorkStatus[] = ['Work Failed', 'Work Completed'];
const SUPERVISOR_WORK_STATUS_OPTIONS: SiteWorkStatus[] = ["Work Order Issued", "Work Initiated", "Work in Progress", "Work Failed", "Work Completed"];
const SITE_DIALOG_WORK_STATUS_OPTIONS = siteWorkStatusOptions.filter(
    (status) => !["Bill Prepared", "Payment Completed", "Utilization Certificate Issued"].includes(status)
);

const formatDateForInput = (date: Date | string | null | undefined): string => {
    if (!date) return "";
    try { return format(new Date(date), 'yyyy-MM-dd'); } catch { return ""; }
};


export default function SiteEntryPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { fetchEntryForEditing, updateFileEntry, getFileEntry } = useFileEntries();
    const { user } = useAuth();
    const { allLsgConstituencyMaps, allStaffMembers } = useDataStore();
    const { setHeader } = usePageHeader();
    const { toast } = useToast();

    const fileId = searchParams.get('id');
    const siteIndex = searchParams.get('siteIndex');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [initialData, setInitialData] = useState<SiteDetailFormData | null>(null);
    const [fileNo, setFileNo] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const isEditor = user?.role === 'editor';
    const isSupervisor = user?.role === 'supervisor';
    const isReadOnly = user?.role === 'viewer';

    useEffect(() => {
        const loadSiteData = async () => {
            if (!fileId) {
                // This is a new site for a new file
                setHeader('Add New Site', 'Fill in the details for the new site.');
                setInitialData(createDefaultSiteDetail());
                setIsLoading(false);
                return;
            }

            const fileEntry = await fetchEntryForEditing(fileId);
            if (!fileEntry) {
                toast({ title: "Error", description: "File not found.", variant: "destructive" });
                router.back();
                return;
            }

            setFileNo(fileEntry.fileNo);
            const index = siteIndex ? parseInt(siteIndex, 10) : -1;
            
            if (index >= 0 && fileEntry.siteDetails && fileEntry.siteDetails[index]) {
                setHeader(`Edit Site: ${fileEntry.siteDetails[index].nameOfSite}`, `Editing site details for File No: ${fileEntry.fileNo}`);
                setInitialData(fileEntry.siteDetails[index]);
            } else {
                setHeader('Add New Site', `Adding a new site to File No: ${fileEntry.fileNo}`);
                setInitialData(createDefaultSiteDetail());
            }
            setIsLoading(false);
        };
        loadSiteData();
    }, [fileId, siteIndex, fetchEntryForEditing, setHeader, router, toast]);
    
    const form = useForm<SiteDetailFormData>({
      resolver: zodResolver(SiteDetailSchema),
    });

    useEffect(() => {
      if (initialData) {
        form.reset({
          ...initialData,
          dateOfCompletion: formatDateForInput(initialData.dateOfCompletion),
          arsSanctionedDate: formatDateForInput(initialData.arsSanctionedDate),
        });
      }
    }, [initialData, form]);
    
    const { control, setValue, trigger, watch, handleSubmit, getValues } = form;

    const handleFormSubmit = async (data: SiteDetailFormData) => {
        setIsSubmitting(true);
        if (!fileId) {
             toast({ title: "Error", description: "Cannot save site without a parent file. Please create the main file first.", variant: "destructive" });
             setIsSubmitting(false);
             return;
        }

        try {
            const fileEntry = await fetchEntryForEditing(fileId);
            if (!fileEntry) throw new Error("Parent file not found.");

            const updatedSites = [...(fileEntry.siteDetails || [])];
            const index = siteIndex ? parseInt(siteIndex, 10) : -1;

            if (index >= 0 && index < updatedSites.length) {
                updatedSites[index] = data; // Update existing
            } else {
                updatedSites.push(data); // Add new
            }
            
            await updateFileEntry(fileId, { ...fileEntry, siteDetails: updatedSites });
            
            toast({ title: `Site ${index >= 0 ? 'Updated' : 'Added'}`, description: `Site "${data.nameOfSite}" has been saved.` });
            router.back();

        } catch (error: any) {
            console.error("Error saving site:", error);
            toast({ title: "Save Failed", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const watchedPurpose = watch('purpose');
    const watchedWorkStatus = watch('workStatus');
    const isCompletionDateRequired = watchedWorkStatus && FINAL_WORK_STATUSES.includes(watchedWorkStatus as SiteWorkStatus);
    
    const isDrillingPurpose = useMemo(() => ['BWC', 'TWC', 'FPW'].includes(watchedPurpose as SitePurpose), [watchedPurpose]);
    const isDevelopingPurpose = useMemo(() => ['BW Dev', 'TW Dev', 'FPW Dev'].includes(watchedPurpose as SitePurpose), [watchedPurpose]);
    const isSchemePurpose = !isDrillingPurpose && !isDevelopingPurpose && watchedPurpose;
    const isMWSSSchemePurpose = ['MWSS', 'MWSS Ext', 'Pumping Scheme', 'MWSS Pump Reno'].includes(watchedPurpose as SitePurpose);
    const isHPSPurpose = ['HPS', 'HPR'].includes(watchedPurpose as SitePurpose);


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

    const siteConditionOptionsForPurpose = useMemo(() => {
        if (watchedPurpose && PURPOSES_REQUIRING_RIG_ACCESSIBILITY.includes(watchedPurpose as SitePurpose)) {
            return siteConditionsOptions;
        }
        return ['Land Dispute', 'Work Disputes and Conflicts'];
    }, [watchedPurpose]);
    
    type Designation = NonNullable<StaffMember["designation"]>;

    const supervisorList = useMemo(() => {
        const designationSortOrder: Partial<Record<Designation, number>> = {
          'Executive Engineer': 0, 'Senior Hydrogeologist': 1, 'Assistant Executive Engineer': 2, 'Hydrogeologist': 3,
          'Assistant Engineer': 4, 'Junior Hydrogeologist': 5, 'Junior Geophysicist': 6, 'Master Driller': 7,
          'Senior Driller': 8, 'Driller': 9, 'Driller Mechanic': 10, 'Drilling Assistant': 11, 'Pump Operator': 12,
          'Driver, HDV': 13, 'Driver, LDV': 14, 'Senior Clerk': 15, 'U D Typist': 16, 'L D Typist': 17, 'Tracer': 18,
          'Lascar': 19, 'Office Attendant': 20, 'Watcher': 21, 'PTS': 22,
        };
    
        return allStaffMembers
          .filter(s => s.status === 'Active')
          .sort((a, b) => {
            const orderA = a.designation ? designationSortOrder[a.designation] ?? 99 : 99;
            const orderB = b.designation ? designationSortOrder[b.designation] ?? 99 : 99;
            if (orderA !== orderB) return orderA - orderB;
            return a.name.localeCompare(b.name);
          });
      }, [allStaffMembers]);
    
    const isFieldReadOnly = (isSupervisorEditable: boolean) => {
        if (isReadOnly) { return true; }
        if (isSupervisor) { return !isSupervisorEditable; }
        return false; // Editor can edit everything
    };

    if (isLoading) {
        return (
          <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-3 text-muted-foreground">Loading site data...</p>
          </div>
        );
    }
    
    return (
        <FormProvider {...form}>
            <form onSubmit={handleSubmit(handleFormSubmit)}>
                <Card>
                    <CardHeader className="flex flex-row justify-end items-center">
                        <Button type="button" variant="destructive" onClick={() => router.back()} disabled={isSubmitting}><ArrowLeft className="h-4 w-4 mr-2"/>Back</Button>
                    </CardHeader>
                    <CardContent>
                       <ScrollArea className="h-full px-6 py-4">
                           <div className="space-y-4">
                            <Card><CardHeader><CardTitle>Main Details</CardTitle></CardHeader><CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField name="nameOfSite" control={control} render={({ field }) => <FormItem><FormLabel>Name of Site <span className="text-destructive">*</span></FormLabel><FormControl><Input {...field} readOnly={isFieldReadOnly(false)} /></FormControl><FormMessage /></FormItem>} />
                            <FormField name="purpose" control={control} render={({ field }) => <FormItem><FormLabel>Purpose <span className="text-destructive">*</span></FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isFieldReadOnly(false)}><FormControl><SelectTrigger><SelectValue placeholder="Select Purpose" /></SelectTrigger></FormControl><SelectContent><SelectItem value="_clear_" onSelect={(e) => { e.preventDefault(); field.onChange(undefined); }}>-- Clear Selection --</SelectItem>{sitePurposeOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />
                            <FormField name="localSelfGovt" control={control} render={({ field }) => <FormItem><FormLabel>Local Self Govt.</FormLabel>{isFieldReadOnly(false) ? (<FormControl><Input {...field} value={field.value || ''} readOnly /></FormControl>) : (<Select onValueChange={(value) => handleLsgChange(value)} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select LSG"/></SelectTrigger></FormControl><SelectContent><SelectItem value="_clear_" onSelect={(e) => { e.preventDefault(); field.onChange(undefined); }}>-- Clear Selection --</SelectItem>{sortedLsgMaps.map(map => <SelectItem key={map.id} value={map.name}>{map.name}</SelectItem>)}</SelectContent></Select>)}<FormMessage/></FormItem>} />
                            <FormField name="constituency" control={control} render={({ field }) => <FormItem><FormLabel>Constituency (LAC)</FormLabel>{isFieldReadOnly(false) ? (<FormControl><Input {...field} value={field.value || ''} readOnly /></FormControl>) : (<Select onValueChange={field.onChange} value={field.value} disabled={constituencyOptionsForLsg.length <= 1}><FormControl><SelectTrigger><SelectValue placeholder="Select Constituency"/></SelectTrigger></FormControl><SelectContent><SelectItem value="_clear_" onSelect={(e) => { e.preventDefault(); field.onChange(undefined); }}>-- Clear Selection --</SelectItem>{constituencyOptionsForLsg.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>)}<FormMessage/></FormItem>} />
                            <FormField name="latitude" control={control} render={({ field }) => <FormItem><FormLabel>Latitude</FormLabel><FormControl><Input type="number" step="any" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isFieldReadOnly(true)} /></FormControl><FormMessage /></FormItem>} />
                            <FormField name="longitude" control={control} render={({ field }) => <FormItem><FormLabel>Longitude</FormLabel><FormControl><Input type="number" step="any" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isFieldReadOnly(true)} /></FormControl><FormMessage /></FormItem>} />
                        </div>
                            </CardContent></Card>
                            
                           {isDrillingPurpose && (
                                <Card><CardHeader><CardTitle>Survey Details (Recommended)</CardTitle></CardHeader><CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <FormField name="surveyRecommendedDiameter" control={control} render={({ field }) => <FormItem><FormLabel>Diameter (mm)</FormLabel><Select onValueChange={field.onChange} value={field.value || ""} disabled={isFieldReadOnly(false)}><FormControl><SelectTrigger><SelectValue placeholder="Select Diameter" /></SelectTrigger></FormControl><SelectContent><SelectItem value="_clear_" onSelect={(e) => { e.preventDefault(); field.onChange(undefined); }}>-- Clear Selection --</SelectItem>{siteDiameterOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />
                                        <FormField name="surveyRecommendedTD" control={control} render={({ field }) => <FormItem><FormLabel>Total Depth (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(false)} /></FormControl><FormMessage /></FormItem>} />
                                        {watchedPurpose === 'BWC' && <FormField name="surveyRecommendedOB" control={control} render={({ field }) => <FormItem><FormLabel>OB (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(false)} /></FormControl><FormMessage /></FormItem>} />}
                                        {watchedPurpose === 'BWC' && <FormField name="surveyRecommendedCasingPipe" control={control} render={({ field }) => <FormItem><FormLabel>Casing Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(false)} /></FormControl><FormMessage /></FormItem>} />}
                                        {watchedPurpose === 'TWC' && <FormField name="surveyRecommendedPlainPipe" control={control} render={({ field }) => <FormItem><FormLabel>Plain Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(false)} /></FormControl><FormMessage /></FormItem>} />}
                                        {watchedPurpose === 'TWC' && <FormField name="surveyRecommendedSlottedPipe" control={control} render={({ field }) => <FormItem><FormLabel>Slotted Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(false)} /></FormControl><FormMessage /></FormItem>} />}
                                        {watchedPurpose === 'TWC' && <FormField name="surveyRecommendedMsCasingPipe" control={control} render={({ field }) => <FormItem><FormLabel>MS Casing Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(false)} /></FormControl><FormMessage /></FormItem>} />}
                                        {watchedPurpose === 'FPW' && <FormField name="surveyRecommendedCasingPipe" control={control} render={({ field }) => <FormItem><FormLabel>Casing Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(false)} /></FormControl><FormMessage /></FormItem>} />}
                                        <FormField name="surveyLocation" control={control} render={({ field }) => <FormItem><FormLabel>Survey Location</FormLabel><FormControl><Textarea {...field} value={field.value || ''} readOnly={isFieldReadOnly(false)} /></FormControl><FormMessage /></FormItem>} />
                                        <FormField name="surveyRemarks" control={control} render={({ field }) => <FormItem className="md:col-span-1"><FormLabel>Survey Remarks</FormLabel><FormControl><Textarea {...field} value={field.value || ''} readOnly={isFieldReadOnly(false)} /></FormControl><FormMessage /></FormItem>} />
                                    </div>
                                </CardContent></Card>
                            )}

                            <Card><CardHeader><CardTitle>Work Implementation</CardTitle></CardHeader><CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                   <FormField name="siteConditions" control={control} render={({ field }) => <FormItem><FormLabel>{PURPOSES_REQUIRING_RIG_ACCESSIBILITY.includes(watchedPurpose as SitePurpose) ? "Rig and Site Accessibility" : "Site Conditions"}</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isFieldReadOnly(false)}><FormControl><SelectTrigger><SelectValue placeholder="Select Condition" /></SelectTrigger></FormControl><SelectContent><SelectItem value="_clear_" onSelect={(e) => { e.preventDefault(); field.onChange(undefined); }}>-- Clear Selection --</SelectItem>{siteConditionOptionsForPurpose.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />
                                   <FormField name="estimateAmount" control={control} render={({ field }) => <FormItem><FormLabel>Estimate Amount (₹)</FormLabel><FormControl><Input type="number" step="any" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isFieldReadOnly(false)} /></FormControl><FormMessage /></FormItem>} />
                                   <FormField name="remittedAmount" control={control} render={({ field }) => <FormItem><FormLabel>Remitted Amount (₹)</FormLabel><FormControl><Input type="number" step="any" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isFieldReadOnly(false)} /></FormControl><FormMessage /></FormItem>} />
                                   <FormField name="tsAmount" control={control} render={({ field }) => <FormItem><FormLabel>TS Amount (₹)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isFieldReadOnly(false)} /></FormControl><FormMessage /></FormItem>} />
                                   <FormField name="tenderNo" control={control} render={({ field }) => <FormItem><FormLabel>Tender No.</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(false)} /></FormControl><FormMessage/></FormItem>} />
                                   <FormField name="contractorName" control={control} render={({ field }) => <FormItem><FormLabel>Contractor</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(false)} /></FormControl><FormMessage/></FormItem>} />
                                   <FormField
                                      name="supervisorUid"
                                      control={form.control}
                                      render={({ field }) => (
                                          <FormItem>
                                              <FormLabel>Supervisor</FormLabel>
                                              {isFieldReadOnly(false) ? ( 
                                                  <Input
                                                      readOnly
                                                      value={getValues('supervisorName') || "Not Assigned"}
                                                      className="bg-muted/50"
                                                  />
                                              ) : (
                                                  <Select
                                                      onValueChange={(value) => {
                                                          if (value === '_clear_') {
                                                              field.onChange(undefined);
                                                              setValue("supervisorName", "");
                                                              setValue("supervisorDesignation", undefined);
                                                          } else {
                                                              const staff = supervisorList.find((s) => s.id === value);
                                                              field.onChange(value);
                                                              setValue("supervisorName", staff?.name || "");
                                                              setValue("supervisorDesignation", staff?.designation || undefined);
                                                          }
                                                      }}
                                                      value={field.value || ""}>
                                                      <FormControl><SelectTrigger><SelectValue placeholder="Assign a Supervisor" /></SelectTrigger></FormControl>
                                                      <SelectContent>
                                                          <SelectItem value="_clear_">-- Clear Selection --</SelectItem>
                                                          {supervisorList.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name} ({s.designation})</SelectItem>))}
                                                      </SelectContent>
                                                  </Select>
                                              )}
                                              <FormMessage />
                                          </FormItem>
                                      )}
                                  />
                                </div>
                            </CardContent></Card>
                            
                           {isDevelopingPurpose && (
                                <Card>
                                    <CardHeader><CardTitle>Developing Details</CardTitle></CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <FormField name="diameter" control={control} render={({ field }) => <FormItem><FormLabel>Actual Diameter {PURPOSES_REQUIRING_DIAMETER.includes(watchedPurpose as SitePurpose) && <span className="text-destructive">*</span>}</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isFieldReadOnly(true)}><FormControl><SelectTrigger><SelectValue placeholder="Select Diameter" /></SelectTrigger></FormControl><SelectContent><SelectItem value="_clear_" onSelect={(e) => { e.preventDefault(); field.onChange(undefined); }}>-- Clear Selection --</SelectItem>{siteDiameterOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />
                                            <FormField name="totalDepth" control={control} render={({ field }) => <FormItem><FormLabel>Total Depth (m)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isFieldReadOnly(true)} /></FormControl><FormMessage /></FormItem>} />
                                            <FormField name="yieldDischarge" control={control} render={({ field }) => <FormItem><FormLabel>Yield (LPH)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)} /></FormControl><FormMessage /></FormItem>} />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <FormField name="waterLevel" control={control} render={({ field }) => <FormItem className="md:col-span-1"><FormLabel>Static Water (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)} /></FormControl><FormMessage /></FormItem>} />
                                            <FormField name="developingRemarks" control={control} render={({ field }) => <FormItem className="md:col-span-2"><FormLabel>Remarks</FormLabel><FormControl><Textarea {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)} /></FormControl><FormMessage /></FormItem>} />
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {isDrillingPurpose && (
                               <Card>
                                    <CardHeader><CardTitle>Drilling Details (Actuals)</CardTitle></CardHeader><CardContent className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <FormField name="diameter" control={control} render={({field}) => <FormItem><FormLabel>Actual Diameter {PURPOSES_REQUIRING_DIAMETER.includes(watchedPurpose as SitePurpose) && <span className="text-destructive">*</span>}</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isFieldReadOnly(true)}><FormControl><SelectTrigger><SelectValue placeholder="Select Diameter"/></SelectTrigger></FormControl><SelectContent><SelectItem value="_clear_" onSelect={(e) => { e.preventDefault(); field.onChange(undefined); }}>-- Clear Selection --</SelectItem>{siteDiameterOptions.map(o=><SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>}/>
                                            {watchedPurpose === 'TWC' && <FormField name="pilotDrillingDepth" control={control} render={({field})=> <FormItem><FormLabel>Pilot Drilling (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage/></FormItem>} />}
                                            <FormField name="totalDepth" control={control} render={({field})=> <FormItem><FormLabel>Actual TD (m)</FormLabel><FormControl><Input type="number" {...field} onChange={e=>field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isFieldReadOnly(true)} /></FormControl><FormMessage/></FormItem>} />
                                            {watchedPurpose === 'BWC' && <FormField name="surveyOB" control={control} render={({field})=> <FormItem><FormLabel>Actual OB (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage/></FormItem>} />}
                                            {watchedPurpose !== 'TWC' && <FormField name="casingPipeUsed" control={control} render={({field})=> <FormItem><FormLabel>Casing Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage/></FormItem>} />}
                                            {watchedPurpose === 'BWC' && <FormField name="outerCasingPipe" control={control} render={({field})=> <FormItem><FormLabel>Outer Casing (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage/></FormItem>} />}
                                            {watchedPurpose === 'BWC' && <FormField name="innerCasingPipe" control={control} render={({field})=> <FormItem><FormLabel>Inner Casing (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage/></FormItem>} />}
                                            {watchedPurpose === 'TWC' && <FormField name="surveyPlainPipe" control={control} render={({field})=> <FormItem><FormLabel>Plain Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage/></FormItem>} />}
                                            {watchedPurpose === 'TWC' && <FormField name="surveySlottedPipe" control={control} render={({field})=> <FormItem><FormLabel>Slotted Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage/></FormItem>} />}
                                            {watchedPurpose === 'TWC' && <FormField name="outerCasingPipe" control={control} render={({field})=> <FormItem><FormLabel>MS Casing Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage/></FormItem>} />}
                                            <FormField name="yieldDischarge" control={control} render={({field})=> <FormItem><FormLabel>Yield (LPH)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage/></FormItem>} />
                                            <FormField name="zoneDetails" control={control} render={({ field }) => <FormItem><FormLabel>Zone Details (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)} /></FormControl><FormMessage /></FormItem>} />
                                            <FormField name="waterLevel" control={control} render={({field})=> <FormItem><FormLabel>Static Water (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage/></FormItem>} />
                                            <FormField name="typeOfRig" control={control} render={({field})=> <FormItem><FormLabel>Type of Rig</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isFieldReadOnly(true)}><FormControl><SelectTrigger><SelectValue placeholder="Select Rig Type"/></SelectTrigger></FormControl><SelectContent><SelectItem value="_clear_" onSelect={(e) => { e.preventDefault(); field.onChange(undefined); }}>-- Clear Selection --</SelectItem>{siteTypeOfRigOptions.map(o=><SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>} />
                                            <FormField name="drillingRemarks" control={control} render={({ field }) => <FormItem><FormLabel>Drilling Remarks</FormLabel><FormControl><Textarea {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)} /></FormControl><FormMessage /></FormItem>} />
                                        </div>
                                    </CardContent></Card>
                            )}

                            {isSchemePurpose && (
                                <Card><CardHeader><CardTitle>Scheme Details</CardTitle></CardHeader><CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {isMWSSSchemePurpose && <>
                                        <FormField name="yieldDischarge" control={control} render={({field})=> <FormItem><FormLabel>Well Discharge (LPH)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage/></FormItem>} />
                                        <FormField name="pumpDetails" control={control} render={({field})=> <FormItem><FormLabel>Pump Details</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage/></FormItem>} />
                                        <FormField name="pumpingLineLength" control={control} render={({field})=> <FormItem><FormLabel>Pumping Line (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage/></FormItem>} />
                                        <FormField name="deliveryLineLength" control={control} render={({field})=> <FormItem><FormLabel>Delivery Line (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage/></FormItem>} />
                                        <FormField name="waterTankCapacity" control={control} render={({field})=> <FormItem><FormLabel>Tank Capacity (L)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage/></FormItem>} />
                                        <FormField name="noOfTapConnections" control={control} render={({field})=> <FormItem><FormLabel># Taps</FormLabel><FormControl><Input type="number" {...field} onChange={e=>field.onChange(e.target.value==='' ? undefined : +e.target.value)} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage/></FormItem>} />
                                    </>}
                                    {isHPSPurpose && <>
                                        <FormField name="totalDepth" control={control} render={({field})=> <FormItem><FormLabel>Depth Erected (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage/></FormItem>} />
                                        <FormField name="waterLevel" control={control} render={({field})=> <FormItem><FormLabel>Water Level (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage/></FormItem>} />
                                    </>}
                                    <FormField name="noOfBeneficiary" control={control} render={({field})=> <FormItem><FormLabel># Beneficiaries</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage/></FormItem>} />
                                </div>
                                </CardContent></Card>
                            )}

                            <Card>
                                <CardHeader><CardTitle>Work Status</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <FormField name="workStatus" control={control} render={({ field }) => <FormItem><FormLabel>Work Status <span className="text-destructive">*</span></FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isFieldReadOnly(true)}><FormControl><SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger></FormControl><SelectContent className="max-h-80"><SelectItem value="_clear_" onSelect={(e) => { e.preventDefault(); field.onChange(undefined); }}>-- Clear Selection --</SelectItem>{(isSupervisor ? SUPERVISOR_WORK_STATUS_OPTIONS : SITE_DIALOG_WORK_STATUS_OPTIONS).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />
                                        <FormField name="dateOfCompletion" control={control} render={({ field }) => <FormItem><FormLabel>Completion Date {isCompletionDateRequired && <span className="text-destructive">*</span>}</FormLabel><FormControl><Input type="date" {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)} /></FormControl><FormMessage /></FormItem>} />
                                        {!isSupervisor && <FormField name="totalExpenditure" control={control} render={({ field }) => <FormItem><FormLabel>Total Expenditure (₹)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isFieldReadOnly(true)} /></FormControl><FormMessage /></FormItem>} />}
                                        <FormField name="workRemarks" control={control} render={({ field }) => <FormItem className="md:col-span-3"><FormLabel>Work Remarks</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} readOnly={isFieldReadOnly(true)} /></FormControl><FormMessage /></FormItem>} />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                       </ScrollArea>
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting || isReadOnly}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                            Save Site
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </FormProvider>
    )
}
