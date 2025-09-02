
// src/app/dashboard/file-database/page.tsx
import FileDatabaseTable from "@/components/database/FileDatabaseTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database } from "lucide-react";

export default function FileDatabasePage() {
  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-10 -mx-6 -mt-6 mb-4 bg-background/80 p-6 backdrop-blur-md border-b">
        <h1 className="text-3xl font-bold tracking-tight">All File Entries</h1>
        <p className="text-muted-foreground">Browse, view, edit, or delete submitted file entries.</p>
      </div>
      <Card className="shadow-lg">
        <CardContent className="pt-6">
          <FileDatabaseTable />
        </CardContent>
      </Card>
    </div>
  );
}
