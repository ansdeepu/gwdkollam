
// src/components/establishment/TransferredStaffTable.tsx
"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowLeftRight, UserCheck, Eye, Loader2, UserMinus, UserCircle } from "lucide-react";
import type { StaffMember, StaffStatusType } from "@/lib/schemas";
import { format, isValid } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import PaginationControls from "@/components/shared/PaginationControls";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface TransferredStaffTableProps {
  staffData: StaffMember[];
  onSetStatus?: (staffId: string, newStatus: StaffStatusType, staffName: string) => void;
  isViewer: boolean;
  onImageClick: (imageUrl: string | null) => void;
  isLoading?: boolean;
  searchActive?: boolean;
}

const ITEMS_PER_PAGE = 20;

const formatDateSafe = (dateInput: Date | string | null | undefined): string => {
  if (!dateInput) return "N/A";
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return isValid(date) ? format(date, "dd/MM/yyyy") : "N/A";
};

export default function TransferredStaffTable({ 
    staffData, 
    onSetStatus, 
    isViewer, 
    onImageClick,
    isLoading = false,
    searchActive = false
}: TransferredStaffTableProps) {
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [staffData, searchActive]);

  const paginatedStaff = staffData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  const totalPages = Math.ceil(staffData.length / ITEMS_PER_PAGE);

  return (
    <TooltipProvider>
      <div className="space-y-4">
       {isLoading && (
            <div className="flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2 text-muted-foreground">Filtering staff...</p>
            </div>
        )}
        {!isLoading && (
        <Table>
          <TableHeader className="bg-secondary">
            <TableRow>
              <TableHead className="w-[50px]">Sl. No.</TableHead>
              <TableHead className="w-[60px]">Photo</TableHead>
              <TableHead className="px-2 py-2 text-left">Name</TableHead>
              <TableHead className="px-2 py-2 text-left">Designation</TableHead>
              <TableHead className="px-2 py-2 text-left">PEN</TableHead>
              <TableHead className="px-2 py-2 text-left">Roles</TableHead>
              <TableHead className="px-2 py-2 text-left">DOB</TableHead>
              <TableHead className="px-2 py-2 min-w-[150px] text-left">Remarks</TableHead>
              <TableHead className="text-center w-[100px] px-2 py-2">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedStaff.length > 0 ? paginatedStaff.map((staff, index) => (
              <TableRow key={staff.id}>
                <TableCell>{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</TableCell>
                <TableCell>
                  <button onClick={() => onImageClick(staff.photoUrl || null)} className="focus:outline-none focus:ring-2 focus:ring-primary rounded-full">
                    {staff.photoUrl ? (
                      <Image src={staff.photoUrl} alt={staff.name} width={40} height={40} className="rounded-full object-cover" />
                    ) : (
                      <UserCircle className="w-10 h-10 text-muted-foreground" />
                    )}
                  </button>
                </TableCell>
                <TableCell className={cn("font-medium whitespace-normal break-words max-w-[150px] px-2 py-2 text-left")}>{staff.name}</TableCell>
                <TableCell className={cn("whitespace-normal break-words max-w-[180px] px-2 py-2 text-left")}>{staff.designation}</TableCell>
                <TableCell className={cn("whitespace-normal break-words max-w-[100px] px-2 py-2 text-left")}>{staff.pen}</TableCell>
                <TableCell className={cn("whitespace-normal break-words max-w-[150px] text-xs px-2 py-2 text-left")}>{staff.roles || "N/A"}</TableCell>
                <TableCell className="text-xs px-2 py-2 text-left">{formatDateSafe(staff.dateOfBirth)}</TableCell>
                <TableCell className="text-xs px-2 py-2 whitespace-normal break-words max-w-[200px] text-left">
                  {staff.remarks ? (
                      <Tooltip>
                        <TooltipTrigger>
                          <p className="line-clamp-2">{staff.remarks}</p>
                        </TooltipTrigger>
                        <TooltipContent side="top" align="start" className="max-w-xs">
                          <p className="text-xs whitespace-pre-wrap">{staff.remarks}</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : "N/A"}
                </TableCell>
                <TableCell className="text-center px-2 py-2">
                    <div className="flex items-center justify-center space-x-0.5">
                      {isViewer ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                             <Button variant="ghost" size="icon" disabled className="h-8 w-8"><Eye className="h-4 w-4" /></Button>
                          </TooltipTrigger>
                          <TooltipContent><p>View Details (Read-only)</p></TooltipContent>
                        </Tooltip>
                      ): onSetStatus && (
                         <DropdownMenu>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <ArrowLeftRight className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                              </TooltipTrigger>
                              <TooltipContent><p>Change Status</p></TooltipContent>
                            </Tooltip>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onSetStatus(staff.id, "Active", staff.name)}>
                                <UserCheck className="mr-2 h-4 w-4" /> Mark Active
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onSetStatus(staff.id, "Retired", staff.name)}>
                                <UserMinus className="mr-2 h-4 w-4" /> Mark Retired
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                      )}
                    </div>
                  </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center px-2 py-2"> 
                  {searchActive ? "No staff members found matching your search." : "No transferred staff members found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
           {paginatedStaff.length > 0 && totalPages > 1 && (
             <TableCaption className="py-2">
                <div className="flex items-center justify-center">
                    <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    />
                </div>
            </TableCaption>
           )}
        </Table>
      )}
      </div>
    </TooltipProvider>
  );
}
