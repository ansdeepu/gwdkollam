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
import type { SiteDetailFormData, SiteWorkStatus, SitePurpose, AgencyApplication, RigRegistration, DataEntryFormData, RigType } from '@/lib/schemas';
import { format, addYears, isValid, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';
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
import RigFinancialSummary from '@/components/dashboard/RigFinancialSummary';

export const dynamic = 'force-dynamic';

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
    
    let relevantEntries = currentUser.role === 'supervisor' ? filteredFileEntries : allFileEntries;
    
    // For supervisors, further filter to only include sites with specific ongoing statuses for relevant dashboard cards
    if (currentUser.role === 'supervisor') {
        const ongoingStatuses: SiteWorkStatus[] = ["Work Order Issued", "Work in Progress", "Work Initiated"];
        relevantEntries = relevantEntries.map(entry => {
            const ongoingSites = entry.siteDetails?.filter(site => {
                return site.supervisorUid === currentUser.uid && site.workStatus && ongoingStatuses.includes(site.workStatus as SiteWorkStatus);
            });
            return { ...entry, siteDetails: ongoingSites };
        }).filter(entry => entry.siteDetails && entry.siteDetails.length > 0);
    }
    
    const nonArsEntries = relevantEntries
        .map(entry => ({
            ...entry,
            siteDetails: entry.siteDetails?.filter(site => site.purpose !== 'ARS' && !site.isArsImport)
        }))
        .filter(entry => entry.siteDetails && entry.siteDetails.length > 0);

    return {
        nonArsEntries: nonArsEntries,
        allFileEntriesForSupervisor: relevantEntries,
        allFileEntries: allFileEntries, // Keep the full list for admin/viewer overviews
        staffMembers: staffMembers
    };
  }, [filteredEntriesLoading, isReportLoading, staffLoading, currentUser, filteredFileEntries, allFileEntries, staffMembers]);

  const handleOpenDialog = useCallback((
    data: any[],
    title: string,
    columns: { key: string; label: string; isNumeric?: boolean; }[],
    type: 'detail' | 'rig' | 'age' | 'month' | 'fileStatus' | 'finance' = 'detail'
  ) => {
    setDialogState({ isOpen: true, data, title, columns, type });
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ImportantUpdates allFileEntries={currentUser?.role === 'supervisor' ? dashboardData.allFileEntriesForSupervisor : dashboardData.allFileEntries} />
        <NoticeBoard staffMembers={dashboardData.staffMembers} />
      </div>

      <FileStatusOverview 
          nonArsEntries={dashboardData.nonArsEntries}
          onOpenDialog={handleOpenDialog}
      />
      
      <WorkStatusByService 
        allFileEntries={currentUser?.role === 'supervisor' ? dashboardData.allFileEntriesForSupervisor : dashboardData.allFileEntries}
        onOpenDialog={handleOpenDialog}
        currentUserRole={currentUser?.role}
      />
      
      {currentUser?.role !== 'supervisor' && (
        <>
          <FinanceOverview 
            allFileEntries={dashboardData.allFileEntries}
            onOpenDialog={handleOpenDialog}
            dates={financeDates}
            onSetDates={setFinanceDates}
          />
          
          <ArsStatusOverview 
            onOpenDialog={handleOpenDialog}
            dates={arsDates}
            onSetDates={setArsDates}
          />
          
          <RigRegistrationOverview 
            agencyApplications={agencyApplications}
            onOpenDialog={handleOpenDialog}
          />
           
           <RigFinancialSummary 
            applications={agencyApplications}
            onOpenDialog={handleOpenDialog}
          />
        </>
      )}
      
      <WorkProgress
        allFileEntries={currentUser?.role === 'supervisor' ? filteredFileEntries : dashboardData.allFileEntries}
        onOpenDialog={handleOpenDialog}
        currentUser={currentUser}
      />

      {currentUser?.role !== 'supervisor' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SupervisorWork 
            allFileEntries={dashboardData.allFileEntries}
            allUsers={allUsers}
            staffMembers={staffMembers}
            onOpenDialog={handleOpenDialog}
          />
          <UserActivity 
            allUsers={allUsers}
            staffMembers={staffMembers}
          />
        </div>
      )}

      <DashboardDialogs 
        dialogState={dialogState}
        setDialogState={setDialogState}
        allFileEntries={dashboardData.allFileEntries}
        financeDates={financeDates}
      />
    </div>
  );
}
