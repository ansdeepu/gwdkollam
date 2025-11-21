// src/app/dashboard/e-tender/page.tsx
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useE_tenders, type E_tender } from '@/hooks/useE_tenders';
import { usePageHeader } from '@/hooks/usePageHeader';
import { Loader2, PlusCircle, Search, Trash2, Eye, UserPlus, Users } from 'lucide-react';
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
import { getFirestore, collection, addDoc, getDocs, query } from "firebase/firestore";
import { app } from "@/lib/firebase";
import NewBidderForm, { type NewBidderFormData, type Bidder as BidderType } from '@/components/e-tender/NewBidderForm';
import { ScrollArea } from '@/components/ui/scroll-area';

const db = getFirestore(app);

export default function ETenderListPage() {
    const { setHeader } = usePageHeader();
    const router = useRouter();
    const { tenders, isLoading, deleteTender } = useE_tenders();
    const { toast } = useToast();
    const { user } = useAuth();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [tenderToDelete, setTenderToDelete] = useState<E_tender | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    
    const [isNewBidderDialogOpen, setIsNewBidderDialogOpen] = useState(false);
    const [isSubmittingBidder, setIsSubmittingBidder] = useState(false);

    const [isBiddersListOpen, setIsBiddersListOpen] = useState(false);
    const [allBidders, setAllBidders] = useState<BidderType[]>([]);
    const [biddersLoading, setBiddersLoading] = useState(false);
    const [bidderSearchTerm, setBidderSearchTerm] = useState('');

    React.useEffect(() => {
        setHeader('e-Tenders', 'Manage all electronic tenders for the department.');
    }, [setHeader]);
    
    const fetchBidders = async () => {
        setBiddersLoading(true);
        try {
            const biddersSnapshot = await getDocs(query(collection(db, "bidders")));
            const biddersList = biddersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BidderType));
            biddersList.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            setAllBidders(biddersList);
        } catch (error) {
            console.error("Error fetching bidders:", error);
            toast({ title: "Error", description: "Could not fetch bidder list.", variant: "destructive" });
        } finally {
            setBiddersLoading(false);
        }
    };
    
    useEffect(() => {
        if (isBiddersListOpen) {
            fetchBidders();
        }
    }, [isBiddersListOpen]);

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
        setIsDeleting(true);
        try {
            await deleteTender(tenderToDelete.id);
            toast({ title: "Tender Deleted", description: `Tender "${tenderToDelete.eTenderNo}" has been removed.` });
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: 'destructive' });
        } finally {
            setIsDeleting(false);
            setTenderToDelete(null);
        }
    };
    
    const handleAddBidderSubmit = async (data: NewBidderFormData) => {
        setIsSubmittingBidder(true);
        try {
            await addDoc(collection(db, "bidders"), {
                name: data.name,
                address: data.address,
                phoneNo: data.phoneNo,
                secondaryPhoneNo: data.secondaryPhoneNo,
                email: data.email,
            });
            toast({ title: "Bidder Added", description: `Bidder "${data.name}" has been saved.` });
            setIsNewBidderDialogOpen(false);
        } catch (error: any) {
            console.error("Error adding bidder:", error);
            toast({ title: "Error", description: "Could not save bidder details.", variant: "destructive" });
        } finally {
            setIsSubmittingBidder(false);
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
                                <Button onClick={() => setIsNewBidderDialogOpen(true)} variant="secondary" className="w-full sm:w-auto">
                                    <UserPlus className="mr-2 h-4 w-4" /> Add Bidder Details
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
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={isNewBidderDialogOpen} onOpenChange={setIsNewBidderDialogOpen}>
                <DialogContent className="max-w-2xl flex flex-col p-0">
                    <NewBidderForm
                        onSubmit={handleAddBidderSubmit}
                        onCancel={() => setIsNewBidderDialogOpen(false)}
                        isSubmitting={isSubmittingBidder}
                    />
                </DialogContent>
            </Dialog>

            <Dialog open={isBiddersListOpen} onOpenChange={setIsBiddersListOpen}>
                <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
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
                                                <TableHead>Phone No.</TableHead>
                                                <TableHead>Secondary Phone No.</TableHead>
                                                <TableHead>Email</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredBidders.length > 0 ? (
                                                filteredBidders.map((bidder, index) => (
                                                    <TableRow key={bidder.id}>
                                                        <TableCell>{index + 1}</TableCell>
                                                        <TableCell className="font-medium">{bidder.name}</TableCell>
                                                        <TableCell className="text-sm text-muted-foreground whitespace-pre-wrap">{bidder.address}</TableCell>
                                                        <TableCell>{bidder.phoneNo}</TableCell>
                                                        <TableCell>{bidder.secondaryPhoneNo}</TableCell>
                                                        <TableCell>{bidder.email}</TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="h-24 text-center">
                                                        {bidderSearchTerm ? "No bidders found matching your search." : "No bidders found."}
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                     <DialogFooter className="p-6 pt-4 border-t">
                        <DialogClose asChild>
                            <Button variant="outline">Close</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
