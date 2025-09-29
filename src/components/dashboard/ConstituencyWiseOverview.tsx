
// src/components/dashboard/ConstituencyWiseOverview.tsx
"use client";

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, XCircle } from "lucide-react";
import type { DataEntryFormData, SitePurpose, Constituency, SiteDetailFormData } from '@/lib/schemas';
import { constituencyOptions, sitePurposeOptions } from '@/lib/schemas';
import { cn } from '@/lib/utils';
import { format, parse, startOfDay, endOfDay, isWithinInterval, isValid } from 'date-fns';

interface CombinedWork {
    nameOfSite?: string | null;
    constituency?: string | null;
    purpose?: string | null;
    fileNo?: string;
    applicantName?: string;
    workStatus?: string | null;
    dateOfCompletion?: Date | string | null;
    totalExpenditure?: number;
}

interface ConstituencyWiseOverviewProps {
  allWorks: CombinedWork[];
  onOpenDialog: (data: any[], title: string, columns: any[]) => void;
  dates: { start?: Date, end?: Date };
  onSetDates: (dates: { start?: Date, end?: Date }) => void;
}

const safeParseDate = (dateValue: any): Date | null => {
  if (!dateValue) return null;
  if (dateValue instanceof Date) return dateValue;
  if (typeof dateValue === 'object' && dateValue !== null && typeof (dateValue as any).seconds === 'number') {
    return new Date((dateValue as any).seconds * 1000);
  }
  if (typeof dateValue === 'string') {
    const parsed = new Date(dateValue);
    if (isValid(parsed)) return parsed;
  }
  return null;
};

const hashCode = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0; 
    }
    return hash;
};

const colorClasses = [
    "bg-sky-500/5 border-sky-500/50",
    "bg-blue-500/5 border-blue-500/50",
    "bg-indigo-500/5 border-indigo-500/50",
    "bg-violet-500/5 border-violet-500/50",
    "bg-purple-500/5 border-purple-500/50",
    "bg-fuchsia-500/5 border-fuchsia-500/50",
    "bg-pink-500/5 border-pink-500/50",
    "bg-rose-500/5 border-rose-500/50",
    "bg-red-500/5 border-red-500/50",
    "bg-orange-500/5 border-orange-500/50",
    "bg-amber-500/5 border-amber-500/50",
    "bg-yellow-500/5 border-yellow-500/50",
    "bg-lime-500/5 border-lime-500/50",
    "bg-green-500/5 border-green-500/50",
    "bg-emerald-500/5 border-emerald-500/50",
    "bg-teal-500/5 border-teal-500/50",
    "bg-cyan-500/5 border-cyan-500/50",
];

const getColorClass = (name: string): string => {
    const hash = hashCode(name);
    const index = Math.abs(hash) % colorClasses.length;
    return colorClasses[index];
};


const StatusCard = ({
  title,
  totalCount,
  totalExpenditure,
  onTotalClick,
  className,
  purposeData,
  onPurposeClick,
}: {
  title: string;
  totalCount: number;
  totalExpenditure: number;
  onTotalClick?: () => void;
  className?: string;
  purposeData: Record<string, { count: number; data: any[] }>;
  onPurposeClick: (purpose: string) => void;
}) => {
    const hasData = Object.values(purposeData).some(p => p.count > 0);

    return (
        <Card className={cn("flex flex-col", className)}>
        <CardHeader className="flex-row items-center justify-between pb-2 text-center">
            <CardTitle className="text-sm font-medium w-full">{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
            <Button
              variant="link"
              className="text-4xl font-bold p-0 h-auto"
              onClick={onTotalClick}
              disabled={!onTotalClick || totalCount === 0}
            >
              {totalCount}
            </Button>
            <p className="text-xs text-muted-foreground">Total Works</p>
            
            <p className="text-xl font-bold mt-2 text-primary">₹{totalExpenditure.toLocaleString('en-IN')}</p>
            <p className="text-xs text-muted-foreground">Total Expenditure</p>
            
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
                }) : <p className="text-xs text-muted-foreground italic text-center pt-4">No works found for the selected period.</p>}
            </div>
        </CardContent>
        </Card>
    );
};

export default function ConstituencyWiseOverview({ allWorks, onOpenDialog, dates, onSetDates }: ConstituencyWiseOverviewProps) {

  const summaryData = React.useMemo(() => {
    const sDate = dates.start ? startOfDay(dates.start) : null;
    const eDate = dates.end ? endOfDay(dates.end) : null;
    const isDateFilterActive = sDate && eDate;

    let filteredWorks = allWorks;

    if (isDateFilterActive) {
      filteredWorks = allWorks.filter(work => {
        const completionDate = safeParseDate(work.dateOfCompletion);
        return completionDate && isValid(completionDate) && isWithinInterval(completionDate, { start: sDate, end: eDate });
      });
    }

    const allPurposes = [...sitePurposeOptions, "Check Dam", "Dugwell Recharge", "Borewell Recharge", "Recharge Pit", "Sub-Surface Dyke", "Pond Renovation", "Percolation Ponds", "ARS"];
    const initialCounts = () => allPurposes.reduce((acc, purpose) => ({
      ...acc, [purpose]: { count: 0, data: [], expenditure: 0 }
    }), {} as Record<string, { count: number; data: any[]; expenditure: number }>);

    const constituencyData = constituencyOptions.reduce((acc, constituency) => ({
      ...acc,
      [constituency]: {
        totalCount: 0,
        totalExpenditure: 0,
        allWorks: [] as any[],
        byPurpose: initialCounts(),
      }
    }), {} as Record<Constituency, { totalCount: number, totalExpenditure: number, allWorks: any[], byPurpose: ReturnType<typeof initialCounts> }>);
    
    let totalWorks = 0;

    filteredWorks.forEach(work => {
        const constituency = work.constituency as Constituency | undefined;
        const purpose = (work.purpose || 'N/A') as string;
        
        if (constituency && constituencyOptions.includes(constituency)) {
          const currentData = constituencyData[constituency];
          const expenditure = Number(work.totalExpenditure) || 0;
          
          currentData.totalCount++;
          currentData.totalExpenditure += expenditure;
          currentData.allWorks.push(work);
          totalWorks++;
          
          if (purpose) {
            const purposeKey = Object.keys(currentData.byPurpose).find(p => p === purpose);
            if (purposeKey) {
                currentData.byPurpose[purposeKey].count++;
                currentData.byPurpose[purposeKey].expenditure += expenditure;
                currentData.byPurpose[purposeKey].data.push(work);
            }
          }
        }
    });

    return { constituencyData, totalWorks };
  }, [allWorks, dates]);

  const handleCellClick = (data: any[], title: string) => {
    const columns = [
        { key: 'slNo', label: 'Sl. No.' },
        { key: 'fileNo', label: 'File No.' },
        { key: 'applicantName', label: 'Applicant' },
        { key: 'siteName', label: 'Site Name' },
        { key: 'purpose', label: 'Purpose' },
        { key: 'workStatus', label: 'Work Status' },
        { key: 'totalExpenditure', label: 'Expenditure (₹)', isNumeric: true },
    ];
    
    const dialogData = data.map((item, index) => ({
        slNo: index + 1,
        fileNo: item.fileNo || 'N/A',
        applicantName: item.applicantName || 'N/A',
        siteName: item.nameOfSite || 'N/A',
        purpose: item.purpose || 'N/A',
        workStatus: item.workStatus || 'N/A',
        totalExpenditure: (Number(item.totalExpenditure) || 0).toLocaleString('en-IN'),
    }));

    onOpenDialog(dialogData, title, columns);
  };
  
  const sortedConstituencies = useMemo(() => {
      return [...constituencyOptions].sort((a,b) => a.localeCompare(b));
  }, []);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          Constituency-wise Works ({summaryData.totalWorks})
        </CardTitle>
        <CardDescription>
          Summary of public deposit works and ARS projects by constituency. Filter by completion date.
        </CardDescription>
        <div className="flex flex-wrap items-center gap-2 pt-4 border-t mt-4">
            <Input
                type="date"
                className="w-[240px]"
                value={dates.start ? format(dates.start, 'yyyy-MM-dd') : ''}
                onChange={(e) => onSetDates({ ...dates, start: e.target.value ? parse(e.target.value, 'yyyy-MM-dd', new Date()) : undefined })}
            />
            <Input
                type="date"
                className="w-[240px]"
                value={dates.end ? format(dates.end, 'yyyy-MM-dd') : ''}
                onChange={(e) => onSetDates({ ...dates, end: e.target.value ? parse(e.target.value, 'yyyy-MM-dd', new Date()) : undefined })}
            />
            <Button onClick={() => onSetDates({ start: undefined, end: undefined })} variant="ghost" className="h-9 px-3"><XCircle className="mr-2 h-4 w-4" />Clear Dates</Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {sortedConstituencies.map(constituency => {
            const data = summaryData.constituencyData[constituency];
            if (!data) return null;
            return (
              <StatusCard
                key={constituency}
                title={constituency}
                totalCount={data.totalCount}
                totalExpenditure={data.totalExpenditure}
                purposeData={data.byPurpose}
                className={getColorClass(constituency)}
                onTotalClick={() => handleCellClick(data.allWorks, `All Works in ${constituency}`)}
                onPurposeClick={(purpose) => handleCellClick(data.byPurpose[purpose].data, `Works for '${purpose}' in ${constituency}`)}
              />
            )
        })}
        {summaryData.totalWorks === 0 && (
            <div className="col-span-full text-center text-muted-foreground py-10">
                No works found for the selected filters.
            </div>
        )}
      </CardContent>
    </Card>
  );
}
