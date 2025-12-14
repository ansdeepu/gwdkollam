// src/app/dashboard/pending-updates/page.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { usePendingUpdates, type PendingUpdate } from '@/hooks/usePendingUpdates';
import { useFileEntries } from '@/hooks/useFileEntries';
import { useArsEntries, type ArsEntry } from '@/hooks/useArsEntries';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
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
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { usePageHeader } from '@/hooks/usePageHeader';

const Loader2 = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> );
const CheckCircle = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> );
const XCircle = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg> );
const UserX = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="22" x2="16" y1="11" y2="11"/><line x1="16" x2="22" y1="11" y2="11"/></svg> );
const ListChecks = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 17.5 7.5 22l14-14"/><path d="M3 7.5 7.5 12l14-14"/><path d="M10 12.5 7.5 15l-5-5"/><path d="M10 2.5 7.5 5l-5-5"/></svg> );
const Trash2 = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg> );
const FolderOpen = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m6 14 1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H16.5a2 2 0 0 1 2 2v1"/></svg> );
const Waves = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M2 6c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/></svg> );


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

const UpdateTable = ({
  title,
  icon: Icon,
  updates,
  isArsTable = false,
  fileEntries,
  handleViewChanges,
  setUpdateToReject,
  setUpdateToDelete,
  isRejecting,
  isDeleting,
  arsEntries,
}: {
  title: string;
  icon: React.ElementType;
  updates: PendingUpdate[];
  isArsTable?: boolean;
  fileEntries: DataEntryFormData[];
  handleViewChanges: (update: PendingUpdate) => void;
  setUpdateToReject: (id: string | null) => void;
  setUpdateToDelete: (id: string | null) => void;
  isRejecting: boolean;
  isDeleting: boolean;
  arsEntries: ArsEntry[];
}) => {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          {title} ({updates.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sl. No.</TableHead>
                <TableHead>File No.</TableHead>
                {!isArsTable && <TableHead>Applicant Name</TableHead>}
                <TableHead>Site Name(s)</TableHead>
                {!isArsTable && <TableHead>Purpose(s)</TableHead>}
                <TableHead>Submitted By</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center w-[240px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {updates.length > 0 ? (
                updates.map((update, index) => {
                  const isUnassigned = update.status === 'supervisor-unassigned';
                  const parentFile = isArsTable ? arsEntries.find(a => a.id === update.arsId) : fileEntries.find(f => f.fileNo === update.fileNo);
                  const applicantName = update.isArsUpdate ? 'N/A' : (parentFile as DataEntryFormData)?.applicantName || 'N/A';
                  const siteName = update.updatedSiteDetails.map(s => (s as SiteDetailFormData).nameOfSite).join(', ');
                  
                  let purpose: string;
                  if (update.isArsUpdate) {
                    const arsDetail = update.updatedSiteDetails[0] as ArsEntryFormData;
                    purpose = arsDetail?.arsTypeOfScheme || 'N/A';
                  } else {
                    const siteDetails = update.updatedSiteDetails as SiteDetailFormData[];
                    purpose = siteDetails.map(s => s.purpose || 'N/A').join(', ');
                  }

                  const isRejected = update.status === 'rejected';

                  let reviewLink = '';
                  if (update.isArsUpdate && update.arsId) {
                    reviewLink = `/dashboard/ars/entry?id=${update.arsId}&approveUpdateId=${update.id}`;
                  } else if (!update.isArsUpdate) {
                    const parentFileId = (parentFile as DataEntryFormData)?.id;
                    if (parentFileId) {
                      reviewLink = `/dashboard/data-entry?id=${parentFileId}&approveUpdateId=${update.id}`;
                    }
                  }

                  return (
                    <TableRow key={update.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-medium">{update.fileNo}</TableCell>
                      {!isArsTable && <TableCell>{applicantName}</TableCell>}
                      <TableCell>{siteName}</TableCell>
                      {!isArsTable && <TableCell>{purpose}</TableCell>}
                      <TableCell>{update.submittedByName}</TableCell>
                      <TableCell>
                        {formatDistanceToNow(update.submittedAt, { addSuffix: true })}
                      </TableCell>
                      <TableCell className="text-center">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant={isUnassigned ? "destructive" : isRejected ? "outline" : "default"} className={isRejected ? "text-destructive border-destructive" : ""}>
                              {isUnassigned ? <UserX className="mr-1 h-3 w-3" /> : isRejected && <XCircle className="mr-1 h-3 w-3" />}
                              {isUnassigned ? "Unassigned" : isRejected ? "Rejected" : update.status}
                            </Badge>
                          </TooltipTrigger>
                          {(isUnassigned || isRejected) && update.notes && <TooltipContent><p>{update.notes}</p></TooltipContent>}
                        </Tooltip>
                      </TableCell>
                      <TableCell className="text-center space-x-1">
                        <Button variant="link" className="p-0 h-auto" onClick={() => handleViewChanges(update)}><ListChecks className="mr-2 h-4 w-4" />View</Button>
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
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={isArsTable ? 7 : 9} className="h-24 text-center">No pending updates in this category.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};


export default function PendingUpdatesTable() {
  const { setHeader } = usePageHeader();
  const { rejectUpdate, deleteUpdate, subscribeToPendingUpdates } = usePendingUpdates();
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

  useEffect(() => {
    setHeader('Pending Actions', 'Review and approve or reject updates submitted by supervisors.');
  }, [setHeader]);

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = subscribeToPendingUpdates((updates) => {
      setPendingUpdates(updates);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [subscribeToPendingUpdates]);

  const { depositWorkUpdates, arsUpdates } = useMemo(() => {
    const depositWorkUpdates = pendingUpdates.filter(u => !u.isArsUpdate);
    const arsUpdates = pendingUpdates.filter(u => u.isArsUpdate);
    return { depositWorkUpdates, arsUpdates };
  }, [pendingUpdates]);

  const handleReject = async () => {
    if (!updateToReject) return;
    setIsRejecting(true);
    try {
      await rejectUpdate(updateToReject, rejectionReason);
      toast({
        title: "Update Rejected",
        description: "The supervisor's changes have been rejected and they have been notified.",
      });
      // No need to manually refetch, onSnapshot will handle it
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
      // No need to manually refetch, onSnapshot will handle it
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
        let originalSite: SiteDetailFormData | ArsEntryFormData | undefined;
        if (!update.isArsUpdate) {
          originalSite = (originalSites as SiteDetailFormData[]).find(
            s => s.nameOfSite === (updatedSite as SiteDetailFormData).nameOfSite
          );
        } else {
          originalSite = originalSites[0] as ArsEntryFormData;
        }

        if (!update.isArsUpdate) {
          const siteName = (updatedSite as SiteDetailFormData).nameOfSite;
          if (update.updatedSiteDetails.length > 1) {
            allChanges.push({ field: `--- Site: ${siteName} ---`, oldValue: '', newValue: '' });
          } else {
            title = `Changes for site "${siteName}"`;
          }
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
      <div className="space-y-8">
        <UpdateTable
          title="Deposit Works Updates"
          icon={FolderOpen}
          updates={depositWorkUpdates}
          fileEntries={fileEntries}
          arsEntries={arsEntries}
          handleViewChanges={handleViewChanges}
          setUpdateToReject={setUpdateToReject}
          setUpdateToDelete={setUpdateToDelete}
          isRejecting={isRejecting}
          isDeleting={isDeleting}
        />
        <UpdateTable
          title="ARS Updates"
          icon={Waves}
          updates={arsUpdates}
          isArsTable={true}
          fileEntries={fileEntries}
          arsEntries={arsEntries}
          handleViewChanges={handleViewChanges}
          setUpdateToReject={setUpdateToReject}
          setUpdateToDelete={setUpdateToDelete}
          isRejecting={isRejecting}
          isDeleting={isDeleting}
        />
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
        <DialogContent className="sm:max-w-2xl p-0">
          <DialogHeader className="p-6 pb-4 border-b">
            <DialogTitle>{changesToView?.title}</DialogTitle>
            <DialogDescription>Review the changes submitted by the supervisor.</DialogDescription>
          </DialogHeader>
          <div className="p-6">
            <ScrollArea className="max-h-[60vh] pr-4">
              <Table>
                <TableHeader><TableRow><TableHead className="w-[30%]">Field</TableHead><TableHead className="w-[35%]">Original Value</TableHead><TableHead className="w-[35%]">New Value</TableHead></TableRow></TableHeader>
                <TableBody>{changesToView?.changes.map((change, index) => (<TableRow key={index}><TableCell className="font-medium text-xs">{change.field}</TableCell><TableCell className="text-xs text-muted-foreground line-through">{change.oldValue}</TableCell><TableCell className="text-xs font-semibold text-primary">{change.newValue}</TableCell></TableRow>))}</TableBody>
              </Table>
            </ScrollArea>
          </div>
          <DialogFooter className="p-6 pt-4 border-t">
            <DialogClose asChild>
              <Button>Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
