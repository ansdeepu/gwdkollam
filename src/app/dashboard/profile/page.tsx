// src/app/dashboard/profile/page.tsx
"use client";

import UpdatePasswordForm from "@/components/auth/UpdatePasswordForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { User, UserCog, Loader2 } from "lucide-react";

export default function ProfilePage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <UserCog className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          User Profile
        </h1>
      </div>
      <p className="text-muted-foreground">
        View your account details and manage your settings.
      </p>

      {user && (
        <Card className="shadow-lg max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <User className="h-6 w-6" />
              Your Information
            </CardTitle>
            <CardDescription>
              This is your user information on the GWD Kollam dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-muted-foreground">Full Name</span>
              <p className="font-semibold text-foreground">{user.name || "Not set"}</p>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-muted-foreground">Email</span>
              <p className="font-semibold text-foreground">{user.email}</p>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-muted-foreground">User ID</span>
              <p className="font-mono text-xs text-muted-foreground">{user.uid}</p>
            </div>
             <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-muted-foreground">Role</span>
              <p className="font-semibold text-foreground capitalize">{user.role}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-lg max-w-2xl">
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>
            Enter your current password and a new password to update your credentials.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UpdatePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
