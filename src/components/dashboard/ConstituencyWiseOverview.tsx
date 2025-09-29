
// src/components/dashboard/ConstituencyWiseOverview.tsx
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";
import type { DataEntryFormData, SitePurpose, Constituency, SiteDetailFormData } from '@/lib/schemas';
import { constituencyOptions, sitePurposeOptions } from '@/lib/schemas';
import { cn } from '@/lib/utils';

interface CombinedWork {
    nameOfSite?: string | null;
    constituency?: string | null;
    purpose?: string | null;
    fileNo?: string;
    applicantName?: string;
    workStatus?: string | null;
}

interface ConstituencyWiseOverviewProps {
  allWorks: CombinedWork[];
  onOpenDialog: (data: any[], title: string, columns: any[]) => void;
}

const StatusCard = ({
  title,
  totalCount,
  onTotalClick,
  className,
  iconClassName,
  purposeData,
  onPurposeClick,
}: {
  title: string;
  totalCount: number;
  onTotalClick?: () => void;
  className?: string;
  iconClassName?: string;
  purposeData: Record<string, { count: number; data: any[] }>;
  onPurposeClick: (purpose: string) => void;
}) => {
    const hasData = Object.values(purposeData).some(p => p.count > 0);

    return (
        <Card className={cn("flex flex-col", className)}>
        <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
            <Button
            variant="link"
            className="text-4xl font-bold p-0 h-auto"
            onClick={onTotalClick}
            disabled={!onTotalClick || totalCount === 0}
            >
            {totalCount}
            </Button>
            <div className="mt-4 space-y-2">
                {hasData ? Object.entries(purposeData).map(([purpose, { count }]) => {
                    if (count === 0) return null;
                    return (
                        <div key={purpose} className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">{purpose}</span>
                            <Button variant="link" className="p-0 h-auto text-xs font-semibold" onClick={() => onPurposeClick(purpose)} disabled={count === 0}>
                                {count}
                            </Button>
                        </div>
                    )
                }) : <p className="text-xs text-muted-foreground italic text-center pt-4">No works in this constituency.</p>}
            </div>
        </CardContent>
        </Card>
    );
};

export default function ConstituencyWiseOverview({ allWorks, onOpenDialog }: ConstituencyWiseOverviewProps) {

  const summaryData = React.useMemo(() => {
    const initialCounts = () => [...sitePurposeOptions, 'ARS'].reduce((acc, purpose) => ({
      ...acc, [purpose]: { count: 0, data: [] }
    }), {} as Record<string, { count: number; data: any[] }>);

    const constituencyData = constituencyOptions.reduce((acc, constituency) => ({
      ...acc,
      [constituency]: {
        totalCount: 0,
        allWorks: [] as any[],
        byPurpose: initialCounts(),
      }
    }), {} as Record<Constituency, { totalCount: number, allWorks: any[], byPurpose: ReturnType<typeof initialCounts> }>);
    
    let totalWorks = 0;

    allWorks.forEach(work => {
        const constituency = work.constituency as Constituency;
        const purpose = (work.purpose || 'N/A') as string;
        
        if (constituency && constituencyOptions.includes(constituency)) {
          const currentData = constituencyData[constituency];
          
          currentData.totalCount++;
          currentData.allWorks.push(work);
          totalWorks++;
          
          if (purpose && currentData.byPurpose[purpose]) {
            currentData.byPurpose[purpose].count++;
            currentData.byPurpose[purpose].data.push(work);
          }
        }
    });

    return { constituencyData, totalWorks };
  }, [allWorks]);

  const handleCellClick = (data: any[], title: string) => {
    const columns = [
        { key: 'slNo', label: 'Sl. No.' },
        { key: 'fileNo', label: 'File No.' },
        { key: 'applicantName', label: 'Applicant' },
        { key: 'siteName', label: 'Site Name' },
        { key: 'purpose', label: 'Purpose' },
        { key: 'workStatus', label: 'Work Status' },
    ];
    
    const dialogData = data.map((item, index) => ({
        slNo: index + 1,
        fileNo: item.fileNo || 'N/A',
        applicantName: item.applicantName || 'N/A',
        siteName: item.nameOfSite || 'N/A',
        purpose: item.purpose || 'N/A',
        workStatus: item.workStatus || 'N/A',
    }));

    onOpenDialog(dialogData, title, columns);
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          Constituency-wise Works ({summaryData.totalWorks})
        </CardTitle>
        <CardDescription>
          A summary of all public deposit works and ARS projects, categorized by constituency.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {constituencyOptions.map(constituency => {
            const data = summaryData.constituencyData[constituency];
            if (!data || data.totalCount === 0) return null;
            return (
              <StatusCard
                key={constituency}
                title={constituency}
                totalCount={data.totalCount}
                purposeData={data.byPurpose}
                onTotalClick={() => handleCellClick(data.allWorks, `All Works in ${constituency}`)}
                onPurposeClick={(purpose) => handleCellClick(data.byPurpose[purpose].data, `Works for '${purpose}' in ${constituency}`)}
              />
            )
        })}
        {summaryData.totalWorks === 0 && (
            <div className="col-span-full text-center text-muted-foreground py-10">
                No works found for any constituency.
            </div>
        )}
      </CardContent>
    </Card>
  );
}
