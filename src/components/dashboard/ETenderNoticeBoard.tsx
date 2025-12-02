// src/components/dashboard/ETenderNoticeBoard.tsx
"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Hammer, Clock, FolderOpen, Bell, FileSignature } from "lucide-react";
import { useE_tenders, type E_tender } from '@/hooks/useE_tenders';
import { toDateOrNull, formatDateSafe } from '../e-tender/utils';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '../ui/dialog';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ScrollArea } from '../ui/scroll-area';
import { isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";


const DetailRow = ({ label, value }: { label: string; value: any }) => {
    if (value === null || value === undefined || value === '') return null;
    let displayValue = String(value);
    if (label.toLowerCase().includes('date')) {
        displayValue = formatDateSafe(value, true);
    } else if (typeof value === 'number') {
        displayValue = `Rs. ${value.toLocaleString('en-IN')}`;
    }
    return (
        <div className="grid grid-cols-2 gap-2 py-1.5 text-sm">
            <p className="font-medium text-muted-foreground">{label}:</p>
            <p className="text-foreground break-words">{displayValue}</p>
        </div>
    );
};

export default function ETenderNoticeBoard() {
  const { tenders = [], isLoading } = useE_tenders();
  const [selectedTender, setSelectedTender] = useState<E_tender | null>(null);

  const categorizedTenders = useMemo(() => {
    const now = new Date();
    const list = Array.isArray(tenders) ? tenders : [];

    const activeTenders = list.filter(t => t.presentStatus !== "Tender Cancelled" && t.presentStatus !== "Retender");

    const sortByTenderNoDesc = (a: E_tender, b: E_tender) => {
        const getTenderNumber = (tenderNo: string | undefined | null): number => {
            if (!tenderNo) return 0;
            const match = tenderNo.match(/T-(\d+)/);
            return match ? parseInt(match[1], 10) : 0;
        };
        const numA = getTenderNumber(a.eTenderNo);
        const numB = getTenderNumber(b.eTenderNo);
        return numB - numA;
    };

    const review: E_tender[] = [];
    const toBeOpened: E_tender[] = [];
    const pendingSelection: E_tender[] = [];
    const pendingWorkOrder: E_tender[] = [];

    activeTenders.forEach(t => {
        const receipt = toDateOrNull(t.dateTimeOfReceipt);
        const opening = toDateOrNull(t.dateTimeOfOpening);
        
        if (receipt && opening && isValid(receipt) && isValid(opening) && now >= receipt && now < opening) {
            review.push(t);
        }

        if (!t.dateOfOpeningBid) {
            toBeOpened.push(t);
        }
        
        if (t.dateOfOpeningBid && !t.selectionNoticeDate) {
            pendingSelection.push(t);
        }

        if (t.selectionNoticeDate && (!t.agreementDate || !t.dateWorkOrder)) {
            pendingWorkOrder.push(t);
        }
    });

    review.sort(sortByTenderNoDesc);
    toBeOpened.sort(sortByTenderNoDesc);
    pendingSelection.sort(sortByTenderNoDesc);
    pendingWorkOrder.sort(sortByTenderNoDesc);

    return { review, toBeOpened, pendingSelection, pendingWorkOrder };
  }, [tenders]);


  const handleTenderClick = (tender: E_tender) => {
    setSelectedTender(tender);
  };

  const renderTenderList = (tenderList: E_tender[], primaryText: (t: E_tender) => string, secondaryText?: (t: E_tender) => string) => (
    <div className="space-y-2">
        {tenderList.length > 0 ? (
            tenderList.map(tender => (
                <DialogTrigger key={tender.id} asChild>
                    <button
                        className="w-full text-left p-2 rounded-md bg-blue-500/10 hover:bg-blue-500/20 transition-colors"
                        onClick={() => handleTenderClick(tender)}
                    >
                        <p className="text-sm font-semibold text-blue-800">{primaryText(tender)}</p>
                        {secondaryText && <p className="text-xs text-blue-700">{secondaryText(tender)}</p>}
                    </button>
                </DialogTrigger>
            ))
        ) : (
            <p className="text-sm text-muted-foreground italic text-center py-4">No tenders in this category.</p>
        )}
    </div>
  );
  
  const iconMapping: { [key: string]: React.ElementType } = {
      review: Clock,
      toBeOpened: FolderOpen,
      pendingSelection: Bell,
      pendingWorkOrder: FileSignature,
  };
  
  const tabTriggers = [
    { value: 'review', label: 'Review', count: categorizedTenders.review.length, colorClass: "bg-amber-100/60 text-amber-800 data-[state=active]:bg-amber-500 data-[state=active]:text-white" },
    { value: 'toBeOpened', label: 'To Be Opened', count: categorizedTenders.toBeOpened.length, colorClass: "bg-sky-100/60 text-sky-800 data-[state=active]:bg-sky-500 data-[state=active]:text-white" },
    { value: 'pendingSelection', label: 'Selection Notice Pending', count: categorizedTenders.pendingSelection.length, colorClass: "bg-indigo-100/60 text-indigo-800 data-[state=active]:bg-indigo-500 data-[state=active]:text-white" },
    { value: 'pendingWorkOrder', label: 'Work Order Pending', count: categorizedTenders.pendingWorkOrder.length, colorClass: "bg-emerald-100/60 text-emerald-800 data-[state=active]:bg-emerald-500 data-[state=active]:text-white" },
  ];

  return (
    <Card className="shadow-lg h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Hammer className="h-5 w-5 text-primary" />e-Tender Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0">
        <Dialog onOpenChange={(isOpen) => !isOpen && setSelectedTender(null)}>
           <Tabs defaultValue="review" className="flex-1 grid grid-cols-3 gap-4 min-h-0">
                <TabsList className="col-span-1 flex flex-col h-auto gap-1 bg-transparent p-0">
                    {tabTriggers.map(tab => {
                        const Icon = iconMapping[tab.value];
                        return (
                            <TabsTrigger key={tab.value} value={tab.value} disabled={tab.count === 0} className={cn("text-xs px-2 py-2 transition-colors justify-start w-full", tab.colorClass)}>
                               <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="flex items-center justify-between w-full">
                                            <div className="flex items-center gap-2">
                                                <Icon className="h-4 w-4" />
                                                <span className="font-semibold">{tab.label}</span>
                                            </div>
                                            <span className="font-bold text-lg">({tab.count})</span>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                    <p>{tab.label}</p>
                                    </TooltipContent>
                                </Tooltip>
                               </TooltipProvider>
                            </TabsTrigger>
                        );
                    })}
                </TabsList>
                <div className="col-span-2 min-h-0">
                    <ScrollArea className="h-full pr-3 h-[22rem]">
                        <TabsContent value="review">
                            {renderTenderList(
                                categorizedTenders.review,
                                (t) => t.eTenderNo || 'N/A',
                                (t) => `Opens: ${formatDateSafe(t.dateTimeOfOpening, true)}`
                            )}
                        </TabsContent>
                        <TabsContent value="toBeOpened">
                             {renderTenderList(
                                categorizedTenders.toBeOpened,
                                (t) => t.eTenderNo || 'N/A',
                                (t) => `Opens: ${formatDateSafe(t.dateTimeOfOpening, true)}`
                            )}
                        </TabsContent>
                        <TabsContent value="pendingSelection">
                            {renderTenderList(categorizedTenders.pendingSelection, (t) => t.eTenderNo || 'N/A')}
                        </TabsContent>
                        <TabsContent value="pendingWorkOrder">
                            {renderTenderList(categorizedTenders.pendingWorkOrder, (t) => t.eTenderNo || 'N/A')}
                        </TabsContent>
                    </ScrollArea>
                </div>
            </Tabs>

          <DialogContent className="sm:max-w-xl p-0">
            <DialogHeader className="p-6 pb-4 border-b">
              <DialogTitle>Tender Details: {selectedTender?.eTenderNo}</DialogTitle>
              <DialogDescription>{selectedTender?.nameOfWork}</DialogDescription>
            </DialogHeader>
            <div className="p-6 py-4">
                <ScrollArea className="max-h-[60vh] pr-4">
                    <div className="space-y-4">
                        <DetailRow label="File No" value={selectedTender?.fileNo ? `GKT/${selectedTender.fileNo}` : null} />
                        <DetailRow label="Tender Date" value={selectedTender?.tenderDate} />
                        <DetailRow label="Location" value={selectedTender?.location} />
                        <DetailRow label="Tender Amount" value={selectedTender?.estimateAmount} />
                        <DetailRow label="Last Date of Receipt" value={selectedTender?.dateTimeOfReceipt} />
                        <DetailRow label="Date of Opening" value={selectedTender?.dateTimeOfOpening} />
                        <DetailRow label="Present Status" value={selectedTender?.presentStatus} />
                    </div>
                </ScrollArea>
            </div>
            <DialogFooter className="p-6 pt-4 border-t">
                <DialogClose asChild>
                    <Button variant="secondary">Close</Button>
                </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
