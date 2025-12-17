
// src/app/dashboard/settings/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { usePageHeader } from '@/hooks/usePageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { getFirestore, collection, addDoc, deleteDoc, onSnapshot, query, orderBy, doc, writeBatch, updateDoc, getDocs, setDoc } from "firebase/firestore";
import { app } from "@/lib/firebase";
import NewBidderForm, { type NewBidderFormData } from '@/components/e-tender/NewBidderForm';
import type { Bidder as BidderType } from '@/lib/schemas/eTenderSchema';
import { useDataStore, type OfficeAddress } from '@/hooks/use-data-store';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/useAuth';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import ExcelJS from 'exceljs';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { LsgConstituencyMap, StaffMember, Designation } from '@/lib/schemas';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';

const Loader2 = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
);
const UserPlus = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>
);
const Users = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
);
const Edit = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
);
const Trash2 = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
);
const ArrowLeft = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
);
const Move = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="5 9 2 12 5 15"/><polyline points="9 5 12 2 15 5"/><polyline points="15 19 12 22 9 19"/><polyline points="19 9 22 12 19 15"/><line x1="2" x2="22" y1="12" y2="12"/><line x1="12" x2="12" y1="2" y2="22"/></svg>
);
const Eye = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
);
const Building = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect width="16" height="20" x="4" y="2" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>
);
const FileUp = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M12 12v-6"/><path d="m9 9 3-3 3 3"/></svg>
);
const Download = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
);
const ShieldAlert = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
);


const db = getFirestore(app);

// Schemas
const OfficeAddressSchema = z.object({
  officeName: z.string().min(1, "Office Name is required."),
  officeNameMalayalam: z.string().optional(),
  address: z.string().optional(),
  addressMalayalam: z.string().optional(),
  phoneNo: z.string().optional(),
  email: z.string().email({ message: "Please enter a valid email." }).optional().or(z.literal('')),
  districtOfficerStaffId: z.string().optional(),
  districtOfficer: z.string().optional(),
  gstNo: z.string().optional(),
  panNo: z.string().optional(),
  otherDetails: z.string().optional(),
});
type OfficeAddressFormData = z.infer<typeof OfficeAddressSchema>;


const getInitials = (name?: string) => {
  if (!name) return 'DO';
  return name.split(' ').map(n => n[0]).join('').toUpperCase();
};

const officerDesignations: Designation[] = [
    "Executive Engineer", "Senior Hydrogeologist", "Assistant Executive Engineer", "Hydrogeologist"
];


// Office Address Form Dialog
const OfficeAddressDialog = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  initialData,
  staffMembers
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: OfficeAddressFormData) => void;
  isSubmitting: boolean;
  initialData?: OfficeAddress | null;
  staffMembers: StaffMember[];
}) => {
    const officerList = staffMembers.filter(s => 
        officerDesignations.includes(s.designation as Designation) && s.status === 'Active'
    );
    
    const form = useForm<OfficeAddressFormData>({
        resolver: zodResolver(OfficeAddressSchema),
        defaultValues: initialData || {
            officeName: '', officeNameMalayalam: '', address: '', addressMalayalam: '', 
            phoneNo: '', email: '', districtOfficerStaffId: '', districtOfficer: '', 
            gstNo: '', panNo: '', otherDetails: '',
        },
    });

    useEffect(() => {
        form.reset(initialData || { officeName: '', officeNameMalayalam: '', address: '', addressMalayalam: '', phoneNo: '', email: '', districtOfficerStaffId: '', districtOfficer: '', gstNo: '', panNo: '', otherDetails: '' });
    }, [initialData, form]);

    const handleOfficerChange = (staffId: string) => {
        const selectedStaff = officerList.find(s => s.id === staffId);
        form.setValue('districtOfficerStaffId', staffId);
        form.setValue('districtOfficer', selectedStaff?.name || '');
    };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent onPointerDownOutside={(e) => e.preventDefault()} className="sm:max-w-3xl">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle>{initialData ? 'Edit Office Address' : 'Add New Office Address'}</DialogTitle>
          <DialogDescription>Fill in the details for the office location.</DialogDescription>
        </DialogHeader>
        <div className="px-6 pb-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField name="officeName" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Office Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                  <FormField name="officeNameMalayalam" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Office Name (In Malayalam)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                  <FormField name="address" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Address</FormLabel><FormControl><Textarea {...field} className="min-h-[40px]"/></FormControl><FormMessage /></FormItem> )}/>
                  <FormField name="addressMalayalam" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Address (In Malayalam)</FormLabel><FormControl><Textarea {...field} className="min-h-[40px]"/></FormControl><FormMessage /></FormItem> )}/>
              </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                      name="districtOfficerStaffId"
                      control={form.control}
                      render={({ field }) => (
                      <FormItem>
                          <FormLabel>Name of District Officer</FormLabel>
                          <Select onValueChange={(value) => handleOfficerChange(value)} value={field.value}>
                              <FormControl><SelectTrigger><SelectValue placeholder="Select an Officer" /></SelectTrigger></FormControl>
                              <SelectContent>
                                  {officerList.map(officer => <SelectItem key={officer.id} value={officer.id}>{officer.name} ({officer.designation})</SelectItem>)}
                              </SelectContent>
                          </Select>
                          <FormMessage />
                      </FormItem>
                      )}
                  />
                    <div className="grid grid-cols-1 gap-4">
                        <FormField name="phoneNo" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Phone No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField name="email" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                  <FormField name="gstNo" control={form.control} render={({ field }) => ( <FormItem><FormLabel>GST No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                  <FormField name="panNo" control={form.control} render={({ field }) => ( <FormItem><FormLabel>PAN No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
              </div>

              <FormField name="otherDetails" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Other Details</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
              
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
};


// Main Page Component
export default function SettingsPage() {
  const { setHeader } = usePageHeader();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const { allLsgConstituencyMaps, allStaffMembers, refetchLsgConstituencyMaps, officeAddress, refetchOfficeAddress } = useDataStore();
  const canManage = user?.role === 'editor';

  const [isLoadingOffices, setIsLoadingOffices] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOfficeDialogOpen, setIsOfficeDialogOpen] = useState(false);
  const [isClearingData, setIsClearingData] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const router = useRouter();

  const [isListDialogOpen, setIsListDialogOpen] = useState(false);
  const [listDialogContent, setListDialogContent] = useState<{ title: string; items: string[] }>({ title: '', items: [] });

  useEffect(() => {
    setHeader('General Settings', 'Manage dropdown options and other application-wide settings.');
  }, [setHeader]);
  
  useEffect(() => {
    setIsLoadingOffices(false);
  }, [officeAddress]);

  const handleOfficeSubmit = async (data: OfficeAddressFormData) => {
    if (!canManage) return;
    setIsSubmitting(true);
    try {
      if (officeAddress) {
        await updateDoc(doc(db, 'officeAddresses', officeAddress.id), { ...data });
        toast({ title: 'Office Address Updated' });
      } else {
        await addDoc(collection(db, 'officeAddresses'), { ...data });
        toast({ title: 'Office Address Added' });
      }
      refetchOfficeAddress();
      setIsOfficeDialogOpen(false);
    } catch (error: any) {
      toast({ title: 'Error Saving Office', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExcelImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsSubmitting(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const buffer = e.target?.result;
            if (!buffer) throw new Error("Failed to read file.");
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(buffer as ArrayBuffer);
            
            const worksheet = workbook.getWorksheet(1);
            if (!worksheet) throw new Error("No worksheet found in the Excel file.");

            const lsgDataMap = new Map<string, Set<string>>();
            const maxConstituencyColumns = 5; // Read up to 5 constituency columns

            worksheet.eachRow((row, rowNumber) => {
                if (rowNumber > 1) { // Skip header
                    const lsgValue = row.getCell(1).value?.toString().trim();
                    if (lsgValue) {
                        if (!lsgDataMap.has(lsgValue)) {
                            lsgDataMap.set(lsgValue, new Set());
                        }
                        for (let i = 2; i <= 1 + maxConstituencyColumns; i++) {
                            const constituencyValue = row.getCell(i).value?.toString().trim();
                            if (constituencyValue) {
                                lsgDataMap.get(lsgValue)!.add(constituencyValue);
                            }
                        }
                    }
                }
            });

            if (lsgDataMap.size === 0) {
              throw new Error("No valid data found in the Excel file.");
            }
            
            const batch = writeBatch(db);
            const existingLsgDocs = await getDocs(query(collection(db, 'localSelfGovernments')));
            const existingLsgMap = new Map(existingLsgDocs.docs.map(d => [d.data().name, d.id]));

            lsgDataMap.forEach((constituenciesSet, lsgName) => {
              const constituenciesArray = Array.from(constituenciesSet);
              const data = { name: lsgName, constituencies: constituenciesArray };
              
              const existingId = existingLsgMap.get(lsgName);
              if (existingId) {
                // Update existing document
                batch.set(doc(db, 'localSelfGovernments', existingId), data, { merge: true });
              } else {
                // Add new document
                batch.set(doc(collection(db, 'localSelfGovernments')), data);
              }
            });

            await batch.commit();
            refetchLsgConstituencyMaps(); // Trigger data refresh
            toast({ title: 'Import Successful', description: `Data for ${lsgDataMap.size} Local Self Governments has been imported/updated.` });

        } catch (error: any) {
            toast({ title: 'Import Failed', description: error.message, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
            if(fileInputRef.current) fileInputRef.current.value = "";
        }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDownloadTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("LSG_Constituency_Template");

    const headers = ['Local Self Government'];
    for (let i = 1; i <= 5; i++) {
        headers.push('Constituency (LAC)');
    }
    worksheet.getRow(1).values = headers;
    worksheet.getRow(1).font = { bold: true };
    
    worksheet.addRow(["Chavara Grama Panchayath", "Chavara"]);
    worksheet.addRow(["Neendakara Grama Panchayath", "Chavara"]);
    worksheet.addRow(["Kollam Corporation", "Chavara", "Kollam", "Eravipuram"]);

    worksheet.columns = [
        { header: headers[0], key: 'lsg', width: 40 },
        { header: headers[1], key: 'c1', width: 30 },
        { header: headers[2], key: 'c2', width: 30 },
        { header: headers[3], key: 'c3', width: 30 },
        { header: headers[4], key: 'c4', width: 30 },
        { header: headers[5], key: 'c5', width: 30 },
    ];
    
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "GWD_LSG_Constituency_Template.xlsx";
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: "Template Downloaded", description: "The Excel template has been downloaded." });
  };
  
  const handleClearAllData = async () => {
    setIsClearingData(true);
    try {
        const lsgQuery = query(collection(db, 'localSelfGovernments'));
        const [lsgSnapshot] = await Promise.all([getDocs(lsgQuery)]);

        const batch = writeBatch(db);
        lsgSnapshot.forEach(doc => batch.delete(doc.ref));
        
        await batch.commit();
        refetchLsgConstituencyMaps();
        toast({ title: 'Data Cleared', description: 'All Local Self Governments have been deleted.' });
    } catch (error: any) {
        toast({ title: 'Error Clearing Data', description: error.message, variant: 'destructive' });
    } finally {
        setIsClearingData(false);
        setIsClearConfirmOpen(false);
    }
  };

  const allConstituencies = useMemo(() => {
    const constituencySet = new Set<string>();
    allLsgConstituencyMaps.forEach(map => {
        map.constituencies.forEach(con => constituencySet.add(con));
    });
    return Array.from(constituencySet).sort();
  }, [allLsgConstituencyMaps]);
  
  const handleCountClick = (type: 'lsg' | 'constituency') => {
    if (type === 'lsg') {
        setListDialogContent({
            title: 'Local Self Governments',
            items: allLsgConstituencyMaps.map(m => m.name).sort(),
        });
    } else {
        setListDialogContent({
            title: 'Constituencies (LAC)',
            items: allConstituencies,
        });
    }
    setIsListDialogOpen(true);
  };
  
  if (authLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (user?.role !== 'editor' && user?.role !== 'viewer') {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <div className="space-y-6 p-6 text-center">
          <ShieldAlert className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Access Denied</h1>
          <p className="text-muted-foreground">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  const DetailRow = ({ label, value }: { label: string, value?: string }) => (
    value ? <div className="text-sm"><span className="font-medium text-muted-foreground">{label}:</span> {value}</div> : null
  );

  return (
    <>
    <div className="flex justify-end mb-4">
        <Button variant="destructive" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
        </Button>
    </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="lg:col-span-2">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <CardTitle className="flex items-center gap-2"><Building className="h-5 w-5 text-primary" />Office Address</CardTitle>
                    {canManage && (
                        <Button variant="outline" size="sm" onClick={() => { setIsOfficeDialogOpen(true); }}>
                           <Edit className="h-4 w-4 mr-2" /> {officeAddress ? 'Edit Details' : 'Add Details'}
                        </Button>
                    )}
                </div>
                <CardDescription>Manage the contact and official details for the department office.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoadingOffices ? (
                     <div className="flex items-center justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : officeAddress ? (
                    <div className="space-y-3 p-4 border rounded-lg bg-secondary/30">
                        <div className="flex flex-col md:flex-row md:items-start gap-4">
                            <div className="flex-1">
                                <h3 className="font-bold text-lg text-foreground whitespace-pre-wrap">{officeAddress.officeName}</h3>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{officeAddress.address}</p>
                                {officeAddress.officeNameMalayalam && <p className="text-md text-muted-foreground mt-2 whitespace-pre-wrap">{officeAddress.officeNameMalayalam}</p>}
                                {officeAddress.addressMalayalam && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{officeAddress.addressMalayalam}</p>}
                            </div>
                            <div className="flex items-center gap-3">
                                {officeAddress.districtOfficerPhotoUrl && (
                                    <Avatar>
                                        <AvatarImage src={officeAddress.districtOfficerPhotoUrl} alt={officeAddress.districtOfficer || 'District Officer'} data-ai-hint="person face" />
                                        <AvatarFallback>{getInitials(officeAddress.districtOfficer)}</AvatarFallback>
                                    </Avatar>
                                )}
                                <DetailRow label="District Officer" value={officeAddress.districtOfficer} />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-3 pt-3 border-t">
                            <DetailRow label="Phone No." value={officeAddress.phoneNo} />
                            <DetailRow label="Email" value={officeAddress.email} />
                            <DetailRow label="GST No." value={officeAddress.gstNo} />
                            <DetailRow label="PAN No." value={officeAddress.panNo} />
                        </div>
                        {officeAddress.otherDetails && <div className="pt-3 border-t"><p className="text-sm text-muted-foreground whitespace-pre-wrap">{officeAddress.otherDetails}</p></div>}
                    </div>
                ) : (
                    <div className="text-center py-8 text-muted-foreground">No office details have been added yet.</div>
                )}
            </CardContent>
        </Card>

        <Card className="lg:col-span-2">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center gap-2"><FileUp className="h-5 w-5 text-primary" />Bulk Data Management</CardTitle>
                    {canManage && (
                        <div className="flex items-center gap-2">
                           <input type="file" ref={fileInputRef} onChange={handleExcelImport} className="hidden" accept=".xlsx, .xls" />
                           <Button onClick={() => fileInputRef.current?.click()} disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileUp className="mr-2 h-4 w-4" />}
                                Import Excel
                           </Button>
                           <Button variant="outline" onClick={handleDownloadTemplate}><Download className="mr-2 h-4 w-4"/>Template</Button>
                           <Button variant="destructive" onClick={() => setIsClearConfirmOpen(true)} disabled={isClearingData}>
                                <Trash2 className="mr-2 h-4 w-4"/>
                                {isClearingData ? "Clearing..." : "Clear All Data"}
                           </Button>
                        </div>
                    )}
                </div>
                <CardDescription>Import or clear Local Self Governments and their associated Constituencies from a single Excel file.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button onClick={() => handleCountClick('lsg')} disabled={allLsgConstituencyMaps.length === 0} className="p-4 border rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    <h4 className="text-sm font-medium text-muted-foreground">Local Self Governments</h4>
                    <p className="text-4xl font-bold text-blue-600">{allLsgConstituencyMaps.length}</p>
                </button>
                <button onClick={() => handleCountClick('constituency')} disabled={allConstituencies.length === 0} className="p-4 border rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    <h4 className="text-sm font-medium text-muted-foreground">Constituencies (LAC)</h4>
                    <p className="text-4xl font-bold text-purple-600">{allConstituencies.length}</p>
                </button>
            </CardContent>
        </Card>
      </div>

      <OfficeAddressDialog
        isOpen={isOfficeDialogOpen}
        onClose={() => setIsOfficeDialogOpen(false)}
        onSubmit={handleOfficeSubmit}
        isSubmitting={isSubmitting}
        initialData={officeAddress}
        staffMembers={allStaffMembers}
      />
      
      <AlertDialog open={isClearConfirmOpen} onOpenChange={setIsClearConfirmOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>This will permanently delete ALL Local Self Governments from the database. This action cannot be undone and may affect existing records.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel disabled={isClearingData}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearAllData} disabled={isClearingData} className="bg-destructive hover:bg-destructive/90">
                    {isClearingData ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Yes, Delete All"}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isListDialogOpen} onOpenChange={setIsListDialogOpen}>
        <DialogContent onPointerDownOutside={(e) => e.preventDefault()} className="sm:max-w-md">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>{listDialogContent.title}</DialogTitle>
            <DialogDescription>Total count: {listDialogContent.items.length}</DialogDescription>
          </DialogHeader>
          <div className="p-6 pt-2">
            <ScrollArea className="h-96 pr-4">
                <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">Sl. No.</TableHead>
                        <TableHead>{listDialogContent.title}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {listDialogContent.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{item}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                </Table>
            </ScrollArea>
           </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
