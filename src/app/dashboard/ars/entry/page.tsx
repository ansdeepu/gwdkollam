
// src/app/dashboard/ars/entry/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from 'next/navigation';
import { useArsEntries } from "@/hooks/useArsEntries"; // Updated hook
import { arsWorkStatusOptions, ArsEntrySchema, type ArsEntryFormData, constituencyOptions, arsTypeOfSchemeOptions, type StaffMember } from "@/lib/schemas";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Save, X, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { format, isValid, parseISO, parse } from "date-fns";
import { useAuth, type UserProfile } from "@/hooks/useAuth";
import { useStaffMembers } from "@/hooks/useStaffMembers";
import { cn } from "@/lib/utils";
import { usePageHeader } from "@/hooks/usePageHeader";

const toDateOrNull = (value: any): Date | null => {
  if (!value) return null;
  if (value instanceof Date && isValid(value)) return value;
  // Handle Firestore Timestamp objects
  if (value && typeof value.seconds === 'number' && typeof value.nanoseconds === 'number') {
    const date = new Date(value.seconds * 1000 + value.nanoseconds / 1000000);
    return isValid(date) ? date : null;
  }
  if (typeof value === 'string') {
    let parsedDate = parseISO(value);
    if (isValid(parsedDate)) return parsedDate;
    
    // Also handle 'dd/MM/yyyy' format
    parsedDate = parse(value, 'dd/MM/yyyy', new Date());
    if (isValid(parsedDate)) return parsedDate;
  }
  return null;
};

const processDataForForm = (data: any): any => {
    if (!data) return data;
    const processed: { [key: string]: any } = {};
    for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
            const value = data[key];
             if (key.toLowerCase().includes('date')) {
                const date = toDateOrNull(value);
                processed[key] = date ? format(date, 'dd/MM/yyyy') : '';
            } else {
                processed[key] = value;
            }
        }
    }
    return processed;
};

export default function ArsEntryPage() {
    const { setHeader } = usePageHeader();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, fetchAllUsers } = useAuth();
    const { staffMembers, isLoading: staffIsLoading } = useStaffMembers();
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    
    const entryIdToEdit = searchParams.get('id');
    
    const { isLoading: entriesLoading, addArsEntry, getArsEntryById, updateArsEntry } = useArsEntries();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    
    const isEditing = !!entryIdToEdit;
    const canEdit = user?.role === 'editor';
    
     useEffect(() => {
        const title = isEditing ? 'Edit ARS Entry' : 'Add New ARS Entry';
        const description = isEditing 
            ? 'Update the details for the ARS site below.' 
            : 'Fill in the details to create a new ARS site entry.';
        setHeader(title, description);
    }, [isEditing, setHeader]);

    useEffect(() => {
        if (canEdit) {
            fetchAllUsers().then(setAllUsers);
        }
    }, [canEdit, fetchAllUsers]);

    const supervisorList = React.useMemo(() => {
        if (!canEdit) return [];
        return allUsers
            .filter(u => u.role === 'supervisor' && u.isApproved && u.staffId)
            .map(u => {
                const staffInfo = staffMembers.find(s => s.id === u.staffId && s.status === 'Active');
                if (staffInfo) {
                    return { ...staffInfo, id: u.uid, name: staffInfo.name };
                }
                return null;
            })
            .filter((s): s is StaffMember & { id: string; name: string } => s !== null);
    }, [allUsers, staffMembers, canEdit]);

    const form = useForm<ArsEntryFormData>({
        resolver: zodResolver(ArsEntrySchema),
        defaultValues: {
          fileNo: "", nameOfSite: "", constituency: undefined, arsTypeOfScheme: undefined, arsPanchayath: "",
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
        const loadArsEntry = async () => {
            if (isEditing && entryIdToEdit) {
                const entry = await getArsEntryById(entryIdToEdit);
                if (entry) {
                    const formData = processDataForForm(entry);
                    form.reset(formData);
                } else {
                    toast({ title: "Error", description: `ARS Entry with ID "${entryIdToEdit}" not found.`, variant: "destructive" });
                    router.push('/dashboard/ars');
                }
            }
        };
        loadArsEntry();
    }, [isEditing, entryIdToEdit, getArsEntryById, form, router, toast]);

    const handleFormSubmit = async (data: ArsEntryFormData) => {
        setIsSubmitting(true);
        
        // Convert date strings back to Date objects for Firestore
        const payload = {
            ...data,
            arsSanctionedDate: data.arsSanctionedDate ? parse(data.arsSanctionedDate, 'dd/MM/yyyy', new Date()) : undefined,
            dateOfCompletion: data.dateOfCompletion ? parse(data.dateOfCompletion, 'dd/MM/yyyy', new Date()) : undefined,
        };

        try {
            if (isEditing && entryIdToEdit) {
                await updateArsEntry(entryIdToEdit, payload);
                toast({ title: "ARS Site Updated", description: `Site "${data.nameOfSite}" has been updated.` });
            } else {
                await addArsEntry(payload);
                toast({ title: "ARS Site Added", description: `Site "${data.nameOfSite}" has been created.` });
            }
            router.push('/dashboard/ars');
        } catch (error: any) {
             toast({ title: "Error Processing Site", description: error.message, variant: "destructive" });
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
            <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Button>
            </div>
            <Card className="shadow-lg">
                <CardContent className="pt-6">
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6 p-1">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <FormField name="fileNo" control={form.control} render={({ field }) => (<FormItem><FormLabel>File No. <span className="text-destructive">*</span></FormLabel><FormControl><Input placeholder="File No." {...field} /></FormControl><FormMessage /></FormItem>)} />
                          <FormField name="nameOfSite" control={form.control} render={({ field }) => (<FormItem><FormLabel>Name of Site <span className="text-destructive">*</span></FormLabel><FormControl><Input placeholder="e.g., Anchal ARS" {...field} /></FormControl><FormMessage /></FormItem>)} />
                          <FormField name="constituency" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Constituency (LAC)</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select Constituency" /></SelectTrigger></FormControl><SelectContent>{[...constituencyOptions].sort((a, b) => a.localeCompare(b)).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
                          <FormField name="arsTypeOfScheme" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Type of Scheme</FormLabel><Select onValueChange={field.onChange} value={field.value ?? undefined}><FormControl><SelectTrigger><SelectValue placeholder="Select Type of Scheme" /></SelectTrigger></FormControl><SelectContent>{arsTypeOfSchemeOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
                          <FormField name="arsPanchayath" control={form.control} render={({ field }) => (<FormItem><FormLabel>Panchayath</FormLabel><FormControl><Input placeholder="Panchayath Name" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                          <FormField name="arsBlock" control={form.control} render={({ field }) => (<FormItem><FormLabel>Block</FormLabel><FormControl><Input placeholder="Block Name" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                          <FormField name="latitude" control={form.control} render={({ field }) => (<FormItem><FormLabel>Latitude</FormLabel><FormControl><Input type="number" step="any" placeholder="e.g., 8.8932" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)}/></FormControl><FormMessage /></FormItem>)} />
                          <FormField name="longitude" control={form.control} render={({ field }) => (<FormItem><FormLabel>Longitude</FormLabel><FormControl><Input type="number" step="any" placeholder="e.g., 76.6141" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} /></FormControl><FormMessage /></FormItem>)} />
                          <FormField name="arsNumberOfStructures" control={form.control} render={({ field }) => (<FormItem><FormLabel>Number of Structures</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)}/></FormControl><FormMessage /></FormItem>)} />
                          <FormField name="arsStorageCapacity" control={form.control} render={({ field }) => (<FormItem><FormLabel>Storage Capacity (m3)</FormLabel><FormControl><Input type="number" step="any" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)}/></FormControl><FormMessage /></FormItem>)} />
                          <FormField name="arsNumberOfFillings" control={form.control} render={({ field }) => (<FormItem><FormLabel>No. of Fillings</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} /></FormControl><FormMessage /></FormItem>)} />
                          <FormField name="estimateAmount" control={form.control} render={({ field }) => (<FormItem><FormLabel>Estimate Amount (₹)</FormLabel><FormControl><Input type="number" step="any" placeholder="e.g., 500000" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)}/></FormControl><FormMessage /></FormItem>)} />
                          <FormField name="arsAsTsDetails" control={form.control} render={({ field }) => (<FormItem><FormLabel>AS/TS Accorded Details</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                          <FormField name="tsAmount" control={form.control} render={({ field }) => (<FormItem><FormLabel>AS/TS Amount (₹)</FormLabel><FormControl><Input type="number" step="any" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)}/></FormControl><FormMessage /></FormItem>)} />
                           <FormField name="arsSanctionedDate" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Sanctioned Date</FormLabel><FormControl><Input placeholder="dd/mm/yyyy" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem> )} />
                          <FormField name="arsTenderedAmount" control={form.control} render={({ field }) => (<FormItem><FormLabel>Tendered Amount (₹)</FormLabel><FormControl><Input type="number" step="any" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)}/></FormControl><FormMessage /></FormItem>)} />
                          <FormField name="arsAwardedAmount" control={form.control} render={({ field }) => (<FormItem><FormLabel>Awarded Amount (₹)</FormLabel><FormControl><Input type="number" step="any" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)}/></FormControl><FormMessage /></FormItem>)} />
                          <FormField name="workStatus" control={form.control} render={({ field }) => (<FormItem><FormLabel>Present Status <span className="text-destructive">*</span></FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger></FormControl><SelectContent>{arsWorkStatusOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                           <FormField name="dateOfCompletion" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Completion Date</FormLabel><FormControl><Input placeholder="dd/mm/yyyy" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem> )} />
                          <FormField name="totalExpenditure" control={form.control} render={({ field }) => (<FormItem><FormLabel>Expenditure (₹)</FormLabel><FormControl><Input type="number" step="any" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)}/></FormControl><FormMessage /></FormItem>)} />
                          <FormField name="noOfBeneficiary" control={form.control} render={({ field }) => (<FormItem><FormLabel>No. of Beneficiaries</FormLabel><FormControl><Input placeholder="e.g., 50 Families" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
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
                          <FormField name="workRemarks" control={form.control} render={({ field }) => (<FormItem className="md:col-span-3"><FormLabel>Remarks</FormLabel><FormControl><Textarea placeholder="Additional remarks..." {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
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
