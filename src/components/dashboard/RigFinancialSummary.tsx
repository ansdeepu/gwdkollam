// src/components/dashboard/RigFinancialSummary.tsx
"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DollarSign, XCircle } from "lucide-react";
import type { AgencyApplication, RigType } from '@/lib/schemas';
import { format, startOfDay, endOfDay, isWithinInterval, isValid, parse, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface RigFinancialSummaryProps {
    applications: AgencyApplication[];
    onOpenDialog: (data: any[], title: string, columns: any[], type: 'rig') => void;
}

const rigTypeColumns: RigType[] = ["Hand Bore", "Filter Point Rig", "Calyx Rig", "Rotary Rig", "DTH Rig", "Rotary cum DTH Rig"];

const sanitizeRigType = (rigType: string) => rigType.replace(/[^a-zA-Z0-9]/g, '');

interface SummaryData {
    agencyRegCount: Record<string, { count: number; records: any[] }>;
    rigRegCount: Record<string, { count: number; records: any[] }>;
    renewalCount: Record<string, { count: number; records: any[] }>;
    agencyRegAppFee: Record<string, { amount: number; records: any[] }>;
    rigRegAppFee: Record<string, { amount: number; records: any[] }>;
    agencyRegFee: Record<string, { amount: number; records: any[] }>;
    rigRegFee: Record<string, { amount: number; records: any[] }>;
    renewalFee: Record<string, { amount: number; records: any[] }>;
    totals: Record<string, number>;
    grandTotalOfFees: number;
}

const safeParseDate = (dateValue: any): Date | null => {
  if (dateValue === null || dateValue === undefined || dateValue === '') return null;
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

const FinancialRow = ({ label, data, total, onCellClick }: { label: string; data: Record<string, { count: number, records: any[] }>; total: number; onCellClick: (records: any[], title: string) => void; }) => (
    <TableRow>
      <TableHead>{label}</TableHead>
      {rigTypeColumns.map(rigType => {
        const sanitizedKey = sanitizeRigType(rigType);
        const cellData = data[sanitizedKey] || { count: 0, records: [] };
        return (
            <TableCell key={rigType} className="text-center font-semibold">
              <Button variant="link" className="p-0 h-auto" disabled={cellData.count === 0} onClick={() => onCellClick(cellData.records, `${label} - ${rigType}`)}>
                  {cellData.count}
              </Button>
            </TableCell>
        );
      })}
       <TableCell className="text-center font-bold">
            <Button variant="link" className="p-0 h-auto font-bold" disabled={total === 0} onClick={() => {
                const allRecords = Object.values(data).flatMap(d => d.records);
                onCellClick(allRecords, `Total - ${label}`);
            }}>{total}</Button>
       </TableCell>
    </TableRow>
);

const FinancialAmountRow = ({ label, data, total, onCellClick }: { label: string; data: Record<string, { amount: number, records: any[] }>; total: number; onCellClick: (records: any[], title: string) => void; }) => (
    <TableRow>
      <TableHead>{label}</TableHead>
      {rigTypeColumns.map(rigType => {
        const sanitizedKey = sanitizeRigType(rigType);
        const cellData = data[sanitizedKey] || { amount: 0, records: [] };
        return (
            <TableCell key={rigType} className="text-right font-mono">
                 <Button variant="link" className="p-0 h-auto font-mono text-right" disabled={cellData.amount === 0} onClick={() => onCellClick(cellData.records, `${label} - ${rigType}`)}>
                    {cellData.amount.toLocaleString('en-IN')}
                 </Button>
            </TableCell>
        );
      })}
       <TableCell className="text-right font-bold font-mono">
            <Button variant="link" className="p-0 h-auto font-mono text-right font-bold" disabled={total === 0} onClick={() => {
                 const allRecords = Object.values(data).flatMap(d => d.records);
                 onCellClick(allRecords, `Total - ${label}`);
            }}>{total.toLocaleString('en-IN')}</Button>
       </TableCell>
    </TableRow>
);

export default function RigFinancialSummary({ applications, onOpenDialog }: RigFinancialSummaryProps) {
    const [startDate, setStartDate] = useState<Date | undefined>();
    const [endDate, setEndDate] = useState<Date | undefined>();

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
        
        const createInitialData = () => ({ count: 0, records: [] });
        const createInitialAmountData = () => ({ amount: 0, records: [] });
        
        const initialCounts = rigTypeColumns.reduce((acc, r) => ({...acc, [sanitizeRigType(r)]: createInitialData()}), {});
        const initialAmounts = rigTypeColumns.reduce((acc, r) => ({...acc, [sanitizeRigType(r)]: createInitialAmountData()}), {});

        let data: Omit<SummaryData, 'totals' | 'grandTotalOfFees'> = {
            agencyRegCount: { Agency: createInitialData() },
            rigRegCount: { ...JSON.parse(JSON.stringify(initialCounts)) },
            renewalCount: { ...JSON.parse(JSON.stringify(initialCounts)) },
            agencyRegAppFee: { Agency: createInitialAmountData() },
            rigRegAppFee: { Agency: createInitialAmountData() },
            agencyRegFee: { Agency: createInitialAmountData() },
            rigRegFee: { ...JSON.parse(JSON.stringify(initialAmounts)) },
            renewalFee: { ...JSON.parse(JSON.stringify(initialAmounts)) },
        };

        const uniqueAgencyRegs = new Set<string>();
        const uniqueRigRegs = new Set<string>();
        const uniqueRenewals = new Set<string>();

        const completedApplications = applications.filter(app => app.status === 'Active');
        
        applications.forEach(app => {
            app.applicationFees?.forEach(fee => {
                if (checkDate(fee.applicationFeePaymentDate)) {
                    if (fee.applicationFeeType === "Agency Registration") {
                        data.agencyRegAppFee["Agency"].amount += (Number(fee.applicationFeeAmount) || 0);
                        data.agencyRegAppFee["Agency"].records.push({ ...fee, agencyName: app.agencyName });
                    } else if (fee.applicationFeeType === "Rig Registration") {
                        data.rigRegAppFee["Agency"].amount += (Number(fee.applicationFeeAmount) || 0);
                        data.rigRegAppFee["Agency"].records.push({ ...fee, agencyName: app.agencyName });
                    }
                }
            });
        });

        completedApplications.forEach(app => {
            let feeAddedToAgency = false;
            if (checkDate(app.agencyPaymentDate)) {
                if (!uniqueAgencyRegs.has(app.id)) uniqueAgencyRegs.add(app.id);
                data.agencyRegFee["Agency"].amount += (Number(app.agencyRegistrationFee) || 0);
                feeAddedToAgency = true;
            }
            if (checkDate(app.agencyAdditionalPaymentDate)) {
                 if (!uniqueAgencyRegs.has(app.id)) uniqueAgencyRegs.add(app.id);
                 data.agencyRegFee["Agency"].amount += (Number(app.agencyAdditionalRegFee) || 0);
                 feeAddedToAgency = true;
            }
            if(feeAddedToAgency) {
                 if (!data.agencyRegFee["Agency"].records.some(r => r.id === app.id)) {
                    data.agencyRegFee["Agency"].records.push(app);
                 }
            }


            app.rigs?.forEach(rig => {
                const rigType = rig.typeOfRig;
                if (!rigType || !rigTypeColumns.includes(rigType)) return;
                const sanitizedKey = sanitizeRigType(rigType);
                
                let feeAddedToRig = false;
                if (checkDate(rig.paymentDate)) {
                    if (!uniqueRigRegs.has(rig.id)) uniqueRigRegs.add(rig.id);
                    data.rigRegFee[sanitizedKey].amount += (Number(rig.registrationFee) || 0);
                    feeAddedToRig = true;
                }
                if (checkDate(rig.additionalPaymentDate)) {
                    if (!uniqueRigRegs.has(rig.id)) uniqueRigRegs.add(rig.id);
                    data.rigRegFee[sanitizedKey].amount += (Number(rig.additionalRegistrationFee) || 0);
                    feeAddedToRig = true;
                }
                if(feeAddedToRig){
                     if (!data.rigRegFee[sanitizedKey].records.some((r: any) => r.id === rig.id)) {
                       data.rigRegFee[sanitizedKey].records.push({ ...rig, agencyName: app.agencyName });
                    }
                }
                
                rig.renewals?.forEach(renewal => {
                    if (checkDate(renewal.paymentDate)) {
                        if (!uniqueRenewals.has(renewal.id)) uniqueRenewals.add(renewal.id);
                        data.renewalFee[sanitizedKey].amount += (Number(renewal.renewalFee) || 0);
                        if (!data.renewalFee[sanitizedKey].records.some((r: any) => r.id === renewal.id)) {
                            data.renewalFee[sanitizedKey].records.push({ ...renewal, rigType: rig.typeOfRig, agencyName: app.agencyName, rigRegistrationNo: rig.rigRegistrationNo });
                        }
                    }
                });
            });
        });
        
        data.agencyRegCount["Agency"].count = uniqueAgencyRegs.size;
        data.agencyRegCount["Agency"].records = completedApplications.filter(app => uniqueAgencyRegs.has(app.id));

        const allUniqueRigRegs = new Set(Array.from(uniqueRigRegs));
        completedApplications.forEach(app => {
            app.rigs?.forEach(rig => {
                const rigType = rig.typeOfRig;
                if (!rigType || !rigTypeColumns.includes(rigType)) return;
                const sanitizedKey = sanitizeRigType(rigType);

                if (allUniqueRigRegs.has(rig.id)) {
                    if (!data.rigRegCount[sanitizedKey].records.some((r: any) => r.id === rig.id)) {
                         data.rigRegCount[sanitizedKey].records.push({ ...rig, agencyName: app.agencyName });
                    }
                }
            });
        });
        
        const allUniqueRenewals = new Set(Array.from(uniqueRenewals));
        completedApplications.forEach(app => {
            app.rigs?.forEach(rig => {
                const rigType = rig.typeOfRig;
                if (!rigType || !rigTypeColumns.includes(rigType)) return;
                const sanitizedKey = sanitizeRigType(rigType);

                rig.renewals?.forEach(renewal => {
                    if (allUniqueRenewals.has(renewal.id)) {
                         if (!data.renewalCount[sanitizedKey].records.some((r: any) => r.id === renewal.id)) {
                            data.renewalCount[sanitizedKey].records.push({ ...renewal, rigType: rig.typeOfRig, agencyName: app.agencyName, rigRegistrationNo: rig.rigRegistrationNo });
                        }
                    }
                });
            });
        });

        Object.keys(data.rigRegCount).forEach(key => {
            data.rigRegCount[key].count = data.rigRegCount[key].records.length;
        });

        Object.keys(data.renewalCount).forEach(key => {
            data.renewalCount[key].count = data.renewalCount[key].records.length;
        });


        const totals: Record<string, number> = {};
        Object.keys(data).forEach(key => {
            const dataItem = (data as any)[key];
            if(typeof dataItem === 'object' && !Array.isArray(dataItem)) {
                totals[key] = Object.values(dataItem).reduce((sum, val: any) => sum + (val.count ?? val.amount ?? 0), 0);
            }
        });
        
        const grandTotalOfFees =
            (totals.agencyRegAppFee || 0) + (totals.rigRegAppFee || 0) +
            (totals.agencyRegFee || 0) + (totals.rigRegFee || 0) + (totals.renewalFee || 0);

        return { ...(data as any), totals, grandTotalOfFees };
    }, [applications, startDate, endDate]);

    const handleCellClick = (records: any[], title: string) => {
        if (records.length === 0) return;

        let columns: { key: string; label: string; isNumeric?: boolean; }[];
        let dialogData: Record<string, any>[];
        
        if (title.includes("Agency Registration")) {
            columns = [ { key: 'slNo', label: 'Sl. No.' }, { key: 'agencyName', label: 'Name of Agency' }, { key: 'paymentDate', label: 'Payment Date' }, { key: 'fee', label: 'Fee (₹)', isNumeric: true }, ];
            dialogData = records.map(record => ({
                agencyName: record.agencyName,
                regNo: record.agencyRegistrationNo || 'N/A',
                fee: ((Number(record.agencyRegistrationFee) || 0) + (Number(record.agencyAdditionalRegFee) || 0) + (Number(record.applicationFeeAmount) || 0)).toLocaleString('en-IN'),
                paymentDate: record.agencyPaymentDate || record.agencyAdditionalPaymentDate || record.applicationFeePaymentDate
            }));
        } else if (title.startsWith("Total - No. of Rig Registration Applications")) {
             columns = [ { key: 'slNo', label: 'Sl. No.' }, { key: 'agencyName', label: 'Name of Agency' }, { key: 'typeOfRig', label: 'Type of Rig'}, { key: 'paymentDate', label: 'Payment Date' }, { key: 'fee', label: 'Fee (₹)', isNumeric: true }, ];
             dialogData = records.map((record) => {
                const paymentDate = record.paymentDate || record.additionalPaymentDate;
                const fee = (Number(record.registrationFee) || 0) + (Number(record.additionalRegistrationFee) || 0);
                return {
                    agencyName: record.agencyName,
                    typeOfRig: record.typeOfRig || 'N/A',
                    paymentDate: paymentDate ? format(safeParseDate(paymentDate)!, 'dd/MM/yyyy') : 'N/A',
                    fee: fee.toLocaleString('en-IN'),
                };
            });
        } else if (title.startsWith("Total - No. of Rig Registration Renewal Applications")) {
             columns = [ { key: 'slNo', label: 'Sl. No.' }, { key: 'agencyName', label: 'Name of Agency' }, { key: 'typeOfRig', label: 'Type of Rig'}, { key: 'paymentDate', label: 'Payment Date' }, { key: 'fee', label: 'Fee (₹)', isNumeric: true }, ];
             dialogData = records.map((record) => ({
                agencyName: record.agencyName,
                typeOfRig: record.typeOfRig || 'N/A',
                paymentDate: record.paymentDate ? format(safeParseDate(record.paymentDate)!, 'dd/MM/yyyy') : 'N/A',
                fee: (Number(record.renewalFee) || 0).toLocaleString('en-IN'),
            }));
        } else { // Fallback for fees and individual type counts
             columns = [ { key: 'slNo', label: 'Sl. No.' }, { key: 'agencyName', label: 'Name of Agency' }, { key: 'typeOfRig', label: 'Type of Rig'}, { key: 'paymentDate', label: 'Payment Date' }, { key: 'amount', label: 'Amount (₹)', isNumeric: true }, ];
             dialogData = records.map((record) => {
                const paymentDate = record.paymentDate || record.applicationFeePaymentDate || record.agencyPaymentDate;
                const amount = record.renewalFee ?? record.applicationFeeAmount ?? record.registrationFee ?? record.additionalRegistrationFee ?? ((Number(record.agencyRegistrationFee) || 0) + (Number(record.agencyAdditionalRegFee) || 0));
                return {
                    agencyName: record.agencyName,
                    typeOfRig: record.typeOfRig || 'N/A',
                    paymentDate: paymentDate ? format(safeParseDate(paymentDate)!, 'dd/MM/yyyy') : 'N/A',
                    amount: (Number(amount) || 0).toLocaleString('en-IN'),
                };
            });
        }
        
        const sortedData = dialogData.sort((a, b) => {
            const dateA = a.paymentDate === 'N/A' ? 0 : parse(a.paymentDate, 'dd/MM/yyyy', new Date()).getTime();
            const dateB = b.paymentDate === 'N/A' ? 0 : parse(b.paymentDate, 'dd/MM/yyyy', new Date()).getTime();
            return dateA - dateB;
        }).map((item, index) => ({ ...item, slNo: index + 1 }));

        onOpenDialog(sortedData, title, columns, 'rig');
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5 text-primary" />Rig Registration Financials</CardTitle>
                <CardDescription>Financial summary for rig and agency registrations, filterable by date. Click numbers for details.</CardDescription>
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
                        <FinancialRow label="No. of Agency Registration Applications" data={{Agency: summaryData.agencyRegCount.Agency}} total={summaryData.totals.agencyRegCount} onCellClick={handleCellClick} />
                        <FinancialRow label="No. of Rig Registration Applications" data={summaryData.rigRegCount} total={summaryData.totals.rigRegCount} onCellClick={handleCellClick}/>
                        <FinancialRow label="No. of Rig Registration Renewal Applications" data={summaryData.renewalCount} total={summaryData.totals.renewalCount} onCellClick={handleCellClick} />
                        
                        <TableRow className="bg-secondary/50 font-semibold"><TableCell colSpan={8} className="p-2">fees details (₹)</TableCell></TableRow>
                        
                        <FinancialAmountRow label="Agency Registration Application Fee" data={summaryData.agencyRegAppFee} total={summaryData.totals.agencyRegAppFee} onCellClick={handleCellClick}/>
                        <FinancialAmountRow label="Rig Registration Application Fee" data={summaryData.rigRegAppFee} total={summaryData.totals.rigRegAppFee} onCellClick={handleCellClick}/>
                        <FinancialAmountRow label="Agency Registration Fee" data={summaryData.agencyRegFee} total={summaryData.totals.agencyRegFee} onCellClick={handleCellClick}/>
                        <FinancialAmountRow label="Rig Registration Fee" data={summaryData.rigRegFee} total={summaryData.totals.rigRegFee} onCellClick={handleCellClick}/>
                        <FinancialAmountRow label="Rig Registration Renewal Fee" data={summaryData.renewalFee} total={summaryData.totals.renewalFee} onCellClick={handleCellClick}/>
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
