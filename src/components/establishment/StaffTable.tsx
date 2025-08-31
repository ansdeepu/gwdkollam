
// src/components/establishment/StaffTable.tsx
"use client";

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Edit, Trash2, MoreVertical, Archive, UserCheck, UserX } from 'lucide-react';
import { type StaffMember, type StaffStatusType } from '@/lib/schemas';
import { format, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface StaffTableProps {
  staffData: StaffMember[];
  onEdit?: (staff: StaffMember) => void;
  onDelete?: (id: string) => void;
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

export default function StaffTable({ staffData, onEdit, onDelete, onSetStatus, isViewer, onImageClick, isLoading, searchActive }: StaffTableProps) {
  const [deleteCandidate, setDeleteCandidate] = React.useState<StaffMember | null>(null);

  const confirmDelete = () => {
    if (deleteCandidate && onDelete) {
      onDelete(deleteCandidate.id);
    }
    setDeleteCandidate(null);
  };
  
  if (isLoading) {
    return (
        <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2 text-muted-foreground">Filtering staff...</p>
        </div>
    );
  }

  return (
    <>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Photo</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Designation</TableHead>
              <TableHead>PEN</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>DOB</TableHead>
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
                  <TableCell>{staff.roles || 'N/A'}</TableCell>
                  <TableCell>
                    {staff.dateOfBirth && isValid(new Date(staff.dateOfBirth)) 
                      ? format(new Date(staff.dateOfBirth), 'dd/MM/yyyy') 
                      : 'N/A'}
                  </TableCell>
                  {!isViewer && (
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => onEdit?.(staff)}>
                            <Edit className="mr-2 h-4 w-4" />
                            <span>Edit Details</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                           <DropdownMenuItem onClick={() => onSetStatus?.(staff.id, 'Transferred', staff.name)}>
                            <UserX className="mr-2 h-4 w-4" />
                            <span>Mark as Transferred</span>
                          </DropdownMenuItem>
                           <DropdownMenuItem onClick={() => onSetStatus?.(staff.id, 'Retired', staff.name)}>
                            <Archive className="mr-2 h-4 w-4" />
                            <span>Mark as Retired</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteCandidate(staff)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Delete</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={isViewer ? 7 : 8} className="h-24 text-center">
                   {searchActive ? "No staff members match your search." : "No active staff members found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteCandidate} onOpenChange={() => setDeleteCandidate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the record for <strong>{deleteCandidate?.name}</strong>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
