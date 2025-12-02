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
import { isValid, isAfter } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"


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
        
        if (receipt && opening && isValid(receipt) && isValid(opening) && isAfter(now, receipt) && isAfter(opening, now)) {
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
            <p className="text-sm text-muted-foreground italic text-center py-4">No tenders in this category.</p>
        )}
    </div>
  );
  
  const categories = [
    { type: 'review', label: 'Tender Status Review', data: categorizedTenders.review, icon: Clock, color: "bg-amber-500/10 text-amber-800 border-amber-500/20" },
    { type: 'toBeOpened', label: 'To Be Opened', data: categorizedTenders.toBeOpened, icon: FolderOpen, color: "bg-sky-500/10 text-sky-800 border-sky-500/20" },
    { type: 'pendingSelection', label: 'Pending Selection Notice', data: categorizedTenders.pendingSelection, icon: Bell, color: "bg-indigo-500/10 text-indigo-800 border-indigo-500/20" },
    { type: 'pendingWorkOrder', label: 'Pending Work Order', data: categorizedTenders.pendingWorkOrder, icon: FileSignature, color: "bg-emerald-500/10 text-emerald-800 border-emerald-500/20" },
  ];

  return (
    <Card className="shadow-lg h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Hammer className="h-5 w-5 text-primary" />e-Tender Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto p-2">
        <Dialog onOpenChange={(isOpen) => !isOpen && setSelectedTender(null)}>
           <Accordion type="single" collapsible className="w-full space-y-2">
             {categories.map((cat) => {
               const Icon = cat.icon;
               return (
                <AccordionItem value={cat.type} key={cat.type} className={cn("border rounded-lg", cat.color)}>
                  <AccordionTrigger className="px-4 py-3 text-base hover:no-underline">
                     <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5" />
                        <span className="font-semibold">{cat.label}</span>
                        <span className="font-bold text-lg">({cat.data.length})</span>
                     </div>
                  </AccordionTrigger>
                  <AccordionContent className="p-4 pt-0">
                    <div className="border-t border-current/20 pt-3">
                        {renderTenderList(
                            cat.data,
                            (t) => t.eTenderNo || 'N/A',
                            cat.type === 'review' ? (t) => `Opens: ${formatDateSafe(t.dateTimeOfOpening, true)}` : undefined
                        )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
               )
             })}
           </Accordion>

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
