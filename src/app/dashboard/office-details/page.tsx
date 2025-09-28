// src/app/dashboard/office-details/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getFirestore, collection, doc, getDocs, writeBatch, query, orderBy, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { usePageHeader } from '@/hooks/usePageHeader';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, PlusCircle, Edit, Trash2, Save, X, ShieldAlert, Building, MapPin } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export const dynamic = 'force-dynamic';

const db = getFirestore(app);

// Schemas
const OfficeDetailsSchema = z.object({
  id: z.string().optional(),
  officeName: z.string().min(1, "Office name is required."),
  address: z.string().min(1, "Address is required."),
  phone: z.string().optional(),
  email: z.string().email("Invalid email address.").optional().or(z.literal("")),
});
type OfficeDetailsFormData = z.infer<typeof OfficeDetailsSchema>;

const LsgSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "LSG name is required."),
});
type Lsg = z.infer<typeof LsgSchema>;

const ConstituencySchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Constituency name is required."),
  lsgs: z.array(LsgSchema).optional(),
});
type Constituency = z.infer<typeof ConstituencySchema>;

// Constituency Form Dialog
function ConstituencyDialog({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  initialData,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string }) => void;
  isSubmitting: boolean;
  initialData?: { name: string } | null;
}) {
  const formSchema = z.object({ name: z.string().min(1, "Constituency name is required.") });
  const form = useForm<{ name: string }>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || { name: '' },
  });

  useEffect(() => {
    form.reset(initialData || { name: '' });
  }, [initialData, form]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Constituency' : 'Add New Constituency'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Constituency Name</FormLabel>
                  <FormControl><Input {...field} placeholder="e.g., Kollam" /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


export default function OfficeDetailsPage() {
  const { setHeader } = usePageHeader();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [officeDetails, setOfficeDetails] = useState<OfficeDetailsFormData | null>(null);
  const [constituencies, setConstituencies] = useState<Constituency[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Dialog states
  const [isConstituencyDialogOpen, setIsConstituencyDialogOpen] = useState(false);
  const [editingConstituency, setEditingConstituency] = useState<Constituency | null>(null);
  const [constituencyToDelete, setConstituencyToDelete] = useState<Constituency | null>(null);

  const [newLsgName, setNewLsgName] = useState("");
  const [editingLsg, setEditingLsg] = useState<{ constituencyId: string; lsg: Lsg } | null>(null);
  const [lsgToDelete, setLsgToDelete] = useState<{ constituencyId: string; lsgId: string } | null>(null);

  const officeDetailsForm = useForm<OfficeDetailsFormData>({
    resolver: zodResolver(OfficeDetailsSchema),
    defaultValues: { officeName: '', address: '', phone: '', email: '' },
  });

  const canManage = user?.role === 'editor';

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const officeDetailsQuery = query(collection(db, 'officeDetails'));
      const officeSnapshot = await getDocs(officeDetailsQuery);
      if (!officeSnapshot.empty) {
        const officeDoc = officeSnapshot.docs[0];
        const officeData = { id: officeDoc.id, ...officeDoc.data() } as OfficeDetailsFormData;
        setOfficeDetails(officeData);
        officeDetailsForm.reset(officeData);
      }

      const constituenciesQuery = query(collection(db, 'constituencies'), orderBy('name'));
      const constituenciesSnapshot = await getDocs(constituenciesQuery);
      const constituenciesData = constituenciesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Constituency));
      setConstituencies(constituenciesData);
    } catch (error) {
      console.error("Error fetching data: ", error);
      toast({ title: "Error", description: "Failed to load page data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast, officeDetailsForm]);

  useEffect(() => {
    setHeader('Settings', 'Manage office details and constituency-LSG mappings.');
    fetchData();
  }, [setHeader, fetchData]);

  const handleOfficeDetailsSubmit = async (data: OfficeDetailsFormData) => {
    setIsSubmitting(true);
    try {
        const { id, ...payload } = data; // Destructure to remove id
        const officeDetailsRef = collection(db, 'officeDetails');
        
        if (id) {
            // Update existing document
            const docRef = doc(officeDetailsRef, id);
            await updateDoc(docRef, payload);
        } else {
            // Add new document if no ID exists (e.g., first time setup)
            await addDoc(officeDetailsRef, payload);
        }

        toast({ title: "Success", description: "Office details have been saved." });
        await fetchData(); // Refetch to get the new ID if one was created
    } catch (error) {
        console.error("Error saving office details: ", error);
        toast({ title: "Error", description: "Failed to save office details.", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const handleConstituencySubmit = async (data: { name: string }) => {
    setIsSubmitting(true);
    try {
      if (editingConstituency) {
        await updateDoc(doc(db, 'constituencies', editingConstituency.id), { name: data.name });
        toast({ title: 'Success', description: 'Constituency updated.' });
      } else {
        await addDoc(collection(db, 'constituencies'), { name: data.name, lsgs: [] });
        toast({ title: 'Success', description: 'New constituency added.' });
      }
      setIsConstituencyDialogOpen(false);
      setEditingConstituency(null);
      await fetchData();
    } catch (error) {
       toast({ title: "Error", description: "Failed to save constituency.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddLsg = async (constituencyId: string) => {
    if (!newLsgName.trim()) {
      toast({ title: 'Validation Error', description: 'LSG name cannot be empty.', variant: 'destructive' });
      return;
    }
    const constituency = constituencies.find(c => c.id === constituencyId);
    if (!constituency) return;

    const updatedLsgs = [...(constituency.lsgs || []), { id: `lsg_${Date.now()}`, name: newLsgName.trim() }];
    await updateDoc(doc(db, 'constituencies', constituencyId), { lsgs: updatedLsgs });
    setNewLsgName("");
    await fetchData();
    toast({ title: 'Success', description: `Added LSG to ${constituency.name}.` });
  };
  
  const handleUpdateLsg = async () => {
    if (!editingLsg || !editingLsg.lsg.name.trim()) return;

    const { constituencyId, lsg } = editingLsg;
    const constituency = constituencies.find(c => c.id === constituencyId);
    if (!constituency) return;

    const updatedLsgs = (constituency.lsgs || []).map(l => (l.id === lsg.id ? { ...l, name: lsg.name.trim() } : l));
    await updateDoc(doc(db, 'constituencies', constituencyId), { lsgs: updatedLsgs });

    setEditingLsg(null);
    await fetchData();
    toast({ title: 'Success', description: 'LSG name updated.' });
  };
  
  const confirmDeleteConstituency = async () => {
    if (!constituencyToDelete) return;
    await deleteDoc(doc(db, 'constituencies', constituencyToDelete.id));
    setConstituencyToDelete(null);
    await fetchData();
    toast({ title: 'Success', description: `Constituency '${constituencyToDelete.name}' deleted.` });
  };

  const confirmDeleteLsg = async () => {
    if (!lsgToDelete) return;
    const { constituencyId, lsgId } = lsgToDelete;
    const constituency = constituencies.find(c => c.id === constituencyId);
    if (!constituency) return;

    const updatedLsgs = (constituency.lsgs || []).filter(l => l.id !== lsgId);
    await updateDoc(doc(db, 'constituencies', constituencyId), { lsgs: updatedLsgs });

    setLsgToDelete(null);
    await fetchData();
    toast({ title: 'Success', description: `LSG removed.` });
  };


  if (isLoading || authLoading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (!user || user.role === 'viewer') {
    return (
      <div className="space-y-6 p-6 text-center">
        <ShieldAlert className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Access Denied</h1>
        <p className="text-muted-foreground">You do not have permission to view or manage this page.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Building className="h-5 w-5" /> Office Details</CardTitle>
          <CardDescription>Manage the main office information.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...officeDetailsForm}>
            <form onSubmit={officeDetailsForm.handleSubmit(handleOfficeDetailsSubmit)} className="space-y-4">
              <FormField name="officeName" control={officeDetailsForm.control} render={({ field }) => (<FormItem><FormLabel>Office Name</FormLabel><FormControl><Input {...field} disabled={!canManage} /></FormControl><FormMessage /></FormItem>)} />
              <FormField name="address" control={officeDetailsForm.control} render={({ field }) => (<FormItem><FormLabel>Address</FormLabel><FormControl><Textarea {...field} disabled={!canManage} /></FormControl><FormMessage /></FormItem>)} />
              <FormField name="phone" control={officeDetailsForm.control} render={({ field }) => (<FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} disabled={!canManage} /></FormControl><FormMessage /></FormItem>)} />
              <FormField name="email" control={officeDetailsForm.control} render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} disabled={!canManage} /></FormControl><FormMessage /></FormItem>)} />
              {canManage && (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Office Details
                </Button>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" /> Constituency Details</CardTitle>
                <CardDescription>Manage constituencies and their Local Self-Governments (LSGs).</CardDescription>
              </div>
              {canManage && <Button onClick={() => setIsConstituencyDialogOpen(true)}><PlusCircle className="mr-2 h-4 w-4" /> Add Constituency</Button>}
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[60vh] pr-4">
            <Accordion type="single" collapsible className="w-full">
              {constituencies.map((c) => (
                <AccordionItem key={c.id} value={c.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex justify-between items-center w-full">
                      <span className="font-medium text-base">{c.name}</span>
                       {canManage && (
                        <div className="flex items-center gap-1 mr-2">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setEditingConstituency(c); setIsConstituencyDialogOpen(true); }}><Edit className="h-4 w-4"/></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); setConstituencyToDelete(c); }}><Trash2 className="h-4 w-4"/></Button>
                        </div>
                       )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="p-4 bg-secondary/30 rounded-b-md">
                    <h4 className="font-semibold mb-2">Local Self-Governments ({c.lsgs?.length || 0})</h4>
                    <ul className="space-y-2">
                      {c.lsgs?.map(lsg => (
                        <li key={lsg.id} className="flex justify-between items-center p-2 rounded bg-background">
                          {editingLsg?.lsg.id === lsg.id ? (
                            <Input value={editingLsg.lsg.name} onChange={(e) => setEditingLsg({ ...editingLsg, lsg: { ...editingLsg.lsg, name: e.target.value } })} className="h-8"/>
                          ) : (<span>{lsg.name}</span>)}
                           {canManage && (
                            <div className="flex items-center gap-1">
                              {editingLsg?.lsg.id === lsg.id ? (
                                <>
                                  <Button size="icon" className="h-7 w-7" onClick={handleUpdateLsg}><Save className="h-4 w-4" /></Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingLsg(null)}><X className="h-4 w-4" /></Button>
                                </>
                              ) : (
                                <>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingLsg({ constituencyId: c.id, lsg })}><Edit className="h-4 w-4"/></Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setLsgToDelete({ constituencyId: c.id, lsgId: lsg.id })}><Trash2 className="h-4 w-4"/></Button>
                                </>
                              )}
                            </div>
                           )}
                        </li>
                      ))}
                    </ul>
                    {canManage && (
                      <div className="flex gap-2 mt-4 pt-4 border-t">
                        <Input value={newLsgName} onChange={(e) => setNewLsgName(e.target.value)} placeholder="New LSG name..." className="h-9"/>
                        <Button onClick={() => handleAddLsg(c.id)} className="h-9"><PlusCircle className="h-4 w-4 mr-2"/> Add LSG</Button>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </ScrollArea>
        </CardContent>
      </Card>
      
      {canManage && (
        <>
            <ConstituencyDialog 
              isOpen={isConstituencyDialogOpen}
              onClose={() => { setIsConstituencyDialogOpen(false); setEditingConstituency(null); }}
              onSubmit={handleConstituencySubmit}
              isSubmitting={isSubmitting}
              initialData={editingConstituency}
            />
            <AlertDialog open={!!constituencyToDelete} onOpenChange={() => setConstituencyToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Delete Constituency?</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete '{constituencyToDelete?.name}'? This will also remove all LSGs under it. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDeleteConstituency}>Delete</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={!!lsgToDelete} onOpenChange={() => setLsgToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Delete LSG?</AlertDialogTitle><AlertDialogDescription>Are you sure you want to remove this LSG? This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDeleteLsg}>Delete</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
      )}
    </div>
  );
}
