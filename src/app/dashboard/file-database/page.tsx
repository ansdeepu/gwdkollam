
// src/app/dashboard/file-database/page.tsx
"use client";

import FileDatabaseTable from "@/components/database/FileDatabaseTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database } from "lucide-react";
import { usePageHeader } from "@/hooks/usePageHeader";
import { useEffect } from "react";

export default function FileDatabasePage() {
  const { setHeader } = usePageHeader();
  useEffect(() => {
    setHeader('All File Entries', 'Browse, view, edit, or delete submitted file entries.');
  }, [setHeader]);

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardContent className="pt-6">
          <FileDatabaseTable />
        </CardContent>
      </Card>
    </div>
  );
}
