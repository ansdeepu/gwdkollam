// src/components/dashboard/ETenderNoticeBoard.tsx
"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Hammer } from "lucide-react";
import { useE_tenders, type E_tender } from '@/hooks/useE_tenders';
import { toDateOrNull, formatDateSafe } from '../e-tender/utils';

export default function ETenderNoticeBoard() {
  const { tenders, isLoading } = useE_tenders();

  const sortedTenders = useMemo(() => {
    return [...tenders].sort((a, b) => {
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
  }, [tenders]);

  const tenderUpdates = useMemo(() => {
    const now = new Date();
    return sortedTenders.map(tender => {
        let updateText = `e-Tender ${tender.eTenderNo || 'N/A'}: ${tender.nameOfWork || 'N/A'}`;
        const lastReceiptDate = toDateOrNull(tender.dateTimeOfReceipt);
        if (lastReceiptDate && lastReceiptDate > now) {
            updateText += ` - Closes on ${formatDateSafe(lastReceiptDate, true)}`;
        } else {
            updateText += ` - Status: ${tender.presentStatus || 'Unknown'}`;
        }
        return {
            id: tender.id,
            text: updateText,
        };
    }).slice(0, 15);
  }, [sortedTenders]);

  return (
    <Card className="shadow-lg h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Hammer className="h-5 w-5 text-primary" />e-Tender Updates
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0">
         <div className="h-[22rem] marquee-container-updates pr-3">
            <div className="marquee-content-updates space-y-2">
              {tenderUpdates.length > 0 ? (
                <>
                  {[...tenderUpdates, ...tenderUpdates].map((update, index) => (
                    <div key={`${update.id}-${index}`} className="p-2 rounded-md bg-blue-500/10">
                      <p className="text-sm text-blue-700">{update.text}</p>
                    </div>
                  ))}
                </>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-sm text-muted-foreground italic">No recent e-tender updates.</p>
                </div>
              )}
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
