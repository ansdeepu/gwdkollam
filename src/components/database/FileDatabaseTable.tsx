// src/components/database/FileDatabaseTable.tsx
"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye, Edit3, Trash2, Loader2, Clock, Copy } from "lucide-react";
import type { DataEntryFormData, SitePurpose, ApplicationType, SiteWorkStatus, PendingUpdate, SiteDetailFormData } from "@/lib/schemas";
import { applicationTypeDisplayMap } from "@/lib/schemas";
import { format, isValid, parseISO } from "date-fns";
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
import { useToast } from "@/hooks/use-toast";
import { useFileEntries } from "@/hooks/useFileEntries";
import { useAuth } from "@/hooks/useAuth";
import PaginationControls from "@/components/shared/PaginationControls";
import { cn } from "@/lib/utils";
import { v4 as uuidv4 } from 'uuid';


const ITEMS_PER_PAGE = 50;

// Helper function to safely parse dates, whether they are strings or Date objects
const safeParseDate = (dateValue: any): Date | null => {
  if (!dateValue) return null;
  if (dateValue instanceof Date && isValid(dateValue)) {
    return dateValue;
  }
  if (typeof dateValue === 'string') {
    const parsed = parseISO(dateValue);
    if (isValid(parsed)) return parsed;
  }
  // Fallback for other potential date-like objects from Firestore
  if (typeof dateValue === 'object' && dateValue.toDate) {
    const parsed = dateValue.toDate();
    if (isValid(parsed)) return parsed;
  }
  return null;
};

// New helper function for color coding
const getStatusColorClass = (status: SiteWorkStatus | undefined): string => {
    if (!status) return 'text-muted-foreground';
    if (status === 'Work Failed' || status === 'WorkCompleted' || status === 'Bill Prepared' || status === 'Payment Completed' || status === 'Utilization Certificate Issued') {
        return 'text-red-600';
    }
    if (status === 'To be Refunded') {
        return 'text-yellow-600';
    }
    // For all other statuses, including ongoing ones
    return 'text-green-600';
};


interface FileDatabaseTableProps {
  searchTerm?: string;
  fileEntries: DataEntryFormData[];
}

export default function FileDatabaseTable({ searchTerm = "", fileEntries }: FileDatabaseTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { isLoading: entriesLoadingHook, deleteFileEntry, addFileEntry } = useFileEntries(); 
  const { user, isLoading: authIsLoading } = useAuth(); 

  const [deleteItem, setDeleteItem] = useState<DataEntryFormData | null>(null);
  const [itemToCopy, setItemToCopy] = useState<DataEntryFormData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);

  const canEdit = user?.role === 'editor' || user?.role === 'supervisor';
  const canDelete = user?.role === 'editor';
  const canCopy = user?.role === 'editor';

  useEffect(() => {
    const pageFromUrl = searchParams.get('page');
    const pageNum = pageFromUrl ? parseInt(pageFromUrl, 10) : 1;
    if (!isNaN(pageNum) && pageNum > 0) {
      setCurrentPage(pageNum);
    }
  }, [searchParams]);

  const filteredEntries = useMemo(() => {
    let entries = fileEntries;
    const lowerSearchTerm = searchTerm.toLowerCase();
    if (!lowerSearchTerm) {
      return entries;
    }

    return entries.filter(entry => {
        const appTypeDisplay = entry.applicationType ? applicationTypeDisplayMap[entry.applicationType as ApplicationType] : "";
        
        const searchableContent = [
            entry.fileNo, entry.applicantName, entry.phoneNo, entry.secondaryMobileNo, appTypeDisplay, entry.fileStatus, entry.remarks, entry.constituency,
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
                site.arsNumberOfStructures, site.arsStorageCapacity, site.arsNumberOfFillings,
                site.constituency, site.localSelfGovt, site.pumpingLineLength, site.deliveryLineLength,
                site.pilotDrillingDepth,
            ]),
            ...(entry.remittanceDetails || []).flatMap(rd => [ rd.amountRemitted, rd.remittedAccount, rd.remittanceRemarks, rd.dateOfRemittance ? format(new Date(rd.dateOfRemittance), "dd/MM/yyyy") : '']),
            ...(entry.paymentDetails || []).flatMap(pd => [ pd.paymentAccount, pd.revenueHead, pd.contractorsPayment, pd.gst, pd.incomeTax, pd.kbcwb, pd.refundToParty, pd.totalPaymentPerEntry, pd.paymentRemarks, pd.dateOfPayment ? format(new Date(pd.dateOfPayment), "dd/MM/yyyy") : '' ]),
        ]
        .filter(val => val !== null && val !== undefined)
        .map(val => String(val).toLowerCase())
        .join(' || '); 

        return searchableContent.includes(lowerSearchTerm);
    });
  }, [fileEntries, searchTerm]);


  const displayedEntries = filteredEntries;

  const paginatedEntries = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return displayedEntries.slice(startIndex, endIndex);
  }, [displayedEntries, currentPage]);


  const totalPages = Math.ceil(displayedEntries.length / ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(page));
    router.push(`?${params.toString()}`);
  };

  const handleViewClick = (item: DataEntryFormData) => {
    if (!item.id) return;
    const workTypeParam = item.applicationType?.startsWith("Private_") ? "private" : "public";
    const pageParam = currentPage > 1 ? `&page=${currentPage}` : '';
    const queryParams = new URLSearchParams({ id: item.id, workType: workTypeParam, ...(pageParam && { page: String(currentPage) }) }).toString();
    router.push(`/dashboard/data-entry?${queryParams}`);
  };

  const handleDeleteClick = (item: DataEntryFormData) => {
    if (!canDelete) return; 
    setDeleteItem(item);
  };

  const confirmDelete = async () => {
    if (!canDelete || !deleteItem || !deleteItem.id) return;
    
    setIsDeleting(true);
    try {
        await deleteFileEntry(deleteItem.id);
        toast({
            title: "File Entry Deleted",
            description: `File No: ${deleteItem.fileNo || deleteItem.id} has been deleted.`,
        });
    } catch (error: any) {
        toast({
            title: "Error Deleting File",
            description: error.message || `Could not delete the file.`,
            variant: "destructive",
        });
    } finally {
        setIsDeleting(false);
        setDeleteItem(null);
    }
  };

  const handleCopyClick = (item: DataEntryFormData) => {
    if (!canCopy) return;
    setItemToCopy(item);
  };

  const confirmCopy = async () => {
      if (!canCopy || !itemToCopy || !itemToCopy.id) return;
      setIsCopying(true);
      try {
          const newFileEntry: DataEntryFormData = {
              ...JSON.parse(JSON.stringify(itemToCopy)), // Deep copy
              id: uuidv4(), // Give it a temporary client-side ID
              fileNo: `${itemToCopy.fileNo}-COPY`,
          };
          
          delete (newFileEntry as any).createdAt;
          delete (newFileEntry as any).updatedAt;

          const newDocId = await addFileEntry(newFileEntry);
          if (!newDocId) {
            throw new Error("Failed to get ID for new copied file.");
          }
          
          toast({ title: 'File Copied', description: `A copy of ${itemToCopy.fileNo} was created. You can now edit it.` });
          router.push(`/dashboard/data-entry?id=${newDocId}`);

      } catch (error: any) {
          toast({ title: 'Copy Failed', description: error.message || 'Could not copy the file.', variant: 'destructive' });
      } finally {
          setIsCopying(false);
          setItemToCopy(null);
      }
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
                  <TableHead className="w-[5%] px-2 py-3 text-sm">Sl. No.</TableHead>
                  <TableHead className="w-[10%] px-2 py-3 text-sm">File No.</TableHead>
                  <TableHead className="w-[15%] px-2 py-3 text-sm">Applicant Name</TableHead>
                  <TableHead className="w-[25%] px-2 py-3 text-sm">Site Name(s)</TableHead>
                  <TableHead className="w-[10%] px-2 py-3 text-sm">Purpose(s)</TableHead>
                  <TableHead className="w-[10%] px-2 py-3 text-sm">Remittance</TableHead>
                  <TableHead className="w-[10%] px-2 py-3 text-sm">File Status</TableHead>
                  <TableHead className="text-center w-[15%] px-2 py-3 text-sm">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedEntries.map((entry, index) => {
                  const sitesToDisplay = entry.siteDetails || [];

                  return (
                  <TableRow key={entry.id}>
                    <TableCell className="w-[5%] px-2 py-2 text-sm text-center">{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</TableCell>
                    <TableCell className="font-medium w-[10%] px-2 py-2 text-sm">{entry.fileNo}</TableCell>
                    <TableCell className="w-[15%] px-2 py-2 text-sm">{entry.applicantName}</TableCell>
                    <TableCell className="w-[25%] px-2 py-2 text-sm">
                       {sitesToDisplay.length > 0 ? (
                        sitesToDisplay.map((site, idx) => (
                            <span key={idx} className={cn("font-semibold", getStatusColorClass(site.workStatus as SiteWorkStatus))}>
                              {site.nameOfSite}{idx < sitesToDisplay.length - 1 ? ', ' : ''}
                            </span>
                          )
                        )
                      ) : (
                        <span className="text-muted-foreground italic">No active sites</span>
                      )}
                    </TableCell>
                    <TableCell className="w-[10%] px-2 py-2 text-sm">
                      {sitesToDisplay.length > 0
                        ? sitesToDisplay.map(site => site.purpose).filter(Boolean).join(', ')
                        : "N/A"}
                    </TableCell>
                    <TableCell className="w-[10%] px-2 py-2 text-sm">
                      {entry.remittanceDetails?.[0]?.dateOfRemittance 
                        ? format(new Date(entry.remittanceDetails[0].dateOfRemittance), "dd/MM/yyyy") 
                        : "N/A"}
                    </TableCell>
                    <TableCell className="font-semibold w-[10%] px-2 py-2 text-sm">
                        {entry.fileStatus}
                    </TableCell>
                    <TableCell className="text-right w-[15%] px-2 py-2">
                      <div className="flex items-center justify-end space-x-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => handleViewClick(entry)}>
                               <Eye className="h-4 w-4" />
                               <span className="sr-only">View Details</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{canEdit ? "View / Edit" : "View Details"}</p>
                          </TooltipContent>
                        </Tooltip>
                        {canCopy && (
                          <Tooltip>
                              <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" onClick={() => handleCopyClick(entry)} disabled={isCopying}>
                                      <Copy className="h-4 w-4" />
                                      <span className="sr-only">Make a Copy</span>
                                  </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Make a Copy</p></TooltipContent>
                          </Tooltip>
                        )}
                        {canDelete && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteClick(entry)} disabled={isDeleting && deleteItem?.id === entry.id}>
                                {isDeleting && deleteItem?.id === entry.id ? <Loader2 className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                                <span className="sr-only">Delete Entry</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Delete Entry</p></TooltipContent>
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

      {canDelete && (
        <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
            <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                This action will delete the file entry for
                <strong> {deleteItem?.fileNo || deleteItem?.id}</strong>. This cannot be undone.
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

      {canCopy && (
        <AlertDialog open={!!itemToCopy} onOpenChange={() => setItemToCopy(null)}>
            <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Confirm Copy</AlertDialogTitle>
                <AlertDialogDescription>
                Are you sure you want to create a copy of file <strong>{itemToCopy?.fileNo}</strong>?
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setItemToCopy(null)} disabled={isCopying}>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                    onClick={confirmCopy}
                    disabled={isCopying}
                >
                {isCopying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Yes, Copy"}
                </AlertDialogAction>
            </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}

    </TooltipProvider>
  );
}
