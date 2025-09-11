// src/components/admin/PendingUpdatesTable.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePendingUpdates, type PendingUpdate } from '@/hooks/usePendingUpdates';
import { useFileEntries } from '@/hooks/useFileEntries';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, UserX, AlertTriangle, UserPlus, ListChecks } from 'lucide-react';
import { formatDistanceToNow, format, isValid } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { SiteDetailFormData, ArsEntryFormData } from '@/lib/schemas';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const toDateOrNull = (value: any): Date | null => {
  if (!value) return null;
  if (value instanceof Date && isValid(value)) return value;
  // Handle Firestore Timestamp objects
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
  const { rejectUpdate, getPendingUpdatesForFile } = usePendingUpdates();
  const { fileEntries, isLoading: filesLoading } = useFileEntries(); // Fetch all files
  const { toast } = useToast();
  
  const [pendingUpdates, setPendingUpdates] = useState<PendingUpdate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updateToReject, setUpdateToReject] = useState<string | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  
  const [changesToView, setChangesToView] = useState<{ title: string; changes: { field: string; oldValue: string; newValue: string }[] } | null>(null);

  useEffect(() => {
    const fetchUpdates = async () => {
      setIsLoading(true);
      const updates = await getPendingUpdatesForFile(null);
      updates.sort((a,b) => b.submittedAt.getTime() - a.submittedAt.getTime());
      setPendingUpdates(updates);
      setIsLoading(false);
    };
    fetchUpdates();
  }, [getPendingUpdatesForFile]);

  const handleReject = async () => {
    if (!updateToReject) return;

    setIsRejecting(true);
    try {
      await rejectUpdate(updateToReject, rejectionReason);
      toast({
        title: "Update Rejected",
        description: "The supervisor's changes have been rejected and they have been notified.",
      });
      // Refetch the data after rejection
      const updates = await getPendingUpdatesForFile(null);
      setPendingUpdates(updates);
    } catch (error: any) {
      toast({
        title: "Rejection Failed",
        description: error.message || "Could not reject the update.",
        variant: "destructive",
      });
    } finally {
      setIsRejecting(false);
      setUpdateToReject(null);
      setRejectionReason("");
    }
  };

  const handleViewChanges = (update: PendingUpdate) => {
    const originalFile = fileEntries.find(f => f.fileNo === update.fileNo);
    if (!originalFile) {
        toast({ title: "Error", description: `Original file with File No: ${update.fileNo} not found.`, variant: "destructive" });
        return;
    }

    const allChanges: { field: string; oldValue: string; newValue: string }[] = [];
    let title = `Changes for File No: ${update.fileNo}`;

    update.updatedSiteDetails.forEach((updatedSite, index) => {
        const originalSite = originalFile.siteDetails?.find(s => s.nameOfSite === updatedSite.nameOfSite);
        
        if (!originalSite) {
            toast({ title: "Warning", description: `Original site "${updatedSite.nameOfSite}" not found for comparison.`, variant: "default" });
            return;
        }

        if (update.updatedSiteDetails.length > 1) {
            allChanges.push({ field: `--- Site: ${updatedSite.nameOfSite} ---`, oldValue: '', newValue: '' });
        } else {
            title = `Changes for site "${updatedSite.nameOfSite}"`;
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
      setChangesToView({
        title: title,
        changes: allChanges,
      });
    } else {
      toast({ title: "No Changes Found", description: "No differences were found for this update.", variant: "default" });
    }
  };


  if (isLoading || filesLoading) {
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
              <TableHead>Site Name</TableHead>
              <TableHead>Purpose</TableHead>
              <TableHead>Submitted By</TableHead>
              <TableHead>Date Submitted</TableHead>
              <TableHead className="text-center">Changes</TableHead>
              <TableHead className="text-center w-[200px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pendingUpdates.length > 0 ? (
              pendingUpdates.map((update, index) => {
                const isUnassigned = update.status === 'supervisor-unassigned';
                const parentFile = fileEntries.find(f => f.fileNo === update.fileNo);
                const applicantName = parentFile?.applicantName || 'N/A';
                const siteName = update.updatedSiteDetails.map(s => s.nameOfSite).join(', ');
                const purpose = update.updatedSiteDetails.map(s => s.purpose).join(', ');
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
                    {isUnassigned ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                           <Badge variant="destructive" className="bg-amber-500/20 text-amber-700 border-amber-500/50">
                            <UserX className="mr-2 h-4 w-4" /> Supervisor Unassigned
                          </Badge>
                        </TooltipTrigger>
                         <TooltipContent><p>{update.notes || "Supervisor role was changed."}</p></TooltipContent>
                      </Tooltip>
                    ) : (
                      <Button variant="link" className="p-0 h-auto" onClick={() => handleViewChanges(update)}>
                        <ListChecks className="mr-2 h-4 w-4"/>
                        {update.updatedSiteDetails.length} site(s)
                      </Button>
                    )}
                  </TableCell>
                  <TableCell className="text-center space-x-2">
                    {isUnassigned ? (
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/dashboard/data-entry?id=${fileEntries.find(f => f.fileNo === update.fileNo)?.id}`}>
                          <UserPlus className="mr-2 h-4 w-4" /> Re-assign
                        </Link>
                      </Button>
                    ) : (
                      <>
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/dashboard/data-entry?id=${fileEntries.find(f => f.fileNo === update.fileNo)?.id}&approveUpdateId=${update.id}`}>
                            <CheckCircle className="mr-2 h-4 w-4" /> Approve
                          </Link>
                        </Button>
                        <Button 
                            size="sm" 
                            variant="destructive" 
                            onClick={() => setUpdateToReject(update.id)}
                            disabled={isRejecting}
                        >
                          <XCircle className="mr-2 h-4 w-4" /> Reject
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              )})
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center">
                  No pending updates to review.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      <AlertDialog open={!!updateToReject} onOpenChange={() => setUpdateToReject(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure you want to reject this update?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action will mark the update as rejected. The supervisor will be able to edit and resubmit their changes. Please provide a reason for the rejection below.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-2">
                <Label htmlFor="rejection-reason" className="text-left">Reason for Rejection (Optional)</Label>
                <Textarea
                    id="rejection-reason"
                    placeholder="e.g., Incorrect work status selected."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="mt-2"
                />
            </div>
            <AlertDialogFooter>
                <AlertDialogCancel disabled={isRejecting}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleReject} disabled={isRejecting} className="bg-destructive hover:bg-destructive/90">
                    {isRejecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Yes, Reject"}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!changesToView} onOpenChange={() => setChangesToView(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{changesToView?.title}</DialogTitle>
            <DialogDescription>Review the changes submitted by the supervisor.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30%]">Field</TableHead>
                  <TableHead className="w-[35%]">Original Value</TableHead>
                  <TableHead className="w-[35%]">New Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {changesToView?.changes.map((change, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium text-xs">{change.field}</TableCell>
                    <TableCell className="text-xs text-muted-foreground line-through">{change.oldValue}</TableCell>
                    <TableCell className="text-xs font-semibold text-primary">{change.newValue}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
          <DialogFooter>
            <DialogClose asChild><Button>Close</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
