// src/app/dashboard/ars/entry/page.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from 'next/navigation';
import { ArsEntrySchema, type ArsEntryFormData, constituencyOptions, arsTypeOfSchemeOptions, type StaffMember, type SiteWorkStatus, type Constituency, arsStatusOptions, type Bidder } from "@/lib/schemas";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm, useWatch, FormProvider, useFormContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { format, isValid, parseISO, parse } from "date-fns";
import { useAuth, type UserProfile } from "@/hooks/useAuth";
import { useStaffMembers } from "@/hooks/useStaffMembers";
import { cn } from "@/lib/utils";
import { usePageHeader } from "@/hooks/usePageHeader";
import { usePendingUpdates } from "@/hooks/usePendingUpdates";
import { useDataStore } from '@/hooks/use-data-store';
import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";
import { app } from "@/lib/firebase";
import { useArsEntries } from "@/hooks/useArsEntries";


export const dynamic = 'force-dynamic';

// Inline SVG components
const Loader2 = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
);
const Save = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
);
const X = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
);
const ArrowLeft = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
);
const ShieldAlert = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
);


const db = getFirestore(app);

const SUPERVISOR_EDITABLE_FIELDS: (keyof ArsEntryFormData)[] = [
  'latitude', 'longitude', 'arsStatus', 'dateOfCompletion', 'noOfBeneficiary', 'workRemarks'
];
const SUPERVISOR_EDITABLE_STATUSES: (typeof arsStatusOptions)[number][] = ["Work Order Issued", "Work in Progress", "Work Completed", "Work Failed"];


const toDateOrNull = (value: any): Date | null => {
    if (!value) return null;
    if (value instanceof Date && isValid(value)) return value;
    if (typeof value === 'object' && value !== null && typeof value.seconds === 'number') {
        const d = new Date(value.seconds * 1000 + (value.nanoseconds || 0) / 1e6);
        if (isValid(d)) return d;
    }
    if (typeof value === 'string') {
        let d = parseISO(value); // Handles yyyy-MM-dd and ISO strings
        if (isValid(d)) return d;
        d = parse(value, 'dd/MM/yyyy', new Date()); // Handles dd/MM/yyyy
        if (isValid(d)) return d;
    }
    return null;
};

// This function now recursively processes the data and formats dates to 'yyyy-MM-dd' for native date pickers
const processDataForForm = (data: any): any => {
    if (!data) return data;
    if (Array.isArray(data)) {
        return data.map(item => processDataForForm(item));
    }
    if (typeof data === 'object' && data !== null) {
        const maybeDate = toDateOrNull(data);
        if (maybeDate) {
            return format(maybeDate, 'yyyy-MM-dd');
        }

        const processed: { [key: string]: any } = {};
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                const value = data[key];
                 if (key.toLowerCase().includes('date')) {
                    const date = toDateOrNull(value);
                    processed[key] = date ? format(date, 'yyyy-MM-dd') : '';
                } else {
                    processed[key] = processDataForForm(value);
                }
            }
        }
        return processed;
    }
    return data;
};

const CompletionDateField = ({ isFieldReadOnly }: { isFieldReadOnly: (fieldName: keyof ArsEntryFormData) => boolean }) => {
    const { control } = useFormContext<ArsEntryFormData>();
    const arsStatus = useWatch({ control, name: 'arsStatus' });
    const isRequired = arsStatus === 'Work Completed' || arsStatus === 'Work Failed';

    return (
        <FormField
            name="dateOfCompletion"
            control={control}
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Completion Date {isRequired && <span className="text-destructive">*</span>}</FormLabel>
                    <FormControl>
                        <Input
                            type="date"
                            {...field}
                            value={
                                field.value
                                ? (field.value instanceof Date
                                    ? format(field.value, "yyyy-MM-dd")
                                    : field.value)
                                : ""
                            }
                            onChange={(e) => field.onChange(e.target.value || undefined)}
                            readOnly={isFieldReadOnly('dateOfCompletion')}
                        />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
    );
};


export default function ArsEntryPage() {
    const { setHeader } = usePageHeader();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, fetchAllUsers } = useAuth();
    const { staffMembers, isLoading: staffIsLoading } = useStaffMembers();
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const { allLsgConstituencyMaps, allE_tenders } = useDataStore();
    
    const entryIdToEdit = searchParams?.get('id');
    const approveUpdateId = searchParams?.get("approveUpdateId");
    const pageToReturnTo = searchParams?.get('page');
    
    const { isLoading: entriesLoading, getArsEntryById, updateArsEntry, addArsEntry } = useArsEntries();
    const { createArsPendingUpdate, getPendingUpdateById, hasPendingUpdateForFile } = usePendingUpdates();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    
    const isEditing = !!entryIdToEdit;
    const canEdit = user?.role === 'editor';
    const isSupervisor = user?.role === 'supervisor';
    const isViewer = user?.role === 'viewer';
    const isApprovingUpdate = canEdit && !!approveUpdateId;
    
    const [isFormDisabledForSupervisor, setIsFormDisabledForSupervisor] = useState(false);
    
    const form = useForm<ArsEntryFormData>({
        resolver: zodResolver(ArsEntrySchema),
        defaultValues: {
          fileNo: "", nameOfSite: "", localSelfGovt: "", constituency: undefined, arsTypeOfScheme: undefined,
          arsBlock: "", latitude: undefined, longitude: undefined, arsNumberOfStructures: undefined,
          arsStorageCapacity: undefined, arsNumberOfFillings: undefined, estimateAmount: undefined,
          arsAsTsDetails: "", tsAmount: undefined, arsSanctionedDate: undefined, arsTenderedAmount: undefined,
          arsAwardedAmount: undefined, arsTenderNo: "", arsContractorName: "", arsStatus: undefined, dateOfCompletion: undefined,
          totalExpenditure: undefined, noOfBeneficiary: "", workRemarks: "",
          supervisorUid: null,
          supervisorName: null,
        },
    });

    const { control, watch: formWatch } = form;
    const watchedArsStatus = useWatch({ control, name: 'arsStatus' });
    const watchedLsg = useWatch({ control, name: "localSelfGovt" });
    const watchedTenderNo = formWatch('arsTenderNo');
    const isSupervisorDropdownDisabled = false;

    const isFieldReadOnly = (fieldName: keyof ArsEntryFormData): boolean => {
        if (canEdit) return false; // Editor can edit everything
        if (isViewer) return true; // Viewer can edit nothing
    
        if (isSupervisor) {
            if (!isEditing || isFormDisabledForSupervisor) return true;
    
            // For other editable statuses, use the standard editable fields list
            return !SUPERVISOR_EDITABLE_FIELDS.includes(fieldName);
        }
    
        return true; // Default to read-only for any other unhandled case
    };
    
    const sortedTenders = useMemo(() => {
        return [...allE_tenders].sort((a, b) => {
            const dateA = toDateOrNull(a.tenderDate)?.getTime() ?? 0;
            const dateB = toDateOrNull(b.tenderDate)?.getTime() ?? 0;
            if (dateA !== dateB) return dateB - dateA;

            const getTenderNumber = (tenderNo: string | undefined | null): number => {
                if (!tenderNo) return 0;
                const match = tenderNo.match(/T-(\d+)/);
                return match ? parseInt(match[1], 10) : 0;
            };

            const numA = getTenderNumber(a.eTenderNo);
            const numB = getTenderNumber(b.eTenderNo);
            return numB - numA;
        });
    }, [allE_tenders]);

    const constituencyOptionsForLsg = useMemo(() => {
        if (!watchedLsg) return [];
        const map = allLsgConstituencyMaps.find(m => m.name === watchedLsg);
        if (!map || !map.constituencies) return [];
        return [...map.constituencies].sort((a,b) => a.localeCompare(b));
    }, [watchedLsg, allLsgConstituencyMaps]);
    
    const isConstituencyDisabled = useMemo(() => {
        if (isFieldReadOnly('constituency')) return true;
        if (!watchedLsg) return true;
        if (constituencyOptionsForLsg.length <= 1) return true;
        return false;
    }, [isFieldReadOnly, watchedLsg, constituencyOptionsForLsg]);

     useEffect(() => {
        let title = 'Add New ARS Entry';
        let description = 'Fill in the details to create a new ARS site entry.';
        if (isEditing) {
            title = 'Edit ARS Entry';
            description = 'Update the details for the ARS site below.';
        }
        if (isApprovingUpdate) {
            title = 'Approve ARS Update';
            description = 'Review the changes below and click "Save Changes" to approve.';
        }
        if (isViewer) {
            title = 'View ARS Entry';
            description = 'Viewing ARS site details in read-only mode.';
        } else if (isSupervisor && isEditing) {
            title = 'Edit Assigned ARS Site';
            description = 'Update your assigned site. Changes will be submitted for approval.';
        }
        setHeader(title, description);
    }, [isEditing, isViewer, isSupervisor, setHeader, isApprovingUpdate]);

    useEffect(() => {
        if (canEdit) {
            fetchAllUsers().then(setAllUsers);
        }
    }, [canEdit, fetchAllUsers]);
    
    const staffMap = React.useMemo(() => {
        if (!canEdit) return new Map();
        const map = new Map<string, StaffMember & { uid: string }>();
        allUsers
            .filter(u => u.role === 'supervisor' && u.isApproved && u.staffId)
            .forEach(u => {
                const staffInfo = staffMembers.find(s => s.id === u.staffId && s.status === 'Active');
                if (staffInfo) {
                    map.set(staffInfo.id, { ...staffInfo, uid: u.uid });
                }
            });
        return map;
    }, [allUsers, staffMembers, canEdit]);

    const supervisorList = useMemo(() => Array.from(staffMap.values()), [staffMap]);
    
    const handleLsgChange = useCallback((lsgName: string) => {
        form.setValue('localSelfGovt', lsgName);
        const map = allLsgConstituencyMaps.find(m => m.name === lsgName);
        const constituencies = map?.constituencies || [];
        
        form.setValue('constituency', undefined);
        
        if (constituencies.length === 1) {
          form.setValue('constituency', constituencies[0] as Constituency);
        }
        form.trigger('constituency');
    }, [form, allLsgConstituencyMaps]);

    useEffect(() => {
        const lsgName = form.watch("localSelfGovt");
        if (!lsgName) return;

        const map = allLsgConstituencyMaps.find(m => m.name === lsgName);
        const constituencies = map?.constituencies || [];
        
        if (constituencies.length === 1 && form.getValues("constituency") !== constituencies[0]) {
            form.setValue('constituency', constituencies[0] as Constituency);
        }
    }, [watchedLsg, allLsgConstituencyMaps, form]);

    const sortedLsgMaps = useMemo(() => {
        return [...allLsgConstituencyMaps].sort((a, b) => a.name.localeCompare(b.name));
    }, [allLsgConstituencyMaps]);
    
    const returnPath = useMemo(() => {
        const base = isApprovingUpdate ? '/dashboard/pending-updates' : '/dashboard/ars';
        return pageToReturnTo ? `${base}?page=${pageToReturnTo}` : base;
    }, [isApprovingUpdate, pageToReturnTo]);


    useEffect(() => {
        const loadArsEntry = async () => {
            if (!isEditing || !entryIdToEdit) return;
            
            const [originalEntry, pendingUpdate] = await Promise.all([
                getArsEntryById(entryIdToEdit),
                approveUpdateId ? getPendingUpdateById(approveUpdateId) : Promise.resolve(null)
            ]);

            if (!originalEntry) {
                toast({ title: "Error", description: `ARS Entry with ID "${entryIdToEdit}" not found.`, variant: "destructive" });
                router.push('/dashboard/ars');
                return;
            }
            
             if (isSupervisor && user) {
                const hasPending = await hasPendingUpdateForFile(originalEntry.fileNo, user.uid);
                const isEditableStatus = originalEntry.arsStatus && SUPERVISOR_EDITABLE_STATUSES.includes(originalEntry.arsStatus as (typeof arsStatusOptions)[number]);
                
                if (hasPending) {
                    setIsFormDisabledForSupervisor(true);
                    toast({ title: "Edits Locked", description: "This site has a pending update and cannot be edited until reviewed.", duration: 6000 });
                }
            }


            if (isApprovingUpdate && pendingUpdate) {
                const mergedData = { ...originalEntry, ...pendingUpdate.updatedSiteDetails[0] };
                form.reset(processDataForForm(mergedData));
                 toast({ title: "Reviewing Update", description: `Loading changes from ${pendingUpdate.submittedByName}. Please review and save.` });
            } else {
                form.reset(processDataForForm(originalEntry));
            }
        };
        if (isEditing) {
          loadArsEntry();
        }
    }, [isEditing, entryIdToEdit, approveUpdateId, getArsEntryById, getPendingUpdateById, form, router, toast, isApprovingUpdate, isSupervisor, user, hasPendingUpdateForFile]);

    const tenderSupervisors = useMemo(() => {
        if (!watchedTenderNo) return [];
        const tender = allE_tenders.find(t => t.eTenderNo === watchedTenderNo);
        if (!tender) return [];

        const supervisors: { id: string; name: string; designation?: string }[] = [];
        const addedUids = new Set<string>();

        const addSupervisor = (staffId: string | null | undefined) => {
            if (!staffId || addedUids.has(staffId)) return;
            const supervisorUser = staffMap.get(staffId);
            if (supervisorUser) {
                supervisors.push({ id: supervisorUser.uid, name: supervisorUser.name, designation: supervisorUser.designation });
                addedUids.add(staffId);
            }
        };

        if (tender.nameOfAssistantEngineer) {
            const ae = Array.from(staffMap.values()).find(s => s.name === tender.nameOfAssistantEngineer);
            if (ae) addSupervisor(ae.id);
        }
        addSupervisor(tender.supervisor1Id);
        addSupervisor(tender.supervisor2Id);
        addSupervisor(tender.supervisor3Id);

        return supervisors;
    }, [watchedTenderNo, allE_tenders, staffMap]);

    useEffect(() => {
        const selectedTender = allE_tenders.find(t => t.eTenderNo === watchedTenderNo);
        if (selectedTender) {
             const validBidders = (selectedTender.bidders || []).filter((b: Bidder) => typeof b.quotedAmount === 'number' && b.quotedAmount > 0);
            const l1Bidder = validBidders.length > 0 
                ? validBidders.reduce((lowest: Bidder, current: Bidder) => (lowest.quotedAmount! < current.quotedAmount!) ? lowest : current)
                : null;
            form.setValue('arsContractorName', l1Bidder ? `${l1Bidder.name}, ${l1Bidder.address}` : '');

            if (tenderSupervisors.length === 1) {
                const supervisor = tenderSupervisors[0];
                form.setValue('supervisorUid', supervisor.id);
                form.setValue('supervisorName', supervisor.name);
            } else {
                form.setValue('supervisorUid', null);
                form.setValue('supervisorName', null);
            }
        }
    }, [watchedTenderNo, allE_tenders, form, tenderSupervisors]);

    const handleSupervisorDropdownChange = (uid: string) => {
        const staff = supervisorList.find(s => s.uid === uid);
        form.setValue('supervisorUid', uid);
        form.setValue('supervisorName', staff?.name || null);
    };

    const handleFormSubmit = async (data: ArsEntryFormData) => {
        if (!user || isViewer) {
            toast({ title: "Permission Denied", description: "You do not have permission to perform this action.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        
        const payload: ArsEntryFormData = {
            ...data,
            arsSanctionedDate: data.arsSanctionedDate || null,
            dateOfCompletion: data.dateOfCompletion || null,
        };

        try {
            if (isApprovingUpdate && entryIdToEdit && approveUpdateId) {
                await updateArsEntry(entryIdToEdit, payload, approveUpdateId, user);
                toast({ title: "Update Approved", description: `Changes for site "${data.nameOfSite}" have been saved.` });
            } else if (canEdit && isEditing && entryIdToEdit) {
                await updateArsEntry(entryIdToEdit, payload);
                toast({ title: "ARS Site Updated", description: `Site "${data.nameOfSite}" has been updated.` });
            } else if (canEdit && !isEditing) {
                const fileNoTrimmed = data.fileNo.trim().toUpperCase();
                const q = query(collection(db, "arsEntries"), where("fileNo", "==", fileNoTrimmed));
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    toast({
                        title: "Duplicate File Number",
                        description: `An ARS entry with File No. "${data.fileNo}" already exists. Please use a unique file number.`,
                        variant: "destructive",
                    });
                    setIsSubmitting(false);
                    return;
                }
                await addArsEntry({ ...payload, fileNo: fileNoTrimmed });
                toast({ title: "ARS Site Added", description: `Site "${data.nameOfSite}" has been created.` });
            } else if (isSupervisor && isEditing && entryIdToEdit) {
                await createArsPendingUpdate(entryIdToEdit, payload, user);
                 toast({ title: "Update Submitted", description: `Your changes for site "${data.nameOfSite}" have been submitted for approval.` });
            }
            router.push(returnPath);
        } catch (error: any) {
             toast({ title: "Error Processing Site", description: error.message, variant: "destructive" });
        } finally {
          setIsSubmitting(false);
        }
    };
    
    if (entriesLoading || staffIsLoading) {
        return ( <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center"> <Loader2 className="h-12 w-12 animate-spin text-primary" /> <p className="ml-3 text-muted-foreground">Loading form data...</p> </div> );
    }

    if (isSupervisor && !isEditing) {
        return (
            <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
                <div className="space-y-6 p-6 text-center">
                    <ShieldAlert className="h-12 w-12 text-destructive mx-auto mb-4" />
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Access Denied</h1>
                    <p className="text-muted-foreground">Supervisors cannot create new ARS entries.</p>
                </div>
            </div>
        );
    }
    
    const supervisorWorkStatusOptions = isSupervisor
        ? arsStatusOptions.filter(status =>
            SUPERVISOR_EDITABLE_STATUSES.includes(status as (typeof arsStatusOptions)[number])
          )
        : arsStatusOptions;

    return (
        <div className="space-y-6">
            <Card className="shadow-lg">
                <CardContent className="pt-6">
                   <div className="flex justify-end mb-4">
                      <Button variant="destructive" size="sm" onClick={() => router.push(returnPath)}>
                          <ArrowLeft className="mr-2 h-4 w-4" />
                          Back
                      </Button>
                    </div>
                    <FormProvider {...form}>
                      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6 p-1">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <FormField name="fileNo" control={form.control} render={({ field }) => (<FormItem><FormLabel>File No. <span className="text-destructive">*</span></FormLabel><FormControl><Input placeholder="File No." {...field} readOnly={isFieldReadOnly('fileNo')} /></FormControl><FormMessage /></FormItem>)} />
                          <FormField name="nameOfSite" control={form.control} render={({ field }) => (<FormItem><FormLabel>Name of Site <span className="text-destructive">*</span></FormLabel><FormControl><Input placeholder="e.g., Anchal ARS" {...field} readOnly={isFieldReadOnly('nameOfSite')} /></FormControl><FormMessage /></FormItem>)} />
                          <FormField name="arsTypeOfScheme" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Type of Scheme</FormLabel><Select onValueChange={field.onChange} value={field.value ?? undefined} disabled={isFieldReadOnly('arsTypeOfScheme')}><FormControl><SelectTrigger><SelectValue placeholder="Select Type of Scheme" /></SelectTrigger></FormControl><SelectContent>{arsTypeOfSchemeOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
                          <FormField name="arsBlock" control={form.control} render={({ field }) => (<FormItem><FormLabel>Block</FormLabel><FormControl><Input placeholder="Block Name" {...field} value={field.value ?? ""} readOnly={isFieldReadOnly('arsBlock')} /></FormControl><FormMessage /></FormItem>)} />
                          <FormField name="localSelfGovt" control={form.control} render={({ field }) => (
                            <FormItem>
                                <FormLabel>Local Self Govt.</FormLabel>
                                <Select
                                onValueChange={(value) => {
                                    const normalized = value === '_clear_' ? '' : value;
                                    field.onChange(normalized);
                                    handleLsgChange(normalized);
                                }}
                                value={field.value ?? ""}
                                disabled={isFieldReadOnly('localSelfGovt')}
                                >
                                <FormControl>
                                    <SelectTrigger><SelectValue placeholder="Select Local Self Govt."/></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="_clear_" onSelect={(e) => { e.preventDefault(); field.onChange(''); handleLsgChange(''); }}>
                                    -- Clear Selection --
                                    </SelectItem>
                                    {sortedLsgMaps.map(map => <SelectItem key={map.id} value={map.name}>{map.name}</SelectItem>)}
                                </SelectContent>
                                </Select>
                                <FormMessage/>
                            </FormItem>
                          )}/>
                           <FormField
                              name="constituency"
                              control={form.control}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Constituency (LAC)</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        value={field.value}
                                        disabled={isConstituencyDisabled}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder={!watchedLsg ? "Select LSG first" : "Select Constituency"} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {constituencyOptionsForLsg.length > 1 && (
                                                <SelectItem value="_clear_" onSelect={(e) => { e.preventDefault(); field.onChange(undefined); }}>
                                                    -- Clear Selection --
                                                </SelectItem>
                                            )}
                                            {constituencyOptionsForLsg.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          <FormField name="latitude" control={form.control} render={({ field }) => (<FormItem><FormLabel>Latitude</FormLabel><FormControl><Input type="number" step="any" placeholder="e.g., 8.8932" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isFieldReadOnly('latitude')}/></FormControl><FormMessage /></FormItem>)} />
                          <FormField name="longitude" control={form.control} render={({ field }) => (<FormItem><FormLabel>Longitude</FormLabel><FormControl><Input type="number" step="any" placeholder="e.g., 76.6141" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isFieldReadOnly('longitude')} /></FormControl><FormMessage /></FormItem>)} />
                          <FormField name="arsNumberOfStructures" control={form.control} render={({ field }) => (<FormItem><FormLabel>Number of Structures</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isFieldReadOnly('arsNumberOfStructures')}/></FormControl><FormMessage /></FormItem>)} />
                          <FormField name="arsStorageCapacity" control={form.control} render={({ field }) => (<FormItem><FormLabel>Storage Capacity (m3)</FormLabel><FormControl><Input type="number" step="any" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isFieldReadOnly('arsStorageCapacity')}/></FormControl><FormMessage /></FormItem>)} />
                          <FormField name="arsNumberOfFillings" control={form.control} render={({ field }) => (<FormItem><FormLabel>No. of Fillings</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isFieldReadOnly('arsNumberOfFillings')} /></FormControl><FormMessage /></FormItem>)} />
                          <FormField name="estimateAmount" control={form.control} render={({ field }) => (<FormItem><FormLabel>Estimate Amount (₹)</FormLabel><FormControl><Input type="number" step="any" placeholder="e.g., 500000" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isFieldReadOnly('estimateAmount')}/></FormControl><FormMessage /></FormItem>)} />
                          <FormField name="arsAsTsDetails" control={form.control} render={({ field }) => (<FormItem><FormLabel>AS/TS Accorded Details</FormLabel><FormControl><Input {...field} value={field.value ?? ""} readOnly={isFieldReadOnly('arsAsTsDetails')} /></FormControl><FormMessage /></FormItem>)} />
                          <FormField name="tsAmount" control={form.control} render={({ field }) => (<FormItem><FormLabel>AS/TS Amount (₹)</FormLabel><FormControl><Input type="number" step="any" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isFieldReadOnly('tsAmount')}/></FormControl><FormMessage /></FormItem>)} />
                           <FormField
                              name="arsSanctionedDate"
                              control={form.control}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Sanctioned Date</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="date"
                                      {...field}
                                      value={
                                        field.value
                                          ? (field.value instanceof Date
                                              ? format(field.value, "yyyy-MM-dd")
                                              : field.value)
                                          : ""
                                      }
                                      onChange={(e) => field.onChange(e.target.value || undefined)}
                                      readOnly={isFieldReadOnly("arsSanctionedDate")}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          <FormField name="arsTenderedAmount" control={form.control} render={({ field }) => (<FormItem><FormLabel>Tendered Amount (₹)</FormLabel><FormControl><Input type="number" step="any" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isFieldReadOnly('arsTenderedAmount')}/></FormControl><FormMessage /></FormItem>)} />
                          <FormField name="arsAwardedAmount" control={form.control} render={({ field }) => (<FormItem><FormLabel>Awarded Amount (₹)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isFieldReadOnly('arsAwardedAmount')}/></FormControl><FormMessage /></FormItem>)} />
                          <FormField name="arsTenderNo" control={form.control} render={({ field }) => (
                              <FormItem>
                                  <FormLabel>Tender No.</FormLabel>
                                  <Select onValueChange={(value) => field.onChange(value === '_clear_' ? '' : value)} value={field.value ?? ''} disabled={isFieldReadOnly('arsTenderNo')}>
                                      <FormControl><SelectTrigger><SelectValue placeholder="Select a Tender" /></SelectTrigger></FormControl>
                                      <SelectContent className="max-h-80">
                                          <SelectItem value="_clear_" onSelect={(e) => { e.preventDefault(); field.onChange(''); }}>-- Clear Selection --</SelectItem>
                                          {sortedTenders.filter(t => t.eTenderNo).map(t => <SelectItem key={t.id} value={t.eTenderNo!}>{t.eTenderNo}</SelectItem>)}
                                      </SelectContent>
                                  </Select>
                                  <FormMessage />
                              </FormItem>
                          )} />
                           <FormField name="arsContractorName" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Contractor</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} readOnly className="bg-muted min-h-[40px]"/></FormControl><FormMessage/></FormItem> )}/>
                           {tenderSupervisors.length > 1 ? (
                              <FormField name="supervisorUid" control={form.control} render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Supervisor</FormLabel>
                                    <Select onValueChange={(uid) => handleSupervisorDropdownChange(uid)} value={field.value || ""}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select a Supervisor" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {tenderSupervisors.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name} ({s.designation})</SelectItem>))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            ) : (
                               <FormItem>
                                    <FormLabel>Supervisor</FormLabel>
                                    <FormControl>
                                        <Textarea value={form.getValues('supervisorName') ? `${form.getValues('supervisorName')}, ${supervisorList.find(s => s.uid === form.getValues('supervisorUid'))?.designation || ''}` : ''} readOnly className="bg-muted min-h-[40px]" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                           <FormField name="arsStatus" control={form.control} render={({ field }) => (
                                <FormItem>
                                    <FormLabel>ARS Status <span className="text-destructive">*</span></FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value} disabled={isFieldReadOnly('arsStatus')}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {supervisorWorkStatusOptions.map(o => (
                                                <SelectItem key={o} value={o}>{o}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <CompletionDateField isFieldReadOnly={isFieldReadOnly} />
                          <FormField name="totalExpenditure" control={form.control} render={({ field }) => (<FormItem><FormLabel>Expenditure (₹)</FormLabel><FormControl><Input type="number" step="any" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isFieldReadOnly('totalExpenditure')}/></FormControl><FormMessage /></FormItem>)} />
                          <FormField name="noOfBeneficiary" control={form.control} render={({ field }) => (<FormItem><FormLabel>No. of Beneficiaries</FormLabel><FormControl><Input placeholder="e.g., 50 Families" {...field} value={field.value ?? ""} readOnly={isFieldReadOnly('noOfBeneficiary')} /></FormControl><FormMessage /></FormItem>)} />
                          <FormField name="workRemarks" control={form.control} render={({ field }) => (<FormItem className="md:col-span-3"><FormLabel>Remarks</FormLabel><FormControl><Textarea placeholder="Additional remarks..." {...field} value={field.value ?? ""} readOnly={isFieldReadOnly('workRemarks')} /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                        <div className="flex justify-end pt-8 space-x-3">
                           <Button type="button" variant="outline" onClick={() => router.push(returnPath)} disabled={isSubmitting}><X className="mr-2 h-4 w-4" />Cancel</Button>
                           {!(isViewer || isFormDisabledForSupervisor) && <Button type="submit" disabled={isSubmitting}> {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} {isEditing ? "Save Changes" : "Create Entry"} </Button>}
                        </div>
                      </form>
                    </FormProvider>
                </CardContent>
            </Card>
        </div>
    );
}
