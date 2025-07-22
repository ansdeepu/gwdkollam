
// src/components/database/FileDatabaseTable.tsx
"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye, Edit3, Trash2, Loader2, FileDown } from "lucide-react";
import type { DataEntryFormData, SitePurpose, ApplicationType } from "@/lib/schemas";
import { applicationTypeDisplayMap } from "@/lib/schemas";
import { format } from "date-fns";
import Image from "next/image";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useFileEntries } from "@/hooks/useFileEntries";
import { useAuth } from "@/hooks/useAuth";
import PaginationControls from "@/components/shared/PaginationControls";
import * as XLSX from 'xlsx';

const ITEMS_PER_PAGE = 20;

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

interface FileDatabaseTableProps {
  searchTerm?: string;
}

export default function FileDatabaseTable({ searchTerm = "" }: FileDatabaseTableProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { fileEntries, isLoading: entriesLoadingHook, deleteFileEntry } = useFileEntries(); 
  const { user, isLoading: authIsLoading } = useAuth(); 

  const [viewItem, setViewItem] = useState<DataEntryFormData | null>(null);
  const [deleteItem, setDeleteItem] = useState<DataEntryFormData | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const canEdit = user?.role === 'editor' || user?.role === 'supervisor';
  const canDelete = user?.role === 'editor';

  const filteredEntries = useMemo(() => {
    const lowerSearchTerm = searchTerm.toLowerCase();
    if (!lowerSearchTerm) {
      return fileEntries;
    }

    return fileEntries.filter(entry => {
      const appTypeDisplay = entry.applicationType ? applicationTypeDisplayMap[entry.applicationType as ApplicationType] : "";
      
      const mainFieldsToSearch = [
        entry.fileNo,
        entry.applicantName,
        entry.phoneNo,
        appTypeDisplay,
        entry.fileStatus,
        entry.remarks,
      ].filter(Boolean).map(val => String(val).toLowerCase());

      if (mainFieldsToSearch.some(field => field.includes(lowerSearchTerm))) {
        return true;
      }
      
      if (entry.siteDetails?.some(site => 
        [
          site.nameOfSite,
          site.purpose,
          site.workStatus,
          site.contractorName,
          site.supervisorName,
          site.tenderNo,
          site.drillingRemarks,
          site.workRemarks,
          site.surveyRemarks,
          site.surveyLocation,
          site.pumpDetails
        ].filter(Boolean).map(val => String(val).toLowerCase()).some(field => field.includes(lowerSearchTerm))
      )) {
        return true;
      }

      if (entry.remittanceDetails?.some(rd => 
        rd.remittedAccount?.toLowerCase().includes(lowerSearchTerm)
      )) {
        return true;
      }

      if (entry.paymentDetails?.some(pd => 
        (pd.paymentAccount?.toLowerCase().includes(lowerSearchTerm)) ||
        (pd.paymentRemarks?.toLowerCase().includes(lowerSearchTerm))
      )) {
        return true;
      }

      return false;
    });
  }, [fileEntries, searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const displayedEntries = filteredEntries;

  const paginatedEntries = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return displayedEntries.slice(startIndex, endIndex);
  }, [displayedEntries, currentPage]);

  const totalPages = Math.ceil(displayedEntries.length / ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleViewClick = (item: DataEntryFormData) => {
    setViewItem(item);
    setIsViewDialogOpen(true);
  };

  const handleEditClick = (item: DataEntryFormData) => {
    if (!canEdit) return; 
    router.push(`/dashboard/data-entry?fileNo=${encodeURIComponent(item.fileNo || "unknown")}`);
  };

  const handleDeleteClick = (item: DataEntryFormData) => {
    if (!canDelete) return; 
    setDeleteItem(item);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!canDelete) return; 
    if (deleteItem && deleteItem.fileNo) {
      setIsDeleting(true);
      try {
        await deleteFileEntry(deleteItem.fileNo);
        toast({
          title: "File Entry Deleted",
          description: `File No: ${deleteItem.fileNo} has been deleted.`,
        });
        if (paginatedEntries.length === 1 && currentPage > 1) {
          setCurrentPage(currentPage - 1);
        }
      } catch (error: any) {
         toast({
          title: "Error Deleting File",
          description: error.message || `Could not delete File No: ${deleteItem.fileNo}.`,
          variant: "destructive",
        });
      } finally {
        setIsDeleting(false);
      }
    }
    setIsDeleteDialogOpen(false);
    setDeleteItem(null);
  };

  const handleExportSingleFileToExcel = () => {
    if (!viewItem) {
        toast({ title: "No Data", description: "No file data to export.", variant: "default" });
        return;
    }
    
    const wb = XLSX.utils.book_new();
    const sheetName = `File_${viewItem.fileNo}`.replace(/[/\\?*\[\]]/g, '-').substring(0, 31);
    
    const dataForSheet: (string | number | Date | null)[][] = [];

    // --- Title & Header ---
    dataForSheet.push(["Ground Water Department, Kollam"]);
    dataForSheet.push([`Detailed Report for File No: ${viewItem.fileNo}`]);
    dataForSheet.push([`Report generated on: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`]);
    dataForSheet.push([]); // Spacer

    const addSection = (title: string, data: Record<string, any>) => {
        dataForSheet.push([title]);
        Object.entries(data).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                dataForSheet.push([key, value]);
            }
        });
        dataForSheet.push([]); // Spacer
    };
    
    // --- Main Details ---
    const mainDetails = {
        "File No": viewItem.fileNo,
        "Name & Address": viewItem.applicantName,
        "Phone No": viewItem.phoneNo,
        "Type of Application": viewItem.applicationType ? applicationTypeDisplayMap[viewItem.applicationType as ApplicationType] : "N/A",
        "Total Estimate Amount (₹)": viewItem.estimateAmount,
    };
    addSection("Main Details", mainDetails);

    // --- Remittance Details ---
    if (viewItem.remittanceDetails && viewItem.remittanceDetails.length > 0) {
      dataForSheet.push(["Remittance Details"]);
      dataForSheet.push(["#", "Date", "Amount (₹)", "Account"]);
      viewItem.remittanceDetails.forEach((rd, i) => {
        dataForSheet.push([
            i + 1,
            rd.dateOfRemittance ? format(new Date(rd.dateOfRemittance), 'dd/MM/yyyy') : 'N/A',
            rd.amountRemitted ?? 'N/A',
            rd.remittedAccount ?? 'N/A'
        ]);
      });
      dataForSheet.push(["", "Total Remittance (₹)", viewItem.totalRemittance ?? 0, ""]);
      dataForSheet.push([]);
    }

    // --- Site Details ---
    viewItem.siteDetails?.forEach((site, index) => {
        addSection(`Site #${index + 1}: ${site.nameOfSite}`, {
            "Purpose": site.purpose,
            "Latitude": site.latitude,
            "Longitude": site.longitude,
            "Survey - Recommended Diameter (mm)": site.surveyRecommendedDiameter,
            "Survey - Recommended TD (m)": site.surveyRecommendedTD,
            "Drilling - Actual Diameter (mm)": site.diameter,
            "Drilling - Actual TD (m)": site.totalDepth,
            "Discharge (LPH)": site.yieldDischarge,
            "Water Level (m)": site.waterLevel,
            "Date of Completion": site.dateOfCompletion ? format(new Date(site.dateOfCompletion), 'dd/MM/yyyy') : 'N/A',
            "Work Status": site.workStatus,
            "Contractor": site.contractorName,
            "Supervisor": site.supervisorName,
            "Total Expenditure (₹)": site.totalExpenditure,
            "Work Remarks": site.workRemarks,
        });
    });

    // --- Payment Details ---
    if (viewItem.paymentDetails && viewItem.paymentDetails.length > 0) {
      dataForSheet.push(["Payment Details"]);
      dataForSheet.push(["#", "Date", "Account", "Contractor's (₹)", "GST (₹)", "Income Tax (₹)", "KBCWB (₹)", "Refund (₹)", "Revenue Head (₹)", "Total (₹)"]);
      viewItem.paymentDetails.forEach((pd, i) => {
        dataForSheet.push([
          i+1,
          pd.dateOfPayment ? format(new Date(pd.dateOfPayment), 'dd/MM/yyyy') : 'N/A',
          pd.paymentAccount ?? 'N/A',
          pd.contractorsPayment ?? 0,
          pd.gst ?? 0,
          pd.incomeTax ?? 0,
          pd.kbcwb ?? 0,
          pd.refundToParty ?? 0,
          pd.revenueHead ?? 0,
          pd.totalPaymentPerEntry ?? 0
        ]);
      });
      dataForSheet.push([]);
    }

    // --- Final Summary ---
    addSection("Final Summary", {
        "File Status": viewItem.fileStatus,
        "Final Remarks": viewItem.remarks,
        "Total Remittance (₹)": viewItem.totalRemittance,
        "Total Payment (₹)": viewItem.totalPaymentAllEntries,
        "Overall Balance (₹)": viewItem.overallBalance,
    });
    
    const ws = XLSX.utils.aoa_to_sheet(dataForSheet, { cellStyles: false });

    // --- Styling ---
    ws['!cols'] = [{ wch: 35 }, { wch: 35 }]; // Set default widths for key-value pairs
    ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }, // Title
        { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } }, // Subtitle
        { s: { r: 2, c: 0 }, e: { r: 2, c: 3 } }, // Generated on
    ];

    dataForSheet.forEach((row, R) => {
      row.forEach((cell, C) => {
        const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };

        let isHeader = false;
        if (row.length === 1 && C === 0) { // Section headers
          isHeader = true;
          if (ws['!merges']) ws['!merges'].push({ s: { r: R, c: 0 }, e: { r: R, c: 3 } });
        } else if (dataForSheet[R-1] && dataForSheet[R-1].length === 1) { // Table headers
          isHeader = true;
        }

        ws[cellRef].s = {
          font: { bold: isHeader, sz: R < 3 ? (R === 0 ? 16 : 14) : 11 },
          alignment: { vertical: "center", wrapText: true, horizontal: R < 3 ? "center" : "left" },
          fill: { fgColor: { rgb: isHeader ? "F0F0F0" : "FFFFFF" } }
        };
        
        if (typeof cell === 'number') {
           ws[cellRef].t = 'n';
           ws[cellRef].z = '#,##0.00';
        }
      })
    });
    
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    const uniqueFileName = `GWD_Report_${viewItem.fileNo.replace(/[/\\?*\[\]]/g, '-')}_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
    XLSX.writeFile(wb, uniqueFileName);

    toast({ title: "Excel Exported", description: `Report for File No. ${viewItem.fileNo} downloaded.` });
  };


  if (entriesLoadingHook || authIsLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading data...</p>
      </div>
    );
  }

  if (!displayedEntries || displayedEntries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center border rounded-lg shadow-sm bg-card">
        <Image
            src="https://placehold.co/128x128/F0F2F5/3F51B5.png?text=No+Files"
            width={100}
            height={100}
            alt="No files in room"
            className="mb-4 opacity-70 rounded-lg"
            data-ai-hint="empty room illustration"
        />
        <h3 className="text-xl font-semibold text-foreground">No Files Found</h3>
        <p className="text-muted-foreground">
          {searchTerm
            ? "No files match your search."
            : "There are no file entries recorded yet. Start by adding new file data."
          }
        </p>
      </div>
    );
  }

  const startEntryNum = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endEntryNum = Math.min(currentPage * ITEMS_PER_PAGE, displayedEntries.length);

  return (
    <TooltipProvider>
      <Card className="shadow-lg">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Sl. No.</TableHead>
                <TableHead className="w-[150px]">File No.</TableHead>
                <TableHead>Institution / Applicant Name</TableHead>
                <TableHead>Site Name(s)</TableHead>
                <TableHead>Purpose(s)</TableHead>
                <TableHead>Date of Remittance</TableHead> 
                <TableHead>File Status</TableHead>
                <TableHead className="text-center w-[180px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedEntries.map((entry, index) => (
                <TableRow key={entry.fileNo}>
                  <TableCell>{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</TableCell>
                  <TableCell className="font-medium">{entry.fileNo}</TableCell>
                  <TableCell>{entry.applicantName}</TableCell>
                  <TableCell>
                    {entry.siteDetails && entry.siteDetails.length > 0
                      ? entry.siteDetails.map(site => site.nameOfSite).filter(Boolean).join(', ') || "N/A"
                      : "N/A"}
                  </TableCell>
                  <TableCell>
                    {entry.siteDetails && entry.siteDetails.length > 0
                      ? entry.siteDetails.map(site => site.purpose).filter(Boolean).join(', ') || "N/A"
                      : "N/A"}
                  </TableCell>
                  <TableCell>
                    {entry.remittanceDetails?.[0]?.dateOfRemittance 
                      ? format(new Date(entry.remittanceDetails[0].dateOfRemittance), "dd/MM/yyyy") 
                      : "N/A"}
                  </TableCell>
                  <TableCell>
                    {entry.fileStatus}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => handleViewClick(entry)}>
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">View Details</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>View Details</p>
                        </TooltipContent>
                      </Tooltip>
                      {canEdit && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => handleEditClick(entry)}>
                              <Edit3 className="h-4 w-4" />
                              <span className="sr-only">Edit Entry</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Edit Entry</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {canDelete && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteClick(entry)} disabled={isDeleting && deleteItem?.fileNo === entry.fileNo}>
                              {isDeleting && deleteItem?.fileNo === entry.fileNo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                              <span className="sr-only">Delete Entry</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Delete Entry</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
              Showing <strong>{displayedEntries.length > 0 ? startEntryNum : 0}</strong>-<strong>{endEntryNum}</strong> of <strong>{displayedEntries.length}</strong> entries.
          </p>
          {totalPages > 1 && (
            <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
            />
          )}
        </CardFooter>
      </Card>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>File Details: {viewItem?.fileNo}</DialogTitle>
            <DialogDescription>
              Comprehensive information for the selected file entry.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-5 -mr-2">
            <div className="space-y-3 py-4">
              {/* Main Details Section */}
              <h4 className="text-md font-semibold text-primary mb-1 border-b pb-1">Main Details</h4>
              {renderDetail("File No", viewItem?.fileNo)}
              {renderDetail("Name & Address of Applicant", viewItem?.applicantName)}
              {renderDetail("Phone No", viewItem?.phoneNo)}
              {renderDetail("Type of Application", viewItem?.applicationType ? applicationTypeDisplayMap[viewItem.applicationType as ApplicationType] : "N/A")}
              {renderDetail("Total Estimate Amount (₹)", viewItem?.estimateAmount)}
              
              {/* Remittance Details Section */}
              {viewItem?.remittanceDetails && viewItem.remittanceDetails.length > 0 && (
                <div className="pt-2">
                  <h4 className="text-md font-semibold text-primary mb-1 border-b pb-1">Remittance Details</h4>
                  {viewItem.remittanceDetails.map((rd, index) => (
                    <div key={`remit-${index}`} className="mb-2 p-2 border rounded-md bg-secondary/20">
                      <h5 className="text-sm font-semibold mb-1 text-muted-foreground">Remittance #{index + 1}</h5>
                      {renderDetail("Amount Remitted (₹)", rd.amountRemitted)}
                      {renderDetail("Date of Remittance", rd.dateOfRemittance)}
                      {renderDetail("Remitted Account", rd.remittedAccount)}
                    </div>
                  ))}
                   {renderDetail("Total Remittance (All Entries) (₹)", viewItem?.totalRemittance)}
                </div>
              )}
              
              {/* Site Details Section */}
              {viewItem?.siteDetails && viewItem.siteDetails.length > 0 && (
                <div className="pt-4">
                  <h4 className="text-md font-semibold text-primary mb-2 border-b pb-1">Site Details</h4>
                  {viewItem.siteDetails.map((site, index) => {
                    const purpose = site.purpose as SitePurpose;
                    const isWellPurpose = ['BWC', 'TWC', 'FPW'].includes(purpose);
                    const isDevPurpose = ['BW Dev', 'TW Dev', 'FPW Dev'].includes(purpose);
                    const isMWSSSchemePurpose = ['MWSS', 'MWSS Ext', 'Pumping Scheme', 'MWSS Pump Reno'].includes(purpose);
                    const isHPSPurpose = ['HPS', 'HPR'].includes(purpose);
                    const isARSPurpose = ['ARS'].includes(purpose);

                    return (
                    <div key={`site-${index}`} className="mb-4 p-3 border rounded-md bg-secondary/30">
                      <h5 className="text-base font-semibold mb-1.5 text-foreground">Site #{index + 1}: {site.nameOfSite}</h5>
                      {renderDetail("Purpose", site.purpose)}
                      {renderDetail("Latitude", site.latitude)}
                      {renderDetail("Longitude", site.longitude)}

                      {isWellPurpose && (
                        <>
                          <h6 className="text-sm font-semibold text-primary mt-3 pt-2 border-t">Survey Details (Recommended)</h6>
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

                          <h6 className="text-sm font-semibold text-primary mt-3 pt-2 border-t">Drilling Details (Actuals)</h6>
                          {renderDetail("Actual Diameter (mm)", site.diameter)}
                          {renderDetail("Actual TD (m)", site.totalDepth)}
                          {purpose === 'BWC' && renderDetail("Actual OB (m)", site.surveyOB)}
                          {renderDetail("Actual Casing Pipe (m)", site.casingPipeUsed)}
                          {purpose === 'BWC' && renderDetail("Actual Inner Casing Pipe (m)", site.innerCasingPipe)}
                          {purpose === 'BWC' && renderDetail("Actual Outer Casing Pipe (m)", site.outerCasingPipe)}
                          {purpose === 'TWC' && renderDetail("Actual Plain Pipe (m)", site.surveyPlainPipe)}
                          {purpose === 'TWC' && renderDetail("Actual Slotted Pipe (m)", site.surveySlottedPipe)}
                          {purpose === 'TWC' && renderDetail("Actual MS Casing Pipe (m)", site.outerCasingPipe)}
                          {renderDetail("Yield Discharge (LPH)", site.yieldDischarge)}
                          {renderDetail("Zone Details (m)", site.zoneDetails)}
                          {renderDetail("Static Water Level (m)", site.waterLevel)}
                          {renderDetail("Type of Rig Used", site.typeOfRig)}
                          {renderDetail("Drilling Remarks", site.drillingRemarks)}
                        </>
                      )}
                      
                      {isDevPurpose && (
                        <>
                          <h6 className="text-sm font-semibold text-primary mt-3 pt-2 border-t">Developing Details</h6>
                          {renderDetail("Diameter (mm)", site.diameter)}
                          {renderDetail("TD (m)", site.totalDepth)}
                          {renderDetail("Discharge (LPH)", site.yieldDischarge)}
                          {renderDetail("Water Level (m)", site.waterLevel)}
                        </>
                      )}

                      {isMWSSSchemePurpose && (
                        <>
                          <h6 className="text-sm font-semibold text-primary mt-3 pt-2 border-t">Scheme Details</h6>
                          {renderDetail("Well Discharge (LPH)", site.yieldDischarge)}
                          {renderDetail("Pump Details", site.pumpDetails)}
                          {renderDetail("Water Tank Capacity (L)", site.waterTankCapacity)}
                          {renderDetail("No. of Tap Connections", site.noOfTapConnections)}
                          {renderDetail("No. of Beneficiaries", site.noOfBeneficiary)}
                        </>
                      )}
                      
                      {isHPSPurpose && (
                        <>
                          <h6 className="text-sm font-semibold text-primary mt-3 pt-2 border-t">Scheme Details</h6>
                          {renderDetail("Depth Erected (m)", site.totalDepth)}
                          {renderDetail("Water Level (m)", site.waterLevel)}
                        </>
                      )}

                      {isARSPurpose && (
                        <>
                           <h6 className="text-sm font-semibold text-primary mt-3 pt-2 border-t">ARS Scheme Details</h6>
                           {renderDetail("Number of Structures", site.arsNumberOfStructures)}
                           {renderDetail("Storage Capacity (m³)", site.arsStorageCapacity)}
                           {renderDetail("Number of Fillings", site.arsNumberOfFillings)}
                           {renderDetail("Number of Beneficiaries", site.noOfBeneficiary)}
                        </>
                      )}

                      <h6 className="text-sm font-semibold text-primary mt-3 pt-2 border-t">Work & Financial Details</h6>
                      {renderDetail("Site Conditions", site.siteConditions)}
                      {renderDetail("Rig Accessibility", site.accessibleRig)}
                      {renderDetail("Site Estimate (₹)", site.estimateAmount)}
                      {renderDetail("Remitted for Site (₹)", site.remittedAmount)}
                      {renderDetail("TS Amount (₹)", site.tsAmount)}
                      {renderDetail("Tender No.", site.tenderNo)}
                      {renderDetail("Contractor Name", site.contractorName)}
                      {renderDetail("Assigned Supervisor", site.supervisorName)}
                      {renderDetail("Date of Completion", site.dateOfCompletion)}
                      {renderDetail("Total Expenditure (₹)", site.totalExpenditure)}
                      {renderDetail("Work Status", site.workStatus)}
                      {renderDetail("Work Remarks", site.workRemarks)}
                    </div>
                  )})}
                </div>
              )}

              {/* Payment Details Section */}
              {viewItem?.paymentDetails && viewItem.paymentDetails.length > 0 && (
                <div className="pt-2">
                  <h4 className="text-md font-semibold text-primary mb-1 border-b pb-1">Payment Details</h4>
                  {viewItem.paymentDetails.map((pd, index) => (
                     <div key={`payment-${index}`} className="mb-3 p-3 border rounded-md bg-accent/10">
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
              
              {/* File Status & Remarks Section */}
              <div className="pt-2">
                 <h4 className="text-md font-semibold text-primary mb-1 border-b pb-1">File Status & Final Remarks</h4>
                {renderDetail("File Status", viewItem?.fileStatus)}
                {renderDetail("Final Remarks", viewItem?.remarks)}
              </div>
            </div>
          </ScrollArea>
           <DialogFooter className="pt-4 mt-auto">
              <Button variant="outline" onClick={handleExportSingleFileToExcel}>
                <FileDown className="mr-2 h-4 w-4" /> Export Excel
              </Button>
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Close
                </Button>
              </DialogClose>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      {canDelete && (
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                This action will delete the file entry for
                <strong> {deleteItem?.fileNo}</strong>. This cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeleteItem(null)} disabled={isDeleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                    onClick={confirmDelete} 
                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                    disabled={isDeleting}
                >
                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Delete"}
                </AlertDialogAction>
            </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}
    </TooltipProvider>
  );
}
