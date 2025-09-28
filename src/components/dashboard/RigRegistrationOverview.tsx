// src/components/dashboard/RigRegistrationOverview.tsx
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FileStack, Wrench, CheckCircle, AlertTriangle, Ban, CalendarX } from "lucide-react";
import type { AgencyApplication, RigRegistration, RigType } from '@/lib/schemas';
import { rigTypeOptions } from '@/lib/schemas';
import { addYears, isValid, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';

interface RigRegistrationOverviewProps {
  agencyApplications: AgencyApplication[];
  onOpenDialog: (data: any[], title: string, columns: any[]) => void;
}

const rigTypeColumns: RigType[] = ["Hand Bore", "Filter Point Rig", "Calyx Rig", "Rotary Rig", "DTH Rig", "Rotary cum DTH Rig"];

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

const rigHeaderLabels: Record<string, string> = {
    "Hand Bore": "Hand<br/>Bore",
    "Filter Point Rig": "Filter<br/>Point",
    "Calyx Rig": "Calyx",
    "Rotary Rig": "Rotary",
    "DTH Rig": "DTH",
    "Rotary cum DTH Rig": "Rotary<br/>cum DTH",
};

export default function RigRegistrationOverview({ agencyApplications, onOpenDialog }: RigRegistrationOverviewProps) {

  const summaryData = React.useMemo(() => {
    const initialCounts = () => rigTypeColumns.reduce((acc, type) => ({ ...acc, [type]: { count: 0, data: [] } }), {});
    
    const activeRigs: Record<RigType, { count: number; data: any[] }> = initialCounts();
    const expiredRigs: Record<RigType, { count: number; data: any[] }> = initialCounts();
    const cancelledRigs: Record<RigType, { count: number; data: any[] }> = initialCounts();
    let totalAgencies = 0;
    let allRigsData: any[] = [];
    
    const completedApps = agencyApplications.filter(app => app.status === 'Active');
    totalAgencies = completedApps.length;

    completedApps.forEach(app => {
        (app.rigs || []).forEach(rig => {
            const rigWithContext = { ...rig, agencyName: app.agencyName, ownerName: app.owner.name };
            allRigsData.push(rigWithContext);
            const rigType = rig.typeOfRig;
            if (!rigType || !rigTypeColumns.includes(rigType)) return;

            if (rig.status === 'Active') {
                const lastEffectiveDate = rig.renewals && rig.renewals.length > 0
                    ? [...rig.renewals].sort((a, b) => (safeParseDate(b.renewalDate)?.getTime() ?? 0) - (safeParseDate(a.renewalDate)?.getTime() ?? 0))[0].renewalDate
                    : rig.registrationDate;

                if (lastEffectiveDate) {
                    const validityDate = new Date(addYears(new Date(lastEffectiveDate), 1).getTime() - 24 * 60 * 60 * 1000);
                    if (isValid(validityDate) && new Date() > validityDate) {
                        expiredRigs[rigType].count++;
                        expiredRigs[rigType].data.push(rigWithContext);
                    } else {
                        activeRigs[rigType].count++;
                        activeRigs[rigType].data.push(rigWithContext);
                    }
                } else {
                     activeRigs[rigType].count++;
                     activeRigs[rigType].data.push(rigWithContext);
                }
            } else if (rig.status === 'Cancelled') {
                cancelledRigs[rigType].count++;
                cancelledRigs[rigType].data.push(rigWithContext);
            }
        });
    });

    const calculateTotal = (data: Record<RigType, { count: number; data: any[] }>) => ({
        count: rigTypeColumns.reduce((sum, type) => sum + data[type].count, 0),
        data: rigTypeColumns.flatMap(type => data[type].data)
    });
    
    return {
        totalAgencies: { count: totalAgencies, data: completedApps },
        totalRigs: { count: allRigsData.length, data: allRigsData },
        activeRigs,
        expiredRigs,
        cancelledRigs,
        activeTotal: calculateTotal(activeRigs),
        expiredTotal: calculateTotal(expiredRigs),
        cancelledTotal: calculateTotal(cancelledRigs),
    };

  }, [agencyApplications]);
  
  const handleCellClick = (data: any[], title: string) => {
    const columns = [
        { key: 'slNo', label: 'Sl. No.' },
        { key: 'agencyName', label: 'Agency Name' },
        { key: 'ownerName', label: 'Owner' },
        { key: 'regNo', label: 'Rig Reg. No.' },
        { key: 'typeOfRig', label: 'Type of Rig' },
        { key: 'validity', label: 'Validity Upto' },
    ];
    
    const dialogData = data.map((item, index) => {
        let validity = 'N/A';
        if (item.status === 'Active') {
            const lastDate = item.renewals?.length > 0 ? [...item.renewals].sort((a: any, b: any) => (safeParseDate(b.renewalDate)?.getTime() ?? 0) - (safeParseDate(a.renewalDate)?.getTime() ?? 0))[0].renewalDate : item.registrationDate;
            if(lastDate) {
                const validityDate = new Date(addYears(new Date(lastDate), 1).getTime() - 24 * 60 * 60 * 1000);
                if (isValid(validityDate)) validity = validityDate.toLocaleDateString('en-IN');
            }
        }
        return {
            slNo: index + 1,
            agencyName: item.agencyName,
            ownerName: item.ownerName,
            regNo: item.rigRegistrationNo || 'N/A',
            typeOfRig: item.typeOfRig || 'N/A',
            validity,
        };
    });

    onOpenDialog(dialogData, title, columns);
  };
  
  const renderCell = (title: string, data: { count: number, data: any[] }) => (
    <TableCell className="text-center font-semibold">
      <Button variant="link" className="p-0 h-auto font-semibold" disabled={data.count === 0} onClick={() => handleCellClick(data.data, title)}>
        {data.count}
      </Button>
    </TableCell>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><FileStack className="h-5 w-5 text-primary" />Rig Registration Overview</CardTitle>
        <CardDescription>Summary of all registered rig agencies and their status.</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[200px] font-semibold text-sm">Status</TableHead>
                    {rigTypeColumns.map(type => (
                        <TableHead key={type} className="text-center font-semibold text-xs p-1" dangerouslySetInnerHTML={{ __html: rigHeaderLabels[type] }} />
                    ))}
                    <TableHead className="text-center font-semibold text-sm p-2">Total</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                <TableRow>
                    <TableCell className="font-medium">Total Agencies</TableCell>
                    <TableCell colSpan={rigTypeColumns.length} className="text-center font-semibold">
                        <Button variant="link" className="p-0 h-auto font-semibold" disabled={summaryData.totalAgencies.count === 0} onClick={() => handleCellClick(summaryData.totalAgencies.data, "Total Registered Agencies")}>
                            {summaryData.totalAgencies.count}
                        </Button>
                    </TableCell>
                     <TableCell className="text-center font-semibold">
                        <Button variant="link" className="p-0 h-auto font-semibold" disabled={summaryData.totalAgencies.count === 0} onClick={() => handleCellClick(summaryData.totalAgencies.data, "Total Registered Agencies")}>
                            {summaryData.totalAgencies.count}
                        </Button>
                    </TableCell>
                </TableRow>
                 <TableRow>
                    <TableCell className="font-medium">Total Rigs</TableCell>
                     <TableCell colSpan={rigTypeColumns.length} className="text-center font-semibold">
                        <Button variant="link" className="p-0 h-auto font-semibold" disabled={summaryData.totalRigs.count === 0} onClick={() => handleCellClick(summaryData.totalRigs.data, "Total Registered Rigs")}>
                            {summaryData.totalRigs.count}
                        </Button>
                    </TableCell>
                     <TableCell className="text-center font-semibold">
                        <Button variant="link" className="p-0 h-auto font-semibold" disabled={summaryData.totalRigs.count === 0} onClick={() => handleCellClick(summaryData.totalRigs.data, "Total Registered Rigs")}>
                            {summaryData.totalRigs.count}
                        </Button>
                    </TableCell>
                </TableRow>
                <TableRow>
                    <TableCell className="font-medium text-green-700">Active Rigs</TableCell>
                    {rigTypeColumns.map(type => renderCell(`Active Rigs - ${type}`, summaryData.activeRigs[type]))}
                    {renderCell('Total Active Rigs', summaryData.activeTotal)}
                </TableRow>
                <TableRow>
                    <TableCell className="font-medium text-amber-700">Expired Rigs</TableCell>
                    {rigTypeColumns.map(type => renderCell(`Expired Rigs - ${type}`, summaryData.expiredRigs[type]))}
                    {renderCell('Total Expired Rigs', summaryData.expiredTotal)}
                </TableRow>
                <TableRow>
                    <TableCell className="font-medium text-red-700">Cancelled Rigs</TableCell>
                     {rigTypeColumns.map(type => renderCell(`Cancelled Rigs - ${type}`, summaryData.cancelledRigs[type]))}
                    {renderCell('Total Cancelled Rigs', summaryData.cancelledTotal)}
                </TableRow>
            </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
