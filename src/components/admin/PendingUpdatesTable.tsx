
// src/components/admin/PendingUpdatesTable.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { usePendingUpdates, type PendingUpdate } from '@/hooks/usePendingUpdates';
import { useFileEntries } from '@/hooks/useFileEntries';
import { useArsEntries, type ArsEntry } from '@/hooks/useArsEntries';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, UserX, ListChecks, Trash2 } from 'lucide-react';
import { formatDistanceToNow, format, isValid } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { SiteDetailFormData, ArsEntryFormData, DataEntryFormData } from '@/lib/schemas';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const toDateOrNull = (value: any): Date | null => {
  if (!value) return null;
  if (value instanceof Date && isValid(value)) return value;
  if (value && typeof value.seconds === 'number' && typeof value.nanoseconds === 'number') {
    const date = new Date(value.seconds * 1000 + value.nanoseconds / 1000000);
    return isValid(date) ? date : null;
  }
  if (typeof value === 'string') {
    const parsedDate = new Date(value);
    if (isValid(parsedDate)) return parsedDate;
  }
  return null;
};

const formatDateValue = (value: any): string => {
  const date = toDateOrNull(value);
  return date ? format(date, 'dd/MM/yyyy') : String(value || 'Not Set');
};

const getFieldName = (key: string) => {
    return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase());
};

export default function PendingUpdatesTable() {
  const { rejectUpdate, getPendingUpdatesForFile, deleteUpdate } = usePendingUpdates();
  const { fileEntries, isLoading: filesLoading } = useFileEntries();
  const { arsEntries, isLoading: arsLoading } = useArsEntries();
  const { toast } = useToast();
  
  const [pendingUpdates, setPendingUpdates] = useState<PendingUpdate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [updateToReject, setUpdateToReject] = useState<string | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  
  const [updateToDelete, setUpdateToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [changesToView, setChangesToView] = useState<{ title: string; changes: { field: string; oldValue: string; newValue: string }[] } | null>(null);

  const fetchUpdates = useCallback(async () => {
      setIsLoading(true);
      const updates = await getPendingUpdatesForFile(null);
      updates.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
      setPendingUpdates(updates);
      setIsLoading(false);
  }, [getPendingUpdatesForFile]);

  useEffect(() => {
    fetchUpdates();
  }, [fetchUpdates]);

  const handleReject = async () => {
    if (!updateToReject) return;
    setIsRejecting(true);
    try {
      await rejectUpdate(updateToReject, rejectionReason);
      toast({
        title: "Update Rejected",
        description: "The supervisor's changes have been rejected and they have been notified.",
      });
      fetchUpdates(); // Refetch data
    } catch (error: any) {
      toast({ title: "Rejection Failed", description: error.message || "Could not reject the update.", variant: "destructive" });
    } finally {
      setIsRejecting(false);
      setUpdateToReject(null);
      setRejectionReason("");
    }
  };

  const handleDelete = async () => {
    if (!updateToDelete) return;
    setIsDeleting(true);
    try {
      await deleteUpdate(updateToDelete);
      toast({ title: "Update Deleted", description: "The pending update has been permanently removed." });
      fetchUpdates(); // Refetch data
    } catch (error: any) {
      toast({ title: "Deletion Failed", description: error.message || "Could not delete the update.", variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setUpdateToDelete(null);
    }
  };

  const handleViewChanges = (update: PendingUpdate) => {
    let originalEntry: DataEntryFormData | ArsEntry | undefined;
    if (update.isArsUpdate) {
        originalEntry = arsEntries.find(f => f.id === update.arsId);
    } else {
        originalEntry = fileEntries.find(f => f.fileNo === update.fileNo);
    }

    if (!originalEntry) {
        toast({ title: "Error", description: `Original file with File No: ${update.fileNo} not found.`, variant: "destructive" });
        return;
    }

    const allChanges: { field: string; oldValue: string; newValue: string }[] = [];
    let title = `Changes for File No: ${update.fileNo}`;

    const originalSites = update.isArsUpdate ? [originalEntry] : (originalEntry as DataEntryFormData).siteDetails || [];

    update.updatedSiteDetails.forEach((updatedSite) => {
        const originalSite = originalSites.find(s => s.nameOfSite === updatedSite.nameOfSite);
        
        if (update.updatedSiteDetails.length > 1) {
            allChanges.push({ field: `--- Site: ${updatedSite.nameOfSite} ---`, oldValue: '', newValue: '' });
        } else {
            title = `Changes for site "${updatedSite.nameOfSite}"`;
        }

        if (!originalSite) {
            allChanges.push({ field: "Site Status", oldValue: "Exists", newValue: "DELETED or NAME CHANGED" });
            return;
        }

        Object.keys(updatedSite).forEach(key => {
            const typedKey = key as keyof (SiteDetailFormData | ArsEntryFormData);
            let originalValue = (originalSite as any)[typedKey];
            let updatedValue = (updatedSite as any)[typedKey];
            
            if (typedKey.toLowerCase().includes('date')) {
                originalValue = formatDateValue(originalValue);
                updatedValue = formatDateValue(updatedValue);
            } else {
                originalValue = originalValue ?? '';
                updatedValue = updatedValue ?? '';
            }

            if (String(originalValue) !== String(updatedValue)) {
                allChanges.push({
                    field: getFieldName(typedKey),
                    oldValue: String(originalValue) || '(empty)',
                    newValue: String(updatedValue) || '(empty)',
                });
            }
        });
    });
    
    if (allChanges.length > 0) {
      setChangesToView({ title, changes: allChanges });
    } else {
      toast({ title: "No Changes Found", description: "No differences were found for this update.", variant: "default" });
    }
  };

  if (isLoading || filesLoading || arsLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading pending updates...</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sl. No.</TableHead>
              <TableHead>File No.</TableHead>
              <TableHead>Applicant Name</TableHead>
              <TableHead>Site Name(s)</TableHead>
              <TableHead>Purpose(s)</TableHead>
              <TableHead>Submitted By</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center w-[240px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pendingUpdates.length > 0 ? (
              pendingUpdates.map((update, index) => {
                const isUnassigned = update.status === 'supervisor-unassigned';
                const parentFile = fileEntries.find(f => f.fileNo === update.fileNo);
                const applicantName = update.isArsUpdate ? 'N/A' : (parentFile?.applicantName || 'N/A');
                const siteName = update.updatedSiteDetails.map(s => s.nameOfSite).join(', ');
                const purpose = update.isArsUpdate ? (update.updatedSiteDetails[0] as ArsEntryFormData).arsTypeOfScheme : update.updatedSiteDetails.map(s => s.purpose).join(', ');
                const isRejected = update.status === 'rejected';

                let reviewLink = '';
                if(update.isArsUpdate && update.arsId) {
                    reviewLink = `/dashboard/ars/entry?id=${update.arsId}&approveUpdateId=${update.id}`;
                } else if (!update.isArsUpdate) {
                    const parentFileId = parentFile?.id;
                    if(parentFileId) {
                       reviewLink = `/dashboard/data-entry?id=${parentFileId}&approveUpdateId=${update.id}`;
                    }
                }

                return (
                <TableRow key={update.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell className="font-medium">{update.fileNo}</TableCell>
                  <TableCell>{applicantName}</TableCell>
                  <TableCell>{siteName}</TableCell>
                  <TableCell>{purpose}</TableCell>
                  <TableCell>{update.submittedByName}</TableCell>
                  <TableCell>
                    {formatDistanceToNow(update.submittedAt, { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-center">
                     <Tooltip>
                        <TooltipTrigger asChild>
                            <Badge variant={isUnassigned ? "destructive" : isRejected ? "outline" : "default"} className={isRejected ? "text-destructive border-destructive" : ""}>
                              {isUnassigned ? <UserX className="mr-1 h-3 w-3"/> : isRejected && <XCircle className="mr-1 h-3 w-3"/>}
                              {isUnassigned ? "Unassigned" : isRejected ? "Rejected" : update.status}
                            </Badge>
                        </TooltipTrigger>
                        {(isUnassigned || isRejected) && update.notes && <TooltipContent><p>{update.notes}</p></TooltipContent>}
                     </Tooltip>
                  </TableCell>
                  <TableCell className="text-center space-x-1">
                    <Button variant="link" className="p-0 h-auto" onClick={() => handleViewChanges(update)}><ListChecks className="mr-2 h-4 w-4"/>View</Button>
                    {reviewLink ? (
                      <Button asChild size="sm" variant="outline"><Link href={reviewLink}><CheckCircle className="mr-2 h-4 w-4" /> Review</Link></Button>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                           <Button size="sm" variant="outline" disabled><CheckCircle className="mr-2 h-4 w-4" /> Review</Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Original file could not be found to start review.</p></TooltipContent>
                      </Tooltip>
                    )}
                    <Button size="sm" variant="destructive" onClick={() => setUpdateToReject(update.id)} disabled={isRejecting || isRejected}><XCircle className="mr-2 h-4 w-4" /> Reject</Button>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setUpdateToDelete(update.id)} disabled={isDeleting}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Permanently Delete Update</p></TooltipContent>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              )})
            ) : (
              <TableRow><TableCell colSpan={9} className="h-24 text-center">No pending updates to review.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      <AlertDialog open={!!updateToReject} onOpenChange={() => setUpdateToReject(null)}>
        <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Reject this update?</AlertDialogTitle><AlertDialogDescription>Please provide a reason for the rejection below.</AlertDialogDescription></AlertDialogHeader>
            <div className="py-2"><Label htmlFor="rejection-reason" className="text-left">Reason (Optional)</Label><Textarea id="rejection-reason" placeholder="e.g., Incorrect work status." value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} className="mt-2" /></div>
            <AlertDialogFooter><AlertDialogCancel disabled={isRejecting}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleReject} disabled={isRejecting} className="bg-destructive hover:bg-destructive/90">{isRejecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Yes, Reject"}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!updateToDelete} onOpenChange={() => setUpdateToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Permanently delete this update?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone and will remove the update record permanently.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">{isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Yes, Delete"}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!changesToView} onOpenChange={() => setChangesToView(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>{changesToView?.title}</DialogTitle><DialogDescription>Review the changes submitted by the supervisor.</DialogDescription></DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <Table>
              <TableHeader><TableRow><TableHead className="w-[30%]">Field</TableHead><TableHead className="w-[35%]">Original Value</TableHead><TableHead className="w-[35%]">New Value</TableHead></TableRow></TableHeader>
              <TableBody>{changesToView?.changes.map((change, index) => (<TableRow key={index}><TableCell className="font-medium text-xs">{change.field}</TableCell><TableCell className="text-xs text-muted-foreground line-through">{change.oldValue}</TableCell><TableCell className="text-xs font-semibold text-primary">{change.newValue}</TableCell></TableRow>))}</TableBody>
            </Table>
          </ScrollArea>
          <DialogFooter><DialogClose asChild><Button>Close</Button></DialogClose></DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
