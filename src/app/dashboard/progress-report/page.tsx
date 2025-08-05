
// src/app/dashboard/progress-report/page.tsx
"use client";

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { BarChart3, CalendarIcon, XCircle, Loader2, Play, FileDown } from 'lucide-react';
import { format, startOfDay, endOfDay, isValid, isWithinInterval, parseISO } from 'date-fns';
import { useFileEntries } from '@/hooks/useFileEntries';
import { cn } from "@/lib/utils";
import {
  applicationTypeOptions,
  applicationTypeDisplayMap,
  type ApplicationType,
  type SitePurpose,
} from '@/lib/schemas';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';

// Define the structure for the new progress report data
interface ProgressStats {
  previousBalance: number;
  currentApplications: number;
  completed: number;
  refunded: number;
  balance: number;
}

type DiameterProgress = Record<string, ProgressStats>; // Keyed by diameter string like "110 mm" or "Total"
type ApplicationTypeProgress = Record<ApplicationType, DiameterProgress>;

type OtherServiceProgress = Record<SitePurpose, ProgressStats>;

interface FinancialSummary {
    totalApplications: number;
    totalRemittance: number;
    totalCompleted: number;
    totalPayment: number;
}
type FinancialSummaryReport = Record<SitePurpose, FinancialSummary>;


const BWC_DIAMETERS = ['110 mm (4.5”)', '150 mm (6”)'];
const TWC_DIAMETERS = ['150 mm (6”)', '200 mm (8”)'];

const OTHER_PURPOSES: SitePurpose[] = [
  "FPW", "BW Dev", "TW Dev", "FPW Dev", "MWSS", "MWSS Ext", 
  "Pumping Scheme", "MWSS Pump Reno", "HPS", "HPR", "ARS"
];

const REFUNDED_STATUSES = ['To be Refunded'];
const INACTIVE_STATUSES_FOR_BALANCE = ['Work Completed', 'Work Failed', 'To be Refunded'];


const WellTypeProgressTable = ({ title, data, diameters }: { title: string; data: ApplicationTypeProgress, diameters: string[] }) => {
    const metrics: Array<{ key: keyof ProgressStats, label: string }> = [
        { key: 'previousBalance', label: 'No. of Previous Application' },
        { key: 'currentApplications', label: 'No. of Current Application' },
        { key: 'completed', label: 'Completed' },
        { key: 'refunded', label: 'Refund' },
        { key: 'balance', label: 'Balance' }
    ];

    return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table className="min-w-full border-collapse">
          <TableHeader>
            <TableRow>
              <TableHead className="border p-2 align-middle text-center min-w-[150px] font-semibold">Type of Application</TableHead>
              <TableHead className="border p-2 align-middle text-center min-w-[200px] font-semibold">Details</TableHead>
              {diameters.map(diameter => (
                <TableHead key={diameter} className="border p-2 text-center font-semibold">{diameter}</TableHead>
              ))}
              <TableHead className="border p-2 text-center font-bold">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(Object.keys(data) as ApplicationType[]).map((appType, appIndex) => (
              <React.Fragment key={appType}>
                {metrics.map((metric, metricIndex) => (
                  <TableRow key={`${appType}-${metric.key}`}>
                    {metricIndex === 0 && (
                      <TableCell rowSpan={metrics.length} className="border p-2 font-medium align-middle text-left whitespace-normal break-words min-w-[150px]">
                        {applicationTypeDisplayMap[appType]}
                      </TableCell>
                    )}
                    <TableCell className={cn("border p-2 text-left", metric.key === 'balance' && "font-bold")}>
                      {metric.label}
                    </TableCell>
                    {diameters.map(diameter => (
                      <TableCell key={`${appType}-${metric.key}-${diameter}`} className={cn("border p-2 text-center", metric.key === 'balance' && "font-bold")}>
                        {data[appType][diameter]?.[metric.key] ?? 0}
                      </TableCell>
                    ))}
                    <TableCell className={cn("border p-2 text-center font-bold")}>
                      {data[appType]['Total']?.[metric.key] ?? 0}
                    </TableCell>
                  </TableRow>
                ))}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};


export default function ProgressReportPage() {
  const { fileEntries, isLoading: entriesLoading } = useFileEntries();
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [isFiltering, setIsFiltering] = useState(false);
  const { toast } = useToast();

  const [reportData, setReportData] = useState<{
    bwcData: ApplicationTypeProgress;
    twcData: ApplicationTypeProgress;
    otherServicesData: OtherServiceProgress;
    financialSummaryData: FinancialSummaryReport;
  } | null>(null);

  const handleGenerateReport = useCallback(() => {
    if (!startDate || !endDate) {
        toast({ title: "Date Range Required", description: "Please select both a 'From' and 'To' date to generate the report.", variant: "destructive" });
        return;
    }
    setIsFiltering(true);
    setReportData(null); 

    const sDate = startOfDay(startDate);
    const eDate = endOfDay(endDate);

    const initialStats = (): ProgressStats => ({ previousBalance: 0, currentApplications: 0, completed: 0, refunded: 0, balance: 0 });
    const bwcData: ApplicationTypeProgress = {} as ApplicationTypeProgress;
    const twcData: ApplicationTypeProgress = {} as ApplicationTypeProgress;
    const otherServicesData: OtherServiceProgress = {} as OtherServiceProgress;
    OTHER_PURPOSES.forEach(p => { otherServicesData[p] = initialStats(); });
    
    const initialFinancialSummary = (): FinancialSummary => ({ totalApplications: 0, totalRemittance: 0, totalCompleted: 0, totalPayment: 0 });
    const financialSummaryData: FinancialSummaryReport = {} as FinancialSummaryReport;
    [...BWC_DIAMETERS, ...TWC_DIAMETERS, ...OTHER_PURPOSES].forEach(p => financialSummaryData[p as SitePurpose] = initialFinancialSummary())

    applicationTypeOptions.forEach(appType => {
      bwcData[appType] = { Total: initialStats() };
      BWC_DIAMETERS.forEach(d => { bwcData[appType][d] = initialStats(); });
      twcData[appType] = { Total: initialStats() };
      TWC_DIAMETERS.forEach(d => { twcData[appType][d] = initialStats(); });
    });

    fileEntries.forEach(entry => {
      const appType = entry.applicationType;
      if (!appType) return;

      const firstRemittanceDateStr = entry.remittanceDetails?.[0]?.dateOfRemittance;
      const firstRemittanceDate = firstRemittanceDateStr ? parseISO(firstRemittanceDateStr as any) : null;
      
      const entryTotalRemittance = entry.totalRemittance || 0;
      const entryTotalPayment = entry.totalPaymentAllEntries || 0;

      entry.siteDetails?.forEach(site => {
        const purpose = site.purpose as SitePurpose;
        const diameter = site.diameter;
        const workStatus = site.workStatus;
        const completionDateStr = site.dateOfCompletion;
        const completionDate = completionDateStr ? parseISO(completionDateStr as any) : null;

        const isCompletedInPeriod = completionDate && isValid(completionDate) && isWithinInterval(completionDate, { start: sDate, end: eDate });
        const isCurrentApplication = firstRemittanceDate && isValid(firstRemittanceDate) && isWithinInterval(firstRemittanceDate, { start: sDate, end: eDate });
        const wasActiveBeforePeriod = firstRemittanceDate && isValid(firstRemittanceDate) && firstRemittanceDate < sDate && (!completionDate || !isValid(completionDate) || completionDate >= sDate);
        
        const isRefunded = workStatus ? REFUNDED_STATUSES.includes(workStatus) : false;

        const updateStats = (statsObj: ProgressStats) => {
            if (isCurrentApplication) statsObj.currentApplications++;
            if (wasActiveBeforePeriod) statsObj.previousBalance++;
            if (isCompletedInPeriod) statsObj.completed++;
            if (isRefunded) statsObj.refunded++;
        };
        
        const updateFinancials = (purposeKey: SitePurpose) => {
             if (financialSummaryData[purposeKey]) {
                financialSummaryData[purposeKey].totalApplications++;
                financialSummaryData[purposeKey].totalRemittance += entryTotalRemittance;
                financialSummaryData[purposeKey].totalPayment += entryTotalPayment;
                if(isCompletedInPeriod) {
                    financialSummaryData[purposeKey].totalCompleted++;
                }
            }
        };

        if (purpose === 'BWC' && diameter && BWC_DIAMETERS.includes(diameter)) {
          updateStats(bwcData[appType][diameter]);
          updateStats(bwcData[appType]['Total']);
          updateFinancials(purpose);
        } else if (purpose === 'TWC' && diameter && TWC_DIAMETERS.includes(diameter)) {
          updateStats(twcData[appType][diameter]);
          updateStats(twcData[appType]['Total']);
          updateFinancials(purpose);
        } else if (OTHER_PURPOSES.includes(purpose)) {
          updateStats(otherServicesData[purpose]);
          updateFinancials(purpose);
        }
      });
    });
    
    // Final balance calculation
    const calculateBalance = (stats: ProgressStats) => {
      stats.balance = stats.previousBalance + stats.currentApplications - stats.completed - stats.refunded;
    };
    
    applicationTypeOptions.forEach(appType => {
      [...BWC_DIAMETERS, 'Total'].forEach(d => calculateBalance(bwcData[appType][d]));
      [...TWC_DIAMETERS, 'Total'].forEach(d => calculateBalance(twcData[appType][d]));
    });
    OTHER_PURPOSES.forEach(p => calculateBalance(otherServicesData[p]));
    
    setReportData({ bwcData, twcData, otherServicesData, financialSummaryData });
    setIsFiltering(false);
  }, [fileEntries, startDate, endDate, toast]);
  
  const handleExportExcel = () => {
    // This function will need a complete rewrite to support the new format.
    // Due to complexity, this is being simplified for now. A more robust export
    // would require significant effort.
    toast({ title: "Export Not Implemented", description: "Excel export for this new report format is not yet available." });
  };

  const handleCalendarInteraction = (e: Event) => {
    const target = e.target as HTMLElement;
    if (target.closest('.calendar-custom-controls-container') || target.closest('[data-radix-select-content]')) e.preventDefault();
  };

  const handleResetFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setReportData(null);
  };
  
  if (entriesLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-3">
            <BarChart3 className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Site Progress Reports</h1>
        </div>
      </div>
      <p className="text-muted-foreground">
        Detailed progress reports for BWC/TWC and a summary for other services based on application type and date range.
      </p>

      <Card className="shadow-lg no-print">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">Report Filters</CardTitle>
          <CardDescription>Select a date range to generate the report.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row flex-wrap gap-2 pt-3">
              <Popover>
                  <PopoverTrigger asChild>
                      <Button variant={"outline"} className={cn("w-full sm:w-auto justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />{startDate ? format(startDate, "dd/MM/yyyy") : <span>From Date</span>}
                      </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start" onFocusOutside={handleCalendarInteraction} onPointerDownOutside={handleCalendarInteraction}>
                      <Calendar mode="single" selected={startDate} onSelect={setStartDate} disabled={(date) => (endDate ? date > endDate : false) || date > new Date()} initialFocus />
                  </PopoverContent>
              </Popover>
              <Popover>
                  <PopoverTrigger asChild>
                      <Button variant={"outline"} className={cn("w-full sm:w-auto justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />{endDate ? format(endDate, "dd/MM/yyyy") : <span>To Date</span>}
                      </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start" onFocusOutside={handleCalendarInteraction} onPointerDownOutside={handleCalendarInteraction}>
                      <Calendar mode="single" selected={endDate} onSelect={setEndDate} disabled={(date) => (startDate ? date < startDate : false) || date > new Date()} initialFocus />
                  </PopoverContent>
              </Popover>
              <Button onClick={handleGenerateReport} disabled={isFiltering || !startDate || !endDate}>
                {isFiltering ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Play className="mr-2 h-4 w-4" />}
                Generate Report
              </Button>
              <Button onClick={handleResetFilters} variant="outline" className="w-full sm:w-auto flex-grow sm:flex-grow-0">
                  <XCircle className="mr-2 h-4 w-4" />
                  Clear
              </Button>
              <Button onClick={handleExportExcel} disabled={!reportData || isFiltering} variant="outline" className="w-full sm:w-auto flex-grow sm:flex-grow-0">
                <FileDown className="mr-2 h-4 w-4" />
                Export Excel
              </Button>
        </CardContent>
      </Card>
      
      {isFiltering ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2 text-muted-foreground">Generating reports...</p>
        </div>
      ) : reportData ? (
        <div className="space-y-8">
            <WellTypeProgressTable title="BWC - Progress Report" data={reportData.bwcData} diameters={BWC_DIAMETERS} />
            <WellTypeProgressTable title="TWC - Progress Report" data={reportData.twcData} diameters={TWC_DIAMETERS} />

            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle>Other Services - Progress Summary</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                    <Table className="min-w-full border-collapse">
                    <TableHeader>
                        <TableRow>
                            <TableHead className="border p-2 align-middle text-center font-semibold">Service Type</TableHead>
                            <TableHead className="border p-2 text-center font-semibold">Previous Balance</TableHead>
                            <TableHead className="border p-2 text-center font-semibold">Current Application</TableHead>
                            <TableHead className="border p-2 text-center font-semibold">Completed</TableHead>
                            <TableHead className="border p-2 text-center font-semibold">Refunded</TableHead>
                            <TableHead className="border p-2 text-center font-bold">Balance</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {OTHER_PURPOSES.map(purpose => (
                            <TableRow key={purpose}>
                                <TableCell className="border p-2 font-medium">{purpose}</TableCell>
                                <TableCell className="border p-2 text-center">{reportData.otherServicesData[purpose]?.previousBalance || 0}</TableCell>
                                <TableCell className="border p-2 text-center">{reportData.otherServicesData[purpose]?.currentApplications || 0}</TableCell>
                                <TableCell className="border p-2 text-center">{reportData.otherServicesData[purpose]?.completed || 0}</TableCell>
                                <TableCell className="border p-2 text-center">{reportData.otherServicesData[purpose]?.refunded || 0}</TableCell>
                                <TableCell className="border p-2 text-center font-bold">{reportData.otherServicesData[purpose]?.balance || 0}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle>Financial Summary by Purpose</CardTitle>
                    <CardDescription>
                        A summary of financial and application counts for each purpose within the selected period.
                    </CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                    <Table className="min-w-full border-collapse">
                        <TableHeader>
                            <TableRow>
                                <TableHead className="border p-2 align-middle text-center font-semibold">Type of Purpose</TableHead>
                                <TableHead className="border p-2 text-center font-semibold">Total Application Received</TableHead>
                                <TableHead className="border p-2 text-center font-semibold">Total Remittance (₹)</TableHead>
                                <TableHead className="border p-2 text-center font-semibold">No. of Application Completed</TableHead>
                                <TableHead className="border p-2 text-center font-semibold">Total Payment (₹)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {Object.entries(reportData.financialSummaryData).map(([purpose, data]) => (
                                <TableRow key={purpose}>
                                    <TableCell className="border p-2 font-medium">{purpose}</TableCell>
                                    <TableCell className="border p-2 text-center">{data.totalApplications}</TableCell>
                                    <TableCell className="border p-2 text-right">{data.totalRemittance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                    <TableCell className="border p-2 text-center">{data.totalCompleted}</TableCell>
                                    <TableCell className="border p-2 text-right">{data.totalPayment.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
      ) : (
        <div className="flex items-center justify-center py-10 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">Select a date range and click "Generate Report" to view progress.</p>
        </div>
      )}
    </div>
  );
}
