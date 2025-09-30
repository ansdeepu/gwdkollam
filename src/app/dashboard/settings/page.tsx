// src/app/dashboard/settings/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, PlusCircle, Building, MapPin, University, Loader2, ShieldAlert, Edit, FileUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { getFirestore, collection, addDoc, deleteDoc, onSnapshot, query, orderBy, doc, writeBatch, updateDoc } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { usePageHeader } from '@/hooks/usePageHeader';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import ExcelJS from 'exceljs';

export const dynamic = 'force-dynamic';

const db = getFirestore(app);

// Schemas
const OfficeAddressSchema = z.object({
  officeName: z.string().min(1, "Office Name is required."),
  address: z.string().optional(),
  phoneNo: z.string().optional(),
  districtOfficer: z.string().optional(),
  gstNo: z.string().optional(),
  panNo: z.string().optional(),
  otherDetails: z.string().optional(),
});
type OfficeAddressFormData = z.infer<typeof OfficeAddressSchema>;
interface OfficeAddress extends OfficeAddressFormData {
  id: string;
}

interface SettingItem {
  id: string;
  name: string;
}

// Office Address Form Dialog
const OfficeAddressDialog = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  initialData,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: OfficeAddressFormData) => void;
  isSubmitting: boolean;
  initialData?: OfficeAddress | null;
}) => {
  const form = useForm<OfficeAddressFormData>({
    resolver: zodResolver(OfficeAddressSchema),
    defaultValues: initialData || {
      officeName: '', address: '', phoneNo: '', districtOfficer: '', gstNo: '', panNo: '', otherDetails: '',
    },
  });

  useEffect(() => {
    form.reset(initialData || { officeName: '', address: '', phoneNo: '', districtOfficer: '', gstNo: '', panNo: '', otherDetails: '' });
  }, [initialData, form]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Office Address' : 'Add New Office Address'}</DialogTitle>
          <DialogDescription>Fill in the details for the office location.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField name="officeName" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Office Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
              <FormField name="districtOfficer" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Name of District Officer</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
            </div>
            <FormField name="address" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Address</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField name="phoneNo" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Phone No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField name="gstNo" control={form.control} render={({ field }) => ( <FormItem><FormLabel>GST No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField name="panNo" control={form.control} render={({ field }) => ( <FormItem><FormLabel>PAN No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
            </div>
            <FormField name="otherDetails" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Other Details</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};


// Main Settings Component for a single collection
interface SettingsCollectionCardProps {
  collectionName: string;
  title: string;
  description: string;
  icon: React.ElementType;
}

const SettingsCollectionCard: React.FC<SettingsCollectionCardProps> = ({ collectionName, title, description, icon: Icon }) => {
  const { user } = useAuth();
  const canManage = user?.role === 'editor';
  const { toast } = useToast();
  const [items, setItems] = useState<SettingItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<SettingItem | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query(collection(db, collectionName), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedItems = snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
      setItems(fetchedItems);
      setIsLoading(false);
    }, (error) => {
      console.error(`Error fetching ${collectionName}:`, error);
      toast({ title: `Error loading ${title}`, description: error.message, variant: 'destructive' });
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [collectionName, toast, title]);

  const handleAddItem = async () => {
    if (!newItemName.trim() || !canManage) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, collectionName), { name: newItemName.trim() });
      toast({ title: `${title} Added`, description: `"${newItemName.trim()}" has been added.` });
      setNewItemName('');
    } catch (error: any) {
      toast({ title: `Error adding ${title}`, description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const confirmDelete = async () => {
    if (!itemToDelete || !canManage) return;
    try {
        await deleteDoc(doc(db, collectionName, itemToDelete.id));
        toast({ title: `${title} Deleted`, description: `"${itemToDelete.name}" has been removed.` });
    } catch (error: any) {
        toast({ title: `Error deleting ${title}`, description: error.message, variant: 'destructive' });
    } finally {
        setItemToDelete(null);
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
            
            const lsgWorksheet = workbook.getWorksheet('Sheet1');
            const constituencyWorksheet = workbook.getWorksheet('Sheet1');

            const batch = writeBatch(db);
            const lsgSet = new Set<string>();
            const constituencySet = new Set<string>();
            
            if (collectionName === 'localSelfGovernments' && lsgWorksheet) {
              lsgWorksheet.eachRow((row, rowNumber) => {
                  if (rowNumber > 1) { // Skip header
                      const cellValue = row.getCell(1).value;
                      if (cellValue) lsgSet.add(String(cellValue).trim());
                  }
              });
              lsgSet.forEach(name => { if (name) batch.set(doc(collection(db, 'localSelfGovernments')), { name }); });
            }

            if (collectionName === 'constituencies' && constituencyWorksheet) {
                constituencyWorksheet.eachRow((row, rowNumber) => {
                    if (rowNumber > 1) {
                        const cellValue = row.getCell(2).value;
                        if (cellValue) constituencySet.add(String(cellValue).trim());
                    }
                });
                const extraConstituencies = ['Kollam', 'Eravipuram'];
                extraConstituencies.forEach(c => constituencySet.add(c));
                constituencySet.forEach(name => { if (name) batch.set(doc(collection(db, 'constituencies')), { name }); });
            }

            await batch.commit();
            toast({ title: 'Import Successful', description: `Data from Excel has been imported.` });

        } catch (error: any) {
            toast({ title: 'Import Failed', description: error.message, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
            if(fileInputRef.current) fileInputRef.current.value = "";
        }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Icon className="h-5 w-5 text-primary" />{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {canManage && (
          <div className="flex flex-wrap gap-2 mb-4">
            <Input
              placeholder={`New ${title}...`}
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              disabled={isSubmitting}
              className="flex-grow min-w-[200px]"
            />
            <Button onClick={handleAddItem} disabled={isSubmitting || !newItemName.trim()}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
              <span className="ml-2">Add</span>
            </Button>
            {(collectionName === 'localSelfGovernments' || collectionName === 'constituencies') && (
              <>
                <input type="file" ref={fileInputRef} onChange={handleExcelImport} className="hidden" accept=".xlsx, .xls" />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isSubmitting}>
                    <FileUp className="mr-2 h-4 w-4" /> Import Excel
                </Button>
              </>
            )}
          </div>
        )}
        <ScrollArea className="h-60 w-full rounded-md border">
          <div className="p-4">
            {isLoading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : items.length > 0 ? (
              <ul className="space-y-2">
                {items.map((item) => (
                  <li key={item.id} className="flex items-center justify-between p-2 rounded-md bg-secondary/50">
                    <span className="text-sm font-medium">{item.name}</span>
                    {canManage && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setItemToDelete(item)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-center text-muted-foreground py-4">No items added yet.</p>
            )}
          </div>
        </ScrollArea>
        
        <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete the item "<strong>{itemToDelete?.name}</strong>". This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

// Main Page Component
export default function SettingsPage() {
  const { setHeader } = usePageHeader();
  const { user } = useAuth();
  const { toast } = useToast();
  const canManage = user?.role === 'editor';

  const [officeAddresses, setOfficeAddresses] = useState<OfficeAddress[]>([]);
  const [isLoadingOffices, setIsLoadingOffices] = useState(true);
  const [isSubmittingOffice, setIsSubmittingOffice] = useState(false);
  const [isOfficeDialogOpen, setIsOfficeDialogOpen] = useState(false);
  const [editingOffice, setEditingOffice] = useState<OfficeAddress | null>(null);
  const [officeToDelete, setOfficeToDelete] = useState<OfficeAddress | null>(null);

  useEffect(() => {
    setHeader('Application Settings', 'Manage dropdown options and other application-wide settings.');
  }, [setHeader]);
  
  useEffect(() => {
    const q = query(collection(db, 'officeAddresses'), orderBy('officeName', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OfficeAddress));
      setOfficeAddresses(fetchedItems);
      setIsLoadingOffices(false);
    }, (error) => {
      console.error('Error fetching office addresses:', error);
      toast({ title: 'Error Loading Office Addresses', description: error.message, variant: 'destructive' });
      setIsLoadingOffices(false);
    });
    return () => unsubscribe();
  }, [toast]);

  const handleOfficeSubmit = async (data: OfficeAddressFormData) => {
    if (!canManage) return;
    setIsSubmittingOffice(true);
    try {
      if (editingOffice) {
        await updateDoc(doc(db, 'officeAddresses', editingOffice.id), data);
        toast({ title: 'Office Address Updated' });
      } else {
        await addDoc(collection(db, 'officeAddresses'), data);
        toast({ title: 'Office Address Added' });
      }
      setIsOfficeDialogOpen(false);
      setEditingOffice(null);
    } catch (error: any) {
      toast({ title: 'Error Saving Office', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmittingOffice(false);
    }
  };

  const confirmDeleteOffice = async () => {
    if (!officeToDelete || !canManage) return;
    try {
      await deleteDoc(doc(db, 'officeAddresses', officeToDelete.id));
      toast({ title: 'Office Deleted', description: `"${officeToDelete.officeName}" has been removed.` });
    } catch (error: any) {
      toast({ title: 'Error Deleting Office', description: error.message, variant: 'destructive' });
    } finally {
      setOfficeToDelete(null);
    }
  };
  
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

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="lg:col-span-2">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center gap-2"><Building className="h-5 w-5 text-primary" />Office Addresses</CardTitle>
                    {canManage && (
                        <Button onClick={() => { setEditingOffice(null); setIsOfficeDialogOpen(true); }}>
                        <PlusCircle className="h-4 w-4 mr-2" /> Add Office
                        </Button>
                    )}
                </div>
                <CardDescription>Manage the list of office addresses and their details.</CardDescription>
            </CardHeader>
            <CardContent>
                 <ScrollArea className="h-72 w-full rounded-md border">
                    <div className="p-4">
                        {isLoadingOffices ? (
                        <div className="flex items-center justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                        ) : officeAddresses.length > 0 ? (
                        <ul className="space-y-2">
                            {officeAddresses.map((office) => (
                            <li key={office.id} className="flex items-center justify-between p-3 rounded-md bg-secondary/50">
                                <div>
                                    <p className="text-sm font-semibold">{office.officeName}</p>
                                    <p className="text-xs text-muted-foreground">{office.districtOfficer || 'N/A'}</p>
                                </div>
                                {canManage && (
                                <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingOffice(office); setIsOfficeDialogOpen(true); }}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setOfficeToDelete(office)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                                )}
                            </li>
                            ))}
                        </ul>
                        ) : (
                        <p className="text-sm text-center text-muted-foreground py-4">No office addresses added yet.</p>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
        
        <SettingsCollectionCard 
          collectionName="localSelfGovernments" 
          title="Local Self Governments" 
          description="Manage the list of local self governments."
          icon={University} 
        />
        <SettingsCollectionCard 
          collectionName="constituencies" 
          title="Constituencies (LAC)" 
          description="Manage the list of legislative assembly constituencies."
          icon={MapPin} 
        />
      </div>

      <OfficeAddressDialog
        isOpen={isOfficeDialogOpen}
        onClose={() => setIsOfficeDialogOpen(false)}
        onSubmit={handleOfficeSubmit}
        isSubmitting={isSubmittingOffice}
        initialData={editingOffice}
      />
      
      <AlertDialog open={!!officeToDelete} onOpenChange={(open) => !open && setOfficeToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>This will permanently delete the office "<strong>{officeToDelete?.officeName}</strong>". This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDeleteOffice} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
