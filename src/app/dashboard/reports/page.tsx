
// src/app/dashboard/reports/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, parseISO, startOfDay, endOfDay, isValid, parse } from "date-fns";
import ReportTable from "@/components/reports/ReportTable";
import PaginationControls from "@/components/shared/PaginationControls";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  fileStatusOptions, 
  siteWorkStatusOptions, 
  sitePurposeOptions, 
  applicationTypeOptions, 
  applicationTypeDisplayMap,
  siteTypeOfRigOptions,
  type DataEntryFormData,
  type ApplicationType,
  type FileStatus,
  type SiteWorkStatus,
  type SitePurpose,
  constituencyOptions,
} from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { useFileEntries } from "@/hooks/useFileEntries";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import ExcelJS from 'exceljs';
import { usePageHeader } from "@/hooks/usePageHeader";
import { Table, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = 'force-dynamic';

const FileText = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>
);
const Filter = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
);
const RotateCcw = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
);
const Loader2 = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
);
const FileDown = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M12 18v-6"/><path d="m15 15-3 3-3-3"/></svg>
);
const Eye = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
);
const Search = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
);


export interface FlattenedReportRow {
  fileNo: string; 
  applicantName: string; 
  fileFirstRemittanceDate: string;
  sitePurpose: string;
  fileStatus: string; 
  
  siteName: string; 
  siteWorkStatus: string; 
  siteTotalExpenditure: string; 
}

const ITEMS_PER_PAGE = 50;

// Helper function for rendering details in the dialog
function renderDetail(label: string, value: any) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  let displayValue = value;
  if (value instanceof Date) {
    displayValue = format(value, "dd/MM/yyyy");
  } else if (typeof value === 'boolean') {
    displayValue = value ? "Yes" : "No";
  } else if (typeof value === 'number') {
    displayValue = value.toLocaleString('en-IN');
     if (label.toLowerCase().includes("(₹)") && !displayValue.startsWith("₹")) {
        displayValue = `₹ ${displayValue}`;
    }
  } else {
    displayValue = String(value);
  }
  
  return (
    <div className="grid grid-cols-2 gap-2 py-1.5 border-b border-muted/50 last:border-b-0">
      <p className="font-medium text-sm text-muted-foreground">{label}:</p>
      <p className="text-sm text-foreground break-words">{String(displayValue)}</p>
    </div>
  );
}

const safeParseDate = (dateValue: any): Date | null => {
  if (!dateValue) return null;
  if (dateValue instanceof Date && isValid(dateValue)) {
    return dateValue;
  }
  if (typeof dateValue === 'string') {
    let parsed = parseISO(dateValue); // Handles ISO strings from new data
    if (isValid(parsed)) return parsed;
    parsed = parse(dateValue, 'yyyy-MM-dd', new Date()); // Handles date picker format
    if (isValid(parsed)) return parsed;
  }
  // Fallback for other potential date-like objects from Firestore
  if (typeof dateValue === 'object' && dateValue.toDate) {
    const parsed = dateValue.toDate();
    if (isValid(parsed)) return parsed;
  }
  return null;
};


export default function ReportsPage() {
  const { setHeader } = usePageHeader();
  useEffect(() => {
    setHeader('Reports', 'Generate custom reports by applying a combination of filters.');
  }, [setHeader]);

  const searchParams = useSearchParams();
  const router = useRouter(); 
  const { fileEntries, isLoading: entriesLoading, getFileEntry } = useFileEntries();
  const { user, isLoading: authIsLoading } = useAuth();
  const [filteredReportRows, setFilteredReportRows] = useState<FlattenedReportRow[]>([]);
  const { toast } = useToast();

  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); 
  const [serviceTypeFilter, setServiceTypeFilter] = useState("all"); 
  const [workCategoryFilter, setWorkCategoryFilter] = useState("all");
  const [dateFilterType, setDateFilterType] = useState<"remittance" | "completion" | "payment" | "all">("all");
  const [currentPage, setCurrentPage] = useState(1);
  
  const [applicationTypeFilter, setApplicationTypeFilter] = useState("all");
  const [typeOfRigFilter, setTypeOfRigFilter] = useState("all");
  const [constituencyFilter, setConstituencyFilter] = useState("all");

  const [currentDate, setCurrentDate] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<string | null>(null);

  const [viewItem, setViewItem] = useState<DataEntryFormData | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);


  useEffect(() => {
    // This now runs only on the client, after hydration
    const now = new Date();
    setCurrentDate(format(now, 'dd/MM/yyyy'));
    setCurrentTime(format(now, 'hh:mm:ss a'));
  }, []);

  const applyFilters = useCallback(() => {
    let currentEntries = [...fileEntries];
    const lowerSearchTerm = searchTerm.toLowerCase();

    const reportType = searchParams?.get("reportType");
    const fileStatusesForPendingReport: FileStatus[] = ["File Under Process"];
    const siteWorkStatusesForPendingReport: SiteWorkStatus[] = [
      "Addl. AS Awaited", "To be Refunded", "To be Tendered", "TS Pending",
    ];

    if (reportType === "pendingDashboardTasks") {
      currentEntries = currentEntries.filter(entry => {
        const isFileLevelPending = entry.fileStatus && fileStatusesForPendingReport.includes(entry.fileStatus as FileStatus);
        if (isFileLevelPending) return true;
        
        const isAnySiteLevelPending = entry.siteDetails?.some(sd => sd.workStatus && siteWorkStatusesForPendingReport.includes(sd.workStatus as SiteWorkStatus)) ?? false;
        return isAnySiteLevelPending;
      });
    }

    // --- Start Filtering `currentEntries` based on all active filters ---
    
    // Date Filters
    if ((startDate || endDate) && dateFilterType && dateFilterType !== 'all') {
      currentEntries = currentEntries.filter(entry => {
        let dateFoundInRange = false;
        const from = startDate ? startOfDay(parse(startDate, "yyyy-MM-dd", new Date())) : null;
        const to = endDate ? endOfDay(parse(endDate, "yyyy-MM-dd", new Date())) : null;

        const checkDate = (targetDateValue: Date | string | null | undefined): boolean => {
          if (!targetDateValue) return false;
          const targetDate = safeParseDate(targetDateValue);
          if (!targetDate || !isValid(targetDate)) return false;
          let isAfterFrom = true;
          if (from) isAfterFrom = targetDate >= from;
          let isBeforeTo = true;
          if (to) isBeforeTo = targetDate <= to;
          return isAfterFrom && isBeforeTo;
        };

        if (dateFilterType === "remittance") dateFoundInRange = entry.remittanceDetails?.some(rd => checkDate(rd.dateOfRemittance)) ?? false;
        else if (dateFilterType === "completion") dateFoundInRange = entry.siteDetails?.some(sd => checkDate(sd.dateOfCompletion)) ?? false;
        else if (dateFilterType === "payment") dateFoundInRange = entry.paymentDetails?.some(pd => checkDate(pd.dateOfPayment)) ?? false;
        return dateFoundInRange;
      });
    }

    // Dropdown Filters
    if (statusFilter !== "all") {
      currentEntries = currentEntries.filter(entry => entry.fileStatus === statusFilter);
    }
    if (applicationTypeFilter !== "all") {
      currentEntries = currentEntries.filter(entry => entry.applicationType === applicationTypeFilter);
    }
    if (constituencyFilter !== "all") {
      currentEntries = currentEntries.filter(entry => entry.constituency === constituencyFilter || entry.siteDetails?.some(sd => sd.constituency === constituencyFilter));
    }
    
    // Site-specific dropdowns need to filter the whole entry if any site matches
    if (workCategoryFilter !== "all") {
      currentEntries = currentEntries.filter(entry => entry.siteDetails?.some(sd => sd.workStatus === workCategoryFilter));
    }
    if (serviceTypeFilter !== "all") { 
        currentEntries = currentEntries.filter(entry => entry.siteDetails?.some(sd => sd.purpose === serviceTypeFilter));
    }
    if (typeOfRigFilter !== "all") {
      currentEntries = currentEntries.filter(entry => entry.siteDetails?.some(site => site.typeOfRig === typeOfRigFilter));
    }
    
    // Global Search Term
    if (lowerSearchTerm) {
      currentEntries = currentEntries.filter(entry => {
        const appTypeDisplay = entry.applicationType ? applicationTypeDisplayMap[entry.applicationType as ApplicationType] : "";
        const mainFieldsToSearch = [
          entry.fileNo, entry.applicantName, entry.phoneNo, appTypeDisplay, entry.fileStatus, entry.remarks, entry.constituency,
        ].filter(Boolean).map(val => String(val).toLowerCase());
        if (mainFieldsToSearch.some(field => field.includes(lowerSearchTerm))) return true;
        if (entry.siteDetails?.some(site => [
            site.nameOfSite, site.accessibleRig, site.tenderNo, site.purpose, site.typeOfRig, site.contractorName, site.supervisorName, site.workStatus, site.workRemarks, site.zoneDetails, site.pumpDetails, site.waterTankCapacity, site.constituency,
          ].filter(Boolean).map(val => String(val).toLowerCase()).some(field => field.includes(lowerSearchTerm))
        )) return true;
        if (entry.remittanceDetails?.some(rd => rd.remittedAccount?.toLowerCase().includes(lowerSearchTerm))) return true;
        if (entry.paymentDetails?.some(pd => pd.paymentRemarks?.toLowerCase().includes(lowerSearchTerm))) return true;
        return false;
      });
    }

    // Sort entries by the first remittance date in descending order (newest first)
    currentEntries.sort((a, b) => {
      const dateAValue = a.remittanceDetails?.[0]?.dateOfRemittance;
      const dateBValue = b.remittanceDetails?.[0]?.dateOfRemittance;

      const dateA = safeParseDate(dateAValue);
      const dateB = safeParseDate(dateBValue);
      
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1; 
      if (!dateB) return -1;
      
      return dateB.getTime() - dateA.getTime();
    });


    // --- End Filtering `currentEntries` ---

    // --- Start Flattening logic ---
    const flattenedRows: FlattenedReportRow[] = [];
    const isFileLevelFilterActive = statusFilter !== "all" || constituencyFilter !== "all" || (dateFilterType !== "all" && (!!startDate || !!endDate));
    const isSiteLevelFilterActive = workCategoryFilter !== "all" || serviceTypeFilter !== "all" || typeOfRigFilter !== "all" || applicationTypeFilter !== "all";

    currentEntries.forEach(entry => {
      const fileFirstRemittanceDateStr = entry.remittanceDetails?.[0]?.dateOfRemittance;
      const parsedRemittanceDate = safeParseDate(fileFirstRemittanceDateStr);
      const fileFirstRemittanceDate = parsedRemittanceDate ? format(parsedRemittanceDate, "dd/MM/yyyy") : "-";

      // If a site-level filter is active, we must expand to show matching sites.
      if (isSiteLevelFilterActive) {
        entry.siteDetails?.forEach(site => {
          // Check if this specific site meets the active site-level filters
          const workCategoryMatch = workCategoryFilter === "all" || site.workStatus === workCategoryFilter;
          const serviceTypeMatch = serviceTypeFilter === "all" || site.purpose === serviceTypeFilter;
          const rigTypeMatch = typeOfRigFilter === "all" || site.typeOfRig === typeOfRigFilter;
          const appTypeMatch = applicationTypeFilter === "all" || entry.applicationType === applicationTypeFilter;


          if (workCategoryMatch && serviceTypeMatch && rigTypeMatch && appTypeMatch) {
            flattenedRows.push({
              fileNo: entry.fileNo || "-", applicantName: entry.applicantName || "-", fileFirstRemittanceDate, fileStatus: entry.fileStatus || "-",
              siteName: site.nameOfSite || "-", sitePurpose: site.purpose || "-", siteWorkStatus: site.workStatus || "-",
              siteTotalExpenditure: site.totalExpenditure?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? "0.00",
            });
          }
        });
      } 
      // If a pending report is active, expand sites to show which ones are pending.
      else if (reportType === "pendingDashboardTasks") {
        const isFileLevelPending = entry.fileStatus && fileStatusesForPendingReport.includes(entry.fileStatus as FileStatus);

        if (isFileLevelPending) {
          if (entry.siteDetails && entry.siteDetails.length > 0) {
            entry.siteDetails.forEach(site => {
              flattenedRows.push({
                fileNo: entry.fileNo || "-", applicantName: entry.applicantName || "-", fileFirstRemittanceDate, fileStatus: entry.fileStatus || "-",
                siteName: site.nameOfSite || "-", sitePurpose: site.purpose || "-", siteWorkStatus: site.workStatus || "-",
                siteTotalExpenditure: site.totalExpenditure?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? "0.00",
              });
            });
          } else {
            flattenedRows.push({
              fileNo: entry.fileNo || "-", applicantName: entry.applicantName || "-", fileFirstRemittanceDate, fileStatus: entry.fileStatus || "-",
              siteName: "-", sitePurpose: "-", siteWorkStatus: "-", siteTotalExpenditure: "0.00",
            });
          }
        } else {
          entry.siteDetails?.forEach(site => {
            if (site.workStatus && siteWorkStatusesForPendingReport.includes(site.workStatus as SiteWorkStatus)) {
              flattenedRows.push({
                fileNo: entry.fileNo || "-", applicantName: entry.applicantName || "-", fileFirstRemittanceDate, fileStatus: entry.fileStatus || "-",
                siteName: site.nameOfSite || "-", sitePurpose: site.purpose || "-", siteWorkStatus: site.workStatus || "-",
                siteTotalExpenditure: site.totalExpenditure?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? "0.00",
              });
            }
          });
        }
      }
      // Otherwise (only file-level or search filters active), show one row per file, aggregating site info.
      else { 
        const siteNames = entry.siteDetails?.map(sd => sd.nameOfSite || 'N/A').filter(Boolean).join(', ') || '-';
        const sitePurposes = entry.siteDetails?.map(sd => sd.purpose || 'N/A').filter(Boolean).join(', ') || '-';
        const siteWorkStatuses = entry.siteDetails?.map(sd => sd.workStatus || 'N/A').filter(Boolean).join(', ') || '-';
        const siteTotalExpenditure = entry.siteDetails?.reduce((acc, site) => acc + (Number(site.totalExpenditure) || 0), 0) ?? 0;

        flattenedRows.push({
          fileNo: entry.fileNo || "-", applicantName: entry.applicantName || "-", fileFirstRemittanceDate, fileStatus: entry.fileStatus || "-",
          siteName: siteNames, 
          sitePurpose: sitePurposes,
          siteWorkStatus: siteWorkStatuses, 
          siteTotalExpenditure: siteTotalExpenditure.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        });
      }
    });
    // --- End Flattening logic ---
    
    setFilteredReportRows(flattenedRows);
  }, [
    fileEntries, searchTerm, statusFilter, serviceTypeFilter, workCategoryFilter, 
    startDate, endDate, dateFilterType,
    applicationTypeFilter, typeOfRigFilter, constituencyFilter, searchParams
  ]);

  useEffect(() => {
    if (!entriesLoading && !authIsLoading) {
      const statusFromQuery = searchParams?.get("status");
      const workCategoryFromQuery = searchParams?.get("workCategory");
      const serviceTypeFromQuery = searchParams?.get("serviceType");

      setStatusFilter(statusFromQuery && fileStatusOptions.includes(statusFromQuery as any) ? statusFromQuery : "all");
      setWorkCategoryFilter(workCategoryFromQuery && siteWorkStatusOptions.includes(workCategoryFromQuery as any) ? workCategoryFromQuery : "all");
      setServiceTypeFilter(serviceTypeFromQuery && (sitePurposeOptions.includes(serviceTypeFromQuery as any) || serviceTypeFromQuery === 'all') ? serviceTypeFromQuery : "all");
      
      applyFilters();
    }
  }, [searchParams, entriesLoading, authIsLoading, applyFilters]);
  
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredReportRows]);
  
  const paginatedReportRows = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredReportRows.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredReportRows, currentPage]);
  
  const totalPages = Math.ceil(filteredReportRows.length / ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    const params = new URLSearchParams(searchParams?.toString());
    params.set('page', String(page));
    router.push(`/dashboard/reports?${params.toString()}`, { scroll: false });
  };

  const handleResetFilters = () => {
    setStartDate("");
    setEndDate("");
    setSearchTerm("");
    setStatusFilter("all");
    setServiceTypeFilter("all");
    setWorkCategoryFilter("all");
    setDateFilterType("all");
    setApplicationTypeFilter("all");
    setTypeOfRigFilter("all");
    setConstituencyFilter("all");
    
    const currentParams = new URLSearchParams(searchParams?.toString());
    currentParams.delete("reportType");
    currentParams.delete("status"); 
    currentParams.delete("workCategory");
    currentParams.delete("serviceType");
    router.replace(`/dashboard/reports?${currentParams.toString()}`, { scroll: false });
    toast({ title: "Filters Reset", description: "All report filters have been cleared." });
  };

  const handleExportExcel = async () => {
    const reportTitle = "Custom Report";
    const fileNamePrefix = "gwd_report";

    if (filteredReportRows.length === 0) {
      toast({ title: "No Data to Export", description: "There is no data to export.", variant: "default" });
      return;
    }
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Report");

    // Add Title and Generation Date
    worksheet.addRow(["Ground Water Department, Kollam"]).commit();
    worksheet.addRow([reportTitle]).commit();
    worksheet.addRow([`Report generated on: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`]).commit();
    worksheet.addRow([]).commit(); // Spacer

    const header = [ "File No", "Applicant Name", "Date of Remittance", "Site Purpose", "File Status", "Site Name", "Site Work Status", "Site Total Expenditure (₹)" ];
    
    worksheet.mergeCells('A1:H1');
    worksheet.mergeCells('A2:H2');
    worksheet.mergeCells('A3:H3');
    worksheet.getCell('A1').alignment = { horizontal: 'center' };
    worksheet.getCell('A2').alignment = { horizontal: 'center' };
    
    worksheet.getRow(1).font = { bold: true, size: 16 };
    worksheet.getRow(2).font = { bold: true, size: 14 };

    // Add Header Row
    const headerRow = worksheet.addRow(header);
    headerRow.font = { bold: true };
    headerRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern:'solid', fgColor:{argb:'F0F0F0'} };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });

    // Add Data Rows
    filteredReportRows.forEach(row => {
      const rowData = [
        row.fileNo, row.applicantName, row.fileFirstRemittanceDate, row.sitePurpose, row.fileStatus,
        row.siteName, row.siteWorkStatus, row.siteTotalExpenditure
      ];
      const newRow = worksheet.addRow(rowData);
      newRow.eachCell(cell => {
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
    });

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      let maxLength = 0;
      column.eachCell!({ includeEmpty: true }, cell => {
        let columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = maxLength < 15 ? 15 : maxLength + 2;
    });

    // Save the file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileNamePrefix}_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    toast({ title: "Excel Exported", description: `Your report has been downloaded.` });
  };


  const handleOpenViewDialog = (fileNo: string) => {
    const entryToView = getFileEntry(fileNo);
    if (entryToView) {
      setViewItem(entryToView);
      setIsViewDialogOpen(true);
    } else {
      toast({ title: "Error", description: "Could not find file details.", variant: "destructive" });
    }
  };

  if (entriesLoading || authIsLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-lg no-print">
        <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Select value={applicationTypeFilter} onValueChange={setSelectedAppType}>
                    <SelectTrigger><SelectValue placeholder="Filter by Application Type" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Application Types</SelectItem>
                        {applicationTypeOptions.map((type) => (<SelectItem key={type} value={type}>{applicationTypeDisplayMap[type as ApplicationType] || type.replace(/_/g, " ")}</SelectItem>))}
                    </SelectContent>
                </Select>
                 <Select value={dateFilterType} onValueChange={(value) => setDateFilterType(value as any)}>
                    <SelectTrigger><SelectValue placeholder="Select Date Type for Range" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">-- Clear Date Type --</SelectItem>
                        <SelectItem value="remittance">Date of Remittance</SelectItem>
                        <SelectItem value="completion">Date of Completion</SelectItem>
                        <SelectItem value="payment">Date of Payment</SelectItem>
                    </SelectContent>
                </Select>
                <Input type="date" placeholder="From Date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                <Input type="date" placeholder="To Date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
             <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
                    <SelectTrigger><SelectValue placeholder="Filter by Site Service Type" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Site Service Types</SelectItem>
                        {sitePurposeOptions.map((purpose) => (<SelectItem key={purpose} value={purpose}>{purpose}</SelectItem>))}
                    </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger><SelectValue placeholder="Filter by File Status" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All File Statuses</SelectItem>
                        {fileStatusOptions.map((status) => (<SelectItem key={status} value={status}>{status}</SelectItem>))}
                    </SelectContent>
                </Select>
                <Select value={typeOfRigFilter} onValueChange={setTypeOfRigFilter}>
                    <SelectTrigger><SelectValue placeholder="Filter by Site Type of Rig" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Site Rig Types</SelectItem>
                        {siteTypeOfRigOptions.map((rig) => (<SelectItem key={rig} value={rig}>{rig}</SelectItem>))}
                    </SelectContent>
                </Select>
                 <Select value={workCategoryFilter} onValueChange={setWorkCategoryFilter}>
                    <SelectTrigger><SelectValue placeholder="Filter by Site Work Category" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Site Work Categories</SelectItem>
                        {siteWorkStatusOptions.map((category) => (<SelectItem key={category} value={category}>{category}</SelectItem>))}
                    </SelectContent>
                </Select>
            </div>
             <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 border-t mt-4">
                <Select value={constituencyFilter} onValueChange={setConstituencyFilter}>
                  <SelectTrigger className="w-full sm:w-[250px]">
                    <SelectValue placeholder="Filter by Constituency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Constituencies</SelectItem>
                    {[...constituencyOptions].sort((a,b) => a.localeCompare(b)).map((constituency) => (
                      <SelectItem key={constituency} value={constituency}>{constituency}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative flex-grow w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input placeholder="Global text search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button variant="secondary" onClick={handleResetFilters} className="w-full sm:w-auto"><RotateCcw className="mr-2 h-4 w-4" />Reset</Button>
                    <Button onClick={handleExportExcel} disabled={filteredReportRows.length === 0} className="w-full sm:w-auto"><FileDown className="mr-2 h-4 w-4" />Export</Button>
                </div>
             </div>
        </CardContent>
      </Card>

      <div className="print-only-block my-4 text-center">
        <p className="font-semibold text-sm text-foreground mb-1">GWD Kollam - Report</p>
        {(currentDate && currentTime) && (<p className="text-xs text-muted-foreground">Report generated on: {currentDate} at {currentTime}</p>)}
      </div>
      
       <Card className="card-for-print shadow-lg">
         <div className="relative max-h-[70vh] overflow-auto">
            <Table>
                <TableHeader className="sticky top-0 bg-secondary">
                    <TableRow>
                        <TableHead className="w-[6%]">Sl. No.</TableHead>
                        <TableHead className="w-[12%]">File No</TableHead>
                        <TableHead className="w-[20%]">Applicant Name</TableHead>
                        <TableHead className="w-[20%]">Site Name</TableHead>
                        <TableHead className="w-[10%]">Date of Remittance</TableHead>
                        <TableHead className="w-[12%]">File Status</TableHead>
                        <TableHead className="w-[12%]">Site Work Status</TableHead>
                        <TableHead className="text-center w-[8%]">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <ReportTable
                    data={paginatedReportRows}
                    onViewDetailsClick={handleOpenViewDialog}
                    currentPage={currentPage}
                    itemsPerPage={ITEMS_PER_PAGE}
                />
            </Table>
          </div>
          <CardFooter className="p-4 border-t flex items-center justify-center">
              {totalPages > 1 && (
                  <PaginationControls 
                      currentPage={currentPage} 
                      totalPages={totalPages} 
                      onPageChange={handlePageChange} 
                  />
              )}
          </CardFooter>
      </Card>

      {/* View Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent onPointerDownOutside={(e) => e.preventDefault()} className="sm:max-w-4xl p-0 flex flex-col h-[90vh]">
          <DialogHeader className="p-6 pb-4 border-b">
            <DialogTitle>File Details: {viewItem?.fileNo}</DialogTitle>
            <DialogDescription>
              Comprehensive information for the selected file entry.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            <ScrollArea className="h-full px-6 py-4">
            <div className="space-y-6">
              <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-primary border-b pb-2 mb-3">Application Details</h3>
                  {renderDetail("File No", viewItem?.fileNo)}
                  {renderDetail("Name & Address of Applicant", viewItem?.applicantName)}
                  {renderDetail("Phone No", viewItem?.phoneNo)}
                  {renderDetail("Secondary Mobile No", viewItem?.secondaryMobileNo)}
                  {renderDetail("Constituency (LAC)", viewItem?.constituency)}
                  {renderDetail("Type of Application", viewItem?.applicationType ? applicationTypeDisplayMap[viewItem.applicationType as ApplicationType] : "N/A")}
              </div>

              <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-primary border-b pb-2 mb-3">Remittance Details</h3>
                  {viewItem?.remittanceDetails && viewItem.remittanceDetails.length > 0 ? (
                    viewItem.remittanceDetails.map((rd, index) => (
                      <div key={`remit-${index}`} className="mb-2 p-3 border rounded-md bg-secondary/30">
                        <h4 className="text-base font-semibold mb-2 text-muted-foreground">Remittance #{index + 1}</h4>
                        {renderDetail("Amount Remitted (₹)", rd.amountRemitted)}
                        {renderDetail("Date of Remittance", rd.dateOfRemittance)}
                        {renderDetail("Remitted Account", rd.remittedAccount)}
                      </div>
                    ))
                  ) : (<p className="text-sm text-muted-foreground">No remittance details available.</p>)}
                  {renderDetail("Total Remittance (₹)", viewItem?.totalRemittance)}
                </div>
              
              <div className="space-y-2">
                   <h3 className="text-lg font-semibold text-primary border-b pb-2 mb-3">Site Details</h3>
                   {viewItem?.siteDetails && viewItem.siteDetails.length > 0 ? (
                      viewItem.siteDetails.map((site, index) => {
                        const purpose = site.purpose as SitePurpose;
                        const isWellPurpose = ['BWC', 'TWC', 'FPW'].includes(purpose);
                        const isDevPurpose = ['BW Dev', 'TW Dev', 'FPW Dev'].includes(purpose);
                        const isMWSSSchemePurpose = ['MWSS', 'MWSS Ext', 'Pumping Scheme', 'MWSS Pump Reno'].includes(purpose);
                        const isHPSPurpose = ['HPS', 'HPR'].includes(purpose);
                        const isARSPurpose = ['ARS'].includes(purpose);

                        return (
                          <div key={`site-${index}`} className="mb-4 p-4 border rounded-lg bg-secondary/30 space-y-2">
                            <h4 className="text-md font-semibold text-primary">Site #{index + 1}: {site.nameOfSite}</h4>
                            <div className="space-y-1 pt-2 border-t">
                              {renderDetail("Purpose", site.purpose)}
                              {renderDetail("Latitude", site.latitude)}
                              {renderDetail("Longitude", site.longitude)}

                              {isWellPurpose && <>
                                <h5 className="text-sm font-semibold text-foreground mt-3 pt-2 border-t">Survey Details (Recommended)</h5>
                                {renderDetail("Recommended Diameter (mm)", site.surveyRecommendedDiameter)}
                                {renderDetail("Recommended TD (m)", site.surveyRecommendedTD)}
                                {purpose === 'BWC' && renderDetail("Recommended OB (m)", site.surveyRecommendedOB)}
                                {purpose === 'BWC' && renderDetail("Recommended Casing Pipe (m)", site.surveyRecommendedCasingPipe)}
                                {purpose === 'TWC' && renderDetail("Recommended Plain Pipe (m)", site.surveyRecommendedPlainPipe)}
                                {purpose === 'TWC' && renderDetail("Recommended Slotted Pipe (m)", site.surveyRecommendedSlottedPipe)}
                                {purpose === 'TWC' && renderDetail("Recommended MS Casing Pipe (m)", site.surveyRecommendedMsCasingPipe)}
                                {purpose === 'FPW' && renderDetail("Recommended Casing Pipe (m)", site.surveyRecommendedCasingPipe)}
                                {renderDetail("Survey Location", site.surveyLocation)}
                                {renderDetail("Survey Remarks", site.surveyRemarks)}

                                <h5 className="text-sm font-semibold text-foreground mt-3 pt-2 border-t">Drilling Details (Actuals)</h5>
                                {renderDetail("Actual Diameter (mm)", site.diameter)}
                                {purpose === 'TWC' && renderDetail("Pilot Drilling Depth (m)", site.pilotDrillingDepth)}
                                {renderDetail("Actual TD (m)", site.totalDepth)}
                                {purpose === 'BWC' && renderDetail("Actual OB (m)", site.surveyOB)}
                                {renderDetail("Actual Casing Pipe (m)", site.casingPipeUsed)}
                                {purpose === 'BWC' && renderDetail("Outer Casing (m)", site.outerCasingPipe)}
                                {purpose === 'BWC' && renderDetail("Inner Casing (m)", site.innerCasingPipe)}
                                {purpose === 'TWC' && renderDetail("Plain Pipe (m)", site.surveyPlainPipe)}
                                {purpose === 'TWC' && renderDetail("Slotted Pipe (m)", site.surveySlottedPipe)}
                                {purpose === 'TWC' && renderDetail("MS Casing Pipe (m)", site.outerCasingPipe)}
                                {renderDetail("Yield (LPH)", site.yieldDischarge)}
                                {renderDetail("Zone Details (m)", site.zoneDetails)}
                                {renderDetail("Static Water Level (m)", site.waterLevel)}
                                {renderDetail("Type of Rig Used", site.typeOfRig)}
                                {renderDetail("Drilling Remarks", site.drillingRemarks)}
                              </>}

                              {isDevPurpose && <>
                                <h5 className="text-sm font-semibold text-foreground mt-3 pt-2 border-t">Developing Details</h5>
                                {renderDetail("Diameter (mm)", site.diameter)}
                                {renderDetail("TD (m)", site.totalDepth)}
                                {renderDetail("Discharge (LPH)", site.yieldDischarge)}
                                {renderDetail("Water Level (m)", site.waterLevel)}
                              </>}
                              
                              {isMWSSSchemePurpose && <>
                                <h5 className="text-sm font-semibold text-foreground mt-3 pt-2 border-t">Scheme Details</h5>
                                {renderDetail("Well Discharge (LPH)", site.yieldDischarge)}
                                {renderDetail("Pump Details", site.pumpDetails)}
                                {renderDetail("Pumping Line (m)", site.pumpingLineLength)}
                                {renderDetail("Delivery Line (m)", site.deliveryLineLength)}
                                {renderDetail("Water Tank Capacity (L)", site.waterTankCapacity)}
                                {renderDetail("# Taps", site.noOfTapConnections)}
                                {renderDetail("# Beneficiaries", site.noOfBeneficiary)}
                              </>}

                              {isHPSPurpose && <>
                                <h5 className="text-sm font-semibold text-foreground mt-3 pt-2 border-t">Scheme Details</h5>
                                {renderDetail("Depth Erected (m)", site.totalDepth)}
                                {renderDetail("Water Level (m)", site.waterLevel)}
                              </>}

                               {isARSPurpose && <>
                                <h5 className="text-sm font-semibold text-foreground mt-3 pt-2 border-t">ARS Scheme Details</h5>
                                {renderDetail("Number of Structures", site.arsNumberOfStructures)}
                                {renderDetail("Storage Capacity (m³)", site.arsStorageCapacity)}
                                {renderDetail("Number of Fillings", site.arsNumberOfFillings)}
                                {renderDetail("Number of Beneficiaries", site.noOfBeneficiary)}
                              </>}

                              <h5 className="text-sm font-semibold text-foreground mt-3 pt-2 border-t">Work & Financial Details</h5>
                              {renderDetail("Site Conditions", site.siteConditions)}
                              {renderDetail("Rig Accessibility", site.accessibleRig)}
                              {renderDetail("Site Estimate (₹)", site.estimateAmount)}
                              {renderDetail("Remitted for Site (₹)", site.remittedAmount)}
                              {renderDetail("TS Amount (₹)", site.tsAmount)}
                              {renderDetail("Tender No.", site.tenderNo)}
                              {renderDetail("Contractor Name", site.contractorName)}
                              {renderDetail("Assigned Supervisor", site.supervisorName)}
                              {renderDetail("Supervisor Designation", site.supervisorDesignation)}
                              {renderDetail("Date of Completion", site.dateOfCompletion)}
                              {renderDetail("Total Expenditure (₹)", site.totalExpenditure)}
                              {renderDetail("Work Status", site.workStatus)}
                              {renderDetail("Work Remarks", site.workRemarks)}
                            </div>
                          </div>
                        )
                      })
                   ) : (<p className="text-sm text-muted-foreground">No site details available.</p>)}
                </div>

              <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-primary border-b pb-2 mb-3">Payment Details</h3>
                  {viewItem?.paymentDetails && viewItem.paymentDetails.length > 0 ? (
                    viewItem.paymentDetails.map((pd, index) => (
                      <div key={`payment-${index}`} className="mb-3 p-3 border rounded-md bg-secondary/30">
                        <h4 className="text-base font-semibold mb-2 text-muted-foreground">Payment #{index + 1}</h4>
                        {renderDetail("Date of Payment", pd.dateOfPayment)}
                        {renderDetail("Payment Account", pd.paymentAccount)}
                        {renderDetail("Revenue Head (₹)", pd.revenueHead)}
                        {renderDetail("Contractor's Payment (₹)", pd.contractorsPayment)}
                        {renderDetail("GST (₹)", pd.gst)}
                        {renderDetail("Income Tax (₹)", pd.incomeTax)}
                        {renderDetail("KBCWB (₹)", pd.kbcwb)}
                        {renderDetail("Refund to Party (₹)", pd.refundToParty)}
                        {renderDetail("Payment Remarks", pd.paymentRemarks)}
                        {renderDetail("Total Payment (This Entry) (₹)", pd.totalPaymentPerEntry)}
                      </div>
                    ))
                  ) : (<p className="text-sm text-muted-foreground">No payment details available.</p>)}
                  {renderDetail("Total Payment (All Entries) (₹)", viewItem?.totalPaymentAllEntries)}
              </div>
                
              <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-primary border-b pb-2 mb-3">Overall Financial Summary</h3>
                  {renderDetail("Total Remittance (₹)", viewItem?.totalRemittance)}
                  {renderDetail("Total Payment (₹)", viewItem?.totalPaymentAllEntries)}
                  {renderDetail("Overall Balance (₹)", viewItem?.overallBalance)}
              </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-primary border-b pb-2 mb-3">Final Status</h3>
                  {renderDetail("File Status", viewItem?.fileStatus)}
                  {renderDetail("Final Remarks", viewItem?.remarks)}
                </div>
              </div>
            </ScrollArea>
           </div>
           <DialogFooter className="p-6 pt-4 border-t">
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Close
                </Button>
              </DialogClose>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
