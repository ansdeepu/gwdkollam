
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
import { useToast } from '@/hooks/use-toast';

interface RigFinancialSummaryProps {
    applications: AgencyApplication[];
    onCellClick: (data: any[], title: string) => void;
}

const rigTypeColumns: RigType[] = ["Hand Bore", "Filter Point Rig", "Calyx Rig", "Rotary Rig", "DTH Rig", "Rotary cum DTH Rig"];

// Sanitize rig type for use as an object key by removing spaces and special characters
const sanitizeRigType = (rigType: string) => rigType.replace(/[^a-zA-Z0-9]/g, '');


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
  if (typeof dateValue === 'string' || typeof dateValue === 'number') {
    const parsed = new Date(dateValue);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return null;
};

const FinancialRow = ({ label, data, total, onCellClick, onTotalClick, dataType }: { label: string; data: Record<string, number>; total: number; onCellClick: (dataType: string, sanitizedRigType: string, rigType: string) => void; onTotalClick: () => void; dataType: string; }) => (
    <TableRow>
      <TableHead>{label}</TableHead>
      {rigTypeColumns.map(rigType => {
        const sanitizedKey = sanitizeRigType(rigType);
        return (
            <TableCell key={rigType} className="text-center">
                <Button variant="link" disabled={!data[sanitizedKey]} onClick={() => onCellClick(dataType, sanitizedKey, rigType)} className="p-0 h-auto font-semibold">{data[sanitizedKey] || 0}</Button>
            </TableCell>
        );
      })}
       <TableCell className="text-center font-bold">
            <Button variant="link" disabled={!total} onClick={onTotalClick} className="p-0 h-auto font-bold">{total}</Button>
       </TableCell>
    </TableRow>
);

const FinancialAmountRow = ({ label, data, total, onCellClick, onTotalClick, dataType }: { label: string; data: Record<string, number>; total: number; onCellClick: (dataType: string, sanitizedRigType: string, rigType: string) => void; onTotalClick: () => void; dataType: keyof SummaryData | string; }) => (
    <TableRow>
      <TableHead>{label}</TableHead>
      {rigTypeColumns.map(rigType => {
        const sanitizedKey = sanitizeRigType(rigType);
        return (
            <TableCell key={rigType} className="text-right font-mono">
                <Button variant="link" disabled={!data[sanitizedKey]} onClick={() => onCellClick(dataType, sanitizedKey, rigType)} className="p-0 h-auto font-mono text-right w-full block">{(data[sanitizedKey] || 0).toLocaleString('en-IN')}</Button>
            </TableCell>
        );
      })}
       <TableCell className="text-right font-bold font-mono">
            <Button variant="link" disabled={!total} onClick={onTotalClick} className="p-0 h-auto font-mono font-bold text-right w-full block">{total.toLocaleString('en-IN')}</Button>
       </TableCell>
    </TableRow>
);


export default function RigFinancialSummary({ applications, onCellClick }: RigFinancialSummaryProps) {
    const [startDate, setStartDate] = useState<Date | undefined>();
    const [endDate, setEndDate] = useState<Date | undefined>();
    const { toast } = useToast();

    const summaryData: SummaryData = useMemo(() => {
        const sDate = startDate ? startOfDay(startDate) : null;
        const eDate = endDate ? endOfDay(endDate) : null;
        const isDateFilterActive = sDate && eDate;

        const checkDate = (date: Date | string | null | undefined): boolean => {
            if (!isDateFilterActive) return true;
            if (!date) return false;
            const d = safeParseDate(date);
            return d ? isWithinInterval(d, { start: sDate, end: eDate }) : false;
        };
        
        const initialCounts = rigTypeColumns.reduce((acc, r) => ({...acc, [sanitizeRigType(r)]: 0}), {});

        let data: SummaryData = {
            agencyRegCount: { Agency: 0 },
            rigRegCount: { ...initialCounts },
            renewalCount: { ...initialCounts },
            agencyRegAppFee: { Agency: 0 },
            rigRegAppFee: { Agency: 0 },
            agencyRegFee: { Agency: 0 },
            rigRegFee: { ...initialCounts },
            renewalFee: { ...initialCounts },
            totals: {},
            grandTotalOfFees: 0,
            
            agencyRegData: [],
            rigRegData: rigTypeColumns.reduce((acc, r) => ({...acc, [sanitizeRigType(r)]: []}), {}),
            renewalData: rigTypeColumns.reduce((acc, r) => ({...acc, [sanitizeRigType(r)]: []}), {}),
            agencyRegAppFeeData: [],
            rigRegAppFeeData: [],
            agencyRegFeeData: [],
            rigRegFeeData: rigTypeColumns.reduce((acc, r) => ({...acc, [sanitizeRigType(r)]: []}), {}),
            renewalFeeData: rigTypeColumns.reduce((acc, r) => ({...acc, [sanitizeRigType(r)]: []}), {}),
        };
        
        applications.forEach(app => {
            app.applicationFees?.forEach(fee => {
                if (checkDate(fee.applicationFeePaymentDate)) {
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
            const agencyRegRecord = { agencyName: app.agencyName, regNo: app.agencyRegistrationNo, paymentDate: app.agencyPaymentDate, fee: app.agencyRegistrationFee };
            
            if (checkDate(app.agencyPaymentDate) || checkDate(app.agencyAdditionalPaymentDate)) {
                 if (!data.agencyRegData.some((r: any) => r.regNo === app.agencyRegistrationNo)) {
                    data.agencyRegCount["Agency"]++;
                    data.agencyRegData.push(agencyRegRecord);
                 }
                 if (checkDate(app.agencyPaymentDate)) {
                    data.agencyRegFee["Agency"] += (Number(app.agencyRegistrationFee) || 0);
                    if (!data.agencyRegFeeData.some((r: any) => r.regNo === app.agencyRegistrationNo && r.paymentDate === app.agencyPaymentDate)) {
                        data.agencyRegFeeData.push(agencyRegRecord);
                    }
                 }
                 if (checkDate(app.agencyAdditionalPaymentDate)) {
                    data.agencyRegFee["Agency"] += (Number(app.agencyAdditionalRegFee) || 0);
                    const additionalRecord = { ...agencyRegRecord, paymentDate: app.agencyAdditionalPaymentDate, fee: app.agencyAdditionalRegFee };
                    if (!data.agencyRegFeeData.some((r: any) => r.regNo === app.agencyRegistrationNo && r.paymentDate === app.agencyAdditionalPaymentDate)) {
                        data.agencyRegFeeData.push(additionalRecord);
                    }
                 }
            }


            app.rigs?.forEach(rig => {
                const rigType = rig.typeOfRig;
                if (!rigType || !rigTypeColumns.includes(rigType)) return;
                const sanitizedKey = sanitizeRigType(rigType);
                
                const rigRegRecord = { agencyName: app.agencyName, rigType: rigType, regNo: rig.rigRegistrationNo, paymentDate: rig.paymentDate, fee: rig.registrationFee };
                
                if (checkDate(rig.paymentDate) || checkDate(rig.additionalPaymentDate)) {
                    if (!data.rigRegData[sanitizedKey].some((r: any) => r.regNo === rig.rigRegistrationNo)) {
                         data.rigRegCount[sanitizedKey]++;
                         data.rigRegData[sanitizedKey].push(rigRegRecord);
                    }
                    if (checkDate(rig.paymentDate)) {
                        data.rigRegFee[sanitizedKey] += (Number(rig.registrationFee) || 0);
                        if (!data.rigRegFeeData[sanitizedKey].some((r:any) => r.regNo === rig.rigRegistrationNo && r.paymentDate === rig.paymentDate)) {
                            data.rigRegFeeData[sanitizedKey].push(rigRegRecord);
                        }
                    }
                    if (checkDate(rig.additionalPaymentDate)) {
                        data.rigRegFee[sanitizedKey] += (Number(rig.additionalRegistrationFee) || 0);
                        const additionalRecord = { ...rigRegRecord, paymentDate: rig.additionalPaymentDate, fee: rig.additionalRegistrationFee };
                        if (!data.rigRegFeeData[sanitizedKey].some((r:any) => r.regNo === rig.rigRegistrationNo && r.paymentDate === rig.additionalPaymentDate)) {
                            data.rigRegFeeData[sanitizedKey].push(additionalRecord);
                        }
                    }
                }
                
                rig.renewals?.forEach(renewal => {
                    if (checkDate(renewal.paymentDate)) {
                        data.renewalCount[sanitizedKey]++;
                        data.renewalFee[sanitizedKey] += (Number(renewal.renewalFee) || 0);
                        const renewalRecord = { agencyName: app.agencyName, rigType: rigType, renewalNo: rig.rigRegistrationNo, paymentDate: renewal.paymentDate, renewalFee: renewal.renewalFee };
                        if (!data.renewalData[sanitizedKey].some((r: any) => r.renewalNo === rig.rigRegistrationNo && r.paymentDate === renewal.paymentDate)) {
                            data.renewalData[sanitizedKey].push(renewalRecord);
                        }
                        if (!data.renewalFeeData[sanitizedKey].some((r: any) => r.renewalNo === rig.rigRegistrationNo && r.paymentDate === renewal.paymentDate)) {
                            data.renewalFeeData[sanitizedKey].push(renewalRecord);
                        }
                    }
                });
            });
        });
        
        const totals: Record<string, number> = {};
        Object.keys(data).forEach(key => {
            if(typeof (data as any)[key] === 'object' && !Array.isArray((data as any)[key])) {
                totals[key] = (Object.values((data as any)[key]) as number[]).reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0);
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

    const handleCellClick = (dataType: keyof SummaryData | string, rigTypeOrSanitizedKey: RigType | 'Agency' | string, title: string) => {
        const data = (summaryData as any)[dataType];
         if (!data) {
            toast({ title: "Data not found", description: `Could not find data for ${title}`});
            return;
        }
        
        const isAgency = rigTypeOrSanitizedKey === 'Agency';
        const records = isAgency ? data : data[rigTypeOrSanitizedKey];


         if (!records || records.length === 0) {
             toast({ title: "No records", description: `No records to display for ${title}`});
            return;
        }

        let dialogData: any[] = [];
        let columns: any[] = [];

        if (title.toLowerCase().includes('agency registration')) {
            columns = [
                { key: 'slNo', label: 'Sl. No.'}, { key: 'agencyName', label: 'Agency Name'},
                { key: 'regNo', label: 'Registration No'}, { key: 'paymentDate', label: 'Payment Date'},
                { key: 'fee', label: 'Reg. Fee (₹)', isNumeric: true },
            ];
            dialogData = records.map((item: any, index: number) => {
                const parsedDate = safeParseDate(item.paymentDate);
                return { ...item, slNo: index + 1, paymentDate: parsedDate ? format(parsedDate, 'dd/MM/yyyy') : 'N/A', fee: item.fee?.toLocaleString('en-IN') ?? '0' }
            });
        } 
        else if (title.toLowerCase().includes('rig registration')) {
            columns = [
                { key: 'slNo', label: 'Sl. No.'}, { key: 'agencyName', label: 'Agency Name'},
                { key: 'regNo', label: 'Registration No'}, { key: 'paymentDate', label: 'Payment Date'},
                { key: 'fee', label: 'Reg. Fee (₹)', isNumeric: true },
            ];
            dialogData = records.map((item: any, index: number) => {
                const parsedDate = safeParseDate(item.paymentDate);
                return { ...item, slNo: index + 1, paymentDate: parsedDate ? format(parsedDate, 'dd/MM/yyyy') : 'N/A', fee: item.fee?.toLocaleString('en-IN') ?? '0' }
            });
        }
        else if (title.toLowerCase().includes('renewal')) {
            columns = [
                { key: 'slNo', label: 'Sl. No.'}, { key: 'agencyName', label: 'Agency Name'},
                { key: 'renewalNo', label: 'Rig Reg. No.' }, { key: 'paymentDate', label: 'Payment Date'},
                { key: 'renewalFee', label: 'Fee (₹)', isNumeric: true },
            ];
             dialogData = records.map((item: any, index: number) => {
                const parsedDate = safeParseDate(item.paymentDate);
                return { ...item, slNo: index + 1, paymentDate: parsedDate ? format(parsedDate, 'dd/MM/yyyy') : 'N/A', renewalFee: item.renewalFee?.toLocaleString('en-IN') ?? '0' }
             });
        }
        else if (title.toLowerCase().includes('application fee')) {
           columns = [
                { key: 'slNo', label: 'Sl. No.'}, { key: 'agencyName', label: 'Agency Name'},
                { key: 'feeType', label: 'Fee Type'}, { key: 'paymentDate', label: 'Payment Date'},
                { key: 'amount', label: 'Amount (₹)', isNumeric: true },
            ];
            dialogData = records.map((item: any, index: number) => {
                const parsedDate = safeParseDate(item.paymentDate);
                return { ...item, slNo: index + 1, paymentDate: parsedDate ? format(parsedDate, 'dd/MM/yyyy') : 'N/A', amount: item.amount?.toLocaleString('en-IN') ?? '0' }
            });
        }


        if(dialogData && dialogData.length > 0) {
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
                { key: 'slNo', label: 'Sl. No.'}, { key: 'agencyName', label: 'Agency Name'},
                { key: 'regNo', label: 'Registration No'}, { key: 'paymentDate', label: 'Payment Date'},
                { key: 'fee', label: 'Reg. Fee (₹)', isNumeric: true },
            ];
            dialogData = allRecords.map((item: any, index: number) => {
                const parsedDate = safeParseDate(item.paymentDate);
                return { ...item, slNo: index + 1, paymentDate: parsedDate ? format(parsedDate, 'dd/MM/yyyy') : 'N/A', fee: item.fee?.toLocaleString('en-IN') ?? '0' };
            });
        } 
        else if (title.toLowerCase().includes('rig registration')) {
            columns = [
                { key: 'slNo', label: 'Sl. No.'}, { key: 'agencyName', label: 'Agency Name'},
                { key: 'regNo', label: 'Registration No'}, { key: 'paymentDate', label: 'Payment Date'},
                { key: 'fee', label: 'Reg. Fee (₹)', isNumeric: true },
            ];
            dialogData = allRecords.map((item: any, index: number) => {
                const parsedDate = safeParseDate(item.paymentDate);
                return { ...item, slNo: index + 1, paymentDate: parsedDate ? format(parsedDate, 'dd/MM/yyyy') : 'N/A', fee: item.fee?.toLocaleString('en-IN') ?? '0' };
            });
        }
        else if (title.toLowerCase().includes('renewal')) {
            columns = [
                { key: 'slNo', label: 'Sl. No.'}, { key: 'agencyName', label: 'Agency Name'},
                { key: 'renewalNo', label: 'Rig Reg. No.' }, { key: 'paymentDate', label: 'Payment Date'},
                { key: 'renewalFee', label: 'Fee (₹)', isNumeric: true },
            ];
             dialogData = allRecords.map((item: any, index: number) => {
                const parsedDate = safeParseDate(item.paymentDate);
                return { ...item, slNo: index + 1, paymentDate: parsedDate ? format(parsedDate, 'dd/MM/yyyy') : 'N/A', renewalFee: item.renewalFee?.toLocaleString('en-IN') ?? '0' };
             });
        }
        else if (title.toLowerCase().includes('application fees')) {
           columns = [
                { key: 'slNo', label: 'Sl. No.'}, { key: 'agencyName', label: 'Agency Name'},
                { key: 'feeType', label: 'Fee Type'}, { key: 'paymentDate', label: 'Payment Date'},
                { key: 'amount', label: 'Amount (₹)', isNumeric: true },
            ];
            dialogData = allRecords.map((item: any, index: number) => {
                const parsedDate = safeParseDate(item.paymentDate);
                return { ...item, slNo: index + 1, paymentDate: parsedDate ? format(parsedDate, 'dd/MM/yyyy') : 'N/A', amount: item.amount?.toLocaleString('en-IN') ?? '0' };
            });
        }

        if (dialogData.length > 0) {
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
                        <FinancialRow label="No. of Agency Registration Applications" data={summaryData.agencyRegCount} total={summaryData.totals.agencyRegCount} onCellClick={() => handleCellClick('agencyRegData', 'Agency', 'Agency Registrations')} onTotalClick={() => handleTotalClick('agencyRegData', 'Total Agency Registrations')} dataType="agencyRegData" />
                        <FinancialRow label="No. of Rig Registration Applications" data={summaryData.rigRegCount} total={summaryData.totals.rigRegCount} onCellClick={(dataType, sKey, rigType) => handleCellClick(dataType, sKey, `${rigType} Registrations`)} onTotalClick={() => handleTotalClick('rigRegData', 'Total Rig Registrations')} dataType="rigRegData"/>
                        <FinancialRow label="No. of Rig Registration Renewal Applications" data={summaryData.renewalCount} total={summaryData.totals.renewalCount} onCellClick={(dataType, sKey, rigType) => handleCellClick(dataType, sKey, `${rigType} Renewals`)} onTotalClick={() => handleTotalClick('renewalData', 'Total Rig Renewals')} dataType="renewalData"/>
                        
                        <TableRow className="bg-secondary/50 font-semibold"><TableCell colSpan={8} className="p-2">fees details (₹)</TableCell></TableRow>
                        
                        <FinancialAmountRow label="Agency Registration Application Fee" data={summaryData.agencyRegAppFee} total={summaryData.totals.agencyRegAppFee} onCellClick={() => handleCellClick('agencyRegAppFeeData', 'Agency', 'Agency Application Fees')} onTotalClick={() => handleTotalClick('agencyRegAppFeeData', 'Total Agency Application Fees')} dataType="agencyRegAppFeeData"/>
                        <FinancialAmountRow label="Rig Registration Application Fee" data={summaryData.rigRegAppFee} total={summaryData.totals.rigRegAppFee} onCellClick={() => handleCellClick('rigRegAppFeeData', 'Agency', 'Rig Application Fees')} onTotalClick={() => handleTotalClick('rigRegAppFeeData', 'Total Rig Application Fees')} dataType="rigRegAppFeeData"/>
                        <FinancialAmountRow label="Agency Registration Fee" data={summaryData.agencyRegFee} total={summaryData.totals.agencyRegFee} onCellClick={() => handleCellClick('agencyRegFeeData', 'Agency', 'Agency Registration Fees')} onTotalClick={() => handleTotalClick('agencyRegFeeData', 'Total Agency Registration Fees')} dataType="agencyRegFeeData"/>
                        <FinancialAmountRow label="Rig Registration Fee" data={summaryData.rigRegFee} total={summaryData.totals.rigRegFee} onCellClick={(dataType, sKey, rigType) => handleCellClick(dataType, sKey, `${rigType} Registration Fees`)} onTotalClick={() => handleTotalClick('rigRegFeeData', 'Total RigRegistration Fees')} dataType="rigRegFeeData" />
                        <FinancialAmountRow label="Rig Registration Renewal Fee" data={summaryData.renewalFee} total={summaryData.totals.renewalFee} onCellClick={(dataType, sKey, rigType) => handleCellClick(dataType, sKey, `${rigType} Renewal Fees`)} onTotalClick={() => handleTotalClick('renewalFeeData', 'Total Rig Renewal Fees')} dataType="renewalFeeData"/>
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
