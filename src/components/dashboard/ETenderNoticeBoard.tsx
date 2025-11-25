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
  const { tenders, isLoading } = useE_tenders();
  const [selectedTender, setSelectedTender] = useState<E_tender | null>(null);

  const categorizedTenders = useMemo(() => {
    const now = new Date();
    const review: E_tender[] = [];
    const toBeOpened: E_tender[] = [];
    const pendingSelection: E_tender[] = [];
    const pendingWorkOrder: E_tender[] = [];

    const activeTenders = tenders.filter(t => t.presentStatus !== 'Tender Cancelled' && t.presentStatus !== 'Retender');

    activeTenders.forEach(tender => {
        // This is a separate, time-based check. A tender can be in review AND in another category.
        const receiptDate = toDateOrNull(tender.dateTimeOfReceipt);
        const openingDate = toDateOrNull(tender.dateTimeOfOpening);
        if (receiptDate && openingDate && now > receiptDate && now < openingDate) {
            review.push(tender);
        }

        // Prioritized categorization
        if (!tender.dateOfOpeningBid) {
            toBeOpened.push(tender);
        } else if (!tender.selectionNoticeDate) {
            pendingSelection.push(tender);
        } else if (!tender.agreementDate || !tender.dateWorkOrder) {
            pendingWorkOrder.push(tender);
        }
    });

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
    { value: 'review', label: 'Review', count: categorizedTenders.review.length },
    { value: 'toBeOpened', label: 'To Be Opened', count: categorizedTenders.toBeOpened.length },
    { value: 'pendingSelection', label: 'Selection', count: categorizedTenders.pendingSelection.length },
    { value: 'pendingWorkOrder', label: 'Work Order', count: categorizedTenders.pendingWorkOrder.length },
  ];

  return (
    <Card className="shadow-lg h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Hammer className="h-5 w-5 text-primary" />e-Tender Actions
        </CardTitle>
        <CardDescription>Tenders requiring attention at various stages.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0">
        <Dialog onOpenChange={(isOpen) => !isOpen && setSelectedTender(null)}>
           <Tabs defaultValue="review" className="flex flex-col flex-1 min-h-0">
                <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto">
                    {tabTriggers.map(tab => {
                        const Icon = iconMapping[tab.value];
                        return (
                            <TabsTrigger key={tab.value} value={tab.value} disabled={tab.count === 0} className="text-xs px-1 py-1.5 md:py-2">
                               <div className="flex items-center justify-center gap-1.5">
                                    <Icon className="h-3 w-3 hidden sm:inline-block" />
                                    <span className="truncate">{tab.label}</span>
                                    <span className="font-bold">({tab.count})</span>
                               </div>
                            </TabsTrigger>
                        );
                    })}
                </TabsList>
                <div className="flex-1 min-h-0 mt-2">
                    <ScrollArea className="h-full pr-3">
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
