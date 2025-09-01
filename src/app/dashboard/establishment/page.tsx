
// src/app/dashboard/establishment/page.tsx
"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Briefcase, UserPlus, ShieldAlert, Loader2, Expand, Search, FileDown } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
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
import { designationOptions } from "@/lib/schemas";
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
import * as XLSX from "xlsx";
import PaginationControls from "@/components/shared/PaginationControls";

const ITEMS_PER_PAGE = 20;

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
  const { user, isLoading: authLoading } = useAuth();
  const { 
    staffMembers: allStaffMembers, 
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
  
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  const [imageForModal, setImageForModal] = useState<string | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  
  const [activeStaffPage, setActiveStaffPage] = useState(1);
  const [transferredStaffPage, setTransferredStaffPage] = useState(1);
  const [retiredStaffPage, setRetiredStaffPage] = useState(1);
  
  const canManage = user?.role === 'editor' && user.isApproved;

  // Debounce search term
  useEffect(() => {
    const timerId = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(timerId);
  }, [searchTerm]);
  
  const designationOrderMap = useMemo(() => new Map(designationOptions.map((d, i) => [d, i])), []);
  
  const sortStaff = useCallback((a: StaffMember, b: StaffMember) => {
    const orderA = designationOrderMap.get(a.designation) ?? Infinity;
    const orderB = designationOrderMap.get(b.designation) ?? Infinity;
    if (orderA !== orderB) return orderA - orderB;
    return a.name.localeCompare(b.name);
  }, [designationOrderMap]);

  // Centralized data processing logic
  const { 
    paginatedActive, activeTotalPages, allActiveStaff,
    paginatedTransferred, transferredTotalPages, allTransferredStaff,
    paginatedRetired, retiredTotalPages, allRetiredStaff
  } = useMemo(() => {
    const allActive = allStaffMembers.filter(s => s.status === 'Active').sort(sortStaff);
    const allTransferred = allStaffMembers.filter(s => s.status === 'Transferred').sort(sortStaff);
    const allRetired = allStaffMembers.filter(s => s.status === 'Retired').sort(sortStaff);

    const searchFilter = (staff: StaffMember) => {
      if (!debouncedSearchTerm) return true;
      const lowerSearchTerm = debouncedSearchTerm.toLowerCase();
      return (
        (staff.name?.toLowerCase().includes(lowerSearchTerm)) ||
        (staff.designation?.toLowerCase().includes(lowerSearchTerm)) ||
        (staff.pen?.toLowerCase().includes(lowerSearchTerm)) ||
        (staff.roles?.toLowerCase().includes(lowerSearchTerm)) ||
        (staff.phoneNo?.includes(lowerSearchTerm)) ||
        (formatDateForSearch(staff.dateOfBirth).includes(lowerSearchTerm)) ||
        (staff.remarks?.toLowerCase().includes(lowerSearchTerm))
      );
    };

    const filteredActive = allActive.filter(searchFilter);
    const filteredTransferred = allTransferred.filter(searchFilter);
    const filteredRetired = allRetired.filter(searchFilter);
    
    const paginate = (data: StaffMember[], page: number) => {
      const startIndex = (page - 1) * ITEMS_PER_PAGE;
      return data.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    };

    return {
      allActiveStaff: allActive,
      paginatedActive: paginate(filteredActive, activeStaffPage),
      activeTotalPages: Math.ceil(filteredActive.length / ITEMS_PER_PAGE),
      allTransferredStaff: allTransferred,
      paginatedTransferred: paginate(filteredTransferred, transferredStaffPage),
      transferredTotalPages: Math.ceil(filteredTransferred.length / ITEMS_PER_PAGE),
      allRetiredStaff: allRetired,
      paginatedRetired: paginate(filteredRetired, retiredStaffPage),
      retiredTotalPages: Math.ceil(filteredRetired.length / ITEMS_PER_PAGE),
    };
  }, [allStaffMembers, debouncedSearchTerm, sortStaff, activeStaffPage, transferredStaffPage, retiredStaffPage]);
  
  useEffect(() => {
    setActiveStaffPage(1);
    setTransferredStaffPage(1);
    setRetiredStaffPage(1);
  }, [debouncedSearchTerm]);


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

  const handleExportExcel = () => {
    const reportTitle = "Establishment Staff Report";
    const columnLabels = ["Sl. No.", "Name", "Designation", "PEN", "Phone No.", "Date of Birth", "Roles", "Status", "Remarks"];
    
    const dataRows = allStaffMembers.map((staff, index) => [
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
    const sheetName = "StaffList";
    const fileNamePrefix = "gwd_establishment_report";

    if (dataRows.length === 0) {
      toast({ title: "No Data to Export", variant: "default" });
      return;
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([]);
    
    const headerRows = [
      ["Ground Water Department, Kollam"],
      [reportTitle],
      [],
      [`Report generated on: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`],
      [],
    ];

    const numCols = columnLabels.length;
    const footerColIndex = numCols > 1 ? numCols - 2 : 0;
    const footerRowData = new Array(numCols).fill("");
    footerRowData[footerColIndex] = "District Officer";
    const footerRows = [[], footerRowData];
    
    const finalData = [...headerRows, columnLabels, ...dataRows, ...footerRows];
    
    XLSX.utils.sheet_add_aoa(ws, finalData, { cellStyles: false });
    
    const merges = [];
    for (let i = 0; i < headerRows.length; i++) {
        if (headerRows[i].length > 0 && headerRows[i][0]) {
             merges.push({ s: { r: i, c: 0 }, e: { r: i, c: numCols - 1 } });
        }
    }
    const footerRowIndex = finalData.length - 1;
    if (numCols > 1) {
        merges.push({ s: { r: footerRowIndex, c: footerColIndex }, e: { r: footerRowIndex, c: numCols - 1 } });
    }
    ws['!merges'] = merges;

    const colWidths = finalData[0].map((_, i) => ({
      wch: Math.max(...finalData.map(row => (row[i] ? String(row[i]).length : 0))) + 2
    }));
    ws['!cols'] = colWidths;

    for (let R = 0; R < finalData.length; R++) {
      ws['!rows'] = ws['!rows'] || [];
      ws['!rows'][R] = { hpt: 20 };
      for (let C = 0; C < numCols; C++) {
        const cellRef = XLSX.utils.encode_cell({ c: C, r: R });
        if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };
        
        ws[cellRef].s = {
          alignment: { horizontal: "center", vertical: "center", wrapText: true },
          border: { 
            top: { style: "thin" }, bottom: { style: "thin" }, 
            left: { style: "thin" }, right: { style: "thin" } 
          }
        };

        if (R < 2) {
             ws[cellRef].s.font = { bold: true, sz: R === 0 ? 16 : 14 };
        } else if (R < headerRows.length -1) {
             ws[cellRef].s.font = { italic: true };
             ws[cellRef].s.alignment!.horizontal = "left";
        }
        
        const columnLabelsRowIndex = headerRows.length;
        if (R === columnLabelsRowIndex) {
            ws[cellRef].s.font = { bold: true };
            ws[cellRef].s.fill = { fgColor: { rgb: "F0F0F0" } };
        }
        
        if (R === footerRowIndex) {
          ws[cellRef].s.border = {};
          if (C >= footerColIndex) {
             ws[cellRef].s.font = { bold: true };
             ws[cellRef].s.alignment!.horizontal = "right";
          }
        }
      }
    }

    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    const uniqueFileName = `${fileNamePrefix}_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
    XLSX.writeFile(wb, uniqueFileName);
    toast({ title: "Excel Exported", description: `Report downloaded as ${uniqueFileName}.` });
  };
  
  const isLoading = authLoading || staffLoadingHook;

  if (isLoading) {
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
      <div className="my-4 flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-grow w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name, PEN, designation, roles, phone, DOB (dd/MM/yyyy), remarks..."
            className="w-full rounded-lg bg-background pl-10 md:w-full lg:w-full shadow-sm text-base h-12 border-2 border-primary/20 focus-visible:ring-primary focus-visible:ring-offset-2"
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

      <Tabs defaultValue="activeStaff" className="w-full">
        <TabsList className="grid w-full grid-cols-3 sm:w-[600px] mb-4">
          <TabsTrigger value="activeStaff">Active ({allActiveStaff.length})</TabsTrigger>
          <TabsTrigger value="transferredStaff">Transferred ({allTransferredStaff.length})</TabsTrigger>
          <TabsTrigger value="retiredStaff">Retired ({allRetiredStaff.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="activeStaff" className="mt-0">
          <Card className="shadow-lg">
            <CardHeader>
                <CardTitle>Active Staff Members</CardTitle>
                <CardDescription>List of currently active staff members. {debouncedSearchTerm && `(Filtered by search: "${debouncedSearchTerm}")`}</CardDescription>
            </CardHeader>
            <CardContent>
              <StaffTable
                staffData={paginatedActive}
                onEdit={canManage ? handleEditStaff : undefined}
                onDelete={canManage ? deleteStaffMember : undefined}
                onSetStatus={canManage ? handleSetStaffStatus : undefined}
                isViewer={!canManage}
                onImageClick={handleOpenImageModal}
                isLoading={staffLoadingHook}
                searchActive={!!debouncedSearchTerm}
              />
            </CardContent>
            {activeTotalPages > 1 && (
                <CardFooter className="justify-center py-4">
                    <PaginationControls currentPage={activeStaffPage} totalPages={activeTotalPages} onPageChange={setActiveStaffPage} />
                </CardFooter>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="transferredStaff" className="mt-0">
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle>Transferred Staff Members</CardTitle>
                    <CardDescription>List of staff members marked as transferred. {debouncedSearchTerm && `(Filtered by search: "${debouncedSearchTerm}")`}</CardDescription>
                </CardHeader>
                <CardContent>
                    <TransferredStaffTable
                        staffData={paginatedTransferred}
                        onSetStatus={canManage ? handleSetStaffStatus : undefined}
                        isViewer={!canManage}
                        onImageClick={handleOpenImageModal}
                        isLoading={staffLoadingHook}
                        searchActive={!!debouncedSearchTerm}
                    />
                </CardContent>
                {transferredTotalPages > 1 && (
                    <CardFooter className="justify-center py-4">
                        <PaginationControls currentPage={transferredStaffPage} totalPages={transferredTotalPages} onPageChange={setTransferredStaffPage} />
                    </CardFooter>
                )}
            </Card>
        </TabsContent>

        <TabsContent value="retiredStaff" className="mt-0">
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle>Retired Staff Members</CardTitle>
                    <CardDescription>List of staff members marked as retired. {debouncedSearchTerm && `(Filtered by search: "${debouncedSearchTerm}")`}</CardDescription>
                </CardHeader>
                <CardContent>
                    <RetiredStaffTable
                        staffData={paginatedRetired}
                        onSetStatus={canManage ? handleSetStaffStatus : undefined}
                        isViewer={!canManage}
                        onImageClick={handleOpenImageModal}
                        isLoading={staffLoadingHook}
                        searchActive={!!debouncedSearchTerm}
                    />
                </CardContent>
                 {retiredTotalPages > 1 && (
                    <CardFooter className="justify-center py-4">
                        <PaginationControls currentPage={retiredStaffPage} totalPages={retiredTotalPages} onPageChange={setRetiredStaffPage} />
                    </CardFooter>
                )}
            </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
          if (!isOpen) {
              setIsFormOpen(false);
              setEditingStaff(null);
          } else {
              setIsFormOpen(true);
          }
      }}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{editingStaff ? "Edit Staff Details" : "Add New Staff Member"}</DialogTitle>
            <DialogDescription>
              {editingStaff ? "Update the details for the staff member." : "Fill in the form to add a new staff member."}
              {" Direct photo upload is disabled; please use a public image URL."}
            </DialogDescription>
          </DialogHeader>
          <div className="pr-2 py-2">
            <StaffForm
                onSubmit={handleFormSubmit}
                initialData={editingStaff}
                isSubmitting={isSubmittingForm}
                onCancel={() => {setIsFormOpen(false); setEditingStaff(null);}}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
        <DialogContent className="sm:max-w-[600px] p-2">
          <DialogHeader>
            <DialogTitle className="text-sm">Staff Photo</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center items-center max-h-[80vh] overflow-hidden">
            {imageForModal && <img src={imageForModal} alt="Staff photo enlarged" className="max-w-full max-h-[75vh] object-contain rounded-md"/>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
