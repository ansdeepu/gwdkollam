// src/components/dashboard/ArsStatusOverview.tsx
"use client";

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Waves, XCircle, CalendarIcon, CheckCircle2, Wrench, AlertTriangle, Hammer, Construction, FileText, Banknote, DollarSign } from "lucide-react";
import { format, startOfDay, endOfDay, isValid, isWithinInterval, parse, parseISO } from 'date-fns';
import { useArsEntries, type ArsEntry } from '@/hooks/useArsEntries';
import { arsWorkStatusOptions, arsTypeOfSchemeOptions } from '@/lib/schemas';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '../ui/scroll-area';


const statusIcons: Record<string, React.ElementType> = {
    "Proposal Submitted": FileText,
    "AS & TS Issued": CheckCircle2,
    "Tendered": Hammer,
    "Selection Notice Issued": Hammer,
    "Work Order Issued": Hammer,
    "Work Initiated": Construction,
    "Work in Progress": Wrench,
    "Work Failed": AlertTriangle,
    "Work Completed": CheckCircle2,
    "Bill Prepared": FileText,
    "Payment Completed": DollarSign,
};


interface ArsStatusOverviewProps {
  onOpenDialog: (data: any[], title: string, columns: any[], type: 'detail') => void;
  dates: { start?: Date, end?: Date };
  onSetDates: (dates: { start?: Date, end?: Date }) => void;
}

export default function ArsStatusOverview({ onOpenDialog, dates, onSetDates }: ArsStatusOverviewProps) {
  const { arsEntries, isLoading } = useArsEntries();
  const [schemeTypeFilter, setSchemeTypeFilter] = useState<string>('all');

  const arsDashboardData = useMemo(() => {
    const sDate = dates.start ? startOfDay(dates.start) : null;
    const eDate = dates.end ? endOfDay(dates.end) : null;
  
    let filteredSites = arsEntries;

    // Filter by Scheme Type first
    if (schemeTypeFilter !== 'all') {
      filteredSites = filteredSites.filter(site => site.arsTypeOfScheme === schemeTypeFilter);
    }
  
    // Then filter by date
    if (sDate || eDate) {
        filteredSites = filteredSites.filter(site => {
            if (!site.dateOfCompletion) return false;
            const completionDate = site.dateOfCompletion ? parseISO(site.dateOfCompletion as unknown as string) : null;
            if (!completionDate || !isValid(completionDate)) return false;

            if (sDate && eDate) return isWithinInterval(completionDate, { start: sDate, end: eDate });
            if (sDate) return completionDate >= sDate;
            if (eDate) return completionDate <= eDate;
            return false;
      });
    }

    const arsStatusCounts = new Map<string, { count: number, data: ArsEntry[], expenditure: number }>();
    arsWorkStatusOptions.forEach(status => arsStatusCounts.set(status, { count: 0, data: [], expenditure: 0 }));
  
    let totalExpenditure = 0;
  
    filteredSites.forEach(site => {
      if (site.arsStatus && arsStatusCounts.has(site.arsStatus)) {
        const current = arsStatusCounts.get(site.arsStatus)!;
        current.count++;
        current.data.push(site);
        const siteExpenditure = Number(site.totalExpenditure) || 0;
        current.expenditure += siteExpenditure;
        totalExpenditure += siteExpenditure;
      }
    });
  
    const arsStatusCountsData = Array.from(arsStatusCounts.entries())
      .map(([status, { count, data, expenditure }]) => ({ status, count, data, expenditure }))
      .filter(item => item.count > 0)
      .sort((a,b) => {
          const indexA = arsWorkStatusOptions.indexOf(a.status as any);
          const indexB = arsWorkStatusOptions.indexOf(b.status as any);
          return indexA - indexB;
      });
  
    return {
      totalArsSites: filteredSites.length,
      totalArsExpenditure: totalExpenditure,
      arsStatusCountsData,
      allArsSites: filteredSites,
    };
  }, [arsEntries, dates, schemeTypeFilter]);

  const handleWorkStatusCellClick = (data: ArsEntry[], title: string) => {
    const dialogData = data.map((site, index) => ({
      slNo: index + 1, fileNo: site.fileNo, siteName: site.nameOfSite, purpose: site.arsTypeOfScheme,
      workStatus: site.workStatus, supervisorName: site.supervisorName || 'N/A'
    }));
    const columns = [
      { key: 'slNo', label: 'Sl. No.' }, { key: 'fileNo', label: 'File No.' },
      { key: 'siteName', label: 'Site Name' }, { key: 'purpose', label: 'Type of Scheme' },
      { key: 'workStatus', label: 'Work Status' }, { key: 'supervisorName', label: 'Supervisor' }
    ];
    onOpenDialog(dialogData, title, columns, 'detail');
  };

  return (
     <Card className="flex flex-col h-full">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <CardTitle className="flex items-center gap-2"><Waves className="h-5 w-5 text-primary" />ARS Status Overview</CardTitle>
            <CardDescription>Current count of ARS sites by their work status.</CardDescription>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-4 border-t mt-4">
            <Select value={schemeTypeFilter} onValueChange={setSchemeTypeFilter}>
              <SelectTrigger className="w-[240px]">
                <SelectValue placeholder="Filter by Type of Scheme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Scheme Types</SelectItem>
                {arsTypeOfSchemeOptions.map((scheme) => (
                  <SelectItem key={scheme} value={scheme}>{scheme}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          <Button onClick={() => { onSetDates({ start: undefined, end: undefined }); setSchemeTypeFilter('all'); }} variant="ghost" className="h-9 px-3"><XCircle className="mr-2 h-4 w-4" />Clear Filters</Button>
          <p className="text-xs text-muted-foreground flex-grow text-center sm:text-left">Filter by scheme and/or completion date</p>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0">
          <ScrollArea className="h-full">
              <div className="p-6 pt-0">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <button onClick={() => handleWorkStatusCellClick(arsDashboardData?.allArsSites ?? [], 'All ARS Sites')} disabled={(arsDashboardData?.totalArsSites ?? 0) === 0} className="p-4 border rounded-lg bg-blue-500/10 text-center hover:bg-blue-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        <p className="text-sm font-medium text-blue-600">Total ARS Sites</p>
                        <p className="text-4xl font-bold text-blue-700">{arsDashboardData?.totalArsSites ?? 0}</p>
                    </button>
                    <div className="p-4 border rounded-lg bg-green-500/10 text-center">
                        <p className="text-sm font-medium text-green-600">Total Expenditure</p>
                        <p className="text-3xl font-bold text-green-700">₹{(arsDashboardData?.totalArsExpenditure ?? 0).toLocaleString('en-IN')}</p>
                    </div>
                </div>
                {arsDashboardData && arsDashboardData.arsStatusCountsData.length > 0 ? (
                    <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {arsDashboardData.arsStatusCountsData.map((item) => {
                            const Icon = statusIcons[item.status] || FileText;
                            return (
                                <button key={item.status} onClick={() => handleWorkStatusCellClick(item.data, `ARS - ${item.status}`)} disabled={item.count === 0} className="flex items-start gap-4 p-4 border rounded-lg text-left hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                    <Icon className="h-6 w-6 text-muted-foreground mt-1" />
                                    <div>
                                        <p className="text-2xl font-bold">{item.count}</p>
                                        <p className="text-sm font-medium text-muted-foreground">{item.status}</p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center p-10 mt-6 text-center border-dashed border-2 rounded-lg"><p className="text-muted-foreground">No ARS sites found {dates.start || dates.end || schemeTypeFilter !== 'all' ? "for the selected filters" : ""}.</p></div>
                )}
              </div>
          </ScrollArea>
      </CardContent>
    </Card>
  );
}