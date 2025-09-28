// src/components/dashboard/RigRegistrationOverview.tsx
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FileStack, CheckCircle, AlertTriangle, Ban } from "lucide-react";
import type { AgencyApplication, RigRegistration, RigType } from '@/lib/schemas';
import { rigTypeOptions } from '@/lib/schemas';
import { addYears, isValid } from 'date-fns';
import { cn } from '@/lib/utils';

interface RigRegistrationOverviewProps {
  agencyApplications: AgencyApplication[];
  onOpenDialog: (data: any[], title: string, columns: any[]) => void;
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

const StatusHeader = ({ icon: Icon, text, className }: { icon: React.ElementType, text: string, className?: string }) => (
    <div className={cn("flex items-center justify-center gap-1.5", className)}>
        <Icon className="h-4 w-4" />
        <span>{text}</span>
    </div>
);

export default function RigRegistrationOverview({ agencyApplications, onOpenDialog }: RigRegistrationOverviewProps) {

  const summaryData = React.useMemo(() => {
    const initialCounts = () => ({
        active: { count: 0, data: [] as any[] },
        expired: { count: 0, data: [] as any[] },
        cancelled: { count: 0, data: [] as any[] },
    });
    
    const rigData = rigTypeOptions.reduce((acc, type) => ({ ...acc, [type]: initialCounts() }), {} as Record<RigType, ReturnType<typeof initialCounts>>);

    const completedApps = agencyApplications.filter(app => app.status === 'Active');

    completedApps.forEach(app => {
        (app.rigs || []).forEach(rig => {
            const rigWithContext = { ...rig, agencyName: app.agencyName, ownerName: app.owner.name };
            const rigType = rig.typeOfRig;
            if (!rigType || !rigTypeOptions.includes(rigType)) return;

            if (rig.status === 'Active') {
                const lastEffectiveDate = rig.renewals && rig.renewals.length > 0
                    ? [...rig.renewals].sort((a, b) => (safeParseDate(b.renewalDate)?.getTime() ?? 0) - (safeParseDate(a.renewalDate)?.getTime() ?? 0))[0].renewalDate
                    : rig.registrationDate;

                if (lastEffectiveDate) {
                    const validityDate = new Date(addYears(new Date(lastEffectiveDate), 1).getTime() - 24 * 60 * 60 * 1000);
                    if (isValid(validityDate) && new Date() > validityDate) {
                        rigData[rigType].expired.count++;
                        rigData[rigType].expired.data.push(rigWithContext);
                    } else {
                        rigData[rigType].active.count++;
                        rigData[rigType].active.data.push(rigWithContext);
                    }
                } else {
                     rigData[rigType].active.count++;
                     rigData[rigType].active.data.push(rigWithContext);
                }
            } else if (rig.status === 'Cancelled') {
                rigData[rigType].cancelled.count++;
                rigData[rigType].cancelled.data.push(rigWithContext);
            }
        });
    });

    const totals = {
      active: rigTypeOptions.reduce((sum, type) => sum + rigData[type].active.count, 0),
      expired: rigTypeOptions.reduce((sum, type) => sum + rigData[type].expired.count, 0),
      cancelled: rigTypeOptions.reduce((sum, type) => sum + rigData[type].cancelled.count, 0),
      total: rigTypeOptions.reduce((sum, type) => sum + rigData[type].active.count + rigData[type].expired.count + rigData[type].cancelled.count, 0)
    };

    const totalData = {
        active: rigTypeOptions.flatMap(type => rigData[type].active.data),
        expired: rigTypeOptions.flatMap(type => rigData[type].expired.data),
        cancelled: rigTypeOptions.flatMap(type => rigData[type].cancelled.data),
    };

    return { rigData, totals, totalData };
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
        } else if (item.status === 'Cancelled') {
            validity = 'Cancelled';
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

  return (
    <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileStack className="h-5 w-5 text-primary" />Rig Registration Overview</CardTitle>
            <CardDescription>A summary of all registered rigs by type and current status.</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[200px] font-semibold">Rig Type</TableHead>
                        <TableHead className="text-center"><StatusHeader icon={CheckCircle} text="Active" className="text-green-600" /></TableHead>
                        <TableHead className="text-center"><StatusHeader icon={AlertTriangle} text="Expired" className="text-amber-600" /></TableHead>
                        <TableHead className="text-center"><StatusHeader icon={Ban} text="Cancelled" className="text-red-600" /></TableHead>
                        <TableHead className="text-center font-semibold">Total</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rigTypeOptions.map(type => {
                        const typeData = summaryData.rigData[type];
                        const totalForType = typeData.active.count + typeData.expired.count + typeData.cancelled.count;
                        if (totalForType === 0) return null; // Don't show rows with no rigs
                        
                        return (
                            <TableRow key={type}>
                                <TableCell className="font-medium">{type}</TableCell>
                                <TableCell className="text-center">
                                    <Button variant="link" className="p-0 h-auto font-semibold" onClick={() => handleCellClick(typeData.active.data, `Active - ${type}`)} disabled={typeData.active.count === 0}>{typeData.active.count}</Button>
                                </TableCell>
                                <TableCell className="text-center">
                                    <Button variant="link" className="p-0 h-auto font-semibold text-amber-600" onClick={() => handleCellClick(typeData.expired.data, `Expired - ${type}`)} disabled={typeData.expired.count === 0}>{typeData.expired.count}</Button>
                                </TableCell>
                                <TableCell className="text-center">
                                    <Button variant="link" className="p-0 h-auto font-semibold text-red-600" onClick={() => handleCellClick(typeData.cancelled.data, `Cancelled - ${type}`)} disabled={typeData.cancelled.count === 0}>{typeData.cancelled.count}</Button>
                                </TableCell>
                                <TableCell className="text-center font-bold">{totalForType}</TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
                <TableFooter>
                    <TableRow className="bg-muted/50">
                        <TableHead className="font-bold text-primary">Grand Total</TableHead>
                        <TableHead className="text-center font-bold text-primary">
                             <Button variant="link" className="p-0 h-auto font-bold text-primary" onClick={() => handleCellClick(summaryData.totalData.active, 'All Active Rigs')} disabled={summaryData.totals.active === 0}>{summaryData.totals.active}</Button>
                        </TableHead>
                        <TableHead className="text-center font-bold text-primary">
                             <Button variant="link" className="p-0 h-auto font-bold text-primary" onClick={() => handleCellClick(summaryData.totalData.expired, 'All Expired Rigs')} disabled={summaryData.totals.expired === 0}>{summaryData.totals.expired}</Button>
                        </TableHead>
                        <TableHead className="text-center font-bold text-primary">
                            <Button variant="link" className="p-0 h-auto font-bold text-primary" onClick={() => handleCellClick(summaryData.totalData.cancelled, 'All Cancelled Rigs')} disabled={summaryData.totals.cancelled === 0}>{summaryData.totals.cancelled}</Button>
                        </TableHead>
                        <TableHead className="text-center font-bold text-primary">{summaryData.totals.total}</TableHead>
                    </TableRow>
                </TableFooter>
            </Table>
        </CardContent>
    </Card>
  );
}
