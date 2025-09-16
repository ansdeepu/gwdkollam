
// src/app/dashboard/progress-report/page.tsx
"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { BarChart3, XCircle, Loader2, Play, FileDown, Landmark } from 'lucide-react';
import { format, startOfDay, endOfDay, isValid, isBefore, isWithinInterval, parseISO, startOfMonth, endOfMonth, isAfter } from 'date-fns';
import { useFileEntries } from '@/hooks/useFileEntries';
import { cn } from "@/lib/utils";
import {
  applicationTypeOptions,
  applicationTypeDisplayMap,
  sitePurposeOptions,
  type ApplicationType,
  type SitePurpose,
  type DataEntryFormData,
  type SiteDetailFormData,
  type SiteWorkStatus,
} from '@/lib/schemas';
import ExcelJS from "exceljs";
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAllFileEntriesForReports } from '@/hooks/useAllFileEntriesForReports'; // Import the new hook
import { usePageHeader } from '@/hooks/usePageHeader';
import { Input } from '@/components/ui/input';

export const dynamic = 'force-dynamic';

// Define the structure for the progress report data
interface SiteDetailWithFileContext extends SiteDetailFormData {
  fileNo: string;
  applicantName: string;
  applicationType: ApplicationType;
}

interface ProgressStats {
  previousBalance: number;
  currentApplications: number;
  toBeRefunded: number;
  totalApplications: number;
  completed: number;
  balance: number;
  previousBalanceData: SiteDetailWithFileContext[];
  currentApplicationsData: SiteDetailWithFileContext[];
  toBeRefundedData: SiteDetailWithFileContext[];
  totalApplicationsData: SiteDetailWithFileContext[];
  completedData: SiteDetailWithFileContext[];
  balanceData: SiteDetailWithFileContext[];
}

type DiameterProgress = Record<string, ProgressStats>;
type ApplicationTypeProgress = Record<ApplicationType, DiameterProgress>;
type OtherServiceProgress = Record<SitePurpose, ProgressStats>;

interface FinancialSummary {
  totalApplications: number;
  totalRemittance: number;
  totalCompleted: number;
  totalPayment: number;
  applicationData: DataEntryFormData[];
  completedData: SiteDetailWithFileContext[];
}
type FinancialSummaryReport = Record<string, FinancialSummary>;


const BWC_DIAMETERS = ['110 mm (4.5”)', '150 mm (6”)'];
const TWC_DIAMETERS = ['150 mm (6”)', '200 mm (8”)'];

const allServicePurposesForSummary: SitePurpose[] = Array.from(sitePurposeOptions);
const financialSummaryOrder: SitePurpose[] = Array.from(sitePurposeOptions);


const PRIVATE_APPLICATION_TYPES: ApplicationType[] = [
  "Private_Domestic", "Private_Irrigation", "Private_Institution", "Private_Industry"
];

const REFUNDED_STATUSES: SiteWorkStatus[] = ['To be Refunded'];
const ACTIVE_FIELD_WORK_STATUSES: SiteWorkStatus[] = ["Work Order Issued", "Work Initiated", "Work in Progress", "Awaiting Dept. Rig"];


interface DetailDialogColumn {
  key: string;
  label: string;
  isNumeric?: boolean;
}

const WellTypeProgressTable = ({ 
  title, 
  data, 
  diameters, 
  onCountClick 
}: { 
  title: string; 
  data: ApplicationTypeProgress, 
  diameters: string[],
  onCountClick: (data: SiteDetailWithFileContext[], title: string) => void;
}) => {
    const metrics: Array<{ key: keyof ProgressStats, label: string }> = [
        { key: 'previousBalance', label: 'Previous Balance' },
        { key: 'currentApplications', label: 'Current Application' },
        { key: 'toBeRefunded', label: 'To be refunded' },
        { key: 'totalApplications', label: 'Total Application' },
        { key: 'completed', label: 'Completed' },
        { key: 'balance', label: 'Balance' }
    ];

    return (
    <>
      {diameters.map(diameter => {
          const diameterTotals: ProgressStats = { previousBalance: 0, currentApplications: 0, toBeRefunded: 0, totalApplications: 0, completed: 0, balance: 0, previousBalanceData: [], currentApplicationsData: [], toBeRefundedData: [], totalApplicationsData: [], completedData: [], balanceData: [] };
          
          applicationTypeOptions.forEach(appType => {
              const stats = data[appType]?.[diameter];
              if (stats) {
                  diameterTotals.previousBalance += stats.previousBalance;
                  diameterTotals.currentApplications += stats.currentApplications;
                  diameterTotals.toBeRefunded += stats.toBeRefunded;
                  diameterTotals.totalApplications += stats.totalApplications;
                  diameterTotals.completed += stats.completed;
                  diameterTotals.balance += stats.balance;
                  
                  diameterTotals.previousBalanceData.push(...stats.previousBalanceData);
                  diameterTotals.currentApplicationsData.push(...stats.currentApplicationsData);
                  diameterTotals.toBeRefundedData.push(...stats.toBeRefundedData);
                  diameterTotals.totalApplicationsData.push(...stats.totalApplicationsData);
                  diameterTotals.completedData.push(...stats.completedData);
                  diameterTotals.balanceData.push(...stats.balanceData);
              }
          });

          return (
          <Card key={diameter} className="shadow-lg">
            <CardHeader>
              <CardTitle>{title} - {diameter}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative overflow-x-auto">
                <Table className="min-w-full border-collapse">
                <TableHeader>
                    <TableRow>
                    <TableHead className="border p-2 align-middle text-left min-w-[200px] font-semibold">Type of Application</TableHead>
                    {metrics.map(metric => (
                        <TableHead key={metric.key} className="border p-2 text-center font-semibold min-w-[100px] whitespace-normal break-words">{metric.label}</TableHead>
                    ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {applicationTypeOptions.map(appType => (
                        <TableRow key={appType}>
                            <TableCell className="border p-2 text-left font-medium">{applicationTypeDisplayMap[appType]}</TableCell>
                            {metrics.map(metric => {
                              const count = data[appType]?.[diameter]?.[metric.key] as number ?? 0;
                              const metricData = data[appType]?.[diameter]?.[`${metric.key}Data` as keyof ProgressStats] as SiteDetailWithFileContext[] ?? [];
                              return (
                                <TableCell key={`${appType}-${metric.key}`} className={cn("border p-2 text-center", (metric.key === 'balance' || metric.key === 'totalApplications') && "font-bold")}>
                                    <Button variant="link" className="p-0 h-auto font-semibold" disabled={count === 0} onClick={() => onCountClick(metricData, `${applicationTypeDisplayMap[appType]} - ${metric.label}`)}>
                                      {count}
                                    </Button>
                                </TableCell>
                              )
                            })}
                        </TableRow>
                    ))}
                </TableBody>
                <TableFooter>
                    <TableRow className="bg-muted/50">
                        <TableCell className="border p-2 text-left font-bold">Total</TableCell>
                        {metrics.map(metric => (
                           <TableCell key={`total-${metric.key}`} className={cn("border p-2 text-center font-bold")}>
                               <Button variant="link" className="p-0 h-auto font-bold" disabled={(diameterTotals[metric.key] as number) === 0} onClick={() => onCountClick(diameterTotals[`${metric.key}Data` as keyof ProgressStats] as SiteDetailWithFileContext[], `Total for ${diameter} - ${metric.label}`)}>
                                    {diameterTotals[metric.key] as number}
                               </Button>
                           </TableCell>
                        ))}
                    </TableRow>
                </TableFooter>
                </Table>
              </div>
            </CardContent>
          </Card>
          )
      })}
    </>
  );
};


export default function ProgressReportPage() {
  const { setHeader } = usePageHeader();
  useEffect(() => {
    setHeader('Progress Reports', 'Generate monthly or periodic progress reports for various schemes and services.');
  }, [setHeader]);

  const { reportEntries: fileEntries, isReportLoading: entriesLoading } = useAllFileEntriesForReports();
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [isFiltering, setIsFiltering] = useState(true);
  const { toast } = useToast();

  const [reportData, setReportData] = useState<{
    bwcData: ApplicationTypeProgress;
    twcData: ApplicationTypeProgress;
    progressSummaryData: OtherServiceProgress;
    privateFinancialSummaryData: FinancialSummaryReport;
    governmentFinancialSummaryData: FinancialSummaryReport;
    totalRevenueHeadCredit: number;
    revenueHeadCreditData: any[];
  } | null>(null);

  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [detailDialogTitle, setDetailDialogTitle] = useState("");
  const [detailDialogData, setDetailDialogData] = useState<Array<SiteDetailWithFileContext | DataEntryFormData | Record<string, any>>>([]);
  const [detailDialogColumns, setDetailDialogColumns] = useState<DetailDialogColumn[]>([]);

  useEffect(() => {
    // Set initial dates on client to avoid hydration mismatch
    setStartDate(startOfMonth(new Date()));
    setEndDate(endOfMonth(new Date()));
  }, []);

  const handleGenerateReport = useCallback(() => {
    if (!startDate || !endDate) {
        toast({ title: "Date Range Required", description: "Please select both a 'From' and 'To' date to generate the report.", variant: "destructive" });
        return;
    }
    setIsFiltering(true);
    setReportData(null); 

    const sDate = startOfDay(startDate);
    const eDate = endOfDay(endDate);

    const safeParseDate = (dateInput: any): Date | null => {
        if (!dateInput) return null;
        if (dateInput instanceof Date && isValid(dateInput)) return dateInput;
        if (dateInput.toDate && typeof dateInput.toDate === 'function') {
            const d = dateInput.toDate();
            return isValid(d) ? d : null;
        }
        if (typeof dateInput === 'string') {
            const d = parseISO(dateInput);
            if (isValid(d)) return d;
        }
        return null;
    };


    const initialStats = (): ProgressStats => ({ previousBalance: 0, currentApplications: 0, toBeRefunded: 0, totalApplications: 0, completed: 0, balance: 0, previousBalanceData: [], currentApplicationsData: [], toBeRefundedData: [], totalApplicationsData: [], completedData: [], balanceData: [] });
    const bwcData: ApplicationTypeProgress = {} as ApplicationTypeProgress;
    const twcData: ApplicationTypeProgress = {} as ApplicationTypeProgress;
    const progressSummaryData: OtherServiceProgress = {} as OtherServiceProgress;
    allServicePurposesForSummary.forEach(p => { progressSummaryData[p] = initialStats(); });
    
    applicationTypeOptions.forEach(appType => {
      bwcData[appType] = {};
      BWC_DIAMETERS.forEach(d => { bwcData[appType][d] = initialStats(); });
      twcData[appType] = {};
      TWC_DIAMETERS.forEach(d => { twcData[appType][d] = initialStats(); });
    });

    const initialFinancialSummary = (): FinancialSummary => ({ totalApplications: 0, totalRemittance: 0, totalCompleted: 0, totalPayment: 0, applicationData: [], completedData: [] });
    const privateFinancialSummary: FinancialSummaryReport = {};
    const governmentFinancialSummary: FinancialSummaryReport = {};
    financialSummaryOrder.forEach(p => {
        privateFinancialSummary[p] = initialFinancialSummary();
        governmentFinancialSummary[p] = initialFinancialSummary();
    });
    
    let totalRevenueHeadCredit = 0;
    const revenueHeadCreditData: any[] = [];

    const uniqueCompletedSites = new Map<string, SiteDetailWithFileContext>();

    fileEntries.forEach(entry => {
        (entry.siteDetails || []).forEach(site => {
            const completionDate = safeParseDate(site.dateOfCompletion);
            if (completionDate && isWithinInterval(completionDate, { start: sDate, end: eDate })) {
                const siteKey = `${entry.fileNo}-${site.nameOfSite}-${site.purpose}`;
                if (!uniqueCompletedSites.has(siteKey)) {
                    uniqueCompletedSites.set(siteKey, { ...site, fileNo: entry.fileNo!, applicantName: entry.applicantName!, applicationType: entry.applicationType! });
                }
            }
        });
    });
    const allCompletedSitesInPeriod = Array.from(uniqueCompletedSites.values());

    fileEntries.forEach(entry => {
      const firstRemittanceDate = safeParseDate(entry.remittanceDetails?.[0]?.dateOfRemittance);
      const isCurrentApplicationInPeriod = firstRemittanceDate && isWithinInterval(firstRemittanceDate, { start: sDate, end: eDate });

      (entry.siteDetails || []).forEach(site => {
        if (!site) return;
        
        const siteWithFileContext: SiteDetailWithFileContext = { ...site, fileNo: entry.fileNo!, applicantName: entry.applicantName!, applicationType: entry.applicationType! };
        const purpose = site.purpose as SitePurpose;
        const diameter = site.diameter;
        const workStatus = site.workStatus as SiteWorkStatus | undefined;
        const completionDate = safeParseDate(site.dateOfCompletion);
        
        const isCompletedInPeriod = completionDate && isWithinInterval(completionDate, { start: sDate, end: eDate });
        const isToBeRefunded = workStatus && REFUNDED_STATUSES.includes(workStatus);
        
        const wasActiveBeforePeriod = firstRemittanceDate && isBefore(firstRemittanceDate, sDate) &&
                                  (!completionDate || isAfter(completionDate, eDate)) &&
                                  !isToBeRefunded && site.workStatus && ACTIVE_FIELD_WORK_STATUSES.includes(site.workStatus as SiteWorkStatus);


        const updateStats = (statsObj: ProgressStats) => {
            if (isCurrentApplicationInPeriod) { 
                statsObj.currentApplications++; 
                statsObj.currentApplicationsData.push(siteWithFileContext); 
            }
            if (wasActiveBeforePeriod) { 
                statsObj.previousBalance++; 
                statsObj.previousBalanceData.push(siteWithFileContext); 
            }
            if (isCompletedInPeriod) { 
                statsObj.completed++; 
                statsObj.completedData.push(siteWithFileContext); 
            }
            if (isToBeRefunded && firstRemittanceDate && isBefore(firstRemittanceDate, eDate)) {
                statsObj.toBeRefunded++; 
                statsObj.toBeRefundedData.push(siteWithFileContext); 
            }
        };
        
        if (entry.applicationType && purpose === 'BWC' && diameter && BWC_DIAMETERS.includes(diameter)) {
          if (!bwcData[entry.applicationType]?.[diameter]) return;
          updateStats(bwcData[entry.applicationType][diameter]);
        } else if (entry.applicationType && purpose === 'TWC' && diameter && TWC_DIAMETERS.includes(diameter)) {
          if (!twcData[entry.applicationType]?.[diameter]) return;
          updateStats(twcData[entry.applicationType][diameter]);
        }
        
        if (allServicePurposesForSummary.includes(purpose)) {
          updateStats(progressSummaryData[purpose]);
        }
      });
        // Financial Summary Update (File-level)
        if (isCurrentApplicationInPeriod) {
            const isPrivate = PRIVATE_APPLICATION_TYPES.includes(entry.applicationType as ApplicationType);
            const targetFinancialSummary = isPrivate ? privateFinancialSummary : governmentFinancialSummary;
            
            const fileEntryForDialog: DataEntryFormData = { ...entry };

            const uniquePurposesInFile = new Set((entry.siteDetails || []).map(site => site.purpose as SitePurpose).filter(p => financialSummaryOrder.includes(p)));
            
            uniquePurposesInFile.forEach(purpose => {
                const summary = targetFinancialSummary[purpose];
                if(summary) {
                    summary.applicationData.push(fileEntryForDialog);
                    const totalRemittanceForFile = Number(entry.remittanceDetails?.[0]?.amountRemitted) || 0;
                    summary.totalRemittance += totalRemittanceForFile;
                }
            });
        }
    });

    // Post-process to fix counts for financial summary
    financialSummaryOrder.forEach(purpose => {
        const pvtSummary = privateFinancialSummary[purpose];
        const govtSummary = governmentFinancialSummary[purpose];
        if (pvtSummary) pvtSummary.totalApplications = new Set(pvtSummary.applicationData.map(e => e.fileNo)).size;
        if (govtSummary) govtSummary.totalApplications = new Set(govtSummary.applicationData.map(e => e.fileNo)).size;
    });

    allCompletedSitesInPeriod.forEach(site => {
      const purpose = site.purpose as SitePurpose;
      if (purpose && financialSummaryOrder.includes(purpose)) {
        const isPrivate = site.applicationType ? PRIVATE_APPLICATION_TYPES.includes(site.applicationType) : false;
        const targetSummary = isPrivate ? privateFinancialSummary : governmentFinancialSummary;
        if (!targetSummary[purpose].completedData.some(s => s.fileNo === site.fileNo && s.nameOfSite === site.nameOfSite)) {
           targetSummary[purpose].completedData.push(site);
           targetSummary[purpose].totalPayment += Number(site.totalExpenditure) || 0;
        }
        targetSummary[purpose].totalCompleted = new Set(targetSummary[purpose].completedData.map(s => s.fileNo)).size;
      }
    });

    fileEntries.forEach(entry => {
        entry.remittanceDetails?.forEach(rd => {
            const remDate = safeParseDate(rd.dateOfRemittance);
            if (rd.remittedAccount === 'RevenueHead' && remDate && isWithinInterval(remDate, { start: sDate, end: eDate })) {
                const amount = Number(rd.amountRemitted) || 0;
                if (amount > 0) {
                    totalRevenueHeadCredit += amount;
                    revenueHeadCreditData.push({
                        fileNo: entry.fileNo,
                        applicantName: entry.applicantName,
                        date: format(remDate, 'dd/MM/yyyy'),
                        amount: amount,
                        source: 'Direct Remittance',
                    });
                }
            }
        });
    
        entry.paymentDetails?.forEach(pd => {
            const paymentDate = safeParseDate(pd.dateOfPayment);
            if (paymentDate && isWithinInterval(paymentDate, { start: sDate, end: eDate })) {
                const amount = Number(pd.revenueHead) || 0;
                if (amount > 0) {
                    totalRevenueHeadCredit += amount;
                    revenueHeadCreditData.push({
                        fileNo: entry.fileNo,
                        applicantName: entry.applicantName,
                        date: format(paymentDate, 'dd/MM/yyyy'),
                        amount: amount,
                        source: 'From Payment',
                    });
                }
            }
        });
    });


    const calculateBalanceAndTotal = (stats: ProgressStats) => {
        stats.totalApplications = stats.previousBalance + stats.currentApplications - stats.toBeRefunded;
        
        const totalApplicationSites = new Map<string, SiteDetailWithFileContext>();
        [...stats.previousBalanceData, ...stats.currentApplicationsData].forEach(site => {
            const key = `${site.fileNo}-${site.nameOfSite}`;
            if (!totalApplicationSites.has(key)) {
                totalApplicationSites.set(key, site);
            }
        });

        const toBeRefundedKeys = new Set(stats.toBeRefundedData.map(site => `${site.fileNo}-${site.nameOfSite}`));
        toBeRefundedKeys.forEach(key => totalApplicationSites.delete(key));

        stats.totalApplicationsData = Array.from(totalApplicationSites.values());
        
        const completedKeys = new Set(stats.completedData.map(site => `${site.fileNo}-${site.nameOfSite}`));
        stats.balanceData = stats.totalApplicationsData.filter(site => !completedKeys.has(`${site.fileNo}-${site.nameOfSite}`));
        stats.balance = stats.balanceData.length;
    };
    
    applicationTypeOptions.forEach(appType => {
      BWC_DIAMETERS.forEach(d => { if(bwcData[appType]?.[d]) calculateBalanceAndTotal(bwcData[appType][d]) });
      TWC_DIAMETERS.forEach(d => { if(twcData[appType]?.[d]) calculateBalanceAndTotal(twcData[appType][d]) });
    });
    allServicePurposesForSummary.forEach(p => calculateBalanceAndTotal(progressSummaryData[p]));
    
    setReportData({ bwcData, twcData, progressSummaryData, privateFinancialSummaryData: privateFinancialSummary, governmentFinancialSummaryData: governmentFinancialSummary, totalRevenueHeadCredit, revenueHeadCreditData });
    setIsFiltering(false);
  }, [fileEntries, startDate, endDate, toast]);
  
  useEffect(() => {
    if (!entriesLoading) {
      if (startDate && endDate) {
        handleGenerateReport();
      } else {
        setIsFiltering(false);
        setReportData(null);
      }
    }
  }, [entriesLoading, startDate, endDate, handleGenerateReport]); 

  const handleResetFilters = () => {
    const today = new Date();
    setStartDate(startOfMonth(today));
    setEndDate(endOfMonth(today));
  };
  
  const handleExportExcel = async () => {
    if (!reportData) {
      toast({ title: "No Report Generated", description: "Please generate a report first.", variant: "destructive" });
      return;
    }
    
    const workbook = new ExcelJS.Workbook();
    
    const addWorksheet = (data: any[], sheetName: string, headers: string[]) => {
      const worksheet = workbook.addWorksheet(sheetName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30));
      worksheet.addRow(headers).font = { bold: true };
      worksheet.addRows(data.map(row => headers.map(header => row[header])));
      worksheet.columns.forEach(column => {
        let maxLength = 0;
        column.eachCell!({ includeEmpty: true }, (cell) => {
            let columnLength = cell.value ? cell.value.toString().length : 10;
            if (columnLength > maxLength) {
                maxLength = columnLength;
            }
        });
        column.width = maxLength < 15 ? 15 : maxLength + 2;
      });
    };

    // 1. Progress Summary
    const progressSummaryHeaders = ['Service Type', 'Previous Balance', 'Current Application', 'To be Refunded', 'Total Application', 'Completed', 'Balance'];
    const progressSummaryExport = Object.entries(reportData.progressSummaryData).map(([purpose, stats]) => ({
      'Service Type': purpose,
      'Previous Balance': stats.previousBalance,
      'Current Application': stats.currentApplications,
      'To be Refunded': stats.toBeRefunded,
      'Total Application': stats.totalApplications,
      'Completed': stats.completed,
      'Balance': stats.balance,
    }));
    addWorksheet(progressSummaryExport, 'Progress Summary', progressSummaryHeaders);
  
    // 2. Financial Summary - Private
    const financialHeaders = ['Purpose', 'Applications Received', 'Total Remittance (₹)', 'Applications Completed', 'Total Payment (₹)'];
    const privateFinancialExport = Object.entries(reportData.privateFinancialSummaryData).filter(([,summary]) => summary.totalApplications > 0 || summary.totalCompleted > 0).map(([purpose, summary]) => ({
      'Purpose': purpose,
      'Applications Received': summary.totalApplications,
      'Total Remittance (₹)': summary.totalRemittance,
      'Applications Completed': summary.totalCompleted,
      'Total Payment (₹)': summary.totalPayment,
    }));
    addWorksheet(privateFinancialExport, 'Financial Summary (Private)', financialHeaders);
  
    // 3. Financial Summary - Government
    const govFinancialExport = Object.entries(reportData.governmentFinancialSummaryData).filter(([,summary]) => summary.totalApplications > 0 || summary.totalCompleted > 0).map(([purpose, summary]) => ({
      'Purpose': purpose,
      'Applications Received': summary.totalApplications,
      'Total Remittance (₹)': summary.totalRemittance,
      'Applications Completed': summary.totalCompleted,
      'Total Payment (₹)': summary.totalPayment,
    }));
    addWorksheet(govFinancialExport, 'Financial Summary (Govt)', financialHeaders);
    
    // 4 & 5. Well Type Progress (BWC & TWC)
    const wellMetricsHeaders = ['Type of Application', 'Previous Balance', 'Current Application', 'To be Refunded', 'Total Application', 'Completed', 'Balance'];
    
    [...BWC_DIAMETERS, ...TWC_DIAMETERS].forEach(diameter => {
      const isBwc = BWC_DIAMETERS.includes(diameter);
      const dataToProcess = isBwc ? reportData.bwcData : reportData.twcData;
      const wellDataExport: any[] = [];
      let hasData = false;

      applicationTypeOptions.forEach(appType => {
        const stats = dataToProcess[appType]?.[diameter];
        if (stats) {
          const row: Record<string, any> = {'Type of Application': applicationTypeDisplayMap[appType]};
          let rowHasData = false;
          wellMetricsHeaders.slice(1).forEach(metric => {
            const key = metric.toLowerCase().replace(/ /g, '').replace('tobe', 'toBe');
            const value = stats[key as keyof ProgressStats] as number;
            row[metric] = value;
            if (value > 0) rowHasData = true;
          });
          if(rowHasData) {
            wellDataExport.push(row);
            hasData = true;
          }
        }
      });
      if(hasData) {
        addWorksheet(wellDataExport, `${isBwc ? 'BWC' : 'TWC'} - ${diameter.replace(/[^a-zA-Z0-9]/g, '_')}`, wellMetricsHeaders);
      }
    });
  
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GWD_Progress_Report_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    toast({ title: "Export Successful", description: `Report downloaded.` });
  };

  const handleCountClick = (data: Array<SiteDetailWithFileContext | DataEntryFormData | Record<string, any>>, title: string) => {
    if (!data || data.length === 0) return;
    setDetailDialogTitle(title);

    let columns: DetailDialogColumn[];
    let dialogData: Array<Record<string, any>>;

    if (title.startsWith("Revenue Head")) {
        columns = [ { key: 'slNo', label: 'Sl. No.' }, { key: 'fileNo', label: 'File No.' }, { key: 'applicantName', label: 'Applicant' }, { key: 'date', label: 'Date' }, { key: 'source', label: 'Source' }, { key: 'amount', label: 'Amount (₹)', isNumeric: true }, ];
        dialogData = (data as Array<{ fileNo: string; applicantName: string; date: string; amount: number; source: string }>).map((item, index) => ({
            slNo: index + 1,
            fileNo: item.fileNo,
            applicantName: item.applicantName,
            date: item.date,
            source: item.source,
            amount: (Number(item.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        }));
    } else if (title.toLowerCase().includes("remittance")) {
        columns = [ { key: 'slNo', label: 'Sl. No.' }, { key: 'fileNo', label: 'File No.' }, { key: 'applicantName', label: 'Applicant' }, { key: 'remittedAmount', label: 'Remitted (₹)', isNumeric: true }, { key: 'remittanceDate', label: 'First Remittance Date' }];
        
        dialogData = (data as DataEntryFormData[]).map((entry, index) => ({
            slNo: index + 1,
            fileNo: entry.fileNo,
            applicantName: entry.applicantName,
            remittedAmount: (Number(entry.remittanceDetails?.[0]?.amountRemitted) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            remittanceDate: entry.remittanceDetails?.[0]?.dateOfRemittance ? format(new Date(entry.remittanceDetails[0].dateOfRemittance), 'dd/MM/yyyy') : 'N/A',
        }));
    } else if (title.toLowerCase().includes('payment for completed')) {
        columns = [ { key: 'slNo', label: 'Sl. No.' }, { key: 'fileNo', label: 'File No.' }, { key: 'applicantName', label: 'Applicant' }, { key: 'nameOfSite', label: 'Site Name' }, { key: 'purpose', label: 'Purpose' }, { key: 'totalExpenditure', label: 'Payment (₹)', isNumeric: true } ];
        dialogData = (data as SiteDetailWithFileContext[])
            .filter(site => site.totalExpenditure && site.totalExpenditure > 0)
            .map((site, index) => ({
                slNo: index + 1, ...site,
                totalExpenditure: (Number(site.totalExpenditure) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            }));
    } else { // Generic fallback for other cases like "Total Application", "Balance", etc.
         columns = [ { key: 'slNo', label: 'Sl. No.' }, { key: 'fileNo', label: 'File No.' }, { key: 'applicantName', label: 'Applicant' }, { key: 'nameOfSite', label: 'Site Name' }, { key: 'purpose', label: 'Purpose' }, { key: 'workStatus', label: 'Work Status' }, ];
         dialogData = (data as SiteDetailWithFileContext[]).map((site, index) => ({
            slNo: index + 1,
            fileNo: site.fileNo,
            applicantName: site.applicantName,
            nameOfSite: site.nameOfSite,
            purpose: site.purpose,
            workStatus: site.workStatus,
        }));
    }
    
    setDetailDialogColumns(columns);
    setDetailDialogData(dialogData);
    setIsDetailDialogOpen(true);
  };

  const FinancialSummaryTable = ({ title, summaryData }: { title: string; summaryData: FinancialSummaryReport }) => {
    if (!reportData) return null;

    const purposesToShow = financialSummaryOrder.filter(p => summaryData[p]?.applicationData.length > 0 || summaryData[p]?.completedData.length > 0);

    const total: FinancialSummary = { totalApplications: 0, totalRemittance: 0, totalCompleted: 0, totalPayment: 0, applicationData: [], completedData: [] };
    purposesToShow.forEach(p => {
        const data = summaryData[p];
        if(data) {
            total.totalApplications += data.totalApplications;
            total.totalRemittance += data.totalRemittance;
            total.totalCompleted += data.totalCompleted;
            total.totalPayment += data.totalPayment;
            total.applicationData.push(...data.applicationData);
            total.completedData.push(...data.completedData);
        }
    });

    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            A summary of financial and application counts for each purpose within the selected period.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative overflow-x-auto">
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
                {purposesToShow.map(purpose => {
                  const data = summaryData[purpose];
                  if (!data) return null;
                  return (
                    <TableRow key={purpose}>
                      <TableCell className="border p-2 font-medium">{purpose}</TableCell>
                      <TableCell className="border p-2 text-center">
                        <Button variant="link" className="p-0 h-auto" disabled={data.totalApplications === 0} onClick={() => handleCountClick(data.applicationData, `Remittance Details for ${purpose} Applications`)}>
                          {data.totalApplications}
                        </Button>
                      </TableCell>
                      <TableCell className="border p-2 text-right">
                         <Button variant="link" className="p-0 h-auto text-right" disabled={data.totalRemittance === 0} onClick={() => handleCountClick(data.applicationData, `Remittance Details for ${purpose}`)}>
                          {data.totalRemittance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Button>
                      </TableCell>
                      <TableCell className="border p-2 text-center">
                        <Button variant="link" className="p-0 h-auto" disabled={data.totalCompleted === 0} onClick={() => handleCountClick(data.completedData, `Application Completed - ${purpose}`)}>
                          {data.totalCompleted}
                        </Button>
                      </TableCell>
                      <TableCell className="border p-2 text-right">
                        <Button variant="link" className="p-0 h-auto text-right" disabled={data.totalPayment === 0} onClick={() => handleCountClick(data.completedData, `Payment for Completed - ${purpose}`)}>
                            {data.totalPayment.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
               <TableFooter>
                  <TableRow className="bg-muted/50 font-bold">
                      <TableCell className="border p-2">Total</TableCell>
                      <TableCell className="border p-2 text-center">
                          <Button variant="link" className="p-0 h-auto font-bold" disabled={total.totalApplications === 0} onClick={() => handleCountClick(total.applicationData, `Site Details for All ${title}`)}>
                              {total.totalApplications}
                          </Button>
                      </TableCell>
                      <TableCell className="border p-2 text-right">
                          <Button variant="link" className="p-0 h-auto font-bold text-right" disabled={total.totalRemittance === 0} onClick={() => handleCountClick(total.applicationData, `Remittance Details for All ${title}`)}>
                              {total.totalRemittance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </Button>
                      </TableCell>
                      <TableCell className="border p-2 text-center">
                          <Button variant="link" className="p-0 h-auto font-bold" disabled={total.totalCompleted === 0} onClick={() => handleCountClick(total.completedData, `Total Completed Applications for ${title}`)}>
                              {total.totalCompleted}
                          </Button>
                      </TableCell>
                      <TableCell className="border p-2 text-right">
                          <Button variant="link" className="p-0 h-auto font-bold text-right" disabled={total.totalPayment === 0} onClick={() => handleCountClick(total.completedData, `Total Payment for ${title}`)}>
                             {total.totalPayment.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </Button>
                      </TableCell>
                  </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>
    );
  };
  
  if (entriesLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col space-y-6">
      <Card className="shadow-lg bg-background no-print">
          <CardHeader>
            <div className="flex flex-col sm:flex-row flex-wrap gap-2 pt-4">
                <Input type="date" placeholder="From Date" className="w-full sm:w-auto" value={startDate ? format(startDate, 'yyyy-MM-dd') : ''} onChange={(e) => setStartDate(e.target.value ? new Date(e.target.value) : undefined)} />
                <Input type="date" placeholder="To Date" className="w-full sm:w-auto" value={endDate ? format(endDate, 'yyyy-MM-dd') : ''} onChange={(e) => setEndDate(e.target.value ? new Date(e.target.value) : undefined)} />

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
            </div>
          </CardHeader>
      </Card>
      
      <ScrollArea className="flex-1">
        <div className="space-y-8 pr-4">
            {isFiltering ? (
                <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="ml-2 text-muted-foreground">Generating reports...</p>
                </div>
            ) : reportData ? (
            <>
                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle>Progress Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="relative overflow-x-auto">
                            <Table className="min-w-full border-collapse">
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="border p-2 align-middle text-center font-semibold">Service Type</TableHead>
                                    <TableHead className="border p-2 text-center font-semibold">Previous Balance</TableHead>
                                    <TableHead className="border p-2 text-center font-semibold">Current Application</TableHead>
                                    <TableHead className="border p-2 text-center font-semibold">To be refunded</TableHead>
                                    <TableHead className="border p-2 text-center font-bold">Total Application</TableHead>
                                    <TableHead className="border p-2 text-center font-semibold">Completed</TableHead>
                                    <TableHead className="border p-2 text-center font-bold">Balance</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {allServicePurposesForSummary.map(purpose => {
                                const stats = reportData.progressSummaryData[purpose];
                                return (
                                    <TableRow key={purpose}>
                                        <TableCell className="border p-2 font-medium">{purpose}</TableCell>
                                        <TableCell className="border p-2 text-center"><Button variant="link" className="p-0 h-auto" disabled={stats?.previousBalance === 0} onClick={() => handleCountClick(stats.previousBalanceData, `${purpose} - Previous Balance`)}>{stats?.previousBalance || 0}</Button></TableCell>
                                        <TableCell className="border p-2 text-center"><Button variant="link" className="p-0 h-auto" disabled={stats?.currentApplications === 0} onClick={() => handleCountClick(stats.currentApplicationsData, `${purpose} - Current Applications`)}>{stats?.currentApplications || 0}</Button></TableCell>
                                        <TableCell className="border p-2 text-center"><Button variant="link" className="p-0 h-auto" disabled={stats?.toBeRefunded === 0} onClick={() => handleCountClick(stats.toBeRefundedData, `${purpose} - To be Refunded`)}>{stats?.toBeRefunded || 0}</Button></TableCell>
                                        <TableCell className="border p-2 text-center font-bold"><Button variant="link" className="p-0 h-auto font-bold" disabled={stats?.totalApplications === 0} onClick={() => handleCountClick(stats.totalApplicationsData, `Site Details for ${purpose} Applications`)}>{stats?.totalApplications || 0}</Button></TableCell>
                                        <TableCell className="border p-2 text-center"><Button variant="link" className="p-0 h-auto" disabled={stats?.completed === 0} onClick={() => handleCountClick(stats.completedData, `${purpose} - Completed`)}>{stats?.completed || 0}</Button></TableCell>
                                        <TableCell className="border p-2 text-center font-bold"><Button variant="link" className="p-0 h-auto font-bold" disabled={stats?.balance === 0} onClick={() => handleCountClick(stats.balanceData, `${purpose} - Balance`)}>{stats?.balance || 0}</Button></TableCell>
                                    </TableRow>
                                )})}
                            </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
                <div className="space-y-8">
                    <FinancialSummaryTable title="Financial Summary - Private Applications" summaryData={reportData.privateFinancialSummaryData} />
                    <FinancialSummaryTable title="Financial Summary - Government &amp; Other Applications" summaryData={reportData.governmentFinancialSummaryData} />
                    
                    <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                        <Landmark className="h-5 w-5 text-primary" />
                        Revenue Head Summary
                        </CardTitle>
                        <CardDescription>
                        Total amount credited to the Revenue Head within the selected period.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <button
                        className="flex w-full flex-col items-center justify-center rounded-lg bg-secondary/30 p-6 text-center transition-colors hover:bg-secondary/50 disabled:cursor-not-allowed disabled:opacity-70"
                        onClick={() => handleCountClick(reportData.revenueHeadCreditData, `Revenue Head Credit Details`)}
                        disabled={reportData.totalRevenueHeadCredit === 0}
                        >
                        <span className="text-sm font-medium text-muted-foreground">Total Credited Amount</span>
                        <span className="text-3xl font-bold text-primary">
                            ₹{reportData.totalRevenueHeadCredit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        </button>
                    </CardContent>
                    </Card>

                    <WellTypeProgressTable title="BWC" data={reportData.bwcData} diameters={['110 mm (4.5”)']} onCountClick={handleCountClick} />
                    <WellTypeProgressTable title="BWC" data={reportData.bwcData} diameters={['150 mm (6”)']} onCountClick={handleCountClick} />
                    <WellTypeProgressTable title="TWC" data={reportData.twcData} diameters={['150 mm (6”)']} onCountClick={handleCountClick} />
                    <WellTypeProgressTable title="TWC" data={reportData.twcData} diameters={['200 mm (8”)']} onCountClick={handleCountClick} />
                </div>
            </>
            ) : (
                <div className="flex items-center justify-center py-10 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground">Select a date range and click "Generate Report" to view progress.</p>
                </div>
            )}
        </div>
      </ScrollArea>

      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-4xl flex flex-col h-[90vh]">
          <DialogHeader className="p-6 pb-4 border-b">
            <DialogTitle>{detailDialogTitle}</DialogTitle>
            <DialogDescription>
              Displaying {detailDialogData.length} records.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 px-6 py-4">
            <ScrollArea className="h-full pr-4">
              {detailDialogData.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      {detailDialogColumns.map(col => <TableHead key={col.key} className={cn(col.isNumeric && 'text-right')}>{col.label}</TableHead>)}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailDialogData.map((row, index) => (
                      <TableRow key={index}>
                        {detailDialogColumns.map(col => (
                          <TableCell key={col.key} className={cn('text-xs', col.isNumeric && 'text-right font-mono')}>
                             {(row as any)[col.key] !== undefined && (row as any)[col.key] !== null ? String((row as any)[col.key]) : 'N/A'}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="py-4 text-center text-muted-foreground">No details found for this selection.</p>
              )}
            </ScrollArea>
          </div>
          <DialogFooter className="p-6 pt-4 border-t">
            <Button variant="outline" disabled={detailDialogData.length === 0}>
              <FileDown className="mr-2 h-4 w-4" /> Export to Excel
            </Button>
            <DialogClose asChild>
              <Button type="button" variant="secondary">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

  