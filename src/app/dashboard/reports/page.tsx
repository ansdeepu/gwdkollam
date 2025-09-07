
// src/app/dashboard/reports/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, parseISO, startOfDay, endOfDay, isValid, parse } from "date-fns";
import { FileText, Filter, RotateCcw, Loader2, FileDown, Eye } from "lucide-react";
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
} from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { useFileEntries } from "@/hooks/useFileEntries";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import { usePageHeader } from "@/hooks/usePageHeader";
import { Table, TableHead, TableHeader, TableRow } from "@/components/ui/table";


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
    displayValue = value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

    const reportType = searchParams.get("reportType");
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
          const targetDate = targetDateValue instanceof Date ? targetDateValue : parseISO(targetDateValue as any);
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
          entry.fileNo, entry.applicantName, entry.phoneNo, appTypeDisplay, entry.fileStatus, entry.remarks
        ].filter(Boolean).map(val => String(val).toLowerCase());
        if (mainFieldsToSearch.some(field => field.includes(lowerSearchTerm))) return true;
        if (entry.siteDetails?.some(site => [
            site.nameOfSite, site.accessibleRig, site.tenderNo, site.purpose, site.typeOfRig, site.contractorName, site.supervisorName, site.workStatus, site.workRemarks, site.zoneDetails, site.pumpDetails, site.waterTankCapacity,
          ].filter(Boolean).map(val => String(val).toLowerCase()).some(field => field.includes(lowerSearchTerm))
        )) return true;
        if (entry.remittanceDetails?.some(rd => rd.remittedAccount?.toLowerCase().includes(lowerSearchTerm))) return true;
        if (entry.paymentDetails?.some(pd => pd.paymentRemarks?.toLowerCase().includes(lowerSearchTerm))) return true;
        return false;
      });
    }

    // --- End Filtering `currentEntries` ---

    // --- Start Flattening logic ---
    const flattenedRows: FlattenedReportRow[] = [];
    const isFileLevelFilterActive = statusFilter !== "all" || (dateFilterType !== "all" && (!!startDate || !!endDate));
    const isSiteLevelFilterActive = workCategoryFilter !== "all" || serviceTypeFilter !== "all" || typeOfRigFilter !== "all" || applicationTypeFilter !== "all";

    currentEntries.forEach(entry => {
      const fileFirstRemittanceDateStr = entry.remittanceDetails?.[0]?.dateOfRemittance;
      const fileFirstRemittanceDate = fileFirstRemittanceDateStr && isValid(new Date(fileFirstRemittanceDateStr))
        ? format(new Date(fileFirstRemittanceDateStr), "dd/MM/yyyy")
        : "-";

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
    applicationTypeFilter, typeOfRigFilter, searchParams
  ]);

  useEffect(() => {
    if (entriesLoading || authIsLoading) return;
    const statusFromQuery = searchParams.get("status");
    const workCategoryFromQuery = searchParams.get("workCategory");
    const serviceTypeFromQuery = searchParams.get("serviceType");
    
    setStatusFilter(statusFromQuery && fileStatusOptions.includes(statusFromQuery as any) ? statusFromQuery : "all");
    setWorkCategoryFilter(workCategoryFromQuery && siteWorkStatusOptions.includes(workCategoryFromQuery as any) ? workCategoryFromQuery : "all");
    setServiceTypeFilter(serviceTypeFromQuery && (sitePurposeOptions.includes(serviceTypeFromQuery as any) || serviceTypeFromQuery === 'all') ? serviceTypeFromQuery : "all");

  }, [searchParams, entriesLoading, authIsLoading]);


  useEffect(() => {
    if (!entriesLoading && !authIsLoading) applyFilters();
  }, [
    searchTerm, statusFilter, serviceTypeFilter, workCategoryFilter, 
    dateFilterType, startDate, endDate, entriesLoading, fileEntries, applyFilters,
    applicationTypeFilter, typeOfRigFilter, searchParams, authIsLoading, user
  ]);
  
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredReportRows]);
  
  const paginatedReportRows = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredReportRows.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredReportRows, currentPage]);
  
  const totalPages = Math.ceil(filteredReportRows.length / ITEMS_PER_PAGE);


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
    
    const currentParams = new URLSearchParams(searchParams.toString());
    currentParams.delete("reportType");
    currentParams.delete("status"); 
    currentParams.delete("workCategory");
    currentParams.delete("serviceType");
    router.replace(`/dashboard/reports?${currentParams.toString()}`, { scroll: false });
    toast({ title: "Filters Reset", description: "All report filters have been cleared." });
  };

  const handleExportExcel = () => {
    const reportTitle = "Custom Report";
    const columnLabels = [ "File No", "Applicant Name", "Date of Remittance", "Site Purpose", "File Status", "Site Name", "Site Work Status", "Site Total Expenditure (₹)" ];
    const dataRows = filteredReportRows.map(row => [
        row.fileNo, row.applicantName, row.fileFirstRemittanceDate, row.sitePurpose, row.fileStatus,
        row.siteName, row.siteWorkStatus, row.siteTotalExpenditure
    ]);
    const sheetName = "Report";
    const fileNamePrefix = "gwd_report";

    if (dataRows.length === 0) {
      toast({ title: "No Data to Export", description: "There is no data to export.", variant: "default" });
      return;
    }

    const wb = XLSX.utils.book_new();
    
    const headerRows = [
      ["Ground Water Department, Kollam"],
      [reportTitle],
      [`Report generated on: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`],
      [] // Blank row
    ];
    
    const numCols = columnLabels.length;
    const footerColIndex = numCols > 1 ? numCols - 2 : 0; 
    const footerRowData = new Array(numCols).fill("");
    footerRowData[footerColIndex] = "District Officer";
    
    const footerRows = [
      [], // Spacer row
      footerRowData
    ];

    const finalData = [...headerRows, columnLabels, ...dataRows, ...footerRows];
    const ws = XLSX.utils.aoa_to_sheet(finalData, { cellStyles: false });
    
    const merges = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: numCols - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: numCols - 1 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: numCols - 1 } },
    ];
    const footerRowIndex = finalData.length - 1;
    if (numCols > 1) {
        merges.push({ s: { r: footerRowIndex, c: footerColIndex }, e: { r: footerRowIndex, c: numCols - 1 } });
    }
    ws['!merges'] = merges;

    const colWidths = columnLabels.map((label, i) => ({
      wch: Math.max(
        label.length, 
        ...finalData.map(row => (row[i] ? String(row[i]).length : 0))
      ) + 2,
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
          border: { 
            top: { style: "thin" }, bottom: { style: "thin" }, 
            left: { style: "thin" }, right: { style: "thin" } 
          }
        };

        if (R < 3) {
          ws[cellRef].s.font = { bold: true, sz: R === 0 ? 16 : (R === 1 ? 14 : 12) };
          if (R === 2) ws[cellRef].s.font.italic = true;
        } else if (R === 3) { // Column headers row
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
    
    XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));
    const uniqueFileName = `${fileNamePrefix}_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
    XLSX.writeFile(wb, uniqueFileName);

    toast({ title: "Excel Exported", description: `Your report has been downloaded as ${uniqueFileName}.` });
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5 text-primary" />Report Filters</CardTitle>
          <CardDescription>Refine your report by applying various filters below.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                 <Input placeholder="Global text search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
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
             <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-4">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger><SelectValue placeholder="Filter by File Status" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All File Statuses</SelectItem>
                        {fileStatusOptions.map((status) => (<SelectItem key={status} value={status}>{status}</SelectItem>))}
                    </SelectContent>
                </Select>
                <Select value={workCategoryFilter} onValueChange={setWorkCategoryFilter}>
                    <SelectTrigger><SelectValue placeholder="Filter by Site Work Category" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Site Work Categories</SelectItem>
                        {siteWorkStatusOptions.map((category) => (<SelectItem key={category} value={category}>{category}</SelectItem>))}
                    </SelectContent>
                </Select>
                <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
                    <SelectTrigger><SelectValue placeholder="Filter by Site Service Type" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Site Service Types</SelectItem>
                        {sitePurposeOptions.map((purpose) => (<SelectItem key={purpose} value={purpose}>{purpose}</SelectItem>))}
                    </SelectContent>
                </Select>
                <Select value={applicationTypeFilter} onValueChange={setApplicationTypeFilter}>
                    <SelectTrigger><SelectValue placeholder="Filter by Application Type" /></SelectTrigger>
                    <SelectContent>
                    <SelectItem value="all">All Application Types</SelectItem>
                    {applicationTypeOptions.map((type) => (<SelectItem key={type} value={type}>{applicationTypeDisplayMap[type as ApplicationType] || type.replace(/_/g, " ")}</SelectItem>))}
                    </SelectContent>
                </Select>
                <Select value={typeOfRigFilter} onValueChange={setTypeOfRigFilter}>
                    <SelectTrigger><SelectValue placeholder="Filter by Site Type of Rig" /></SelectTrigger>
                    <SelectContent>
                    <SelectItem value="all">All Site Rig Types</SelectItem>
                    {siteTypeOfRigOptions.map((rig) => (<SelectItem key={rig} value={rig}>{rig}</SelectItem>))}
                    </SelectContent>
                </Select>
            </div>
             <CardFooter className="flex justify-end gap-2 p-0 pt-4">
                <Button variant="secondary" onClick={handleResetFilters}><RotateCcw className="mr-2 h-4 w-4" />Reset</Button>
                <Button onClick={handleExportExcel} disabled={filteredReportRows.length === 0}><FileDown className="mr-2 h-4 w-4" />Export</Button>
            </CardFooter>
        </CardContent>
      </Card>

      <div className="print-only-block my-4 text-center">
        <p className="font-semibold text-sm text-foreground mb-1">GWD Kollam - Report</p>
        {(currentDate && currentTime) && (<p className="text-xs text-muted-foreground">Report generated on: {currentDate} at {currentTime}</p>)}
      </div>
      
      <Card>
        <Table>
            <TableHeader className="bg-secondary">
              <TableRow>
                <TableHead className="px-2 w-[6%]">Sl. No.</TableHead>
                <TableHead className="px-2 w-[12%]">File No</TableHead>
                <TableHead className="px-2 w-[20%]">Applicant Name</TableHead>
                <TableHead className="px-2 w-[20%]">Site Name</TableHead>
                <TableHead className="px-2 w-[10%]">Date of Remittance</TableHead>
                <TableHead className="px-2 w-[12%]">File Status</TableHead>
                <TableHead className="px-2 w-[12%]">Site Work Status</TableHead>
                <TableHead className="text-center px-2 w-[8%]">Actions</TableHead>
              </TableRow>
            </TableHeader>
        </Table>
      </Card>
      
      <Card className="card-for-print">
        <CardContent className="max-h-[calc(100vh-32rem)] overflow-auto p-0">
          <ReportTable
              data={paginatedReportRows}
              onViewDetailsClick={handleOpenViewDialog}
              currentPage={currentPage}
              itemsPerPage={ITEMS_PER_PAGE}
          />
        </CardContent>
        <CardFooter className="p-4 border-t flex items-center justify-center">
            {totalPages > 1 && (
                <PaginationControls 
                    currentPage={currentPage} 
                    totalPages={totalPages} 
                    onPageChange={setCurrentPage} 
                />
            )}
        </CardFooter>
      </Card>

      {/* View Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>File Details: {viewItem?.fileNo}</DialogTitle>
            <DialogDescription>
              Detailed information for the selected file entry.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-5">
            <div className="space-y-3 py-4">
              <h4 className="text-md font-semibold text-primary mb-1 border-b pb-1">Main Details:</h4>
              {renderDetail("File No", viewItem?.fileNo)}
              {renderDetail("Name & Address of Applicant", viewItem?.applicantName)}
              {renderDetail("Phone No", viewItem?.phoneNo)}
              {renderDetail("Type of Application", viewItem?.applicationType ? applicationTypeDisplayMap[viewItem.applicationType as ApplicationType] : "N/A")}
              {renderDetail("Total Estimate Amount (₹)", viewItem?.estimateAmount)}
              
              {viewItem?.remittanceDetails && viewItem.remittanceDetails.length > 0 && (
                <div className="pt-2">
                  <h4 className="text-md font-semibold text-primary mb-1 border-b pb-1">Remittance Details:</h4>
                  {viewItem.remittanceDetails.map((rd, index) => (
                    <div key={index} className="mb-2 p-2 border rounded-md bg-secondary/20">
                      <h5 className="text-sm font-semibold mb-1 text-muted-foreground">Remittance #{index + 1}</h5>
                      {renderDetail("Amount Remitted (₹)", rd.amountRemitted)}
                      {renderDetail("Date of Remittance", rd.dateOfRemittance)}
                      {renderDetail("Remitted Account", rd.remittedAccount)}
                    </div>
                  ))}
                   {renderDetail("Total Remittance (All Entries) (₹)", viewItem?.totalRemittance)}
                </div>
              )}
              
              {viewItem?.siteDetails && viewItem.siteDetails.length > 0 && (
                <div className="pt-4">
                  <h4 className="text-md font-semibold text-primary mb-2 border-b pb-1">Site Details:</h4>
                  {viewItem.siteDetails.map((site, index) => {
                    const purpose = site.purpose as SitePurpose;
                    const isWellPurpose = ['BWC', 'TWC', 'FPW'].includes(purpose);
                    const isDevPurpose = ['BW Dev', 'TW Dev', 'FPW Dev'].includes(purpose);
                    const isMWSSSchemePurpose = ['MWSS', 'MWSS Ext', 'Pumping Scheme', 'MWSS Pump Reno'].includes(purpose);
                    const isHPSPurpose = ['HPS', 'HPR'].includes(purpose);

                    return (
                    <div key={index} className="mb-4 p-3 border rounded-md bg-secondary/30">
                      <h5 className="text-sm font-semibold mb-1.5">Site #{index + 1}: {site.nameOfSite}</h5>
                      <div className="space-y-1 pt-2 border-t">
                        {renderDetail("Purpose", site.purpose)}

                        {isWellPurpose && (
                          <>
                            <h6 className="text-sm font-semibold text-primary mt-2 pt-2 border-t">Survey Details</h6>
                            {renderDetail("Recommended Diameter (mm)", site.surveyRecommendedDiameter)}
                            {renderDetail("TD (m)", site.surveyRecommendedTD)}
                            {purpose === 'BWC' && renderDetail("OB (m)", site.surveyRecommendedOB)}
                            {purpose === 'BWC' && renderDetail("Casing Pipe (m)", site.surveyRecommendedCasingPipe)}
                            {purpose === 'TWC' && renderDetail("Plain Pipe (m)", site.surveyRecommendedPlainPipe)}
                            {purpose === 'TWC' && renderDetail("Slotted Pipe (m)", site.surveyRecommendedSlottedPipe)}
                            {purpose === 'TWC' && renderDetail("MS Casing Pipe (m)", site.surveyRecommendedMsCasingPipe)}
                            {purpose === 'FPW' && renderDetail("Casing Pipe (m)", site.surveyRecommendedCasingPipe)}
                            {renderDetail("Latitude", site.latitude)}
                            {renderDetail("Longitude", site.longitude)}
                            {renderDetail("Location", site.surveyLocation)}
                            {renderDetail("Remarks", site.surveyRemarks)}

                            <h6 className="text-sm font-semibold text-primary mt-2 pt-2 border-t">Drilling Details (Actuals)</h6>
                            {renderDetail("Diameter (mm)", site.diameter)}
                            {purpose === 'TWC' && renderDetail("Pilot Drilling Depth (m)", site.pilotDrillingDepth)}
                            {renderDetail("TD (m)", site.totalDepth)}
                            {purpose === 'BWC' && renderDetail("OB (m)", site.surveyOB)}
                            {renderDetail("Casing Pipe (m)", site.casingPipeUsed)}
                            {purpose === 'BWC' && renderDetail("Inner Casing Pipe (m)", site.innerCasingPipe)}
                            {purpose === 'BWC' && renderDetail("Outer Casing Pipe (m)", site.outerCasingPipe)}
                            {purpose === 'TWC' && renderDetail("Plain Pipe (m)", site.surveyPlainPipe)}
                            {renderDetail("Slotted Pipe (m)", site.surveySlottedPipe)}
                            {purpose === 'TWC' && renderDetail("MS Casing Pipe (m)", site.outerCasingPipe)}
                            {renderDetail("Discharge (LPH)", site.yieldDischarge)}
                            {renderDetail("Zone Details (m)", site.zoneDetails)}
                            {renderDetail("Water Level (m)", site.waterLevel)}
                          </>
                        )}
                        
                        {isDevPurpose && (
                          <>
                            <h6 className="text-sm font-semibold text-primary mt-2 pt-2 border-t">Developing Details</h6>
                            {renderDetail("Diameter (mm)", site.diameter)}
                            {renderDetail("TD (m)", site.totalDepth)}
                            {renderDetail("Discharge (LPH)", site.yieldDischarge)}
                            {renderDetail("Water Level (m)", site.waterLevel)}
                          </>
                        )}

                        {isMWSSSchemePurpose && (
                          <>
                            <h6 className="text-sm font-semibold text-primary mt-2 pt-2 border-t">Scheme Details</h6>
                            {renderDetail("Well Discharge (LPH)", site.yieldDischarge)}
                            {renderDetail("Pump Details", site.pumpDetails)}
                            {renderDetail("Pumping Line Length (m)", site.pumpingLineLength)}
                            {renderDetail("Delivery Line Length (m)", site.deliveryLineLength)}
                            {renderDetail("Water Tank (L)", site.waterTankCapacity)}
                            {renderDetail("Tap Connections", site.noOfTapConnections)}
                            {renderDetail("Beneficiaries", site.noOfBeneficiary)}
                          </>
                        )}
                        
                        {isHPSPurpose && (
                          <>
                            <h6 className="text-sm font-semibold text-primary mt-2 pt-2 border-t">Scheme Details</h6>
                            {renderDetail("Depth Erected (m)", site.totalDepth)}
                            {renderDetail("Water Level (m)", site.waterLevel)}
                          </>
                        )}

                        <h6 className="text-sm font-semibold text-primary mt-2 pt-2 border-t">Status & Financials</h6>
                        {renderDetail("Estimate (₹)", site.estimateAmount)}
                        {renderDetail("TS Amount (₹)", site.tsAmount)}
                        {renderDetail("Tender No.", site.tenderNo)}
                        {renderDetail("Contractor Name", site.contractorName)}
                        {renderDetail("Assigned Supervisor", site.supervisorName)}
                        {renderDetail("Date of Completion", site.dateOfCompletion)}
                        {renderDetail("Total Expenditure (₹)", site.totalExpenditure)}
                        {renderDetail("Work Status", site.workStatus)}
                        {renderDetail("Work Remarks", site.workRemarks)}
                      </div>
                    </div>
                  )})}
                </div>
              )}

              {viewItem?.paymentDetails && viewItem.paymentDetails.length > 0 && (
                <div className="pt-2">
                  <h4 className="text-md font-semibold text-primary mb-1 border-b pb-1">Payment Details:</h4>
                  {viewItem.paymentDetails.map((pd, index) => (
                     <div key={index} className="mb-3 p-3 border rounded-md bg-accent/10">
                      <h5 className="text-sm font-semibold mb-1.5 text-muted-foreground">Payment #{index + 1}</h5>
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
                  ))}
                  {renderDetail("Total Payment (All Entries) (₹)", viewItem?.totalPaymentAllEntries)}
                  {renderDetail("Overall Balance (₹)", viewItem?.overallBalance)}
                </div>
              )}
              
              <div className="pt-2">
                 <h4 className="text-md font-semibold text-primary mb-1 border-b pb-1">File Status & Remarks:</h4>
                {renderDetail("File Status", viewItem?.fileStatus)}
                {renderDetail("Final Remarks", viewItem?.remarks)}
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
