// src/components/dashboard/FileStatusOverview.tsx
"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";
import { format, isValid } from 'date-fns';
import { type DataEntryFormData, fileStatusOptions } from '@/lib/schemas';

const AgeStatCard = ({ title, count, onClick }: { title: string; count: number; onClick: () => void }) => (
  <button
    onClick={onClick}
    disabled={count === 0}
    className="p-2 text-center rounded-md border bg-secondary/30 hover:bg-secondary/50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
  >
    <p className="text-xs font-medium text-muted-foreground">{title}</p>
    <p className="text-xl font-bold text-foreground">{count}</p>
  </button>
);

interface FileStatusOverviewProps {
  nonArsEntries: DataEntryFormData[];
  onOpenDialog: (data: any[], title: string, columns: any[], type: 'fileStatus' | 'age') => void;
}

export default function FileStatusOverview({ nonArsEntries, onOpenDialog }: FileStatusOverviewProps) {
    const fileStatusData = useMemo(() => {
        const fileStatusCounts = new Map<string, number>();
        fileStatusOptions.forEach(status => fileStatusCounts.set(status, 0));

        const ageGroups: Record<string, DataEntryFormData[]> = {
            lessThan1: [], between1And2: [], between2And3: [], between3And4: [], between4And5: [], above5: [],
        };

        const now = new Date();

        for (const entry of nonArsEntries) {
            if (entry.fileStatus && fileStatusCounts.has(entry.fileStatus)) {
                fileStatusCounts.set(entry.fileStatus, (fileStatusCounts.get(entry.fileStatus) || 0) + 1);
            }

            const latestRemittanceDate = entry.remittanceDetails
                ?.map(rd => rd.dateOfRemittance ? new Date(rd.dateOfRemittance) : null)
                .filter((d): d is Date => d !== null && isValid(d))
                .sort((a, b) => b.getTime() - a.getTime())[0];

            const basisDate = latestRemittanceDate || (entry.createdAt ? new Date(entry.createdAt) : null);

            if (basisDate && isValid(basisDate)) {
                const ageInMs = now.getTime() - basisDate.getTime();
                const ageInYears = ageInMs / (1000 * 3600 * 24 * 365.25);
                if (ageInYears < 1) ageGroups.lessThan1.push(entry);
                else if (ageInYears >= 1 && ageInYears < 2) ageGroups.between1And2.push(entry);
                else if (ageInYears >= 2 && ageInYears < 3) ageGroups.between2And3.push(entry);
                else if (ageInYears >= 3 && ageInYears < 4) ageGroups.between3And4.push(entry);
                else if (ageInYears >= 4 && ageInYears < 5) ageGroups.between4And5.push(entry);
                else if (ageInYears >= 5) ageGroups.above5.push(entry);
            }
        }

        return {
            fileStatusCountsData: fileStatusOptions.map(status => ({
                status,
                count: fileStatusCounts.get(status) || 0,
                data: nonArsEntries.filter(e => e.fileStatus === status),
            })),
            filesByAgeCounts: {
                lessThan1: ageGroups.lessThan1.length,
                between1And2: ageGroups.between1And2.length,
                between2And3: ageGroups.between2And3.length,
                between3And4: ageGroups.between3And4.length,
                between4And5: ageGroups.between4And5.length,
                above5: ageGroups.above5.length,
            },
            filesByAgeData: ageGroups,
            totalFiles: nonArsEntries.length,
        };
    }, [nonArsEntries]);

  const handleFileStatusCardClick = (status: string) => {
    const dataForDialog = fileStatusData?.fileStatusCountsData.find(item => item.status === status)?.data ?? [];

    const columns = [
      { key: 'slNo', label: 'Sl. No.' }, { key: 'fileNo', label: 'File No.' },
      { key: 'applicantName', label: 'Applicant Name' }, { key: 'siteNames', label: 'Site(s)' },
      { key: 'firstRemittanceDate', label: 'First Remittance' }, { key: 'workStatuses', label: 'Site Status(es)' },
    ];
    
    const mappedData = dataForDialog.map((entry, index) => ({
      slNo: index + 1, fileNo: entry.fileNo || 'N/A', applicantName: entry.applicantName || 'N/A',
      siteNames: entry.siteDetails?.map(s => s.nameOfSite).join(', ') || 'N/A',
      firstRemittanceDate: entry.remittanceDetails?.[0]?.dateOfRemittance ? format(new Date(entry.remittanceDetails[0].dateOfRemittance), 'dd/MM/yyyy') : 'N/A',
      workStatuses: entry.siteDetails?.map(s => s.workStatus).join(', ') || 'N/A',
    }));

    onOpenDialog(mappedData, `Files with Status: "${status}"`, columns, 'fileStatus');
  };

  const handleAgeCardClick = (category: keyof typeof fileStatusData.filesByAgeData, title: string) => {
    const dataForDialog = fileStatusData.filesByAgeData[category].map((entry, index) => {
      const latestRemittanceDate = entry.remittanceDetails?.map(rd => (rd.dateOfRemittance ? new Date(rd.dateOfRemittance) : null)).filter((d): d is Date => d !== null && isValid(d)).sort((a, b) => b.getTime() - a.getTime())[0];
      return {
        slNo: index + 1, fileNo: entry.fileNo || 'N/A', applicantName: entry.applicantName || 'N/A',
        siteNames: entry.siteDetails?.map(sd => sd.nameOfSite).filter(Boolean).join(', ') || 'N/A',
        lastRemittanceDate: latestRemittanceDate ? format(latestRemittanceDate, 'dd/MM/yyyy') : 'N/A',
        fileStatus: entry.fileStatus || 'N/A',
      };
    }) || [];

    const columns = [
      { key: 'slNo', label: 'Sl. No.' }, { key: 'fileNo', label: 'File No.' },
      { key: 'applicantName', label: 'Applicant Name' }, { key: 'siteNames', label: 'Site Name(s)' },
      { key: 'lastRemittanceDate', label: 'Last Remittance Date' }, { key: 'fileStatus', label: 'File Status' },
    ];
    onOpenDialog(dataForDialog, title, columns, 'age');
  };

  return (
    <Card className="shadow-lg flex flex-col h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-primary" />File Status Overview</CardTitle>
        <CardDescription>Current count of files by status, based on your visible files. Click a status to see details.</CardDescription>
        <div className="mt-2"><div className="inline-flex items-baseline gap-2 p-3 rounded-lg shadow-sm bg-primary/10 border border-primary/20"><h4 className="text-sm font-medium text-primary">Total Visible Files</h4><p className="text-2xl font-bold text-primary">{fileStatusData.totalFiles}</p></div></div>
        <div className="mt-6 pt-6 border-t border-border/60">
          <div className="flex items-center justify-between mb-3"><h4 className="text-sm font-medium text-primary">Files by Age</h4><p className="text-xs text-muted-foreground">Based on last remittance or creation date</p></div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            <AgeStatCard title="&lt; 1 Year" count={fileStatusData.filesByAgeCounts.lessThan1} onClick={() => handleAgeCardClick('lessThan1', 'Files Aged Less Than 1 Year')} />
            <AgeStatCard title="1-2 Years" count={fileStatusData.filesByAgeCounts.between1And2} onClick={() => handleAgeCardClick('between1And2', 'Files Aged 1-2 Years')} />
            <AgeStatCard title="2-3 Years" count={fileStatusData.filesByAgeCounts.between2And3} onClick={() => handleAgeCardClick('between2And3', 'Files Aged 2-3 Years')} />
            <AgeStatCard title="3-4 Years" count={fileStatusData.filesByAgeCounts.between3And4} onClick={() => handleAgeCardClick('between3And4', 'Files Aged 3-4 Years')} />
            <AgeStatCard title="4-5 Years" count={fileStatusData.filesByAgeCounts.between4And5} onClick={() => handleAgeCardClick('between4And5', 'Files Aged 4-5 Years')} />
            <AgeStatCard title="&gt; 5 Years" count={fileStatusData.filesByAgeCounts.above5} onClick={() => handleAgeCardClick('above5', 'Files Aged Over 5 Years')} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="mt-auto space-y-2">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3">
          {fileStatusData.fileStatusCountsData.map((item) => (
            <button key={item.status} className="flex items-center justify-between p-3 rounded-lg border bg-secondary/30 text-left hover:bg-secondary/50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors" onClick={() => handleFileStatusCardClick(item.status)} disabled={item.count === 0}>
              <span className="text-sm font-medium text-foreground">{item.status}</span>
              <span className="text-lg font-bold text-primary">{item.count}</span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
