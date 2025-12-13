
// src/app/dashboard/bidders/page.tsx
"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { usePageHeader } from '@/hooks/usePageHeader';
import { Loader2, UserPlus, Users, Edit, Trash2, ArrowLeft, Move, Eye } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { getFirestore, collection, addDoc, getDocs, query, doc, updateDoc, deleteDoc, writeBatch, setDoc, orderBy } from "firebase/firestore";
import { app } from "@/lib/firebase";
import NewBidderForm, { type NewBidderFormData } from '@/components/e-tender/NewBidderForm';
import type { Bidder as BidderType } from '@/lib/schemas/eTenderSchema';
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
    
    const [bidderToEdit, setBidderToEdit] = useState<Partial<BidderType> | null>(null);
    const [bidderToDelete, setBidderToDelete] = useState<BidderType | null>(null);
    const [bidderToReorder, setBidderToReorder] = useState<BidderType | null>(null);
    
    const [displayedBidders, setDisplayedBidders] = useState<BidderType[]>([]);

    const validBidders = useMemo(() => {
        return allBidders
            .filter(bidder => bidder && bidder.id && bidder.name)
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }, [allBidders]);

    useEffect(() => {
        setDisplayedBidders(validBidders);
    }, [validBidders]);


    useEffect(() => {
        setHeader('Bidders Management', '');
    }, [setHeader]);

    const handleAddOrEditBidderSubmit = async (data: NewBidderFormData) => {
        setIsSubmitting(true);
        try {
            if (bidderToEdit && bidderToEdit.id) {
                const bidderDocRef = doc(db, "bidders", bidderToEdit.id);
                // Ensure no 'id' field is in the data being updated
                const dataToUpdate: Partial<NewBidderFormData> = { ...data };
                await updateDoc(bidderDocRef, dataToUpdate);
                toast({ title: "Bidder Updated", description: `Bidder "${data.name}" has been updated.` });
            } else {
                const newOrder = displayedBidders.length > 0 ? Math.max(...displayedBidders.map(b => b.order ?? 0)) + 1 : 0;
                await addDoc(collection(db, "bidders"), { ...data, order: newOrder });
                toast({ title: "Bidder Added", description: `Bidder "${data.name}" has been saved.` });
            }
            refetchBidders(); 
            setIsNewBidderDialogOpen(false);
            setBidderToEdit(null);
        } catch (error: any) {
            console.error("Error saving bidder:", error);
            toast({ title: "Error", description: error.message || "Could not save bidder details.", variant: "destructive" });
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
    
    const handleReorderSubmit = useCallback(async (newPosition: number) => {
        if (!bidderToReorder || isSubmitting) return;

        setIsSubmitting(true);

        const localBidders = [...displayedBidders];
        const fromIndex = localBidders.findIndex(b => b.id === bidderToReorder.id);
        
        if (fromIndex === -1) {
            toast({ title: "Error", description: "Bidder to move not found.", variant: "destructive" });
            setIsSubmitting(false);
            return;
        }
        
        const [movedItem] = localBidders.splice(fromIndex, 1);
        localBidders.splice(newPosition - 1, 0, movedItem);

        try {
            const batch = writeBatch(db);
            localBidders.forEach((bidder, index) => {
                const docRef = doc(db, 'bidders', bidder.id);
                batch.update(docRef, { order: index });
            });

            await batch.commit();
            refetchBidders();
            setBidderToReorder(null);
            toast({ title: "Reorder Successful", description: `"${bidderToReorder.name}" moved to position ${newPosition}.` });

        } catch (error: any) {
            console.error("Could not move bidder:", error);
            toast({ title: "Error Reordering", description: `Could not move bidder: ${error.message}`, variant: "destructive" });
            setDisplayedBidders(displayedBidders);
        } finally {
            setIsSubmitting(false);
        }
    }, [bidderToReorder, isSubmitting, displayedBidders, toast, refetchBidders]);

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
                                        <TableHead>Email</TableHead>
                                        <TableHead className="text-center">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {displayedBidders.length > 0 ? (
                                        displayedBidders.map((bidder, index) => (
                                            <TableRow key={bidder.id}>
                                                <TableCell>{index + 1}</TableCell>
                                                <TableCell className="font-medium">{bidder.name}</TableCell>
                                                <TableCell>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <p className="text-sm text-muted-foreground line-clamp-2 max-w-[200px]">{bidder.address}</p>
                                                        </TooltipTrigger>
                                                        <TooltipContent className="max-w-xs">
                                                            <p className="whitespace-pre-wrap">{bidder.address}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm">{bidder.phoneNo}</div>
                                                    {bidder.secondaryPhoneNo && <div className="text-xs text-muted-foreground">{bidder.secondaryPhoneNo}</div>}
                                                </TableCell>
                                                <TableCell>
                                                     {bidder.email && <div className="text-sm text-muted-foreground">{bidder.email}</div>}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex items-center justify-center space-x-1">
                                                        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => { setBidderToEdit(bidder); setIsNewBidderDialogOpen(true); }}><Eye className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>{user?.role === 'editor' ? 'View / Edit' : 'View Details'}</p></TooltipContent></Tooltip>
                                                        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => setBidderToReorder(bidder)}><Move className="h-4 w-4"/></Button></TooltipTrigger><TooltipContent><p>Move Bidder</p></TooltipContent></Tooltip>
                                                        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setBidderToDelete(bidder)}><Trash2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>Delete Bidder</p></TooltipContent></Tooltip>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow><TableCell colSpan={6} className="h-24 text-center">No bidders found. Add one to get started.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TooltipProvider>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isNewBidderDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) { setIsNewBidderDialogOpen(false); setBidderToEdit(null); } }}>
                <DialogContent onPointerDownOutside={(e) => e.preventDefault()} className="max-w-2xl flex flex-col p-0">
                    <NewBidderForm
                        onSubmit={handleAddOrEditBidderSubmit}
                        onCancel={() => { setIsNewBidderDialogOpen(false); setBidderToEdit(null); }}
                        isSubmitting={isSubmitting}
                        initialData={
                            bidderToEdit
                              ? {
                                  id: bidderToEdit.id ?? "",
                                  name: bidderToEdit.name ?? "",
                                  address: bidderToEdit.address ?? "",
                                  phoneNo: bidderToEdit.phoneNo ?? "",
                                  secondaryPhoneNo: bidderToEdit.secondaryPhoneNo ?? "",
                                  email: bidderToEdit.email ?? "",
                                }
                              : null
                          }
                    />
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
                  <DialogContent onPointerDownOutside={(e) => e.preventDefault()} className="sm:max-w-md">
                      <DialogHeader className="p-6 pb-2">
                          <DialogTitle>Move Bidder</DialogTitle>
                          <DialogDescription>Move "{bidderToReorder?.name}" to a new position in the list.</DialogDescription>
                      </DialogHeader>
                      <form onSubmit={(e) => {
                          e.preventDefault();
                          const newPosition = parseInt((e.target as any).position.value);
                          if (newPosition >= 1 && newPosition <= displayedBidders.length) {
                            handleReorderSubmit(newPosition);
                          } else {
                            toast({ title: "Invalid Position", description: `Please enter a number between 1 and ${displayedBidders.length}.`, variant: "destructive" });
                          }
                      }}>
                          <div className="p-6 pt-2 space-y-2">
                              <Label htmlFor="position">New Position (1 to {displayedBidders.length})</Label>
                              <Input id="position" type="number" min="1" max={displayedBidders.length} required />
                          </div>
                          <DialogFooter className="p-6 pt-4">
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
