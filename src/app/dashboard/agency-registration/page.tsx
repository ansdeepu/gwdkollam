// src/app/dashboard/agency-registration/page.tsx
"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useAgencyApplications, type AgencyApplication } from "@/hooks/useAgencyApplications";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2, Search, PlusCircle, Save, X, FileUp, Download, Eye, Edit, Trash2, ShieldAlert, CalendarIcon, ClipboardList } from "lucide-react";
import { format, isValid, parse, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import PaginationControls from "@/components/shared/PaginationControls";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import Link from 'next/link';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { agencyApplicationStatusOptions } from "@/lib/schemas";


const ITEMS_PER_PAGE = 50;

const formatDateSafe = (dateInput: any): string => {
  if (!dateInput) return 'N/A';
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  return date instanceof Date && !isNaN(date.getTime()) ? format(date, 'dd/MM/yyyy') : 'N/A';
};

export default function AgencyRegistrationPage() {
  const { applications, isLoading: applicationsLoading, updateApplication, deleteApplication } = useAgencyApplications();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingApplication, setEditingApplication] = useState<AgencyApplication | null>(null);

  const canManage = user?.role === 'editor';

  const filteredApplications = useMemo(() => {
    let apps = [...applications];

    if (statusFilter !== "all") {
      apps = apps.filter(app => app.status === statusFilter);
    }
    
    const lowercasedFilter = searchTerm.toLowerCase();
    if (lowercasedFilter) {
      apps = apps.filter(app => 
        (app.agencyName.toLowerCase().includes(lowercasedFilter)) ||
        (app.ownerName.toLowerCase().includes(lowercasedFilter)) ||
        (app.email.toLowerCase().includes(lowercasedFilter)) ||
        (app.phone.includes(lowercasedFilter)) ||
        (app.id.toLowerCase().includes(lowercasedFilter)) ||
        (app.rigDetails.some(rig => rig.registrationNumber.toLowerCase().includes(lowercasedFilter)))
      );
    }
    
    return apps;
  }, [applications, searchTerm, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);
  
  const paginatedApplications = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredApplications.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredApplications, currentPage]);
  
  const totalPages = Math.ceil(filteredApplications.length / ITEMS_PER_PAGE);
  
  const handleExportExcel = useCallback(() => {
    if (filteredApplications.length === 0) {
      toast({ title: "No Data", description: "There is no data to export." });
      return;
    }
    const reportTitle = "Agency & Rig Registrations Report";
    const sheetName = "Rig Registration";
    const fileNamePrefix = "gwd_agency_registration_report";
    
    const dataForExport = filteredApplications.map((app, index) => ({
      "Sl. No.": index + 1,
      "Application ID": app.id,
      "Agency Name": app.agencyName,
      "Owner Name": app.ownerName,
      "Address": app.address,
      "Phone": app.phone,
      "Email": app.email,
      "Status": app.status,
      "Registration Valid Till": formatDateSafe(app.registrationValidTill),
      "Rig Details": app.rigDetails.map(r => `${r.type} (${r.registrationNumber})`).join('; '),
      "Created At": formatDateSafe(app.createdAt),
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet([]);
    
    const headerRows = [
      ["Ground Water Department, Kollam"],
      [reportTitle],
      [`Report generated on: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`],
      [],
    ];
    
    XLSX.utils.sheet_add_aoa(ws, headerRows, { origin: 'A1' });
    XLSX.utils.sheet_add_json(ws, dataForExport, { origin: 'A5', skipHeader: false });
    
    const numCols = Object.keys(dataForExport[0] || {}).length;
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: numCols - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: numCols - 1 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: numCols - 1 } },
    ];
    ws['!cols'] = Object.keys(dataForExport[0] || {}).map(key => ({
      wch: Math.max(key.length, ...dataForExport.map(row => String(row[key as keyof typeof row] ?? '').length)) + 2,
    }));
    
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    const uniqueFileName = `${fileNamePrefix}_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
    XLSX.writeFile(wb, uniqueFileName);
    toast({ title: "Excel Exported", description: `Report downloaded as ${uniqueFileName}.` });
  }, [filteredApplications, toast]);
  
  const handleUpdateStatus = async (app: AgencyApplication, newStatus: AgencyApplication['status']) => {
    setIsProcessing(true);
    let validTill: Date | null = app.registrationValidTill;
    if (newStatus === 'Approved' && !validTill) {
        const today = new Date();
        validTill = new Date(today.setFullYear(today.getFullYear() + 1));
    }
    
    try {
        await updateApplication(app.id, { status: newStatus, registrationValidTill: validTill });
        toast({ title: "Status Updated", description: `Status for ${app.agencyName} set to ${newStatus}.`});
    } catch(e: any) {
        toast({ title: "Update Failed", description: e.message, variant: "destructive" });
    } finally {
        setIsProcessing(false);
    }
  };

  const handleDelete = async (appId: string) => {
    setIsProcessing(true);
    try {
        await deleteApplication(appId);
        toast({ title: "Application Deleted", description: "The application has been removed."});
    } catch(e: any) {
        toast({ title: "Deletion Failed", description: e.message, variant: "destructive" });
    } finally {
        setIsProcessing(false);
    }
  };

  if (applicationsLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading registration data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" />
            Agency & Rig Registrations ({applications.length})
          </CardTitle>
          <CardDescription>
            Manage new registrations and renewals for agencies and their rigs.
          </CardDescription>
          <div className="flex flex-col gap-4 pt-4 border-t mt-4">
            <div className="flex flex-wrap items-center gap-2 pt-4">
                <div className="relative flex-grow min-w-[250px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input type="search" placeholder="Search by agency, owner, email, rig..." className="w-full rounded-lg bg-background pl-10 shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {agencyApplicationStatusOptions.map(status => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                 <Button variant="outline" onClick={handleExportExcel} className="w-full sm:w-auto">
                    <FileDown className="mr-2 h-4 w-4" /> Export Excel
                </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agency Name</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Valid Till</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedApplications.length > 0 ? (
                paginatedApplications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium">{app.agencyName}</TableCell>
                    <TableCell>{app.ownerName}</TableCell>
                    <TableCell>
                      <div className="text-sm">{app.phone}</div>
                      <div className="text-xs text-muted-foreground">{app.email}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={app.status === 'Approved' ? 'default' : 'secondary'}>{app.status}</Badge>
                    </TableCell>
                    <TableCell>{formatDateSafe(app.registrationValidTill)}</TableCell>
                    <TableCell className="text-center">
                        <Button variant="ghost" size="icon" onClick={() => setEditingApplication(app)} disabled={!canManage}>
                            <Edit className="h-4 w-4"/>
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/90" onClick={() => handleDelete(app.id)} disabled={!canManage}>
                            <Trash2 className="h-4 w-4"/>
                        </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No applications found {searchTerm || statusFilter !== 'all' ? "matching your criteria" : ""}.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        {totalPages > 1 && (
          <div className="p-4 border-t flex items-center justify-center">
            <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>
        )}
      </Card>
      
       <Dialog open={!!editingApplication} onOpenChange={() => setEditingApplication(null)}>
        <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
                <DialogTitle>Manage Application: {editingApplication?.agencyName}</DialogTitle>
                <DialogDescription>Review details and update the application status.</DialogDescription>
            </DialogHeader>
            {editingApplication && (
                 <div className="space-y-4 py-4 text-sm">
                    <p><strong>Owner:</strong> {editingApplication.ownerName}</p>
                    <p><strong>Address:</strong> {editingApplication.address}</p>
                    <p><strong>Phone:</strong> {editingApplication.phone}</p>
                    <p><strong>Email:</strong> {editingApplication.email}</p>
                    <p><strong>Current Status:</strong> <Badge variant="outline">{editingApplication.status}</Badge></p>
                    <p><strong>Valid Till:</strong> {formatDateSafe(editingApplication.registrationValidTill)}</p>
                    <div className="pt-2">
                        <h4 className="font-semibold">Rig Details:</h4>
                        <ul className="list-disc pl-5">
                            {editingApplication.rigDetails.map((rig, i) => <li key={i}>{rig.type} - {rig.registrationNumber}</li>)}
                        </ul>
                    </div>
                </div>
            )}
            <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                <Button onClick={() => editingApplication && handleUpdateStatus(editingApplication, 'Rejected')} variant="destructive" disabled={isProcessing}>Reject</Button>
                <Button onClick={() => editingApplication && handleUpdateStatus(editingApplication, 'Approved')} disabled={isProcessing}>
                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Approve"}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
