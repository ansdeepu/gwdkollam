
// src/app/dashboard/e-tender/page.tsx
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useE_tenders, type E_tender } from '@/hooks/useE_tenders';
import { usePageHeader } from '@/hooks/usePageHeader';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateSafe, getStatusBadgeClass, toDateOrNull } from '@/components/e-tender/utils';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { E_tenderStatus } from '@/lib/schemas/eTenderSchema';
import { eTenderStatusOptions } from '@/lib/schemas/eTenderSchema';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const Loader2 = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
);
const PlusCircle = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>
);
const Search = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
);
const Trash2 = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
);
const Eye = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
);
const Users = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
);
const Copy = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
);
const Clock = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);

const getStatusRowClass = (status?: E_tenderStatus): string => {
    if (!status) return "";
    switch (status) {
        case 'Tender Process':
            return "bg-gray-500/5 hover:bg-gray-500/10 text-gray-700";
        case 'Bid Opened':
            return "bg-orange-500/5 hover:bg-orange-500/10 text-orange-700";
        case 'Retender':
            return "bg-yellow-500/5 hover:bg-yellow-500/10 text-yellow-700";
        case 'Tender Cancelled':
            return "bg-red-500/5 hover:bg-red-500/10 text-red-700 line-through";
        case 'Selection Notice Issued':
            return "bg-blue-500/5 hover:bg-blue-500/10 text-blue-700";
        case 'Work Order Issued':
            return "bg-green-500/5 hover:bg-green-500/10 text-green-700";
        case 'Supply Order Issued':
            return "bg-purple-500/5 hover:bg-purple-500/10 text-purple-700";
        default:
            return "";
    }
};


export default function ETenderListPage() {
    const { setHeader } = usePageHeader();
    const router = useRouter();
    const { tenders: allE_tenders, isLoading, deleteTender, addTender } = useE_tenders();
    const { toast } = useToast();
    const { user } = useAuth();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<E_tenderStatus | 'all'>('all');
    const [tenderToDelete, setTenderToDelete] = useState<E_tender | null>(null);
    const [isDeletingTender, setIsDeletingTender] = useState(false);
    const [tenderToCopy, setTenderToCopy] = useState<E_tender | null>(null);
    const [isCopying, setIsCopying] = useState(false);


    React.useEffect(() => {
        setHeader('e-Tenders', 'Manage all electronic tenders for the department.');
    }, [setHeader]);
    

    const { filteredTenders, lastCreatedDate } = useMemo(() => {
      const list = allE_tenders || [];
      const processedTenders = list.map(tender => {
        const bidderNames = (tender.bidders || []).map(b => b.name).filter(Boolean).join(' ').toLowerCase();
        const searchableContent = [
          tender.eTenderNo, `GKT/${tender.fileNo}/${tender.eTenderNo}`,
          tender.fileNo, tender.nameOfWork, tender.nameOfWorkMalayalam, tender.location, tender.tenderType,
          tender.presentStatus, tender.periodOfCompletion, tender.estimateAmount?.toString(),
          formatDateSafe(tender.tenderDate), formatDateSafe(tender.dateTimeOfOpening, true),
          formatDateSafe(tender.dateTimeOfReceipt, true), bidderNames
        ].filter(Boolean).map(String).join(' ').toLowerCase();
        return {
          ...tender,
          _searchableContent: searchableContent,
        };
      });

        let lastCreated: Date | null = null;
        if (processedTenders.length > 0) {
            lastCreated = processedTenders.reduce((latest, current) => {
                const currentCreatedAt = toDateOrNull(current.createdAt);
                if (currentCreatedAt && (!latest || currentCreatedAt > latest)) {
                    return currentCreatedAt;
                }
                return latest;
            }, null as Date | null);
        }

        let filtered = processedTenders;
        
        if (statusFilter !== 'all') {
            filtered = filtered.filter(tender => tender.presentStatus === statusFilter);
        }
        
        if (searchTerm) {
          const lowercasedFilter = searchTerm.toLowerCase();
          filtered = filtered.filter(tender => tender._searchableContent.includes(lowercasedFilter));
        }
        
        filtered.sort((a, b) => {
            const dateA = toDateOrNull(a.tenderDate)?.getTime() ?? 0;
            const dateB = toDateOrNull(b.tenderDate)?.getTime() ?? 0;
            if (dateA !== dateB) return dateB - dateA;
            
            const getTenderNumber = (tenderNo: string | undefined | null): number => {
                if (!tenderNo) return 0;
                const match = tenderNo.match(/T-(\d+)/);
                return match ? parseInt(match[1], 10) : 0;
            };
            const numA = getTenderNumber(a.eTenderNo);
            const numB = getTenderNumber(b.eTenderNo);
            return numB - numA;
        });

        return { filteredTenders: filtered, lastCreatedDate: lastCreated };
    }, [allE_tenders, searchTerm, statusFilter]);


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
                retenders: [],
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
                <CardContent className="p-4 space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <div className="relative flex-grow w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search across all fields..."
                                className="w-full pl-10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
                           <div className="flex w-full sm:w-auto items-center gap-2">
                                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as E_tenderStatus | 'all')}>
                                    <SelectTrigger className="w-full sm:w-[200px]">
                                        <SelectValue placeholder="Filter by Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Statuses</SelectItem>
                                        {eTenderStatusOptions.map(status => (
                                            <SelectItem key={status} value={status}>{status}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {user?.role === 'editor' && (
                                    <div className="flex items-center gap-2">
                                        <Button onClick={() => router.push('/dashboard/bidders')} variant="secondary" className="shrink-0">
                                            <Users className="mr-2 h-4 w-4" /> Bidders List
                                        </Button>
                                        <Button onClick={handleCreateNew} className="w-full sm:w-auto shrink-0">
                                            <PlusCircle className="mr-2 h-4 w-4" /> Create New
                                        </Button>
                                    </div>
                                )}
                            </div>
                             {lastCreatedDate && (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground self-end mt-1">
                                    <Clock className="h-3 w-3"/>
                                    Last created: <span className="font-semibold text-primary/90">{format(lastCreatedDate, 'dd/MM/yy, hh:mm a')}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex justify-end items-center gap-4 mt-4 pt-4 border-t text-xs text-muted-foreground">
                        <span className="font-semibold">Row Color Legend:</span>
                        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-gray-400"></div><span>Tender Process</span></div>
                        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-orange-400"></div><span>Bid Opened</span></div>
                        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-blue-400"></div><span>Selection Notice</span></div>
                        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-400"></div><span>Work/Supply Order</span></div>
                        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-yellow-400"></div><span>Retender</span></div>
                        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-400"></div><span>Cancelled</span></div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <TooltipProvider>
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
                                            const hasRetenders = tender.retenders && tender.retenders.length > 0;
                                            const latestRetender = hasRetenders ? tender.retenders![tender.retenders!.length - 1] : null;

                                            const lastDateOfReceipt = latestRetender ? latestRetender.lastDateOfReceipt : tender.dateTimeOfReceipt;
                                            const dateOfOpening = latestRetender ? latestRetender.dateOfOpeningTender : tender.dateTimeOfOpening;

                                            return (
                                                <TableRow key={tender.id} className={getStatusRowClass(tender.presentStatus)}>
                                                    <TableCell className="align-top">{index + 1}</TableCell>
                                                    <TableCell className="font-bold align-top">
                                                        <div className="flex flex-col">
                                                            <span className="whitespace-normal break-words">{`GKT/${tender.fileNo}/${tender.eTenderNo}`}</span>
                                                            <span className="text-xs font-normal">Dated: {formatDateSafe(tender.tenderDate)}</span>
                                                            {hasRetenders && <Badge variant="secondary" className="mt-1 w-fit bg-yellow-200 text-yellow-800">Re-tender</Badge>}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="whitespace-normal break-words align-top">{tender.nameOfWork}</TableCell>
                                                    <TableCell className="whitespace-normal break-words align-top">{formatDateSafe(lastDateOfReceipt, true)}</TableCell>
                                                    <TableCell className="whitespace-normal break-words align-top">{formatDateSafe(dateOfOpening, true)}</TableCell>
                                                    <TableCell className="align-top">
                                                        {tender.presentStatus && <Badge className={cn(getStatusBadgeClass(tender.presentStatus))}>{tender.presentStatus}</Badge>}
                                                    </TableCell>
                                                    <TableCell className="text-center align-top">
                                                        <div className="flex items-center justify-center space-x-1">
                                                            <Tooltip>
                                                                <TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => handleViewAndEdit(tender.id)}><Eye className="h-4 w-4" /></Button></TooltipTrigger>
                                                                <TooltipContent><p>View / Edit Tender</p></TooltipContent>
                                                            </Tooltip>
                                                            {user?.role === 'editor' && (
                                                                <>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => handleCopyClick(tender)}><Copy className="h-4 w-4" /></Button></TooltipTrigger>
                                                                        <TooltipContent><p>Copy Tender</p></TooltipContent>
                                                                    </Tooltip>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild><Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteClick(tender)}><Trash2 className="h-4 w-4" /></Button></TooltipTrigger>
                                                                        <TooltipContent><p>Delete Tender</p></TooltipContent>
                                                                    </Tooltip>
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
                        </TooltipProvider>
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

    
