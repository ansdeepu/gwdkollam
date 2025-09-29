
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
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

const sections = [
  { id: 'updates', title: 'Updates' },
  { id: 'file-status', title: 'File Status' },
  { id: 'work-status', title: 'Work Status' },
  { id: 'constituency', title: 'Constituency' },
  { id: 'finance', title: 'Finance' },
  { id: 'ars', title: 'ARS' },
  { id: 'rig-registration', title: 'Rig Registration' },
  { id: 'rig-financials', title: 'Rig Financials' },
  { id: 'work-progress', title: 'Work Progress' },
  { id: 'supervisor-work', title: 'Supervisor Work' },
];

const sectionColors = [
    "text-sky-600", "text-blue-600", "text-indigo-600", "text-violet-600",
    "text-purple-600", "text-fuchsia-600", "text-pink-600", "text-rose-600",
    "text-red-600", "text-orange-600", "text-amber-600", "text-yellow-600",
    "text-lime-600", "text-green-600", "text-emerald-600", "text-teal-600", "text-cyan-600"
];

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
  
  const [activeSection, setActiveSection] = useState<string>(sections[0].id);

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

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-20% 0px -80% 0px', threshold: 0 }
    );

    Object.values(sectionRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [sectionRefs]);
  
  const handleNavClick = (id: string) => {
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveSection(id);
  };
  
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
                constituency: site.constituency || entry.constituency,
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
  
  const navSections = sections.filter(section => {
    if (currentUser?.role === 'supervisor') {
      return !['finance', 'ars', 'rig-registration', 'rig-financials', 'supervisor-work'].includes(section.id);
    }
    return true;
  });

  return (
    <>
      <div className="sticky top-0 z-40 -mx-6 -mt-6 mb-6 bg-background/80 backdrop-blur-lg">
        <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex items-center border-b px-4">
            {navSections.map((section, index) => (
                <button
                    key={section.id}
                    onClick={() => handleNavClick(section.id)}
                    className={cn(
                        "flex-shrink-0 px-4 py-3 text-sm font-semibold transition-all duration-200 ease-in-out border-b-2",
                        activeSection === section.id
                        ? `border-primary ${sectionColors[index % sectionColors.length]}`
                        : "border-transparent text-muted-foreground hover:text-primary"
                    )}
                >
                {section.title}
                </button>
            ))}
            </div>
        </ScrollArea>
      </div>
      <div className="space-y-6">
        <div id="updates" ref={el => sectionRefs.current['updates'] = el} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ImportantUpdates allFileEntries={currentUser?.role === 'supervisor' ? dashboardData.allFileEntriesForSupervisor : dashboardData.allFileEntries} />
          <NoticeBoard staffMembers={dashboardData.staffMembers} />
        </div>

        <div id="file-status" ref={el => sectionRefs.current['file-status'] = el}>
          <FileStatusOverview 
              nonArsEntries={dashboardData.nonArsEntries}
              onOpenDialog={handleOpenDialog}
          />
        </div>
        
        <div id="work-status" ref={el => sectionRefs.current['work-status'] = el}>
          <WorkStatusByService 
            allFileEntries={currentUser?.role === 'supervisor' ? dashboardData.allFileEntriesForSupervisor : dashboardData.allFileEntries}
            onOpenDialog={handleOpenDialog}
            currentUserRole={currentUser?.role}
          />
        </div>

        <div id="constituency" ref={el => sectionRefs.current['constituency'] = el}>
          <ConstituencyWiseOverview
            allWorks={constituencyWorks}
            onOpenDialog={handleOpenDialog}
            dates={constituencyDates}
            onSetDates={setConstituencyDates}
          />
        </div>
        
        {currentUser?.role !== 'supervisor' && (
          <>
            <div id="finance" ref={el => sectionRefs.current['finance'] = el}>
              <FinanceOverview 
                allFileEntries={dashboardData.allFileEntries}
                onOpenDialog={handleOpenDialog}
                dates={financeDates}
                onSetDates={setFinanceDates}
              />
            </div>
            
            <div id="ars" ref={el => sectionRefs.current['ars'] = el}>
              <ArsStatusOverview 
                onOpenDialog={handleOpenDialog}
                dates={arsDates}
                onSetDates={setArsDates}
              />
            </div>
            
            <div id="rig-registration" ref={el => sectionRefs.current['rig-registration'] = el}>
              <RigRegistrationOverview 
                agencyApplications={agencyApplications}
                onOpenDialog={handleOpenDialog}
              />
            </div>
            
            <div id="rig-financials" ref={el => sectionRefs.current['rig-financials'] = el}>
              <RigFinancialSummary
                  applications={agencyApplications}
                  onCellClick={handleOpenDialog}
                />
            </div>
          </>
        )}
        
        <div id="work-progress" ref={el => sectionRefs.current['work-progress'] = el}>
          <WorkProgress
            allFileEntries={currentUser?.role === 'supervisor' ? filteredFileEntries : dashboardData.allFileEntries}
            onOpenDialog={handleOpenDialog}
            currentUser={currentUser}
          />
        </div>

        {currentUser?.role !== 'supervisor' && (
          <div id="supervisor-work" ref={el => sectionRefs.current['supervisor-work'] = el} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
