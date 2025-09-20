// src/components/dashboard/RigFinancialSummary.tsx
"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DollarSign, XCircle } from "lucide-react";
import type { AgencyApplication, RigType } from '@/lib/schemas';
import { format, startOfDay, endOfDay, isWithinInterval, isValid, parse } from 'date-fns';

interface RigFinancialSummaryProps {
    applications: AgencyApplication[];
}

const rigTypeColumns: RigType[] = ["Hand Bore", "Filter Point Rig", "Calyx Rig", "Rotary Rig", "DTH Rig", "Rotary cum DTH Rig"];

const safeParseDate = (dateValue: any): Date | null => {
  if (!dateValue) return null;
  if (dateValue instanceof Date) return dateValue;
  if (typeof dateValue === 'object' && dateValue !== null && typeof (dateValue as any).seconds === 'number') {
    return new Date((dateValue as any).seconds * 1000);
  }
  if (typeof dateValue === 'string') {
    const parsed = new Date(dateValue);
    if (isValid(parsed)) return parsed;
  }
  return null;
};

const FinancialRow = ({ label, data, total }: { label: string; data: Record<string, number>; total: number }) => (
    <TableRow>
      <TableHead>{label}</TableHead>
      {rigTypeColumns.map(rigType => (
        <TableCell key={rigType} className="text-center">{data[rigType] || 0}</TableCell>
      ))}
       <TableCell className="text-center font-bold">{total}</TableCell>
    </TableRow>
);

const FinancialAmountRow = ({ label, data, total }: { label: string; data: Record<string, number>; total: number }) => (
    <TableRow>
      <TableHead>{label}</TableHead>
      {rigTypeColumns.map(rigType => (
        <TableCell key={rigType} className="text-right font-mono">{(data[rigType] || 0).toLocaleString('en-IN')}</TableCell>
      ))}
       <TableCell className="text-right font-bold font-mono">{total.toLocaleString('en-IN')}</TableCell>
    </TableRow>
);


export default function RigFinancialSummary({ applications }: RigFinancialSummaryProps) {
    const [startDate, setStartDate] = useState<Date | undefined>();
    const [endDate, setEndDate] = useState<Date | undefined>();

    const summaryData = useMemo(() => {
        const sDate = startDate ? startOfDay(startDate) : null;
        const eDate = endDate ? endOfDay(endDate) : null;
        const isDateFilterActive = sDate && eDate;

        const checkDate = (date: Date | string | null | undefined): boolean => {
            if (!isDateFilterActive || !date) return true;
            const d = safeParseDate(date);
            return d ? isWithinInterval(d, { start: sDate, end: eDate }) : false;
        };
        
        const initialKeys = [
            'agencyRegCount', 'rigRegCount', 'renewalCount',
            'agencyRegAppFee', 'rigRegAppFee', 'agencyRegFee', 'rigRegFee', 'renewalFee'
        ];

        let data: Record<string, Record<string, number>> = {};
        initialKeys.forEach(key => {
            data[key] = {};
            rigTypeColumns.forEach(rigType => data[key][rigType] = 0);
        });
        
        applications.forEach(app => {
            if (checkDate(app.agencyRegistrationDate)) {
                data.agencyRegCount["Agency"] = (data.agencyRegCount["Agency"] || 0) + 1;
            }
            
            app.applicationFees?.forEach(fee => {
                if(checkDate(fee.applicationFeePaymentDate)) {
                    if (fee.applicationFeeType === "Agency Registration") {
                        data.agencyRegAppFee["Agency"] = (data.agencyRegAppFee["Agency"] || 0) + (Number(fee.applicationFeeAmount) || 0);
                    } else if (fee.applicationFeeType === "Rig Registration") {
                         data.rigRegAppFee["Agency"] = (data.rigRegAppFee["Agency"] || 0) + (Number(fee.applicationFeeAmount) || 0);
                    }
                }
            });

            if (checkDate(app.agencyPaymentDate)) {
                 data.agencyRegFee["Agency"] = (data.agencyRegFee["Agency"] || 0) + (Number(app.agencyRegistrationFee) || 0);
            }
            if (checkDate(app.agencyAdditionalPaymentDate)) {
                 data.agencyRegFee["Agency"] = (data.agencyRegFee["Agency"] || 0) + (Number(app.agencyAdditionalRegFee) || 0);
            }

            app.rigs?.forEach(rig => {
                const rigType = rig.typeOfRig;
                if (!rigType || !rigTypeColumns.includes(rigType)) return;

                if (checkDate(rig.registrationDate)) {
                    data.rigRegCount[rigType] = (data.rigRegCount[rigType] || 0) + 1;
                    data.rigRegFee[rigType] = (data.rigRegFee[rigType] || 0) + (Number(rig.registrationFee) || 0);
                }
                 if (checkDate(rig.additionalPaymentDate)) {
                    data.rigRegFee[rigType] = (data.rigRegFee[rigType] || 0) + (Number(rig.additionalRegistrationFee) || 0);
                }
                
                rig.renewals?.forEach(renewal => {
                    if (checkDate(renewal.renewalDate)) {
                        data.renewalCount[rigType] = (data.renewalCount[rigType] || 0) + 1;
                        data.renewalFee[rigType] = (data.renewalFee[rigType] || 0) + (Number(renewal.renewalFee) || 0);
                    }
                });
            });
        });
        
        const totals: Record<string, number> = {};
        Object.keys(data).forEach(key => {
            totals[key] = Object.values(data[key]).reduce((sum, val) => sum + val, 0);
        });

        const grandTotalOfFees =
            (totals.agencyRegAppFee || 0) +
            (totals.rigRegAppFee || 0) +
            (totals.agencyRegFee || 0) +
            (totals.rigRegFee || 0) +
            (totals.renewalFee || 0);

        return { ...data, totals, grandTotalOfFees };

    }, [applications, startDate, endDate]);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5 text-primary" />Rig Registration Financials</CardTitle>
                <CardDescription>Financial summary for rig and agency registrations, filterable by date.</CardDescription>
                <div className="flex flex-wrap items-center gap-2 pt-4 border-t mt-4">
                    <Input type="date" className="w-[240px]" value={startDate ? format(startDate, 'yyyy-MM-dd') : ''} onChange={(e) => setStartDate(e.target.value ? parse(e.target.value, 'yyyy-MM-dd', new Date()) : undefined)}/>
                    <Input type="date" className="w-[240px]" value={endDate ? format(endDate, 'yyyy-MM-dd') : ''} onChange={(e) => setEndDate(e.target.value ? parse(e.target.value, 'yyyy-MM-dd', new Date()) : undefined)}/>
                    <Button onClick={() => { setStartDate(undefined); setEndDate(undefined); }} variant="ghost" className="h-9 px-3"><XCircle className="mr-2 h-4 w-4"/>Clear</Button>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="min-w-[200px]">Service</TableHead>
                            {rigTypeColumns.map(rigType => <TableHead key={rigType} className="text-center">{rigType}</TableHead>)}
                            <TableHead className="text-center font-bold">Total</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <FinancialRow label="No. of Agency Registrations" data={summaryData.agencyRegCount} total={summaryData.totals.agencyRegCount} />
                        <FinancialRow label="No. of Rig Registrations" data={summaryData.rigRegCount} total={summaryData.totals.rigRegCount} />
                        <FinancialRow label="No. of Renewals" data={summaryData.renewalCount} total={summaryData.totals.renewalCount} />
                        
                        <TableRow className="bg-secondary/50 font-semibold"><TableCell colSpan={8} className="p-2">fees details (₹)</TableCell></TableRow>
                        
                        <FinancialAmountRow label="Agency Registration Application Fee" data={summaryData.agencyRegAppFee} total={summaryData.totals.agencyRegAppFee} />
                        <FinancialAmountRow label="Rig Registration Application Fee" data={summaryData.rigRegAppFee} total={summaryData.totals.rigRegAppFee} />
                        <FinancialAmountRow label="Agency Registration Fee" data={summaryData.agencyRegFee} total={summaryData.totals.agencyRegFee} />
                        <FinancialAmountRow label="Rig Registration Fee" data={summaryData.rigRegFee} total={summaryData.totals.rigRegFee} />
                        <FinancialAmountRow label="Rig Registration Renewal Fee" data={summaryData.renewalFee} total={summaryData.totals.renewalFee} />
                    </TableBody>
                    <TableFooter>
                        <TableRow>
                            <TableHead colSpan={rigTypeColumns.length + 1} className="text-right font-bold">Grand Total (₹)</TableHead>
                            <TableCell className="text-right font-bold text-lg text-primary font-mono">{summaryData.grandTotalOfFees.toLocaleString('en-IN')}</TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </CardContent>
        </Card>
    )
}
