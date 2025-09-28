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

interface RigFinancialSummaryProps {
  agencyApplications: AgencyApplication[];
  onOpenDialog: (data: any[], title: string) => void;
}

const FinancialStatCard = ({ title, count, amount, onClick }: { title: string; count: number; amount: number; onClick: () => void }) => (
  <button onClick={onClick} disabled={count === 0} className="p-3 border rounded-lg bg-secondary/30 text-center hover:bg-secondary/40 transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
    <p className="text-sm font-medium text-muted-foreground">{title}</p>
    <p className="text-2xl font-bold text-primary">{count}</p>
    <p className="text-sm font-semibold text-primary">₹{amount.toLocaleString('en-IN')}</p>
  </button>
);

export default function RigFinancialSummary({ agencyApplications, onOpenDialog }: RigFinancialSummaryProps) {
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const financialData = useMemo(() => {
    const fromDate = startDate ? startOfDay(startDate) : null;
    const toDate = endDate ? endOfDay(endDate) : null;

    const checkDate = (date: Date | null) => {
      if (!date) return false;
      if (fromDate && toDate) return isWithinInterval(date, { start: fromDate, end: toDate });
      if (fromDate) return date >= fromDate;
      if (toDate) return date <= toDate;
      return true; // No date filter applied
    };

    let agencyRegApps = 0;
    let rigRegApps = 0;
    let rigRenewalApps = 0;

    let agencyAppFee = 0;
    let rigAppFee = 0;
    
    let agencyRegFee = 0;
    let rigRegFee = 0;
    let rigRenewalFee = 0;
    
    const records = {
        agencyRegs: [] as AgencyApplication[],
        rigRegs: [] as (RigRegistration & { agencyName: string })[],
        rigRenewals: [] as (RigRenewal & { agencyName: string, typeOfRig?: RigType })[],
        agencyAppFees: [] as (ApplicationFee & { agencyName: string})[],
        rigAppFees: [] as (ApplicationFee & { agencyName: string})[],
    };

    for (const app of agencyApplications) {
      // Application Fees (Completed & Pending)
      (app.applicationFees || []).forEach(fee => {
        const paymentDate = safeParseDate(fee.applicationFeePaymentDate);
        if (checkDate(paymentDate)) {
          if (fee.applicationFeeType === 'Agency Registration') {
            agencyAppFee += Number(fee.applicationFeeAmount) || 0;
            records.agencyAppFees.push({ ...fee, agencyName: app.agencyName });
          } else if (fee.applicationFeeType === 'Rig Registration') {
            rigAppFee += Number(fee.applicationFeeAmount) || 0;
            records.rigAppFees.push({ ...fee, agencyName: app.agencyName });
          }
        }
      });
      
      // Only process completed applications for main fees and counts
      if (app.status !== 'Active') continue;

      // Agency Registration Fee & Count
      const agencyPaymentDate = safeParseDate(app.agencyPaymentDate);
      if (checkDate(agencyPaymentDate)) {
        agencyRegApps++;
        agencyRegFee += (Number(app.agencyRegistrationFee) || 0) + (Number(app.agencyAdditionalRegFee) || 0);
        records.agencyRegs.push(app);
      }

      // Rig Registrations & Renewals
      (app.rigs || []).forEach(rig => {
        const rigWithAgency = { ...rig, agencyName: app.agencyName };
        const rigPaymentDate = safeParseDate(rig.paymentDate);
        if (checkDate(rigPaymentDate)) {
          rigRegApps++;
          rigRegFee += (Number(rig.registrationFee) || 0) + (Number(rig.additionalRegistrationFee) || 0);
          records.rigRegs.push(rigWithAgency);
        }

        (rig.renewals || []).forEach(renewal => {
          const renewalPaymentDate = safeParseDate(renewal.paymentDate);
          if (checkDate(renewalPaymentDate)) {
            rigRenewalApps++;
            rigRenewalFee += Number(renewal.renewalFee) || 0;
            records.rigRenewals.push({ ...renewal, agencyName: app.agencyName, typeOfRig: rig.typeOfRig });
          }
        });
      });
    }

    return {
      agencyRegApps, rigRegApps, rigRenewalApps,
      agencyAppFee, rigAppFee, agencyRegFee, rigRegFee, rigRenewalFee,
      records
    };
  }, [agencyApplications, startDate, endDate]);

  const handleCellClick = (title: string, records: any[]) => {
    let columns: { key: string; label: string; isNumeric?: boolean; }[] = [];
    let dialogData: Record<string, any>[] = [];

    if (title.startsWith("No. of Agency Registration Applications")) {
        columns = [
            { key: 'slNo', label: 'Sl. No.' },
            { key: 'agencyName', label: 'Name of Agency' },
            { key: 'paymentDate', label: 'Payment Date' },
            { key: 'fee', label: 'Fee (₹)', isNumeric: true },
        ];
        dialogData = records.map((record: AgencyApplication) => ({
            agencyName: record.agencyName,
            paymentDate: safeParseDate(record.agencyPaymentDate),
            fee: (Number(record.agencyRegistrationFee) || 0) + (Number(record.agencyAdditionalRegFee) || 0),
        }));
    } else if (title.startsWith("No. of Rig Registration Applications")) {
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
            paymentDate: safeParseDate(record.paymentDate || record.additionalPaymentDate),
            fee: (Number(record.registrationFee) || 0) + (Number(record.additionalRegistrationFee) || 0),
        }));
    } else if (title.startsWith("No. of Rig Registration Renewal Applications")) {
        columns = [
            { key: 'slNo', label: 'Sl. No.' },
            { key: 'agencyName', label: 'Name of Agency' },
            { key: 'typeOfRig', label: 'Type of Rig' },
            { key: 'paymentDate', label: 'Payment Date' },
            { key: 'fee', label: 'Fee (₹)', isNumeric: true },
        ];
        dialogData = records.map((record: RigRenewal & { agencyName: string, typeOfRig?: RigType }) => ({
            agencyName: record.agencyName,
            typeOfRig: record.typeOfRig || 'N/A',
            paymentDate: safeParseDate(record.paymentDate),
            fee: Number(record.renewalFee) || 0,
        }));
    } else if (title.startsWith("Agency Registration Application Fee") || title.startsWith("Rig Registration Application Fee")) {
        columns = [
            { key: 'slNo', label: 'Sl. No.'},
            { key: 'agencyName', label: 'Name of Agency' },
            { key: 'paymentDate', label: 'Payment Date' },
            { key: 'amount', label: 'Fee (₹)', isNumeric: true },
        ];
        dialogData = records.map((record: ApplicationFee & { agencyName: string }) => ({
            agencyName: record.agencyName,
            paymentDate: safeParseDate(record.applicationFeePaymentDate),
            amount: Number(record.applicationFeeAmount) || 0,
        }));
    }
    
    // Format and sort the data before sending to dialog
    const formattedAndSortedData = dialogData.sort((a,b) => {
        if (!a.paymentDate && !b.paymentDate) return 0;
        if (!a.paymentDate) return 1;
        if (!b.paymentDate) return -1;
        return a.paymentDate.getTime() - b.paymentDate.getTime();
    }).map((d, i) => ({
        ...d,
        slNo: i + 1,
        paymentDate: d.paymentDate ? format(d.paymentDate, 'dd/MM/yyyy') : 'N/A',
        fee: d.fee !== undefined ? d.fee.toLocaleString('en-IN') : d.amount !== undefined ? d.amount.toLocaleString('en-IN') : 'N/A',
    }));

    onOpenDialog(formattedAndSortedData, title);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-primary" />Rig Registration Financials</CardTitle>
        <CardDescription>Financial summary of rig registration and renewal fees.</CardDescription>
        <div className="flex flex-wrap items-center gap-2 pt-4 border-t mt-4">
          <Input type="date" className="w-[240px]" value={startDate ? format(startDate, 'yyyy-MM-dd') : ''} onChange={(e) => setStartDate(e.target.value ? parse(e.target.value, 'yyyy-MM-dd', new Date()) : undefined)} />
          <Input type="date" className="w-[240px]" value={endDate ? format(endDate, 'yyyy-MM-dd') : ''} onChange={(e) => setEndDate(e.target.value ? parse(e.target.value, 'yyyy-MM-dd', new Date()) : undefined)} />
          <Button onClick={() => { setStartDate(undefined); setEndDate(undefined); }} variant="ghost" className="h-9 px-3"><XCircle className="mr-2 h-4 w-4" />Clear Dates</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Section 1 */}
          <div className="space-y-4">
            <h4 className="text-base font-semibold text-primary">Application Counts (Completed)</h4>
            <div className="grid grid-cols-1 gap-3">
              <FinancialStatCard title="No. of Agency Registration Applications" count={financialData.agencyRegApps} amount={financialData.agencyRegFee} onClick={() => handleCellClick("No. of Agency Registration Applications", financialData.records.agencyRegs)} />
              <FinancialStatCard title="No. of Rig Registration Applications" count={financialData.rigRegApps} amount={financialData.rigRegFee} onClick={() => handleCellClick("No. of Rig Registration Applications", financialData.records.rigRegs)} />
              <FinancialStatCard title="No. of Rig Registration Renewal Applications" count={financialData.rigRenewalApps} amount={financialData.rigRenewalFee} onClick={() => handleCellClick("No. of Rig Registration Renewal Applications", financialData.records.rigRenewals)} />
            </div>
          </div>
          {/* Section 2 */}
          <div className="space-y-4 md:col-span-2">
            <h4 className="text-base font-semibold text-primary">Fee Collections</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FinancialStatCard title="Agency Registration Application Fee" count={financialData.records.agencyAppFees.length} amount={financialData.agencyAppFee} onClick={() => handleCellClick("Agency Registration Application Fee", financialData.records.agencyAppFees)} />
                <FinancialStatCard title="Rig Registration Application Fee" count={financialData.records.rigAppFees.length} amount={financialData.rigAppFee} onClick={() => handleCellClick("Rig Registration Application Fee", financialData.records.rigAppFees)} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
