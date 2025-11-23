// src/components/dashboard/FileStatusOverview.tsx
"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";
import { format, isValid } from 'date-fns';
import { type DataEntryFormData, fileStatusOptions } from '@/lib/schemas';

const AgeStatCard = ({ title, total, closed, balance, onClick, onClosedClick, onBalanceClick }: { title: string; total: number; closed: number; balance: number; onClick: () => void; onClosedClick: () => void; onBalanceClick: () => void; }) => (
  <div
    className="p-3 text-center rounded-md border bg-secondary/30 transition-colors"
  >
    <p className="text-xs font-semibold text-muted-foreground mb-2">{title}</p>
    <div className="grid grid-cols-3 gap-1">
        <button onClick={onClick} disabled={total === 0} className="flex flex-col items-center p-1 rounded-md hover:bg-blue-100 disabled:opacity-60 disabled:cursor-not-allowed">
            <span className="text-xs font-medium text-blue-600">Total</span>
            <span className="text-lg font-bold text-blue-700">{total}</span>
        </button>
        <button onClick={onClosedClick} disabled={closed === 0} className="flex flex-col items-center p-1 rounded-md hover:bg-red-100 disabled:opacity-60 disabled:cursor-not-allowed">
            <span className="text-xs font-medium text-red-600">Closed</span>
            <span className="text-lg font-bold text-red-700">{closed}</span>
        </button>
        <button onClick={onBalanceClick} disabled={balance === 0} className="flex flex-col items-center p-1 rounded-md hover:bg-green-100 disabled:opacity-60 disabled:cursor-not-allowed">
            <span className="text-xs font-medium text-green-600">Balance</span>
            <span className="text-lg font-bold text-green-700">{balance}</span>
        </button>
    </div>
  </div>
);

interface FileStatusOverviewProps {
  onOpenDialog: (data: any[], title: string, columns: any[], type: 'fileStatus' | 'age') => void;
  nonArsEntries: DataEntryFormData[];
}

export default function FileStatusOverview({ onOpenDialog, nonArsEntries }: FileStatusOverviewProps) {

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

            const basisDate = latestRemittanceDate || ((entry as any).createdAt ? new Date((entry as any).createdAt) : null);

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
        
        const processAgeGroup = (group: DataEntryFormData[]) => {
            const total = group.length;
            const closedData = group.filter(e => e.fileStatus === 'File Closed');
            const closed = closedData.length;
            const balanceData = group.filter(e => e.fileStatus !== 'File Closed');
            const balance = balanceData.length;
            return { total, closed, balance, data: { total: group, closed: closedData, balance: balanceData } };
        };

        return {
            fileStatusCountsData: fileStatusOptions.map(status => ({
                status,
                count: fileStatusCounts.get(status) || 0,
                data: nonArsEntries.filter(e => e.fileStatus === status),
            })),
            filesByAgeStats: {
                lessThan1: processAgeGroup(ageGroups.lessThan1),
                between1And2: processAgeGroup(ageGroups.between1And2),
                between2And3: processAgeGroup(ageGroups.between2And3),
                between3And4: processAgeGroup(ageGroups.between3And4),
                between4And5: processAgeGroup(ageGroups.between4And5),
                above5: processAgeGroup(ageGroups.above5),
            },
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

  const handleAgeCardClick = (data: DataEntryFormData[], title: string) => {
     if (data.length === 0) return;
    
    const dataForDialog = data.map((entry, index) => {
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <AgeStatCard title="< 1 Year" {...fileStatusData.filesByAgeStats.lessThan1} 
                onClick={() => handleAgeCardClick(fileStatusData.filesByAgeStats.lessThan1.data.total, 'Files Aged < 1 Year (Total)')} 
                onClosedClick={() => handleAgeCardClick(fileStatusData.filesByAgeStats.lessThan1.data.closed, 'Files Aged < 1 Year (Closed)')} 
                onBalanceClick={() => handleAgeCardClick(fileStatusData.filesByAgeStats.lessThan1.data.balance, 'Files Aged < 1 Year (Balance)')} 
              />
              <AgeStatCard title="1-2 Years" {...fileStatusData.filesByAgeStats.between1And2}
                onClick={() => handleAgeCardClick(fileStatusData.filesByAgeStats.between1And2.data.total, 'Files Aged 1-2 Years (Total)')}
                onClosedClick={() => handleAgeCardClick(fileStatusData.filesByAgeStats.between1And2.data.closed, 'Files Aged 1-2 Years (Closed)')}
                onBalanceClick={() => handleAgeCardClick(fileStatusData.filesByAgeStats.between1And2.data.balance, 'Files Aged 1-2 Years (Balance)')}
              />
              <AgeStatCard title="2-3 Years" {...fileStatusData.filesByAgeStats.between2And3}
                onClick={() => handleAgeCardClick(fileStatusData.filesByAgeStats.between2And3.data.total, 'Files Aged 2-3 Years (Total)')}
                onClosedClick={() => handleAgeCardClick(fileStatusData.filesByAgeStats.between2And3.data.closed, 'Files Aged 2-3 Years (Closed)')}
                onBalanceClick={() => handleAgeCardClick(fileStatusData.filesByAgeStats.between2And3.data.balance, 'Files Aged 2-3 Years (Balance)')}
              />
              <AgeStatCard title="3-4 Years" {...fileStatusData.filesByAgeStats.between3And4}
                onClick={() => handleAgeCardClick(fileStatusData.filesByAgeStats.between3And4.data.total, 'Files Aged 3-4 Years (Total)')}
                onClosedClick={() => handleAgeCardClick(fileStatusData.filesByAgeStats.between3And4.data.closed, 'Files Aged 3-4 Years (Closed)')}
                onBalanceClick={() => handleAgeCardClick(fileStatusData.filesByAgeStats.between3And4.data.balance, 'Files Aged 3-4 Years (Balance)')}
              />
              <AgeStatCard title="4-5 Years" {...fileStatusData.filesByAgeStats.between4And5}
                onClick={() => handleAgeCardClick(fileStatusData.filesByAgeStats.between4And5.data.total, 'Files Aged 4-5 Years (Total)')}
                onClosedClick={() => handleAgeCardClick(fileStatusData.filesByAgeStats.between4And5.data.closed, 'Files Aged 4-5 Years (Closed)')}
                onBalanceClick={() => handleAgeCardClick(fileStatusData.filesByAgeStats.between4And5.data.balance, 'Files Aged 4-5 Years (Balance)')}
              />
              <AgeStatCard title="> 5 Years" {...fileStatusData.filesByAgeStats.above5}
                onClick={() => handleAgeCardClick(fileStatusData.filesByAgeStats.above5.data.total, 'Files Aged > 5 Years (Total)')}
                onClosedClick={() => handleAgeCardClick(fileStatusData.filesByAgeStats.above5.data.closed, 'Files Aged > 5 Years (Closed)')}
                onBalanceClick={() => handleAgeCardClick(fileStatusData.filesByAgeStats.above5.data.balance, 'Files Aged > 5 Years (Balance)')}
              />
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
