// src/app/dashboard/page.tsx
"use client"; 

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useFileEntries } from "@/hooks/useFileEntries";
import { useStaffMembers } from "@/hooks/useStaffMembers"; 
import { useAgencyApplications } from '@/hooks/useAgencyApplications';
import { Loader2 } from 'lucide-react';
import { useAuth, type UserProfile } from '@/hooks/useAuth';
import { useAllFileEntriesForReports } from '@/hooks/useAllFileEntriesForReports';
import { usePageHeader } from '@/hooks/usePageHeader';
import type { SiteDetailFormData, SiteWorkStatus, SitePurpose, AgencyApplication, RigRegistration, DataEntryFormData } from '@/lib/schemas';
import { format, addYears } from 'date-fns';
import FileStatusOverview from '@/components/dashboard/FileStatusOverview';
import NoticeBoard from '@/components/dashboard/NoticeBoard';
import ImportantUpdates from '@/components/dashboard/ImportantUpdates';
import WorkStatusByService from '@/components/dashboard/WorkStatusByService';
import ArsStatusOverview from '@/components/dashboard/ArsStatusOverview';
import RigRegistrationOverview from '@/components/dashboard/RigRegistrationOverview';
import WorkProgress from '@/components/dashboard/WorkProgress';
import UserActivity from '@/components/dashboard/UserActivity';
import SupervisorWork from '@/components/dashboard/SupervisorWork';
import DashboardDialogs from '@/components/dashboard/DashboardDialogs';
import FinanceOverview from '@/components/dashboard/FinanceOverview';

const safeParseDate = (dateValue: any): Date | null => {
  if (!dateValue) return null;
  if (dateValue instanceof Date) return dateValue;
  if (typeof dateValue === 'object' && dateValue !== null && typeof (dateValue as any).seconds === 'number') {
    return new Date((dateValue as any).seconds * 1000);
  }
  if (typeof dateValue === 'string' || typeof dateValue === 'number') {
    const parsed = new Date(dateValue);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return null;
};

export default function DashboardPage() {
  const { setHeader } = usePageHeader();
  useEffect(() => {
    setHeader('Dashboard', 'A high-level overview of all departmental activities and key metrics.');
  }, [setHeader]);

  const { fileEntries: filteredFileEntries, isLoading: filteredEntriesLoading } = useFileEntries();
  const { reportEntries: allFileEntries, isReportLoading } = useAllFileEntriesForReports();
  const { staffMembers, isLoading: staffLoading } = useStaffMembers();
  const { user: currentUser, isLoading: authLoading, fetchAllUsers } = useAuth();
  const { applications: agencyApplications, isLoading: agenciesLoading } = useAgencyApplications();
  
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [usersLoading, setUsersLoading] = useState<boolean>(true);

  const [dialogState, setDialogState] = useState({
    isOpen: false,
    title: "",
    data: [] as any[],
    columns: [] as { key: string; label: string; isNumeric?: boolean; }[],
    type: 'detail' as 'detail' | 'rig' | 'age' | 'month' | 'fileStatus' | 'finance'
  });
  const [financeDates, setFinanceDates] = useState<{ start?: Date, end?: Date }>({});
  const [arsDates, setArsDates] = useState<{ start?: Date, end?: Date }>({});

  useEffect(() => {
    if (!authLoading && currentUser) {
      if (currentUser.role === 'editor' || currentUser.role === 'viewer') {
        setUsersLoading(true);
        fetchAllUsers()
          .then(users => {
            setAllUsers(users);
          })
          .catch(error => console.error("Error fetching users for dashboard:", error))
          .finally(() => setUsersLoading(false));
      } else {
        setUsersLoading(false);
      }
    }
  }, [authLoading, currentUser, fetchAllUsers]);

  const dashboardData = useMemo(() => {
    if (filteredEntriesLoading || isReportLoading || staffLoading || !currentUser) return null;
    
    const nonArsEntries = (currentUser.role === 'supervisor' ? filteredFileEntries : allFileEntries)
        .map(entry => ({
            ...entry,
            siteDetails: entry.siteDetails?.filter(site => site.purpose !== 'ARS' && !site.isArsImport)
        }))
        .filter(entry => entry.siteDetails && entry.siteDetails.length > 0);

    return {
        nonArsEntries: nonArsEntries,
        allFileEntries: allFileEntries,
        staffMembers: staffMembers
    };
  }, [filteredEntriesLoading, isReportLoading, staffLoading, currentUser, filteredFileEntries, allFileEntries, staffMembers]);

  const rigRegistrationData = useMemo(() => {
    if (agenciesLoading) return null;

    const allRigs: (RigRegistration & {agencyName: string, ownerName: string})[] = [];
    const activeRigs: (RigRegistration & {agencyName: string, ownerName: string})[] = [];
    const expiredRigs: (RigRegistration & {agencyName: string, ownerName: string})[] = [];

    agencyApplications.forEach(app => {
        (app.rigs || []).forEach(rig => {
            const rigWithContext = { ...rig, agencyName: app.agencyName, ownerName: app.owner.name };
            allRigs.push(rigWithContext);

            if (rig.status === 'Active') {
                activeRigs.push(rigWithContext);
                
                const lastEffectiveDate = rig.renewals && rig.renewals.length > 0
                    ? [...rig.renewals].sort((a, b) => new Date(b.renewalDate).getTime() - new Date(a.renewalDate).getTime())[0].renewalDate
                    : rig.registrationDate;

                if (lastEffectiveDate) {
                    const validityDate = addYears(new Date(lastEffectiveDate), 1);
                    if (new Date() > validityDate) {
                        expiredRigs.push(rigWithContext);
                    }
                }
            }
        });
    });

    return {
        totalAgencies: agencyApplications.length,
        totalRigs: allRigs.length,
        activeRigs: activeRigs.length,
        expiredRigs: expiredRigs.length,
        allAgenciesData: agencyApplications,
        allRigsData: allRigs,
        activeRigsData: activeRigs,
        expiredRigsData: expiredRigs,
    };
  }, [agencyApplications, agenciesLoading]);

  const handleOpenDialog = useCallback((
    data: any[],
    title: string,
    columns: { key: string; label: string; isNumeric?: boolean; }[],
    type: 'detail' | 'rig' | 'age' | 'month' | 'fileStatus' | 'finance'
  ) => {
    setDialogState({ isOpen: true, data, title, columns, type });
  }, []);

  const handleOpenRigDialog = useCallback((
    data: (AgencyApplication | (RigRegistration & {agencyName: string, ownerName: string}))[], 
    title: string
  ) => {
    if (data.length === 0) return;

    let columns: { key: string; label: string; isNumeric?: boolean; }[] = [];
    let dialogData: Record<string, any>[] = [];

    if (title === 'Total Agencies') {
        columns = [
            { key: 'slNo', label: 'Sl. No.' }, { key: 'agencyName', label: 'Agency Name' },
            { key: 'ownerName', label: 'Owner Name' }, { key: 'fileNo', label: 'File No.' }, { key: 'status', label: 'Status' },
        ];
        dialogData = (data as AgencyApplication[]).map((app, index) => ({
            slNo: index + 1, agencyName: app.agencyName, ownerName: app.owner.name,
            fileNo: app.fileNo || 'N/A', status: app.status,
        }));
    } else {
        columns = [
            { key: 'slNo', label: 'Sl. No.' }, { key: 'rigRegistrationNo', label: 'Rig Reg. No.' },
            { key: 'agencyName', label: 'Agency Name' }, { key: 'ownerName', label: 'Owner' },
            { key: 'typeOfRig', label: 'Type' }, { key: 'status', label: 'Status' },
            { key: 'validity', label: 'Validity Date' },
        ];
        dialogData = (data as (RigRegistration & {agencyName: string, ownerName: string})[]).map((rig, index) => {
             const lastEffectiveDate = rig.renewals && rig.renewals.length > 0
                    ? [...rig.renewals].sort((a, b) => new Date(b.renewalDate).getTime() - new Date(a.renewalDate).getTime())[0].renewalDate
                    : rig.registrationDate;

            const validityDate = lastEffectiveDate ? addYears(new Date(lastEffectiveDate), 1) : null;
            return {
                slNo: index + 1, rigRegistrationNo: rig.rigRegistrationNo || 'N/A',
                agencyName: rig.agencyName, ownerName: rig.ownerName, typeOfRig: rig.typeOfRig || 'N/A',
                status: rig.status, validity: validityDate ? format(validityDate, 'dd/MM/yyyy') : 'N/A'
            };
        });
    }

    setDialogState({ isOpen: true, data: dialogData, title, columns, type: 'rig' });
  }, []);

  const isPageLoading = authLoading || usersLoading || isReportLoading || agenciesLoading || filteredEntriesLoading || !dashboardData;
  
  if (isPageLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <FileStatusOverview 
            nonArsEntries={dashboardData.nonArsEntries}
            onOpenDialog={handleOpenDialog}
          />
        </div>
        <div className="lg:col-span-1">
          <ImportantUpdates
            allFileEntries={dashboardData.allFileEntries}
          />
        </div>
        <div className="lg:col-span-1">
          <NoticeBoard 
            staffMembers={dashboardData.staffMembers}
          />
        </div>
      </div>
      
      <WorkStatusByService 
        allFileEntries={currentUser?.role === 'supervisor' ? filteredFileEntries : allFileEntries}
        onOpenDialog={handleOpenDialog}
        currentUserRole={currentUser?.role}
      />

      <FinanceOverview 
        allFileEntries={allFileEntries}
        onOpenDialog={handleOpenDialog}
        dates={financeDates}
        onSetDates={setFinanceDates}
      />
      
      <ArsStatusOverview 
        allFileEntries={allFileEntries}
        onOpenDialog={handleOpenDialog}
        dates={arsDates}
        onSetDates={setArsDates}
      />
      
      {rigRegistrationData && (
        <RigRegistrationOverview 
          data={rigRegistrationData}
          onCardClick={handleOpenRigDialog}
        />
      )}
      
      <WorkProgress
        allFileEntries={allFileEntries}
        onOpenDialog={handleOpenDialog}
        currentUser={currentUser}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <UserActivity 
            allUsers={allUsers}
            staffMembers={staffMembers}
          />
          <SupervisorWork 
            allFileEntries={allFileEntries}
            allUsers={allUsers}
            staffMembers={staffMembers}
            onOpenDialog={handleOpenDialog}
          />
      </div>

      <DashboardDialogs 
        dialogState={dialogState}
        setDialogState={setDialogState}
        allFileEntries={allFileEntries}
        financeDates={financeDates}
      />
    </div>
  );
}
