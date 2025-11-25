// src/components/dashboard/ETenderNoticeBoard.tsx
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Hammer, Megaphone } from "lucide-react";
import { useE_tenders } from '@/hooks/useE_tenders';
import { cn } from "@/lib/utils";
import Link from 'next/link';
import { Badge } from '../ui/badge';
import { format, isValid } from 'date-fns';

export default function ETenderNoticeBoard() {
  const { tenders, isLoading } = useE_tenders();

  const sortedTenders = React.useMemo(() => {
    return [...tenders]
        .sort((a, b) => {
            const dateA = a.tenderDate ? new Date(a.tenderDate) : null;
            const dateB = b.tenderDate ? new Date(b.tenderDate) : null;
            if (!dateA) return 1;
            if (!dateB) return -1;
            return dateB.getTime() - a.getTime();
        })
        .slice(0, 15); // Show latest 15 tenders
  }, [tenders]);
  
  const listToRender = sortedTenders.length > 3 ? [...sortedTenders, ...sortedTenders] : sortedTenders;

  return (
    <Card className="shadow-lg h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Hammer className="h-5 w-5 text-primary" />e-Tender Updates
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0">
        <div className={cn("h-[22rem] pr-3", sortedTenders.length > 3 && "marquee-container-updates")}>
            <div className={cn("space-y-2", sortedTenders.length > 3 && "marquee-content-updates")}>
              {sortedTenders.length > 0 ? (
                listToRender.map((tender, index) => (
                  <Link href={`/dashboard/e-tender/${tender.id}`} key={`${tender.id}-${index}`} className="block">
                    <div className="p-2 rounded-md bg-blue-500/10 hover:bg-blue-500/20 transition-colors">
                      <div className="flex justify-between items-start">
                        <p className="font-semibold text-sm text-blue-700 flex items-center gap-1.5">
                           {tender.eTenderNo || 'No Ref'}
                        </p>
                        {tender.tenderDate && isValid(new Date(tender.tenderDate)) && (
                            <p className="text-xs text-blue-600">{format(new Date(tender.tenderDate), 'dd/MM/yy')}</p>
                        )}
                      </div>
                      <p className="text-xs text-blue-600 line-clamp-2">{tender.nameOfWork}</p>
                      {tender.presentStatus && <Badge variant="secondary" className="mt-1 text-xs">{tender.presentStatus}</Badge>}
                    </div>
                  </Link>
                ))
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-sm text-muted-foreground italic">No recent e-Tenders.</p>
                </div>
              )}
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
