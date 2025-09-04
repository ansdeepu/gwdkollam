// src/components/dashboard/WorkProgress.tsx
"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarCheck, Hourglass, TrendingUp, CalendarIcon as CalendarIconLucide } from "lucide-react";
import { format, isWithinInterval, startOfMonth, endOfMonth, isValid } from 'date-fns';
import type { DataEntryFormData, SiteDetailFormData, SitePurpose, SiteWorkStatus, UserProfile } from '@/lib/schemas';
import { sitePurposeOptions } from '@/lib/schemas';

interface WorkProgressProps {
  allFileEntries: DataEntryFormData[];
  onOpenDialog: (data: any[], title: string, columns: any[], type: 'month') => void;
  currentUser?: UserProfile | null;
}

interface WorkSummary {
  totalCount: number;
  byPurpose: Record<SitePurpose, number>;
  data: Array<SiteDetailFormData & { fileNo: string; applicantName: string; }>;
}

const safeParseDate = (dateValue: any): Date | null => {
  if (!dateValue) return null;
  if (dateValue instanceof Date) return dateValue;
  if (typeof dateValue === 'object' && dateValue !== null && typeof (dateValue as any).seconds === 'number') {
    return new Date((dateValue as any).seconds * 1000);
  }
  if (typeof dateValue === 'string' || typeof dateValue === 'number') {
    const parsed = new Date(dateValue);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return null;
};

export default function WorkProgress({ allFileEntries, onOpenDialog, currentUser }: WorkProgressProps) {
  const [workReportMonth, setWorkReportMonth] = useState<Date>(new Date());

  const currentMonthStats = useMemo(() => {
    const startOfMonthDate = startOfMonth(workReportMonth);
    const endOfMonthDate = endOfMonth(workReportMonth);

    const ongoingWorkStatuses: SiteWorkStatus[] = ["Work in Progress", "Work Order Issued", "Awaiting Dept. Rig"];
    const completedWorkStatuses: SiteWorkStatus[] = ["Work Failed", "Work Completed", "Bill Prepared", "Payment Completed", "Utilization Certificate Issued"];
    
    const isSupervisor = currentUser?.role === 'supervisor';
    const uniqueCompletedSites = new Map<string, SiteDetailFormData & { fileNo: string; applicantName: string; }>();
    const ongoingSites: Array<SiteDetailFormData & { fileNo: string; applicantName: string; }> = [];

    for (const entry of allFileEntries) {
      if (!entry.siteDetails) continue;
      for (const site of entry.siteDetails) {
        if (isSupervisor && site.supervisorUid !== currentUser.uid) continue;

        if (site.workStatus && completedWorkStatuses.includes(site.workStatus as SiteWorkStatus) && site.dateOfCompletion) {
          const completionDate = safeParseDate(site.dateOfCompletion);
          if (completionDate && isValid(completionDate) && isWithinInterval(completionDate, { start: startOfMonthDate, end: endOfMonthDate })) {
            const siteKey = `${entry.fileNo}-${site.nameOfSite}-${site.purpose}`;
            if (!uniqueCompletedSites.has(siteKey)) {
              uniqueCompletedSites.set(siteKey, { ...site, fileNo: entry.fileNo || 'N/A', applicantName: entry.applicantName || 'N/A' });
            }
          }
        }
        
        if (site.workStatus && ongoingWorkStatuses.includes(site.workStatus as SiteWorkStatus)) {
          ongoingSites.push({ ...site, fileNo: entry.fileNo || 'N/A', applicantName: entry.applicantName || 'N/A' });
        }
      }
    }
    
    const createSummary = (sites: (SiteDetailFormData & { fileNo: string; applicantName: string; })[]): WorkSummary => {
        const byPurpose = sitePurposeOptions.reduce((acc, purpose) => ({ ...acc, [purpose]: 0 }), {} as Record<SitePurpose, number>);
        sites.forEach(site => {
          if (site.purpose && sitePurposeOptions.includes(site.purpose as SitePurpose)) {
            byPurpose[site.purpose as SitePurpose]++;
          }
        });
        return { totalCount: sites.length, byPurpose, data: sites };
    };

    return {
        completedSummary: createSummary(Array.from(uniqueCompletedSites.values())),
        ongoingSummary: createSummary(ongoingSites),
    };
  }, [allFileEntries, workReportMonth, currentUser]);

  const handleMonthStatClick = (type: 'ongoing' | 'completed') => {
    const summary = type === 'ongoing' ? currentMonthStats.ongoingSummary : currentMonthStats.completedSummary;
    if (summary.totalCount === 0) return;

    const columns = [
      { key: 'slNo', label: 'Sl. No.' }, { key: 'fileNo', label: 'File No.' },
      { key: 'applicantName', label: 'Applicant Name' }, { key: 'siteName', label: 'Site Name' },
      { key: 'purpose', label: 'Purpose' }, { key: 'workStatus', label: 'Work Status' },
      { key: 'supervisorName', label: 'Supervisor' },
    ];

    const dialogData = summary.data.map((site, index) => ({
      slNo: index + 1, fileNo: site.fileNo, applicantName: site.applicantName, siteName: site.nameOfSite,
      purpose: site.purpose, workStatus: site.workStatus, supervisorName: site.supervisorName || 'N/A',
    }));

    const title = type === 'ongoing' ? "Total Ongoing Works" : `Works Completed in ${format(workReportMonth, 'MMMM yyyy')}`;
    onOpenDialog(dialogData, title, columns, 'month');
  };

  const handleMonthPurposeClick = (dataSource: WorkSummary['data'], purpose: SitePurpose, type: 'Ongoing' | 'Completed') => {
    const filteredData = dataSource.filter(d => d.purpose === purpose);
    if (filteredData.length === 0) return;

    const dialogData = filteredData.map((site, index) => ({
      slNo: index + 1, fileNo: site.fileNo, applicantName: site.applicantName, siteName: site.nameOfSite,
      workStatus: site.workStatus, supervisorName: site.supervisorName || 'N/A',
    }));

    const columns = [
      { key: 'slNo', label: 'Sl. No.' }, { key: 'fileNo', label: 'File No.' },
      { key: 'applicantName', label: 'Applicant Name' }, { key: 'siteName', label: 'Site Name' },
      { key: 'workStatus', label: 'Work Status' }, { key: 'supervisorName', label: 'Supervisor' },
    ];
    onOpenDialog(dialogData, `${type} '${purpose}' Works`, columns, 'month');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex-grow">
            <CardTitle className="flex items-center gap-2"><CalendarCheck className="h-5 w-5 text-primary" />Work Progress for {format(workReportMonth, 'MMMM yyyy')}</CardTitle>
            <CardDescription>Summary of completed and ongoing work.</CardDescription>
          </div>
          <div className="shrink-0">
            <Popover>
              <PopoverTrigger asChild><Button variant={"outline"} className="w-full sm:w-[200px] justify-start text-left font-normal"><CalendarIconLucide className="mr-2 h-4 w-4" />{format(workReportMonth, 'MMMM yyyy')}</Button></PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end"><Calendar mode="single" selected={workReportMonth} onSelect={(date) => date && setWorkReportMonth(date)} initialFocus captionLayout="dropdown-buttons" fromYear={2020} toYear={new Date().getFullYear()} /></PopoverContent>
            </Popover>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3 p-4 border rounded-lg bg-secondary/20">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-semibold flex items-center gap-2"><TrendingUp className="h-5 w-5 text-green-600"/>Completed in {format(workReportMonth, 'MMMM')}</h3>
            <Button variant="link" className="text-sm p-0 h-auto" onClick={() => handleMonthStatClick('completed')} disabled={currentMonthStats.completedSummary.totalCount === 0}>View All ({currentMonthStats.completedSummary.totalCount})</Button>
          </div>
          <div className="space-y-2">
            {currentMonthStats.completedSummary.totalCount > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {sitePurposeOptions.filter(p => currentMonthStats.completedSummary.byPurpose[p] > 0).map(p => (
                  <button key={`${p}-completed`} className="flex justify-between items-center text-sm p-2 rounded-md hover:bg-green-100/50" onClick={() => handleMonthPurposeClick(currentMonthStats.completedSummary.data, p, 'Completed')}>
                    <span className="font-medium">{p}</span><span className="font-bold text-green-700">{currentMonthStats.completedSummary.byPurpose[p]}</span>
                  </button>
                ))}
              </div>
            ) : (<p className="text-sm text-muted-foreground italic text-center py-4">No works completed this month.</p>)}
          </div>
        </div>
        <div className="space-y-3 p-4 border rounded-lg bg-secondary/20">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-semibold flex items-center gap-2"><Hourglass className="h-5 w-5 text-orange-600"/>Total Ongoing Works</h3>
            <Button variant="link" className="text-sm p-0 h-auto" onClick={() => handleMonthStatClick('ongoing')} disabled={currentMonthStats.ongoingSummary.totalCount === 0}>View All ({currentMonthStats.ongoingSummary.totalCount})</Button>
          </div>
          <div className="space-y-2">
            {currentMonthStats.ongoingSummary.totalCount > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {sitePurposeOptions.filter(p => currentMonthStats.ongoingSummary.byPurpose[p] > 0).map(p => (
                  <button key={`${p}-ongoing`} className="flex justify-between items-center text-sm p-2 rounded-md hover:bg-orange-100/50" onClick={() => handleMonthPurposeClick(currentMonthStats.ongoingSummary.data, p, 'Ongoing')}>
                    <span className="font-medium">{p}</span><span className="font-bold text-orange-700">{currentMonthStats.ongoingSummary.byPurpose[p]}</span>
                  </button>
                ))}
              </div>
            ) : (<p className="text-sm text-muted-foreground italic text-center py-4">No ongoing works found.</p>)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
