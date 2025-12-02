// src/components/dashboard/ETenderNoticeBoard.tsx
"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Hammer, Clock, FolderOpen, Bell, FileSignature } from "lucide-react";
import { useE_tenders, type E_tender } from '@/hooks/useE_tenders';
import { toDateOrNull, formatDateSafe } from '../e-tender/utils';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '../ui/dialog';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { isValid, isAfter, isBefore } from 'date-fns';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";


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
        
        // Review: after receipt date, but before opening date
        if (receipt && opening && isValid(receipt) && isValid(opening) && isAfter(now, receipt) && isBefore(now, opening)) {
            review.push(t);
        }

        // To be opened: After opening date, but bid hasn't been officially opened
        if (opening && isValid(opening) && isAfter(now, opening) && !t.dateOfOpeningBid) {
            toBeOpened.push(t);
        }
        
        // Pending Selection: Bid opened, but no selection notice yet
        if (t.dateOfOpeningBid && !t.selectionNoticeDate) {
            pendingSelection.push(t);
        }

        // Pending Work Order: Selection notice issued, but no agreement/work order yet
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
    <div className="space-y-2 pt-2">
        {tenderList.length > 0 ? (
            tenderList.map(tender => (
                <DialogTrigger key={tender.id} asChild>
                    <button
                        className="w-full text-left p-2 rounded-md bg-secondary/30 hover:bg-secondary/60 transition-colors"
                        onClick={() => handleTenderClick(tender)}
                    >
                        <p className="text-sm font-semibold text-primary">{primaryText(tender)}</p>
                        {secondaryText && <p className="text-xs text-muted-foreground">{secondaryText(tender)}</p>}
                    </button>
                </DialogTrigger>
            ))
        ) : (
            <div className="h-full flex items-center justify-center">
                <p className="text-sm text-muted-foreground italic text-center py-4">No tenders in this category.</p>
            </div>
        )}
    </div>
  );
  
  const categories = [
    { type: 'review', label: 'Tender Status Review', data: categorizedTenders.review, icon: Clock, color: "text-amber-800" },
    { type: 'toBeOpened', label: 'To Be Opened', data: categorizedTenders.toBeOpened, icon: FolderOpen, color: "text-sky-800" },
    { type: 'pendingSelection', label: 'Pending Selection Notice', data: categorizedTenders.pendingSelection, icon: Bell, color: "text-indigo-800" },
    { type: 'pendingWorkOrder', label: 'Pending Work Order', data: categorizedTenders.pendingWorkOrder, icon: FileSignature, color: "text-emerald-800" },
  ];

  return (
    <Card className="shadow-lg h-[600px] flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Hammer className="h-5 w-5 text-primary" />e-Tender Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0 p-4 pt-0">
        <Dialog onOpenChange={(isOpen) => !isOpen && setSelectedTender(null)}>
          <Tabs defaultValue="review" className="flex flex-col flex-1 min-h-0">
            <TabsList className="grid grid-cols-2 gap-2 h-auto">
              {categories.map((cat) => {
                const Icon = cat.icon;
                return (
                  <TabsTrigger key={cat.type} value={cat.type} className="h-auto p-2 flex flex-col items-center justify-center gap-1 data-[state=active]:shadow-md leading-tight whitespace-pre-wrap">
                    <div className={cn("flex items-center gap-2 font-semibold text-xs text-center", cat.color)}>
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="flex-1">{cat.label}</span>
                    </div>
                    <span className={cn("text-xl font-bold", cat.color)}>({cat.data.length})</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
            <div className="flex-1 mt-2 min-h-0">
              {categories.map((cat) => (
                <TabsContent key={cat.type} value={cat.type} className="h-full m-0">
                  <ScrollArea className="h-full pr-3">
                     {renderTenderList(
                          cat.data,
                          (t) => t.eTenderNo || 'N/A',
                          cat.type === 'review' ? (t) => `Opens: ${formatDateSafe(t.dateTimeOfOpening, true)}` : undefined
                      )}
                  </ScrollArea>
                </TabsContent>
              ))}
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
