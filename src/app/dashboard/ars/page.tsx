
// src/app/dashboard/ars/page.tsx
"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useArsEntries, type ArsEntry } from "@/hooks/useArsEntries";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { format, isValid, parse, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import ExcelJS from "exceljs";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import PaginationControls from "@/components/shared/PaginationControls";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import Link from 'next/link';
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePageHeader } from "@/hooks/usePageHeader";
import type { ArsEntryFormData, SiteWorkStatus } from "@/lib/schemas";
import { arsTypeOfSchemeOptions, constituencyOptions, arsWorkStatusOptions } from "@/lib/schemas";
import { usePageNavigation } from "@/hooks/usePageNavigation";
import { useRouter, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDataStore } from '@/hooks/use-data-store';


export const dynamic = 'force-dynamic';

// Inline SVG components
const Loader2 = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
);
const Search = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
);
const PlusCircle = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>
);
const Download = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
);
const Eye = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
);
const Edit = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
);
const Trash2 = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
);
const XCircle = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
);
const CalendarIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>
);
const ShieldAlert = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
);
const Clock = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);
const FileDown = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M12 18v-6"/><path d="m15 15-3 3-3-3"/></svg>
);


const ITEMS_PER_PAGE = 50;

const safeParseDate = (dateValue: any): Date | null => {
  if (!dateValue) return null;
  if (dateValue instanceof Date && isValid(dateValue)) {
    return dateValue;
  }
  if (typeof dateValue === 'string') {
    const parsed = new Date(dateValue);
    if (isValid(parsed)) return parsed;
  }
  // Fallback for other potential date-like objects from Firestore
  if (typeof dateValue === 'object' && dateValue.toDate) {
    const parsed = dateValue.toDate();
    if (isValid(parsed)) return parsed;
  }
  return null;
};

const formatDateSafe = (dateInput: any): string => {
  if (!dateInput) return '';
  const date = safeParseDate(dateInput);
  return date ? format(date, 'dd/MM/yyyy') : '';
};

// New helper function for color coding
const getStatusRowClass = (status: SiteWorkStatus | undefined | null): string => {
    if (!status) return "";
    
    const completedOrFailed: SiteWorkStatus[] = ["Work Completed", "Bill Prepared", "Payment Completed", "Utilization Certificate Issued", "Work Failed"];
    if (completedOrFailed.includes(status as SiteWorkStatus)) {
        return 'bg-red-500/5 hover:bg-red-500/15 text-red-700';
    }
    
    if (status === 'To be Refunded') {
        return 'bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-700';
    }
    
    // For all other statuses, including ongoing ones
    return 'bg-green-500/5 hover:bg-green-500/15 text-green-700';
};


// Helper component for the view dialog
const DetailRow = ({ label, value }: { label: string; value: any }) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  let displayValue = String(value);
  if (value instanceof Date) {
    displayValue = formatDateSafe(value);
  } else if (label.toLowerCase().includes('date')) {
    displayValue = formatDateSafe(value);
  } else if (typeof value === 'number') {
    displayValue = value.toLocaleString('en-IN');
  }
  return (
    <div className="grid grid-cols-2 gap-2 py-1.5 border-b border-muted/50 last:border-b-0">
      <p className="font-medium text-sm text-muted-foreground">{label}:</p>
      <p className="text-sm text-foreground break-words">{displayValue}</p>
    </div>
  );
};

export default function ArsPage() {
  const { setHeader } = usePageHeader();
  useEffect(() => {
    setHeader('Artificial Recharge Schemes (ARS)', 'A dedicated module for managing all ARS sites, including data entry, reporting, and bulk imports.');
  }, [setHeader]);
  
  const { arsEntries, isLoading: entriesLoading, refreshArsEntries, deleteArsEntry, clearAllArsData, addArsEntry } = useArsEntries();
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const canEdit = user?.role === 'editor';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setIsNavigating } = usePageNavigation();
  
  const [currentPage, setCurrentPage] = useState(1);
  useEffect(() => {
    const page = searchParams?.get('page');
    if (page && !isNaN(parseInt(page))) {
      setCurrentPage(parseInt(page));
    }
  }, [searchParams]);

  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [schemeTypeFilter, setSchemeTypeFilter] = useState<string>('all');
  const [constituencyFilter, setConstituencyFilter] = useState<string>('all');

  const [isUploading, setIsUploading] = useState(false);
  
  const [viewingSite, setViewingSite] = useState<ArsEntry | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  const [deletingSite, setDeletingSite] = useState<ArsEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [isClearAllDialogOpen, setIsClearAllDialogOpen] = useState(false);
  
  const handleAddNewClick = () => {
    setIsNavigating(true);
    router.push('/dashboard/ars/entry');
  };
  
  const handleViewClick = (siteId: string) => {
    const pageParam = currentPage > 1 ? `?page=${currentPage}` : '';
    router.push(`/dashboard/ars/entry?id=${siteId}${pageParam ? `&${pageParam.substring(1)}` : ''}`);
  };

  const { filteredSites, lastCreatedDate } = useMemo(() => {
    let sites: ArsEntry[] = [...arsEntries];
    
    if (schemeTypeFilter !== 'all') {
      sites = sites.filter(site => site.arsTypeOfScheme === schemeTypeFilter);
    }
    
    if (constituencyFilter !== 'all') {
      sites = sites.filter(site => site.constituency === constituencyFilter);
    }

    if (startDate || endDate) {
      const sDate = startDate ? startOfDay(parse(startDate, 'yyyy-MM-dd', new Date())) : null;
      const eDate = endDate ? endOfDay(parse(endDate, 'yyyy-MM-dd', new Date())) : null;

      sites = sites.filter(site => {
        const completionValue = site.dateOfCompletion;
        if (!completionValue) return false;
        
        const completionDate = safeParseDate(completionValue);

        if (!completionDate || !isValid(completionDate)) return false;

        if (sDate && eDate) return isWithinInterval(completionDate, { start: sDate, end: eDate });
        if (sDate) return completionDate >= sDate;
        if (eDate) return completionDate <= eDate;
        return false;
      });
    }

    const lowercasedFilter = searchTerm.toLowerCase();
    if (lowercasedFilter) {
      sites = sites.filter(site => {
        // Robust search through specific fields
        const searchableContent = [
          site.fileNo,
          site.nameOfSite,
          site.constituency,
          site.arsTypeOfScheme,
          site.localSelfGovt,
          site.arsBlock,
          site.arsStatus,
          site.supervisorName,
          site.workRemarks
        ].filter(Boolean).map(String).join(' ').toLowerCase();

        return searchableContent.includes(lowercasedFilter);
      });
    }
    
    sites.sort((a, b) => {
        const dateA = a.createdAt ? safeParseDate(a.createdAt) : null;
        const dateB = b.createdAt ? safeParseDate(b.createdAt) : null;

        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        if (!isValid(dateA)) return 1;
        if (!isValid(dateB)) return -1;

        return dateB.getTime() - dateA.getTime();
    });

    const lastCreated = sites.reduce((latest, entry) => {
        const createdAt = (entry as any).createdAt ? safeParseDate((entry as any).createdAt) : null;
        if (createdAt && (!latest || createdAt > latest)) {
            return createdAt;
        }
        return latest;
    }, null as Date | null);

    return { filteredSites: sites, lastCreatedDate: lastCreated };
  }, [arsEntries, searchTerm, startDate, endDate, schemeTypeFilter, constituencyFilter, user]);

  useEffect(() => {
    const pageFromUrl = searchParams?.get('page');
    const pageNum = pageFromUrl ? parseInt(pageFromUrl, 10) : 1;
    if (!isNaN(pageNum) && pageNum > 0) {
      setCurrentPage(pageNum);
    } else {
      setCurrentPage(1);
    }
  }, [searchParams]);

  useEffect(() => {
    const newTotalPages = Math.ceil(filteredSites.length / ITEMS_PER_PAGE);
    if (currentPage > newTotalPages && newTotalPages > 0) {
      setCurrentPage(newTotalPages);
    } else if (currentPage === 0 && newTotalPages > 0) {
      setCurrentPage(1);
    }
  }, [filteredSites.length, currentPage]);

  const paginatedSites = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredSites.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredSites, currentPage]);
  
  const totalPages = Math.ceil(filteredSites.length / ITEMS_PER_PAGE);
  
  const handleDeleteSite = async () => {
    if (!deletingSite || !deletingSite.id) return;
    setIsDeleting(true);
    try {
      await deleteArsEntry(deletingSite.id);
      toast({ title: "ARS Site Deleted", description: `Site "${deletingSite.nameOfSite}" has been removed.` });
      refreshArsEntries();
    } catch (error: any) {
      toast({ title: "Deletion Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setDeletingSite(null);
    }
  };
  
  const handleClearAllArs = async () => {
    setIsClearingAll(true);
    try {
        await clearAllArsData();
        toast({ title: "All ARS Data Cleared", description: "All ARS sites have been removed from the database."});
        refreshArsEntries();
    } catch (error: any) {
        toast({ title: "Clearing Failed", description: error.message, variant: "destructive" });
    } finally {
        setIsClearingAll(false);
        setIsClearAllDialogOpen(false);
    }
  };

  const handleExportExcel = useCallback(async () => {
    if (filteredSites.length === 0) {
      toast({ title: "No Data", description: "There is no data to export." });
      return;
    }
    const reportTitle = "Artificial Recharge Schemes (ARS) Report";
    const fileNamePrefix = "gwd_ars_report";
    
    const headers = [
      "Sl. No.", "File No", "Name of Site", "Constituency (LAC)", "Type of Scheme", 
      "Local Self Govt.", "Block", "Latitude", "Longitude", "Number of Structures", 
      "Storage Capacity (m3)", "No. of Fillings", "AS/TS Accorded Details", 
      "AS/TS Amount (₹)", "Sanctioned Date", "Tendered Amount (₹)", "Awarded Amount (₹)", 
      "Present Status", "Completion Date", "No. of Beneficiaries", "Remarks"
    ];

    const dataForExport = filteredSites.map((site, index) => ({
      "Sl. No.": index + 1,
      "File No": site.fileNo || 'N/A',
      "Name of Site": site.nameOfSite || 'N/A',
      "Constituency (LAC)": site.constituency || 'N/A',
      "Type of Scheme": site.arsTypeOfScheme || 'N/A',
      "Local Self Govt.": site.localSelfGovt || 'N/A',
      "Block": site.arsBlock || 'N/A',
      "Latitude": site.latitude ?? 'N/A',
      "Longitude": site.longitude ?? 'N/A',
      "Number of Structures": site.arsNumberOfStructures ?? 'N/A',
      "Storage Capacity (m3)": site.arsStorageCapacity ?? 'N/A',
      "No. of Fillings": site.arsNumberOfFillings ?? 'N/A',
      "AS/TS Accorded Details": site.arsAsTsDetails || 'N/A',
      "AS/TS Amount (₹)": site.tsAmount ?? 'N/A',
      "Sanctioned Date": formatDateSafe(site.arsSanctionedDate),
      "Tendered Amount (₹)": site.arsTenderedAmount ?? 'N/A',
      "Awarded Amount (₹)": site.arsAwardedAmount ?? 'N/A',
      "Present Status": site.arsStatus || 'N/A',
      "Completion Date": formatDateSafe(site.dateOfCompletion),
      "No. of Beneficiaries": site.noOfBeneficiary || 'N/A',
      "Remarks": site.workRemarks || 'N/A',
    }));

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("ARSReport");

    worksheet.addRow(["Ground Water Department, Kollam"]).commit();
    worksheet.addRow([reportTitle]).commit();
    worksheet.addRow([`Report generated on: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`]).commit();
    worksheet.addRow([]).commit(); // Spacer

    worksheet.mergeCells('A1:U1');
    worksheet.mergeCells('A2:U2');
    worksheet.mergeCells('A3:U3');
    worksheet.getCell('A1').alignment = { horizontal: 'center' };
    worksheet.getCell('A2').alignment = { horizontal: 'center' };
    worksheet.getCell('A3').alignment = { horizontal: 'center' };

    worksheet.getRow(1).font = { bold: true, size: 16 };
    worksheet.getRow(2).font = { bold: true, size: 14 };

    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true };
    headerRow.eachCell(cell => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'F0F0F0' }
      };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
    
    dataForExport.forEach(row => {
        const values = headers.map(header => row[header as keyof typeof row]);
        const newRow = worksheet.addRow(values);
        newRow.eachCell(cell => {
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });
    });

    worksheet.columns.forEach((column, i) => {
        let maxLength = 0;
        column.eachCell!({ includeEmpty: true }, (cell) => {
            let columnLength = cell.value ? cell.value.toString().length : 10;
            if (columnLength > maxLength) {
                maxLength = columnLength;
            }
        });
        column.width = maxLength < 10 ? 10 : maxLength + 2;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileNamePrefix}_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({ title: "Excel Exported", description: `Report downloaded.` });
  }, [filteredSites, toast]);

  const handleDownloadTemplate = async () => {
    const templateData = [ { "File No": "Example/123", "Name of Site": "Sample ARS Site", "Constituency": "Kollam", "Type of Scheme": "Check Dam", "Local Self Govt.": "Sample Panchayath", "Block": "Sample Block", "Latitude": 8.8932, "Longitude": 76.6141, "Number of Structures": 1, "Storage Capacity (m3)": 500, "No. of Fillings": 2, "Estimate Amount": 500000, "AS/TS Accorded Details": "GO(Rt) No.123/2023/WRD", "AS/TS Amount": 450000, "Sanctioned Date": "15/01/2023", "Tendered Amount": 445000, "Awarded Amount": 440000, "Present Status": "Work in Progress", "Completion Date": "", "Expenditure (₹)": 200000, "No. of Beneficiaries": "50 families", "Remarks": "Work ongoing", } ];
    const headers = Object.keys(templateData[0]);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("ARS_Template");

    worksheet.addRow(headers).font = { bold: true };
    worksheet.addRow(Object.values(templateData[0]));
    
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

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "GWD_ARS_Upload_Template.xlsx";
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: "Template Downloaded", description: "The Excel template has been downloaded." });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    
    try {
        const workbook = new ExcelJS.Workbook();
        const buffer = await file.arrayBuffer();
        await workbook.xlsx.load(buffer);
        const worksheet = workbook.worksheets[0];

        if (!worksheet) throw new Error("No worksheets found in the Excel file.");

        const jsonData: any[] = [];
        const headerRow = worksheet.getRow(1);
        if(!headerRow.values || headerRow.values.length === 1) throw new Error("The Excel file seems to be empty or has no header row.");
        
        const headers = (headerRow.values as string[]).slice(1);

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1) {
                const rowData: Record<string, any> = {};
                row.eachCell((cell, colNumber) => {
                    const header = headers[colNumber - 1];
                    rowData[header] = cell.value;
                });
                jsonData.push(rowData);
            }
        });

        if (jsonData.length === 0) throw new Error("The selected Excel file has no data rows.");

        let successCount = 0;
        let errorCount = 0;

        for (const rowData of jsonData) {
          try {
            const parseDate = (dateValue: any): Date | undefined => {
                if (!dateValue) return undefined;
                if (dateValue instanceof Date && isValid(dateValue)) {
                  return dateValue;
                }
                const d = parse(String(dateValue), 'dd/MM/yyyy', new Date());
                return isValid(d) ? d : undefined;
            };

            const expenditureValue = String((rowData as any)['Expenditure (₹)'] || '');
            const cleanedExpenditure = expenditureValue.replace(/[^0-9.]/g, '');

            const newEntry: ArsEntryFormData = {
              fileNo: String((rowData as any)['File No'] || `Imported ${Date.now()}`),
              nameOfSite: String((rowData as any)['Name of Site'] || `Imported Site ${Date.now()}`),
              constituency: (rowData as any)['Constituency'] || undefined,
              arsTypeOfScheme: (rowData as any)['Type of Scheme'] || undefined,
              localSelfGovt: String((rowData as any)['Local Self Govt.'] || ''),
              arsBlock: String((rowData as any)['Block'] || ''),
              latitude: Number((rowData as any)['Latitude']) || undefined,
              longitude: Number((rowData as any)['Longitude']) || undefined,
              arsNumberOfStructures: Number((rowData as any)['Number of Structures']) || undefined,
              arsStorageCapacity: Number((rowData as any)['Storage Capacity (m3)']) || undefined,
              arsNumberOfFillings: Number((rowData as any)['No. of Fillings']) || undefined,
              estimateAmount: Number((rowData as any)['Estimate Amount']) || undefined,
              arsAsTsDetails: String((rowData as any)['AS/TS Accorded Details'] || ''),
              tsAmount: Number((rowData as any)['AS/TS Amount']) || undefined,
              arsSanctionedDate: parseDate((rowData as any)['Sanctioned Date']),
              arsTenderedAmount: Number((rowData as any)['Tendered Amount']) || undefined,
              arsAwardedAmount: Number((rowData as any)['Awarded Amount']) || undefined,
              arsStatus: (rowData as any)['Present Status'] || undefined,
              dateOfCompletion: parseDate((rowData as any)['Completion Date']),
              totalExpenditure: cleanedExpenditure ? Number(cleanedExpenditure) : undefined,
              noOfBeneficiary: String((rowData as any)['No. of Beneficiaries'] || ''),
              workRemarks: String((rowData as any)['Remarks'] || ''),
              supervisorName: null,
              supervisorUid: null
            };

            await addArsEntry(newEntry);
            successCount++;
          } catch(e) {
            console.error("Failed to process row:", rowData, e);
            errorCount++;
          }
        }
        
        toast({ title: "Import Complete", description: `${successCount} sites imported successfully. ${errorCount} rows failed.` });
        refreshArsEntries();
      } catch (error: any) {
        toast({ title: "Import Failed", description: error.message, variant: "destructive" });
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
  };
  
  if (entriesLoading || authLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading ARS data...</p>
      </div>
    );
  }

  const startEntryNum = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endEntryNum = Math.min(currentPage * ITEMS_PER_PAGE, filteredSites.length);

  return (
    <div className="space-y-6">
      <TooltipProvider>
       <Card>
        <CardContent className="p-4 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative flex-grow min-w-[250px] order-2 sm:order-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input type="search" placeholder="Search across all fields..." className="w-full rounded-lg bg-background pl-10 shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <div className="flex flex-wrap items-center gap-2 order-1 sm:order-2">
                  {(canEdit) && <Button size="sm" onClick={handleAddNewClick}> <PlusCircle className="mr-2 h-4 w-4" /> Add New ARS </Button>}
                  <Button variant="outline" onClick={handleExportExcel} size="sm"> <FileDown className="mr-2 h-4 w-4" /> Export Excel </Button>
                  {canEdit && ( <> 
                      <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".xlsx, .xls" /> 
                      <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading} size="sm"> 
                          {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                          {isUploading ? 'Importing...' : 'Import Excel'}
                      </Button> 
                      <Button variant="outline" onClick={handleDownloadTemplate} size="sm"> <Download className="mr-2 h-4 w-4" /> Template </Button> 
                      <Button variant="destructive" onClick={() => setIsClearAllDialogOpen(true)} disabled={isClearingAll || arsEntries.length === 0} size="sm"> <Trash2 className="mr-2 h-4 w-4" /> Clear All</Button> 
                  </> )}
                </div>
            </div>
            <div className="border-t pt-4 mt-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                  <Input
                      type="date"
                      placeholder="dd-mm-yyyy"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-auto"
                  />
                  <Input
                      type="date"
                      placeholder="dd-mm-yyyy"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-auto"
                  />
                  <Select value={schemeTypeFilter} onValueChange={setSchemeTypeFilter}>
                      <SelectTrigger className="w-auto min-w-[200px]">
                          <SelectValue placeholder="Filter by Type of Scheme" />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="all">All Scheme Types</SelectItem>
                          {arsTypeOfSchemeOptions.map((scheme) => (
                          <SelectItem key={scheme} value={scheme}>{scheme}</SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
                  <Select value={constituencyFilter} onValueChange={setConstituencyFilter}>
                      <SelectTrigger className="w-auto min-w-[200px]">
                          <SelectValue placeholder="Filter by Constituency" />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="all">All Constituencies</SelectItem>
                          {[...constituencyOptions].sort((a,b) => a.localeCompare(b)).map((constituency) => (
                          <SelectItem key={constituency} value={constituency}>{constituency}</SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
                <Button onClick={() => {setStartDate(""); setEndDate(""); setSchemeTypeFilter("all"); setConstituencyFilter("all");}} variant="ghost" className="h-9 px-3"><XCircle className="mr-2 h-4 w-4"/>Clear Filters</Button>
              </div>
              <div className="flex justify-between items-center gap-4">
                   <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="font-semibold">Row Color Legend:</span>
                        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-500/80"></div><span>Ongoing</span></div>
                        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-yellow-500/80"></div><span>To be Refunded</span></div>
                        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-500/80"></div><span>Completed / Failed</span></div>
                   </div>
                   <div className="flex items-center gap-4">
                        <div className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                            Total Sites: <span className="font-bold text-primary">{filteredSites.length}</span>
                        </div>
                        {lastCreatedDate && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                                <Clock className="h-3.5 w-3.5"/>
                                Last created: <span className="font-semibold text-primary/90">{format(lastCreatedDate, 'dd/MM/yy, hh:mm a')}</span>
                            </div>
                        )}
                    </div>
              </div>
            </div>
        </CardContent>
       </Card>
      
        <Card className="shadow-lg">
            <CardContent className="p-0">
                {totalPages > 1 && (
                    <div className="p-4 border-b flex items-center justify-center">
                        <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                    </div>
                )}
                <div className="max-h-[70vh] overflow-auto">
                    <Table>
                        <TableHeader className="bg-secondary sticky top-0">
                            <TableRow>
                                <TableHead>Sl. No.</TableHead>
                                <TableHead>File No</TableHead>
                                <TableHead>Name of Site</TableHead>
                                <TableHead>Type of Scheme</TableHead>
                                <TableHead>Local Self Govt.</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Completion Date</TableHead>
                                <TableHead className="text-center w-[120px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedSites.length > 0 ? (
                                paginatedSites.map((site, index) => {
                                    return (
                                        <TableRow key={site.id} className={getStatusRowClass(site.arsStatus as SiteWorkStatus)}>
                                            <TableCell className="w-[80px]">{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</TableCell>
                                            <TableCell className="w-[150px] font-medium">{site.fileNo}</TableCell>
                                            <TableCell className="font-semibold whitespace-normal break-words">
                                              {site.nameOfSite}
                                            </TableCell>
                                            <TableCell className="whitespace-normal break-words">
                                              {site.arsTypeOfScheme || 'N/A'}
                                            </TableCell>
                                            <TableCell className="whitespace-normal break-words">{site.localSelfGovt || 'N/A'}</TableCell>
                                            <TableCell>{site.arsStatus ?? 'N/A'}</TableCell>
                                            <TableCell>{formatDateSafe(site.dateOfCompletion)}</TableCell>
                                            <TableCell className="text-center w-[120px]">
                                                <div className="flex items-center justify-center space-x-1">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button variant="ghost" size="icon" onClick={() => handleViewClick(site.id!)}>
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent><p>{canEdit ? "View / Edit" : "View Details"}</p></TooltipContent>
                                                    </Tooltip>
                                                    {canEdit && (
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/90" onClick={() => setDeletingSite(site)}>
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent><p>Delete Site</p></TooltipContent>
                                                        </Tooltip>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center">
                                        No ARS sites found {searchTerm || startDate || endDate || schemeTypeFilter !== 'all' ? "matching your search criteria" : ""}.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                {totalPages > 1 && (
                    <div className="p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
                        <p className="text-sm text-muted-foreground">
                            Showing <strong>{filteredSites.length > 0 ? startEntryNum : 0}</strong>-<strong>{endEntryNum}</strong> of <strong>{filteredSites.length}</strong> sites.
                        </p>
                        <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                    </div>
                )}
            </CardContent>
        </Card>
      </TooltipProvider>
      
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>ARS Site Details</DialogTitle>
              <DialogDescription>
                Viewing details for {viewingSite?.nameOfSite}.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 py-4 px-6">
              {viewingSite && (
                <>
                  <div>
                    <h4 className="text-base font-semibold text-primary mb-2 border-b pb-1">Site Identification</h4>
                    <DetailRow label="File No" value={viewingSite.fileNo} />
                    <DetailRow label="Name of Site" value={viewingSite.nameOfSite} />
                    <DetailRow label="Local Self Govt" value={viewingSite.localSelfGovt} />
                    <DetailRow label="Constituency (LAC)" value={viewingSite.constituency} />
                    <DetailRow label="Block" value={viewingSite.arsBlock} />
                    <DetailRow label="Latitude" value={viewingSite.latitude} />
                    <DetailRow label="Longitude" value={viewingSite.longitude} />
                  </div>
                  <div>
                    <h4 className="text-base font-semibold text-primary mb-2 border-b pb-1">Scheme Details</h4>
                    <DetailRow label="Type of Scheme" value={viewingSite.arsTypeOfScheme} />
                    <DetailRow label="Number of Structures" value={viewingSite.arsNumberOfStructures} />
                    <DetailRow label="Storage Capacity (m3)" value={viewingSite.arsStorageCapacity} />
                    <DetailRow label="No. of Fillings" value={viewingSite.arsNumberOfFillings} />
                    <DetailRow label="No. of Beneficiaries" value={viewingSite.noOfBeneficiary} />
                  </div>
                  <div>
                    <h4 className="text-base font-semibold text-primary mb-2 border-b pb-1">Financials & Status</h4>
                    <DetailRow label="AS/TS Accorded Details" value={viewingSite.arsAsTsDetails} />
                    <DetailRow label="Sanctioned Date" value={viewingSite.arsSanctionedDate} />
                    <DetailRow label="AS/TS Amount (₹)" value={viewingSite.tsAmount} />
                    <DetailRow label="Tendered Amount (₹)" value={viewingSite.arsTenderedAmount} />
                    <DetailRow label="Awarded Amount (₹)" value={viewingSite.arsAwardedAmount} />
                    <DetailRow label="Present Status" value={viewingSite.arsStatus} />
                    <DetailRow label="Completion Date" value={viewingSite.dateOfCompletion} />
                    <DetailRow label="Expenditure (₹)" value={viewingSite.totalExpenditure} />
                    <DetailRow label="Remarks" value={viewingSite.workRemarks} />
                  </div>
                </>
              )}
            </div>
            </ScrollArea>
            <DialogFooter>
              <DialogClose asChild><Button>Close</Button></DialogClose>
            </DialogFooter>
          </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingSite} onOpenChange={() => setDeletingSite(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This action will permanently delete the ARS site "{deletingSite?.nameOfSite}". This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteSite} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">{isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Delete"}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isClearAllDialogOpen} onOpenChange={setIsClearAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete ALL ARS sites from the database. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClearingAll}>No, Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleClearAllArs} 
              disabled={isClearingAll} 
              className="bg-destructive hover:bg-destructive/90"
            >
              {isClearingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Yes, Clear All ARS Data"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

    

    
