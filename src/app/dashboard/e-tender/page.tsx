
// src/app/dashboard/e-tender/page.tsx
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useE_tenders, type E_tender } from '@/hooks/useE_tenders';
import { usePageHeader } from '@/hooks/usePageHeader';
import { Loader2, PlusCircle, Search, Trash2, Eye, UserPlus, Users, Edit, ArrowUpDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateSafe } from '@/components/e-tender/utils';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { getFirestore, collection, addDoc, getDocs, query, doc, updateDoc, deleteDoc, writeBatch } from "firebase/firestore";
import { app } from "@/lib/firebase";
import NewBidderForm, { type NewBidderFormData, type Bidder as BidderType } from '@/components/e-tender/NewBidderForm';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDataStore } from '@/hooks/use-data-store';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';


const db = getFirestore(app);

const ReorderFormSchema = z.object({
    newPosition: z.coerce.number().int().min(1, "Position must be 1 or greater."),
});

export default function ETenderListPage() {
    const { setHeader } = usePageHeader();
    const router = useRouter();
    const { tenders, isLoading, deleteTender } = useE_tenders();
    const { toast } = useToast();
    const { user } = useAuth();
    const { allBidders, refetchBidders } = useDataStore();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [tenderToDelete, setTenderToDelete] = useState<E_tender | null>(null);
    const [isDeletingTender, setIsDeletingTender] = useState(false);
    
    const [isNewBidderDialogOpen, setIsNewBidderDialogOpen] = useState(false);
    const [isSubmittingBidder, setIsSubmittingBidder] = useState(false);

    const [isBiddersListOpen, setIsBiddersListOpen] = useState(false);
    const [biddersLoading, setBiddersLoading] = useState(false);
    const [bidderSearchTerm, setBidderSearchTerm] = useState('');

    const [bidderToEdit, setBidderToEdit] = useState<BidderType | null>(null);
    const [bidderToDelete, setBidderToDelete] = useState<BidderType | null>(null);
    const [isDeletingBidder, setIsDeletingBidder] = useState(false);

    const [bidderToReorder, setBidderToReorder] = useState<BidderType | null>(null);
    const [isReordering, setIsReordering] = useState(false);
    const reorderForm = useForm<{ newPosition: number }>({
      resolver: zodResolver(ReorderFormSchema),
    });

    React.useEffect(() => {
        setHeader('e-Tenders', 'Manage all electronic tenders for the department.');
    }, [setHeader]);
    
    useEffect(() => {
        if (isBiddersListOpen) {
            refetchBidders();
        }
    }, [isBiddersListOpen, refetchBidders]);

    const filteredTenders = useMemo(() => {
        if (!searchTerm) return tenders;
        const lowercasedFilter = searchTerm.toLowerCase();
        return tenders.filter(tender =>
            (tender.eTenderNo?.toLowerCase().includes(lowercasedFilter)) ||
            (tender.nameOfWork?.toLowerCase().includes(lowercasedFilter)) ||
            (tender.fileNo?.toLowerCase().includes(lowercasedFilter)) ||
            (`GKT/${tender.fileNo}/${tender.eTenderNo}`.toLowerCase().includes(lowercasedFilter))
        );
    }, [tenders, searchTerm]);

    const filteredBidders = useMemo(() => {
        if (!bidderSearchTerm) return allBidders;
        const lowercasedFilter = bidderSearchTerm.toLowerCase();
        return allBidders.filter(bidder =>
            (bidder.name?.toLowerCase().includes(lowercasedFilter)) ||
            (bidder.address?.toLowerCase().includes(lowercasedFilter)) ||
            (bidder.phoneNo?.toLowerCase().includes(lowercasedFilter)) ||
            (bidder.secondaryPhoneNo?.toLowerCase().includes(lowercasedFilter)) ||
            (bidder.email?.toLowerCase().includes(lowercasedFilter))
        );
    }, [allBidders, bidderSearchTerm]);


    const handleCreateNew = () => {
        router.push('/dashboard/e-tender/new');
    };

    const handleViewAndEdit = (id: string) => {
        router.push(`/dashboard/e-tender/${id}`);
    };
    
    const handleDeleteClick = (tender: E_tender) => {
        setTenderToDelete(tender);
    };

    const confirmDelete = async () => {
        if (!tenderToDelete) return;
        setIsDeletingTender(true);
        try {
            await deleteTender(tenderToDelete.id);
            toast({ title: "Tender Deleted", description: `Tender "${tenderToDelete.eTenderNo}" has been removed.` });
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: 'destructive' });
        } finally {
            setIsDeletingTender(false);
            setTenderToDelete(null);
        }
    };
    
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
            refetchBidders();
        } catch (error: any) {
            console.error("Error deleting bidder:", error);
            toast({ title: "Error", description: "Could not delete bidder.", variant: "destructive" });
        } finally {
            setIsDeletingBidder(false);
            setBidderToDelete(null);
        }
    };
    
    const handleOpenReorderDialog = (bidder: BidderType) => {
        setBidderToReorder(bidder);
        const currentPosition = allBidders.findIndex(b => b.id === bidder.id) + 1;
        reorderForm.setValue('newPosition', currentPosition);
    };

    const handleReorderSubmit = async ({ newPosition }: { newPosition: number }) => {
        if (!bidderToReorder) return;
        setIsReordering(true);
    
        const reorderedList = Array.from(allBidders);
        const oldIndex = reorderedList.findIndex(b => b.id === bidderToReorder.id);
        const [movedItem] = reorderedList.splice(oldIndex, 1);
        reorderedList.splice(newPosition - 1, 0, movedItem);
    
        try {
            const batch = writeBatch(db);
            reorderedList.forEach((bidder, index) => {
                const docRef = doc(db, 'bidders', bidder.id);
                // Use set with merge to create the document if it doesn't exist, or update it if it does.
                // This makes the operation more robust against inconsistencies.
                batch.set(docRef, { order: index }, { merge: true });
            });
            await batch.commit();
            refetchBidders();
            toast({ title: 'Bidder Moved', description: `${bidderToReorder.name} moved to position ${newPosition}.` });
        } catch (error: any) {
            toast({ title: 'Error', description: `Could not move bidder: ${error.message}`, variant: 'destructive' });
        } finally {
            setIsReordering(false);
            setBidderToReorder(null);
        }
    };


    if (isLoading) {
        return (
            <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="ml-3 text-muted-foreground">Loading tenders...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="relative flex-grow w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search by eTender Ref. No, Name of Work, or File No..."
                                className="w-full pl-10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        {user?.role === 'editor' && (
                            <div className="flex w-full sm:w-auto items-center gap-2">
                                <Button onClick={() => setIsBiddersListOpen(true)} variant="secondary" className="w-full sm:w-auto">
                                    <Users className="mr-2 h-4 w-4" /> Bidders List
                                </Button>
                                <Button onClick={() => { setBidderToEdit(null); setIsNewBidderDialogOpen(true); }} variant="secondary" className="w-full sm:w-auto">
                                    <UserPlus className="mr-2 h-4 w-4" /> Add Bidder
                                </Button>
                                <Button onClick={handleCreateNew} className="w-full sm:w-auto">
                                    <PlusCircle className="mr-2 h-4 w-4" /> Create New e-Tender
                                </Button>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardContent className="p-0">
                    <div className="max-h-[70vh] overflow-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Sl. No.</TableHead>
                                    <TableHead>eTender Ref. No.</TableHead>
                                    <TableHead>Name of Work</TableHead>
                                    <TableHead>Tender Date</TableHead>
                                    <TableHead>Present Status</TableHead>
                                    <TableHead className="text-center">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredTenders.length > 0 ? (
                                    filteredTenders.map((tender, index) => (
                                        <TableRow key={tender.id}>
                                            <TableCell>{index + 1}</TableCell>
                                            <TableCell className="font-medium">{`GKT/${tender.fileNo}/${tender.eTenderNo}`}</TableCell>
                                            <TableCell>{tender.nameOfWork}</TableCell>
                                            <TableCell>{formatDateSafe(tender.tenderDate)}</TableCell>
                                            <TableCell>
                                                {tender.presentStatus ? <Badge>{tender.presentStatus}</Badge> : 'N/A'}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Button variant="ghost" size="icon" onClick={() => handleViewAndEdit(tender.id)}>
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                {user?.role === 'editor' && (
                                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteClick(tender)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">
                                            No tenders found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
            
             <AlertDialog open={!!tenderToDelete} onOpenChange={() => setTenderToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the tender <strong>{tenderToDelete?.eTenderNo}</strong>. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeletingTender}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} disabled={isDeletingTender} className="bg-destructive hover:bg-destructive/90">
                            {isDeletingTender ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={isNewBidderDialogOpen} onOpenChange={setIsNewBidderDialogOpen}>
                <DialogContent className="max-w-2xl flex flex-col p-0">
                    <NewBidderForm
                        onSubmit={handleAddOrEditBidderSubmit}
                        onCancel={() => { setIsNewBidderDialogOpen(false); setBidderToEdit(null); }}
                        isSubmitting={isSubmittingBidder}
                        initialData={bidderToEdit}
                    />
                </DialogContent>
            </Dialog>

            <Dialog open={isBiddersListOpen} onOpenChange={setIsBiddersListOpen}>
                <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0">
                    <DialogHeader className="p-6 pb-4 border-b">
                        <DialogTitle>Bidders List</DialogTitle>
                        <DialogDescription>A list of all registered bidders. Search by name, address, or phone.</DialogDescription>
                        <div className="relative pt-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input
                                placeholder="Search bidders..."
                                value={bidderSearchTerm}
                                onChange={(e) => setBidderSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </DialogHeader>
                    <div className="flex-1 min-h-0">
                        <ScrollArea className="h-full">
                            <TooltipProvider>
                                <div className="px-6 py-4">
                                    {biddersLoading ? (
                                        <div className="flex items-center justify-center p-10">
                                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                        </div>
                                    ) : (
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
                                                {filteredBidders.length > 0 ? (
                                                    filteredBidders.map((bidder, index) => (
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
                                                                {bidder.email && <div className="text-xs text-muted-foreground">{bidder.email}</div>}
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                <div className="flex items-center justify-center space-x-1">
                                                                    <Button variant="ghost" size="icon" onClick={() => handleOpenReorderDialog(bidder)} disabled={isReordering}>
                                                                        <ArrowUpDown className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button variant="ghost" size="icon" onClick={() => { setBidderToEdit(bidder); setIsNewBidderDialogOpen(true); }}>
                                                                        <Edit className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setBidderToDelete(bidder)}>
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                ) : (
                                                    <TableRow>
                                                        <TableCell colSpan={5} className="h-24 text-center">
                                                            {bidderSearchTerm ? "No bidders found matching your search." : "No bidders found."}
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    )}
                                </div>
                            </TooltipProvider>
                        </ScrollArea>
                    </div>
                     <DialogFooter className="p-6 pt-4 border-t">
                        <DialogClose asChild>
                            <Button variant="outline">Close</Button>
                        </DialogClose>
                    </DialogFooter>
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
                        <AlertDialogAction onClick={confirmDeleteBidder} disabled={isDeletingBidder} className="bg-destructive hover:bg-destructive/90">
                            {isDeletingBidder ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Delete"}
                        </AlertDialogAction>
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
                                          <FormControl>
                                              <Input type="number" min="1" max={allBidders.length} {...field} />
                                          </FormControl>
                                          <FormMessage />
                                      </FormItem>
                                  )}
                              />
                              <DialogFooter>
                                  <Button type="button" variant="outline" onClick={() => setBidderToReorder(null)}>Cancel</Button>
                                  <Button type="submit" disabled={isReordering}>
                                      {isReordering ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Move"}
                                  </Button>
                              </DialogFooter>
                          </form>
                      </Form>
                  </DialogContent>
              </Dialog>
            )}
        </div>
    );
}
