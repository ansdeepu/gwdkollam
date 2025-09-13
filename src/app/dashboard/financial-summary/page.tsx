// src/app/dashboard/financial-summary/page.tsx
"use client";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useAllFileEntriesForReports } from '@/hooks/useAllFileEntriesForReports';
import { usePageHeader } from '@/hooks/usePageHeader';
import { Loader2, RefreshCw, XCircle, Landmark } from "lucide-react";
import { format, startOfDay, endOfDay, isWithinInterval, isValid, parseISO, parse } from 'date-fns';
import { cn } from "@/lib/utils";
import type { DataEntryFormData, SitePurpose, SiteWorkStatus, ApplicationType } from '@/lib/schemas';
import { sitePurposeOptions } from '@/lib/schemas';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

export const dynamic = 'force-dynamic';

const PRIVATE_APPLICATION_TYPES: ApplicationType[] = ["Private_Domestic", "Private_Irrigation", "Private_Institution", "Private_Industry"];

interface FinancialSummary {
  totalApplications: number;
  totalRemittance: number;
  totalCompleted: number;
  totalPayment: number;
  applicationData: DataEntryFormData[]; 
  completedData: DataEntryFormData[];
}
type FinancialSummaryReport = Record<string, FinancialSummary>;


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


export default function FinancialSummaryPage() {
    const { setHeader } = usePageHeader();
    const { reportEntries: allFileEntries, isReportLoading } = useAllFileEntriesForReports();
    const [financeStartDate, setFinanceStartDate] = useState<Date | undefined>(undefined);
    const [financeEndDate, setFinanceEndDate] = useState<Date | undefined>(undefined);
    const [financeLoading, setFinanceLoading] = useState(false);
    
    useEffect(() => {
        setHeader('Financial Summary', 'An overview of financial metrics including credits, debits, and balances.');
    }, [setHeader]);

    const transformedFinanceMetrics = useMemo(() => {
        if (isReportLoading) return null;
    
        let sDate: Date | null = null;
        let eDate: Date | null = null;
        const isDateFilterActive = !!financeStartDate && !!financeEndDate;

        if (isDateFilterActive && financeStartDate && financeEndDate) {
            sDate = startOfDay(financeStartDate);
            eDate = endOfDay(financeEndDate);
        }

        let sbiCredit = 0, stsbCredit = 0, revenueHeadCreditDirect = 0;
        let sbiDebit = 0, stsbDebit = 0;

        allFileEntries.forEach((entry: DataEntryFormData) => {
          entry.remittanceDetails?.forEach(rd => {
            const remittedDate = rd.dateOfRemittance ? safeParseDate(rd.dateOfRemittance) : null;
            const isInPeriod = !isDateFilterActive || (remittedDate && isValid(remittedDate) && sDate && eDate && isWithinInterval(remittedDate, { start: sDate, end: eDate }));
            if (isInPeriod) {
              const amount = Number(rd.amountRemitted) || 0;
              if (rd.remittedAccount === 'SBI') sbiCredit += amount;
              else if (rd.remittedAccount === 'STSB') stsbCredit += amount;
              else if (rd.remittedAccount === 'RevenueHead') revenueHeadCreditDirect += amount;
            }
          });

          entry.paymentDetails?.forEach(pd => {
            const paymentDate = pd.dateOfPayment ? safeParseDate(pd.dateOfPayment) : null;
            const isInPeriod = !isDateFilterActive || (paymentDate && isValid(paymentDate) && sDate && eDate && isWithinInterval(paymentDate, { start: sDate, end: eDate }));
            if (isInPeriod) {
              const currentPaymentDebitAmount = (Number(pd.contractorsPayment) || 0) + (Number(pd.gst) || 0) + (Number(pd.incomeTax) || 0) + (Number(pd.kbcwb) || 0) + (Number(pd.refundToParty) || 0);
              if (pd.paymentAccount === 'SBI') sbiDebit += currentPaymentDebitAmount;
              else if (pd.paymentAccount === 'STSB') stsbDebit += currentPaymentDebitAmount;
              if (pd.revenueHead) revenueHeadCreditDirect += Number(pd.revenueHead) || 0;
            }
          });
        });
        
        return {
          sbiCredit, sbiDebit, sbiBalance: sbiCredit - sbiDebit,
          stsbCredit, stsbDebit, stsbBalance: stsbCredit - stsbDebit,
          revenueHeadCredit: revenueHeadCreditDirect, revenueHeadBalance: revenueHeadCreditDirect,
        };
    }, [financeStartDate, financeEndDate, allFileEntries, isReportLoading]);


    const handleClearFinanceDates = () => {
        setFinanceStartDate(undefined);
        setFinanceEndDate(undefined);
    };

    const parseDateFromString = (dateString: string): Date | undefined => {
        if (!dateString) return undefined;
        const parsedDate = parse(dateString, 'dd/MM/yyyy', new Date());
        return isValid(parsedDate) ? parsedDate : undefined;
    };


    if (isReportLoading) {
      return (
        <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-3 text-muted-foreground">Loading financial data...</p>
        </div>
      );
    }

    return (
        <div className="flex flex-col h-full">
            <CardHeader className="flex-shrink-0">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2"><Landmark className="h-5 w-5 text-primary" />Financial Summary</CardTitle>
                      <CardDescription>An overview of financial metrics including credits, debits, and balances.</CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => {}} disabled={isReportLoading}><RefreshCw className={cn("h-4 w-4", isReportLoading && "animate-spin")} /></Button>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-4 border-t mt-4">
                  <Input type="text" placeholder="From: dd/mm/yyyy" className="w-[180px]" value={financeStartDate ? format(financeStartDate, "dd/MM/yyyy") : ''} onChange={(e) => setFinanceStartDate(parseDateFromString(e.target.value))} />
                  <Input type="text" placeholder="To: dd/mm/yyyy" className="w-[180px]" value={financeEndDate ? format(financeEndDate, "dd/MM/yyyy") : ''} onChange={(e) => setFinanceEndDate(parseDateFromString(e.target.value))} />
                  <Button onClick={handleClearFinanceDates} variant="ghost" className="h-9 px-3"><XCircle className="mr-2 h-4 w-4"/>Clear Dates</Button>
                </div>
            </CardHeader>
            <Card className="flex-grow">
                <ScrollArea className="h-full">
                    <CardContent>
                        {transformedFinanceMetrics ? (
                            <Table>
                                <TableHeader><TableRow><TableHead>Account</TableHead><TableHead className="text-right">Total Credit (₹)</TableHead><TableHead className="text-right">Total Debit (₹)</TableHead><TableHead className="text-right">Balance (₹)</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    <TableRow><TableCell className="font-medium">SBI</TableCell><TableCell className="text-right font-mono text-green-600">{transformedFinanceMetrics.sbiCredit.toLocaleString('en-IN')}</TableCell><TableCell className="text-right font-mono text-red-600">{transformedFinanceMetrics.sbiDebit.toLocaleString('en-IN')}</TableCell><TableCell className="text-right font-mono font-semibold">{transformedFinanceMetrics.sbiBalance.toLocaleString('en-IN')}</TableCell></TableRow>
                                    <TableRow><TableCell className="font-medium">STSB</TableCell><TableCell className="text-right font-mono text-green-600">{transformedFinanceMetrics.stsbCredit.toLocaleString('en-IN')}</TableCell><TableCell className="text-right font-mono text-red-600">{transformedFinanceMetrics.stsbDebit.toLocaleString('en-IN')}</TableCell><TableCell className="text-right font-mono font-semibold">{transformedFinanceMetrics.stsbBalance.toLocaleString('en-IN')}</TableCell></TableRow>
                                    <TableRow><TableCell className="font-medium">Revenue Head</TableCell><TableCell className="text-right font-mono text-green-600">{transformedFinanceMetrics.revenueHeadCredit.toLocaleString('en-IN')}</TableCell><TableCell className="text-right font-mono text-red-600">0.00</TableCell><TableCell className="text-right font-mono font-semibold">{transformedFinanceMetrics.revenueHeadBalance.toLocaleString('en-IN')}</TableCell></TableRow>
                                </TableBody>
                                <TableFooter><TableRow className="bg-muted/80"><TableCell className="font-bold">Total Balance</TableCell><TableCell colSpan={3} className="text-right font-bold text-lg text-primary">₹{(transformedFinanceMetrics.sbiBalance + transformedFinanceMetrics.stsbBalance + transformedFinanceMetrics.revenueHeadBalance).toLocaleString('en-IN')}</TableCell></TableRow></TableFooter>
                            </Table>
                        ) : (<div className="h-40 flex items-center justify-center"><p className="text-muted-foreground">Calculating financial data...</p></div>)}
                    </CardContent>
                </ScrollArea>
            </Card>
        </div>
    );
}
