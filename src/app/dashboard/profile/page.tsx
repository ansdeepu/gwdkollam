
// src/app/dashboard/profile/page.tsx
"use client";

import { useAuth } from "@/hooks/useAuth";
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

  const { user: authUser, isLoading: authLoading } = useAuth();
  const { staffMembers, isLoading: staffLoading } = useStaffMembers();

  const userProfile = useMemo(() => {
    if (!authUser || !authUser.staffId) return authUser;
    
    const staffInfo = staffMembers.find(s => s.id === authUser.staffId);
    if (staffInfo) {
      return {
        ...authUser,
        designation: staffInfo.designation,
        photoUrl: staffInfo.photoUrl,
      };
    }
    return authUser;
  }, [authUser, staffMembers]);

  const isLoading = authLoading || staffLoading;

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  if (!userProfile) {
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
                <AvatarImage src={userProfile.photoUrl || undefined} alt={userProfile.name || 'User'} data-ai-hint="person user" />
                <AvatarFallback className="text-3xl">{getInitials(userProfile.name, userProfile.email)}</AvatarFallback>
              </Avatar>
              <CardTitle className="text-2xl">{userProfile.name || 'User'}</CardTitle>
              <CardDescription>{userProfile.email}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm space-y-3 text-center">
                <div className="flex items-center justify-center space-x-2">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    <span className="font-medium">Role:</span>
                    <Badge variant={userProfile.role === 'editor' ? 'default' : 'secondary'}>{userProfile.role.charAt(0).toUpperCase() + userProfile.role.slice(1)}</Badge>
                </div>
                 {userProfile.designation && (
                    <div className="flex items-center justify-center space-x-2">
                        <Briefcase className="h-5 w-5 text-primary" />
                        <span className="font-medium">Designation:</span>
                        <span className="text-foreground">{userProfile.designation}</span>
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
