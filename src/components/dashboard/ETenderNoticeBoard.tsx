
// src/components/dashboard/ETenderNoticeBoard.tsx
"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useE_tenders, type E_tender } from '@/hooks/useE_tenders';
import { toDateOrNull, formatDateSafe } from '../e-tender/utils';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '../ui/dialog';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { isValid, isAfter, isBefore } from 'date-fns';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";


const Hammer = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m15 12-8.5 8.5c-.83.83-2.17.83-3 0 0 0 0 0 0 0a2.12 2.12 0 0 1 0-3L12 9"/><path d="M17.64 15 22 10.64"/><path d="m20.91 11.7-1.25-1.25c-.6-.6-.93-1.4-.93-2.25v-.86L16.01 4.6a5.56 5.56 0 0 0-3.94-1.64H9l.92.92a2.29 2.29 0 0 1-.17 3.23l-2.48 2.48a2.29 2.29 0 0 1-3.23-.17L2 15h6.83a2 2 0 0 0 1.42-.59L15 12Z"/></svg>
);
const Clock = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);
const FolderOpen = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m6 14 1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H16.5a2 2 0 0 1 2 2v1"/></svg>
);
const Bell = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
);
const FileSignature = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M20 19.5v.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5"/><polyline points="14 2 14 8 20 8"/><path d="M16 18h2"/><path d="m22 14-4.5 4.5L16 17"/></svg>
);
const Send = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
);



const DetailRow = ({ label, value, isCurrency = false }: { label: string; value: any; isCurrency?: boolean; }) => {
    if (value === null || value === undefined || value === '') return null;
    let displayValue = String(value);
    if (label.toLowerCase().includes('date')) {
        displayValue = formatDateSafe(value, true);
    } else if (typeof value === 'number') {
        if (isCurrency) {
            displayValue = `Rs. ${value.toLocaleString('en-IN')}`;
        } else {
            displayValue = value.toLocaleString('en-IN');
        }
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
  const [activeTab, setActiveTab] = useState('tenderProcess');

  const categorizedTenders = useMemo(() => {
    const now = new Date();
    const list = Array.isArray(tenders) ? tenders : [];

    const activeTenders = list.filter(t => t.presentStatus !== "Tender Cancelled" && t.presentStatus !== "Work Order Issued" && t.presentStatus !== "Supply Order Issued");

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
    
    let tenderProcess: E_tender[] = [];
    let bidsSubmitted: E_tender[] = [];
    let toBeOpened: E_tender[] = [];
    let pendingSelection: E_tender[] = [];
    let pendingWorkOrder: E_tender[] = [];
    
    activeTenders.forEach(t => {
      const latestRetender = t.retenders && t.retenders.length > 0 ? t.retenders[t.retenders.length - 1] : null;
      const latestDateCorrigendum = t.corrigendums?.filter(c => c.corrigendumType === 'Date Extension').sort((a,b) => (toDateOrNull(b.corrigendumDate)?.getTime() ?? 0) - (toDateOrNull(a.corrigendumDate)?.getTime() ?? 0))[0] || null;

      let receipt: Date | null = null;
      let opening: Date | null = null;
      
      if (latestRetender) {
          receipt = toDateOrNull(latestRetender.lastDateOfReceipt);
          opening = toDateOrNull(latestRetender.dateOfOpeningTender);
      } else if (latestDateCorrigendum) {
          receipt = toDateOrNull(latestDateCorrigendum.lastDateOfReceipt);
          opening = toDateOrNull(latestDateCorrigendum.dateOfOpeningTender);
      } else {
          receipt = toDateOrNull(t.dateTimeOfReceipt);
          opening = toDateOrNull(t.dateTimeOfOpening);
      }
      
      const hasOpeningDetails = !!(t.dateOfOpeningBid || t.dateOfTechnicalAndFinancialBidOpening || t.technicalCommitteeMember1 || t.technicalCommitteeMember2 || t.technicalCommitteeMember3);
      const hasSelectionDetails = !!(t.selectionNoticeDate || t.performanceGuaranteeAmount);
      const hasWorkOrderDetails = !!(t.agreementDate || t.dateWorkOrder);
    
      if (t.presentStatus === 'Tender Process' && receipt && isValid(receipt) && isBefore(now, receipt)) {
          tenderProcess.push(t);
          return;
      }
      
      if (receipt && opening && isValid(receipt) && isValid(opening) && isAfter(now, receipt) && isBefore(now, opening)) {
        bidsSubmitted.push(t);
        return; 
      }
      
      if (opening && isValid(opening) && isAfter(now, opening) && !hasOpeningDetails) {
        toBeOpened.push(t);
      } 
      else if (hasOpeningDetails && !hasSelectionDetails && t.presentStatus === 'Bid Opened') {
        pendingSelection.push(t);
      } 
      else if (hasSelectionDetails && !hasWorkOrderDetails) {
        const excludedStatuses = ["Tender Process", "Bid Opened", "Retender", "Tender Cancelled"];
        if (t.presentStatus && !excludedStatuses.includes(t.presentStatus)) {
           pendingWorkOrder.push(t);
        }
      }
    });

    tenderProcess.sort(sortByTenderNoDesc);
    bidsSubmitted.sort(sortByTenderNoDesc);
    toBeOpened.sort(sortByTenderNoDesc);
    pendingSelection.sort(sortByTenderNoDesc);
    pendingWorkOrder.sort(sortByTenderNoDesc);

    return { tenderProcess, bidsSubmitted, toBeOpened, pendingSelection, pendingWorkOrder };
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
    { type: 'tenderProcess', label: 'Tender Process', data: categorizedTenders.tenderProcess, icon: null, color: "text-blue-800" },
    { type: 'bidsSubmitted', label: 'Bids Submitted', data: categorizedTenders.bidsSubmitted, icon: Clock, color: "text-amber-800" },
    { type: 'toBeOpened', label: 'To Be Opened', data: categorizedTenders.toBeOpened, icon: FolderOpen, color: "text-sky-800" },
    { type: 'pendingSelection', label: 'Pending Selection Notice', data: categorizedTenders.pendingSelection, icon: Bell, color: "text-indigo-800" },
    { type: 'pendingWorkOrder', label: 'Pending Work Order', data: categorizedTenders.pendingWorkOrder, icon: FileSignature, color: "text-emerald-800" },
  ];

  return (
    <Card className="shadow-lg h-[450px] flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Hammer className="h-5 w-5 text-primary" />e-Tender Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0 p-4 pt-0">
        <Dialog onOpenChange={(isOpen) => !isOpen && setSelectedTender(null)}>
          <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
            <TabsList className="grid grid-cols-5 gap-1 h-auto">
              {categories.map((cat) => {
                const Icon = cat.icon;
                return (
                  <TabsTrigger key={cat.type} value={cat.type} className="h-auto p-1 flex flex-col items-center justify-center gap-0.5 data-[state=active]:shadow-md leading-tight whitespace-pre-wrap">
                    <div className={cn("flex items-center gap-1 font-semibold text-[10px] text-center", cat.color)}>
                        {Icon && <Icon className="h-3 w-3 shrink-0" />}
                        <span className="flex-1">{cat.label}</span>
                    </div>
                    <span className={cn("text-lg font-bold", cat.color)}>({cat.data.length})</span>
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
                          cat.type === 'bidsSubmitted' ? (t) => `Opens: ${formatDateSafe(t.dateTimeOfOpening, true)}` :
                          (t) => `Receipt by: ${formatDateSafe(t.dateTimeOfReceipt, true)}`
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
                        <DetailRow label="Tender Amount" value={selectedTender?.estimateAmount} isCurrency />
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
