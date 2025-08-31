// src/components/admin/UserManagementTable.tsx
"use client";

import React, { useState, useMemo } from 'react';
import { type UserProfile, type UserRole } from '@/hooks/useAuth';
import { type StaffMember } from '@/lib/schemas';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
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
import { MoreVertical, CheckCircle, XCircle, Trash2, Loader2, UserCog, UserX, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';

interface UserManagementTableProps {
  users: UserProfile[];
  isLoading: boolean;
  onDataChange: () => void;
  currentUser: UserProfile | null;
  updateUserApproval: (uid: string, isApproved: boolean) => Promise<void>;
  updateUserRole: (uid: string, role: UserRole) => Promise<void>;
  deleteUserDocument: (uid: string) => Promise<void>;
  batchDeleteUserDocuments: (uids: string[]) => Promise<{ successCount: number; failureCount: number; errors: string[] }>;
  staffMembers: StaffMember[];
}

export default function UserManagementTable({
  users,
  isLoading,
  onDataChange,
  currentUser,
  updateUserApproval,
  updateUserRole,
  deleteUserDocument,
  batchDeleteUserDocuments,
  staffMembers
}: UserManagementTableProps) {
  const { toast } = useToast();
  const [filter, setFilter] = useState('');
  const [selectedUids, setSelectedUids] = useState<string[]>([]);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const canManage = currentUser?.role === 'editor';
  const ADMIN_EMAIL = 'gwdklm@gmail.com';

  const filteredUsers = useMemo(() => {
    return users.filter(user =>
      (user.name?.toLowerCase().includes(filter.toLowerCase())) ||
      (user.email?.toLowerCase().includes(filter.toLowerCase())) ||
      (user.role.toLowerCase().includes(filter.toLowerCase()))
    );
  }, [users, filter]);
  
  const handleApprovalChange = async (uid: string, newStatus: boolean) => {
    try {
      await updateUserApproval(uid, newStatus);
      toast({ title: 'Success', description: 'User approval status updated.' });
      onDataChange();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleRoleChange = async (uid: string, newRole: UserRole) => {
    try {
      await updateUserRole(uid, newRole);
      toast({ title: 'Success', description: 'User role updated.' });
      onDataChange();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };
  
  const handleDelete = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      await deleteUserDocument(userToDelete.uid);
      toast({ title: 'User Deleted', description: `Account for ${userToDelete.email} has been deleted.`});
      onDataChange();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive'});
    } finally {
      setIsDeleting(false);
      setUserToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading users...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Input
        placeholder="Filter by name, email, or role..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="max-w-sm"
      />
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Last Active</TableHead>
              {canManage && <TableHead className="text-center">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => {
                 const staffInfo = staffMembers.find(s => s.id === user.staffId);
                 const isThisUserAdmin = user.email === ADMIN_EMAIL;
                return (
                <TableRow key={user.uid}>
                  <TableCell>
                    <div className="font-medium">{user.name}</div>
                    <div className="text-sm text-muted-foreground">{user.email}</div>
                    {staffInfo && <div className="text-xs text-blue-600 mt-1">Staff: {staffInfo.name} ({staffInfo.designation})</div>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'editor' ? 'default' : 'secondary'}>
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.isApproved ? (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">Approved</Badge>
                    ) : (
                      <Badge variant="destructive" className="bg-yellow-100 text-yellow-800">Pending</Badge>
                    )}
                  </TableCell>
                   <TableCell className="text-xs text-muted-foreground">
                    {user.createdAt ? format(user.createdAt, 'dd MMM yyyy') : 'N/A'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {user.lastActiveAt ? formatDistanceToNow(user.lastActiveAt, { addSuffix: true }) : 'Never'}
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-center">
                       <DropdownMenu>
                        <DropdownMenuTrigger asChild disabled={isThisUserAdmin}>
                          <Button variant="ghost" size="icon" disabled={isThisUserAdmin}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                           <DropdownMenuLabel>Manage User</DropdownMenuLabel>
                           <DropdownMenuSeparator />
                           {user.isApproved ? (
                            <DropdownMenuItem onClick={() => handleApprovalChange(user.uid, false)}>
                                <UserX className="mr-2 h-4 w-4" />
                                Revoke Approval
                            </DropdownMenuItem>
                           ) : (
                            <DropdownMenuItem onClick={() => handleApprovalChange(user.uid, true)}>
                                <UserCheck className="mr-2 h-4 w-4" />
                                Approve User
                            </DropdownMenuItem>
                           )}
                           <DropdownMenuSeparator />
                            <DropdownMenuLabel>Change Role</DropdownMenuLabel>
                            <DropdownMenuRadioGroup value={user.role} onValueChange={(value) => handleRoleChange(user.uid, value as UserRole)}>
                                <DropdownMenuRadioItem value="editor">Editor</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="supervisor">Supervisor</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="viewer">Viewer</DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                           <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => setUserToDelete(user)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              )})
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No users found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <AlertDialog open={!!userToDelete} onOpenChange={setUserToDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the user account for <strong>{userToDelete?.email}</strong>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
