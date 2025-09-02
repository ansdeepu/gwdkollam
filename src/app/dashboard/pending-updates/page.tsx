
// src/app/dashboard/pending-updates/page.tsx
"use client";

import PendingUpdatesTable from "@/components/admin/PendingUpdatesTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, ShieldAlert } from "lucide-react";
import { usePageHeader } from "@/hooks/usePageHeader";
import { useEffect } from "react";

export default function PendingUpdatesPage() {
  const { setHeader } = usePageHeader();
  useEffect(() => {
    setHeader('Pending Supervisor Updates', 'Review and approve or reject site updates submitted by supervisors to finalize the changes.');
  }, [setHeader]);

  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (user?.role !== 'editor') {
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
        <CardContent className="pt-6">
          <PendingUpdatesTable />
        </CardContent>
      </Card>
    </div>
  );
}
