// src/app/dashboard/user-management/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import UserManagementTable from "@/components/admin/UserManagementTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth, type UserProfile } from "@/hooks/useAuth";
import { useStaffMembers } from "@/hooks/useStaffMembers";
import { useRouter } from "next/navigation";
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
import { usePageHeader } from "@/hooks/usePageHeader";

export const dynamic = 'force-dynamic';

const Loader2 = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
);
const UserPlus = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>
);
const Users = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
);
const ShieldAlert = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
);

export default function UserManagementPage() {
  const { setHeader } = usePageHeader();
  useEffect(() => {
    setHeader('User Management', 'Oversee user accounts, manage roles, and perform administrative actions.');
  }, [setHeader]);

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
  const isViewer = user?.role === 'viewer';


  const loadUsers = useCallback(async () => {
    if (!user || !user.isApproved || !['editor', 'viewer'].includes(user.role)) {
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
      {canManage && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <Button onClick={() => setIsGuestFormOpen(true)} variant="outline">
                  <UserPlus className="mr-2 h-5 w-5" /> Add Guest User
              </Button>
              <Button onClick={() => setIsStaffFormOpen(true)}>
                  <UserPlus className="mr-2 h-5 w-5" /> Add New User (from Staff)
              </Button>
            </div>
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
            isViewer={isViewer}
            updateUserApproval={updateUserApproval}
            updateUserRole={updateUserRole}
            deleteUserDocument={deleteUserDocument}
            staffMembers={staffMembers}
          />
        </CardContent>
      </Card>

      <Dialog open={isStaffFormOpen} onOpenChange={setIsStaffFormOpen}>
        <DialogContent onPointerDownOutside={(e) => e.preventDefault()} className="max-w-2xl flex flex-col p-0 h-auto">
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
        <DialogContent onPointerDownOutside={(e) => e.preventDefault()}>
            <DialogHeader>
                <DialogTitle>Add Guest User</DialogTitle>
                <DialogDescription>
                    Create a new user account. Guests will have the 'viewer' role by default and require manual approval.
                </DialogDescription>
            </DialogHeader>
            <div className="p-6 pt-4">
              <RegisterForm />
            </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
