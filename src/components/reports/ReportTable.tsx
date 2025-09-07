
// src/components/reports/ReportTable.tsx
"use client";

import React, { useState, useMemo } from 'react';
import type { FlattenedReportRow } from '@/app/dashboard/reports/page';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
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

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <Table>
            <TableBody>
              {paginatedData.length > 0 ? (
                paginatedData.map((row, index) => (
                  <TableRow key={`${row.fileNo}-${row.siteName}-${index}`}>
                    <TableCell className="px-2 py-2 text-center w-[6%]">{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</TableCell>
                    <TableCell className="font-medium whitespace-normal break-words px-2 py-2 w-[12%]">{row.fileNo}</TableCell>
                    <TableCell className="whitespace-normal break-words px-2 py-2 w-[20%]">{row.applicantName}</TableCell>
                    <TableCell className="whitespace-normal break-words px-2 py-2 w-[20%]">{row.siteName}</TableCell>
                    <TableCell className="whitespace-normal break-words px-2 py-2 w-[10%]">{row.fileFirstRemittanceDate}</TableCell>
                    <TableCell className="whitespace-normal break-words px-2 py-2 w-[12%]">{row.fileStatus}</TableCell>
                    <TableCell className="whitespace-normal break-words px-2 py-2 w-[12%]">{row.siteWorkStatus}</TableCell>
                    <TableCell className="text-center px-2 py-2 w-[8%]">
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
                  <TableCell colSpan={8} className="h-24 text-center">
                    No results found for the selected filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        {totalPages > 1 && (
          <div className="flex justify-center pt-2">
            <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
