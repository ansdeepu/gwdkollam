// src/app/dashboard/file-database/page.tsx
import FileDatabaseTable from "@/components/database/FileDatabaseTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database } from "lucide-react";

export default function FileDatabasePage() {
  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Browse, view, edit, or delete submitted file entries.
      </p>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>All File Entries</CardTitle>
          <CardDescription>List of all recorded file data.</CardDescription>
        </CardHeader>
        <CardContent>
          <FileDatabaseTable />
        </CardContent>
      </Card>
    </div>
  );
}
