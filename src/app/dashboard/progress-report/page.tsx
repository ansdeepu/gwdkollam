
// src/app/dashboard/progress-report/page.tsx
"use client";

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, CalendarIcon, XCircle, Loader2, Play, FileDown } from 'lucide-react';
import { format, startOfDay, endOfDay, isValid, isWithinInterval } from 'date-fns';
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

// Define the structure for the progress report data
interface DiameterStats {
  applications: number;
  completed: number;
  refunded: number;
  balance: number;
}

interface OtherServiceStats {
  applications: number;
  completed: number;
  refunded: number;
  balance: number;
}

type ApplicationProgress = Record<string, DiameterStats>; // Keyed by diameter string like "110 mm" or "Total"
type BwcTwcReportData = Record<ApplicationType, ApplicationProgress>;

type OtherServicesReportData = Record<SitePurpose, OtherServiceStats>;


const BWC_DIAMETERS = ['110 mm (4.5”)', '150 mm (6”)'];
const TWC_DIAMETERS = ['150 mm (6”)', '200 mm (8”)'];

const OTHER_PURPOSES: SitePurpose[] = [
  "FPW", "BW Dev", "TW Dev", "FPW Dev", "MWSS", "MWSS Ext", 
  "Pumping Scheme", "MWSS Pump Reno", "HPS", "HPR", "ARS"
];

const COMPLETED_STATUSES = ['Work Completed', 'Bill Prepared', 'Payment Completed', 'Utilization Certificate Issued'];
const REFUNDED_STATUSES = ['To be Refunded'];


// Reusable component for the complex BWC/TWC tables
const WellTypeProgressTable = ({ title, data, diameters }: { title: string; data: BwcTwcReportData; diameters: string[] }) => (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table className="min-w-full border-collapse">
          <TableHeader>
            <TableRow>
              <TableHead rowSpan={2} className="border p-1 align-middle text-center min-w-[120px] max-w-[120px] whitespace-normal text-xs font-semibold">Type of Application</TableHead>
              {diameters.map(diameter => (
                <TableHead key={diameter} colSpan={4} className="border p-1 text-center font-semibold text-xs whitespace-pre-line">{diameter.replace(' (', '\n(')}</TableHead>
              ))}
              <TableHead colSpan={4} className="border p-1 text-center font-bold text-xs">Total</TableHead>
            </TableRow>
            <TableRow>
              {[...diameters, 'Total'].flatMap(() => ['Appln.', 'Comp.', 'Ref.', 'Bal.']).map((subHeader, index) => (
                <TableHead key={index} className={cn("border p-1 text-center text-xs font-medium whitespace-nowrap", index >= (diameters.length * 4) && "font-bold")}>{subHeader}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {(Object.keys(data) as ApplicationType[]).map(appType => {
              const totalData = data[appType]['Total'];
              return (
              <TableRow key={appType}>
                <TableCell className="border p-1 text-xs font-medium whitespace-normal break-words min-w-[120px] max-w-[120px]">{applicationTypeDisplayMap[appType]}</TableCell>
                {diameters.map(diameter => {
                  const diameterData = data[appType][diameter];
                  return (
                  <React.Fragment key={`${appType}-${diameter}`}>
                    <TableCell className={cn("border p-1 text-center text-xs", (diameterData?.applications || 0) > 0 && "text-primary font-semibold")}>{diameterData?.applications || 0}</TableCell>
                    <TableCell className={cn("border p-1 text-center text-xs", (diameterData?.completed || 0) > 0 && "text-green-700 font-semibold")}>{diameterData?.completed || 0}</TableCell>
                    <TableCell className={cn("border p-1 text-center text-xs", (diameterData?.refunded || 0) > 0 && "text-destructive font-semibold")}>{diameterData?.refunded || 0}</TableCell>
                    <TableCell className={cn("border p-1 text-center text-xs", (diameterData?.balance || 0) > 0 && "font-semibold")}>{diameterData?.balance || 0}</TableCell>
                  </React.Fragment>
                )})}
                <TableCell className={cn("border p-1 text-center text-xs font-bold", (totalData?.applications || 0) > 0 ? "text-primary" : "text-muted-foreground")}>{totalData?.applications || 0}</TableCell>
                <TableCell className={cn("border p-1 text-center text-xs font-bold", (totalData?.completed || 0) > 0 ? "text-green-700" : "text-muted-foreground")}>{totalData?.completed || 0}</TableCell>
                <TableCell className={cn("border p-1 text-center text-xs font-bold", (totalData?.refunded || 0) > 0 ? "text-destructive" : "text-muted-foreground")}>{totalData?.refunded || 0}</TableCell>
                <TableCell className={cn("border p-1 text-center text-xs font-bold", (totalData?.balance || 0) > 0 ? "text-foreground" : "text-muted-foreground")}>{totalData?.balance || 0}</TableCell>
              </TableRow>
            )})}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
);

export default function ProgressReportPage() {
  const { fileEntries, isLoading: entriesLoading } = useFileEntries();
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [isFiltering, setIsFiltering] = useState(false);
  const { toast } = useToast();

  // State to hold the generated report data
  const [reportData, setReportData] = useState<{
    bwcData: BwcTwcReportData;
    twcData: BwcTwcReportData;
    otherServicesData: OtherServicesReportData;
  } | null>(null);

  // Memoized calculation of report data now as a callback
  const handleGenerateReport = useCallback(() => {
    setIsFiltering(true);
    setReportData(null); // Clear previous report

    // Initialize data structures
    const initialDiameterStats = (): DiameterStats => ({ applications: 0, completed: 0, refunded: 0, balance: 0 });
    const bwcData: BwcTwcReportData = {} as BwcTwcReportData;
    const twcData: BwcTwcReportData = {} as BwcTwcReportData;
    
    const initialOtherServiceStats = (): OtherServiceStats => ({ applications: 0, completed: 0, refunded: 0, balance: 0 });
    const otherServicesData: OtherServicesReportData = {} as any;
    OTHER_PURPOSES.forEach(p => { otherServicesData[p] = initialOtherServiceStats(); });


    applicationTypeOptions.forEach(appType => {
      bwcData[appType] = { Total: initialDiameterStats() };
      BWC_DIAMETERS.forEach(d => { bwcData[appType][d] = initialDiameterStats(); });

      twcData[appType] = { Total: initialDiameterStats() };
      TWC_DIAMETERS.forEach(d => { twcData[appType][d] = initialDiameterStats(); });
    });

    const sDate = startDate ? startOfDay(startDate) : null;
    const eDate = endDate ? endOfDay(endDate) : null;

    const filteredEntries = fileEntries.filter(entry => {
        if (!sDate || !eDate) return true; // No date filter applied
        
        // Check if ANY remittance date falls within the selected range
        return entry.remittanceDetails?.some(rd => {
            if (!rd.dateOfRemittance) return false;
            const remDate = new Date(rd.dateOfRemittance);
            return isValid(remDate) && isWithinInterval(remDate, { start: sDate, end: eDate });
        }) ?? false;
    });

    filteredEntries.forEach(entry => {
      const appType = entry.applicationType;
      if (!appType) return;

      entry.siteDetails?.forEach(site => {
        const purpose = site.purpose as SitePurpose;
        const diameter = site.diameter;
        const workStatus = site.workStatus;
        
        const isCompleted = workStatus ? COMPLETED_STATUSES.includes(workStatus) : false;
        const isRefunded = workStatus ? REFUNDED_STATUSES.includes(workStatus) : false;

        const updateStats = (data: BwcTwcReportData, dia: string) => {
          data[appType][dia].applications++;
          if (isCompleted) data[appType][dia].completed++;
          if (isRefunded) data[appType][dia].refunded++;
          data[appType][dia].balance = data[appType][dia].applications - data[appType][dia].completed - data[appType][dia].refunded;
        };

        if (purpose === 'BWC' && diameter && BWC_DIAMETERS.includes(diameter)) {
            updateStats(bwcData, diameter);
            updateStats(bwcData, 'Total');
        } else if (purpose === 'TWC' && diameter && TWC_DIAMETERS.includes(diameter)) {
            updateStats(twcData, diameter);
            updateStats(twcData, 'Total');
        } else if (OTHER_PURPOSES.includes(purpose)) {
            if (otherServicesData[purpose]) {
                otherServicesData[purpose].applications++;
                if (isCompleted) {
                    otherServicesData[purpose].completed++;
                }
                if (isRefunded) {
                    otherServicesData[purpose].refunded++;
                }
                otherServicesData[purpose].balance = otherServicesData[purpose].applications - otherServicesData[purpose].completed - otherServicesData[purpose].refunded;
            }
        }
      });
    });

    setReportData({ bwcData, twcData, otherServicesData });
    setIsFiltering(false);
  }, [fileEntries, startDate, endDate]);
  
  const styleAndFormatWorksheet = (ws: XLSX.WorkSheet, reportTitle: string, columnLabels: string[][], dataRows: (string | number)[][]) => {
    const headerRows = [
      ["Ground Water Department, Kollam"],
      [reportTitle],
      [`Report generated on: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`],
      []
    ];
  
    const numCols = columnLabels.length > 1 ? columnLabels[1].length + 1 : columnLabels[0].length;
  
    const footerColIndex = numCols > 1 ? numCols - 2 : 0;
    const footerRowData = new Array(numCols).fill("");
    footerRowData[footerColIndex] = "District Officer";
  
    const footerRows = [[], footerRowData];
    
    // Flatten column labels for tables with two header rows
    const finalData = [...headerRows, ...columnLabels, ...dataRows, ...footerRows];
  
    XLSX.utils.sheet_add_aoa(ws, finalData, { origin: 'A1' });
  
    const merges = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: numCols - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: numCols - 1 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: numCols - 1 } },
    ];

    if (columnLabels.length > 1) { // For BWC/TWC tables with merged headers
        merges.push({ s: { r: 4, c: 0 }, e: { r: 5, c: 0 } }); // Type of App
        let colOffset = 1;
        
        const mainHeaders = (columnLabels[0] as string[]).slice(1); // Exclude "Type of Application"
        mainHeaders.forEach(() => {
            merges.push({ s: { r: 4, c: colOffset }, e: { r: 4, c: colOffset + 3 } });
            colOffset += 4;
        });
    }

    const footerRowIndex = finalData.length - 1;
    if (numCols > 1) {
      merges.push({ s: { r: footerRowIndex, c: footerColIndex }, e: { r: footerRowIndex, c: numCols - 1 } });
    }
    ws['!merges'] = (ws['!merges'] || []).concat(merges);
  
    const colWidths = Array.from({ length: numCols }, (_, i) => ({
      wch: Math.max(...finalData.map(row => (row[i] ? String(row[i]).length : 0))) + 2,
    }));
    ws['!cols'] = colWidths;
  
    const numRows = finalData.length;
    for (let R = 0; R < numRows; R++) {
      ws['!rows'] = ws['!rows'] || [];
      ws['!rows'][R] = { hpt: 20 };
  
      for (let C = 0; C < numCols; C++) {
        const cellRef = XLSX.utils.encode_cell({ c: C, r: R });
        if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };
  
        ws[cellRef].s = {
          alignment: { horizontal: "center", vertical: "center", wrapText: true },
          border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } }
        };
  
        if (R < 3) {
          ws[cellRef].s.font = { bold: true, sz: R === 0 ? 16 : (R === 1 ? 14 : 12) };
          if (R === 2) ws[cellRef].s.font.italic = true;
        } else if (R >= 4 && R < (4 + columnLabels.length)) { // Header rows
          ws[cellRef].s.font = { bold: true };
          ws[cellRef].s.fill = { fgColor: { rgb: "F0F0F0" } };
        } else if (R === footerRowIndex) {
          ws[cellRef].s.border = {};
          if (C === footerColIndex) {
            ws[cellRef].s.font = { bold: true };
            ws[cellRef].s.alignment.horizontal = "right";
          }
        }
      }
    }
  };

  const handleExportExcel = () => {
    if (!reportData) {
        toast({ title: "No Report Data", description: "Please generate a report first before exporting." });
        return;
    }

    const wb = XLSX.utils.book_new();

    // BWC Data
    const ws_bwc = XLSX.utils.aoa_to_sheet([]);
    const bwcTitle = `BWC Progress Report${startDate && endDate ? ` from ${format(startDate, 'dd-MM-yy')} to ${format(endDate, 'dd-MM-yy')}` : ''}`;
    const bwcHeaderRow1 = ["Type of Application", ...BWC_DIAMETERS.map(d => d.replace('\n', ' ')), "Total"];
    const bwcHeaderRow2 = ["", ...Array(BWC_DIAMETERS.length + 1).fill(['Appln.', 'Comp.', 'Ref.', 'Bal.']).flat()];
    const bwcDataRows = (Object.keys(reportData.bwcData) as ApplicationType[]).map(appType => {
      const rowData = [applicationTypeDisplayMap[appType]];
      [...BWC_DIAMETERS, 'Total'].forEach(diameter => {
        const stats = reportData.bwcData[appType][diameter];
        rowData.push(stats?.applications || 0, stats?.completed || 0, stats?.refunded || 0, stats?.balance || 0);
      });
      return rowData;
    });
    styleAndFormatWorksheet(ws_bwc, bwcTitle, [bwcHeaderRow1, bwcHeaderRow2], bwcDataRows);
    XLSX.utils.book_append_sheet(wb, ws_bwc, "BWC Report");

    // TWC Data
    const ws_twc = XLSX.utils.aoa_to_sheet([]);
    const twcTitle = `TWC Progress Report${startDate && endDate ? ` from ${format(startDate, 'dd-MM-yy')} to ${format(endDate, 'dd-MM-yy')}` : ''}`;
    const twcHeaderRow1 = ["Type of Application", ...TWC_DIAMETERS.map(d => d.replace('\n', ' ')), "Total"];
    const twcHeaderRow2 = ["", ...Array(TWC_DIAMETERS.length + 1).fill(['Appln.', 'Comp.', 'Ref.', 'Bal.']).flat()];
    const twcDataRows = (Object.keys(reportData.twcData) as ApplicationType[]).map(appType => {
        const rowData = [applicationTypeDisplayMap[appType]];
        [...TWC_DIAMETERS, 'Total'].forEach(diameter => {
            const stats = reportData.twcData[appType][diameter];
            rowData.push(stats?.applications || 0, stats?.completed || 0, stats?.refunded || 0, stats?.balance || 0);
        });
        return rowData;
    });
    styleAndFormatWorksheet(ws_twc, twcTitle, [twcHeaderRow1, twcHeaderRow2], twcDataRows);
    XLSX.utils.book_append_sheet(wb, ws_twc, "TWC Report");

    // Other Services
    const ws_other = XLSX.utils.aoa_to_sheet([]);
    const otherTitle = `Other Services Summary${startDate && endDate ? ` from ${format(startDate, 'dd-MM-yy')} to ${format(endDate, 'dd-MM-yy')}` : ''}`;
    const otherColLabels = [["Service Type", "Applications", "Completed", "Refunded", "Balance"]];
    const otherDataRows = OTHER_PURPOSES.map(purpose => {
      const stats = reportData.otherServicesData[purpose];
      return [purpose, stats?.applications || 0, stats?.completed || 0, stats?.refunded || 0, stats?.balance || 0];
    });
    styleAndFormatWorksheet(ws_other, otherTitle, otherColLabels, otherDataRows);
    XLSX.utils.book_append_sheet(wb, ws_other, "Other Services Summary");


    const uniqueFileName = `progress_report_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
    XLSX.writeFile(wb, uniqueFileName);

    toast({
      title: "Excel Exported",
      description: `Report downloaded as ${uniqueFileName}.`,
    });
};


  const handleCalendarInteraction = (e: Event) => {
    const target = e.target as HTMLElement;
    if (target.closest('.calendar-custom-controls-container') || target.closest('[data-radix-select-content]')) e.preventDefault();
  };

  const handleResetFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setReportData(null); // Also clear the report data
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
          <CardDescription>Filter by first remittance date.</CardDescription>
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
                            <TableHead className="border p-2 align-middle text-center">Service Type</TableHead>
                            <TableHead className="border p-2 text-center">No. of Applications</TableHead>
                            <TableHead className="border p-2 text-center">Completed</TableHead>
                            <TableHead className="border p-2 text-center">Refunded</TableHead>
                            <TableHead className="border p-2 text-center">Balance</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {OTHER_PURPOSES.map(purpose => (
                            <TableRow key={purpose}>
                                <TableCell className="border p-2 font-medium">{purpose}</TableCell>
                                <TableCell className="border p-2 text-center">{reportData.otherServicesData[purpose]?.applications || 0}</TableCell>
                                <TableCell className="border p-2 text-center">{reportData.otherServicesData[purpose]?.completed || 0}</TableCell>
                                <TableCell className="border p-2 text-center">{reportData.otherServicesData[purpose]?.refunded || 0}</TableCell>
                                <TableCell className="border p-2 text-center">{reportData.otherServicesData[purpose]?.balance || 0}</TableCell>
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
