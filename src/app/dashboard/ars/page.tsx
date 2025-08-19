
// src/app/dashboard/ars/page.tsx
"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useFileEntries } from "@/hooks/useFileEntries";
import { type DataEntryFormData, type SiteDetailFormData, siteWorkStatusOptions, type Constituency, fileStatusOptions } from "@/lib/schemas";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2, Search, PlusCircle, Save, X, FileUp, Download, Eye, Edit, Trash2, ShieldAlert, CalendarIcon } from "lucide-react";
import { format, isValid, parse, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import PaginationControls from "@/components/shared/PaginationControls";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import Link from 'next/link';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";


const ITEMS_PER_PAGE = 50;

interface ArsReportRow extends SiteDetailFormData {
  id: string; // Unique identifier for the site
  fileNo?: string;
  applicantName?: string;
  constituency?: Constituency;
}

const formatDateSafe = (dateInput: any): string => {
  if (!dateInput) return 'N/A';
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  return date instanceof Date && !isNaN(date.getTime()) ? format(date, 'dd/MM/yyyy') : 'N/A';
};

export default function ArsPage() {
  const { fileEntries, isLoading: entriesLoading, addFileEntry, getFileEntry, clearAllArsData } = useFileEntries();
  const [arsSites, setArsSites] = useState<ArsReportRow[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();
  const { user } = useAuth();
  const canEdit = user?.role === 'editor';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const [isUploading, setIsUploading] = useState(false);
  
  const [viewingSite, setViewingSite] = useState<ArsReportRow | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  const [deletingSite, setDeletingSite] = useState<ArsReportRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [isClearAllDialogOpen, setIsClearAllDialogOpen] = useState(false);

  useEffect(() => {
    if (!entriesLoading) {
      const allArsSites = fileEntries.flatMap(entry => 
        (entry.siteDetails || [])
          .filter(site => site.purpose === 'ARS')
          .map((site, index) => ({
            ...site,
            id: `${entry.fileNo}-${site.nameOfSite}-${site.purpose}-${index}`,
            fileNo: entry.fileNo,
            applicantName: entry.applicantName,
            constituency: entry.constituency
          }))
      );
      
      const sortedSites = [...allArsSites].sort((a, b) => {
        const dateA = a.dateOfCompletion ? new Date(a.dateOfCompletion) : null;
        const dateB = b.dateOfCompletion ? new Date(b.dateOfCompletion) : null;
        if (dateA && isValid(dateA) && dateB && isValid(dateB)) return dateB.getTime() - dateA.getTime();
        if (dateA && isValid(dateA)) return -1;
        if (dateB && isValid(dateB)) return 1;
        return 0;
      });
      setArsSites(sortedSites);
    }
  }, [fileEntries, entriesLoading]);

  const filteredSites = useMemo(() => {
    let sites = [...arsSites];

    // Filter by date range if specified
    if (startDate || endDate) {
      const sDate = startDate ? startOfDay(startDate) : null;
      const eDate = endDate ? endOfDay(endDate) : null;
      sites = sites.filter(site => {
        const completionDate = site.dateOfCompletion ? new Date(site.dateOfCompletion) : null;
        if (!completionDate || !isValid(completionDate)) return false;
        if (sDate && eDate) return isWithinInterval(completionDate, { start: sDate, end: eDate });
        if (sDate) return completionDate >= sDate;
        if (eDate) return completionDate <= eDate;
        return false;
      });
    }

    // Filter by search term
    const lowercasedFilter = searchTerm.toLowerCase();
    if (lowercasedFilter) {
      sites = sites.filter(site => {
        const siteContent = Object.values(site).join(' ').toLowerCase();
        return siteContent.includes(lowercasedFilter);
      });
    }
    
    return sites;
  }, [arsSites, searchTerm, startDate, endDate]);


  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, startDate, endDate]);

  const paginatedSites = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredSites.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredSites, currentPage]);
  
  const totalPages = Math.ceil(filteredSites.length / ITEMS_PER_PAGE);
  
  const handleDeleteSite = async () => {
    if (!deletingSite || !deletingSite.fileNo) return;
    setIsDeleting(true);

    try {
      const fileToUpdate = getFileEntry(deletingSite.fileNo);
      if (!fileToUpdate) throw new Error("File not found for deletion.");

      const updatedSiteDetails = fileToUpdate.siteDetails?.filter(site => 
          !(site.nameOfSite === deletingSite.nameOfSite && site.purpose === 'ARS')
      );

      const updatedFile = { ...fileToUpdate, siteDetails: updatedSiteDetails };
      await addFileEntry(updatedFile, deletingSite.fileNo);
      
      toast({ title: "ARS Site Deleted", description: `Site "${deletingSite.nameOfSite}" has been removed.` });
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
    } catch (error: any) {
        toast({ title: "Clearing Failed", description: error.message, variant: "destructive" });
    } finally {
        setIsClearingAll(false);
        setIsClearAllDialogOpen(false);
    }
  };

  const handleExportExcel = useCallback(() => {
    if (filteredSites.length === 0) {
      toast({ title: "No Data", description: "There is no data to export." });
      return;
    }
    const reportTitle = "Artificial Recharge Schemes (ARS) Report";
    const sheetName = "ARSReport";
    const fileNamePrefix = "gwd_ars_report";
    
    const dataForExport = filteredSites.map((site, index) => ({
      "Sl. No.": index + 1, "File No": site.fileNo || 'N/A', "Name of Site": site.nameOfSite || 'N/A',
      "Type of Scheme": site.arsTypeOfScheme || 'N/A', "Panchayath": site.arsPanchayath || 'N/A',
      "Estimate Amount": site.estimateAmount || 'N/A',
      "Present Status": site.workStatus || 'N/A', "Completion Date": formatDateSafe(site.dateOfCompletion),
      "Expenditure": site.totalExpenditure || 'N/A', "Remarks": site.workRemarks || 'N/A',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet([]);
    const headerRows = [ ["Ground Water Department, Kollam"], [reportTitle], [`Report generated on: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`], [] ];
    XLSX.utils.sheet_add_json(ws, dataForExport, { origin: 'A5', skipHeader: false });
    XLSX.utils.sheet_add_aoa(ws, headerRows, { origin: 'A1' });
    const numCols = Object.keys(dataForExport[0] || {}).length;
    ws['!merges'] = [ { s: { r: 0, c: 0 }, e: { r: 0, c: numCols - 1 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: numCols - 1 } }, { s: { r: 2, c: 0 }, e: { r: 2, c: numCols - 1 } } ];
    ws['!cols'] = Object.keys(dataForExport[0] || {}).map(key => ({ wch: Math.max(key.length, ...dataForExport.map(row => String(row[key as keyof typeof row] ?? '').length)) + 2 }));
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    const uniqueFileName = `${fileNamePrefix}_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
    XLSX.writeFile(wb, uniqueFileName);
    toast({ title: "Excel Exported", description: `Report downloaded as ${uniqueFileName}.` });
  }, [filteredSites, toast]);

  const handleDownloadTemplate = () => {
    const templateData = [ { "File No": "Example/123", "Applicant Name": "Panchayath Office", "Constituency": "Kollam", "Name of Site": "Sample ARS Site", "Type of Scheme": "Check Dam", "Panchayath": "Sample Panchayath", "Block": "Sample Block", "Latitude": 8.8932, "Longitude": 76.6141, "Number of Structures": 1, "Storage Capacity (m3)": 500, "No. of Fillings": 2, "Estimate Amount": 500000, "AS/TS Accorded Details": "GO(Rt) No.123/2023/WRD", "AS/TS Amount": 450000, "Sanctioned Date": "15/01/2023", "Tendered Amount": 445000, "Awarded Amount": 440000, "Present Status": "Work in Progress", "Completion Date": "", "Expenditure": 200000, "No. of Beneficiaries": "50 families", "Remarks": "Work ongoing", } ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ARS_Template");
    XLSX.writeFile(wb, "GWD_ARS_Upload_Template.xlsx");
    toast({ title: "Template Downloaded", description: "The Excel template has been downloaded." });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary", cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) throw new Error("The selected Excel file is empty.");

        let successCount = 0; let errorCount = 0;
        for (const row of jsonData) {
          const rowData: any = row;
          const fileNo = String(rowData['File No'] || '').trim();
          if (!fileNo) { errorCount++; console.warn("Skipping a row due to missing File No."); continue; }
          let existingFile = getFileEntry(fileNo);
          const parseDate = (dateValue: any) => { if (!dateValue) return undefined; if (dateValue instanceof Date) return dateValue; let d = parse(String(dateValue), 'dd/MM/yyyy', new Date()); return isValid(d) ? d : undefined; };
          const newSiteDetail: SiteDetailFormData = {
              nameOfSite: String(rowData['Name of Site'] || `Imported Site ${Date.now()}`), purpose: 'ARS', latitude: Number(rowData['Latitude']) || undefined, longitude: Number(rowData['Longitude']) || undefined,
              estimateAmount: Number(rowData['Estimate Amount']) || undefined, tsAmount:  Number(rowData['AS/TS Amount']) || undefined, workStatus: (rowData['Present Status'] as any) || undefined,
              dateOfCompletion: parseDate(rowData['Completion Date']), totalExpenditure: Number(rowData['Expenditure']) || undefined, noOfBeneficiary: String(rowData['No. of Beneficiaries'] || ''),
              workRemarks: String(rowData['Remarks'] || ''), arsTypeOfScheme: String(rowData['Type of Scheme'] || ''), arsPanchayath: String(rowData['Panchayath'] || ''),
              arsBlock: String(rowData['Block'] || ''), arsNumberOfStructures: Number(rowData['Number of Structures']) || undefined, arsStorageCapacity: Number(rowData['Storage Capacity (m3)']) || undefined,
              arsNumberOfFillings: Number(rowData['No. of Fillings']) || undefined, arsAsTsDetails: String(rowData['AS/TS Accorded Details'] || ''), arsSanctionedDate: parseDate(rowData['Sanctioned Date']),
              arsTenderedAmount: Number(rowData['Tendered Amount']) || undefined, arsAwardedAmount: Number(rowData['Awarded Amount']) || undefined,
          };
          let updatedFile: DataEntryFormData;
          if (existingFile) { updatedFile = { ...existingFile, constituency: (rowData['Constituency'] as Constituency) || existingFile.constituency, siteDetails: [...(existingFile.siteDetails || []), newSiteDetail] };
          } else { updatedFile = { fileNo: fileNo, applicantName: String(rowData['Applicant Name'] || `Applicant for ${newSiteDetail.nameOfSite}`), constituency: (rowData['Constituency'] as Constituency), applicationType: 'Government_Others', fileStatus: 'File Under Process', siteDetails: [newSiteDetail] }; }
          try { await addFileEntry(updatedFile, existingFile?.fileNo); successCount++;
          } catch(e) { errorCount++; console.error(`Failed to add site from row for File No ${fileNo}:`, e); }
        }
        toast({ title: "Import Complete", description: `${successCount} sites imported. ${errorCount} rows failed.` });
      } catch (error: any) {
        toast({ title: "Import Failed", description: error.message, variant: "destructive" });
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };
  
  const handleCalendarInteraction = (e: Event) => {
    const target = e.target as HTMLElement;
    if (target.closest('.calendar-custom-controls-container') || target.closest('[data-radix-select-content]')) e.preventDefault();
  };

  if (entriesLoading) {
    return ( <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center"> <Loader2 className="h-12 w-12 animate-spin text-primary" /> <p className="ml-3 text-muted-foreground">Loading ARS data...</p> </div> );
  }

  return (
    <div className="space-y-6">
      <TooltipProvider>
       <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-1">
              <CardTitle>Artificial Recharge Schemes (ARS) ({arsSites.length})</CardTitle>
              <CardDescription>A detailed report of all ARS sites recorded in the system.</CardDescription>
            </div>
          </div>
          <div className="flex flex-col gap-4 pt-4">
            <div className="flex flex-wrap gap-2 w-full justify-start">
                {canEdit && ( <> <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".xlsx, .xls" /> <Button className="w-full sm:w-auto" onClick={() => fileInputRef.current?.click()} disabled={isUploading}> <FileUp className="mr-2 h-4 w-4" /> Import Excel </Button> <Button variant="outline" className="w-full sm:w-auto" onClick={handleDownloadTemplate}> <Download className="mr-2 h-4 w-4" /> Download Template </Button> <Link href="/dashboard/ars/entry" passHref><Button className="w-full sm:w-auto"> <PlusCircle className="mr-2 h-4 w-4" /> Add New ARS </Button></Link> <Button variant="destructive" className="w-full sm:w-auto" onClick={() => setIsClearAllDialogOpen(true)} disabled={isClearingAll || arsSites.length === 0}> <Trash2 className="mr-2 h-4 w-4" /> Clear All ARS Data </Button> </> )}
                <Button variant="outline" onClick={handleExportExcel} className="w-full sm:w-auto"> <FileDown className="mr-2 h-4 w-4" /> Export Excel </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t pt-4">
                 <Popover>
                    <PopoverTrigger asChild>
                        <Button variant={"outline"} className={cn("w-[150px] justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />{startDate ? format(startDate, "dd/MM/yyyy") : <span>From Date</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start" onFocusOutside={handleCalendarInteraction} onPointerDownOutside={handleCalendarInteraction}>
                        <Calendar mode="single" selected={startDate} onSelect={setStartDate} disabled={(date) => (endDate ? date > endDate : false) || date > new Date()} initialFocus />
                    </PopoverContent>
                </Popover>
                 <Popover>
                    <PopoverTrigger asChild>
                        <Button variant={"outline"} className={cn("w-[150px] justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />{endDate ? format(endDate, "dd/MM/yyyy") : <span>To Date</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start" onFocusOutside={handleCalendarInteraction} onPointerDownOutside={handleCalendarInteraction}>
                        <Calendar mode="single" selected={endDate} onSelect={setEndDate} disabled={(date) => (startDate ? date < startDate : false) || date > new Date()} initialFocus />
                    </PopoverContent>
                </Popover>
                <Button onClick={() => {setStartDate(undefined); setEndDate(undefined);}} variant="ghost" className="h-9 px-3"><X className="mr-2 h-4 w-4"/>Clear Dates</Button>
                <div className="relative flex-grow min-w-[250px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input type="search" placeholder="Search across all fields..." className="w-full rounded-lg bg-background pl-10 shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
                <TableHead>Sl. No.</TableHead><TableHead>File No</TableHead><TableHead className="max-w-[200px]">Name of Site</TableHead>
                <TableHead>Type of Scheme</TableHead><TableHead>Panchayath</TableHead>
                <TableHead>Estimate (₹)</TableHead>
                <TableHead>Status</TableHead><TableHead>Completion Date</TableHead>
                <TableHead>Expenditure (₹)</TableHead><TableHead className="max-w-[250px]">Remarks</TableHead>
                <TableHead className="text-center w-[120px]">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {paginatedSites.length > 0 ? ( paginatedSites.map((site, index) => (
                  <TableRow key={site.id}>
                    <TableCell>{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</TableCell>
                    <TableCell>{site.fileNo}</TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">{site.nameOfSite}</TableCell>
                    <TableCell>{site.arsTypeOfScheme || 'N/A'}</TableCell><TableCell>{site.arsPanchayath || 'N/A'}</TableCell>
                    <TableCell className="text-right">{site.estimateAmount?.toLocaleString('en-IN') ?? 'N/A'}</TableCell>
                    <TableCell>{site.workStatus ?? 'N/A'}</TableCell><TableCell>{formatDateSafe(site.dateOfCompletion)}</TableCell>
                    <TableCell className="text-right">{site.totalExpenditure?.toLocaleString('en-IN') ?? 'N/A'}</TableCell>
                    <TableCell className="max-w-[250px] truncate">{site.workRemarks || 'N/A'}</TableCell>
                    <TableCell className="text-center">
                        <div className="flex items-center justify-center space-x-1">
                            <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => { setViewingSite(site); setIsViewDialogOpen(true); }}><Eye className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>View Details</p></TooltipContent></Tooltip>
                            {canEdit && (
                                <>
                                <Tooltip><TooltipTrigger asChild><Link href={`/dashboard/ars/entry?fileNo=${encodeURIComponent(site.fileNo || '')}&siteName=${encodeURIComponent(site.nameOfSite || '')}`} passHref><Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button></Link></TooltipTrigger><TooltipContent><p>Edit Site</p></TooltipContent></Tooltip>
                                <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/90" onClick={() => setDeletingSite(site)}><Trash2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>Delete Site</p></TooltipContent></Tooltip>
                                </>
                            )}
                        </div>
                    </TableCell>
                  </TableRow>
                )) ) : ( <TableRow><TableCell colSpan={11} className="h-24 text-center">No ARS sites found {searchTerm || startDate || endDate ? "matching your search criteria" : ""}.</TableCell></TableRow> )}
            </TableBody>
          </Table>
        </CardContent>
         {totalPages > 1 && ( <div className="p-4 border-t flex items-center justify-center"><PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} /></div> )}
      </Card>
      </TooltipProvider>
      
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>ARS Site Details</DialogTitle><DialogDescription>Viewing details for {viewingSite?.nameOfSite}.</DialogDescription></DialogHeader>
          <div className="space-y-2 py-4 text-sm">
            {viewingSite && Object.entries(viewingSite).map(([key, value]) => {
                if (['id'].includes(key) || value === null || value === undefined || value === '') return null;
                const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                return ( <div key={key} className="flex justify-between border-b pb-1"> <strong>{label}:</strong> <span>{value instanceof Date ? formatDateSafe(value) : String(value)}</span> </div> );
            })}
          </div>
          <DialogFooter><DialogClose asChild><Button>Close</Button></DialogClose></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingSite} onOpenChange={() => setDeletingSite(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This action will permanently delete the ARS site "{deletingSite?.nameOfSite}" from File No. {deletingSite?.fileNo}. This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteSite} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">{isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Delete"}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isClearAllDialogOpen} onOpenChange={setIsClearAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center space-x-2">
              <ShieldAlert className="h-6 w-6 text-destructive" />
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            </div>
            <AlertDialogDescription>This action will permanently delete ALL ARS sites from every file in the database. This action cannot be undone. Please confirm you want to proceed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClearingAll} onClick={() => setIsClearAllDialogOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearAllArs} disabled={isClearingAll} className="bg-destructive hover:bg-destructive/90">
              {isClearingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Yes, Clear All ARS Data"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
