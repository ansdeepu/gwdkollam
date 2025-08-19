
// src/components/reports/ReportTable.tsx
"use client";

import React, { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import Image from "next/image";
import type { FlattenedReportRow } from "@/app/dashboard/reports/page";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import PaginationControls from "@/components/shared/PaginationControls"; // Import PaginationControls

interface ReportTableProps {
  data?: FlattenedReportRow[];
  onViewDetailsClick: (fileNo: string) => void; 
}

const ITEMS_PER_PAGE = 50;

export default function ReportTable({ data = [], onViewDetailsClick }: ReportTableProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return data.slice(startIndex, endIndex);
  }, [data, currentPage]);

  const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleViewClick = (fileNo: string) => {
    onViewDetailsClick(fileNo); 
  };

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center border rounded-lg shadow-sm bg-card no-print">
        <Image src="https://placehold.co/128x128/F0F2F5/3F51B5.png?text=No+Data" width={100} height={100} alt="No data" className="mb-4 opacity-70 rounded-lg" data-ai-hint="empty data illustration" />
        <h3 className="text-xl font-semibold text-foreground">No Data Available</h3>
        <p className="text-muted-foreground">There are no report entries matching your criteria.</p>
      </div>
    );
  }

  const startEntryNum = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endEntryNum = Math.min(currentPage * ITEMS_PER_PAGE, data.length);

  return (
    <TooltipProvider>
      <Card className="shadow-lg">
          <CardContent className="p-0">
            <div>
              <Table>
              <TableHeader>
                  <TableRow>
                  <TableHead className="w-[80px] text-center text-xs">Sl.<br/>No.</TableHead>
                  <TableHead className="w-[100px] text-center text-xs">File<br />No.</TableHead>
                  <TableHead className="text-center text-xs max-w-[150px] whitespace-normal break-words">Applicant<br />Name</TableHead>
                  <TableHead className="text-center text-xs max-w-[180px] whitespace-normal break-words">Site<br />Name</TableHead>
                  <TableHead className="w-[120px] text-center text-xs">Date of<br />Remittance</TableHead>
                  <TableHead className="w-[150px] text-center text-xs">File<br />Status</TableHead>
                  <TableHead className="text-center text-xs max-w-[120px] whitespace-normal break-words">Site<br />Purpose</TableHead>
                  <TableHead className="text-center text-xs max-w-[180px] whitespace-normal break-words">Site Work<br />Status</TableHead>
                  <TableHead className="text-center text-xs w-[130px]">Site Total<br />Expenditure</TableHead>
                  <TableHead className="text-center text-xs w-[80px]">Actions</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                  {paginatedData.map((row, index) => (
                      <TableRow key={index}>
                          <TableCell className="text-xs text-center">{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</TableCell>
                          <TableCell className="font-medium text-xs text-center">
                            {row.fileNo}
                          </TableCell>
                          <TableCell className="text-xs text-left max-w-[150px] whitespace-normal break-words">{row.applicantName}</TableCell>
                          <TableCell className="text-xs text-left max-w-[180px] whitespace-normal break-words">
                            {row.siteName}
                          </TableCell>
                          <TableCell className="text-xs text-center">{row.fileFirstRemittanceDate}</TableCell>
                          <TableCell className="text-xs text-center">{row.fileStatus}</TableCell>
                          <TableCell className="text-xs text-center max-w-[120px] whitespace-normal break-words">{row.sitePurpose}</TableCell>
                          <TableCell className="text-xs text-center max-w-[180px] whitespace-normal break-words">{row.siteWorkStatus}</TableCell>
                          <TableCell className="text-right font-medium text-xs">{row.siteTotalExpenditure}</TableCell>
                          <TableCell className="text-center">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => handleViewClick(row.fileNo)}>
                                  <Eye className="h-4 w-4" />
                                  <span className="sr-only">View File Details</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>View File Details</p>
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
              </Table>
            </div>
          </CardContent>
          <CardFooter className="p-4 border-t no-print flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                  Showing <strong>{data.length > 0 ? startEntryNum : 0}</strong>-<strong>{endEntryNum}</strong> of <strong>{data.length}</strong> site-wise {data.length === 1 ? "entry" : "entries"}.
              </p>
              {totalPages > 1 && (
                <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                />
              )}
          </CardFooter>
      </Card>
    </TooltipProvider>
  );
}
