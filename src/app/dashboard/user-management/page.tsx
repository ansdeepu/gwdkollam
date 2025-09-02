
// src/app/dashboard/user-management/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import UserManagementTable from "@/components/admin/UserManagementTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth, type UserProfile } from "@/hooks/useAuth";
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
import RegisterForm from "@/components/auth/RegisterForm";
import type { NewUserByAdminFormData } from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";

export default function UserManagementPage() {
  const { user, isLoading, fetchAllUsers, updateUserApproval, updateUserRole, deleteUserDocument, batchDeleteUserDocuments, createUserByAdmin } = useAuth();
  const { staffMembers, isLoading: staffLoading } = useStaffMembers();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isStaffFormOpen, setIsStaffFormOpen] = useState(false);
  const [isGuestFormOpen, setIsGuestFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shouldRefresh, setShouldRefresh] = useState(false);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  const canManage = user?.role === 'editor';

  const loadUsers = useCallback(async () => {
    if (!user || !user.isApproved) {
      setUsersLoading(false);
      return;
    }
    setUsersLoading(true);
    try {
      const fetchedUsers = await fetchAllUsers();
      setAllUsers(fetchedUsers);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      toast({ title: "Error Loading Users", description: "Could not load user data. Please try again.", variant: "destructive" });
    } finally {
      setUsersLoading(false);
    }
  }, [fetchAllUsers, user, toast]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers, shouldRefresh]);


  useEffect(() => {
    if (!isLoading && user && !['editor', 'viewer'].includes(user.role)) {
      router.push('/dashboard');
    }
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  const handleStaffFormSubmit = async (data: NewUserByAdminFormData) => {
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
        setIsStaffFormOpen(false);
        setShouldRefresh(prev => !prev); // Trigger a refresh of the table data
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

  if (isLoading || staffLoading || usersLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading permissions...</p>
      </div>
    );
  }

  if (!user || !['editor', 'viewer'].includes(user.role)) {
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
       <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground">
          {canManage 
            ? "Oversee user accounts, manage roles, approval statuses, and perform administrative actions."
            : "View all registered users in the system. (Read-only)"
          }
        </p>
      </div>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle>Create New User</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-4">
            <Button onClick={() => setIsGuestFormOpen(true)} variant="outline">
                <UserPlus className="mr-2 h-5 w-5" /> Add Guest User
            </Button>
            <Button onClick={() => setIsStaffFormOpen(true)}>
                <UserPlus className="mr-2 h-5 w-5" /> Add New User (from Staff)
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-xl border-border/60">
        <CardHeader>
          <CardTitle className="text-xl">Registered Users ({allUsers.length})</CardTitle>
          <CardDescription>
            A list of all user accounts in the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserManagementTable
            key={shouldRefresh ? 'refresh' : 'initial'} // Add key here to force re-render on refresh
            users={allUsers}
            isLoading={usersLoading}
            onDataChange={() => setShouldRefresh(prev => !prev)}
            currentUser={user}
            updateUserApproval={updateUserApproval}
            updateUserRole={updateUserRole}
            deleteUserDocument={deleteUserDocument}
            batchDeleteUserDocuments={batchDeleteUserDocuments}
            staffMembers={staffMembers}
          />
        </CardContent>
      </Card>

      <Dialog open={isStaffFormOpen} onOpenChange={setIsStaffFormOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Create New User (from Staff)</DialogTitle>
                <DialogDescription>
                    Select a staff member and provide their login details. They will be assigned the 'viewer' role and will need to be approved manually.
                </DialogDescription>
            </DialogHeader>
            <NewUserForm
                staffMembers={staffMembers}
                staffLoading={staffLoading}
                onSubmit={handleStaffFormSubmit}
                isSubmitting={isSubmitting}
                onCancel={() => setIsStaffFormOpen(false)}
            />
        </DialogContent>
      </Dialog>
      
      <Dialog open={isGuestFormOpen} onOpenChange={setIsGuestFormOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Create Guest User Account</DialogTitle>
                <DialogDescription>
                    Provide a name, email, and password. The guest user will not be linked to the establishment list. They will need to be approved manually.
                </DialogDescription>
            </DialogHeader>
            <div className="pt-4">
              <RegisterForm />
            </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
