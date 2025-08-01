// src/components/admin/PendingUpdatesTable.tsx
"use client";

import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, Info, Eye } from "lucide-react";
import { usePendingUpdates } from "@/hooks/usePendingUpdates";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNowStrict } from "date-fns";
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
import type { SiteDetailFormData } from "@/lib/schemas";

export default function PendingUpdatesTable() {
  const { pendingUpdates, isLoading, approveUpdate, rejectUpdate } = usePendingUpdates();
  const { toast } = useToast();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [viewingUpdate, setViewingUpdate] = useState<{fileNo: string, sites: SiteDetailFormData[]} | null>(null);

  const handleApprove = async (updateId: string, fileNo: string, sites: SiteDetailFormData[]) => {
    setProcessingId(updateId);
    try {
      await approveUpdate(updateId, fileNo, sites);
      toast({ title: "Update Approved", description: `Changes for File No. ${fileNo} have been applied.` });
    } catch (error: any) {
      toast({ title: "Approval Failed", description: error.message, variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
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
                      onClick={() => setViewingUpdate({ fileNo: update.fileNo, sites: update.updatedSiteDetails })}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-green-600 border-green-600 hover:bg-green-100 hover:text-green-700"
                      disabled={processingId === update.id}
                      onClick={() => handleApprove(update.id, update.fileNo, update.updatedSiteDetails)}
                    >
                      {processingId === update.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                      Approve
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
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Updated Site Details for File No: {viewingUpdate?.fileNo}</DialogTitle>
            <DialogDescription>
              Review the changes submitted by the supervisor.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4 py-4">
              {viewingUpdate?.sites.map((site, index) => (
                <div key={index} className="p-4 border rounded-lg bg-secondary/50">
                  <h4 className="font-semibold text-primary mb-2">Site: {site.nameOfSite}</h4>
                  <ul className="text-sm space-y-1">
                    <li><strong>Work Status:</strong> {site.workStatus}</li>
                    <li><strong>Date of Completion:</strong> {site.dateOfCompletion ? new Date(site.dateOfCompletion).toLocaleDateString() : 'N/A'}</li>
                    <li><strong>Expenditure:</strong> {site.totalExpenditure?.toLocaleString('en-IN', { style: 'currency', currency: 'INR' }) ?? 'N/A'}</li>
                    <li><strong>Work Remarks:</strong> <p className="text-xs whitespace-pre-wrap pl-2 border-l-2 ml-2">{site.workRemarks || 'N/A'}</p></li>
                  </ul>
                </div>
              ))}
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
