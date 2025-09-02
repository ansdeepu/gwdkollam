
// src/app/dashboard/profile/page.tsx
"use client";

import { useAuth, type UserProfile } from "@/hooks/useAuth";
import { useStaffMembers } from "@/hooks/useStaffMembers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, UserCircle, ShieldCheck, KeyRound, Briefcase } from "lucide-react";
import UpdatePasswordForm from "@/components/auth/UpdatePasswordForm";
import { Badge } from "@/components/ui/badge";

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
  const { user, isLoading: authLoading } = useAuth();
  const { staffMembers, isLoading: staffLoading } = useStaffMembers();

  const staffInfo = staffMembers.find(s => s.id === user?.staffId);
  
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
      <div className="sticky top-0 z-10 -mx-6 -mt-6 mb-4 bg-background/80 p-6 backdrop-blur-md border-b">
        <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
        <p className="text-muted-foreground">View your account details and manage your password.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card>
            <CardHeader className="items-center text-center">
              <Avatar className="h-24 w-24 mb-4">
                <AvatarImage src={staffInfo?.photoUrl || undefined} alt={user.name || 'User'} data-ai-hint="person user" />
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
                 {user.designation && (
                    <div className="flex items-center justify-center space-x-2">
                        <Briefcase className="h-5 w-5 text-primary" />
                        <span className="font-medium">Designation:</span>
                        <span className="text-foreground">{user.designation}</span>
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
