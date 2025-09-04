// src/components/dashboard/ArsStatusOverview.tsx
"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Waves, XCircle } from "lucide-react";
import { format, startOfDay, endOfDay, isValid, isWithinInterval, parse } from 'date-fns';
import type { DataEntryFormData, SiteWorkStatus } from '@/lib/schemas';
import { siteWorkStatusOptions } from '@/lib/schemas';
import { Input } from '@/components/ui/input';

interface ArsStatusOverviewProps {
  allFileEntries: DataEntryFormData[];
  onOpenDialog: (data: any[], title: string, columns: any[], type: 'detail') => void;
  dates: { start?: Date, end?: Date };
  onSetDates: (dates: { start?: Date, end?: Date }) => void;
}

export default function ArsStatusOverview({ allFileEntries, onOpenDialog, dates, onSetDates }: ArsStatusOverviewProps) {
  const arsDashboardData = useMemo(() => {
    const sDate = dates.start ? startOfDay(dates.start) : null;
    const eDate = dates.end ? endOfDay(dates.end) : null;
  
    let arsSites = allFileEntries.flatMap(entry =>
        (entry.siteDetails ?? [])
          .filter(site => site.isArsImport === true)
          .map((site, index) => ({
            ...site, id: `${entry.fileNo}-${site.nameOfSite}-${site.purpose}-${index}`,
            fileNo: entry.fileNo, applicantName: entry.applicantName, constituency: entry.constituency
          }))
      );
  
    if (sDate || eDate) {
        arsSites = arsSites.filter(site => {
        const completionDate = site.dateOfCompletion ? new Date(site.dateOfCompletion) : null;
        if (!completionDate || !isValid(completionDate)) return false;
        if (sDate && eDate) return isWithinInterval(completionDate, { start: sDate, end: eDate });
        if (sDate) return completionDate >= sDate;
        if (eDate) return completionDate <= eDate;
        return false;
      });
    }

    const arsStatusCounts = new Map<string, { count: number, data: any[], expenditure: number }>();
    siteWorkStatusOptions.forEach(status => arsStatusCounts.set(status, { count: 0, data: [], expenditure: 0 }));
  
    let totalExpenditure = 0;
  
    arsSites.forEach(site => {
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
      totalArsSites: arsSites.length,
      totalArsExpenditure: totalExpenditure,
      arsStatusCountsData,
      allArsSites: arsSites,
    };
  }, [allFileEntries, dates]);

  const handleWorkStatusCellClick = (data: any[], title: string) => {
    const dialogData = data.map((site, index) => ({
      slNo: index + 1, fileNo: site.fileNo, siteName: site.nameOfSite, purpose: site.purpose,
      workStatus: site.workStatus, supervisorName: site.supervisorName || 'N/A'
    }));
    const columns = [
      { key: 'slNo', label: 'Sl. No.' }, { key: 'fileNo', label: 'File No.' },
      { key: 'siteName', label: 'Site Name' }, { key: 'purpose', label: 'Purpose' },
      { key: 'workStatus', label: 'Work Status' }, { key: 'supervisorName', label: 'Supervisor' }
    ];
    onOpenDialog(dialogData, title, columns, 'detail');
  };

  const parseDateFromString = (dateString: string): Date | undefined => {
    if (!dateString) return undefined;
    const parsedDate = parse(dateString, 'dd/MM/yyyy', new Date());
    return isValid(parsedDate) ? parsedDate : undefined;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <CardTitle className="flex items-center gap-2"><Waves className="h-5 w-5 text-primary" />ARS Status Overview</CardTitle>
            <CardDescription>Current count of ARS sites by their work status.</CardDescription>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-4 border-t mt-4">
          <Input 
              type="text" 
              placeholder="From: dd/mm/yyyy" 
              className="w-[180px]" 
              value={dates.start ? format(dates.start, 'dd/MM/yyyy') : ''} 
              onChange={(e) => onSetDates({ ...dates, start: parseDateFromString(e.target.value) })}
          />
          <Input 
              type="text" 
              placeholder="To: dd/mm/yyyy" 
              className="w-[180px]" 
              value={dates.end ? format(dates.end, 'dd/MM/yyyy') : ''} 
              onChange={(e) => onSetDates({ ...dates, end: parseDateFromString(e.target.value) })}
          />
          <Button onClick={() => onSetDates({ start: undefined, end: undefined })} variant="ghost" className="h-9 px-3"><XCircle className="mr-2 h-4 w-4" />Clear Dates</Button>
          <p className="text-xs text-muted-foreground flex-grow text-center sm:text-left">Filter by completion date</p>
        </div>
      </CardHeader>
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
              <div className="h-full flex items-center justify-center p-10 text-center border-dashed border-2 rounded-lg"><p className="text-muted-foreground">No ARS sites found {dates.start || dates.end ? "for the selected date range" : ""}.</p></div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
