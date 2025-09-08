
// src/app/dashboard/profile/page.tsx
"use client";

import { useAuth, type UserProfile } from "@/hooks/useAuth";
import { useStaffMembers } from "@/hooks/useStaffMembers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, UserCircle, ShieldCheck, KeyRound, Briefcase } from "lucide-react";
import UpdatePasswordForm from "@/components/auth/UpdatePasswordForm";
import { Badge } from "@/components/ui/badge";
import { usePageHeader } from "@/hooks/usePageHeader";
import { useEffect, useMemo } from "react";

export const dynamic = 'force-dynamic';

const getInitials = (name?: string, email?: string | null) => {
    if (name) {
      const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
      if (initials) return initials;
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return 'U';
};


export default function ProfilePage() {
  const { setHeader } = usePageHeader();
  useEffect(() => {
    setHeader('My Profile', 'View your account details and manage your password.');
  }, [setHeader]);

  const { user, isLoading: authLoading } = useAuth();
  const { staffMembers, isLoading: staffLoading } = useStaffMembers();

  // Find the full staff member record based on the user's staffId
  const staffInfo = useMemo(() => {
    if (user?.staffId) {
      return staffMembers.find(s => s.id === user.staffId);
    }
    return null;
  }, [user, staffMembers]);

  // Prioritize staff photo, but fall back to the user's own photoUrl if it exists.
  const photoUrl = staffInfo?.photoUrl || user?.photoUrl || undefined;
  const designation = staffInfo?.designation || user?.designation || 'N/A';
  
  if (authLoading || staffLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
       <div className="flex h-full w-full items-center justify-center">
        <p className="text-muted-foreground">User not found. Please log in again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card>
            <CardHeader className="items-center text-center">
              <Avatar className="h-24 w-24 mb-4">
                <AvatarImage src={photoUrl || undefined} alt={user.name || 'User'} data-ai-hint="person user" />
                <AvatarFallback className="text-3xl">{getInitials(user.name, user.email)}</AvatarFallback>
              </Avatar>
              <CardTitle className="text-2xl">{user.name || 'User'}</CardTitle>
              <CardDescription>{user.email}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm space-y-3 text-center">
                <div className="flex items-center justify-center space-x-2">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    <span className="font-medium">Role:</span>
                    <Badge variant={user.role === 'editor' ? 'default' : 'secondary'}>{user.role.charAt(0).toUpperCase() + user.role.slice(1)}</Badge>
                </div>
                 {designation !== 'N/A' && (
                    <div className="flex items-center justify-center space-x-2">
                        <Briefcase className="h-5 w-5 text-primary" />
                        <span className="font-medium">Designation:</span>
                        <span className="text-foreground">{designation}</span>
                    </div>
                )}
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
            <Card>
                <CardHeader>
                    <div className="flex items-center space-x-3">
                         <KeyRound className="h-6 w-6 text-primary" />
                        <CardTitle>Change Password</CardTitle>
                    </div>
                    <CardDescription>
                        Enter your current password and a new password to update your login credentials.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <UpdatePasswordForm />
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
