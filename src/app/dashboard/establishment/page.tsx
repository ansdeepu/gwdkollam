// src/app/dashboard/establishment/page.tsx
"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StaffForm from "@/components/establishment/StaffForm";
import StaffTable from "@/components/establishment/StaffTable";
import TransferredStaffTable from "@/components/establishment/TransferredStaffTable";
import RetiredStaffTable from "@/components/establishment/RetiredStaffTable";
import { useAuth } from "@/hooks/useAuth";
import { useStaffMembers } from "@/hooks/useStaffMembers";
import type { StaffMember, StaffMemberFormData, StaffStatusType } from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { format, isValid } from "date-fns";
import ExcelJS from "exceljs";
import { usePageHeader } from "@/hooks/usePageHeader";

export const dynamic = 'force-dynamic';

const Briefcase = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
);
const UserPlus = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>
);
const ShieldAlert = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
);
const Loader2 = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
);
const Expand = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m21 21-6-6m6 6v-4m0 4h-4"/><path d="M3 3l6 6"/><path d="M3 3v4m0-4h4"/></svg>
);
const Search = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
);
const FileDown = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M12 18v-6"/><path d="m15 15-3 3-3-3"/></svg>
);


const isPlaceholderUrl = (url?: string | null): boolean => {
  if (!url) return false;
  return url.startsWith("https://placehold.co");
};

const formatDateForSearch = (dateInput: Date | string | null | undefined): string => {
  if (!dateInput) return "";
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return isValid(date) ? format(date, "dd/MM/yyyy") : "";
};

export default function EstablishmentPage() {
  const { setHeader } = usePageHeader();
  useEffect(() => {
    setHeader('Establishment', 'Manage all staff members of the Ground Water Department, Kollam.');
  }, [setHeader]);

  const { user, isLoading: authLoading } = useAuth();
  const { 
    staffMembers, 
    isLoading: staffLoadingHook, 
    addStaffMember, 
    updateStaffMember, 
    deleteStaffMember,
    updateStaffStatus 
  } = useStaffMembers();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState(""); // User's live input
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(""); // Term used for filtering after delay
  const [isFiltering, setIsFiltering] = useState(false);
  const [filteredStaff, setFilteredStaff] = useState<StaffMember[]>([]);

  const [imageForModal, setImageForModal] = useState<string | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  
  const canManage = user?.role === 'editor' && user.isApproved;
  const isViewer = user?.role === 'viewer';

  const handleAddNewStaff = () => {
    setEditingStaff(null);
    setIsFormOpen(true);
  };

  const handleEditStaff = (staff: StaffMember) => {
    setEditingStaff(staff);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (data: StaffMemberFormData) => {
    if (!canManage) {
        toast({ title: "Permission Denied", description: "You do not have permission to perform this action.", variant: "destructive"});
        return;
    }
    setIsSubmittingForm(true);
    
    try {
      if (editingStaff) {
        await updateStaffMember(editingStaff.id, data);
        toast({ title: "Staff Updated", description: `${data.name}'s details have been updated.` });
      } else {
        await addStaffMember(data); 
        toast({ title: "Staff Added", description: `${data.name} has been added to the establishment.` });
      }
      setIsFormOpen(false);
      setEditingStaff(null);
    } catch (error: any) {
      console.error("[EstablishmentPage] Error during form submission:", error);
      toast({ title: "Error", description: `Submission failed: ${error.message || "Could not save staff details."}`, variant: "destructive" });
    } finally {
      setIsSubmittingForm(false);
    }
  };
  
  const handleSetStaffStatus = async (staffId: string, newStatus: StaffStatusType, staffName: string) => {
    if (!canManage) {
        toast({ title: "Permission Denied", description: "You do not have permission to perform this action.", variant: "destructive"});
        return;
    }
    try {
      await updateStaffStatus(staffId, newStatus);
      toast({ title: "Staff Status Updated", description: `${staffName}'s status has been set to ${newStatus}.` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || `Could not update staff status for ${staffName}.`, variant: "destructive" });
    }
  };

  const handleOpenImageModal = (imageUrl: string | null) => {
    if (imageUrl && !isPlaceholderUrl(imageUrl)) {
      setImageForModal(imageUrl);
      setIsImageModalOpen(true);
    }
  };

  const handleExportExcel = async () => {
    const reportTitle = "Establishment Staff Report";
    const headers = ["Sl. No.", "Name", "Designation", "PEN", "Phone No.", "Date of Birth", "Roles", "Status", "Remarks"];
    
    if (staffMembers.length === 0) {
      toast({ title: "No Data to Export", variant: "default" });
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("StaffList");

    worksheet.addRow(["Ground Water Department, Kollam"]).commit();
    worksheet.addRow([reportTitle]).commit();
    worksheet.addRow([]).commit();
    worksheet.addRow([`Report generated on: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`]).commit();
    worksheet.addRow([]).commit();

    worksheet.mergeCells('A1:I1');
    worksheet.mergeCells('A2:I2');
    worksheet.mergeCells('A4:I4');

    worksheet.getCell('A1').alignment = { horizontal: 'center' };
    worksheet.getCell('A2').alignment = { horizontal: 'center' };
    worksheet.getCell('A4').alignment = { horizontal: 'left' };
    
    worksheet.getRow(1).font = { bold: true, size: 16 };
    worksheet.getRow(2).font = { bold: true, size: 14 };

    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true };
    headerRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern:'solid', fgColor:{argb:'F0F0F0'} };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });

    staffMembers.forEach((staff, index) => {
        const row = worksheet.addRow([
            index + 1,
            staff.name,
            staff.designation,
            staff.pen,
            staff.phoneNo || 'N/A',
            formatDateForSearch(staff.dateOfBirth),
            staff.roles || 'N/A',
            staff.status,
            staff.remarks || 'N/A',
        ]);
        row.eachCell(cell => {
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });
    });

    worksheet.columns.forEach(column => {
        let maxLength = 0;
        column.eachCell!({ includeEmpty: true }, (cell) => {
            let columnLength = cell.value ? cell.value.toString().length : 10;
            if (columnLength > maxLength) {
                maxLength = columnLength;
            }
        });
        column.width = maxLength < 15 ? 15 : maxLength + 2;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gwd_establishment_report_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Excel Exported", description: `Report downloaded successfully.` });
  };
  
  // Debounce the search term to avoid excessive re-renders and filtering
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300); // 300ms delay

    return () => {
      clearTimeout(timerId);
    };
  }, [searchTerm]);

  // Handle the actual filtering logic when the debounced term changes
  useEffect(() => {
    if (staffLoadingHook) return;
    setIsFiltering(true);
    const lowerSearchTerm = debouncedSearchTerm.toLowerCase();
    
    // Using requestAnimationFrame to ensure the loader is shown before a potentially long filtering operation
    requestAnimationFrame(() => {
      if (!lowerSearchTerm) {
          setFilteredStaff(staffMembers);
      } else {
          const filtered = staffMembers.filter(staff => 
              (staff.name?.toLowerCase().includes(lowerSearchTerm)) ||
              (staff.designation?.toLowerCase().includes(lowerSearchTerm)) ||
              (staff.pen?.toLowerCase().includes(lowerSearchTerm)) ||
              (staff.roles?.toLowerCase().includes(lowerSearchTerm)) ||
              (staff.phoneNo?.includes(lowerSearchTerm)) ||
              (formatDateForSearch(staff.dateOfBirth).includes(lowerSearchTerm)) ||
              (staff.remarks?.toLowerCase().includes(lowerSearchTerm))
          );
          setFilteredStaff(filtered);
      }
      setIsFiltering(false);
    });
  }, [debouncedSearchTerm, staffMembers, staffLoadingHook]);


  const activeStaffList = useMemo(() => filteredStaff.filter(s => s.status === 'Active'), [filteredStaff]);
  const transferredStaffList = useMemo(() => filteredStaff.filter(s => s.status === 'Transferred'), [filteredStaff]);
  const retiredStaffList = useMemo(() => filteredStaff.filter(s => s.status === 'Retired'), [filteredStaff]);
  
  const activeStaffCount = activeStaffList.length;
  const transferredStaffCount = transferredStaffList.length;
  const retiredStaffCount = retiredStaffList.length;

  if (authLoading || staffLoadingHook) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading establishment data...</p>
      </div>
    );
  }
  
  if (!user || !user.isApproved) {
     return (
      <div className="space-y-6 p-6 text-center">
        <ShieldAlert className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Access Denied</h1>
        <p className="text-muted-foreground">
          You do not have permission to view this page or you are not logged in.
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative flex-grow w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by name, PEN, designation, roles, phone, DOB (dd/MM/yyyy), remarks..."
                className="w-full rounded-lg bg-background pl-10 md:w-full lg:w-full shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              {canManage && (
                <Button onClick={handleAddNewStaff} className="w-full sm:w-auto">
                  <UserPlus className="mr-2 h-5 w-5" /> Add New Staff
                </Button>
              )}
              <Button variant="outline" onClick={handleExportExcel} className="w-full sm:w-auto">
                <FileDown className="mr-2 h-4 w-4" /> Export Excel
              </Button>
            </div>
          </div>
          <Tabs defaultValue="activeStaff" className="w-full pt-4 border-t">
            <TabsList className="grid w-full grid-cols-3 sm:w-[600px]">
              <TabsTrigger value="activeStaff">Active ({activeStaffCount})</TabsTrigger>
              <TabsTrigger value="transferredStaff">Transferred ({transferredStaffCount})</TabsTrigger>
              <TabsTrigger value="retiredStaff">Retired ({retiredStaffCount})</TabsTrigger>
            </TabsList>
            <TabsContent value="activeStaff" className="mt-4">
              <div className="max-h-[70vh] overflow-auto">
                <StaffTable
                  staffData={activeStaffList}
                  onEdit={handleEditStaff}
                  onDelete={canManage ? deleteStaffMember : undefined}
                  onSetStatus={canManage ? handleSetStaffStatus : undefined}
                  isViewer={isViewer}
                  onImageClick={handleOpenImageModal}
                  isLoading={isFiltering}
                  searchActive={!!debouncedSearchTerm}
                />
              </div>
            </TabsContent>
            <TabsContent value="transferredStaff" className="mt-4">
              <div className="max-h-[70vh] overflow-auto">
                <TransferredStaffTable
                    staffData={transferredStaffList}
                    onSetStatus={canManage ? handleSetStaffStatus : undefined}
                    isViewer={isViewer}
                    onImageClick={handleOpenImageModal}
                    isLoading={isFiltering}
                    searchActive={!!debouncedSearchTerm}
                />
              </div>
            </TabsContent>
            <TabsContent value="retiredStaff" className="mt-4">
              <div className="max-h-[70vh] overflow-auto">
                <RetiredStaffTable
                    staffData={retiredStaffList}
                    onSetStatus={canManage ? handleSetStaffStatus : undefined}
                    isViewer={isViewer}
                    onImageClick={handleOpenImageModal}
                    isLoading={isFiltering}
                    searchActive={!!debouncedSearchTerm}
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
          if (!isOpen) {
              setIsFormOpen(false);
              setEditingStaff(null);
          } else {
              setIsFormOpen(true);
          }
      }}>
        <DialogContent onPointerDownOutside={(e) => e.preventDefault()} className="sm:max-w-5xl max-h-[90vh]">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle>{editingStaff ? (isViewer ? "View Staff Details" : "Edit Staff Details") : "Add New Staff Member"}</DialogTitle>
            <DialogDescription>
              {editingStaff ? (isViewer ? "Viewing details for the staff member." : "Update the details for the staff member.") : "Fill in the form to add a new staff member."}
              {!isViewer && " Direct photo upload is disabled; please use a public image URL."}
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-6">
            <StaffForm
                onSubmit={handleFormSubmit}
                initialData={editingStaff}
                isSubmitting={isSubmittingForm}
                onCancel={() => {setIsFormOpen(false); setEditingStaff(null);}}
                isViewer={isViewer}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
        <DialogContent onPointerDownOutside={(e) => e.preventDefault()} className="p-0 border-0 bg-transparent shadow-none w-auto max-w-[90vw] sm:max-w-[80vw] lg:max-w-[70vw]">
          <div className="flex justify-center items-center max-h-[90vh] overflow-hidden">
            {imageForModal && <img src={imageForModal} alt="Staff photo enlarged" className="max-w-full max-h-full object-contain rounded-lg"/>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
