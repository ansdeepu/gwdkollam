// src/components/dashboard/RigFinancialSummary.tsx
"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
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
const rigHeaderLabels: Record<RigType, string> = {
    "Hand Bore": "Hand<br/>Bore",
    "Filter Point Rig": "Filter<br/>Point",
    "Calyx Rig": "Calyx<br/>Rig",
    "Rotary Rig": "Rotary<br/>Rig",
    "DTH Rig": "DTH<br/>Rig",
    "Rotary cum DTH Rig": "Rotary<br/>cum<br/>DTH Rig",
};


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
      if (!fromDate && !toDate) return true; // Include if no date filter applied
      if (!date) return false;
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
    
    const agencyReg = { count: 0, amount: 0, records: [] as (AgencyApplication & { fee: number, paymentDate: Date | null })[] };
    const agencyAppFee = { count: 0, amount: 0, records: [] as (ApplicationFee & { agencyName: string, amount: number })[] };
    
    const rigReg = initialBreakdown();
    const rigRenewal = initialBreakdown();
    const rigAppFee = initialBreakdown();

    const completedApplications = agencyApplications.filter(app => app.status === 'Active');
    
    agencyReg.records = completedApplications.map(app => ({...app, fee: (Number(app.agencyRegistrationFee) || 0) + (Number(app.agencyAdditionalRegFee) || 0), paymentDate: safeParseDate(app.agencyPaymentDate) || safeParseDate(app.agencyAdditionalPaymentDate) }));
    agencyReg.count = agencyReg.records.length;


    agencyApplications.forEach(app => {
        // --- Application Fees (from ALL applications, including pending) ---
        (app.applicationFees || []).forEach(fee => {
            const paymentDate = safeParseDate(fee.applicationFeePaymentDate);
            if (checkDate(paymentDate)) {
                if (fee.applicationFeeType === 'Agency Registration') {
                    agencyAppFee.count++;
                    const feeAmount = Number(fee.applicationFeeAmount) || 0;
                    agencyAppFee.amount += feeAmount;
                    agencyAppFee.records.push({ ...fee, agencyName: app.agencyName, amount: feeAmount });
                } else if (fee.applicationFeeType === 'Rig Registration') {
                    // This fee is not associated with a specific rig type, so it goes to Total
                    rigAppFee.Total.count++;
                    const feeAmount = Number(fee.applicationFeeAmount) || 0;
                    rigAppFee.Total.amount += feeAmount;
                    rigAppFee.Total.records.push({ ...fee, agencyName: app.agencyName, amount: feeAmount });
                }
            }
        });
    });


    completedApplications.forEach(app => {
        // Agency Registration Fee
        const agencyPaymentDate = safeParseDate(app.agencyPaymentDate) || safeParseDate(app.agencyAdditionalPaymentDate);
        if (checkDate(agencyPaymentDate)) {
            const regFee = (Number(app.agencyRegistrationFee) || 0) + (Number(app.agencyAdditionalRegFee) || 0);
            if (regFee > 0) {
              agencyReg.amount += regFee;
            }
        }

        // Rig Registrations & Renewals
        (app.rigs || []).forEach(rig => {
            const rigType = rig.typeOfRig;
            const regPaymentDate = safeParseDate(rig.paymentDate) || safeParseDate(rig.additionalPaymentDate);
            
            if (rigType && rigColumns.includes(rigType)) {
                rigReg[rigType].count++;
                rigReg[rigType].records.push({ ...rig, agencyName: app.agencyName });
            }
            rigReg.Total.count++;
            rigReg.Total.records.push({ ...rig, agencyName: app.agencyName });

            if (checkDate(regPaymentDate)) {
                const regFee = (Number(rig.registrationFee) || 0) + (Number(rig.additionalRegistrationFee) || 0);
                if (regFee > 0) {
                  if (rigType && rigColumns.includes(rigType)) {
                      rigReg[rigType].amount += regFee;
                  }
                  rigReg.Total.amount += regFee;
                }
            }

            (rig.renewals || []).forEach(renewal => {
                const renewalPaymentDate = safeParseDate(renewal.paymentDate);
                 if (rigType && rigColumns.includes(rigType)) {
                    rigRenewal[rigType].count++;
                    rigRenewal[rigType].records.push({ ...renewal, agencyName: app.agencyName, typeOfRig: rigType });
                }
                rigRenewal.Total.count++;
                rigRenewal.Total.records.push({ ...renewal, agencyName: app.agencyName, typeOfRig: rigType });

                if (checkDate(renewalPaymentDate)) {
                    const renewalFee = Number(renewal.renewalFee) || 0;
                    if (renewalFee > 0) {
                      if (rigType && rigColumns.includes(rigType)) {
                          rigRenewal[rigType].amount += renewalFee;
                      }
                      rigRenewal.Total.amount += renewalFee;
                    }
                }
            });
        });
    });

    return { agencyReg, rigReg, rigRenewal, agencyAppFee, rigAppFee };

  }, [agencyApplications, startDate, endDate]);

   const handleCellClick = (records: any[], title: string) => {
    if (!records || records.length === 0) return;
    
    const baseCols = [
        { key: 'slNo', label: 'Sl. No.' },
        { key: 'agencyName', label: 'Name of Agency' },
    ];
    let columns: { key: string; label: string; isNumeric?: boolean }[] = [];
    let dialogData: Record<string, any>[] = [];
    
    if (title.includes("Agency Registration Application")) {
      columns = [...baseCols, { key: 'paymentDate', label: 'Payment Date' }, { key: 'amount', label: 'Amount (₹)', isNumeric: true }];
      dialogData = records.map(d => ({ ...d, amount: d.amount, paymentDate: safeParseDate(d.applicationFeePaymentDate) }));
    } else if (title.includes("Total Rig Registration Application")) {
      columns = [...baseCols, { key: 'paymentDate', label: 'Payment Date' }, { key: 'amount', label: 'Amount (₹)', isNumeric: true }];
      dialogData = records.map(d => ({ ...d, amount: d.amount, paymentDate: safeParseDate(d.applicationFeePaymentDate) }));
    } else if (title.includes("Agency Registration Fee")) {
        columns = [...baseCols, { key: 'regNo', label: 'Registration No'}, { key: 'paymentDate', label: 'Payment Date' }, { key: 'fee', label: 'Fee (₹)', isNumeric: true }];
        dialogData = records.map(d => {
            const fee = (Number(d.agencyRegistrationFee) || 0) + (Number(d.agencyAdditionalRegFee) || 0);
            const paymentDate = safeParseDate(d.agencyPaymentDate) || safeParseDate(d.agencyAdditionalPaymentDate);
            return {
                ...d,
                regNo: d.agencyRegistrationNo,
                paymentDate: paymentDate,
                fee: fee
            };
        });
    } else if (title.startsWith("Total - No. of Rig Registration Applications")) {
        columns = [
            { key: 'slNo', label: 'Sl. No.' },
            { key: 'agencyName', label: 'Name of Agency' },
            { key: 'typeOfRig', label: 'Type of Rig' },
            { key: 'paymentDate', label: 'Payment Date' },
            { key: 'fee', label: 'Fee (₹)', isNumeric: true },
        ];
        dialogData = records.map((record: any) => {
            const paymentDate = record.paymentDate || record.additionalPaymentDate;
            const fee = (Number(record.registrationFee) || 0) + (Number(record.additionalRegistrationFee) || 0);
            return {
                agencyName: record.agencyName,
                typeOfRig: record.typeOfRig || 'N/A',
                paymentDate: safeParseDate(paymentDate),
                fee: fee,
            };
        });
    } else if (title.includes("Rig Registration Fee")) {
      columns = [...baseCols, { key: 'typeOfRig', label: 'Type of Rig' }, { key: 'paymentDate', label: 'Payment Date' }, { key: 'fee', label: 'Fee (₹)', isNumeric: true }];
      dialogData = records.map(d => ({ ...d, fee: (Number(d.registrationFee) || 0) + (Number(d.additionalRegistrationFee) || 0), paymentDate: d.paymentDate || d.additionalPaymentDate }));
    } else if (title.startsWith("Total - No. of Rig Registration Renewal Applications")) {
        columns = [
            { key: 'slNo', label: 'Sl. No.' },
            { key: 'agencyName', label: 'Name of Agency' },
            { key: 'typeOfRig', label: 'Type of Rig' },
            { key: 'paymentDate', label: 'Payment Date' },
            { key: 'fee', label: 'Fee (₹)', isNumeric: true },
        ];
        dialogData = records.map((record) => ({
            agencyName: record.agencyName,
            typeOfRig: record.typeOfRig || 'N/A',
            paymentDate: safeParseDate(record.paymentDate),
            fee: Number(record.renewalFee) || 0,
        }));
    } else if (title.includes("Rig Registration Renewal")) {
      columns = [...baseCols, { key: 'typeOfRig', label: 'Type of Rig' }, { key: 'paymentDate', label: 'Payment Date' }, { key: 'fee', label: 'Fee (₹)', isNumeric: true }];
      dialogData = records.map(d => ({ ...d, fee: (Number(d.renewalFee) || 0) }));
    } else if (title.includes("No. of Applications")) {
        columns = [...baseCols];
        dialogData = records.map(d => ({...d}));
    }
    
    const formattedAndSortedData = dialogData
        .sort((a, b) => (safeParseDate(a.paymentDate)?.getTime() || 0) - (safeParseDate(b.paymentDate)?.getTime() || 0))
        .map((d, i) => ({
            ...d,
            slNo: i + 1,
            paymentDate: d.paymentDate ? format(safeParseDate(d.paymentDate)!, 'dd/MM/yyyy') : 'N/A',
            fee: d.fee !== undefined ? d.fee.toLocaleString('en-IN') : undefined,
            amount: d.amount !== undefined ? d.amount.toLocaleString('en-IN') : undefined
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
                        <TableHead className="w-[300px] font-bold p-2 text-sm">Description</TableHead>
                        {rigColumns.map(type => <TableHead key={type} className="text-center font-bold p-1 text-xs" dangerouslySetInnerHTML={{ __html: rigHeaderLabels[type] }} />)}
                        <TableHead className="text-center font-bold p-2 text-sm">Total</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
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

                    <TableRow className="bg-secondary/30"><TableCell colSpan={rigColumns.length + 2} className="p-2 font-bold text-primary">No. of Applications</TableCell></TableRow>
                    <TableRow>
                        <TableCell className="p-2 pl-6">Agency Registration</TableCell>
                        {renderAgencyTableCell(financialData.agencyReg, "No. of Applications - Agency Registration Fee")}
                        {renderTableCell(financialData.agencyReg, "No. of Applications - Agency Registration Fee")}
                    </TableRow>
                     <TableRow>
                        <TableCell className="p-2 pl-6">Rig Registration</TableCell>
                        {rigColumns.map(type => renderTableCell(financialData.rigReg[type], `No. of Applications - Rig Registration Fee - ${type}`))}
                        {renderTableCell(financialData.rigReg.Total, "Total - No. of Rig Registration Applications")}
                    </TableRow>
                    <TableRow>
                        <TableCell className="p-2 pl-6">Rig Registration Renewal</TableCell>
                         {rigColumns.map(type => renderTableCell(financialData.rigRenewal[type], `No. of Applications - Rig Registration Renewal - ${type}`))}
                        {renderTableCell(financialData.rigRenewal.Total, "Total - No. of Rig Registration Renewal Applications")}
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
                 <TableFooter>
                    <TableRow className="bg-primary/10">
                        <TableCell className="p-2 font-bold text-primary">Grand Total (₹)</TableCell>
                        {rigColumns.map(type => (
                            <TableCell key={`grand-total-${type}`} className="text-center p-2 font-bold text-primary">
                                {(
                                    (financialData.rigAppFee[type]?.amount || 0) +
                                    (financialData.rigReg[type]?.amount || 0) +
                                    (financialData.rigRenewal[type]?.amount || 0)
                                ).toLocaleString('en-IN')}
                            </TableCell>
                        ))}
                        <TableCell className="text-center p-2 font-bold text-primary">
                            {(
                                financialData.agencyAppFee.amount +
                                financialData.rigAppFee.Total.amount +
                                financialData.agencyReg.amount +
                                financialData.rigReg.Total.amount +
                                financialData.rigRenewal.Total.amount
                            ).toLocaleString('en-IN')}
                        </TableCell>
                    </TableRow>
                </TableFooter>
            </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
