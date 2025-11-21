// src/app/dashboard/bidders/page.tsx
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePageHeader } from '@/hooks/usePageHeader';
import { Loader2, UserPlus, Users, Edit, Trash2, ArrowUpDown, ArrowLeft, Move } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { getFirestore, collection, addDoc, getDocs, query, doc, updateDoc, deleteDoc, writeBatch, setDoc, orderBy } from "firebase/firestore";
import { app } from "@/lib/firebase";
import NewBidderForm, { type NewBidderFormData, type Bidder as BidderType } from '@/components/e-tender/NewBidderForm';
import { useDataStore } from '@/hooks/use-data-store';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/useAuth';


const db = getFirestore(app);

export default function BiddersListPage() {
    const { setHeader } = usePageHeader();
    const router = useRouter();
    const { user } = useAuth();
    const { allBidders, refetchBidders } = useDataStore();
    const { toast } = useToast();

    const [isNewBidderDialogOpen, setIsNewBidderDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [bidderToEdit, setBidderToEdit] = useState<BidderType | null>(null);
    const [bidderToDelete, setBidderToDelete] = useState<BidderType | null>(null);
    const [bidderToReorder, setBidderToReorder] = useState<BidderType | null>(null);


    useEffect(() => {
        setHeader('Bidders Management', '');
    }, [setHeader]);

    const handleAddOrEditBidderSubmit = async (data: NewBidderFormData) => {
        setIsSubmitting(true);
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
            setIsSubmitting(false);
        }
    };
    
    const confirmDeleteBidder = async () => {
        if (!bidderToDelete) return;
        setIsSubmitting(true);
        try {
            await deleteDoc(doc(db, "bidders", bidderToDelete.id));
            toast({ title: "Bidder Deleted", description: `Bidder "${bidderToDelete.name}" has been removed.` });
            refetchBidders();
        } catch (error: any) {
            console.error("Error deleting bidder:", error);
            toast({ title: "Error", description: "Could not delete bidder.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
            setBidderToDelete(null);
        }
    };
    
     const handleReorderSubmit = async (newPosition: number) => {
        if (!bidderToReorder || newPosition < 1) {
            toast({ title: "Invalid Position", description: "Please enter a valid position number.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            const biddersQuery = query(collection(db, "bidders"), orderBy("order", "asc"));
            const biddersSnapshot = await getDocs(biddersQuery);
            
            const currentBidders: BidderType[] = biddersSnapshot.docs
                .map(docSnap => {
                    const data = docSnap.data();
                    // Filter out empty or invalid documents
                    if (!data || Object.keys(data).length === 0) {
                        console.warn("Skipping empty or invalid Firestore doc:", docSnap.id);
                        return null;
                    }
                    return {
                        id: docSnap.id,
                        order: data.order ?? 0, // Ensure order is a number
                        ...data
                    } as BidderType;
                })
                .filter((b): b is BidderType => b !== null);

            if (newPosition > currentBidders.length) {
                toast({ title: "Invalid Position", description: `Position must be between 1 and ${currentBidders.length}.`, variant: "destructive" });
                setIsSubmitting(false);
                return;
            }

            const bidderToMove = currentBidders.find(b => b.id === bidderToReorder.id);
            if (!bidderToMove) {
                throw new Error("The bidder you are trying to move could not be found in the current database list.");
            }

            const listWithoutMovedBidder = currentBidders.filter(b => b.id !== bidderToReorder.id);
            
            // Insert the bidder into the new position
            listWithoutMovedBidder.splice(newPosition - 1, 0, bidderToMove);
            
            // Re-assign sequential order to the entire list to ensure consistency
            listWithoutMovedBidder.forEach((b, index) => {
                b.order = index;
            });

            // Atomically update all documents in a batch
            const batch = writeBatch(db);
            listWithoutMovedBidder.forEach((bidder) => {
                if (bidder.id) {
                    const docRef = doc(db, 'bidders', bidder.id);
                    batch.set(docRef, { order: bidder.order }, { merge: true });
                }
            });

            await batch.commit();

            toast({ title: "Reorder Successful", description: `"${bidderToReorder.name}" moved to position ${newPosition}.` });

            refetchBidders();

        } catch (error: any) {
            console.error("Could not move bidder:", error);
            toast({ title: "Error Reordering", description: `Could not move bidder: ${error.message}`, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
            setBidderToReorder(null);
        }
    };


    return (
        <div className="space-y-6">
            <Card>
                <CardContent className="pt-6">
                     <div className="flex justify-between items-center mb-4">
                        <Button onClick={() => { setBidderToEdit(null); setIsNewBidderDialogOpen(true); }}>
                            <UserPlus className="mr-2 h-4 w-4" /> Add New Bidder
                        </Button>
                        <Button variant="destructive" onClick={() => router.back()}>
                            <ArrowLeft className="mr-2 h-4 w-4"/> Back
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
                                                        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => { setBidderToEdit(bidder); setIsNewBidderDialogOpen(true); }}><Edit className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>Edit Bidder</p></TooltipContent></Tooltip>
                                                        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => setBidderToReorder(bidder)}><Move className="h-4 w-4"/></Button></TooltipTrigger><TooltipContent><p>Move Bidder</p></TooltipContent></Tooltip>
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
                    <NewBidderForm onSubmit={handleAddOrEditBidderSubmit} onCancel={() => { setIsNewBidderDialogOpen(false); setBidderToEdit(null); }} isSubmitting={isSubmitting} initialData={bidderToEdit}/>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!bidderToDelete} onOpenChange={() => setBidderToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently delete the bidder <strong>{bidderToDelete?.name}</strong>. This cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteBidder} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90">{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Delete"}</AlertDialogAction>
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
                      <form onSubmit={(e) => {
                          e.preventDefault();
                          const newPosition = parseInt((e.target as any).position.value);
                          handleReorderSubmit(newPosition);
                      }}>
                          <div className="py-4">
                              <label htmlFor="position" className="text-sm font-medium">New Position (1 to {allBidders.length})</label>
                              <Input id="position" type="number" min="1" max={allBidders.length} required className="mt-2" />
                          </div>
                          <DialogFooter>
                              <Button type="button" variant="outline" onClick={() => setBidderToReorder(null)} disabled={isSubmitting}>Cancel</Button>
                              <Button type="submit" disabled={isSubmitting}>
                                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Move"}
                              </Button>
                          </DialogFooter>
                      </form>
                  </DialogContent>
              </Dialog>
            )}
        </div>
    );
}
