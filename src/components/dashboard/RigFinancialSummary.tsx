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
    onCellClick: (data: any[], title: string) => void;
}

const rigTypeColumns: RigType[] = ["Hand Bore", "Filter Point Rig", "Calyx Rig", "Rotary Rig", "DTH Rig", "Rotary cum DTH Rig"];

// Define the type for the summary data object
interface SummaryData {
    agencyRegCount: Record<string, number>;
    rigRegCount: Record<string, number>;
    renewalCount: Record<string, number>;
    agencyRegAppFee: Record<string, number>;
    rigRegAppFee: Record<string, number>;
    agencyRegFee: Record<string, number>;
    rigRegFee: Record<string, number>;
    renewalFee: Record<string, number>;
    totals: Record<string, number>;
    grandTotalOfFees: number;

    // Detailed data for dialogs
    agencyRegData: any[];
    rigRegData: Record<string, any[]>;
    renewalData: Record<string, any[]>;
    agencyRegAppFeeData: any[];
    rigRegAppFeeData: any[];
    agencyRegFeeData: any[];
    rigRegFeeData: Record<string, any[]>;
    renewalFeeData: Record<string, any[]>;
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

const FinancialRow = ({ label, data, total, onCellClick, onTotalClick }: { label: string; data: Record<string, number>; total: number; onCellClick: (rigType: RigType | 'Agency') => void; onTotalClick: () => void; }) => (
    <TableRow>
      <TableHead>{label}</TableHead>
      {rigTypeColumns.map(rigType => (
        <TableCell key={rigType} className="text-center">
            <Button variant="link" disabled={!data[rigType]} onClick={() => onCellClick(rigType)} className="p-0 h-auto font-semibold">{data[rigType] || 0}</Button>
        </TableCell>
      ))}
       <TableCell className="text-center font-bold">
            <Button variant="link" disabled={!total} onClick={onTotalClick} className="p-0 h-auto font-bold">{total}</Button>
       </TableCell>
    </TableRow>
);

const FinancialAmountRow = ({ label, data, total, onCellClick, onTotalClick }: { label: string; data: Record<string, number>; total: number; onCellClick: (rigType: RigType | 'Agency') => void; onTotalClick: () => void; }) => (
    <TableRow>
      <TableHead>{label}</TableHead>
      {rigTypeColumns.map(rigType => (
        <TableCell key={rigType} className="text-right font-mono">
            <Button variant="link" disabled={!data[rigType]} onClick={() => onCellClick(rigType)} className="p-0 h-auto font-mono text-right w-full block">{(data[rigType] || 0).toLocaleString('en-IN')}</Button>
        </TableCell>
      ))}
       <TableCell className="text-right font-bold font-mono">
            <Button variant="link" disabled={!total} onClick={onTotalClick} className="p-0 h-auto font-mono font-bold text-right w-full block">{total.toLocaleString('en-IN')}</Button>
       </TableCell>
    </TableRow>
);


export default function RigFinancialSummary({ applications, onCellClick }: RigFinancialSummaryProps) {
    const [startDate, setStartDate] = useState<Date | undefined>();
    const [endDate, setEndDate] = useState<Date | undefined>();

    const summaryData: SummaryData = useMemo(() => {
        const sDate = startDate ? startOfDay(startDate) : null;
        const eDate = endDate ? endOfDay(endDate) : null;
        const isDateFilterActive = sDate && eDate;

        const checkDate = (date: Date | string | null | undefined): boolean => {
            if (!isDateFilterActive || !date) return true;
            const d = safeParseDate(date);
            return d ? isWithinInterval(d, { start: sDate, end: eDate }) : false;
        };
        
        const initialCounts = rigTypeColumns.reduce((acc, r) => ({...acc, [r]: 0}), {});

        let data: any = {
            agencyRegCount: {}, rigRegCount: {...initialCounts}, renewalCount: {...initialCounts},
            agencyRegAppFee: {}, rigRegAppFee: {}, agencyRegFee: {}, 
            rigRegFee: {...initialCounts}, renewalFee: {...initialCounts},
            
            agencyRegData: [], rigRegData: {}, renewalData: {},
            agencyRegAppFeeData: [], rigRegAppFeeData: [], agencyRegFeeData: [],
            rigRegFeeData: {}, renewalFeeData: {},
        };

        rigTypeColumns.forEach(rt => {
            data.rigRegData[rt] = []; data.renewalData[rt] = [];
            data.rigRegFeeData[rt] = []; data.renewalFeeData[rt] = [];
        })
        
        // Application fees from ALL applications
        applications.forEach(app => {
            app.applicationFees?.forEach(fee => {
                if(checkDate(fee.applicationFeePaymentDate)) {
                    const feeData = { agencyName: app.agencyName, feeType: fee.applicationFeeType, paymentDate: fee.applicationFeePaymentDate, amount: fee.applicationFeeAmount };
                    if (fee.applicationFeeType === "Agency Registration") {
                        data.agencyRegAppFee["Agency"] = (data.agencyRegAppFee["Agency"] || 0) + (Number(fee.applicationFeeAmount) || 0);
                        data.agencyRegAppFeeData.push(feeData);
                    } else if (fee.applicationFeeType === "Rig Registration") {
                         data.rigRegAppFee["Agency"] = (data.rigRegAppFee["Agency"] || 0) + (Number(fee.applicationFeeAmount) || 0);
                         data.rigRegAppFeeData.push(feeData);
                    }
                }
            });
        });

        const completedApplications = applications.filter(app => app.status === 'Active');

        completedApplications.forEach(app => {
            let agencyRegisteredInPeriod = false;
            if (checkDate(app.agencyPaymentDate)) {
                agencyRegisteredInPeriod = true;
                data.agencyRegFee["Agency"] = (data.agencyRegFee["Agency"] || 0) + (Number(app.agencyRegistrationFee) || 0);
                data.agencyRegData.push({ agencyName: app.agencyName, regNo: app.agencyRegistrationNo, paymentDate: app.agencyPaymentDate, fee: app.agencyRegistrationFee });
                data.agencyRegFeeData.push({ agencyName: app.agencyName, regNo: app.agencyRegistrationNo, paymentDate: app.agencyPaymentDate, fee: app.agencyRegistrationFee });
            }
            if (checkDate(app.agencyAdditionalPaymentDate)) {
                agencyRegisteredInPeriod = true;
                data.agencyRegFee["Agency"] = (data.agencyRegFee["Agency"] || 0) + (Number(app.agencyAdditionalRegFee) || 0);
                 data.agencyRegData.push({ agencyName: app.agencyName, regNo: app.agencyRegistrationNo, paymentDate: app.agencyAdditionalPaymentDate, fee: app.agencyAdditionalRegFee });
                 data.agencyRegFeeData.push({ agencyName: app.agencyName, regNo: app.agencyRegistrationNo, paymentDate: app.agencyAdditionalPaymentDate, fee: app.agencyAdditionalRegFee });
            }
            if(agencyRegisteredInPeriod) {
                data.agencyRegCount["Agency"] = (data.agencyRegCount["Agency"] || 0) + 1;
            }

            app.rigs?.forEach(rig => {
                const rigType = rig.typeOfRig;
                if (!rigType || !rigTypeColumns.includes(rigType)) return;
                
                let rigRegisteredInPeriod = false;
                if (checkDate(rig.paymentDate)) {
                    rigRegisteredInPeriod = true;
                    data.rigRegFee[rigType] = (data.rigRegFee[rigType] || 0) + (Number(rig.registrationFee) || 0);
                    data.rigRegData[rigType].push({ agencyName: app.agencyName, regNo: rig.rigRegistrationNo, paymentDate: rig.paymentDate, fee: rig.registrationFee });
                    data.rigRegFeeData[rigType].push({ agencyName: app.agencyName, rigType: rigType, regNo: rig.rigRegistrationNo, paymentDate: rig.paymentDate, fee: rig.registrationFee });
                }
                 if (checkDate(rig.additionalPaymentDate)) {
                    rigRegisteredInPeriod = true;
                    data.rigRegFee[rigType] = (data.rigRegFee[rigType] || 0) + (Number(rig.additionalRegistrationFee) || 0);
                    data.rigRegData[rigType].push({ agencyName: app.agencyName, regNo: rig.rigRegistrationNo, paymentDate: rig.additionalPaymentDate, fee: rig.additionalRegistrationFee });
                    data.rigRegFeeData[rigType].push({ agencyName: app.agencyName, rigType: rigType, regNo: rig.rigRegistrationNo, paymentDate: rig.additionalPaymentDate, fee: rig.additionalRegistrationFee });
                }
                
                if(rigRegisteredInPeriod) {
                    data.rigRegCount[rigType] = (data.rigRegCount[rigType] || 0) + 1;
                }
                
                rig.renewals?.forEach(renewal => {
                    if (checkDate(renewal.paymentDate)) {
                        data.renewalCount[rigType] = (data.renewalCount[rigType] || 0) + 1;
                        data.renewalFee[rigType] = (data.renewalFee[rigType] || 0) + (Number(renewal.renewalFee) || 0);
                        data.renewalData[rigType].push({ agencyName: app.agencyName, rigType: rigType, renewalNo: rig.rigRegistrationNo, paymentDate: renewal.paymentDate, renewalFee: renewal.renewalFee });
                        data.renewalFeeData[rigType].push({ agencyName: app.agencyName, rigType: rigType, renewalNo: rig.rigRegistrationNo, paymentDate: renewal.paymentDate, renewalFee: renewal.renewalFee });
                    }
                });
            });
        });
        
        const totals: Record<string, number> = {};
        Object.keys(data).forEach(key => {
            if(typeof data[key] === 'object' && !Array.isArray(data[key])) {
                totals[key] = (Object.values(data[key]) as unknown as number[]).reduce((sum: number, val: number) => sum + (typeof val === 'number' ? val : 0), 0);
            }
        });

        const grandTotalOfFees =
            (totals.agencyRegAppFee || 0) +
            (totals.rigRegAppFee || 0) +
            (totals.agencyRegFee || 0) +
            (totals.rigRegFee || 0) +
            (totals.renewalFee || 0);

        return { ...(data as any), totals, grandTotalOfFees };

    }, [applications, startDate, endDate]);

    const handleCellClick = (dataType: keyof SummaryData, rigType: RigType | 'Agency', title: string) => {
        const data = (summaryData as any)[dataType];
        const records = rigType === 'Agency' ? data : data[rigType];

        let dialogData: any[] = [];
        let columns: any[] = [];

        if (title.toLowerCase().includes('agency registration')) {
            columns = [
                { key: 'slNo', label: 'Sl. No.'},
                { key: 'agencyName', label: 'Agency Name'},
                { key: 'regNo', label: 'Registration No'},
                { key: 'paymentDate', label: 'Payment Date'},
                { key: 'fee', label: 'Reg. Fee (₹)', isNumeric: true },
            ];
            dialogData = records.map((item: any, index: number) => ({ ...item, slNo: index + 1, paymentDate: formatDate(safeParseDate(item.paymentDate)!, 'dd/MM/yyyy'), fee: item.fee?.toLocaleString('en-IN') ?? '0' }));
        } 
        else if (title.toLowerCase().includes('rig registration')) {
            columns = [
                { key: 'slNo', label: 'Sl. No.'},
                { key: 'agencyName', label: 'Agency Name'},
                { key: 'regNo', label: 'Registration No'},
                { key: 'paymentDate', label: 'Payment Date'},
                { key: 'fee', label: 'Reg. Fee (₹)', isNumeric: true },
            ];
            dialogData = records.map((item: any, index: number) => ({ ...item, slNo: index + 1, paymentDate: formatDate(safeParseDate(item.paymentDate)!, 'dd/MM/yyyy'), fee: item.fee?.toLocaleString('en-IN') ?? '0' }));
        }
        else if (title.toLowerCase().includes('renewal')) {
            columns = [
                { key: 'slNo', label: 'Sl. No.'},
                { key: 'agencyName', label: 'Agency Name'},
                { key: 'renewalNo', label: 'Rig Reg. No.' },
                { key: 'paymentDate', label: 'Payment Date'},
                { key: 'renewalFee', label: 'Fee (₹)', isNumeric: true },
            ];
             dialogData = records.map((item: any, index: number) => ({ ...item, slNo: index + 1, paymentDate: formatDate(safeParseDate(item.paymentDate)!, 'dd/MM/yyyy'), renewalFee: item.renewalFee?.toLocaleString('en-IN') ?? '0' }));
        }
        else if (title.toLowerCase().includes('application fee')) {
           columns = [
                { key: 'slNo', label: 'Sl. No.'},
                { key: 'agencyName', label: 'Agency Name'},
                { key: 'feeType', label: 'Fee Type'},
                { key: 'paymentDate', label: 'Payment Date'},
                { key: 'amount', label: 'Amount (₹)', isNumeric: true },
            ];
            dialogData = records.map((item: any, index: number) => ({ ...item, slNo: index + 1, paymentDate: formatDate(safeParseDate(item.paymentDate)!, 'dd/MM/yyyy'), amount: item.amount?.toLocaleString('en-IN') ?? '0' }));
        }


        if(records && records.length > 0) {
            onCellClick(dialogData, title);
        }
    };
    
    const handleTotalClick = (dataType: keyof SummaryData, title: string) => {
        const data = (summaryData as any)[dataType];
        let allRecords: any[] = [];
        if(Array.isArray(data)) {
            allRecords = data;
        } else if (typeof data === 'object') {
            allRecords = Object.values(data).flat();
        }

        let dialogData: any[] = [];
        let columns: any[] = [];

        if (title.toLowerCase().includes('agency registration')) {
            columns = [
                { key: 'slNo', label: 'Sl. No.'},
                { key: 'agencyName', label: 'Agency Name'},
                { key: 'regNo', label: 'Registration No'},
                { key: 'paymentDate', label: 'Payment Date'},
                { key: 'fee', label: 'Reg. Fee (₹)', isNumeric: true },
            ];
            dialogData = allRecords.map((item: any, index: number) => ({ ...item, slNo: index + 1, paymentDate: formatDate(safeParseDate(item.paymentDate)!, 'dd/MM/yyyy'), fee: item.fee?.toLocaleString('en-IN') ?? '0' }));
        } 
        else if (title.toLowerCase().includes('rig registration')) {
            columns = [
                { key: 'slNo', label: 'Sl. No.'},
                { key: 'agencyName', label: 'Agency Name'},
                { key: 'regNo', label: 'Registration No'},
                { key: 'paymentDate', label: 'Payment Date'},
                { key: 'fee', label: 'Reg. Fee (₹)', isNumeric: true },
            ];
            dialogData = allRecords.map((item: any, index: number) => ({ ...item, slNo: index + 1, paymentDate: formatDate(safeParseDate(item.paymentDate)!, 'dd/MM/yyyy'), fee: item.fee?.toLocaleString('en-IN') ?? '0' }));
        }
        else if (title.toLowerCase().includes('renewal')) {
            columns = [
                { key: 'slNo', label: 'Sl. No.'},
                { key: 'agencyName', label: 'Agency Name'},
                { key: 'renewalNo', label: 'Rig Reg. No.' },
                { key: 'paymentDate', label: 'Payment Date'},
                { key: 'renewalFee', label: 'Fee (₹)', isNumeric: true },
            ];
             dialogData = allRecords.map((item: any, index: number) => ({ ...item, slNo: index + 1, paymentDate: formatDate(safeParseDate(item.paymentDate)!, 'dd/MM/yyyy'), renewalFee: item.renewalFee?.toLocaleString('en-IN') ?? '0' }));
        }
        else if (title.toLowerCase().includes('application fee')) {
           columns = [
                { key: 'slNo', label: 'Sl. No.'},
                { key: 'agencyName', label: 'Agency Name'},
                { key: 'feeType', label: 'Fee Type'},
                { key: 'paymentDate', label: 'Payment Date'},
                { key: 'amount', label: 'Amount (₹)', isNumeric: true },
            ];
            dialogData = allRecords.map((item: any, index: number) => ({ ...item, slNo: index + 1, paymentDate: formatDate(safeParseDate(item.paymentDate)!, 'dd/MM/yyyy'), amount: item.amount?.toLocaleString('en-IN') ?? '0' }));
        }

        if (allRecords.length > 0) {
            onCellClick(dialogData, title);
        }
    };


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
            <CardContent className="overflow-x-auto p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="min-w-[250px]">Service</TableHead>
                            {rigTypeColumns.map(rigType => <TableHead key={rigType} className="text-center">{rigType}</TableHead>)}
                            <TableHead className="text-center font-bold">Total</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <FinancialRow label="No. of Agency Registration Applications" data={summaryData.agencyRegCount} total={summaryData.totals.agencyRegCount} onCellClick={() => handleCellClick('agencyRegData', 'Agency', 'Agency Registrations')} onTotalClick={() => handleTotalClick('agencyRegData', 'Total Agency Registrations')} />
                        <FinancialRow label="No. of Rig Registration Applications" data={summaryData.rigRegCount} total={summaryData.totals.rigRegCount} onCellClick={(rt) => handleCellClick('rigRegData', rt, `${rt} Registrations`)} onTotalClick={() => handleTotalClick('rigRegData', 'Total Rig Registrations')}/>
                        <FinancialRow label="No. of Rig Registration Renewal Applications" data={summaryData.renewalCount} total={summaryData.totals.renewalCount} onCellClick={(rt) => handleCellClick('renewalData', rt, `${rt} Renewals`)} onTotalClick={() => handleTotalClick('renewalData', 'Total Rig Renewals')}/>
                        
                        <TableRow className="bg-secondary/50 font-semibold"><TableCell colSpan={8} className="p-2">fees details (₹)</TableCell></TableRow>
                        
                        <FinancialAmountRow label="Agency Registration Application Fee" data={summaryData.agencyRegAppFee} total={summaryData.totals.agencyRegAppFee} onCellClick={() => handleCellClick('agencyRegAppFeeData', 'Agency', 'Agency Application Fees')} onTotalClick={() => handleTotalClick('agencyRegAppFeeData', 'Total Agency Application Fees')} />
                        <FinancialAmountRow label="Rig Registration Application Fee" data={summaryData.rigRegAppFee} total={summaryData.totals.rigRegAppFee} onCellClick={() => handleCellClick('rigRegAppFeeData', 'Agency', 'Rig Application Fees')} onTotalClick={() => handleTotalClick('rigRegAppFeeData', 'Total Rig Application Fees')} />
                        <FinancialAmountRow label="Agency Registration Fee" data={summaryData.agencyRegFee} total={summaryData.totals.agencyRegFee} onCellClick={() => handleCellClick('agencyRegFeeData', 'Agency', 'Agency Registration Fees')} onTotalClick={() => handleTotalClick('agencyRegFeeData', 'Total Agency Registration Fees')} />
                        <FinancialAmountRow label="Rig Registration Fee" data={summaryData.rigRegFee} total={summaryData.totals.rigRegFee} onCellClick={(rt) => handleCellClick('rigRegFeeData', rt, `${rt} Registration Fees`)} onTotalClick={() => handleTotalClick('rigRegFeeData', 'Total Rig Registration Fees')} />
                        <FinancialAmountRow label="Rig Registration Renewal Fee" data={summaryData.renewalFee} total={summaryData.totals.renewalFee} onCellClick={(rt) => handleCellClick('renewalFeeData', rt, `${rt} Renewal Fees`)} onTotalClick={() => handleTotalClick('renewalFeeData', 'Total Rig Renewal Fees')} />
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
