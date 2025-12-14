// src/components/dashboard/WorkProgress.tsx
"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format, isWithinInterval, startOfMonth, endOfMonth, isValid, parse } from 'date-fns';
import type { DataEntryFormData, SiteDetailFormData, SitePurpose, SiteWorkStatus, ApplicationType } from '@/lib/schemas';
import { sitePurposeOptions } from '@/lib/schemas';
import { Input } from '@/components/ui/input';
import type { UserProfile } from '@/hooks/useAuth';

const CalendarCheck = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="m9 16 2 2 4-4"/></svg>
);
const Hourglass = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M5 22h14"/><path d="M5 2h14"/><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg>
);
const TrendingUp = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
);


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

const privateApplicationTypes: ApplicationType[] = ["Private_Domestic", "Private_Irrigation", "Private_Institution", "Private_Industry"];

interface DetailedWorkSummary extends WorkSummary {
    byPurposePrivate: Record<SitePurpose, number>;
    byPurposeDeposit: Record<SitePurpose, number>;
    privateData: Array<SiteDetailFormData & { fileNo: string; applicantName: string; }>;
    depositData: Array<SiteDetailFormData & { fileNo: string; applicantName: string; }>;
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

    const ongoingWorkStatuses: SiteWorkStatus[] = ["Work Order Issued", "Work in Progress", "Work Initiated", "Awaiting Dept. Rig"];
    const completedWorkStatuses: SiteWorkStatus[] = ["Work Failed", "Work Completed", "Bill Prepared", "Payment Completed", "Utilization Certificate Issued"];
    
    const isSupervisor = currentUser?.role === 'supervisor';
    const uniqueCompletedSites = new Map<string, SiteDetailFormData & { fileNo: string; applicantName: string; applicationType?: ApplicationType; }>();
    const ongoingSites: Array<SiteDetailFormData & { fileNo: string; applicantName: string; applicationType?: ApplicationType; }> = [];

    for (const entry of allFileEntries) {
      if (!entry.siteDetails) continue;
      for (const site of entry.siteDetails) {
        if (isSupervisor && site.supervisorUid !== currentUser.uid) continue;

        if (site.workStatus && completedWorkStatuses.includes(site.workStatus as SiteWorkStatus) && site.dateOfCompletion) {
          const completionDate = safeParseDate(site.dateOfCompletion);
          if (completionDate && isValid(completionDate) && isWithinInterval(completionDate, { start: startOfMonthDate, end: endOfMonthDate })) {
            const siteKey = `${entry.fileNo}-${site.nameOfSite}-${site.purpose}`;
            if (!uniqueCompletedSites.has(siteKey)) {
              uniqueCompletedSites.set(siteKey, { ...site, fileNo: entry.fileNo || 'N/A', applicantName: entry.applicantName || 'N/A', applicationType: entry.applicationType });
            }
          }
        }
        
        if (site.workStatus && ongoingWorkStatuses.includes(site.workStatus as SiteWorkStatus)) {
          ongoingSites.push({ ...site, fileNo: entry.fileNo || 'N/A', applicantName: entry.applicantName || 'N/A', applicationType: entry.applicationType });
        }
      }
    }
    
    const createDetailedSummary = (sites: (SiteDetailFormData & { fileNo: string; applicantName: string; applicationType?: ApplicationType; })[]): DetailedWorkSummary => {
        const byPurpose = sitePurposeOptions.reduce((acc, p) => ({ ...acc, [p]: 0 }), {} as Record<SitePurpose, number>);
        const byPurposePrivate = { ...byPurpose };
        const byPurposeDeposit = { ...byPurpose };
        
        const privateData: typeof sites = [];
        const depositData: typeof sites = [];

        sites.forEach(site => {
          if (site.purpose && sitePurposeOptions.includes(site.purpose as SitePurpose)) {
            const purpose = site.purpose as SitePurpose;
            byPurpose[purpose]++;
            
            if(site.applicationType && privateApplicationTypes.includes(site.applicationType)) {
                byPurposePrivate[purpose]++;
                privateData.push(site);
            } else {
                byPurposeDeposit[purpose]++;
                depositData.push(site);
            }
          }
        });
        return { 
            totalCount: sites.length, 
            byPurpose, 
            data: sites,
            byPurposePrivate,
            byPurposeDeposit,
            privateData,
            depositData,
        };
    };

    return {
        completedSummary: createDetailedSummary(Array.from(uniqueCompletedSites.values())),
        ongoingSummary: createDetailedSummary(ongoingSites),
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

  const handleMonthPurposeClick = (dataSource: DetailedWorkSummary, purpose: SitePurpose, type: 'Ongoing' | 'Completed') => {
    const filteredData = dataSource.data.filter(d => d.purpose === purpose);
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

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateString = e.target.value;
    // Expects "yyyy-MM" format
    const parsedDate = parse(dateString, 'yyyy-MM', new Date());
    if (isValid(parsedDate)) {
      setWorkReportMonth(parsedDate);
    }
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
             <Input type="month" className="w-full sm:w-[200px]" value={format(workReportMonth, 'yyyy-MM')} onChange={handleMonthChange} />
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
                  <button key={`${p}-completed`} className="flex justify-between items-center text-sm p-2 rounded-md hover:bg-green-100/50" onClick={() => handleMonthPurposeClick(currentMonthStats.completedSummary, p, 'Completed')}>
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
                 {(['BWC', 'TWC'] as const).map(purpose => (
                  <React.Fragment key={purpose}>
                    <button className="flex justify-between items-center text-sm p-2 rounded-md hover:bg-orange-100/50" onClick={() => handleMonthPurposeClick(currentMonthStats.ongoingSummary, purpose, 'Ongoing')}>
                        <span className="font-medium">{purpose}</span>
                        <span className="font-bold text-orange-700">{currentMonthStats.ongoingSummary.byPurpose[purpose]}</span>
                    </button>
                    <div>
                         <p className="text-xs text-muted-foreground pl-3">Private: <span className="font-semibold text-orange-700">{currentMonthStats.ongoingSummary.byPurposePrivate[purpose]}</span></p>
                        <p className="text-xs text-muted-foreground pl-3">Deposit: <span className="font-semibold text-orange-700">{currentMonthStats.ongoingSummary.byPurposeDeposit[purpose]}</span></p>
                    </div>
                  </React.Fragment>
                ))}
                {sitePurposeOptions.filter(p => !['BWC', 'TWC'].includes(p) && currentMonthStats.ongoingSummary.byPurpose[p] > 0).map(p => (
                  <button key={`${p}-ongoing`} className="flex justify-between items-center text-sm p-2 rounded-md hover:bg-orange-100/50 col-span-1" onClick={() => handleMonthPurposeClick(currentMonthStats.ongoingSummary, p, 'Ongoing')}>
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
