
// src/components/dashboard/ETenderNoticeBoard.tsx
"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Hammer, Eye } from "lucide-react";
import { useE_tenders, type E_tender } from '@/hooks/useE_tenders';
import { toDateOrNull, formatDateSafe } from '../e-tender/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { ScrollArea } from '../ui/scroll-area';
import Link from 'next/link';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { getStatusBadgeClass } from '../e-tender/utils';

const DetailRow = ({ label, value }: { label: string, value: any }) => {
    if (value === null || value === undefined || value === '') return null;
    return (
        <div className="text-xs">
            <dt className="font-medium text-muted-foreground">{label}</dt>
            <dd>{String(value)}</dd>
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
    
    const activeTenders = tenders.filter(tender => tender.presentStatus !== 'Tender Cancelled' && tender.presentStatus !== 'Retender');

    for (const tender of activeTenders) {
      const receiptDate = toDateOrNull(tender.dateTimeOfReceipt);
      const openingDate = toDateOrNull(tender.dateTimeOfOpening);
      
      // 1. Tender Status Review
      if (receiptDate && openingDate && now > receiptDate && now < openingDate) {
        review.push(tender);
      }

      // 2. To Be Opened
      if (!tender.dateOfOpeningBid && !tender.dateOfTechnicalAndFinancialBidOpening) {
        toBeOpened.push(tender);
      }
      
      // 3. Pending Selection Notice
      if (!tender.selectionNoticeDate) {
        pendingSelection.push(tender);
      }

      // 4. Pending Work Order
      if (!tender.agreementDate || !tender.dateWorkOrder) {
        pendingWorkOrder.push(tender);
      }
    }

    return { review, toBeOpened, pendingSelection, pendingWorkOrder };
  }, [tenders]);

  const handleTenderClick = (tender: E_tender) => {
    setSelectedTender(tender);
  };
  
  const TenderList = ({ tenders, showDateKey, emptyMessage }: { tenders: E_tender[]; showDateKey?: keyof E_tender; emptyMessage: string; }) => (
    <ScrollArea className="h-72">
        <div className="space-y-2 pr-3">
          {tenders.length > 0 ? (
            tenders.map((tender) => (
              <div key={tender.id} className="p-2 rounded-md bg-blue-500/10 hover:bg-blue-500/20 transition-colors">
                <div className="flex justify-between items-start">
                  <button onClick={() => handleTenderClick(tender)} className="text-left">
                    <p className="font-semibold text-sm text-blue-700 flex items-center gap-1.5">{tender.eTenderNo || 'No Ref'}</p>
                    <p className="text-xs text-blue-600 line-clamp-2">{tender.nameOfWork}</p>
                  </button>
                  {showDateKey && tender[showDateKey] && (
                    <p className="text-xs text-blue-600 whitespace-nowrap">{formatDateSafe(tender[showDateKey], true)}</p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="h-full flex items-center justify-center p-8">
              <p className="text-sm text-muted-foreground italic text-center">{emptyMessage}</p>
            </div>
          )}
        </div>
    </ScrollArea>
  );

  return (
    <>
      <Card className="shadow-lg h-full flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
              <Hammer className="h-5 w-5 text-primary" />e-Tender Actions
          </CardTitle>
          <CardDescription>Tenders requiring attention at different stages.</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col min-h-0">
          <Tabs defaultValue="review" className="w-full h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="review">Review ({categorizedTenders.review.length})</TabsTrigger>
              <TabsTrigger value="opening">To Be Opened ({categorizedTenders.toBeOpened.length})</TabsTrigger>
              <TabsTrigger value="selection">Selection ({categorizedTenders.pendingSelection.length})</TabsTrigger>
              <TabsTrigger value="workOrder">Work Order ({categorizedTenders.pendingWorkOrder.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="review" className="flex-1 mt-4">
              <TenderList tenders={categorizedTenders.review} showDateKey="dateTimeOfOpening" emptyMessage="No tenders are currently in the review period." />
            </TabsContent>
            <TabsContent value="opening" className="flex-1 mt-4">
              <TenderList tenders={categorizedTenders.toBeOpened} emptyMessage="No tenders are pending opening details." />
            </TabsContent>
            <TabsContent value="selection" className="flex-1 mt-4">
              <TenderList tenders={categorizedTenders.pendingSelection} emptyMessage="No tenders are pending a selection notice." />
            </TabsContent>
            <TabsContent value="workOrder" className="flex-1 mt-4">
              <TenderList tenders={categorizedTenders.pendingWorkOrder} emptyMessage="No tenders are pending a work/supply order." />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <Dialog open={!!selectedTender} onOpenChange={() => setSelectedTender(null)}>
        <DialogContent className="sm:max-w-xl">
            <DialogHeader>
                <DialogTitle>Tender Details: {selectedTender?.eTenderNo}</DialogTitle>
                <DialogDescription className="line-clamp-2">{selectedTender?.nameOfWork}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <DetailRow label="Tender Date" value={formatDateSafe(selectedTender?.tenderDate)} />
                  <DetailRow label="File No" value={selectedTender?.fileNo ? `GKT/${selectedTender?.fileNo}` : null} />
                  <DetailRow label="Type" value={selectedTender?.tenderType} />
                  <DetailRow label="Status" value={selectedTender?.presentStatus ? <Badge className={cn(getStatusBadgeClass(selectedTender.presentStatus))}>{selectedTender.presentStatus}</Badge> : null} />
                  <DetailRow label="Last Date of Receipt" value={formatDateSafe(selectedTender?.dateTimeOfReceipt, true)} />
                  <DetailRow label="Date of Opening" value={formatDateSafe(selectedTender?.dateTimeOfOpening, true)} />
                </dl>
            </div>
            <DialogFooter>
                <Link href={`/dashboard/e-tender/${selectedTender?.id}`} passHref>
                    <Button><Eye className="mr-2 h-4 w-4" />View Full Tender</Button>
                </Link>
                <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
