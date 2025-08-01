// src/app/dashboard/pending-updates/page.tsx
"use client";

import React from "react";
import PendingUpdatesTable from "@/components/admin/PendingUpdatesTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { Hourglass, ShieldAlert, Loader2 } from "lucide-react";

export default function PendingUpdatesPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading permissions...</p>
      </div>
    );
  }

  if (!user || user.role !== 'editor') {
    return (
      <div className="space-y-6 p-6 text-center">
        <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Access Denied</h1>
        <p className="text-muted-foreground">
          You do not have permission to access this page. This is for administrators only.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <Hourglass className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Pending Updates</h1>
      </div>
      <p className="text-muted-foreground max-w-2xl">
        Review and approve or reject site detail updates submitted by supervisors. 
        Approved changes will be merged with the main file data.
      </p>
      <Card className="shadow-xl border-border/60">
        <CardHeader>
          <CardTitle className="text-xl">Submissions Awaiting Review</CardTitle>
          <CardDescription>
            List of all pending updates from supervisors.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PendingUpdatesTable />
        </CardContent>
      </Card>
    </div>
  );
}
