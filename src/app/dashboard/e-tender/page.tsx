// src/app/dashboard/e-tender/page.tsx
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useE_tenders, type E_tender } from '@/hooks/useE_tenders';
import { usePageHeader } from '@/hooks/usePageHeader';
import { Loader2, PlusCircle, Search, Trash2, Eye, UserPlus, Users, Copy, FileText, Calendar, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateSafe } from '@/components/e-tender/utils';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';


export default function ETenderListPage() {
    const { setHeader } = usePageHeader();
    const router = useRouter();
    const { tenders, isLoading, deleteTender, addTender } = useE_tenders();
    const { toast } = useToast();
    const { user } = useAuth();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [tenderToDelete, setTenderToDelete] = useState<E_tender | null>(null);
    const [isDeletingTender, setIsDeletingTender] = useState(false);
    const [tenderToCopy, setTenderToCopy] = useState<E_tender | null>(null);
    const [isCopying, setIsCopying] = useState(false);


    React.useEffect(() => {
        setHeader('e-Tenders', 'Manage all electronic tenders for the department.');
    }, [setHeader]);
    

    const filteredTenders = useMemo(() => {
        const sortedTenders = [...tenders].sort((a, b) => {
            const dateA = a.tenderDate ? new Date(a.tenderDate).getTime() : 0;
            const dateB = b.tenderDate ? new Date(b.tenderDate).getTime() : 0;
            return dateB - dateA;
        });

        if (!searchTerm) return sortedTenders;

        const lowercasedFilter = searchTerm.toLowerCase();
        return sortedTenders.filter(tender =>
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
    
    const handleCopyClick = (tender: E_tender) => {
        setTenderToCopy(tender);
    };

    const confirmCopy = async () => {
        if (!tenderToCopy) return;
        setIsCopying(true);
        try {
            const newTenderData: Partial<E_tender> = {
                // Copy basic details
                eTenderNo: `${tenderToCopy.eTenderNo}-COPY`,
                tenderDate: tenderToCopy.tenderDate,
                fileNo: tenderToCopy.fileNo,
                nameOfWork: tenderToCopy.nameOfWork,
                nameOfWorkMalayalam: tenderToCopy.nameOfWorkMalayalam,
                location: tenderToCopy.location,
                estimateAmount: tenderToCopy.estimateAmount,
                tenderFormFee: tenderToCopy.tenderFormFee,
                emd: tenderToCopy.emd,
                periodOfCompletion: tenderToCopy.periodOfCompletion,
                dateTimeOfReceipt: tenderToCopy.dateTimeOfReceipt,
                dateTimeOfOpening: tenderToCopy.dateTimeOfOpening,
                tenderType: tenderToCopy.tenderType,
                tenderFeeDescription: tenderToCopy.tenderFeeDescription,
                emdDescription: tenderToCopy.emdDescription,
                // Reset other fields
                presentStatus: 'Tender Process',
                bidders: [],
                corrigendums: [],
                dateOfOpeningBid: null,
                dateOfTechnicalAndFinancialBidOpening: null,
                technicalCommitteeMember1: undefined,
                technicalCommitteeMember2: undefined,
                technicalCommitteeMember3: undefined,
                selectionNoticeDate: null,
                performanceGuaranteeAmount: undefined,
                additionalPerformanceGuaranteeAmount: undefined,
                stampPaperAmount: undefined,
                agreementDate: null,
                dateWorkOrder: null,
                nameOfAssistantEngineer: undefined,
                supervisor1Id: undefined, supervisor1Name: undefined, supervisor1Phone: undefined,
                supervisor2Id: undefined, supervisor2Name: undefined, supervisor2Phone: undefined,
                supervisor3Id: undefined, supervisor3Name: undefined, supervisor3Phone: undefined,
                remarks: '',
            };
            const newTenderId = await addTender(newTenderData as any);
            toast({ title: "Tender Copied", description: "A new tender has been created. Redirecting to edit..." });
            router.push(`/dashboard/e-tender/${newTenderId}`);
        } catch (error: any) {
            toast({ title: "Copy Failed", description: error.message, variant: 'destructive' });
        } finally {
            setIsCopying(false);
            setTenderToCopy(null);
        }
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
                                <Button onClick={() => router.push('/dashboard/bidders')} variant="secondary">
                                    <Users className="mr-2 h-4 w-4" /> Bidders List
                                </Button>
                                <Button onClick={handleCreateNew} className="w-full sm:w-auto">
                                    <PlusCircle className="mr-2 h-4 w-4" /> Create New e-Tender
                                </Button>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
            <div className="grid grid-cols-1 gap-4">
                 {filteredTenders.length > 0 ? (
                    filteredTenders.map((tender, index) => (
                        <Card key={tender.id} className="shadow-md hover:shadow-lg transition-shadow">
                            <CardHeader className="pb-4">
                               <div className="flex justify-between items-start gap-4">
                                    <div>
                                        <p className="text-sm font-semibold text-primary">{`GKT/${tender.fileNo}/${tender.eTenderNo}`}</p>
                                        <p className="text-xs text-muted-foreground">{`Dated: ${formatDateSafe(tender.tenderDate)}`}</p>
                                    </div>
                                    {tender.presentStatus && <Badge>{tender.presentStatus}</Badge>}
                               </div>
                            </CardHeader>
                            <CardContent className="space-y-3 pb-4">
                                <p className="font-semibold text-foreground leading-snug">{tender.nameOfWork}</p>
                                <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                                    <div className="flex items-start gap-2">
                                        <Calendar className="h-4 w-4 mt-0.5"/>
                                        <div>
                                            <p className="font-medium">Last Date of Receipt</p>
                                            <p>{formatDateSafe(tender.dateTimeOfReceipt, true)}</p>
                                        </div>
                                    </div>
                                     <div className="flex items-start gap-2">
                                        <Clock className="h-4 w-4 mt-0.5"/>
                                        <div>
                                            <p className="font-medium">Date of Opening</p>
                                            <p>{formatDateSafe(tender.dateTimeOfOpening, true)}</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="p-4 bg-secondary/30 flex justify-end">
                                <div className="flex items-center space-x-1">
                                    <Button variant="ghost" size="sm" onClick={() => handleViewAndEdit(tender.id)}>
                                        <Eye className="h-4 w-4 mr-2" />View / Edit
                                    </Button>
                                    {user?.role === 'editor' && (
                                        <>
                                            <Button variant="ghost" size="sm" onClick={() => handleCopyClick(tender)}>
                                                <Copy className="h-4 w-4 mr-2" />Copy
                                            </Button>
                                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDeleteClick(tender)}>
                                                <Trash2 className="h-4 w-4 mr-2" />Delete
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </CardFooter>
                        </Card>
                    ))
                ) : (
                    <Card>
                       <CardContent className="py-20 text-center">
                            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4"/>
                            <h3 className="text-lg font-semibold">No Tenders Found</h3>
                            <p className="text-muted-foreground">No tenders match your current search.</p>
                       </CardContent>
                    </Card>
                )}
            </div>
            
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
            
             <AlertDialog open={!!tenderToCopy} onOpenChange={() => setTenderToCopy(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Copy</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will create a new tender by copying the basic details from <strong>{tenderToCopy?.eTenderNo}</strong>.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isCopying}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmCopy} disabled={isCopying}>
                            {isCopying ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Copy Tender"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
