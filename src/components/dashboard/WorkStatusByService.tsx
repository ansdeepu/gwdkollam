// src/components/dashboard/WorkStatusByService.tsx
"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import type { DataEntryFormData, SitePurpose, SiteWorkStatus, UserRole } from '@/lib/schemas';
import { cn } from '@/lib/utils';

const Activity = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
);


const dashboardWorkStatusOrder: SiteWorkStatus[] = ["Under Process", "Addl. AS Awaited", "To be Refunded", "Awaiting Dept. Rig", "To be Tendered", "TS Pending", "Tendered", "Selection Notice Issued", "Work Order Issued", "Work in Progress", "Work Failed", "Work Completed"];
const dashboardServiceOrder: SitePurpose[] = ["BWC", "TWC", "FPW", "BW Dev", "TW Dev", "FPW Dev", "MWSS", "MWSS Ext", "Pumping Scheme", "MWSS Pump Reno", "HPS", "HPR"];

const serviceHeaderLabels: Record<string, string> = {
    'BWC': 'BWC', 'TWC': 'TWC', 'FPW': 'FPW', 'BW Dev': 'BW<br/>Dev', 'TW Dev': 'TW<br/>Dev',
    'FPW Dev': 'FPW<br/>Dev', 'MWSS': 'MWSS', 'MWSS Ext': 'MWSS<br/>Ext', 'Pumping Scheme': 'Pumping<br/>Scheme',
    'MWSS Pump Reno': 'MWSS<br/>Pump<br/>Reno', 'HPS': 'HPS', 'HPR': 'HPR',
};

interface WorkStatusByServiceProps {
  allFileEntries: DataEntryFormData[];
  onOpenDialog: (data: any[], title: string, columns: any[], type: 'detail') => void;
  currentUserRole?: UserRole;
}

interface WorkStatusRow {
  statusCategory: string;
  total: { count: number; data: any[] };
  [service: string]: any; // Allows dynamic service keys
}


export default function WorkStatusByService({ allFileEntries, onOpenDialog, currentUserRole }: WorkStatusByServiceProps) {
    const workStatusByServiceData = useMemo(() => {
        const totalApplicationsRow = "Total No. of Works/Files";
        const reorderedRowLabels = [...dashboardWorkStatusOrder, totalApplicationsRow];
        
        const initialWorkStatusData: WorkStatusRow[] = reorderedRowLabels.map(statusCategory => {
            const serviceCounts: { [service: string]: { count: number, data: any[] } } = {};
            dashboardServiceOrder.forEach(service => {
                serviceCounts[service] = { count: 0, data: [] };
            });
            return { statusCategory, ...serviceCounts, total: { count: 0, data: [] } };
        });

        for (const entry of allFileEntries) {
            entry.siteDetails?.forEach(sd => {
                const siteData = { ...sd, fileNo: entry.fileNo, applicantName: entry.applicantName };
                const purpose = sd.purpose as SitePurpose;
                if (sd.purpose && sd.workStatus && dashboardServiceOrder.includes(purpose)) {
                    const workStatusRow = initialWorkStatusData.find(row => row.statusCategory === sd.workStatus);
                    if (workStatusRow) {
                        workStatusRow[purpose].count++;
                        workStatusRow[purpose].data.push(siteData);
                        workStatusRow.total.count++;
                        workStatusRow.total.data.push(siteData);
                    }
                }
            });
        }

        const totalAppsRow = initialWorkStatusData.find(row => row.statusCategory === totalApplicationsRow);
        if (totalAppsRow) {
            dashboardServiceOrder.forEach(service => {
                let columnTotal = 0;
                const columnData: any[] = [];
                initialWorkStatusData.forEach(row => {
                    if (row.statusCategory !== totalApplicationsRow) {
                        const serviceData = (row as any)[service];
                        columnTotal += serviceData.count;
                        columnData.push(...serviceData.data);
                    }
                });
                (totalAppsRow as any)[service].count = columnTotal;
                (totalAppsRow as any)[service].data = columnData;
            });

            let grandTotalCount = 0;
            const grandTotalData: any[] = [];
            initialWorkStatusData.forEach(row => {
                if (row.statusCategory !== totalApplicationsRow) {
                    grandTotalCount += (row as any).total.count;
                    grandTotalData.push(...(row as any).total.data);
                }
            });
            (totalAppsRow as any).total.count = grandTotalCount;
            (totalAppsRow as any).total.data = grandTotalData;
        }

        let finalWorkStatusData = initialWorkStatusData;
        if (currentUserRole === 'supervisor') {
            finalWorkStatusData = initialWorkStatusData.filter(row => row.total.count > 0 || row.statusCategory === totalApplicationsRow);
        }
        return finalWorkStatusData;
    }, [allFileEntries, currentUserRole]);

  const handleWorkStatusCellClick = (data: any[], title: string) => {
    const dialogData = data.map((site, index) => ({
      slNo: index + 1,
      fileNo: site.fileNo,
      applicantName: site.applicantName,
      siteName: site.nameOfSite,
      purpose: site.purpose,
      workStatus: site.workStatus
    }));
    const columns = [
      { key: 'slNo', label: 'Sl. No.' },
      { key: 'fileNo', label: 'File No.' },
      { key: 'applicantName', label: 'Applicant Name' },
      { key: 'siteName', label: 'Site Name' },
      { key: 'purpose', label: 'Purpose' },
      { key: 'workStatus', label: 'Work Status' }
    ];
    onOpenDialog(dialogData, title, columns, 'detail');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary" />Work Status by Service</CardTitle>
        <CardDescription>Breakdown of application statuses across different service categories. Click on a number to see detailed reports.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-x-auto">
          {workStatusByServiceData && workStatusByServiceData.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold p-2">Work Category</TableHead>
                  {[...dashboardServiceOrder, 'Total'].map(service => (
                    <TableHead key={service} className={cn("text-center font-semibold p-1", service === 'Total' && 'text-primary bg-primary/10')} dangerouslySetInnerHTML={{ __html: service === 'Total' ? service : (serviceHeaderLabels[service] || service) }} />
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {workStatusByServiceData.map((row) => {
                  const isTotalRow = row.statusCategory === "Total No. of Works/Files";
                  return (
                  <TableRow key={row.statusCategory} className={cn(isTotalRow && 'bg-primary/10 hover:bg-primary/20')}>
                    <TableCell className={cn("font-medium p-2 whitespace-normal break-words", isTotalRow && 'text-primary font-bold')}>{row.statusCategory}</TableCell>
                    {dashboardServiceOrder.map(service => (
                      <TableCell key={service} className={cn("text-center p-2", isTotalRow && "font-bold")}>
                        {(row as any)[service].count > 0 ? (
                          <Button variant="link" className={cn("p-0 h-auto font-semibold", isTotalRow && 'font-bold text-primary')} onClick={() => handleWorkStatusCellClick((row as any)[service].data, `${row.statusCategory} - ${service}`)}>{(row as any)[service].count}</Button>
                        ) : (0)}
                      </TableCell>
                    ))}
                    <TableCell className="text-center p-2 font-bold bg-primary/10 text-primary">
                      {(row as any)['total'].count > 0 ? (
                        <Button variant="link" className="p-0 h-auto font-bold text-primary" onClick={() => handleWorkStatusCellClick((row as any)['total'].data, `${row.statusCategory} - Total`)}>{(row as any)['total'].count}</Button>
                      ) : (0)}
                    </TableCell>
                  </TableRow>
                )})}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-4">No work status data available for services.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
