// src/app/dashboard/ars-report/page.tsx
"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useFileEntries } from "@/hooks/useFileEntries";
import { type DataEntryFormData, type SiteDetailFormData, type SitePurpose } from "@/lib/schemas";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2, Search, SlidersHorizontal, Trash2 } from "lucide-react";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import PaginationControls from "@/components/shared/PaginationControls";

const ITEMS_PER_PAGE = 50;

interface ArsReportRow extends SiteDetailFormData {
  fileNo?: string;
  applicantName?: string;
}

const formatDateSafe = (dateInput: any): string => {
  if (!dateInput) return 'N/A';
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  return date instanceof Date && !isNaN(date.getTime()) ? format(date, 'dd/MM/yyyy') : 'N/A';
};

export default function ArsReportPage() {
  const { fileEntries, isLoading: entriesLoading } = useFileEntries();
  const [arsSites, setArsSites] = useState<ArsReportRow[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();

  useEffect(() => {
    if (!entriesLoading) {
      const allArsSites = fileEntries.flatMap(entry => 
        (entry.siteDetails || [])
          .filter(site => site.purpose === 'ARS')
          .map(site => ({
            ...site,
            fileNo: entry.fileNo,
            applicantName: entry.applicantName,
          }))
      );
      setArsSites(allArsSites);
    }
  }, [fileEntries, entriesLoading]);

  const filteredSites = useMemo(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    return arsSites.filter(site => {
      const siteContent = Object.values(site).join(' ').toLowerCase();
      return siteContent.includes(lowercasedFilter);
    });
  }, [arsSites, searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const paginatedSites = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredSites.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredSites, currentPage]);
  
  const totalPages = Math.ceil(filteredSites.length / ITEMS_PER_PAGE);
  
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
      "No. of Beneficiaries": site.noOfBeneficiary || 'N/A',
      "Latitude": site.latitude || 'N/A',
      "Longitude": site.longitude || 'N/A',
      "Number of Structures": site.arsNumberOfStructures || 'N/A',
      "Storage Capacity (m3)": site.arsStorageCapacity || 'N/A',
      "No. of Fillings": site.arsNumberOfFillings || 'N/A',
      "Estimate Amount": site.estimateAmount || 'N/A',
      "TS Amount": site.tsAmount || 'N/A',
      "Present Status": site.workStatus || 'N/A',
      "Completion Date": formatDateSafe(site.dateOfCompletion),
      "Expenditure": site.totalExpenditure || 'N/A',
      "Remarks": site.workRemarks || 'N/A',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet([]);
    
    const headerRows = [
      ["Ground Water Department, Kollam"],
      [reportTitle],
      [`Report generated on: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`],
      [],
    ];

    XLSX.utils.sheet_add_json(ws, dataForExport, { origin: 'A5', skipHeader: false });
    XLSX.utils.sheet_add_aoa(ws, headerRows, { origin: 'A1' });
    
    const numCols = Object.keys(dataForExport[0] || {}).length;
    ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: numCols - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: numCols - 1 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: numCols - 1 } }
    ];

    ws['!cols'] = Object.keys(dataForExport[0] || {}).map(key => ({
      wch: Math.max(key.length, ...dataForExport.map(row => String(row[key as keyof typeof row] ?? '').length)) + 2
    }));

    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    const uniqueFileName = `${fileNamePrefix}_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
    XLSX.writeFile(wb, uniqueFileName);
    toast({ title: "Excel Exported", description: `Report downloaded as ${uniqueFileName}.` });
  }, [filteredSites, toast]);

  if (entriesLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading ARS data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
       <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Artificial Recharge Schemes (ARS)</CardTitle>
              <CardDescription>A detailed report of all ARS sites recorded in the system.</CardDescription>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={handleExportExcel} className="w-full sm:w-auto">
                <FileDown className="mr-2 h-4 w-4" /> Export Excel
              </Button>
            </div>
          </div>
          <div className="relative pt-4">
             <Search className="absolute left-3 top-1/2 h-5 w-5 text-muted-foreground" />
             <Input
                type="search"
                placeholder="Search across all fields..."
                className="w-full rounded-lg bg-background pl-10 shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sl. No.</TableHead>
                <TableHead>File No</TableHead>
                <TableHead>Name of Site</TableHead>
                <TableHead>Beneficiaries</TableHead>
                <TableHead>Latitude</TableHead>
                <TableHead>Longitude</TableHead>
                <TableHead>No. of Structures</TableHead>
                <TableHead>Storage (m3)</TableHead>
                <TableHead>No. of Fillings</TableHead>
                <TableHead>Estimate (₹)</TableHead>
                <TableHead>TS Amount (₹)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Completion Date</TableHead>
                <TableHead>Expenditure (₹)</TableHead>
                <TableHead>Remarks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedSites.length > 0 ? (
                paginatedSites.map((site, index) => (
                  <TableRow key={`${site.fileNo}-${site.nameOfSite}-${index}`}>
                    <TableCell>{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</TableCell>
                    <TableCell>{site.fileNo}</TableCell>
                    <TableCell className="font-medium">{site.nameOfSite}</TableCell>
                    <TableCell>{site.noOfBeneficiary || 'N/A'}</TableCell>
                    <TableCell>{site.latitude ?? 'N/A'}</TableCell>
                    <TableCell>{site.longitude ?? 'N/A'}</TableCell>
                    <TableCell>{site.arsNumberOfStructures ?? 'N/A'}</TableCell>
                    <TableCell>{site.arsStorageCapacity ?? 'N/A'}</TableCell>
                    <TableCell>{site.arsNumberOfFillings ?? 'N/A'}</TableCell>
                    <TableCell className="text-right">{site.estimateAmount?.toLocaleString('en-IN') ?? 'N/A'}</TableCell>
                    <TableCell className="text-right">{site.tsAmount?.toLocaleString('en-IN') ?? 'N/A'}</TableCell>
                    <TableCell>{site.workStatus ?? 'N/A'}</TableCell>
                    <TableCell>{formatDateSafe(site.dateOfCompletion)}</TableCell>
                    <TableCell className="text-right">{site.totalExpenditure?.toLocaleString('en-IN') ?? 'N/A'}</TableCell>
                    <TableCell className="max-w-xs truncate">{site.workRemarks || 'N/A'}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={15} className="h-24 text-center">
                    No ARS sites found {searchTerm ? "matching your search" : ""}.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
         {totalPages > 1 && (
            <div className="p-4 border-t flex items-center justify-center">
                <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                />
            </div>
         )}
      </Card>
    </div>
  );
}
