
// src/components/database/FileDatabaseTable.tsx
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useFileEntries } from '@/hooks/useFileEntries';
import type { DataEntryFormData } from '@/lib/schemas';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Loader2, Eye, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import PaginationControls from '@/components/shared/PaginationControls';
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";


const ITEMS_PER_PAGE = 20;

interface FileDatabaseTableProps {
  fileEntries: DataEntryFormData[];
  searchTerm?: string;
  selectedFileNos: string[];
  onSelectionChange: (selected: string[]) => void;
}

export default function FileDatabaseTable({
  fileEntries: externalFileEntries,
  searchTerm = "",
  selectedFileNos,
  onSelectionChange,
}: FileDatabaseTableProps) {
  const { isLoading: entriesLoading, deleteFileEntry } = useFileEntries();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [currentPage, setCurrentPage] = useState(1);
  const [fileToDelete, setFileToDelete] = useState<DataEntryFormData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: keyof DataEntryFormData | 'siteCount'; direction: 'asc' | 'desc' } | null>({ key: 'fileNo', direction: 'asc' });

  const canEdit = user?.role === 'editor';
  const canDelete = user?.role === 'editor';

  const filteredAndSortedEntries = useMemo(() => {
    let filtered = [...externalFileEntries];

    if (searchTerm) {
      const lowercasedFilter = searchTerm.toLowerCase();
      filtered = filtered.filter(entry => 
        (Object.values(entry).some(val => 
          String(val).toLowerCase().includes(lowercasedFilter)
        )) ||
        (entry.siteDetails?.some(site => 
          Object.values(site).some(val => String(val).toLowerCase().includes(lowercasedFilter))
        ))
      );
    }
    
    if (sortConfig !== null) {
      filtered.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        if (sortConfig.key === 'siteCount') {
          aValue = a.siteDetails?.length || 0;
          bValue = b.siteDetails?.length || 0;
        } else {
          aValue = a[sortConfig.key];
          bValue = b[sortConfig.key];
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [externalFileEntries, searchTerm, sortConfig]);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page on search/filter change
  }, [searchTerm]);


  const paginatedEntries = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSortedEntries.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredAndSortedEntries, currentPage]);

  const totalPages = Math.ceil(filteredAndSortedEntries.length / ITEMS_PER_PAGE);
  
  const handleSelectAll = (checked: boolean) => {
    onSelectionChange(checked ? filteredAndSortedEntries.map(e => e.fileNo) : []);
  };
  
  const handleSelectRow = (fileNo: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedFileNos, fileNo]);
    } else {
      onSelectionChange(selectedFileNos.filter(no => no !== fileNo));
    }
  };

  const isAllSelected = selectedFileNos.length > 0 && selectedFileNos.length === filteredAndSortedEntries.length;
  const isSomeSelected = selectedFileNos.length > 0 && !isAllSelected;

  const requestSort = (key: keyof DataEntryFormData | 'siteCount') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  const handleDelete = async () => {
    if (!fileToDelete) return;
    setIsDeleting(true);
    await deleteFileEntry(fileToDelete.fileNo);
    setIsDeleting(false);
    setFileToDelete(null);
  }

  const isLoading = entriesLoading || authLoading;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              {canDelete && (
                <TableHead className="w-[50px]">
                  <Checkbox 
                     checked={isAllSelected}
                     onCheckedChange={handleSelectAll}
                     aria-label="Select all rows"
                     data-state={isSomeSelected ? 'indeterminate' : (isAllSelected ? 'checked' : 'unchecked')}
                  />
                </TableHead>
              )}
              <TableHead className="cursor-pointer" onClick={() => requestSort('fileNo')}>File No.</TableHead>
              <TableHead>Applicant & Sites</TableHead>
              <TableHead className="cursor-pointer" onClick={() => requestSort('fileStatus')}>File Status</TableHead>
              <TableHead className="cursor-pointer" onClick={() => requestSort('siteCount')}>No. of Sites</TableHead>
              <TableHead className="text-center w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedEntries.length > 0 ? (
              paginatedEntries.map((entry) => (
                <TableRow key={entry.fileNo} data-state={selectedFileNos.includes(entry.fileNo) ? 'selected' : undefined}>
                  {canDelete && (
                    <TableCell>
                      <Checkbox 
                        checked={selectedFileNos.includes(entry.fileNo)}
                        onCheckedChange={(checked) => handleSelectRow(entry.fileNo, !!checked)}
                        aria-label={`Select row for file ${entry.fileNo}`}
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-medium">{entry.fileNo}</TableCell>
                  <TableCell>
                    <div className="font-medium">{entry.applicantName}</div>
                    <div className="text-sm text-muted-foreground truncate max-w-xs">
                      {entry.siteDetails?.map(site => site.nameOfSite).join(', ') || 'No sites'}
                    </div>
                  </TableCell>
                  <TableCell>{entry.fileStatus || 'N/A'}</TableCell>
                  <TableCell className="text-center">{entry.siteDetails?.length || 0}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center space-x-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                           <Link href={`/dashboard/data-entry?fileNo=${encodeURIComponent(entry.fileNo)}`} passHref>
                             <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                           </Link>
                        </TooltipTrigger>
                        <TooltipContent><p>View / Edit Details</p></TooltipContent>
                      </Tooltip>
                      {canDelete && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/90" onClick={() => setFileToDelete(entry)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Delete File</p></TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No file entries found{searchTerm ? " for your search" : ""}.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {totalPages > 1 && (
          <div className="flex justify-center pt-4">
            <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>
        )}
      </div>

       <AlertDialog open={!!fileToDelete} onOpenChange={() => setFileToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete File No. <strong>{fileToDelete?.fileNo}</strong> and all its associated sites. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
