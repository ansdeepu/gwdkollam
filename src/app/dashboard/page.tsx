
// src/app/dashboard/page.tsx
"use client"; 

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useFileEntries } from "@/hooks/useFileEntries";
import { useStaffMembers } from "@/hooks/useStaffMembers"; 
import { useAgencyApplications } from '@/hooks/useAgencyApplications';
import { useAuth, type UserProfile } from '@/hooks/useAuth';
import { useAllFileEntriesForReports } from '@/hooks/useAllFileEntriesForReports';
import { usePageHeader } from '@/hooks/usePageHeader';
import type { SiteDetailFormData, SiteWorkStatus, SitePurpose, AgencyApplication, RigRegistration, DataEntryFormData, RigType, ApplicationType } from '@/lib/schemas';
import { format, addYears, isValid, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';
import FileStatusOverview from '@/components/dashboard/FileStatusOverview';
import NoticeBoard from '@/components/dashboard/NoticeBoard';
import ImportantUpdates from '@/components/dashboard/ImportantUpdates';
import ETenderNoticeBoard from '@/components/dashboard/ETenderNoticeBoard'; // New import
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
import { PUBLIC_DEPOSIT_APPLICATION_TYPES, COLLECTOR_APPLICATION_TYPES, PLAN_FUND_APPLICATION_TYPES, PRIVATE_APPLICATION_TYPES } from '@/lib/schemas';

export const dynamic = 'force-dynamic';

const Loader2 = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
);
const ArrowUp = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
);


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

const COMPLETED_WORK_STATUSES: SiteWorkStatus[] = ["Work Completed", "Bill Prepared", "Payment Completed", "Utilization Certificate Issued"];

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

    return {
        allFileEntriesForSupervisor: filteredFileEntries || [], 
        allFileEntries: allFileEntries || [],
        staffMembers: staffMembers || []
    };
  }, [filteredEntriesLoading, isReportLoading, staffLoading, currentUser, filteredFileEntries, allFileEntries, staffMembers]);

  const {
      constituencyWorks,
      depositWorksCount,
      collectorWorksCount,
      planFundWorksCount,
      arsWorksCount,
      totalCompletedCount
  } = useMemo(() => {
      const publicFileEntries = (allFileEntries || []).filter(entry => 
          !entry.applicationType || !(PRIVATE_APPLICATION_TYPES as any).includes(entry.applicationType)
      );

      const allWorksFromFiles = publicFileEntries.flatMap(entry => 
          (entry.siteDetails || []).map(site => ({
              ...site,
              fileNo: entry.fileNo,
              applicantName: entry.applicantName,
              applicationType: entry.applicationType,
              constituency: site.constituency,
              purpose: site.purpose || 'N/A',
              dateOfCompletion: site.dateOfCompletion,
              totalExpenditure: site.totalExpenditure || 0,
              workStatus: site.workStatus
          }))
      );

      const arsWorks = (arsEntries || []).map(entry => ({
          nameOfSite: entry.nameOfSite,
          constituency: entry.constituency,
          purpose: entry.arsTypeOfScheme || 'ARS',
          fileNo: entry.fileNo,
          applicantName: 'ARS Scheme',
          workStatus: entry.arsStatus,
          dateOfCompletion: entry.dateOfCompletion,
          totalExpenditure: entry.totalExpenditure || 0,
      }));
      
      const allPublicWorks = [...allWorksFromFiles, ...arsWorks];
      
      const completedCount = allPublicWorks.filter(w => w.workStatus && COMPLETED_WORK_STATUSES.includes(w.workStatus as SiteWorkStatus)).length;
      
      const countSitesInCategory = (types: readonly ApplicationType[]) => {
        return publicFileEntries.reduce((acc, entry) => {
            if (entry.applicationType && (types as any).includes(entry.applicationType)) {
                return acc + (entry.siteDetails?.length || 0);
            }
            return acc;
        }, 0);
      };
      
      const depositCount = countSitesInCategory(PUBLIC_DEPOSIT_APPLICATION_TYPES);
      const collectorCount = countSitesInCategory(COLLECTOR_APPLICATION_TYPES);
      const planFundCount = countSitesInCategory(PLAN_FUND_APPLICATION_TYPES);

      return {
          constituencyWorks: allPublicWorks,
          depositWorksCount: depositCount,
          collectorWorksCount: collectorCount,
          planFundWorksCount: planFundCount,
          arsWorksCount: arsWorks.length,
          totalCompletedCount: completedCount
      };
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
        <div id="updates" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ETenderNoticeBoard />
          <ImportantUpdates allFileEntries={dashboardData.allFileEntries} />
          <NoticeBoard staffMembers={dashboardData.staffMembers} />
        </div>

        <div id="file-status">
          <FileStatusOverview 
              nonArsEntries={dashboardData.allFileEntries.filter(e => !e.applicationType?.includes("ARS"))}
              onOpenDialog={handleOpenDialog}
          />
        </div>
        
        <div id="work-status">
          <WorkStatusByService 
            allFileEntries={dashboardData.allFileEntries}
            onOpenDialog={handleOpenDialog}
            currentUserRole={currentUser?.role}
          />
        </div>

        <div id="constituency">
          <ConstituencyWiseOverview
            allWorks={constituencyWorks}
            depositWorksCount={depositWorksCount}
            collectorWorksCount={collectorWorksCount}
            planFundWorksCount={planFundWorksCount}
            arsWorksCount={arsWorksCount}
            totalCompletedCount={totalCompletedCount}
            onOpenDialog={handleOpenDialog}
            dates={constituencyDates}
            onSetDates={setConstituencyDates}
          />
        </div>
        
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
        
        <div id="work-progress">
          <WorkProgress
            allFileEntries={dashboardData.allFileEntries}
            onOpenDialog={handleOpenDialog}
            currentUser={currentUser}
          />
        </div>

        <div id="supervisor-work" className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
