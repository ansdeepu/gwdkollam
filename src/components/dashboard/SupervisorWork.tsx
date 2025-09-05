// src/components/dashboard/SupervisorWork.tsx
"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users } from "lucide-react";
import type { DataEntryFormData, SitePurpose, StaffMember } from '@/lib/schemas';
import { sitePurposeOptions } from '@/lib/schemas';
import type { UserProfile } from '@/hooks/useAuth';

interface SupervisorWorkProps {
  allFileEntries: DataEntryFormData[];
  allUsers: UserProfile[];
  staffMembers: StaffMember[];
  onOpenDialog: (data: any[], title: string, columns: any[], type: 'month') => void;
}

export default function SupervisorWork({ allFileEntries, allUsers, staffMembers, onOpenDialog }: SupervisorWorkProps) {
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string | undefined>(undefined);

  const supervisorList = useMemo(() => {
    return allUsers
        .filter(u => u.role === 'supervisor' && u.isApproved && u.staffId)
        .map(u => {
            const staffInfo = staffMembers.find(s => s.id === u.staffId);
            return { uid: u.uid, name: staffInfo?.name || u.name || u.email || "" };
        })
        .sort((a,b) => a.name.localeCompare(b.name));
  }, [allUsers, staffMembers]);

  const supervisorOngoingWorks = useMemo(() => {
    const byPurpose = sitePurposeOptions.reduce((acc, p) => ({ ...acc, [p]: 0 }), {} as Record<SitePurpose, number>);
    if (!selectedSupervisorId) return { works: [], byPurpose, totalCount: 0 };
    
    const ongoingWorkStatuses = ["Work Order Issued", "Work in Progress", "Awaiting Dept. Rig"];
    let works: Array<{ fileNo: string; applicantName: string; siteName: string; workStatus: string; purpose?: SitePurpose; supervisorName?: string | null }> = [];

    for (const entry of allFileEntries) {
        entry.siteDetails?.forEach(site => {
            if (site.supervisorUid === selectedSupervisorId && site.workStatus && ongoingWorkStatuses.includes(site.workStatus)) {
                works.push({
                    fileNo: entry.fileNo || 'N/A', applicantName: entry.applicantName || 'N/A',
                    siteName: site.nameOfSite || 'Unnamed Site', workStatus: site.workStatus,
                    purpose: site.purpose, supervisorName: site.supervisorName,
                });
                if(site.purpose && (sitePurposeOptions.includes(site.purpose as SitePurpose))) {
                    byPurpose[site.purpose as SitePurpose]++;
                }
            }
        });
    }
    return { works, byPurpose, totalCount: works.length };
  }, [selectedSupervisorId, allFileEntries]);

  const handleSupervisorWorkClick = (purpose: string) => {
    if (!supervisorOngoingWorks || supervisorOngoingWorks.totalCount === 0) return;
  
    const filteredWorks = supervisorOngoingWorks.works.filter(work => work.purpose === purpose);
    const columns = [
      { key: 'slNo', label: 'Sl. No.' }, { key: 'fileNo', label: 'File No.' },
      { key: 'applicantName', label: 'Applicant Name' }, { key: 'siteName', label: 'Site Name' },
      { key: 'workStatus', label: 'Work Status' },
    ];
    const dataWithSlNo = filteredWorks.map((work, index) => ({ slNo: index + 1, ...work }));
  
    const selectedSupervisorName = supervisorList.find(s => s.uid === selectedSupervisorId)?.name || "Selected Supervisor";
    onOpenDialog(dataWithSlNo, `Ongoing '${purpose}' Works for ${selectedSupervisorName}`, columns, 'month');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" />Supervisor's Ongoing Work</CardTitle>
        <CardDescription>Select a Supervisor to view their assigned ongoing projects by category.</CardDescription>
      </CardHeader>
      <CardContent className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Select onValueChange={setSelectedSupervisorId} value={selectedSupervisorId}>
            <SelectTrigger><SelectValue placeholder="Select a Supervisor" /></SelectTrigger>
            <SelectContent>
              {supervisorList.length > 0 ? (
                supervisorList.map(s => <SelectItem key={s.uid} value={s.uid}>{s.name}</SelectItem>)
              ) : (<p className="p-2 text-sm text-muted-foreground">No Supervisors available</p>)}
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2">
          {selectedSupervisorId ? (
            supervisorOngoingWorks.totalCount > 0 ? (
              <Table>
                <TableHeader><TableRow><TableHead>Category</TableHead><TableHead className="text-right">Count</TableHead></TableRow></TableHeader>
                <TableBody>
                  {sitePurposeOptions.filter(p => supervisorOngoingWorks.byPurpose[p] > 0).map(p => (
                    <TableRow key={p}>
                      <TableCell className="font-medium">{p}</TableCell>
                      <TableCell className="text-right"><Button variant="link" className="p-0 h-auto" onClick={() => handleSupervisorWorkClick(p)}>{supervisorOngoingWorks.byPurpose[p]}</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (<p className="text-muted-foreground italic mt-2">No ongoing works found for this supervisor.</p>)
          ) : (<p className="text-muted-foreground italic mt-2">Please select a Supervisor to see their work.</p>)}
        </div>
      </CardContent>
    </Card>
  );
}
