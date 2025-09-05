// src/components/establishment/RetiredStaffTable.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserCheck, ArrowRightLeft, Eye, Expand, FileArchive, Loader2 } from "lucide-react";
import type { StaffMember, StaffStatusType } from "@/lib/schemas";
import { format, isValid } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import PaginationControls from "@/components/shared/PaginationControls";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface RetiredStaffTableProps {
  staffData: StaffMember[];
  onSetStatus?: (staffId: string, newStatus: StaffStatusType, staffName: string) => void;
  isViewer: boolean;
  onImageClick?: (imageUrl: string | null) => void;
  isLoading?: boolean;
  searchActive?: boolean;
}

const ITEMS_PER_PAGE = 20;

const getInitials = (name?: string) => {
  if (!name || name.trim() === '') return 'U';
  return name
    .trim()
    .split(/\s+/)
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
};

const formatDateSafe = (dateInput: Date | string | null | undefined): string => {
  if (!dateInput) return "N/A";
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return isValid(date) ? format(date, "dd/MM/yyyy") : "N/A";
};

const isPlaceholderUrl = (url?: string | null): boolean => {
  if (!url) return false;
  return url.startsWith("https://placehold.co");
};

export default function RetiredStaffTable({ 
    staffData, 
    onSetStatus, 
    isViewer, 
    onImageClick,
    isLoading = false,
    searchActive = false
}: RetiredStaffTableProps) {
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
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px] px-2 py-2 text-center">Photo</TableHead>
              <TableHead className="px-2 py-2 text-center">Name</TableHead>
              <TableHead className="px-2 py-2 text-center">Designation</TableHead>
              <TableHead className="px-2 py-2 text-center">PEN</TableHead>
              <TableHead className="px-2 py-2 text-center">Roles</TableHead>
              <TableHead className="px-2 py-2 text-center">DOB</TableHead>
              <TableHead className="px-2 py-2 min-w-[150px] text-center">Remarks</TableHead>
              <TableHead className="text-center w-[100px] px-2 py-2">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedStaff.length > 0 ? paginatedStaff.map((staff) => {
              const canExpandAvatar = staff.photoUrl && !isPlaceholderUrl(staff.photoUrl) && onImageClick;
              return (
              <TableRow key={staff.id}>
                 <TableCell className="px-2 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => canExpandAvatar && onImageClick(staff.photoUrl ?? null)}
                      disabled={!canExpandAvatar}
                      className={cn(
                        "relative rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 mx-auto",
                        canExpandAvatar && "cursor-pointer"
                      )}
                      aria-label={canExpandAvatar ? "View larger image" : "Staff photo"}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={staff.photoUrl ? staff.photoUrl : `https://placehold.co/96x96.png?text=${getInitials(staff.name)}`} alt={staff.name} data-ai-hint="person user"/>
                        <AvatarFallback>{getInitials(staff.name)}</AvatarFallback>
                      </Avatar>
                       {canExpandAvatar && (
                        <div className="absolute bottom-0 right-0 bg-black/60 p-0.5 rounded-full">
                          <Expand className="h-3 w-3 text-white" />
                        </div>
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
                      ) : onSetStatus && (
                         <DropdownMenu>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <FileArchive className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                              </TooltipTrigger>
                              <TooltipContent><p>Change Status</p></TooltipContent>
                            </Tooltip>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onSetStatus(staff.id, "Active", staff.name)}>
                                <UserCheck className="mr-2 h-4 w-4" /> Mark Active
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onSetStatus(staff.id, "Transferred", staff.name)}>
                                <ArrowRightLeft className="mr-2 h-4 w-4" /> Mark Transferred
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                      )}
                    </div>
                </TableCell>
              </TableRow>
            )}) : (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center px-2 py-2">
                  {searchActive ? "No staff members found matching your search." : "No retired staff members found."}
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
