
// src/app/dashboard/page.tsx
"use client"; 

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useFileEntries } from "@/hooks/useFileEntries";
import { useStaffMembers } from "@/hooks/useStaffMembers"; 
import { useAgencyApplications } from '@/hooks/useAgencyApplications';
import { Loader2, ArrowUp } from 'lucide-react';
import { useAuth, type UserProfile } from '@/hooks/useAuth';
import { useAllFileEntriesForReports } from '@/hooks/useAllFileEntriesForReports';
import { usePageHeader } from '@/hooks/usePageHeader';
import type { SiteDetailFormData, SiteWorkStatus, SitePurpose, AgencyApplication, RigRegistration, DataEntryFormData, RigType, ApplicationType } from '@/lib/schemas';
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
import ConstituencyWiseOverview from '@/components/dashboard/ConstituencyWiseOverview';
import { useArsEntries } from '@/hooks/useArsEntries';
import { Button } from '@/components/ui/button';

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

const PRIVATE_APPLICATION_TYPES: ApplicationType[] = ["Private_Domestic", "Private_Irrigation", "Private_Institution", "Private_Industry"];

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
  const { arsEntries, isLoading: arsLoading } = useArsEntries();
  
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
  const [constituencyDates, setConstituencyDates] = useState<{ start?: Date, end?: Date }>({});
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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

    const constituencyWorks = useMemo(() => {
        const publicDepositWorks = allFileEntries
            .filter(entry => entry.applicationType && !PRIVATE_APPLICATION_TYPES.includes(entry.applicationType))
            .flatMap(entry => (entry.siteDetails || []).map(site => ({
                ...site,
                fileNo: entry.fileNo,
                applicantName: entry.applicantName,
                constituency: site.constituency,
                purpose: site.purpose || 'N/A',
                dateOfCompletion: site.dateOfCompletion,
                totalExpenditure: site.totalExpenditure || 0,
            })));

        const arsWorks = arsEntries.map(entry => ({
            nameOfSite: entry.nameOfSite,
            constituency: entry.constituency,
            purpose: entry.arsTypeOfScheme || 'ARS', // Normalize purpose for the card
            fileNo: entry.fileNo,
            applicantName: 'ARS Scheme',
            workStatus: entry.workStatus,
            dateOfCompletion: entry.dateOfCompletion,
            totalExpenditure: entry.totalExpenditure || 0,
        }));

        return [...publicDepositWorks, ...arsWorks];
  }, [allFileEntries, arsEntries]);


  const handleOpenDialog = useCallback((
    data: any[],
    title: string,
    columns: { key: string; label: string; isNumeric?: boolean; }[] = [],
    type: 'detail' | 'rig' | 'age' | 'month' | 'fileStatus' | 'finance' = 'detail'
  ) => {
    setDialogState({ isOpen: true, data, title, columns, type });
  }, []);
  
  const isPageLoading = authLoading || usersLoading || isReportLoading || agenciesLoading || filteredEntriesLoading || arsLoading || !dashboardData;
  
  if (isPageLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading Dashboard...</p>
      </div>
    );
  }
  
  return (
    <>
      <div className="space-y-6">
        <div id="updates" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ImportantUpdates allFileEntries={currentUser?.role === 'supervisor' ? dashboardData.allFileEntriesForSupervisor : dashboardData.allFileEntries} />
          <NoticeBoard staffMembers={dashboardData.staffMembers} />
        </div>

        <div id="file-status">
          <FileStatusOverview 
              nonArsEntries={dashboardData.nonArsEntries}
              onOpenDialog={handleOpenDialog}
          />
        </div>
        
        <div id="work-status">
          <WorkStatusByService 
            allFileEntries={currentUser?.role === 'supervisor' ? dashboardData.allFileEntriesForSupervisor : dashboardData.allFileEntries}
            onOpenDialog={handleOpenDialog}
            currentUserRole={currentUser?.role}
          />
        </div>

        <div id="constituency">
          <ConstituencyWiseOverview
            allWorks={constituencyWorks}
            onOpenDialog={handleOpenDialog}
            dates={constituencyDates}
            onSetDates={setConstituencyDates}
          />
        </div>
        
        {currentUser?.role !== 'supervisor' && (
          <>
            <div id="finance">
              <FinanceOverview 
                allFileEntries={dashboardData.allFileEntries}
                onOpenDialog={handleOpenDialog}
                dates={financeDates}
                onSetDates={setFinanceDates}
              />
            </div>
            
            <div id="ars">
              <ArsStatusOverview 
                onOpenDialog={handleOpenDialog}
                dates={arsDates}
                onSetDates={setArsDates}
              />
            </div>
            
            <div id="rig-registration">
              <RigRegistrationOverview 
                agencyApplications={agencyApplications}
                onOpenDialog={handleOpenDialog}
              />
            </div>
            
            <div id="rig-financials">
              <RigFinancialSummary
                  applications={agencyApplications}
                  onCellClick={handleOpenDialog}
                />
            </div>
          </>
        )}
        
        <div id="work-progress">
          <WorkProgress
            allFileEntries={currentUser?.role === 'supervisor' ? filteredFileEntries : dashboardData.allFileEntries}
            onOpenDialog={handleOpenDialog}
            currentUser={currentUser}
          />
        </div>

        {currentUser?.role !== 'supervisor' && (
          <div id="supervisor-work" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

        {showScrollTop && (
          <Button
            variant="default"
            size="icon"
            className="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg"
            onClick={scrollToTop}
            aria-label="Scroll to top"
          >
            <ArrowUp className="h-6 w-6" />
          </Button>
        )}
      </div>
    </>
  );
}
