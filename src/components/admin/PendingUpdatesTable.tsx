
// src/components/admin/PendingUpdatesTable.tsx
"use client";

import React, { useState } from "react";
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, Info, Eye, ChevronsRight } from "lucide-react";
import { usePendingUpdates } from "@/hooks/usePendingUpdates";
import { useFileEntries } from "@/hooks/useFileEntries";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNowStrict, isValid } from "date-fns";
import { Badge } from "@/components/ui/badge";
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
import type { SiteDetailFormData, PendingUpdate } from "@/lib/schemas";
import { cn } from "@/lib/utils";


type FieldComparison = {
  label: string;
  original: any;
  updated: any;
};

// Function to compare two site objects and find the differences
const compareSites = (originalSite: SiteDetailFormData, updatedSite: SiteDetailFormData): FieldComparison[] => {
    const changes: FieldComparison[] = [];
    const fieldsToCompare: Array<{ key: keyof SiteDetailFormData; label: string; isDate?: boolean; isNumeric?: boolean }> = [
      // All fields a supervisor can edit
      { key: 'latitude', label: 'Latitude', isNumeric: true },
      { key: 'longitude', label: 'Longitude', isNumeric: true },
      { key: 'diameter', label: 'Diameter (mm)' },
      { key: 'totalDepth', label: 'TD (m)', isNumeric: true },
      { key: 'casingPipeUsed', label: 'Casing Pipe (m)' },
      { key: 'outerCasingPipe', label: 'Outer Casing (m)' },
      { key: 'innerCasingPipe', label: 'Inner Casing (m)' },
      { key: 'yieldDischarge', label: 'Discharge (LPH)' },
      { key: 'waterLevel', label: 'Water Level (m)' },
      { key: 'drillingRemarks', label: 'Drilling Remarks' },
      { key: 'pumpDetails', label: 'Pump Details' },
      { key: 'waterTankCapacity', label: 'Water Tank (L)' },
      { key: 'noOfTapConnections', label: 'Tap Connections', isNumeric: true },
      { key: 'noOfBeneficiary', label: 'Beneficiaries' },
      { key: 'dateOfCompletion', label: 'Date of Completion', isDate: true },
      { key: 'totalExpenditure', label: 'Expenditure (₹)', isNumeric: true },
      { key: 'workStatus', label: 'Work Status' },
      { key: 'workRemarks', label: 'Work Remarks' },
      { key: 'zoneDetails', label: 'Zone Details (m)' },
      { key: 'typeOfRig', label: 'Type of Rig' },
      { key: 'surveyOB', label: 'Actual OB (m)' },
      { key: 'surveyPlainPipe', label: 'Actual Plain Pipe (m)' },
      { key: 'surveySlottedPipe', label: 'Actual Slotted Pipe (m)' },
      { key: 'pilotDrillingDepth', label: 'Pilot Drilling Depth (m)'},
      { key: 'pumpingLineLength', label: 'Pumping Line (m)'},
      { key: 'deliveryLineLength', label: 'Delivery Line (m)'},
    ];


    fieldsToCompare.forEach(({ key, label, isDate, isNumeric }) => {
        let originalValue = originalSite[key];
        let updatedValue = updatedSite[key];

        if (isDate) {
            const originalDate = originalValue ? new Date(originalValue) : null;
            const updatedDate = updatedValue ? new Date(updatedValue) : null;
            const formattedOriginal = originalDate && isValid(originalDate) ? format(originalDate, 'dd/MM/yyyy') : 'N/A';
            const formattedUpdated = updatedDate && isValid(updatedDate) ? format(updatedDate, 'dd/MM/yyyy') : 'N/A';
            if (formattedOriginal !== formattedUpdated) {
                changes.push({ label, original: formattedOriginal, updated: formattedUpdated });
            }
        } else if (isNumeric) {
            const originalNum = originalValue !== undefined && originalValue !== null && originalValue !== '' ? Number(originalValue) : NaN;
            const updatedNum = updatedValue !== undefined && updatedValue !== null && updatedValue !== '' ? Number(updatedValue) : NaN;

            const formattedOriginal = !isNaN(originalNum) ? originalNum.toLocaleString('en-IN') : 'N/A';
            const formattedUpdated = !isNaN(updatedNum) ? updatedNum.toLocaleString('en-IN') : 'N/A';

            if (formattedOriginal !== formattedUpdated) {
                changes.push({ label, original: formattedOriginal, updated: formattedUpdated });
            }
        } else {
            const originalStr = originalValue ?? 'N/A';
            const updatedStr = updatedValue ?? 'N/A';
            if (String(originalStr).trim() !== String(updatedStr).trim()) {
                changes.push({ label, original: originalStr, updated: updatedStr });
            }
        }
    });

    return changes;
};


export default function PendingUpdatesTable() {
  const router = useRouter();
  const { pendingUpdates, isLoading, rejectUpdate } = usePendingUpdates();
  const { getFileEntry } = useFileEntries();
  const { toast } = useToast();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [viewingUpdate, setViewingUpdate] = useState<PendingUpdate | null>(null);
  
  const handleApproveRedirect = (updateId: string, fileNo: string) => {
    router.push(`/dashboard/data-entry?fileNo=${encodeURIComponent(fileNo)}&approveUpdateId=${encodeURIComponent(updateId)}`);
  };

  const handleReject = async (updateId: string, fileNo: string) => {
    setProcessingId(updateId);
    try {
      await rejectUpdate(updateId);
      toast({ title: "Update Rejected", description: `Changes for File No. ${fileNo} have been rejected.` });
    } catch (error: any) {
      toast({ title: "Rejection Failed", description: error.message, variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading pending updates...</p>
      </div>
    );
  }

  if (pendingUpdates.length === 0) {
    return (
      <div className="py-10 text-center text-muted-foreground border rounded-lg bg-secondary/30">
        <Info className="mx-auto h-16 w-16 text-muted-foreground/70 mb-4" />
        <p className="text-lg font-medium">No Pending Updates</p>
        <p className="text-sm">There are no submissions from supervisors awaiting review.</p>
      </div>
    );
  }

  return (
    <>
      <div className="relative w-full overflow-x-auto rounded-md border">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>File No.</TableHead>
              <TableHead>Submitted By</TableHead>
              <TableHead>Submission Time</TableHead>
              <TableHead>Sites Updated</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pendingUpdates.map((update) => (
              <TableRow key={update.id}>
                <TableCell className="font-medium">{update.fileNo}</TableCell>
                <TableCell>{update.submittedByName}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDistanceToNowStrict(update.submittedAt, { addSuffix: true })}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{update.updatedSiteDetails.length} site(s)</Badge>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setViewingUpdate(update)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-green-600 border-green-600 hover:bg-green-100 hover:text-green-700"
                      disabled={processingId === update.id}
                      onClick={() => handleApproveRedirect(update.id, update.fileNo)}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Review & Approve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive border-destructive hover:bg-red-100 hover:text-destructive"
                      disabled={processingId === update.id}
                      onClick={() => handleReject(update.id, update.fileNo)}
                    >
                      {processingId === update.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                      Reject
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {/* View Details Dialog */}
      <Dialog open={!!viewingUpdate} onOpenChange={() => setViewingUpdate(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Review Changes for File No: {viewingUpdate?.fileNo}</DialogTitle>
            <DialogDescription>
              Submitted by <strong>{viewingUpdate?.submittedByName}</strong> about {viewingUpdate ? formatDistanceToNowStrict(viewingUpdate.submittedAt, { addSuffix: true }) : ''}.
              Review the changes below before approving.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4 py-4">
              {viewingUpdate?.updatedSiteDetails.map((updatedSite, index) => {
                const originalFile = getFileEntry(viewingUpdate.fileNo);
                const originalSite = originalFile?.siteDetails?.find(
                  (site) => site.nameOfSite === updatedSite.nameOfSite
                );

                if (!originalSite) {
                    return (
                        <div key={index} className="p-4 border rounded-lg bg-destructive/10 text-destructive">
                            <h4 className="font-semibold">Error: Could not find original site data for "{updatedSite.nameOfSite}". The site might be new or its name was changed.</h4>
                        </div>
                    );
                }

                const changes = compareSites(originalSite, updatedSite);
                
                return (
                  <div key={index} className="p-4 border rounded-lg bg-secondary/50">
                    <h4 className="font-semibold text-primary mb-2 border-b pb-2">Site: {updatedSite.nameOfSite}</h4>
                    {changes.length > 0 ? (
                        <div className="space-y-2 text-sm">
                            {changes.map((change, changeIndex) => (
                                <div key={changeIndex} className="grid grid-cols-12 gap-2 items-center">
                                    <div className="col-span-3 font-medium text-muted-foreground">{change.label}:</div>
                                    <div className={cn("col-span-4 p-1.5 rounded-md text-xs bg-red-100 text-red-800", change.original === 'N/A' && "italic")}>
                                      {String(change.original)}
                                    </div>
                                    <div className="col-span-1 text-center"><ChevronsRight className="h-4 w-4 text-muted-foreground"/></div>
                                    <div className={cn("col-span-4 p-1.5 rounded-md text-xs bg-green-100 text-green-800", change.updated === 'N/A' && "italic")}>
                                      {String(change.updated)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground italic">No changes were detected for this site.</p>
                    )}
                  </div>
                )
              })}
            </div>
          </ScrollArea>
           <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
