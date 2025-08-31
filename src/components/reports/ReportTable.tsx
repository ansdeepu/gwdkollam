// src/components/reports/ReportTable.tsx
"use client";

import React, { useState, useMemo } from 'react';
import type { FlattenedReportRow } from '@/app/dashboard/reports/page';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Eye, ArrowUpDown } from 'lucide-react';
import PaginationControls from '@/components/shared/PaginationControls';
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

const ITEMS_PER_PAGE = 25;

interface ReportTableProps {
  data: FlattenedReportRow[];
  onViewDetailsClick: (fileNo: string) => void;
}

type SortKey = keyof FlattenedReportRow;

export default function ReportTable({ data, onViewDetailsClick }: ReportTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>({ key: 'fileNo', direction: 'asc' });

  const sortedData = useMemo(() => {
    let sortableData = [...data];
    if (sortConfig !== null) {
      sortableData.sort((a, b) => {
        const aValue = a[sortConfig.key] ?? '';
        const bValue = b[sortConfig.key] ?? '';
        
        // Basic alphanumeric sort
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableData;
  }, [data, sortConfig]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [sortedData, currentPage]);

  const totalPages = Math.ceil(sortedData.length / ITEMS_PER_PAGE);

  const requestSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1); // Reset to first page after sorting
  };
  
  const getSortIndicator = (key: SortKey) => {
    if (!sortConfig || sortConfig.key !== key) {
      return null;
    }
    return <ArrowUpDown className="inline-block ml-1 h-3 w-3" />;
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead onClick={() => requestSort('fileNo')} className="cursor-pointer">File No {getSortIndicator('fileNo')}</TableHead>
                <TableHead onClick={() => requestSort('applicantName')} className="cursor-pointer">Applicant {getSortIndicator('applicantName')}</TableHead>
                <TableHead onClick={() => requestSort('siteName')} className="cursor-pointer">Site Name(s) {getSortIndicator('siteName')}</TableHead>
                <TableHead onClick={() => requestSort('fileStatus')} className="cursor-pointer">File Status {getSortIndicator('fileStatus')}</TableHead>
                <TableHead onClick={() => requestSort('siteWorkStatus')} className="cursor-pointer">Work Status {getSortIndicator('siteWorkStatus')}</TableHead>
                <TableHead className="text-right">Expenditure (₹)</TableHead>
                <TableHead className="text-center w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length > 0 ? (
                paginatedData.map((row, index) => (
                  <TableRow key={`${row.fileNo}-${row.siteName}-${index}`}>
                    <TableCell className="font-medium whitespace-nowrap">{row.fileNo}</TableCell>
                    <TableCell className="whitespace-normal break-words">{row.applicantName}</TableCell>
                    <TableCell className="whitespace-normal break-words max-w-xs">{row.siteName}</TableCell>
                    <TableCell className="whitespace-nowrap">{row.fileStatus}</TableCell>
                    <TableCell className="whitespace-nowrap">{row.siteWorkStatus}</TableCell>
                    <TableCell className="text-right font-mono">{row.siteTotalExpenditure}</TableCell>
                    <TableCell className="text-center">
                        <Tooltip>
                            <TooltipTrigger asChild>
                               <Button variant="ghost" size="icon" onClick={() => onViewDetailsClick(row.fileNo)}>
                                <Eye className="h-4 w-4" />
                               </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>View Full File Details</p></TooltipContent>
                        </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    No results found for the selected filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {totalPages > 1 && (
          <div className="flex justify-center pt-2">
            <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}