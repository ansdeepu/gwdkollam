// src/app/dashboard/file-room/page.tsx
"use client";

import { useState } from 'react';
import FileDatabaseTable from "@/components/database/FileDatabaseTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderOpen, Search } from "lucide-react";
import { Input } from '@/components/ui/input';

export default function FileManagerPage() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <FolderOpen className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight text-foreground">File Manager</h1>
      </div>
      <p className="text-muted-foreground">
        Browse, view, edit, or delete files stored in the File Manager.
      </p>

      <div className="relative my-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search all fields by File No, Applicant, Site, Purpose, Status..."
          className="w-full rounded-lg bg-background pl-10 md:w-2/3 lg:w-1/2 shadow-sm text-base h-12 border-2 border-primary/20 focus-visible:ring-primary focus-visible:ring-offset-2"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Files in File Manager</CardTitle>
          <CardDescription>
            {searchTerm 
              ? `Filtered list of files matching "${searchTerm}"`
              : "List of all files in the File Manager."
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FileDatabaseTable searchTerm={searchTerm} />
        </CardContent>
      </Card>
    </div>
  );
}
