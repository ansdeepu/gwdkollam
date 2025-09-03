
// src/app/dashboard/ars/page.tsx
"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useArsEntries, type ArsEntry } from "@/hooks/useArsEntries";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2, Search, PlusCircle, Download, Eye, Edit, Trash2, XCircle } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePageHeader } from "@/hooks/usePageHeader";
import { CalendarIcon } from "lucide-react";
import type { ArsEntryFormData } from "@/lib/schemas";


const ITEMS_PER_PAGE = 50;

const formatDateSafe = (dateInput: any): string => {
  if (!dateInput) return 'N/A';
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  return date instanceof Date && !isNaN(date.getTime()) ? format(date, 'dd/MM/yyyy') : 'N/A';
};

// Helper component for the view dialog
const DetailRow = ({ label, value }: { label: string; value: any }) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  let displayValue = String(value);
  if (value instanceof Date) {
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
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const canEdit = user?.role === 'editor';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const [isUploading, setIsUploading] = useState(false);
  
  const [viewingSite, setViewingSite] = useState<ArsEntry | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  const [deletingSite, setDeletingSite] = useState<ArsEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [isClearAllDialogOpen, setIsClearAllDialogOpen] = useState(false);

  const filteredSites = useMemo(() => {
    let sites = [...arsEntries];

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

    const lowercasedFilter = searchTerm.toLowerCase();
    if (lowercasedFilter) {
      sites = sites.filter(site => {
        // Robust search through specific fields
        const searchableContent = [
          site.fileNo,
          site.nameOfSite,
          site.constituency,
          site.arsTypeOfScheme,
          site.arsPanchayath,
          site.arsBlock,
          site.workStatus,
          site.supervisorName,
          site.workRemarks
        ].filter(Boolean).map(String).join(' ').toLowerCase();

        return searchableContent.includes(lowercasedFilter);
      });
    }
    
    sites.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : null;
        const dateB = b.createdAt ? new Date(b.createdAt) : null;

        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        if (!isValid(dateA)) return 1;
        if (!isValid(dateB)) return -1;

        return dateB.getTime() - dateA.getTime();
    });

    return sites;
  }, [arsEntries, searchTerm, startDate, endDate]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, startDate, endDate]);

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

  const handleExportExcel = useCallback(() => {
    if (filteredSites.length === 0) {
      toast({ title: "No Data", description: "There is no data to export." });
      return;
    }
    const reportTitle = "Artificial Recharge Schemes (ARS) Report";
    const sheetName = "ARSReport";
    const fileNamePrefix = "gwd_ars_report";
    
    const dataForExport = filteredSites.map((site, index) => ({
      "Sl. No.": index + 1,
      "File No": site.fileNo || 'N/A',
      "Name of Site": site.nameOfSite || 'N/A',
      "Constituency (LAC)": site.constituency || 'N/A',
      "Type of Scheme": site.arsTypeOfScheme || 'N/A',
      "Panchayath": site.arsPanchayath || 'N/A',
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
      "Present Status": site.workStatus || 'N/A',
      "Completion Date": formatDateSafe(site.dateOfCompletion),
      "No. of Beneficiaries": site.noOfBeneficiary || 'N/A',
      "Remarks": site.workRemarks || 'N/A',
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
    const templateData = [ { "File No": "Example/123", "Name of Site": "Sample ARS Site", "Constituency": "Kollam", "Type of Scheme": "Check Dam", "Panchayath": "Sample Panchayath", "Block": "Sample Block", "Latitude": 8.8932, "Longitude": 76.6141, "Number of Structures": 1, "Storage Capacity (m3)": 500, "No. of Fillings": 2, "Estimate Amount": 500000, "AS/TS Accorded Details": "GO(Rt) No.123/2023/WRD", "AS/TS Amount": 450000, "Sanctioned Date": "15/01/2023", "Tendered Amount": 445000, "Awarded Amount": 440000, "Present Status": "Work in Progress", "Completion Date": "", "Expenditure (₹)": 200000, "No. of Beneficiaries": "50 families", "Remarks": "Work ongoing", } ];
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

        let successCount = 0;
        let errorCount = 0;

        for (const rowData of jsonData) {
          try {
            const parseDate = (dateValue: any) => { if (!dateValue) return undefined; if (dateValue instanceof Date) return dateValue; let d = parse(String(dateValue), 'dd/MM/yyyy', new Date()); return isValid(d) ? d : undefined; };
            const expenditureValue = String((rowData as any)['Expenditure (₹)'] || '');
            const cleanedExpenditure = expenditureValue.replace(/[^0-9.]/g, '');

            const newEntry: ArsEntryFormData = {
              fileNo: String((rowData as any)['File No'] || `Imported ${Date.now()}`),
              nameOfSite: String((rowData as any)['Name of Site'] || `Imported Site ${Date.now()}`),
              constituency: (rowData as any)['Constituency (LAC)'] || undefined,
              arsTypeOfScheme: (rowData as any)['Type of Scheme'] || undefined,
              arsPanchayath: String((rowData as any)['Panchayath'] || ''),
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
              workStatus: (rowData as any)['Present Status'] || undefined,
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
    reader.readAsBinaryString(file);
  };
  
  const handleCalendarInteraction = (e: Event) => {
    const target = e.target as HTMLElement;
    if (target.closest('.calendar-custom-controls-container') || target.closest('[data-radix-select-content]')) e.preventDefault();
  };

  if (entriesLoading || authLoading) {
    return ( <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center"> <Loader2 className="h-12 w-12 animate-spin text-primary" /> <p className="ml-3 text-muted-foreground">Loading ARS data...</p> </div> );
  }

  return (
    <div className="space-y-6">
      <TooltipProvider>
       <Card>
        <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative flex-grow min-w-[250px] order-2 sm:order-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input type="search" placeholder="Search across all fields..." className="w-full rounded-lg bg-background pl-10 shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <div className="flex flex-wrap items-center gap-2 order-1 sm:order-2">
                  <Link href="/dashboard/ars/entry" passHref><Button size="sm"> <PlusCircle className="mr-2 h-4 w-4" /> Add New ARS </Button></Link>
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
            <div className="flex flex-wrap items-center gap-2 pt-4 border-t mt-4">
              <div className="font-medium text-sm pr-4">Total Sites: {arsEntries.length}</div>
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
              <Button onClick={() => {setStartDate(undefined); setEndDate(undefined);}} variant="ghost" className="h-9 px-3"><XCircle className="mr-2 h-4 w-4"/>Clear Dates</Button>
            </div>
        </CardContent>
       </Card>
       <Card className="shadow-lg">
        <CardContent className="pt-6">
          <Table>
            <TableHeader><TableRow>
                <TableHead>Sl. No.</TableHead><TableHead>File No</TableHead><TableHead>Name of Site</TableHead>
                <TableHead>Type of Scheme</TableHead><TableHead>Panchayath</TableHead>
                <TableHead>Status</TableHead><TableHead>Completion Date</TableHead>
                <TableHead className="text-center w-[120px]">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {paginatedSites.length > 0 ? ( paginatedSites.map((site, index) => (
                  <TableRow key={site.id}>
                    <TableCell>{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</TableCell>
                    <TableCell>{site.fileNo}</TableCell>
                    <TableCell className="font-medium whitespace-normal break-words">{site.nameOfSite}</TableCell>
                    <TableCell className="whitespace-normal break-words">{site.arsTypeOfScheme || 'N/A'}</TableCell><TableCell className="whitespace-normal break-words">{site.arsPanchayath || 'N/A'}</TableCell>
                    <TableCell>{site.workStatus ?? 'N/A'}</TableCell><TableCell>{formatDateSafe(site.dateOfCompletion)}</TableCell>
                    <TableCell className="text-center">
                        <div className="flex items-center justify-center space-x-1">
                            <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => { setViewingSite(site); setIsViewDialogOpen(true); }}><Eye className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>View Details</p></TooltipContent></Tooltip>
                            {canEdit && (
                                <>
                                <Tooltip><TooltipTrigger asChild><Link href={`/dashboard/ars/entry?id=${site.id}`} passHref><Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button></Link></TooltipTrigger><TooltipContent><p>Edit Site</p></TooltipContent></Tooltip>
                                <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/90" onClick={() => setDeletingSite(site)}><Trash2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>Delete Site</p></TooltipContent></Tooltip>
                                </>
                            )}
                        </div>
                    </TableCell>
                  </TableRow>
                )) ) : ( <TableRow><TableCell colSpan={8} className="h-24 text-center">No ARS sites found {searchTerm || startDate || endDate ? "matching your search criteria" : ""}.</TableCell></TableRow> )}
            </TableBody>
          </Table>
        </CardContent>
         {totalPages > 1 && ( <div className="p-4 border-t flex items-center justify-center"><PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} /></div> )}
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
            <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4 py-4">
              {viewingSite && (
                <>
                  <div>
                    <h4 className="text-base font-semibold text-primary mb-2 border-b pb-1">Site Identification</h4>
                    <DetailRow label="File No" value={viewingSite.fileNo} />
                    <DetailRow label="Name of Site" value={viewingSite.nameOfSite} />
                    <DetailRow label="Constituency (LAC)" value={viewingSite.constituency} />
                    <DetailRow label="Panchayath" value={viewingSite.arsPanchayath} />
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
                    <DetailRow label="Present Status" value={viewingSite.workStatus} />
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
