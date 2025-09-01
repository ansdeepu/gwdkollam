
// src/components/admin/UserManagementTable.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ShieldCheck, ShieldAlert, Trash2, Edit, UserCog, CheckSquare, Square } from "lucide-react";
import type { UserProfile } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { userRoleOptions, type UserRole, type StaffMember } from "@/lib/schemas";
import { format, formatDistanceToNowStrict } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const ADMIN_EMAIL_FOR_TABLE = 'gwdklm@gmail.com';

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

interface UserManagementTableProps {
  currentUser: UserProfile | null;
  users: UserProfile[];
  isLoading: boolean;
  onDataChange: () => void;
  updateUserApproval: (uid: string, isApproved: boolean) => Promise<void>;
  updateUserRole: (uid: string, newRole: UserRole, staffId?: string) => Promise<void>;
  deleteUserDocument: (uid: string) => Promise<void>;
  batchDeleteUserDocuments: (uids: string[]) => Promise<{ successCount: number, failureCount: number, errors: string[] }>;
  staffMembers: StaffMember[];
}

export default function UserManagementTable({
  currentUser,
  users,
  isLoading,
  onDataChange,
  updateUserApproval,
  updateUserRole,
  deleteUserDocument,
  batchDeleteUserDocuments,
  staffMembers,
}: UserManagementTableProps) {
  const { toast } = useToast();
  const [updatingUsers, setUpdatingUsers] = useState<Record<string, { approval?: boolean, role?: boolean }>>({});
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  
  const [selectedUserUids, setSelectedUserUids] = useState<string[]>([]);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const timeA = a.createdAt?.getTime() ?? 0;
      const timeB = b.createdAt?.getTime() ?? 0;
      return timeB - timeA;
    });
  }, [users]);


  const handleApprovalChange = async (uid: string, currentIsApproved: boolean) => {
    if (currentUser?.uid === uid || users.find(u => u.uid === uid)?.email === ADMIN_EMAIL_FOR_TABLE) {
      toast({ title: "Action Restricted", description: "Admin or self approval status cannot be changed here.", variant: "default" });
      return;
    }
    setUpdatingUsers(prev => ({ ...prev, [uid]: { ...prev[uid], approval: true } }));
    try {
      await updateUserApproval(uid, !currentIsApproved);
      toast({ title: "Approval Updated", description: `User approval status changed to ${!currentIsApproved ? 'Approved' : 'Pending'}.` });
      onDataChange();
    } catch (error: any) {
      toast({ title: "Update Failed", description: error.message || "Could not update approval status.", variant: "destructive" });
    } finally {
      setUpdatingUsers(prev => ({ ...prev, [uid]: { ...prev[uid], approval: false } }));
    }
  };

  const handleRoleChange = async (uid: string, newRole: UserRole) => {
    if (currentUser?.uid === uid || users.find(u => u.uid === uid)?.email === ADMIN_EMAIL_FOR_TABLE) {
      toast({ title: "Action Restricted", description: "Admin or self role cannot be changed here.", variant: "default" });
      return;
    }

    let staffIdToLink: string | undefined = undefined;
    const userToUpdate = users.find(u => u.uid === uid);

    if (userToUpdate && !userToUpdate.staffId && (newRole === 'supervisor' || newRole === 'editor')) {
        const matchingStaffMember = staffMembers.find(staff => staff.name === userToUpdate.name);
        if (matchingStaffMember) {
            staffIdToLink = matchingStaffMember.id;
        } else {
            toast({
                title: "Staff Linking Failed",
                description: `Could not find a matching staff profile for ${userToUpdate.name}. The user can still be a Supervisor, but won't be assignable to sites. Please ensure staff and user names match exactly.`,
                variant: "destructive",
                duration: 9000
            });
        }
    }

    setUpdatingUsers(prev => ({ ...prev, [uid]: { ...prev[uid], role: true } }));
    try {
      await updateUserRole(uid, newRole, staffIdToLink);
      toast({ title: "Role Updated", description: `User role for ${userToUpdate?.name || 'user'} changed to ${newRole}.` });
      if (staffIdToLink) {
        toast({ title: "Staff Profile Linked", description: `User ${userToUpdate?.name} successfully linked to their staff profile.` });
      }
      onDataChange();
    } catch (error: any) {
      toast({ title: "Update Failed", description: error.message || "Could not update role.", variant: "destructive" });
    } finally {
      setUpdatingUsers(prev => ({ ...prev, [uid]: { ...prev[uid], role: false } }));
    }
  };

  const handleDeleteUserClick = (user: UserProfile) => {
    if (user.email === ADMIN_EMAIL_FOR_TABLE || currentUser?.uid === user.uid) return;
    setUserToDelete(user);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeletingUser(true);
    try {
      await deleteUserDocument(userToDelete.uid);
      toast({ title: "User Removed", description: `Profile for ${userToDelete.name || userToDelete.email} has been removed.` });
      setSelectedUserUids(prev => prev.filter(uid => uid !== userToDelete.uid)); // Remove from selection
      onDataChange();
    } catch (error: any) {
      toast({ title: "Removal Failed", description: error.message || "Could not remove user profile.", variant: "destructive" });
    } finally {
      setIsDeletingUser(false);
      setUserToDelete(null);
    }
  };

  const eligibleForSelectionUsers = useMemo(() => {
    return sortedUsers.filter(user => user.email !== ADMIN_EMAIL_FOR_TABLE && user.uid !== currentUser?.uid);
  }, [sortedUsers, currentUser]);

  const handleSelectAllChange = (checked: boolean | "indeterminate") => {
    if (checked === true) {
      setSelectedUserUids(eligibleForSelectionUsers.map(user => user.uid));
    } else {
      setSelectedUserUids([]);
    }
  };

  const handleUserSelectionChange = (uid: string, checked: boolean) => {
    setSelectedUserUids(prev =>
      checked ? [...prev, uid] : prev.filter(selectedUid => selectedUid !== uid)
    );
  };
  
  const confirmBatchDelete = async () => {
    if (selectedUserUids.length === 0) return;
    setIsBatchDeleting(true);
    try {
      const result = await batchDeleteUserDocuments(selectedUserUids);
      let description = `${result.successCount} user(s) removed.`;
      if (result.failureCount > 0) {
        description += ` ${result.failureCount} failed. Errors: ${result.errors.slice(0,2).join(', ')}${result.errors.length > 2 ? '...' : ''}`;
      }
      toast({
        title: "Batch Removal Complete",
        description: description,
        variant: result.failureCount > 0 ? "default" : "default",
        duration: result.failureCount > 0 ? 10000 : 5000,
      });
      onDataChange();
    } catch (error: any) {
      toast({ title: "Batch Removal Error", description: error.message || "Could not remove selected users.", variant: "destructive" });
    } finally {
      setIsBatchDeleting(false);
      setShowBatchDeleteConfirm(false);
      setSelectedUserUids([]);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading user accounts...</p>
      </div>
    );
  }

  if (!sortedUsers || sortedUsers.length === 0) {
    return (
      <div className="py-10 text-center text-muted-foreground border rounded-lg bg-secondary/30">
         <UserCog className="mx-auto h-16 w-16 text-muted-foreground/70 mb-4" />
        <p className="text-lg font-medium">No Users Found</p>
        <p className="text-sm">There are no registered users in the system yet.</p>
      </div>
    );
  }
  
  const allEligibleSelected = eligibleForSelectionUsers.length > 0 && selectedUserUids.length === eligibleForSelectionUsers.length;
  const isIndeterminate = selectedUserUids.length > 0 && selectedUserUids.length < eligibleForSelectionUsers.length;

  return (
    <TooltipProvider delayDuration={300}>
      {selectedUserUids.length > 0 && (
        <div className="mb-4 flex items-center justify-start space-x-3 p-3 bg-secondary/50 rounded-md border border-border">
          <Button
            variant="destructive"
            onClick={() => setShowBatchDeleteConfirm(true)}
            disabled={isBatchDeleting}
            size="sm"
          >
            {isBatchDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            Remove Selected ({selectedUserUids.length})
          </Button>
          <p className="text-sm text-muted-foreground">
            {selectedUserUids.length} user(s) selected for batch action.
          </p>
        </div>
      )}
      <div className="relative w-full overflow-x-auto rounded-md border">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[50px] px-3 py-2.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Checkbox
                      checked={allEligibleSelected ? true : (isIndeterminate ? "indeterminate" : false)}
                      onCheckedChange={handleSelectAllChange}
                      aria-label="Select all eligible users"
                      disabled={eligibleForSelectionUsers.length === 0}
                      className="data-[state=checked]:bg-primary data-[state=indeterminate]:bg-primary/50"
                    />
                  </TooltipTrigger>
                  <TooltipContent><p>Select all non-admin/non-self users</p></TooltipContent>
                </Tooltip>
              </TableHead>
              <TableHead className="w-[70px] px-3 py-2.5 text-center">Photo</TableHead>
              <TableHead className="px-3 py-2.5">Name</TableHead>
              <TableHead className="px-3 py-2.5">Email</TableHead>
              <TableHead className="px-3 py-2.5">Registered</TableHead>
              <TableHead className="px-3 py-2.5 text-center">Role</TableHead>
              <TableHead className="px-3 py-2.5 text-center">Status</TableHead>
              <TableHead className="px-3 py-2.5 text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedUsers.map((userRow) => {
              const isCurrentUserTheUserInRow = currentUser?.uid === userRow.uid;
              const isUserInRowAdmin = userRow.email === ADMIN_EMAIL_FOR_TABLE;
              const disableActions = updatingUsers[userRow.uid]?.approval || updatingUsers[userRow.uid]?.role || isCurrentUserTheUserInRow || isUserInRowAdmin;
              const isCheckboxDisabled = isUserInRowAdmin || isCurrentUserTheUserInRow;
              const staffInfo = staffMembers.find(s => s.id === userRow.staffId);
              const photoUrl = staffInfo?.photoUrl;

              return (
              <TableRow key={userRow.uid} data-state={selectedUserUids.includes(userRow.uid) ? "selected" : ""} className="hover:bg-muted/30 transition-colors">
                <TableCell className="px-3 py-2">
                  <Checkbox
                    checked={selectedUserUids.includes(userRow.uid)}
                    onCheckedChange={(checked) => handleUserSelectionChange(userRow.uid, !!checked)}
                    aria-label={`Select user ${userRow.name}`}
                    disabled={isCheckboxDisabled}
                     className="data-[state=checked]:bg-primary"
                  />
                </TableCell>
                <TableCell className="px-3 py-2">
                  <Avatar className="h-9 w-9 mx-auto">
                      <AvatarImage src={photoUrl || undefined} alt={userRow.name || 'User'} data-ai-hint="person user" />
                      <AvatarFallback>{getInitials(userRow.name)}</AvatarFallback>
                  </Avatar>
                </TableCell>
                <TableCell className="font-medium px-3 py-2 whitespace-normal break-words">{userRow.name || "N/A"}</TableCell>
                <TableCell className="px-3 py-2 text-muted-foreground whitespace-normal break-words">{userRow.email}</TableCell>
                <TableCell className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                  {userRow.createdAt ? (
                    <Tooltip>
                      <TooltipTrigger>{formatDistanceToNowStrict(userRow.createdAt, { addSuffix: true })}</TooltipTrigger>
                      <TooltipContent>{format(userRow.createdAt, "dd MMM yyyy, hh:mm a")}</TooltipContent>
                    </Tooltip>
                  ) : "Unknown"}
                </TableCell>
                <TableCell className="px-3 py-2 text-center">
                  {isUserInRowAdmin ? (
                    <Badge variant="default" className="bg-primary/90 text-primary-foreground pointer-events-none">Editor (Admin)</Badge>
                  ) : (
                    <Select
                      value={userRow.role}
                      onValueChange={(newRole) => handleRoleChange(userRow.uid, newRole as UserRole)}
                      disabled={disableActions || updatingUsers[userRow.uid]?.role}
                    >
                      <SelectTrigger className="w-[120px] h-8 text-xs focus:ring-primary" aria-label={`Change role for ${userRow.name}`}>
                         {updatingUsers[userRow.uid]?.role ? <Loader2 className="h-3 w-3 animate-spin" /> : <SelectValue />}
                      </SelectTrigger>
                      <SelectContent>
                        {userRoleOptions.map(roleOption => (
                          <SelectItem key={roleOption} value={roleOption} className="text-xs">
                            {roleOption === 'supervisor' ? 'Supervisor' : roleOption.charAt(0).toUpperCase() + roleOption.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </TableCell>
                <TableCell className="px-3 py-2 text-center">
                  <div className="flex items-center justify-center space-x-2">
                    <Switch
                      checked={userRow.isApproved}
                      onCheckedChange={() => handleApprovalChange(userRow.uid, userRow.isApproved)}
                      disabled={disableActions || updatingUsers[userRow.uid]?.approval}
                      aria-label={`Toggle approval for ${userRow.name}`}
                      className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-destructive/30"
                    />
                     {updatingUsers[userRow.uid]?.approval && !isDeletingUser && <Loader2 className="h-4 w-4 animate-spin" />}
                    <Badge variant={userRow.isApproved ? "secondary" : "outline"} className={cn("text-xs", userRow.isApproved ? "border-green-600/50 text-green-700 bg-green-500/10" : "border-destructive/50 text-destructive bg-destructive/10")}>
                      {isUserInRowAdmin ? "Approved" : userRow.isApproved ? "Approved" : "Pending"}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="px-3 py-2 text-center">
                  <div className="flex items-center justify-center space-x-0.5">
                      {isUserInRowAdmin ? (
                          <Tooltip>
                              <TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 cursor-not-allowed opacity-70"><UserCog className="h-4 w-4 text-primary" /></Button></TooltipTrigger>
                              <TooltipContent><p>Main Admin User (Cannot be modified here)</p></TooltipContent>
                          </Tooltip>
                      ) : isCurrentUserTheUserInRow ? (
                          <Tooltip>
                              <TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 cursor-not-allowed opacity-70"><Edit className="h-4 w-4 text-blue-600" /></Button></TooltipTrigger>
                              <TooltipContent><p>This is you (Cannot be modified here)</p></TooltipContent>
                          </Tooltip>
                      ) : (
                          <Tooltip>
                          <TooltipTrigger asChild>
                              <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive/90 hover:bg-destructive/10 h-8 w-8"
                              onClick={() => handleDeleteUserClick(userRow)}
                              disabled={updatingUsers[userRow.uid]?.approval || updatingUsers[userRow.uid]?.role || isDeletingUser || selectedUserUids.includes(userRow.uid)}
                              aria-label={`Remove user profile ${userRow.name}`}
                              >
                              {isDeletingUser && userToDelete?.uid === userRow.uid ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                              </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Remove User Profile</p></TooltipContent>
                          </Tooltip>
                      )}
                  </div>
                </TableCell>
              </TableRow>
            )})}
          </TableBody>
           {sortedUsers.length === 0 && (
            <TableCaption className="py-10 text-lg">
                <div className="flex flex-col items-center justify-center gap-2">
                    <Image src="https://placehold.co/100x100/F0F2F5/3F51B5.png?text=No+Users" width={80} height={80} alt="No users" data-ai-hint="empty illustration" className="opacity-60 rounded-md"/>
                    No users found.
                </div>
            </TableCaption>
           )}
        </Table>
      </div>

      {userToDelete && (
        <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm User Removal</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove the user profile for <strong>{userToDelete.name || userToDelete.email}</strong>?
                This action is permanent and cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setUserToDelete(null)} disabled={isDeletingUser}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteUser}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                disabled={isDeletingUser}
              >
                {isDeletingUser ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Remove Profile"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {showBatchDeleteConfirm && (
        <AlertDialog open={showBatchDeleteConfirm} onOpenChange={setShowBatchDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Batch Removal</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove the {selectedUserUids.length} selected user profile(s)? 
                This action is permanent and cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowBatchDeleteConfirm(false)} disabled={isBatchDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmBatchDelete}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                disabled={isBatchDeleting}
              >
                {isBatchDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : `Remove ${selectedUserUids.length} User(s)`}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </TooltipProvider>
  );
}
