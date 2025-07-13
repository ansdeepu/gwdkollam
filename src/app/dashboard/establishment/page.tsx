// src/app/dashboard/establishment/page.tsx
"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Briefcase, UserPlus, ShieldAlert, Loader2, Expand, Search } from "lucide-react";
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
  const [searchTerm, setSearchTerm] = useState("");
  const [isFiltering, setIsFiltering] = useState(false);
  const [filteredStaff, setFilteredStaff] = useState<StaffMember[]>([]);

  const [imageForModal, setImageForModal] = useState<string | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  
  const canManage = user?.role === 'editor' && user.isApproved;

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
  
  // Correctly handle filtering logic with useEffect
  useEffect(() => {
    if (staffLoadingHook) return;
    setIsFiltering(true);
    const lowerSearchTerm = searchTerm.toLowerCase();
    
    // The timeout allows the UI to update and show the loader before a potentially long filtering operation blocks the main thread.
    const timer = setTimeout(() => {
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
    }, 50); // 50ms delay is usually enough for the UI to update.

    return () => clearTimeout(timer); // Cleanup the timeout
  }, [searchTerm, staffMembers, staffLoadingHook]);


  const activeStaffList = useMemo(() => filteredStaff.filter(s => s.status === 'Active'), [filteredStaff]);
  const transferredStaffList = useMemo(() => filteredStaff.filter(s => s.status === 'Transferred'), [filteredStaff]);
  const retiredStaffList = useMemo(() => filteredStaff.filter(s => s.status === 'Retired'), [filteredStaff]);
  
  const activeStaffCount = activeStaffList.length;
  const transferredStaffCount = transferredStaffList.length;
  const retiredStaffCount = retiredStaffList.length;

  const totalActiveStaffOverall = useMemo(() => staffMembers.filter(s => s.status === 'Active').length, [staffMembers]);
  const totalTransferredStaffOverall = useMemo(() => staffMembers.filter(s => s.status === 'Transferred').length, [staffMembers]);
  const totalRetiredStaffOverall = useMemo(() => staffMembers.filter(s => s.status === 'Retired').length, [staffMembers]);
  const totalStaffMembersOverall = staffMembers.length;

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-3">
          <Briefcase className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Establishment Management</h1>
        </div>
        {canManage && (
            <Button onClick={handleAddNewStaff}>
              <UserPlus className="mr-2 h-5 w-5" /> Add New Staff
            </Button>
          )}
      </div>
      <p className="text-muted-foreground">
        Manage staff profiles, designations, and statuses. 
        Overall Total: {totalStaffMembersOverall} (Active: {totalActiveStaffOverall}, Transferred: {totalTransferredStaffOverall}, Retired: {totalRetiredStaffOverall}).
      </p>

      <div className="relative my-4">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search by name, PEN, designation, roles, phone, DOB (dd/MM/yyyy), remarks..."
          className="w-full rounded-lg bg-background pl-8 md:w-2/3 lg:w-1/2 shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <Tabs defaultValue="activeStaff" className="w-full">
        <TabsList className="grid w-full grid-cols-3 sm:w-[600px] mb-4">
          <TabsTrigger value="activeStaff">Active ({activeStaffCount})</TabsTrigger>
          <TabsTrigger value="transferredStaff">Transferred ({transferredStaffCount})</TabsTrigger>
          <TabsTrigger value="retiredStaff">Retired ({retiredStaffCount})</TabsTrigger>
        </TabsList>

        <TabsContent value="activeStaff" className="mt-0">
          <Card className="shadow-lg">
            <CardHeader>
                <CardTitle>Active Staff Members</CardTitle>
                <CardDescription>List of currently active staff members. {searchTerm && `(Filtered by search: "${searchTerm}")`}</CardDescription>
            </CardHeader>
            <CardContent>
              <StaffTable
                staffData={activeStaffList}
                onEdit={canManage ? handleEditStaff : undefined}
                onDelete={canManage ? deleteStaffMember : undefined}
                onSetStatus={canManage ? handleSetStaffStatus : undefined}
                isViewer={!canManage}
                onImageClick={handleOpenImageModal}
                isLoading={isFiltering}
                searchActive={!!searchTerm}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transferredStaff" className="mt-0">
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle>Transferred Staff Members</CardTitle>
                    <CardDescription>List of staff members marked as transferred. {searchTerm && `(Filtered by search: "${searchTerm}")`}</CardDescription>
                </CardHeader>
                <CardContent>
                    <TransferredStaffTable
                        staffData={transferredStaffList}
                        onSetStatus={canManage ? handleSetStaffStatus : undefined}
                        isViewer={!canManage}
                        onImageClick={handleOpenImageModal}
                        isLoading={isFiltering}
                        searchActive={!!searchTerm}
                    />
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="retiredStaff" className="mt-0">
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle>Retired Staff Members</CardTitle>
                    <CardDescription>List of staff members marked as retired. {searchTerm && `(Filtered by search: "${searchTerm}")`}</CardDescription>
                </CardHeader>
                <CardContent>
                    <RetiredStaffTable
                        staffData={retiredStaffList}
                        onSetStatus={canManage ? handleSetStaffStatus : undefined}
                        isViewer={!canManage}
                        onImageClick={handleOpenImageModal}
                        isLoading={isFiltering}
                        searchActive={!!searchTerm}
                    />
                </CardContent>
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
