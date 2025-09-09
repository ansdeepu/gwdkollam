// src/app/dashboard/profile/page.tsx
"use client";

import { useAuth, type UserProfile } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, UserCircle, ShieldCheck, KeyRound, Briefcase } from "lucide-react";
import UpdatePasswordForm from "@/components/auth/UpdatePasswordForm";
import { Badge } from "@/components/ui/badge";
import { usePageHeader } from "@/hooks/usePageHeader";
import { useEffect } from "react";

export const dynamic = 'force-dynamic';

export default function ProfilePage() {
  const { setHeader } = usePageHeader();
  useEffect(() => {
    setHeader('My Profile', 'View your account details and manage your password.');
  }, [setHeader]);

  const { user, isLoading: authLoading } = useAuth();
  
  if (authLoading) {
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
               <UserCircle className="h-24 w-24 mb-4 text-primary/70" />
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
