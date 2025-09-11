
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
import { Eye, Edit3, Trash2, Loader2, Clock } from "lucide-react";
import type { DataEntryFormData, SitePurpose, ApplicationType, SiteWorkStatus } from "@/lib/schemas";
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
import { cn } from "@/lib/utils";

const ITEMS_PER_PAGE = 50;
const FINAL_WORK_STATUSES: SiteWorkStatus[] = ['Work Failed', 'Work Completed', 'Bill Prepared', 'Payment Completed', 'Utilization Certificate Issued'];

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
  fileEntries: DataEntryFormData[];
}

export default function FileDatabaseTable({ searchTerm = "", fileEntries }: FileDatabaseTableProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { isLoading: entriesLoadingHook, deleteFileEntry } = useFileEntries(); 
  const { user, isLoading: authIsLoading } = useAuth(); 

  const [viewItem, setViewItem] = useState<DataEntryFormData | null>(null);
  const [deleteItem, setDeleteItem] = useState<DataEntryFormData | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const canEdit = user?.role === 'editor' || user?.role === 'supervisor';
  const canDelete = user?.role === 'editor';

  const filteredEntries = useMemo(() => {
    let entries = fileEntries;
    const lowerSearchTerm = searchTerm.toLowerCase();
    if (!lowerSearchTerm) {
      return entries;
    }

    return entries.filter(entry => {
        const appTypeDisplay = entry.applicationType ? applicationTypeDisplayMap[entry.applicationType as ApplicationType] : "";
        
        const searchableContent = [
            entry.fileNo, entry.applicantName, entry.phoneNo, appTypeDisplay, entry.fileStatus, entry.remarks,
            entry.estimateAmount, entry.totalRemittance, entry.totalPaymentAllEntries, entry.overallBalance,
            ...(entry.siteDetails || []).flatMap(site => [
                site.nameOfSite, site.purpose, site.workStatus, site.contractorName,
                site.supervisorName, site.tenderNo, site.drillingRemarks,
                site.workRemarks, site.surveyRemarks, site.surveyLocation,
                site.pumpDetails, site.latitude, site.longitude, site.estimateAmount,
                site.remittedAmount, site.siteConditions, site.accessibleRig,
                site.tsAmount, site.diameter, site.totalDepth, site.casingPipeUsed,
                site.outerCasingPipe, site.innerCasingPipe, site.yieldDischarge,
                site.zoneDetails, site.waterLevel, site.waterTankCapacity,
                site.noOfTapConnections, site.noOfBeneficiary, site.typeOfRig,
                site.totalExpenditure, site.surveyOB, site.surveyPlainPipe,
                site.surveySlottedPipe, site.surveyRecommendedDiameter,
                site.surveyRecommendedTD, site.surveyRecommendedOB,
                site.surveyRecommendedCasingPipe, site.surveyRecommendedPlainPipe,
                site.surveyRecommendedSlottedPipe, site.surveyRecommendedMsCasingPipe,
                site.arsNumberOfStructures, site.arsStorageCapacity, site.arsNumberOfFillings
            ]),
            ...(entry.remittanceDetails || []).flatMap(rd => [ rd.amountRemitted, rd.remittedAccount ]),
            ...(entry.paymentDetails || []).flatMap(pd => [ pd.paymentAccount, pd.revenueHead, pd.contractorsPayment, pd.gst, pd.incomeTax, pd.kbcwb, pd.refundToParty, pd.totalPaymentPerEntry, pd.paymentRemarks ]),
        ]
        .filter(val => val !== null && val !== undefined)
        .map(val => String(val).toLowerCase())
        .join(' || '); 

        return searchableContent.includes(lowerSearchTerm);
    });
  }, [fileEntries, searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, fileEntries]);

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
    if (!canEdit || !item.id) return; 
    router.push(`/dashboard/data-entry?id=${item.id}`);
  };

  const handleDeleteClick = (item: DataEntryFormData) => {
    if (!canDelete) return; 
    setDeleteItem(item);
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
    setDeleteItem(null);
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
      <Card className="shadow-lg">
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
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
              : user?.role === 'supervisor' 
              ? "You have no active files assigned to you."
              : "There are no file entries recorded yet. Start by adding new file data."
            }
          </p>
        </CardContent>
      </Card>
    );
  }

  const startEntryNum = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endEntryNum = Math.min(currentPage * ITEMS_PER_PAGE, displayedEntries.length);

  return (
    <TooltipProvider>
      <Card className="shadow-lg">
        <CardContent className="p-0">
          {totalPages > 1 && (
            <div className="p-4 border-b flex items-center justify-center">
                <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                />
            </div>
           )}
          <div className="max-h-[70vh] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
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
                {paginatedEntries.map((entry, index) => {
                  const isFilePendingForSupervisor = user?.role === 'supervisor' && entry.siteDetails?.some(s => s.isPending);
                  const isEditDisabled = isFilePendingForSupervisor || (user?.role === 'supervisor' && !entry.siteDetails?.some(s => s.supervisorUid === user.uid));
                  
                  return (
                  <TableRow key={entry.id}>
                    <TableCell className="w-[80px]">{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</TableCell>
                    <TableCell className="font-medium w-[150px]">{entry.fileNo}</TableCell>
                    <TableCell>{entry.applicantName}</TableCell>
                    <TableCell>
                      {entry.siteDetails && entry.siteDetails.length > 0
                        ? entry.siteDetails.map((site, idx) => (
                            <span key={idx} className={cn("font-semibold", FINAL_WORK_STATUSES.includes(site.workStatus as SiteWorkStatus) ? 'text-red-600' : 'text-green-600')}>
                              {site.nameOfSite}{idx < entry.siteDetails!.length - 1 ? ', ' : ''}
                            </span>
                          ))
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
                    <TableCell className={cn("font-semibold", entry.fileStatus === 'File Closed' ? 'text-red-600' : 'text-green-600')}>
                      {entry.fileStatus}
                    </TableCell>
                    <TableCell className="text-right w-[180px]">
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
                              <Button variant="ghost" size="icon" onClick={() => handleEditClick(entry)} disabled={isEditDisabled}>
                                {isFilePendingForSupervisor ? <Clock className="h-4 w-4 text-orange-500" /> : <Edit3 className="h-4 w-4" />}
                                <span className="sr-only">Edit Entry</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{isFilePendingForSupervisor ? "Pending Approval" : "Edit Entry"}</p>
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
                )})}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
              Showing <strong>{displayedEntries.length > 0 ? startEntryNum : 0}</strong>-<strong>{endEntryNum}</strong> of <strong>{displayedEntries.length}</strong> files.
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
        <DialogContent className="sm:max-w-4xl p-0 flex flex-col h-[90vh]">
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
                  {renderDetail("Type of Application", viewItem?.applicationType ? applicationTypeDisplayMap[viewItem.applicationType as ApplicationType] : "N/A")}
                  {renderDetail("Total Estimate Amount (₹)", viewItem?.estimateAmount)}
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
                  {renderDetail("Total Remittance (All Entries) (₹)", viewItem?.totalRemittance)}
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
                                {renderDetail("Pumping Line Length (m)", site.pumpingLineLength)}
                                {renderDetail("Delivery Line Length (m)", site.deliveryLineLength)}
                                {renderDetail("Water Tank Capacity (L)", site.waterTankCapacity)}
                                {renderDetail("No. of Tap Connections", site.noOfTapConnections)}
                                {renderDetail("No. of Beneficiaries", site.noOfBeneficiary)}
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

      {canDelete && (
        <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
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
