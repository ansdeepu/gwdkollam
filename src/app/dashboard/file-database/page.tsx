
// src/app/dashboard/file-database/page.tsx
import FileDatabaseTable from "@/components/database/FileDatabaseTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database } from "lucide-react";

export default function FileDatabasePage() {
  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>All File Entries</CardTitle>
          <CardDescription>Browse, view, edit, or delete submitted file entries.</CardDescription>
        </CardHeader>
        <CardContent>
          <FileDatabaseTable />
        </CardContent>
      </Card>
    </div>
  );
}

    