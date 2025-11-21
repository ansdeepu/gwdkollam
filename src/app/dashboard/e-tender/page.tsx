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
} from "@/components/ui/dialog";
import { getFirestore, collection, addDoc } from "firebase/firestore";
import { app } from "@/lib/firebase";
import NewBidderForm, { type NewBidderFormData, type Bidder as BidderType } from '@/components/e-tender/NewBidderForm';
import { useDataStore } from '@/hooks/use-data-store';
import Link from 'next/link';


const db = getFirestore(app);

export default function ETenderListPage() {
    const { setHeader } = usePageHeader();
    const router = useRouter();
    const { tenders, isLoading, deleteTender } = useE_tenders();
    const { toast } = useToast();
    const { user } = useAuth();
    const { refetchBidders } = useDataStore();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [tenderToDelete, setTenderToDelete] = useState<E_tender | null>(null);
    const [isDeletingTender, setIsDeletingTender] = useState(false);
    
    const [isNewBidderDialogOpen, setIsNewBidderDialogOpen] = useState(false);
    const [isSubmittingBidder, setIsSubmittingBidder] = useState(false);


    React.useEffect(() => {
        setHeader('e-Tenders', 'Manage all electronic tenders for the department.');
    }, [setHeader]);
    

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
            // In this simplified view, we are only adding new bidders
            const newOrder = tenders.length > 0 ? Math.max(...tenders.map(t => (t.bidders?.length ?? 0))) + 1 : 0;
            await addDoc(collection(db, "bidders"), { ...data, order: newOrder });
            toast({ title: "Bidder Added", description: `Bidder "${data.name}" has been saved.` });
            
            refetchBidders();
            setIsNewBidderDialogOpen(false);
        } catch (error: any) {
            console.error("Error saving bidder:", error);
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
                                <Button asChild variant="secondary" className="w-full sm:w-auto">
                                    <Link href="/dashboard/bidders"><Users className="mr-2 h-4 w-4" /> Bidders List</Link>
                                </Button>
                                <Button onClick={() => setIsNewBidderDialogOpen(true)} variant="secondary" className="w-full sm:w-auto">
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
                        onCancel={() => setIsNewBidderDialogOpen(false)}
                        isSubmitting={isSubmittingBidder}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}
