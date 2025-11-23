
// src/app/dashboard/e-tender/page.tsx
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useE_tenders, type E_tender } from '@/hooks/useE_tenders';
import { usePageHeader } from '@/hooks/usePageHeader';
import { Loader2, PlusCircle, Search, Trash2, Eye, UserPlus, Users, Copy } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateSafe } from '@/components/e-tender/utils';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { E_tenderStatus } from '@/lib/schemas/eTenderSchema';


const getStatusTextColor = (status?: E_tenderStatus): string => {
    if (!status) return "text-foreground"; // Default text color
    switch (status) {
        case 'Tender Process':
            return "text-gray-800";
        case 'Bid Opened':
            return "text-orange-600";
        case 'Selection Notice Issued':
            return "text-blue-600";
        case 'Work Order Issued':
            return "text-green-600";
        default:
            return "text-foreground";
    }
};

const getStatusBadgeClass = (status?: E_tenderStatus): string => {
    if (!status) return "";
    switch (status) {
        case 'Tender Process':
            return "border-gray-400 text-gray-700";
        case 'Bid Opened':
            return "border-orange-400 text-orange-700";
        case 'Selection Notice Issued':
            return "border-blue-400 text-blue-700";
        case 'Work Order Issued':
            return "border-green-400 text-green-700";
        default:
            return "border-border";
    }
};


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

            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Sl. No.</TableHead>
                                    <TableHead>eTender Ref. No.</TableHead>
                                    <TableHead>Name of Work</TableHead>
                                    <TableHead>Last Date of Receipt</TableHead>
                                    <TableHead>Date of Opening</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="w-[1%] text-center">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredTenders.length > 0 ? (
                                    filteredTenders.map((tender, index) => {
                                        const textColorClass = getStatusTextColor(tender.presentStatus);
                                        return (
                                            <TableRow key={tender.id}>
                                                <TableCell className={cn("align-top", textColorClass)}>{index + 1}</TableCell>
                                                <TableCell className={cn("font-medium align-top", textColorClass)}>
                                                    <div className="flex flex-col">
                                                        <span className="whitespace-normal break-words">{`GKT/${tender.fileNo}/${tender.eTenderNo}`}</span>
                                                        <span className="text-xs">Dated: {formatDateSafe(tender.tenderDate)}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className={cn("whitespace-normal break-words align-top", textColorClass)}>{tender.nameOfWork}</TableCell>
                                                <TableCell className={cn("whitespace-normal break-words align-top", textColorClass)}>{formatDateSafe(tender.dateTimeOfReceipt, true)}</TableCell>
                                                <TableCell className={cn("whitespace-normal break-words align-top", textColorClass)}>{formatDateSafe(tender.dateTimeOfOpening, true)}</TableCell>
                                                <TableCell className="align-top">
                                                    {tender.presentStatus && <Badge variant="outline" className={cn("bg-background", getStatusBadgeClass(tender.presentStatus))}>{tender.presentStatus}</Badge>}
                                                </TableCell>
                                                <TableCell className="text-center align-top">
                                                    <div className="flex items-center justify-center space-x-1">
                                                        <Button variant="ghost" size="icon" onClick={() => handleViewAndEdit(tender.id)}>
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        {user?.role === 'editor' && (
                                                            <>
                                                                <Button variant="ghost" size="icon" onClick={() => handleCopyClick(tender)}>
                                                                    <Copy className="h-4 w-4" />
                                                                </Button>
                                                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteClick(tender)}>
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center">
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
