
// src/components/establishment/TransferredStaffTable.tsx
"use client";

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, UserCheck, Archive, Loader2 } from 'lucide-react';
import { type StaffMember, type StaffStatusType } from '@/lib/schemas';
import { format, isValid } from 'date-fns';


interface TransferredStaffTableProps {
  staffData: StaffMember[];
  onSetStatus?: (id: string, newStatus: StaffStatusType, name: string) => void;
  isViewer: boolean;
  onImageClick: (imageUrl: string | null) => void;
  isLoading: boolean;
  searchActive: boolean;
}

const getInitials = (name?: string): string => {
  if (!name) return "U";
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
};

export default function TransferredStaffTable({ staffData, onSetStatus, isViewer, onImageClick, isLoading, searchActive }: TransferredStaffTableProps) {
  if (isLoading) {
    return (
        <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2 text-muted-foreground">Loading staff data...</p>
        </div>
    );
  }
  
  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">Photo</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Designation</TableHead>
            <TableHead>PEN</TableHead>
            <TableHead>Phone</TableHead>
            {!isViewer && <TableHead className="text-center">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {staffData.length > 0 ? (
            staffData.map((staff) => (
              <TableRow key={staff.id}>
                <TableCell>
                  <Avatar className="h-10 w-10 cursor-pointer" onClick={() => onImageClick(staff.photoUrl || null)}>
                    <AvatarImage src={staff.photoUrl || undefined} alt={staff.name} />
                    <AvatarFallback>{getInitials(staff.name)}</AvatarFallback>
                  </Avatar>
                </TableCell>
                <TableCell className="font-medium">{staff.name}</TableCell>
                <TableCell>{staff.designation}</TableCell>
                <TableCell>{staff.pen}</TableCell>
                <TableCell>{staff.phoneNo || 'N/A'}</TableCell>
                {!isViewer && (
                  <TableCell className="text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => onSetStatus?.(staff.id, 'Active', staff.name)}>
                          <UserCheck className="mr-2 h-4 w-4" />
                          <span>Mark as Active</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onSetStatus?.(staff.id, 'Retired', staff.name)}>
                          <Archive className="mr-2 h-4 w-4" />
                          <span>Mark as Retired</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={isViewer ? 5 : 6} className="h-24 text-center">
                {searchActive ? "No transferred staff match your search." : "No staff members are currently marked as transferred."}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
