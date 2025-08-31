
// src/app/dashboard/ars/entry/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from 'next/navigation';
import { useFileEntries } from "@/hooks/useFileEntries";
import { type DataEntryFormData, type SiteDetailFormData, arsWorkStatusOptions, NewArsEntrySchema, type NewArsEntryFormData, constituencyOptions, type Constituency, arsTypeOfSchemeOptions, type StaffMember, type SiteWorkStatus } from "@/lib/schemas";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Save, X, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { format, isValid } from "date-fns";
import { useAuth, type UserProfile } from "@/hooks/useAuth";
import { useStaffMembers } from "@/hooks/useStaffMembers";
import { cn } from "@/lib/utils";


export default function ArsEntryPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, fetchAllUsers } = useAuth();
    const { staffMembers, isLoading: staffIsLoading } = useStaffMembers();
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    
    const fileNoToEdit = searchParams.get('fileNo');
    const siteNameToEdit = searchParams.get('siteName');
    
    const { isLoading: entriesLoading, addFileEntry, getFileEntry } = useFileEntries();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    
    const isEditing = !!(fileNoToEdit && siteNameToEdit);
    const canEdit = user?.role === 'editor';
    
    useEffect(() => {
        if (canEdit) {
            fetchAllUsers().then(setAllUsers);
        }
    }, [canEdit, fetchAllUsers]);

    const supervisorList = React.useMemo(() => {
        if (!canEdit) return [];
        // Filter users by role, then find their corresponding active staff member profile
        return allUsers
            .filter(u => u.role === 'supervisor' && u.isApproved && u.staffId)
            .map(u => {
                const staffInfo = staffMembers.find(s => s.id === u.staffId && s.status === 'Active');
                if (staffInfo) {
                    return { ...staffInfo, id: u.uid, name: staffInfo.name }; // Use user UID as the ID for selection
                }
                return null;
            })
            .filter((s): s is StaffMember & { id: string; name: string } => s !== null);
    }, [allUsers, staffMembers, canEdit]);


    const form = useForm<NewArsEntryFormData>({
        resolver: zodResolver(NewArsEntrySchema),
        defaultValues: {
          fileNo: fileNoToEdit || "", nameOfSite: siteNameToEdit || "", constituency: undefined, arsTypeOfScheme: undefined, arsPanchayath: "",
          arsBlock: "", latitude: undefined, longitude: undefined, arsNumberOfStructures: undefined,
          arsStorageCapacity: undefined, arsNumberOfFillings: undefined, estimateAmount: undefined,
          arsAsTsDetails: "", tsAmount: undefined, arsSanctionedDate: undefined, arsTenderedAmount: undefined,
          arsAwardedAmount: undefined, workStatus: undefined, dateOfCompletion: undefined,
          totalExpenditure: undefined, noOfBeneficiary: "", workRemarks: "",
          supervisorUid: null,
          supervisorName: null,
        },
    });

    useEffect(() => {
        if (isEditing && !entriesLoading) {
            const fileEntry = getFileEntry(fileNoToEdit);
            if (fileEntry) {
                const site = fileEntry.siteDetails?.find(s => s.nameOfSite === siteNameToEdit && s.isArsImport);
                if (site) {
                    // Ensure workStatus is a valid ArsWorkStatus, otherwise set to undefined
                    const validWorkStatus = site.workStatus && arsWorkStatusOptions.includes(site.workStatus as any)
                        ? site.workStatus as NewArsEntryFormData['workStatus']
                        : undefined;

                    form.reset({
                        fileNo: fileNoToEdit,
                        nameOfSite: site.nameOfSite,
                        constituency: fileEntry.constituency,
                        arsTypeOfScheme: site.arsTypeOfScheme,
                        arsPanchayath: site.arsPanchayath,
                        arsBlock: site.arsBlock,
                        latitude: site.latitude,
                        longitude: site.longitude,
                        arsNumberOfStructures: site.arsNumberOfStructures,
                        arsStorageCapacity: site.arsStorageCapacity,
                        arsNumberOfFillings: site.arsNumberOfFillings,
                        estimateAmount: site.estimateAmount,
                        arsAsTsDetails: site.arsAsTsDetails,
                        tsAmount: site.tsAmount,
                        arsSanctionedDate: site.arsSanctionedDate ? new Date(site.arsSanctionedDate) : undefined,
                        arsTenderedAmount: site.arsTenderedAmount,
                        arsAwardedAmount: site.arsAwardedAmount,
                        workStatus: validWorkStatus,
                        dateOfCompletion: site.dateOfCompletion ? new Date(site.dateOfCompletion) : undefined,
                        totalExpenditure: site.totalExpenditure,
                        noOfBeneficiary: site.noOfBeneficiary,
                        workRemarks: site.workRemarks,
                        supervisorUid: site.supervisorUid,
                        supervisorName: site.supervisorName,
                    });
                } else {
                     toast({ title: "Error", description: `ARS Site "${siteNameToEdit}" not found in file "${fileNoToEdit}".`, variant: "destructive" });
                     router.push('/dashboard/ars');
                }
            } else {
                 toast({ title: "Error", description: `File "${fileNoToEdit}" not found.`, variant: "destructive" });
                 router.push('/dashboard/ars');
            }
        }
    }, [isEditing, fileNoToEdit, siteNameToEdit, entriesLoading, getFileEntry, form, router, toast]);

    const handleFormSubmit = async (data: NewArsEntryFormData) => {
        setIsSubmitting(true);
        
        const siteData: SiteDetailFormData = {
            nameOfSite: data.nameOfSite, purpose: 'ARS', isArsImport: true, latitude: data.latitude, longitude: data.longitude, 
            estimateAmount: data.estimateAmount, tsAmount: data.tsAmount, workStatus: data.workStatus as SiteWorkStatus, 
            dateOfCompletion: data.dateOfCompletion, totalExpenditure: data.totalExpenditure, 
            noOfBeneficiary: data.noOfBeneficiary, workRemarks: data.workRemarks, arsTypeOfScheme: data.arsTypeOfScheme, 
            arsPanchayath: data.arsPanchayath, arsBlock: data.arsBlock, arsNumberOfStructures: data.arsNumberOfStructures, 
            arsStorageCapacity: data.arsStorageCapacity, arsNumberOfFillings: data.arsNumberOfFillings, 
            arsAsTsDetails: data.arsAsTsDetails, arsSanctionedDate: data.arsSanctionedDate, 
            arsTenderedAmount: data.arsTenderedAmount, arsAwardedAmount: data.arsAwardedAmount,
            supervisorUid: data.supervisorUid, supervisorName: data.supervisorName,
        };

        try {
            const existingFile = getFileEntry(data.fileNo);
            if (isEditing) {
                if (!fileNoToEdit || !siteNameToEdit) {
                    throw new Error("Could not find original file details to edit.");
                }
                const fileToUpdate = getFileEntry(fileNoToEdit);
                if (!fileToUpdate) throw new Error("Original file not found for update.");

                // If the site name was changed, check for uniqueness in the *same* file.
                if (data.nameOfSite !== siteNameToEdit) {
                    const isDuplicate = fileToUpdate.siteDetails?.some(s => s.nameOfSite === data.nameOfSite && s.isArsImport);
                    if (isDuplicate) {
                        form.setError("nameOfSite", { type: "manual", message: `An ARS site named "${data.nameOfSite}" already exists in File No. ${data.fileNo}.` });
                        throw new Error("Duplicate site name.");
                    }
                }
                
                const updatedSiteDetails = fileToUpdate.siteDetails?.map(site => 
                  (site.nameOfSite === siteNameToEdit && site.isArsImport) ? siteData : site
                ) ?? [];

                const updatedFile: DataEntryFormData = { ...fileToUpdate, constituency: data.constituency, siteDetails: updatedSiteDetails };
                await addFileEntry(updatedFile, fileNoToEdit);
                toast({ title: "ARS Site Updated", description: `Site "${data.nameOfSite}" has been updated.` });

            } else {
                let updatedFile: DataEntryFormData;

                if (existingFile) {
                    // Check for duplicate site name within the existing file
                    const isDuplicate = existingFile.siteDetails?.some(s => s.nameOfSite === data.nameOfSite && s.isArsImport);
                    if (isDuplicate) {
                        form.setError("nameOfSite", { type: "manual", message: `An ARS site named "${data.nameOfSite}" already exists in this file.` });
                        throw new Error("Duplicate site name.");
                    }
                    updatedFile = { ...existingFile, constituency: data.constituency, siteDetails: [...(existingFile.siteDetails || []), siteData] };
                } else {
                    // This is a new file, no need to check for duplicates within it.
                    updatedFile = {
                        fileNo: data.fileNo, applicantName: `Applicant for ${data.nameOfSite}`, constituency: data.constituency,
                        applicationType: 'Government_Others', fileStatus: 'File Under Process', siteDetails: [siteData],
                    };
                }
                await addFileEntry(updatedFile, existingFile?.fileNo);
                toast({ title: "ARS Site Added", description: `Site "${data.nameOfSite}" has been processed for File No. ${data.fileNo}.` });
            }
            router.push('/dashboard/ars');
        } catch (error: any) {
          if (error.message !== "Duplicate site name.") {
             toast({ title: "Error Processing Site", description: error.message, variant: "destructive" });
          }
        } finally {
          setIsSubmitting(false);
        }
    };

    if (entriesLoading || staffIsLoading) {
        return ( <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center"> <Loader2 className="h-12 w-12 animate-spin text-primary" /> <p className="ml-3 text-muted-foreground">Loading form data...</p> </div> );
    }

    if (!canEdit) {
        return (
            <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
                <p className="text-muted-foreground">You do not have permission to access this page.</p>
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            <Card className="shadow-lg">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>{isEditing ? 'Edit ARS Entry' : 'Add New ARS Entry'}</CardTitle>
                            <CardDescription>{isEditing ? 'Update the details for the ARS site below.' : 'Fill in the details to create a new ARS site entry.'}</CardDescription>
                        </div>
                         <Button variant="destructive" size="sm" onClick={() => router.back()}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6 p-1">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <FormField name="fileNo" control={form.control} render={({ field }) => (<FormItem><FormLabel>File No. <span className="text-destructive">*</span></FormLabel><FormControl><Input placeholder="File No." {...field} readOnly={isEditing} /></FormControl><FormMessage /></FormItem>)} />
                          <FormField name="nameOfSite" control={form.control} render={({ field }) => (<FormItem><FormLabel>Name of Site <span className="text-destructive">*</span></FormLabel><FormControl><Input placeholder="e.g., Anchal ARS" {...field} /></FormControl><FormMessage /></FormItem>)} />
                          <FormField name="constituency" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Constituency (LAC) <span className="text-destructive">*</span></FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select Constituency" /></SelectTrigger></FormControl><SelectContent>{[...constituencyOptions].sort((a, b) => a.localeCompare(b)).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
                          <FormField name="arsTypeOfScheme" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Type of Scheme</FormLabel><Select onValueChange={field.onChange} value={field.value ?? undefined}><FormControl><SelectTrigger><SelectValue placeholder="Select Type of Scheme" /></SelectTrigger></FormControl><SelectContent>{arsTypeOfSchemeOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
                          <FormField name="arsPanchayath" control={form.control} render={({ field }) => (<FormItem><FormLabel>Panchayath</FormLabel><FormControl><Input placeholder="Panchayath Name" {...field} /></FormControl><FormMessage /></FormItem>)} />
                          <FormField name="arsBlock" control={form.control} render={({ field }) => (<FormItem><FormLabel>Block</FormLabel><FormControl><Input placeholder="Block Name" {...field} /></FormControl><FormMessage /></FormItem>)} />
                          <FormField name="latitude" control={form.control} render={({ field }) => (<FormItem><FormLabel>Latitude</FormLabel><FormControl><Input type="number" step="any" placeholder="e.g., 8.8932" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)}/></FormControl><FormMessage /></FormItem>)} />
                          <FormField name="longitude" control={form.control} render={({ field }) => (<FormItem><FormLabel>Longitude</FormLabel><FormControl><Input type="number" step="any" placeholder="e.g., 76.6141" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} /></FormControl><FormMessage /></FormItem>)} />
                          <FormField name="arsNumberOfStructures" control={form.control} render={({ field }) => (<FormItem><FormLabel>Number of Structures</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)}/></FormControl><FormMessage /></FormItem>)} />
                          <FormField name="arsStorageCapacity" control={form.control} render={({ field }) => (<FormItem><FormLabel>Storage Capacity (m3)</FormLabel><FormControl><Input type="number" step="any" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)}/></FormControl><FormMessage /></FormItem>)} />
                          <FormField name="arsNumberOfFillings" control={form.control} render={({ field }) => (<FormItem><FormLabel>No. of Fillings</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} /></FormControl><FormMessage /></FormItem>)} />
                          <FormField name="estimateAmount" control={form.control} render={({ field }) => (<FormItem><FormLabel>Estimate Amount (₹)</FormLabel><FormControl><Input type="number" step="any" placeholder="e.g., 500000" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)}/></FormControl><FormMessage /></FormItem>)} />
                          <FormField name="arsAsTsDetails" control={form.control} render={({ field }) => (<FormItem><FormLabel>AS/TS Accorded Details</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                          <FormField name="tsAmount" control={form.control} render={({ field }) => (<FormItem><FormLabel>AS/TS Amount (₹)</FormLabel><FormControl><Input type="number" step="any" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)}/></FormControl><FormMessage /></FormItem>)} />
                          <FormField name="arsSanctionedDate" control={form.control} render={({ field }) => (<FormItem><FormLabel>Sanctioned Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value && isValid(field.value) ? format(field.value, "dd/MM/yyyy") : <span>Pick a date</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                          <FormField name="arsTenderedAmount" control={form.control} render={({ field }) => (<FormItem><FormLabel>Tendered Amount (₹)</FormLabel><FormControl><Input type="number" step="any" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)}/></FormControl><FormMessage /></FormItem>)} />
                          <FormField name="arsAwardedAmount" control={form.control} render={({ field }) => (<FormItem><FormLabel>Awarded Amount (₹)</FormLabel><FormControl><Input type="number" step="any" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)}/></FormControl><FormMessage /></FormItem>)} />
                          <FormField name="workStatus" control={form.control} render={({ field }) => (<FormItem><FormLabel>Present Status <span className="text-destructive">*</span></FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger></FormControl><SelectContent>{arsWorkStatusOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                          <FormField name="dateOfCompletion" control={form.control} render={({ field }) => (<FormItem><FormLabel>Completion Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value && isValid(field.value) ? format(field.value, "dd/MM/yyyy") : <span>Pick a date</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                          <FormField name="totalExpenditure" control={form.control} render={({ field }) => (<FormItem><FormLabel>Expenditure (₹)</FormLabel><FormControl><Input type="number" step="any" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)}/></FormControl><FormMessage /></FormItem>)} />
                          <FormField name="noOfBeneficiary" control={form.control} render={({ field }) => (<FormItem><FormLabel>No. of Beneficiaries</FormLabel><FormControl><Input placeholder="e.g., 50 Families" {...field} /></FormControl><FormMessage /></FormItem>)} />
                           <FormField
                                control={form.control}
                                name="supervisorUid"
                                render={({ field }) => (
                                <FormItem>
                                <FormLabel>Supervisor</FormLabel>
                                    <Select
                                        onValueChange={(value) => {
                                            const selectedStaff = supervisorList.find(s => s.id === value);
                                            form.setValue('supervisorUid', selectedStaff?.id || null);
                                            form.setValue('supervisorName', selectedStaff?.name || null);
                                        }}
                                        value={field.value || ''}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Assign a Supervisor" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="_unassign_" onSelect={(e) => { e.preventDefault(); form.setValue('supervisorUid', null); form.setValue('supervisorName', null); }}>-- Unassign --</SelectItem>
                                        {supervisorList.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.designation})</SelectItem>)}
                                    </SelectContent>
                                    </Select>
                                <FormMessage />
                                </FormItem>
                            )}/>
                          <FormField name="workRemarks" control={form.control} render={({ field }) => (<FormItem className="md:col-span-3"><FormLabel>Remarks</FormLabel><FormControl><Textarea placeholder="Additional remarks..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                        <div className="flex justify-end pt-8 space-x-3">
                           <Button type="button" variant="outline" onClick={() => router.push('/dashboard/ars')} disabled={isSubmitting}><X className="mr-2 h-4 w-4" />Cancel</Button>
                           <Button type="submit" disabled={isSubmitting}> {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} {isEditing ? "Save Changes" : "Create Entry"} </Button>
                        </div>
                      </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}

    