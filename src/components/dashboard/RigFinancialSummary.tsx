// src/components/dashboard/RigFinancialSummary.tsx
"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, startOfDay, endOfDay, isWithinInterval, parse, isValid } from 'date-fns';
import { ClipboardList, XCircle } from "lucide-react";
import type { AgencyApplication, RigRegistration, RigRenewal, RigType, ApplicationFee } from '@/lib/schemas';
import { rigTypeOptions } from '@/lib/schemas';

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

const rigColumns: RigType[] = ["Hand Bore", "Filter Point Rig", "Calyx Rig", "Rotary Rig", "DTH Rig", "Rotary cum DTH Rig"];

interface FinancialMetric {
  count: number;
  amount: number;
  records: any[];
}

type FinancialBreakdown = Record<RigType, FinancialMetric> & { Total: FinancialMetric };

interface RigFinancialSummaryProps {
  agencyApplications: AgencyApplication[];
  onOpenDialog: (data: any[], title: string, columns: any[]) => void;
}

export default function RigFinancialSummary({ agencyApplications, onOpenDialog }: RigFinancialSummaryProps) {
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const financialData = useMemo(() => {
    const fromDate = startDate ? startOfDay(startDate) : null;
    const toDate = endDate ? endOfDay(endDate) : null;

    const checkDate = (date: Date | null) => {
      if (!date) return true; // Include if no date filter applied
      if (fromDate && toDate) return isWithinInterval(date, { start: fromDate, end: toDate });
      if (fromDate) return date >= fromDate;
      if (toDate) return date <= toDate;
      return true;
    };
    
    const initialMetric = (): FinancialMetric => ({ count: 0, amount: 0, records: [] });
    const initialBreakdown = (): FinancialBreakdown => ({
      "Hand Bore": initialMetric(), "Filter Point Rig": initialMetric(), "Calyx Rig": initialMetric(),
      "Rotary Rig": initialMetric(), "DTH Rig": initialMetric(), "Rotary cum DTH Rig": initialMetric(),
      Total: initialMetric(),
    });
    
    const agencyReg = { count: 0, amount: 0, records: [] as AgencyApplication[] };
    const agencyAppFee = { count: 0, amount: 0, records: [] as (ApplicationFee & { agencyName: string})[] };
    
    const rigReg = initialBreakdown();
    const rigRenewal = initialBreakdown();
    const rigAppFee = initialBreakdown();

    for (const app of agencyApplications) {
        // --- Application Fees (from ALL applications, including pending) ---
        (app.applicationFees || []).forEach(fee => {
            const paymentDate = safeParseDate(fee.applicationFeePaymentDate);
            if (checkDate(paymentDate)) {
                if (fee.applicationFeeType === 'Agency Registration') {
                    agencyAppFee.count++;
                    agencyAppFee.amount += Number(fee.applicationFeeAmount) || 0;
                    agencyAppFee.records.push({ ...fee, agencyName: app.agencyName });
                } else if (fee.applicationFeeType === 'Rig Registration') {
                    // This fee is not associated with a specific rig type, so it goes to Total
                    rigAppFee.Total.count++;
                    const feeAmount = Number(fee.applicationFeeAmount) || 0;
                    rigAppFee.Total.amount += feeAmount;
                    rigAppFee.Total.records.push({ ...fee, agencyName: app.agencyName, amount: feeAmount });
                }
            }
        });

        // --- Main Fees (ONLY from 'Active' applications) ---
        if (app.status !== 'Active') continue;
        
        // Agency Registration Fee
        const agencyPaymentDate = safeParseDate(app.agencyPaymentDate);
        if (checkDate(agencyPaymentDate)) {
            agencyReg.count++;
            agencyReg.amount += (Number(app.agencyRegistrationFee) || 0) + (Number(app.agencyAdditionalRegFee) || 0);
            agencyReg.records.push(app);
        }

        // Rig Registrations & Renewals
        (app.rigs || []).forEach(rig => {
            const rigType = rig.typeOfRig;
            const rigPaymentDate = safeParseDate(rig.paymentDate);
            if (checkDate(rigPaymentDate)) {
                const regFee = (Number(rig.registrationFee) || 0) + (Number(rig.additionalRegistrationFee) || 0);
                if (rigType && rigColumns.includes(rigType)) {
                    rigReg[rigType].count++;
                    rigReg[rigType].amount += regFee;
                    rigReg[rigType].records.push({ ...rig, agencyName: app.agencyName });
                }
                rigReg.Total.count++;
                rigReg.Total.amount += regFee;
                rigReg.Total.records.push({ ...rig, agencyName: app.agencyName });
            }

            (rig.renewals || []).forEach(renewal => {
                const renewalPaymentDate = safeParseDate(renewal.paymentDate);
                if (checkDate(renewalPaymentDate)) {
                    const renewalFee = Number(renewal.renewalFee) || 0;
                    if (rigType && rigColumns.includes(rigType)) {
                        rigRenewal[rigType].count++;
                        rigRenewal[rigType].amount += renewalFee;
                        rigRenewal[rigType].records.push({ ...renewal, agencyName: app.agencyName, typeOfRig: rigType });
                    }
                    rigRenewal.Total.count++;
                    rigRenewal.Total.amount += renewalFee;
                    rigRenewal.Total.records.push({ ...renewal, agencyName: app.agencyName, typeOfRig: rigType });
                }
            });
        });
    }

    return { agencyReg, rigReg, rigRenewal, agencyAppFee, rigAppFee };

  }, [agencyApplications, startDate, endDate]);

   const handleCellClick = (data: any[], title: string) => {
    if (!data || data.length === 0) return;

    let columns: { key: string; label: string; isNumeric?: boolean }[] = [];
    let dialogData: Record<string, any>[] = [];

    const baseCols = [
        { key: 'slNo', label: 'Sl. No.' },
        { key: 'agencyName', label: 'Agency Name' },
    ];
    
    if (title.includes("Agency Registration Application")) {
      columns = [...baseCols, { key: 'paymentDate', label: 'Payment Date' }, { key: 'amount', label: 'Fee (₹)', isNumeric: true }];
      dialogData = data.map(d => ({ ...d, amount: (Number(d.applicationFeeAmount) || 0) }));
    } else if (title.includes("Rig Registration Application")) {
      columns = [...baseCols, { key: 'paymentDate', label: 'Payment Date' }, { key: 'amount', label: 'Fee (₹)', isNumeric: true }];
      dialogData = data.map(d => ({ ...d, amount: (Number(d.applicationFeeAmount) || 0) }));
    } else if (title.includes("Agency Registration Fee")) {
      columns = [...baseCols, { key: 'regNo', label: 'Registration No'}, { key: 'paymentDate', label: 'Payment Date' }, { key: 'amount', label: 'Fee (₹)', isNumeric: true }];
      dialogData = data.map(d => ({ ...d, regNo: d.agencyRegistrationNo, amount: (Number(d.agencyRegistrationFee) || 0) + (Number(d.agencyAdditionalRegFee) || 0) }));
    } else if (title.includes("Rig Registration Fee")) {
      columns = [...baseCols, { key: 'typeOfRig', label: 'Type of Rig' }, { key: 'paymentDate', label: 'Payment Date' }, { key: 'amount', label: 'Fee (₹)', isNumeric: true }];
      dialogData = data.map(d => ({ ...d, amount: (Number(d.registrationFee) || 0) + (Number(d.additionalRegistrationFee) || 0) }));
    } else if (title.includes("Rig Registration Renewal")) {
      columns = [...baseCols, { key: 'typeOfRig', label: 'Type of Rig' }, { key: 'paymentDate', label: 'Payment Date' }, { key: 'amount', label: 'Fee (₹)', isNumeric: true }];
      dialogData = data.map(d => ({ ...d, amount: (Number(d.renewalFee) || 0) }));
    }
    
    const formattedAndSortedData = dialogData
        .sort((a, b) => (safeParseDate(a.paymentDate)?.getTime() || 0) - (safeParseDate(b.paymentDate)?.getTime() || 0))
        .map((d, i) => ({
            ...d,
            slNo: i + 1,
            paymentDate: d.paymentDate ? format(safeParseDate(d.paymentDate)!, 'dd/MM/yyyy') : 'N/A',
            amount: d.amount.toLocaleString('en-IN')
        }));

    onOpenDialog(formattedAndSortedData, title, columns);
  };

  const renderTableCell = (metric: FinancialMetric, title: string) => (
    <TableCell className="text-center p-2">
      <Button variant="link" className="p-0 h-auto font-semibold" disabled={metric.count === 0} onClick={() => handleCellClick(metric.records, title)}>
        {metric.count}
      </Button>
    </TableCell>
  );

  const renderAmountTableCell = (metric: FinancialMetric, title: string) => (
    <TableCell className="text-center p-2">
      <Button variant="link" className="p-0 h-auto font-semibold" disabled={metric.amount === 0} onClick={() => handleCellClick(metric.records, title)}>
        {metric.amount.toLocaleString('en-IN')}
      </Button>
    </TableCell>
  );
  
  const renderAgencyTableCell = (metric: { count: number, amount: number, records: any[] }, title: string) => (
     <TableCell colSpan={rigColumns.length} className="text-left p-2">
      <Button variant="link" className="p-0 h-auto font-semibold" disabled={metric.count === 0} onClick={() => handleCellClick(metric.records, title)}>
        {metric.count}
      </Button>
    </TableCell>
  );
  
   const renderAgencyAmountTableCell = (metric: { count: number, amount: number, records: any[] }, title: string) => (
     <TableCell colSpan={rigColumns.length} className="text-left p-2">
      <Button variant="link" className="p-0 h-auto font-semibold" disabled={metric.amount === 0} onClick={() => handleCellClick(metric.records, title)}>
        {metric.amount.toLocaleString('en-IN')}
      </Button>
    </TableCell>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-primary" />Rig Registration Financials</CardTitle>
        <CardDescription>Financial summary of rig registration and renewal fees by rig type.</CardDescription>
        <div className="flex flex-wrap items-center gap-2 pt-4 border-t mt-4">
          <Input type="date" className="w-[240px]" value={startDate ? format(startDate, 'yyyy-MM-dd') : ''} onChange={(e) => setStartDate(e.target.value ? parse(e.target.value, 'yyyy-MM-dd', new Date()) : undefined)} />
          <Input type="date" className="w-[240px]" value={endDate ? format(endDate, 'yyyy-MM-dd') : ''} onChange={(e) => setEndDate(e.target.value ? parse(e.target.value, 'yyyy-MM-dd', new Date()) : undefined)} />
          <Button onClick={() => { setStartDate(undefined); setEndDate(undefined); }} variant="ghost" className="h-9 px-3"><XCircle className="mr-2 h-4 w-4" />Clear Dates</Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-w-full">
            <Table className="min-w-max border">
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[300px] font-bold p-2">Description</TableHead>
                        {rigColumns.map(type => <TableHead key={type} className="text-center font-bold p-2">{type}</TableHead>)}
                        <TableHead className="text-center font-bold p-2">Total</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow className="bg-secondary/30"><TableCell colSpan={rigColumns.length + 2} className="p-2 font-bold text-primary">No. of Applications</TableCell></TableRow>
                    <TableRow>
                        <TableCell className="p-2 pl-6">Agency Registration</TableCell>
                        {renderAgencyTableCell(financialData.agencyReg, "Agency Registration Fee")}
                        {renderTableCell(financialData.agencyReg, "Agency Registration Fee")}
                    </TableRow>
                     <TableRow>
                        <TableCell className="p-2 pl-6">Rig Registration</TableCell>
                        {rigColumns.map(type => renderTableCell(financialData.rigReg[type], `Rig Registration Fee - ${type}`))}
                        {renderTableCell(financialData.rigReg.Total, "Total Rig Registration Fee")}
                    </TableRow>
                    <TableRow>
                        <TableCell className="p-2 pl-6">Rig Registration Renewal</TableCell>
                         {rigColumns.map(type => renderTableCell(financialData.rigRenewal[type], `Rig Registration Renewal - ${type}`))}
                        {renderTableCell(financialData.rigRenewal.Total, "Total Rig Registration Renewal")}
                    </TableRow>

                    <TableRow className="bg-secondary/30"><TableCell colSpan={rigColumns.length + 2} className="p-2 font-bold text-primary">Application Fee Received (₹)</TableCell></TableRow>
                     <TableRow>
                        <TableCell className="p-2 pl-6">Agency Registration</TableCell>
                        {renderAgencyAmountTableCell(financialData.agencyAppFee, "Agency Registration Application Fee")}
                        {renderAmountTableCell(financialData.agencyAppFee, "Agency Registration Application Fee")}
                    </TableRow>
                    <TableRow>
                        <TableCell className="p-2 pl-6">Rig Registration</TableCell>
                        {rigColumns.map(type => <TableCell key={type} className="text-center p-2">0</TableCell>)}
                        {renderAmountTableCell(financialData.rigAppFee.Total, "Total Rig Registration Application Fee")}
                    </TableRow>

                    <TableRow className="bg-secondary/30"><TableCell colSpan={rigColumns.length + 2} className="p-2 font-bold text-primary">Registration/Renewal Fee Received (₹)</TableCell></TableRow>
                    <TableRow>
                        <TableCell className="p-2 pl-6">Agency Registration</TableCell>
                         {renderAgencyAmountTableCell(financialData.agencyReg, "Agency Registration Fee")}
                        {renderAmountTableCell(financialData.agencyReg, "Agency Registration Fee")}
                    </TableRow>
                     <TableRow>
                        <TableCell className="p-2 pl-6">Rig Registration</TableCell>
                        {rigColumns.map(type => renderAmountTableCell(financialData.rigReg[type], `Rig Registration Fee - ${type}`))}
                        {renderAmountTableCell(financialData.rigReg.Total, "Total Rig Registration Fee")}
                    </TableRow>
                    <TableRow>
                        <TableCell className="p-2 pl-6">Rig Registration Renewal</TableCell>
                         {rigColumns.map(type => renderAmountTableCell(financialData.rigRenewal[type], `Rig Registration Renewal - ${type}`))}
                        {renderAmountTableCell(financialData.rigRenewal.Total, "Total Rig Registration Renewal")}
                    </TableRow>
                </TableBody>
            </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
