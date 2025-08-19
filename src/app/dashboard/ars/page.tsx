
// src/app/dashboard/ars/page.tsx
"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useFileEntries } from "@/hooks/useFileEntries";
import { type DataEntryFormData, type SiteDetailFormData, SiteDetailSchema, siteWorkStatusOptions, ArsSpecificSchema, ArsAndSiteSchema, NewArsEntrySchema, type NewArsEntryFormData } from "@/lib/schemas";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2, Search, PlusCircle, Save, X, FileUp, Download } from "lucide-react";
import { format, isValid, parse } from "date-fns";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import PaginationControls from "@/components/shared/PaginationControls";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const ITEMS_PER_PAGE = 50;

interface ArsReportRow extends SiteDetailFormData {
  fileNo?: string;
  applicantName?: string;
  constituency?: string;
}

const formatDateSafe = (dateInput: any): string => {
  if (!dateInput) return 'N/A';
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  return date instanceof Date && !isNaN(date.getTime()) ? format(date, 'dd/MM/yyyy') : 'N/A';
};

export default function ArsPage() {
  const { fileEntries, isLoading: entriesLoading, addFileEntry, getFileEntry } = useFileEntries();
  const [arsSites, setArsSites] = useState<ArsReportRow[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();
  const { user } = useAuth();
  const canEdit = user?.role === 'editor';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<NewArsEntryFormData>({
    resolver: zodResolver(NewArsEntrySchema),
    defaultValues: {
      fileNo: "",
      nameOfSite: "",
      arsTypeOfScheme: "",
      arsPanchayath: "",
      arsBlock: "",
      latitude: undefined,
      longitude: undefined,
      arsNumberOfStructures: undefined,
      arsStorageCapacity: undefined,
      arsNumberOfFillings: undefined,
      estimateAmount: undefined,
      arsAsTsDetails: "",
      tsAmount: undefined,
      arsSanctionedDate: undefined,
      arsTenderedAmount: undefined,
      arsAwardedAmount: undefined,
      workStatus: undefined,
      dateOfCompletion: undefined,
      totalExpenditure: undefined,
      noOfBeneficiary: "",
      workRemarks: "",
    },
  });

  useEffect(() => {
    if (!entriesLoading) {
      const allArsSites = fileEntries.flatMap(entry => 
        (entry.siteDetails || [])
          .filter(site => site.purpose === 'ARS')
          .map(site => ({
            ...site,
            fileNo: entry.fileNo,
            applicantName: entry.applicantName,
            constituency: entry.constituency
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

  const handleFormSubmit = async (data: NewArsEntryFormData) => {
    setIsSubmitting(true);
    const existingFile = getFileEntry(data.fileNo);
    if (!existingFile) {
        toast({ title: "File Not Found", description: `File No. "${data.fileNo}" does not exist. Please enter a valid file number.`, variant: "destructive" });
        setIsSubmitting(false);
        return;
    }

    const newSiteDetail: SiteDetailFormData = {
        nameOfSite: data.nameOfSite,
        purpose: 'ARS',
        latitude: data.latitude,
        longitude: data.longitude,
        estimateAmount: data.estimateAmount,
        tsAmount: data.tsAmount,
        workStatus: data.workStatus,
        dateOfCompletion: data.dateOfCompletion,
        totalExpenditure: data.totalExpenditure,
        noOfBeneficiary: data.noOfBeneficiary,
        workRemarks: data.workRemarks,
        
        // ARS specific fields mapped
        arsTypeOfScheme: data.arsTypeOfScheme,
        arsPanchayath: data.arsPanchayath,
        arsBlock: data.arsBlock,
        arsNumberOfStructures: data.arsNumberOfStructures,
        arsStorageCapacity: data.arsStorageCapacity,
        arsNumberOfFillings: data.arsNumberOfFillings,
        arsAsTsDetails: data.arsAsTsDetails,
        arsSanctionedDate: data.arsSanctionedDate,
        arsTenderedAmount: data.arsTenderedAmount,
        arsAwardedAmount: data.arsAwardedAmount,
        
        // Defaulting other non-relevant fields for schema completeness
        siteConditions: undefined, accessibleRig: undefined, additionalAS: 'No', tenderNo: "", diameter: undefined, totalDepth: undefined, casingPipeUsed: "", outerCasingPipe: "", innerCasingPipe: "", yieldDischarge: "", zoneDetails: "", waterLevel: "", drillingRemarks: "", pumpDetails: "", waterTankCapacity: "", noOfTapConnections: undefined, typeOfRig: undefined, contractorName: "", supervisorUid: null, supervisorName: null, surveyOB: "", surveyLocation: "", surveyPlainPipe: "", surveySlottedPipe: "", surveyRemarks: "", surveyRecommendedDiameter: "", surveyRecommendedTD: "", surveyRecommendedOB: "", surveyRecommendedCasingPipe: "", surveyRecommendedPlainPipe: "", surveyRecommendedSlottedPipe: "", surveyRecommendedMsCasingPipe: "", pilotDrillingDepth: "", pumpingLineLength: "", deliveryLineLength: "",
    };
    
    const updatedFile: DataEntryFormData = {
        ...existingFile,
        siteDetails: [...(existingFile.siteDetails || []), newSiteDetail],
    };

    try {
        await addFileEntry(updatedFile, existingFile.fileNo);
        toast({ title: "ARS Site Added", description: `New site "${data.nameOfSite}" has been added to File No. ${data.fileNo}.` });
        setIsFormOpen(false);
        form.reset();
    } catch (error: any) {
        toast({ title: "Error Adding Site", description: error.message, variant: "destructive" });
    } finally {
        setIsSubmitting(false);
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
      "Type of Scheme": site.arsTypeOfScheme || 'N/A',
      "Panchayath": site.arsPanchayath || 'N/A',
      "Constituency": site.constituency || 'N/A',
      "Block": site.arsBlock || 'N/A',
      "Estimate Amount": site.estimateAmount || 'N/A',
      "AS/TS Accorded Details": site.arsAsTsDetails || 'N/A',
      "AS/TS Amount": site.tsAmount || 'N/A',
      "Sanctioned Date": formatDateSafe(site.arsSanctionedDate),
      "Tendered Amount": site.arsTenderedAmount || 'N/A',
      "Awarded Amount": site.arsAwardedAmount || 'N/A',
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

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        "File No": "Example/123",
        "Name of Site": "Sample ARS Site",
        "Type of Scheme": "Check Dam",
        "Panchayath": "Sample Panchayath",
        "Block": "Sample Block",
        "Latitude": 8.8932,
        "Longitude": 76.6141,
        "Number of Structures": 1,
        "Storage Capacity (m3)": 500,
        "No. of Fillings": 2,
        "Estimate Amount": 500000,
        "AS/TS Accorded Details": "GO(Rt) No.123/2023/WRD",
        "AS/TS Amount": 450000,
        "Sanctioned Date": "15/01/2023",
        "Tendered Amount": 445000,
        "Awarded Amount": 440000,
        "Present Status": "Work in Progress",
        "Completion Date": "",
        "Expenditure": 200000,
        "No. of Beneficiaries": "50 families",
        "Remarks": "Work ongoing",
      }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ARS_Template");
    XLSX.writeFile(wb, "GWD_ARS_Upload_Template.xlsx");
    toast({ title: "Template Downloaded", description: "The Excel template has been downloaded." });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsSubmitting(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary", cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          throw new Error("The selected Excel file is empty.");
        }

        let successCount = 0;
        let errorCount = 0;

        for (const row of jsonData) {
          const rowData: any = row;
          const fileNo = String(rowData['File No'] || '').trim();

          if (!fileNo) {
            errorCount++;
            console.warn("Skipping a row due to missing File No.");
            continue;
          }
          
          const existingFile = getFileEntry(fileNo);
          if (!existingFile) {
            errorCount++;
            console.warn(`Skipping row for non-existent File No: ${fileNo}`);
            continue;
          }
          
          const parseDate = (dateValue: any) => {
            if (!dateValue) return undefined;
            if (dateValue instanceof Date) return dateValue;
            let d = parse(String(dateValue), 'dd/MM/yyyy', new Date());
            return isValid(d) ? d : undefined;
          };

          const newSiteDetail: SiteDetailFormData = {
              nameOfSite: String(rowData['Name of Site'] || `Imported Site ${Date.now()}`),
              purpose: 'ARS',
              latitude: Number(rowData['Latitude']) || undefined,
              longitude: Number(rowData['Longitude']) || undefined,
              estimateAmount: Number(rowData['Estimate Amount']) || undefined,
              tsAmount:  Number(rowData['AS/TS Amount']) || undefined,
              workStatus: (rowData['Present Status'] as any) || undefined,
              dateOfCompletion: parseDate(rowData['Completion Date']),
              totalExpenditure: Number(rowData['Expenditure']) || undefined,
              noOfBeneficiary: String(rowData['No. of Beneficiaries'] || ''),
              workRemarks: String(rowData['Remarks'] || ''),
              
              arsTypeOfScheme: String(rowData['Type of Scheme'] || ''),
              arsPanchayath: String(rowData['Panchayath'] || ''),
              arsBlock: String(rowData['Block'] || ''),
              arsNumberOfStructures: Number(rowData['Number of Structures']) || undefined,
              arsStorageCapacity: Number(rowData['Storage Capacity (m3)']) || undefined,
              arsNumberOfFillings: Number(rowData['No. of Fillings']) || undefined,
              arsAsTsDetails: String(rowData['AS/TS Accorded Details'] || ''),
              arsSanctionedDate: parseDate(rowData['Sanctioned Date']),
              arsTenderedAmount: Number(rowData['Tendered Amount']) || undefined,
              arsAwardedAmount: Number(rowData['Awarded Amount']) || undefined,
              
              siteConditions: undefined, accessibleRig: undefined, additionalAS: 'No', tenderNo: "", diameter: undefined, totalDepth: undefined, casingPipeUsed: "", outerCasingPipe: "", innerCasingPipe: "", yieldDischarge: "", zoneDetails: "", waterLevel: "", drillingRemarks: "", pumpDetails: "", waterTankCapacity: "", noOfTapConnections: undefined, typeOfRig: undefined, contractorName: "", supervisorUid: null, supervisorName: null, surveyOB: "", surveyLocation: "", surveyPlainPipe: "", surveySlottedPipe: "", surveyRemarks: "", surveyRecommendedDiameter: "", surveyRecommendedTD: "", surveyRecommendedOB: "", surveyRecommendedCasingPipe: "", surveyRecommendedPlainPipe: "", surveyRecommendedSlottedPipe: "", surveyRecommendedMsCasingPipe: "", pilotDrillingDepth: "", pumpingLineLength: "", deliveryLineLength: "",
          };

          const updatedFile: DataEntryFormData = {
              ...existingFile,
              siteDetails: [...(existingFile.siteDetails || []), newSiteDetail],
          };

          try {
            await addFileEntry(updatedFile, fileNo);
            successCount++;
          } catch(e) {
            errorCount++;
            console.error(`Failed to add site from row for File No ${fileNo}:`, e);
          }
        }
        
        toast({
          title: "Import Complete",
          description: `${successCount} sites imported successfully. ${errorCount} rows failed or were skipped.`,
          variant: errorCount > 0 ? "default" : "default",
        });

      } catch (error: any) {
        toast({ title: "Import Failed", description: error.message, variant: "destructive" });
      } finally {
        setIsSubmitting(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = ""; // Reset file input
        }
      }
    };
    reader.readAsBinaryString(file);
  };

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
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              {canEdit && (
                <>
                 <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".xlsx, .xls"
                  />
                  <Button className="w-full sm:w-auto" onClick={() => fileInputRef.current?.click()} disabled={isSubmitting}>
                      <FileUp className="mr-2 h-4 w-4" /> Import Excel
                  </Button>
                  <Button variant="outline" className="w-full sm:w-auto" onClick={handleDownloadTemplate}>
                    <Download className="mr-2 h-4 w-4" /> Download Template
                  </Button>
                  <Button className="w-full sm:w-auto" onClick={() => setIsFormOpen(true)}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Add New ARS
                  </Button>
                </>
              )}
              <Button variant="outline" onClick={handleExportExcel} className="w-full sm:w-auto">
                <FileDown className="mr-2 h-4 w-4" /> Export Excel
              </Button>
            </div>
          </div>
          <div className="relative pt-4">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
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
                <TableHead>Type of Scheme</TableHead>
                <TableHead>Panchayath</TableHead>
                <TableHead>Constituency</TableHead>
                <TableHead>Block</TableHead>
                <TableHead>Estimate (₹)</TableHead>
                <TableHead>AS/TS Details</TableHead>
                <TableHead>AS/TS Amount (₹)</TableHead>
                <TableHead>Sanctioned Date</TableHead>
                <TableHead>Tendered Amount (₹)</TableHead>
                <TableHead>Awarded Amount (₹)</TableHead>
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
                    <TableCell>{site.arsTypeOfScheme || 'N/A'}</TableCell>
                    <TableCell>{site.arsPanchayath || 'N/A'}</TableCell>
                    <TableCell>{site.constituency || 'N/A'}</TableCell>
                    <TableCell>{site.arsBlock || 'N/A'}</TableCell>
                    <TableCell className="text-right">{site.estimateAmount?.toLocaleString('en-IN') ?? 'N/A'}</TableCell>
                    <TableCell>{site.arsAsTsDetails || 'N/A'}</TableCell>
                    <TableCell className="text-right">{site.tsAmount?.toLocaleString('en-IN') ?? 'N/A'}</TableCell>
                    <TableCell>{formatDateSafe(site.arsSanctionedDate)}</TableCell>
                    <TableCell className="text-right">{site.arsTenderedAmount?.toLocaleString('en-IN') ?? 'N/A'}</TableCell>
                    <TableCell className="text-right">{site.arsAwardedAmount?.toLocaleString('en-IN') ?? 'N/A'}</TableCell>
                    <TableCell>{site.workStatus ?? 'N/A'}</TableCell>
                    <TableCell>{formatDateSafe(site.dateOfCompletion)}</TableCell>
                    <TableCell className="text-right">{site.totalExpenditure?.toLocaleString('en-IN') ?? 'N/A'}</TableCell>
                    <TableCell className="max-w-xs truncate">{site.workRemarks || 'N/A'}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={17} className="h-24 text-center">
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

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Add New ARS Entry</DialogTitle>
            <DialogDescription>Fill in the details below and associate it with an existing file number.</DialogDescription>
          </DialogHeader>
          <div className="pr-2 py-2 max-h-[70vh] overflow-y-auto">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6 p-1">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField name="fileNo" control={form.control} render={({ field }) => (<FormItem><FormLabel>File No. <span className="text-destructive">*</span></FormLabel><FormControl><Input placeholder="Existing File No." {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField name="nameOfSite" control={form.control} render={({ field }) => (<FormItem><FormLabel>Name of Site <span className="text-destructive">*</span></FormLabel><FormControl><Input placeholder="e.g., Anchal ARS" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField name="arsTypeOfScheme" control={form.control} render={({ field }) => (<FormItem><FormLabel>Type of Scheme</FormLabel><FormControl><Input placeholder="e.g., Check Dam" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField name="arsPanchayath" control={form.control} render={({ field }) => (<FormItem><FormLabel>Panchayath</FormLabel><FormControl><Input placeholder="Panchayath Name" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField name="arsBlock" control={form.control} render={({ field }) => (<FormItem><FormLabel>Block</FormLabel><FormControl><Input placeholder="Block Name" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField name="latitude" control={form.control} render={({ field }) => (<FormItem><FormLabel>Latitude</FormLabel><FormControl><Input type="number" placeholder="e.g., 8.8932" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField name="longitude" control={form.control} render={({ field }) => (<FormItem><FormLabel>Longitude</FormLabel><FormControl><Input type="number" placeholder="e.g., 76.6141" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField name="arsNumberOfStructures" control={form.control} render={({ field }) => (<FormItem><FormLabel>Number of Structures</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField name="arsStorageCapacity" control={form.control} render={({ field }) => (<FormItem><FormLabel>Storage Capacity (m3)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField name="arsNumberOfFillings" control={form.control} render={({ field }) => (<FormItem><FormLabel>No. of Fillings</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField name="estimateAmount" control={form.control} render={({ field }) => (<FormItem><FormLabel>Estimate Amount (₹)</FormLabel><FormControl><Input type="number" placeholder="e.g., 500000" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField name="arsAsTsDetails" control={form.control} render={({ field }) => (<FormItem><FormLabel>AS/TS Accorded Details</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField name="tsAmount" control={form.control} render={({ field }) => (<FormItem><FormLabel>AS/TS Amount (₹)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField name="arsSanctionedDate" control={form.control} render={({ field }) => (<FormItem><FormLabel>Sanctioned Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className="w-full text-left font-normal"><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, "dd/MM/yyyy") : <span>Pick a date</span>}</Button></FormControl></PopoverTrigger><PopoverContent><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                  <FormField name="arsTenderedAmount" control={form.control} render={({ field }) => (<FormItem><FormLabel>Tendered Amount (₹)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField name="arsAwardedAmount" control={form.control} render={({ field }) => (<FormItem><FormLabel>Awarded Amount (₹)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField name="workStatus" control={form.control} render={({ field }) => (<FormItem><FormLabel>Present Status <span className="text-destructive">*</span></FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger></FormControl><SelectContent>{siteWorkStatusOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                  <FormField name="dateOfCompletion" control={form.control} render={({ field }) => (<FormItem><FormLabel>Completion Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className="w-full text-left font-normal"><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, "dd/MM/yyyy") : <span>Pick a date</span>}</Button></FormControl></PopoverTrigger><PopoverContent><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                  <FormField name="totalExpenditure" control={form.control} render={({ field }) => (<FormItem><FormLabel>Expenditure (₹)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField name="noOfBeneficiary" control={form.control} render={({ field }) => (<FormItem><FormLabel>No. of Beneficiaries</FormLabel><FormControl><Input placeholder="e.g., 50 Families" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField name="workRemarks" control={form.control} render={({ field }) => (<FormItem className="md:col-span-3"><FormLabel>Remarks</FormLabel><FormControl><Textarea placeholder="Additional remarks..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
                 <DialogFooter className="pt-8">
                    <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} disabled={isSubmitting}><X className="mr-2 h-4 w-4" />Cancel</Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save
                    </Button>
                </DialogFooter>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
