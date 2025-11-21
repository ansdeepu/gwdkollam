// src/app/dashboard/bidders/page.tsx
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePageHeader } from '@/hooks/usePageHeader';
import { Loader2, UserPlus, Users, Edit, Trash2, ArrowUpDown, ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { getFirestore, collection, addDoc, getDocs, query, doc, updateDoc, deleteDoc, writeBatch, setDoc, orderBy } from "firebase/firestore";
import { app } from "@/lib/firebase";
import NewBidderForm, { type NewBidderFormData, type Bidder as BidderType } from '@/components/e-tender/NewBidderForm';
import { useDataStore } from '@/hooks/use-data-store';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const db = getFirestore(app);

const ReorderFormSchema = z.object({
    newPosition: z.coerce.number().int().min(1, "Position must be 1 or greater."),
});

export default function BiddersListPage() {
    const { setHeader } = usePageHeader();
    const router = useRouter();
    const { user } = useAuth();
    const { allBidders, refetchBidders } = useDataStore();
    const { toast } = useToast();

    const [isNewBidderDialogOpen, setIsNewBidderDialogOpen] = useState(false);
    const [isSubmittingBidder, setIsSubmittingBidder] = useState(false);

    const [bidderToEdit, setBidderToEdit] = useState<BidderType | null>(null);
    const [bidderToDelete, setBidderToDelete] = useState<BidderType | null>(null);
    const [isDeletingBidder, setIsDeletingBidder] = useState(false);

    const [bidderToReorder, setBidderToReorder] = useState<BidderType | null>(null);
    const [isReordering, setIsReordering] = useState(false);
    
    const reorderForm = useForm<{ newPosition: number }>({
      resolver: zodResolver(ReorderFormSchema),
    });

    useEffect(() => {
        setHeader('Bidders Management', 'Manage the master list of all registered bidders.');
    }, [setHeader]);

    const handleAddOrEditBidderSubmit = async (data: NewBidderFormData) => {
        setIsSubmittingBidder(true);
        try {
            if (bidderToEdit) {
                const bidderDocRef = doc(db, "bidders", bidderToEdit.id);
                await updateDoc(bidderDocRef, { ...data });
                toast({ title: "Bidder Updated", description: `Bidder "${data.name}" has been updated.` });
            } else {
                const newOrder = allBidders.length > 0 ? Math.max(...allBidders.map(b => b.order ?? 0)) + 1 : 0;
                await addDoc(collection(db, "bidders"), { ...data, order: newOrder });
                toast({ title: "Bidder Added", description: `Bidder "${data.name}" has been saved.` });
            }
            refetchBidders();
            setIsNewBidderDialogOpen(false);
            setBidderToEdit(null);
        } catch (error: any) {
            console.error("Error saving bidder:", error);
            toast({ title: "Error", description: "Could not save bidder details.", variant: "destructive" });
        } finally {
            setIsSubmittingBidder(false);
        }
    };
    
    const confirmDeleteBidder = async () => {
        if (!bidderToDelete) return;
        setIsDeletingBidder(true);
        try {
            await deleteDoc(doc(db, "bidders", bidderToDelete.id));
            toast({ title: "Bidder Deleted", description: `Bidder "${bidderToDelete.name}" has been removed.` });
            refetchBidders(); // Force a refresh of the data from the store
        } catch (error: any) {
            console.error("Error deleting bidder:", error);
            toast({ title: "Error", description: "Could not delete bidder.", variant: "destructive" });
        } finally {
            setIsDeletingBidder(false);
            setBidderToDelete(null);
        }
    };
    
    const handleOpenReorderDialog = (bidder: BidderType) => {
        const currentPosition = allBidders.findIndex(b => b.id === bidder.id) + 1;
        setItemToReorder(bidder);
        reorderForm.setValue('newPosition', currentPosition > 0 ? currentPosition : 1);
    };
    
    const handleReorderSubmit = async ({ newPosition }: { newPosition: number }) => {
        if (!bidderToReorder) return;
        setIsReordering(true);
    
        try {
            // Fetch the latest data to avoid sync issues
            const biddersSnapshot = await getDocs(query(collection(db, "bidders"), orderBy("order")));
            let currentBidders: BidderType[] = biddersSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as BidderType));
            
            const bidderToMoveIndex = currentBidders.findIndex(b => b.id === bidderToReorder.id);
    
            if (bidderToMoveIndex === -1) {
                throw new Error("Bidder to be moved was not found in the database. The list may be out of sync. Please refresh.");
            }
            
            const [bidderToMove] = currentBidders.splice(bidderToMoveIndex, 1);
            currentBidders.splice(newPosition - 1, 0, bidderToMove);
    
            const batch = writeBatch(db);
            currentBidders.forEach((bidder, index) => {
                const docRef = doc(db, 'bidders', bidder.id);
                batch.update(docRef, { order: index });
            });
    
            await batch.commit();
            
            toast({ title: 'Bidder Moved', description: `${bidderToReorder.name} moved to position ${newPosition}.` });
            refetchBidders();
    
        } catch (error: any) {
            console.error("Reordering failed:", error);
            toast({ title: 'Error', description: `Could not move bidder: ${error.message}`, variant: 'destructive' });
        } finally {
            setIsReordering(false);
            setBidderToReorder(null);
        }
    };


    return (
        <div className="space-y-6">
             <div className="flex justify-end">
                <Button variant="destructive" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4"/> Back
                </Button>
            </div>
            <Card>
                <CardContent className="pt-6">
                    <div className="flex justify-end mb-4">
                         <Button onClick={() => { setBidderToEdit(null); setIsNewBidderDialogOpen(true); }}>
                            <UserPlus className="mr-2 h-4 w-4" /> Add New Bidder
                        </Button>
                    </div>
                     <div className="max-h-[70vh] overflow-auto">
                        <TooltipProvider>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Sl. No.</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Address</TableHead>
                                        <TableHead>Contact</TableHead>
                                        <TableHead className="text-center">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {allBidders.length > 0 ? (
                                        allBidders.map((bidder, index) => (
                                            <TableRow key={bidder.id}>
                                                <TableCell>{index + 1}</TableCell>
                                                <TableCell className="font-medium">{bidder.name}</TableCell>
                                                <TableCell>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <p className="text-sm text-muted-foreground line-clamp-2">{bidder.address}</p>
                                                        </TooltipTrigger>
                                                        <TooltipContent className="max-w-xs">
                                                            <p className="whitespace-pre-wrap">{bidder.address}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm">{bidder.phoneNo}</div>
                                                    {bidder.secondaryPhoneNo && <div className="text-xs text-muted-foreground">{bidder.secondaryPhoneNo}</div>}
                                                    {bidder.email && <div className="text-xs text-muted-foreground mt-1">{bidder.email}</div>}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex items-center justify-center space-x-1">
                                                        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => handleOpenReorderDialog(bidder)} disabled={isReordering}><ArrowUpDown className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>Move Bidder</p></TooltipContent></Tooltip>
                                                        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => { setBidderToEdit(bidder); setIsNewBidderDialogOpen(true); }}><Edit className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>Edit Bidder</p></TooltipContent></Tooltip>
                                                        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setBidderToDelete(bidder)}><Trash2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>Delete Bidder</p></TooltipContent></Tooltip>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow><TableCell colSpan={5} className="h-24 text-center">No bidders found. Add one to get started.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TooltipProvider>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isNewBidderDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) { setIsNewBidderDialogOpen(false); setBidderToEdit(null); } }}>
                <DialogContent className="max-w-2xl flex flex-col p-0">
                    <NewBidderForm onSubmit={handleAddOrEditBidderSubmit} onCancel={() => { setIsNewBidderDialogOpen(false); setBidderToEdit(null); }} isSubmitting={isSubmittingBidder} initialData={bidderToEdit}/>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!bidderToDelete} onOpenChange={() => setBidderToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently delete the bidder <strong>{bidderToDelete?.name}</strong>. This cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeletingBidder}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteBidder} disabled={isDeletingBidder} className="bg-destructive hover:bg-destructive/90">{isDeletingBidder ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Delete"}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {bidderToReorder && (
              <Dialog open={!!bidderToReorder} onOpenChange={() => setBidderToReorder(null)}>
                  <DialogContent>
                      <DialogHeader>
                          <DialogTitle>Move Bidder</DialogTitle>
                          <DialogDescription>Move "{bidderToReorder?.name}" to a new position.</DialogDescription>
                      </DialogHeader>
                      <Form {...reorderForm}>
                          <form onSubmit={reorderForm.handleSubmit(handleReorderSubmit)} className="space-y-4 py-4">
                              <FormField
                                  control={reorderForm.control}
                                  name="newPosition"
                                  render={({ field }) => (
                                      <FormItem>
                                          <FormLabel>New Position (1 to {allBidders.length})</FormLabel>
                                          <FormControl><Input type="number" min="1" max={allBidders.length} {...field} /></FormControl>
                                          <FormMessage />
                                      </FormItem>
                                  )}
                              />
                              <DialogFooter>
                                  <Button type="button" variant="outline" onClick={() => setBidderToReorder(null)}>Cancel</Button>
                                  <Button type="submit" disabled={isReordering}>{isReordering ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Move"}</Button>
                              </DialogFooter>
                          </form>
                      </Form>
                  </DialogContent>
              </Dialog>
            )}
        </div>
    );
}
