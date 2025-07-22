
// src/app/dashboard/user-management/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import UserManagementTable from "@/components/admin/UserManagementTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useStaffMembers } from "@/hooks/useStaffMembers";
import { useRouter } from "next/navigation";
import { Users, ShieldAlert, Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import NewUserForm from "@/components/admin/NewUserForm";
import type { NewUserByAdminFormData } from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";

export default function UserManagementPage() {
  const { user, isLoading, fetchAllUsers, updateUserApproval, updateUserRole, deleteUserDocument, batchDeleteUserDocuments, createUserByAdmin } = useAuth();
  const { staffMembers, isLoading: staffLoading } = useStaffMembers();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shouldRefresh, setShouldRefresh] = useState(false);

  useEffect(() => {
    if (!isLoading && user && user.role !== 'editor') {
      router.push('/dashboard');
    }
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  const handleFormSubmit = async (data: NewUserByAdminFormData) => {
    setIsSubmitting(true);
    try {
      const selectedStaffMember = staffMembers.find(s => s.id === data.staffId);
      if (!selectedStaffMember) {
        toast({ title: "Error", description: "Selected staff member not found.", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }

      const result = await createUserByAdmin(data.email, data.password, selectedStaffMember.name, data.staffId);
      if (result.success) {
        toast({
          title: "User Created",
          description: `Account for ${data.email} has been successfully created and is pending approval.`,
        });
        setIsFormOpen(false);
        setShouldRefresh(true); // Trigger a refresh of the table data
      } else {
        toast({
          title: "Creation Failed",
          description: result.error?.message || "Could not create the user account.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
       toast({
          title: "Error",
          description: error.message || "An unexpected error occurred.",
          variant: "destructive",
        });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || staffLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading permissions...</p>
      </div>
    );
  }

  if (!user || user.role !== 'editor') {
    return (
      <div className="space-y-6 p-6 text-center">
        <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Access Denied</h1>
        <p className="text-muted-foreground">
          You do not have permission to access this page or you are not logged in.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-3">
          <Users className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight text-foreground">User Management</h1>
        </div>
         <Button onClick={() => setIsFormOpen(true)}>
            <UserPlus className="mr-2 h-5 w-5" /> Add New User
        </Button>
      </div>
      <p className="text-muted-foreground max-w-2xl">
        Oversee user accounts, manage roles, approval statuses, and perform administrative actions. 
        Ensure careful handling of user data and permissions.
      </p>
      <Card className="shadow-xl border-border/60">
        <CardHeader>
          <CardTitle className="text-xl">Registered Users</CardTitle>
          <CardDescription>
            Review and manage all users within the GWD Kollam dashboard system. 
            Use batch actions for efficiency where applicable.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserManagementTable
            key={shouldRefresh ? 'refresh' : 'initial'} // Add key here to force re-render on refresh
            currentUser={user}
            fetchAllUsers={fetchAllUsers}
            updateUserApproval={updateUserApproval}
            updateUserRole={updateUserRole}
            deleteUserDocument={deleteUserDocument}
            batchDeleteUserDocuments={batchDeleteUserDocuments}
            staffMembers={staffMembers}
          />
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Create New User Account</DialogTitle>
                <DialogDescription>
                    Select a staff member and provide their login details. They will be assigned the 'viewer' role and will need to be approved manually.
                </DialogDescription>
            </DialogHeader>
            <NewUserForm
                staffMembers={staffMembers}
                staffLoading={staffLoading}
                onSubmit={handleFormSubmit}
                isSubmitting={isSubmitting}
                onCancel={() => setIsFormOpen(false)}
            />
        </DialogContent>
      </Dialog>

    </div>
  );
}
