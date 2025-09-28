// src/components/dashboard/RigFinancialSummary.tsx
"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DollarSign, XCircle } from "lucide-react";
import type { AgencyApplication } from '@/lib/schemas';
import { format, startOfDay, endOfDay, isWithinInterval, isValid, parse } from 'date-fns';

interface RigFinancialSummaryProps {
    applications: AgencyApplication[];
    onOpenDialog: (data: any[], title: string, columns: any[]) => void;
}

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

const SummaryCard = ({ title, value, onClick, details }: { title: string; value: number; onClick: () => void; details: Array<{ label: string; value: number; onClick: () => void }> }) => (
    <Card className="flex flex-col">
        <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow">
            <Button variant="link" className="text-4xl font-bold p-0 h-auto" onClick={onClick} disabled={value === 0}>
                {`₹${value.toLocaleString('en-IN')}`}
            </Button>
            <div className="mt-4 space-y-2">
                {details.map(detail => (
                    <div key={detail.label} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{detail.label}</span>
                        <Button variant="link" className="p-0 h-auto text-xs font-semibold" onClick={detail.onClick} disabled={detail.value === 0}>
                            {`₹${detail.value.toLocaleString('en-IN')}`}
                        </Button>
                    </div>
                ))}
            </div>
        </CardContent>
    </Card>
);

export default function RigFinancialSummary({ applications, onOpenDialog }: RigFinancialSummaryProps) {
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

        let totals = {
            applicationFee: 0,
            agencyApplicationFee: 0,
            rigApplicationFee: 0,
            registrationFee: 0,
            agencyRegistrationFee: 0,
            rigRegistrationFee: 0,
            renewalFee: 0,
        };

        let detailedData = {
            agencyApplicationFee: [] as any[],
            rigApplicationFee: [] as any[],
            agencyRegistrationFee: [] as any[],
            rigRegistrationFee: [] as any[],
            renewalFee: [] as any[],
        };

        applications.forEach(app => {
            app.applicationFees?.forEach(fee => {
                if (checkDate(fee.applicationFeePaymentDate)) {
                    const amount = Number(fee.applicationFeeAmount) || 0;
                    const feeData = { agencyName: app.agencyName, feeType: fee.applicationFeeType, paymentDate: formatDateSafe(fee.applicationFeePaymentDate), amount };

                    if (fee.applicationFeeType === "Agency Registration") {
                        totals.agencyApplicationFee += amount;
                        detailedData.agencyApplicationFee.push(feeData);
                    } else if (fee.applicationFeeType === "Rig Registration") {
                        totals.rigApplicationFee += amount;
                        detailedData.rigApplicationFee.push(feeData);
                    }
                }
            });

            if (checkDate(app.agencyPaymentDate)) {
                const amount = Number(app.agencyRegistrationFee) || 0;
                totals.agencyRegistrationFee += amount;
                detailedData.agencyRegistrationFee.push({ agencyName: app.agencyName, regDate: formatDateSafe(app.agencyPaymentDate), fee: amount });
            }
             if (checkDate(app.agencyAdditionalPaymentDate)) {
                const amount = Number(app.agencyAdditionalRegFee) || 0;
                totals.agencyRegistrationFee += amount;
                detailedData.agencyRegistrationFee.push({ agencyName: app.agencyName, regDate: formatDateSafe(app.agencyAdditionalPaymentDate), fee: amount });
            }

            app.rigs?.forEach(rig => {
                if (checkDate(rig.paymentDate)) {
                    const amount = Number(rig.registrationFee) || 0;
                    totals.rigRegistrationFee += amount;
                    detailedData.rigRegistrationFee.push({ agencyName: app.agencyName, rigType: rig.typeOfRig, regDate: formatDateSafe(rig.paymentDate), fee: amount });
                }
                 if (checkDate(rig.additionalPaymentDate)) {
                    const amount = Number(rig.additionalRegistrationFee) || 0;
                    totals.rigRegistrationFee += amount;
                    detailedData.rigRegistrationFee.push({ agencyName: app.agencyName, rigType: rig.typeOfRig, regDate: formatDateSafe(rig.additionalPaymentDate), fee: amount });
                }
                rig.renewals?.forEach(renewal => {
                    if (checkDate(renewal.paymentDate)) {
                        const amount = Number(renewal.renewalFee) || 0;
                        totals.renewalFee += amount;
                        detailedData.renewalFee.push({ agencyName: app.agencyName, rigType: rig.typeOfRig, renewalDate: formatDateSafe(renewal.paymentDate), renewalFee: amount });
                    }
                });
            });
        });

        totals.applicationFee = totals.agencyApplicationFee + totals.rigApplicationFee;
        totals.registrationFee = totals.agencyRegistrationFee + totals.rigRegistrationFee;

        const grandTotal = totals.applicationFee + totals.registrationFee + totals.renewalFee;

        return { totals, detailedData, grandTotal };

    }, [applications, startDate, endDate]);

    const formatDateSafe = (d: any): string => {
        if (!d) return 'N/A';
        const date = safeParseDate(d);
        return date ? format(date, 'dd/MM/yyyy') : 'N/A';
    }

    const handleOpenFeeDialog = (data: any[], title: string) => {
        if (data.length === 0) return;
        const columns = [
            { key: 'slNo', label: 'Sl. No.' },
            { key: 'agencyName', label: 'Agency Name' },
            ... (title.includes("Rig") && !title.includes("Application") ? [{ key: 'rigType', label: 'Rig Type' }] : []),
            ... (title.includes("Application") ? [{ key: 'feeType', label: 'Fee Type' }] : []),
            { key: 'date', label: 'Payment Date' },
            { key: 'amount', label: 'Amount (₹)', isNumeric: true },
        ];

        const dialogData = data.map((item, i) => ({
            slNo: i + 1,
            agencyName: item.agencyName,
            rigType: item.rigType,
            feeType: item.feeType,
            date: item.paymentDate || item.regDate || item.renewalDate,
            amount: (item.amount || item.fee || item.renewalFee || 0).toLocaleString('en-IN'),
        }));

        onOpenDialog(dialogData, title, columns);
    }

    const handleGrandTotalClick = () => {
        const allData = [
            ...summaryData.detailedData.agencyApplicationFee.map(d => ({ ...d, type: 'Agency App Fee' })),
            ...summaryData.detailedData.rigApplicationFee.map(d => ({ ...d, type: 'Rig App Fee' })),
            ...summaryData.detailedData.agencyRegistrationFee.map(d => ({ ...d, type: 'Agency Reg Fee' })),
            ...summaryData.detailedData.rigRegistrationFee.map(d => ({ ...d, type: 'Rig Reg Fee' })),
            ...summaryData.detailedData.renewalFee.map(d => ({ ...d, type: 'Renewal Fee' })),
        ];
        const columns = [
            { key: 'slNo', label: 'Sl. No.' },
            { key: 'agencyName', label: 'Agency Name' },
            { key: 'type', label: 'Fee Category' },
            { key: 'date', label: 'Payment Date' },
            { key: 'amount', label: 'Amount (₹)', isNumeric: true },
        ];
        const dialogData = allData.map((item, i) => ({
            slNo: i + 1,
            agencyName: item.agencyName,
            type: item.type,
            date: item.paymentDate || item.regDate || item.renewalDate,
            amount: (item.amount || item.fee || item.renewalFee || 0).toLocaleString('en-IN'),
        }));
        onOpenDialog(dialogData, "Grand Total Fees Collected", columns);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5 text-primary" />Rig Registration Financials</CardTitle>
                <CardDescription>Financial summary for rig and agency registrations, filterable by date. Click any amount for details.</CardDescription>
                <div className="flex flex-wrap items-center gap-2 pt-4 border-t mt-4">
                    <Input type="date" className="w-[240px]" value={startDate ? format(startDate, 'yyyy-MM-dd') : ''} onChange={(e) => setStartDate(e.target.value ? parse(e.target.value, 'yyyy-MM-dd', new Date()) : undefined)} />
                    <Input type="date" className="w-[240px]" value={endDate ? format(endDate, 'yyyy-MM-dd') : ''} onChange={(e) => setEndDate(e.target.value ? parse(e.target.value, 'yyyy-MM-dd', new Date()) : undefined)} />
                    <Button onClick={() => { setStartDate(undefined); setEndDate(undefined); }} variant="ghost" className="h-9 px-3"><XCircle className="mr-2 h-4 w-4" />Clear</Button>
                </div>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <SummaryCard
                    title="Total Application Fees"
                    value={summaryData.totals.applicationFee}
                    onClick={() => handleOpenFeeDialog([...summaryData.detailedData.agencyApplicationFee, ...summaryData.detailedData.rigApplicationFee], "Total Application Fees")}
                    details={[
                        { label: 'Agency Application', value: summaryData.totals.agencyApplicationFee, onClick: () => handleOpenFeeDialog(summaryData.detailedData.agencyApplicationFee, 'Agency Application Fees') },
                        { label: 'Rig Application', value: summaryData.totals.rigApplicationFee, onClick: () => handleOpenFeeDialog(summaryData.detailedData.rigApplicationFee, 'Rig Application Fees') },
                    ]}
                />
                <SummaryCard
                    title="Total Registration Fees"
                    value={summaryData.totals.registrationFee}
                    onClick={() => handleOpenFeeDialog([...summaryData.detailedData.agencyRegistrationFee, ...summaryData.detailedData.rigRegistrationFee], "Total Registration Fees")}
                    details={[
                        { label: 'Agency Registration', value: summaryData.totals.agencyRegistrationFee, onClick: () => handleOpenFeeDialog(summaryData.detailedData.agencyRegistrationFee, 'Agency Registration Fees') },
                        { label: 'Rig Registration', value: summaryData.totals.rigRegistrationFee, onClick: () => handleOpenFeeDialog(summaryData.detailedData.rigRegistrationFee, 'Rig Registration Fees') },
                    ]}
                />
                <SummaryCard
                    title="Total Renewal Fees"
                    value={summaryData.totals.renewalFee}
                    onClick={() => handleOpenFeeDialog(summaryData.detailedData.renewalFee, "Total Renewal Fees")}
                    details={[]}
                />
                <Card className="flex flex-col justify-center items-center bg-primary/10">
                    <CardHeader className="pb-2 text-center">
                        <CardTitle className="text-sm font-medium">GRAND TOTAL</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Button variant="link" className="text-4xl font-bold p-0 h-auto text-primary" onClick={handleGrandTotalClick} disabled={summaryData.grandTotal === 0}>
                            {`₹${summaryData.grandTotal.toLocaleString('en-IN')}`}
                        </Button>
                    </CardContent>
                </Card>
            </CardContent>
        </Card>
    )
}
