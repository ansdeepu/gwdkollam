
// src/app/dashboard/file-room/page.tsx
"use client";

import { useState, useMemo } from 'react';
import FileDatabaseTable from "@/components/database/FileDatabaseTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, FilePlus2, Trash2, Loader2 } from "lucide-react";
import { Input } from '@/components/ui/input';
import { useFileEntries } from '@/hooks/useFileEntries';
import { useAuth } from '@/hooks/useAuth';
import type { SiteWorkStatus } from '@/lib/schemas';
import { usePendingUpdates } from '@/hooks/usePendingUpdates'; // Import the hook
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";


export default function FileManagerPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const { fileEntries, batchDeleteFileEntries } = useFileEntries(); 
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [selectedFileNos, setSelectedFileNos] = useState<string[]>([]);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);

  const filteredFileEntriesForManager = useMemo(() => {
    if (user?.role === 'supervisor') {
      return fileEntries;
    }
    
    // For editors and viewers, filter out files that ONLY contain ARS sites.
    return fileEntries.filter(entry => {
      // Keep files with no sites.
      if (!entry.siteDetails || entry.siteDetails.length === 0) {
        return true;
      }
      // Keep files where at least one site is NOT for ARS purpose.
      return entry.siteDetails.some(site => site.purpose !== 'ARS');
    });
  }, [fileEntries, user?.role]);
  
  const canDelete = user?.role === 'editor';

  const confirmBatchDelete = async () => {
    if (selectedFileNos.length === 0) return;
    setIsBatchDeleting(true);
    setShowBatchDeleteConfirm(true);
    try {
      const result = await batchDeleteFileEntries(selectedFileNos);
      toast({
        title: "Batch Deletion Complete",
        description: `${result.successCount} file(s) removed successfully. ${result.failureCount > 0 ? `${result.failureCount} failed.` : ''}`,
        variant: result.failureCount > 0 ? "destructive" : "default",
      });
    } catch (error: any) {
      toast({ title: "Batch Deletion Error", description: error.message, variant: "destructive" });
    } finally {
      setIsBatchDeleting(false);
      setShowBatchDeleteConfirm(false);
      setSelectedFileNos([]);
    }
  };


  return (
    <div className="space-y-6">
       <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-grow w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search all fields by File No, Applicant, Site, Purpose, Status..."
            className="w-full rounded-lg bg-background pl-10 shadow-sm text-base h-12 border-2 border-primary/20 focus-visible:ring-primary focus-visible:ring-offset-2"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-4 w-full sm:w-auto shrink-0">
            <div className="text-center sm:text-right">
                <p className="text-sm font-medium text-muted-foreground">Total Files</p>
                <p className="text-2xl font-bold text-primary">{filteredFileEntriesForManager.length}</p>
            </div>
            {user?.role === 'editor' && (
            <Link href="/dashboard/data-entry" passHref>
                <Button className="w-full sm:w-auto">
                <FilePlus2 className="mr-2 h-5 w-5" /> New File Data Entry
                </Button>
            </Link>
            )}
        </div>
      </div>
      
      {canDelete && selectedFileNos.length > 0 && (
        <div className="mb-4 flex items-center justify-start space-x-3 p-3 bg-secondary/50 rounded-md border border-border">
          <Button
            variant="destructive"
            onClick={() => setShowBatchDeleteConfirm(true)}
            disabled={isBatchDeleting}
            size="sm"
          >
            {isBatchDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            Remove Selected ({selectedFileNos.length})
          </Button>
          <p className="text-sm text-muted-foreground">
            {selectedFileNos.length} file(s) selected for batch action.
          </p>
        </div>
      )}


      <Card className="shadow-lg">
        <CardContent className="p-0">
          <FileDatabaseTable 
            searchTerm={searchTerm} 
            fileEntries={filteredFileEntriesForManager} 
            selectedFileNos={selectedFileNos}
            onSelectionChange={setSelectedFileNos}
          />
        </CardContent>
      </Card>
      
      <AlertDialog open={showBatchDeleteConfirm} onOpenChange={setShowBatchDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Batch Removal</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove the {selectedFileNos.length} selected file(s)? 
                This action is permanent and cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowBatchDeleteConfirm(false)} disabled={isBatchDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmBatchDelete}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                disabled={isBatchDeleting}
              >
                {isBatchDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : `Remove ${selectedFileNos.length} File(s)`}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

    </div>
  );
}
