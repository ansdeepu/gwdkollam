// src/app/dashboard/profile/page.tsx
"use client";

import UpdatePasswordForm from "@/components/auth/UpdatePasswordForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCog } from "lucide-react";

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <UserCog className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          User Profile
        </h1>
      </div>
      <p className="text-muted-foreground">
        Manage your account settings and update your password here.
      </p>

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
