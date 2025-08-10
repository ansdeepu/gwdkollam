
// src/app/dashboard/progress-report/page.tsx
"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { BarChart3, CalendarIcon, XCircle, Loader2, Play, FileDown } from 'lucide-react';
import { format, startOfDay, endOfDay, isValid, isBefore, isWithinInterval, parseISO, startOfMonth, endOfMonth, isAfter } from 'date-fns';
import { useFileEntries } from '@/hooks/useFileEntries';
import { cn } from "@/lib/utils";
import {
  applicationTypeOptions,
  applicationTypeDisplayMap,
  type ApplicationType,
  type SitePurpose,
  type DataEntryFormData,
  type SiteDetailFormData,
} from '@/lib/schemas';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from "@/components/ui/scroll-area";

// Define the structure for the progress report data
interface ProgressStats {
  previousBalance: number;
  currentApplications: number;
  totalApplications: number;
  completed: number;
  refunded: number;
  balance: number;
  // Add data arrays to hold the actual entries
  previousBalanceData: SiteDetailFormData[];
  currentApplicationsData: SiteDetailFormData[];
  totalApplicationsData: SiteDetailFormData[];
  completedData: SiteDetailFormData[];
  refundedData: SiteDetailFormData[];
  balanceData: SiteDetailFormData[];
}

type DiameterProgress = Record<string, ProgressStats>;
type ApplicationTypeProgress = Record<ApplicationType, DiameterProgress>;
type OtherServiceProgress = Record<SitePurpose, ProgressStats>;

interface FinancialSummary {
  totalApplications: number;
  totalRemittance: number;
  totalCompleted: number;
  totalPayment: number;
  // Data arrays
  applicationData: DataEntryFormData[];
  completedData: DataEntryFormData[];
}
type FinancialSummaryReport = Record<string, FinancialSummary>;

interface RevenueHeadDetail {
    slNo: number;
    applicantName: string;
    siteNames: string;
    fileStatus: string;
    paymentAmount: number;
}


const BWC_DIAMETERS = ['110 mm (4.5”)', '150 mm (6”)'];
const TWC_DIAMETERS = ['150 mm (6”)', '200 mm (8”)'];

const allServicePurposesForSummary: SitePurpose[] = ["BWC", "TWC", "FPW", "BW Dev", "TW Dev", "FPW Dev", "MWSS", "MWSS Ext", "PumpingScheme", "MWSS Pump Reno", "HPS", "HPR", "ARS"];
const financialSummaryOrder: string[] = ["BWC", "TWC", "FPW", "BW Dev", "TW Dev", "FPW Dev", "MWSS", "MWSS Ext", "PumpingScheme", "MWSS Pump Reno", "HPS", "HPR", "ARS"];


const PRIVATE_APPLICATION_TYPES: ApplicationType[] = [
  "Private_Domestic", "Private_Irrigation", "Private_Institution", "Private_Industry"
];

const REFUNDED_STATUSES = ['To be Refunded'];

interface DetailDialogColumn {
  key: string;
  label: string;
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
  onCountClick: (data: SiteDetailFormData[], title: string) => void;
}) => {
    const metrics: Array<{ key: keyof ProgressStats, label: string }> = [
        { key: 'previousBalance', label: 'Previous Balance' },
        { key: 'currentApplications', label: 'Current Application' },
        { key: 'totalApplications', label: 'Total Application' },
        { key: 'completed', label: 'Completed' },
        { key: 'refunded', label: 'Refund' },
        { key: 'balance', label: 'Balance' }
    ];

    return (
    <Card className="shadow-lg">
      <CardContent className="overflow-x-auto space-y-6 pt-6">
        {diameters.map(diameter => {
            const diameterTotals: ProgressStats = { previousBalance: 0, currentApplications: 0, totalApplications: 0, completed: 0, refunded: 0, balance: 0, previousBalanceData: [], currentApplicationsData: [], totalApplicationsData: [], completedData: [], refundedData: [], balanceData: [] };
            
            applicationTypeOptions.forEach(appType => {
                const stats = data[appType]?.[diameter];
                if (stats) {
                    diameterTotals.previousBalance += stats.previousBalance;
                    diameterTotals.currentApplications += stats.currentApplications;
                    diameterTotals.totalApplications += stats.totalApplications;
                    diameterTotals.completed += stats.completed;
                    diameterTotals.refunded += stats.refunded;
                    diameterTotals.balance += stats.balance;
                    
                    diameterTotals.previousBalanceData.push(...stats.previousBalanceData);
                    diameterTotals.currentApplicationsData.push(...stats.currentApplicationsData);
                    diameterTotals.totalApplicationsData.push(...stats.totalApplicationsData);
                    diameterTotals.completedData.push(...stats.completedData);
                    diameterTotals.refundedData.push(...stats.refundedData);
                    diameterTotals.balanceData.push(...stats.balanceData);
                }
            });

            return (
            <div key={diameter}>
                <h4 className="font-semibold text-lg mb-2 text-primary">{title} - {diameter}</h4>
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
                              const metricData = data[appType]?.[diameter]?.[`${metric.key}Data` as keyof ProgressStats] as SiteDetailFormData[] ?? [];
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
                               <Button variant="link" className="p-0 h-auto font-bold" disabled={diameterTotals[metric.key] === 0} onClick={() => onCountClick(diameterTotals[`${metric.key}Data` as keyof ProgressStats] as SiteDetailFormData[], `Total for ${diameter} - ${metric.label}`)}>
                                    {diameterTotals[metric.key]}
                               </Button>
                           </TableCell>
                        ))}
                    </TableRow>
                </TableFooter>
                </Table>
            </div>
            )
        })}
      </CardContent>
    </Card>
  );
};


export default function ProgressReportPage() {
  const { fileEntries, isLoading: entriesLoading } = useFileEntries();
  const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | undefined>(endOfMonth(new Date()));
  const [isFiltering, setIsFiltering] = useState(true);
  const { toast } = useToast();

  const [reportData, setReportData] = useState<{
    bwcData: ApplicationTypeProgress;
    twcData: ApplicationTypeProgress;
    otherServicesData: OtherServiceProgress;
    privateFinancialSummaryData: FinancialSummaryReport;
    governmentFinancialSummaryData: FinancialSummaryReport;
    revenueHeadTotal: number;
    revenueHeadDetails: RevenueHeadDetail[];
  } | null>(null);

  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [detailDialogTitle, setDetailDialogTitle] = useState("");
  const [detailDialogData, setDetailDialogData] = useState<Array<SiteDetailFormData | DataEntryFormData | Record<string, any>>>([]);
  const [detailDialogColumns, setDetailDialogColumns] = useState<DetailDialogColumn[]>([]);

  const handleGenerateReport = useCallback(() => {
    if (!startDate || !endDate) {
        toast({ title: "Date Range Required", description: "Please select both a 'From' and 'To' date to generate the report.", variant: "destructive" });
        return;
    }
    setIsFiltering(true);
    setReportData(null); 

    const sDate = startOfDay(startDate);
    const eDate = endOfDay(endDate);

    const initialStats = (): ProgressStats => ({ previousBalance: 0, currentApplications: 0, totalApplications: 0, completed: 0, refunded: 0, balance: 0, previousBalanceData: [], currentApplicationsData: [], totalApplicationsData: [], completedData: [], refundedData: [], balanceData: [] });
    const bwcData: ApplicationTypeProgress = {} as ApplicationTypeProgress;
    const twcData: ApplicationTypeProgress = {} as ApplicationTypeProgress;
    const otherServicesData: OtherServiceProgress = {} as OtherServiceProgress;
    allServicePurposesForSummary.forEach(p => { otherServicesData[p] = initialStats(); });
    
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

    let totalRevenueHeadAmount = 0;
    const revenueHeadDetails: RevenueHeadDetail[] = [];

    fileEntries.forEach(entry => {
      if (!entry.applicationType) return; 

      const isPrivate = PRIVATE_APPLICATION_TYPES.includes(entry.applicationType);
      const targetFinancialSummary = isPrivate ? privateFinancialSummary : governmentFinancialSummary;
      
      const firstRemittanceDateValue = entry.remittanceDetails?.[0]?.dateOfRemittance;
      const firstRemittanceDate = firstRemittanceDateValue ? new Date(firstRemittanceDateValue) : null;
      
      const isCurrentApplicationForFinancials = firstRemittanceDate && isValid(firstRemittanceDate) && isWithinInterval(firstRemittanceDate, { start: sDate, end: eDate });

      // Calculate Remittance and Payment within the date range
      const remittanceInRange = entry.remittanceDetails?.reduce((sum, rd) => {
        const remDate = rd.dateOfRemittance ? new Date(rd.dateOfRemittance) : null;
        if (remDate && isValid(remDate) && isWithinInterval(remDate, { start: sDate, end: eDate })) {
            return sum + (Number(rd.amountRemitted) || 0);
        }
        return sum;
      }, 0) || 0;

      const paymentInRange = entry.paymentDetails?.reduce((sum, pd) => {
        const payDate = pd.dateOfPayment ? new Date(pd.dateOfPayment) : null;
        if (payDate && isValid(payDate) && isWithinInterval(payDate, { start: sDate, end: eDate })) {
            const total = (Number(pd.contractorsPayment) || 0) + (Number(pd.gst) || 0) + (Number(pd.incomeTax) || 0) + (Number(pd.kbcwb) || 0) + (Number(pd.refundToParty) || 0);
            return sum + total;
        }
        return sum;
      }, 0) || 0;
      
      // Count as "Total Application Received" ONLY if the first remittance is within the date range.
      if (isCurrentApplicationForFinancials) {
        const uniquePurposes = new Set(entry.siteDetails?.map(s => s?.purpose).filter(Boolean) as SitePurpose[]);
        uniquePurposes.forEach(purpose => {
            const purposeKey = financialSummaryOrder.includes(purpose) ? purpose : 'Other_Schemes';
            if (targetFinancialSummary[purposeKey]) {
                targetFinancialSummary[purposeKey].totalApplications++;
                targetFinancialSummary[purposeKey].applicationData.push(entry);
                targetFinancialSummary[purposeKey].totalRemittance += remittanceInRange;
            }
        });
      }

      // Count as "Completed" ONLY if a site completion date is within the date range.
      if (entry.siteDetails?.some(site => site && site.dateOfCompletion && isWithinInterval(new Date(site.dateOfCompletion), { start: sDate, end: eDate }))) {
        const uniquePurposes = new Set(entry.siteDetails?.map(s => s?.purpose).filter(Boolean) as SitePurpose[]);
        uniquePurposes.forEach(purpose => {
            const purposeKey = financialSummaryOrder.includes(purpose) ? purpose : 'Other_Schemes';
            if (targetFinancialSummary[purposeKey]) {
                targetFinancialSummary[purposeKey].totalCompleted++;
                targetFinancialSummary[purposeKey].completedData.push(entry);
                targetFinancialSummary[purposeKey].totalPayment += paymentInRange;
            }
        });
      }

      // Revenue Head Calculation
      entry.paymentDetails?.forEach(pd => {
          const paymentDate = pd.dateOfPayment ? new Date(pd.dateOfPayment) : null;
          if (paymentDate && isWithinInterval(paymentDate, { start: sDate, end: eDate })) {
              const revenueAmount = Number(pd.revenueHead) || 0;
              if (revenueAmount > 0) {
                  totalRevenueHeadAmount += revenueAmount;
                  revenueHeadDetails.push({
                      slNo: revenueHeadDetails.length + 1,
                      applicantName: entry.applicantName || 'N/A',
                      siteNames: entry.siteDetails?.map(s => s.nameOfSite).join(', ') || 'N/A',
                      fileStatus: entry.fileStatus || 'N/A',
                      paymentAmount: revenueAmount
                  });
              }
          }
      });

      (entry.siteDetails || []).forEach(site => {
        if (!site || site.additionalAS === 'No') return;
        
        const siteWithFileContext: SiteDetailFormData = { ...site, fileNo: entry.fileNo, applicantName: entry.applicantName };
        const purpose = site.purpose as SitePurpose;
        const diameter = site.diameter;
        const workStatus = site.workStatus;

        const completionDateValue = site.dateOfCompletion;
        const completionDate = completionDateValue ? new Date(completionDateValue) : null;
        const isCompletedInPeriod = completionDate && isValid(completionDate) && isWithinInterval(completionDate, { start: sDate, end: eDate });
        const isCurrentApplication = firstRemittanceDate && isValid(firstRemittanceDate) && isWithinInterval(firstRemittanceDate, { start: sDate, end: eDate });
        
        const wasActiveBeforePeriod = firstRemittanceDate && isBefore(firstRemittanceDate, sDate) && 
                                     (!completionDate || !isValid(completionDate) || isAfter(completionDate, sDate));

        const isRefunded = workStatus ? REFUNDED_STATUSES.includes(workStatus) : false;

        const updateStats = (statsObj: ProgressStats) => {
            if (isCurrentApplication) { statsObj.currentApplications++; statsObj.currentApplicationsData.push(siteWithFileContext); }
            if (wasActiveBeforePeriod) { statsObj.previousBalance++; statsObj.previousBalanceData.push(siteWithFileContext); }
            if (isCompletedInPeriod) { statsObj.completed++; statsObj.completedData.push(siteWithFileContext); }
            if (isRefunded) { statsObj.refunded++; statsObj.refundedData.push(siteWithFileContext); }
        };
        
        if (entry.applicationType && purpose === 'BWC' && diameter && BWC_DIAMETERS.includes(diameter)) {
          if (!bwcData[entry.applicationType]?.[diameter]) return;
          updateStats(bwcData[entry.applicationType][diameter]);
        } else if (entry.applicationType && purpose === 'TWC' && diameter && TWC_DIAMETERS.includes(diameter)) {
          if (!twcData[entry.applicationType]?.[diameter]) return;
          updateStats(twcData[entry.applicationType][diameter]);
        } else if (allServicePurposesForSummary.includes(purpose)) {
          updateStats(otherServicesData[purpose]);
        }
      });
    });
    
    const calculateBalanceAndTotal = (stats: ProgressStats) => {
      stats.totalApplications = stats.previousBalance + stats.currentApplications;
      stats.totalApplicationsData = [ ...stats.previousBalanceData, ...stats.currentApplicationsData ];
      stats.balance = stats.totalApplications - stats.completed - stats.refunded;
      stats.balanceData = stats.totalApplicationsData.filter(
          item => !stats.completedData.some(cd => cd.nameOfSite === item.nameOfSite && cd.fileNo === item.fileNo) && !stats.refundedData.some(rd => rd.nameOfSite === item.nameOfSite && rd.fileNo === item.fileNo)
      );
    };
    
    applicationTypeOptions.forEach(appType => {
      BWC_DIAMETERS.forEach(d => { if(bwcData[appType]?.[d]) calculateBalanceAndTotal(bwcData[appType][d]) });
      TWC_DIAMETERS.forEach(d => { if(twcData[appType]?.[d]) calculateBalanceAndTotal(twcData[appType][d]) });
    });
    allServicePurposesForSummary.forEach(p => calculateBalanceAndTotal(otherServicesData[p]));
    
    setReportData({ bwcData, twcData, otherServicesData, privateFinancialSummaryData: privateFinancialSummary, governmentFinancialSummaryData: governmentFinancialSummary, revenueHeadTotal: totalRevenueHeadAmount, revenueHeadDetails: revenueHeadDetails });
    setIsFiltering(false);
  }, [fileEntries, startDate, endDate, toast]);
  
  useEffect(() => {
    if (!entriesLoading) {
      handleGenerateReport();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entriesLoading]);

  const handleExportExcel = () => {
    toast({ title: "Export Not Implemented", description: "Excel export for this complex report format is not yet available." });
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

 const handleCountClick = (data: Array<SiteDetailFormData | DataEntryFormData>, title: string) => {
    if (!data || data.length === 0) return;
    setDetailDialogTitle(title);
    
    const isSiteData = data.length > 0 && 'nameOfSite' in data[0] && !('fileStatus' in data[0]);

    let columns: DetailDialogColumn[];
    let dialogData: Array<Record<string, any>>;

    if (isSiteData) {
        columns = [
            { key: 'fileNo', label: 'File No.' },
            { key: 'applicantName', label: 'Applicant Name' },
            { key: 'nameOfSite', label: 'Site Name' },
            { key: 'purpose', label: 'Purpose' },
            { key: 'workStatus', label: 'Work Status' },
            { key: 'dateOfCompletion', label: 'Completion Date' },
        ];
        dialogData = (data as SiteDetailFormData[]).map(site => ({
          ...site,
          dateOfCompletion: site.dateOfCompletion ? format(new Date(site.dateOfCompletion), 'dd/MM/yyyy') : 'N/A',
        }));
    } else {
        const sDate = startDate ? startOfDay(startDate) : null;
        const eDate = endDate ? endOfDay(endDate) : null;

        if (title.toLowerCase().includes('total application')) {
            columns = [
                { key: 'fileNo', label: 'File No.' },
                { key: 'applicantName', label: 'Applicant Name' },
                { key: 'siteNames', label: 'Site Name(s)' },
                { key: 'fileStatus', label: 'File Status' },
                { key: 'remittanceInRange', label: 'Remittance in Range (₹)' },
            ];
            dialogData = (data as DataEntryFormData[]).map(entry => {
                const remittanceInRange = entry.remittanceDetails?.reduce((sum, rd) => {
                    const remDate = rd.dateOfRemittance ? new Date(rd.dateOfRemittance) : null;
                    if (remDate && sDate && eDate && isWithinInterval(remDate, { start: sDate, end: eDate })) {
                        return sum + (Number(rd.amountRemitted) || 0);
                    }
                    return sum;
                }, 0) || 0;
                return {
                    ...entry,
                    siteNames: entry.siteDetails?.map(s => s.nameOfSite).join(', ') || 'N/A',
                    remittanceInRange: remittanceInRange.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                };
            });
        } else if (title.toLowerCase().includes('completed')) {
            columns = [
                { key: 'fileNo', label: 'File No.' },
                { key: 'applicantName', label: 'Applicant Name' },
                { key: 'siteNames', label: 'Site Name(s)' },
                { key: 'fileStatus', label: 'File Status' },
                { key: 'paymentInRange', label: 'Payment in Range (₹)' },
            ];
            dialogData = (data as DataEntryFormData[]).map(entry => {
                const paymentInRange = entry.paymentDetails?.reduce((sum, pd) => {
                    const paymentDate = pd.dateOfPayment ? new Date(pd.dateOfPayment) : null;
                    if (paymentDate && sDate && eDate && isWithinInterval(paymentDate, { start: sDate, end: eDate })) {
                        const total = (Number(pd.contractorsPayment) || 0) + (Number(pd.gst) || 0) + (Number(pd.incomeTax) || 0) + (Number(pd.kbcwb) || 0) + (Number(pd.refundToParty) || 0);
                        return sum + total;
                    }
                    return sum;
                }, 0) || 0;
                return {
                    ...entry,
                    siteNames: entry.siteDetails?.map(s => s.nameOfSite).join(', ') || 'N/A',
                    paymentInRange: paymentInRange.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                };
            });
        } else {
             columns = [
                { key: 'fileNo', label: 'File No.' },
                { key: 'applicantName', label: 'Applicant Name' },
                { key: 'siteNames', label: 'Site Name(s)' },
                { key: 'fileStatus', label: 'File Status' },
            ];
            dialogData = (data as DataEntryFormData[]).map(entry => ({
                ...entry,
                siteNames: entry.siteDetails?.map(s => s.nameOfSite).join(', ') || 'N/A',
            }));
        }
    }
    
    setDetailDialogColumns(columns);
    setDetailDialogData(dialogData);
    setIsDetailDialogOpen(true);
};


  const handleExportDialogData = () => {
    if (detailDialogData.length === 0) return;

    const dataToExport = detailDialogData.map(row => {
        const exportRow: Record<string, string> = {};
        detailDialogColumns.forEach(col => {
            const value = (row as any)[col.key];
             if (col.key === 'dateOfCompletion' && value) {
                exportRow[col.label] = format(new Date(value as string), 'dd/MM/yyyy');
            } else {
                exportRow[col.label] = String(value ?? 'N/A');
            }
        });
        return exportRow;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Details");
    XLSX.writeFile(workbook, `Report_Details_${detailDialogTitle.replace(/ /g, '_')}.xlsx`);
    toast({ title: "Exported!", description: "The detailed list has been exported to Excel." });
  };
  
  const FinancialSummaryTable = ({ title, summaryData }: { title: string; summaryData: FinancialSummaryReport }) => {
    if (!reportData) return null;

    const purposesToShow = financialSummaryOrder.filter(p => summaryData[p]?.totalApplications > 0 || summaryData[p]?.totalCompleted > 0);

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
              {purposesToShow.map(purpose => {
                const data = summaryData[purpose];
                if (!data) return null;
                return (
                  <TableRow key={purpose}>
                    <TableCell className="border p-2 font-medium">{purpose}</TableCell>
                    <TableCell className="border p-2 text-center">
                      <Button variant="link" className="p-0 h-auto" disabled={data.totalApplications === 0} onClick={() => handleCountClick(data.applicationData, `Total Application - ${purpose}`)}>
                        {data.totalApplications}
                      </Button>
                    </TableCell>
                    <TableCell className="border p-2 text-right">{data.totalRemittance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    <TableCell className="border p-2 text-center">
                      <Button variant="link" className="p-0 h-auto" disabled={data.totalCompleted === 0} onClick={() => handleCountClick(data.completedData, `Application Completed - ${purpose}`)}>
                        {data.totalCompleted}
                      </Button>
                    </TableCell>
                    <TableCell className="border p-2 text-right">{data.totalPayment.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
             <TableFooter>
                <TableRow className="bg-muted/50 font-bold">
                    <TableCell className="border p-2">Total</TableCell>
                    <TableCell className="border p-2 text-center">
                        <Button variant="link" className="p-0 h-auto font-bold" disabled={total.totalApplications === 0} onClick={() => handleCountClick(total.applicationData, `Total Applications for ${title}`)}>
                            {total.totalApplications}
                        </Button>
                    </TableCell>
                    <TableCell className="border p-2 text-right">{total.totalRemittance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    <TableCell className="border p-2 text-center">
                        <Button variant="link" className="p-0 h-auto font-bold" disabled={total.totalCompleted === 0} onClick={() => handleCountClick(total.completedData, `Total Completed Applications for ${title}`)}>
                            {total.totalCompleted}
                        </Button>
                    </TableCell>
                    <TableCell className="border p-2 text-right">{total.totalPayment.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    );
  };
  
    const handleRevenueHeadClick = () => {
        if (!reportData || reportData.revenueHeadDetails.length === 0) return;
        setDetailDialogTitle("Revenue Head Details");
        setDetailDialogColumns([
            { key: 'slNo', label: 'Sl. No' },
            { key: 'applicantName', label: 'Name of Applicant' },
            { key: 'siteNames', label: 'Name of Site' },
            { key: 'fileStatus', label: 'File Status' },
            { key: 'paymentAmount', label: 'Payments (₹)' }
        ]);
        setDetailDialogData(reportData.revenueHeadDetails.map(d => ({...d, paymentAmount: d.paymentAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) })));
        setIsDetailDialogOpen(true);
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
      <Card className="shadow-lg no-print">
        <CardHeader>
          <CardTitle>Progress Report</CardTitle>
          <CardDescription>Select a date range to generate the report.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row flex-wrap gap-2 pt-3">
              <Popover>
                  <PopoverTrigger asChild>
                      <Button variant={"outline"} className={cn("w-full sm:w-auto justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />{startDate ? format(startDate, "dd/MM/yyyy") : <span>From Date</span>}
                      </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start" side="top" onFocusOutside={handleCalendarInteraction} onPointerDownOutside={handleCalendarInteraction}>
                      <Calendar mode="single" selected={startDate} onSelect={setStartDate} disabled={(date) => (endDate ? date > endDate : false) || date > new Date()} initialFocus />
                  </PopoverContent>
              </Popover>
              <Popover>
                  <PopoverTrigger asChild>
                      <Button variant={"outline"} className={cn("w-full sm:w-auto justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />{endDate ? format(endDate, "dd/MM/yyyy") : <span>To Date</span>}
                      </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start" side="top" onFocusOutside={handleCalendarInteraction} onPointerDownOutside={handleCalendarInteraction}>
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
            <WellTypeProgressTable title="BWC" data={reportData.bwcData} diameters={BWC_DIAMETERS} onCountClick={handleCountClick} />
            <WellTypeProgressTable title="TWC" data={reportData.twcData} diameters={TWC_DIAMETERS} onCountClick={handleCountClick} />

            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle>Progress Summary</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto pt-6">
                    <Table className="min-w-full border-collapse">
                    <TableHeader>
                        <TableRow>
                            <TableHead className="border p-2 align-middle text-center font-semibold">Service Type</TableHead>
                            <TableHead className="border p-2 text-center font-semibold">Previous Balance</TableHead>
                            <TableHead className="border p-2 text-center font-semibold">Current Application</TableHead>
                            <TableHead className="border p-2 text-center font-bold">Total Application</TableHead>
                            <TableHead className="border p-2 text-center font-semibold">Completed</TableHead>
                            <TableHead className="border p-2 text-center font-semibold">Refunded</TableHead>
                            <TableHead className="border p-2 text-center font-bold">Balance</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {allServicePurposesForSummary.map(purpose => {
                           const stats = reportData.otherServicesData[purpose];
                           return (
                            <TableRow key={purpose}>
                                <TableCell className="border p-2 font-medium">{purpose}</TableCell>
                                <TableCell className="border p-2 text-center"><Button variant="link" className="p-0 h-auto" disabled={stats?.previousBalance === 0} onClick={() => handleCountClick(stats.previousBalanceData, `${purpose} - Previous Balance`)}>{stats?.previousBalance || 0}</Button></TableCell>
                                <TableCell className="border p-2 text-center"><Button variant="link" className="p-0 h-auto" disabled={stats?.currentApplications === 0} onClick={() => handleCountClick(stats.currentApplicationsData, `${purpose} - Current Applications`)}>{stats?.currentApplications || 0}</Button></TableCell>
                                <TableCell className="border p-2 text-center font-bold"><Button variant="link" className="p-0 h-auto font-bold" disabled={stats?.totalApplications === 0} onClick={() => handleCountClick(stats.totalApplicationsData, `${purpose} - Total Applications`)}>{stats?.totalApplications || 0}</Button></TableCell>
                                <TableCell className="border p-2 text-center"><Button variant="link" className="p-0 h-auto" disabled={stats?.completed === 0} onClick={() => handleCountClick(stats.completedData, `${purpose} - Completed`)}>{stats?.completed || 0}</Button></TableCell>
                                <TableCell className="border p-2 text-center"><Button variant="link" className="p-0 h-auto" disabled={stats?.refunded === 0} onClick={() => handleCountClick(stats.refundedData, `${purpose} - Refunded`)}>{stats?.refunded || 0}</Button></TableCell>
                                <TableCell className="border p-2 text-center font-bold"><Button variant="link" className="p-0 h-auto font-bold" disabled={stats?.balance === 0} onClick={() => handleCountClick(stats.balanceData, `${purpose} - Balance`)}>{stats?.balance || 0}</Button></TableCell>
                            </TableRow>
                        )})}
                    </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <div className="space-y-6">
                <FinancialSummaryTable title="Financial Summary - Private Applications" summaryData={reportData.privateFinancialSummaryData} />
                <FinancialSummaryTable title="Financial Summary - Government & Other Applications" summaryData={reportData.governmentFinancialSummaryData} />
                
                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle>Revenue Head Summary</CardTitle>
                        <CardDescription>
                            Total amount credited to the Revenue Head within the selected period.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-center font-semibold">Total Amount in Revenue Head (₹)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow>
                                    <TableCell className="text-center">
                                        <Button variant="link" className="p-0 h-auto text-lg font-bold" disabled={reportData.revenueHeadTotal === 0} onClick={handleRevenueHeadClick}>
                                            {reportData.revenueHeadTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
      ) : (
        <div className="flex items-center justify-center py-10 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">Select a date range and click "Generate Report" to view progress.</p>
        </div>
      )}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader className="p-6 pb-4 border-b shrink-0">
            <DialogTitle>{detailDialogTitle}</DialogTitle>
            <DialogDescription>
              Displaying {detailDialogData.length} records.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6">
            <ScrollArea className="h-full pr-4">
              {detailDialogData.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      {detailDialogColumns.map(col => <TableHead key={col.key}>{col.label}</TableHead>)}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailDialogData.map((row, index) => (
                      <TableRow key={index}>
                        {detailDialogColumns.map(col => (
                          <TableCell key={col.key} className="text-xs">
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
          <DialogFooter className="p-6 pt-4 border-t shrink-0">
            <Button variant="outline" onClick={handleExportDialogData} disabled={detailDialogData.length === 0}>
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
