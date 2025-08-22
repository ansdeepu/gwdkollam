
// src/app/dashboard/agency-registration/page.tsx
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, Loader2, ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function AgencyRegistrationPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !['editor', 'viewer'].includes(user.role)) {
    return (
      <div className="space-y-6 p-6 text-center">
        <ShieldAlert className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Access Denied</h1>
        <p className="text-muted-foreground">You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" />
            Agency & Rig Registrations
          </CardTitle>
          <CardDescription>
            Manage new registrations and renewals for agencies and their rigs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-10 text-center text-muted-foreground border-2 border-dashed rounded-lg">
            <p>Registration management table and forms will be implemented here.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
