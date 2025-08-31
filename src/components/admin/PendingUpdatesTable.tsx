
// src/components/admin/PendingUpdatesTable.tsx
"use client";

import React, { useState } from 'react';
import { usePendingUpdates } from '@/hooks/usePendingUpdates';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
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

export default function PendingUpdatesTable() {
  const { pendingUpdates, isLoading, rejectUpdate } = usePendingUpdates();
  const { toast } = useToast();
  const [updateToReject, setUpdateToReject] = useState<string | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);

  const handleReject = async () => {
    if (!updateToReject) return;

    setIsRejecting(true);
    try {
      await rejectUpdate(updateToReject);
      toast({
        title: "Update Rejected",
        description: "The supervisor's changes have been rejected and they have been notified.",
      });
    } catch (error: any) {
      toast({
        title: "Rejection Failed",
        description: error.message || "Could not reject the update.",
        variant: "destructive",
      });
    } finally {
      setIsRejecting(false);
      setUpdateToReject(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading pending updates...</p>
      </div>
    );
  }

  return (
    <>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>File No.</TableHead>
              <TableHead>Submitted By</TableHead>
              <TableHead>Date Submitted</TableHead>
              <TableHead className="text-center">Sites Updated</TableHead>
              <TableHead className="text-center w-[200px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pendingUpdates.length > 0 ? (
              pendingUpdates.map((update) => (
                <TableRow key={update.id}>
                  <TableCell className="font-medium">{update.fileNo}</TableCell>
                  <TableCell>{update.submittedByName}</TableCell>
                  <TableCell>
                    {formatDistanceToNow(update.submittedAt, { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-center">{update.updatedSiteDetails.length}</TableCell>
                  <TableCell className="text-center space-x-2">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/dashboard/data-entry?fileNo=${update.fileNo}&approveUpdateId=${update.id}`}>
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
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
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
                    This action will mark the update as rejected. The supervisor will be able to edit and resubmit their changes. This cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel disabled={isRejecting}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleReject} disabled={isRejecting} className="bg-destructive hover:bg-destructive/90">
                    {isRejecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Yes, Reject"}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
