// src/components/dashboard/ArsStatusOverview.tsx
"use client";

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Waves, XCircle, CalendarIcon } from "lucide-react";
import { format, startOfDay, endOfDay, isValid, isWithinInterval, parse, parseISO } from 'date-fns';
import { useArsEntries, type ArsEntry } from '@/hooks/useArsEntries';
import { arsWorkStatusOptions, arsTypeOfSchemeOptions } from '@/lib/schemas';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '../ui/scroll-area';

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
      if (site.workStatus && arsStatusCounts.has(site.workStatus)) {
        const current = arsStatusCounts.get(site.workStatus)!;
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
      .sort((a,b) => a.status.localeCompare(b.status));
  
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
    <div className="flex flex-col h-full">
      <CardHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm flex-shrink-0">
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
      <Card className="flex-grow">
        <ScrollArea className="h-full">
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1 flex flex-col gap-4">
                  <div className="p-4 border rounded-lg bg-secondary/30 text-center">
                    <p className="text-sm font-medium text-muted-foreground">Total ARS Sites</p>
                    <button className="text-4xl font-bold text-primary disabled:opacity-50 disabled:cursor-not-allowed" disabled={(arsDashboardData?.totalArsSites ?? 0) === 0} onClick={() => handleWorkStatusCellClick(arsDashboardData?.allArsSites ?? [], 'All ARS Sites')}>
                      {arsDashboardData?.totalArsSites ?? 0}
                    </button>
                  </div>
                  <div className="p-4 border rounded-lg bg-secondary/30 text-center">
                    <p className="text-sm font-medium text-muted-foreground">Total Expenditure</p>
                    <p className="text-4xl font-bold text-primary">₹{(arsDashboardData?.totalArsExpenditure ?? 0).toLocaleString('en-IN')}</p>
                  </div>
                </div>
                <div className="md:col-span-2">
                  {arsDashboardData && arsDashboardData.arsStatusCountsData.length > 0 ? (
                    <Table>
                      <TableHeader><TableRow><TableHead>Status</TableHead><TableHead className="text-right">Count</TableHead><TableHead className="text-right">Expenditure (₹)</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {arsDashboardData.arsStatusCountsData.map((item) => (
                          <TableRow key={item.status}>
                            <TableCell className="font-medium">{item.status}</TableCell>
                            <TableCell className="text-right"><Button variant="link" className="p-0 h-auto" disabled={item.count === 0} onClick={() => handleWorkStatusCellClick(item.data, `ARS - ${item.status}`)}>{item.count}</Button></TableCell>
                            <TableCell className="text-right font-mono">{item.expenditure.toLocaleString('en-IN')}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="h-full flex items-center justify-center p-10 text-center border-dashed border-2 rounded-lg"><p className="text-muted-foreground">No ARS sites found {dates.start || dates.end || schemeTypeFilter !== 'all' ? "for the selected filters" : ""}.</p></div>
                  )}
                </div>
              </div>
            </CardContent>
        </ScrollArea>
      </Card>
    </div>
  );
}
