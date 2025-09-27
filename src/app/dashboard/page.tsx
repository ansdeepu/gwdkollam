

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

  const rigRegistrationData = useMemo(() => {
    if (agenciesLoading) return null;

    const allRigs: (RigRegistration & {agencyName: string, ownerName: string})[] = [];
    const activeRigs: (RigRegistration & {agencyName: string, ownerName: string})[] = [];
    const expiredRigs: (RigRegistration & {agencyName: string, ownerName: string})[] = [];
    const cancelledRigs: (RigRegistration & {agencyName: string, ownerName: string})[] = [];
    const expiredThisMonthRigs: (RigRegistration & { agencyName: string; ownerName: string; })[] = [];
    
    const today = new Date();
    const startOfCurrentMonth = startOfMonth(today);
    const endOfCurrentMonth = endOfMonth(today);

    const completedAgencyApplications = agencyApplications.filter(app => app.status === 'Active');

    completedAgencyApplications.forEach(app => {
        (app.rigs || []).forEach(rig => {
            const rigWithContext = { ...rig, agencyName: app.agencyName, ownerName: app.owner.name };
            allRigs.push(rigWithContext);

            if (rig.status === 'Active') {
                const lastEffectiveDate = rig.renewals && rig.renewals.length > 0
                    ? [...rig.renewals].sort((a, b) => {
                        const dateA = a.renewalDate ? safeParseDate(a.renewalDate)?.getTime() ?? 0 : 0;
                        const dateB = b.renewalDate ? safeParseDate(b.renewalDate)?.getTime() ?? 0 : 0;
                        return dateB - dateA;
                    })[0].renewalDate
                    : rig.registrationDate;

                if (lastEffectiveDate) {
                    const validityDate = new Date(addYears(new Date(lastEffectiveDate), 1).getTime() - 24 * 60 * 60 * 1000);
                    if (isValid(validityDate) && new Date() > validityDate) {
                        expiredRigs.push(rigWithContext);
                        // Check if it expired this month
                        if (isWithinInterval(validityDate, { start: startOfCurrentMonth, end: endOfCurrentMonth })) {
                            expiredThisMonthRigs.push(rigWithContext);
                        }
                    } else {
                        activeRigs.push(rigWithContext);
                    }
                } else {
                    activeRigs.push(rigWithContext); // If no date, consider it active but not expired
                }
            } else if (rig.status === 'Cancelled') {
              cancelledRigs.push(rigWithContext);
            }
        });
    });

    return {
        totalAgencies: completedAgencyApplications.length,
        totalRigs: allRigs.length,
        activeRigs: activeRigs.length,
        expiredRigs: expiredRigs.length,
        expiredThisMonthRigs: expiredThisMonthRigs.length,
        cancelledRigs: cancelledRigs.length,
        allAgenciesData: completedAgencyApplications,
        allRigsData: allRigs,
        activeRigsData: activeRigs,
        expiredRigsData: expiredRigs,
        expiredThisMonthRigsData: expiredThisMonthRigs,
        cancelledRigsData: cancelledRigs,
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
            { key: 'slNo', label: 'Sl. No.' },
            { key: 'agencyName', label: 'Agency Name' },
            { key: 'registrationNo', label: 'Registration No' },
            { key: 'registrationDate', label: 'Registration Date' },
            { key: 'paymentDate', label: 'Payment Date' },
            { key: 'fee', label: 'Fee (₹)', isNumeric: true },
        ];
        
        const sortedData = [...(data as AgencyApplication[])].sort((a,b) => {
            const dateA = safeParseDate(a.agencyPaymentDate);
            const dateB = safeParseDate(b.agencyPaymentDate);
            if (!dateA && !dateB) return 0;
            if (!dateA) return 1;
            if (!dateB) return -1;
            return dateB.getTime() - dateA.getTime();
        });

        dialogData = sortedData.map((app, index) => {
            const totalFee = (Number(app.agencyRegistrationFee) || 0) + (Number(app.agencyAdditionalRegFee) || 0);
            const regDate = safeParseDate(app.agencyRegistrationDate);
            const payDate = safeParseDate(app.agencyPaymentDate);
            return {
                slNo: index + 1,
                agencyName: app.agencyName,
                registrationNo: app.agencyRegistrationNo || 'N/A',
                registrationDate: regDate ? format(regDate, 'dd/MM/yyyy') : 'N/A',
                paymentDate: payDate ? format(payDate, 'dd/MM/yyyy') : 'N/A',
                fee: totalFee.toLocaleString('en-IN')
            };
        });
    } else {
        columns = [
          { key: 'slNo', label: 'Sl. No.' },
          { key: 'rigRegistrationNo', label: 'Rig Reg. No.' },
          { key: 'agencyName', label: 'Agency Name' },
          { key: 'ownerName', label: 'Owner' },
          { key: 'typeOfRig', label: 'Type' },
          { key: 'status', label: 'Status' },
          { key: 'registrationDate', label: 'Registration Date' },
          { key: 'validity', label: 'Validity Date' },
        ];
        dialogData = (data as (RigRegistration & {agencyName: string, ownerName: string})[]).map((rig, index) => {
          const lastEffectiveDate = rig.renewals && rig.renewals.length > 0
              ? [...rig.renewals].sort((a, b) => {
                  const dateA = safeParseDate(a.renewalDate)?.getTime() ?? 0;
                  const dateB = safeParseDate(b.renewalDate)?.getTime() ?? 0;
                  return dateB - dateA;
                })[0].renewalDate
              : rig.registrationDate;

          const regDate = safeParseDate(rig.registrationDate);
          const validityDate = lastEffectiveDate ? addYears(safeParseDate(lastEffectiveDate)!, 1) : null;

          return {
            slNo: index + 1,
            rigRegistrationNo: rig.rigRegistrationNo || 'N/A',
            agencyName: rig.agencyName,
            ownerName: rig.ownerName,
            typeOfRig: rig.typeOfRig || 'N/A',
            status: rig.status,
            registrationDate: regDate ? format(regDate, 'dd/MM/yyyy') : 'N/A',
            validity: validityDate ? format(new Date(validityDate.getTime() - 24*60*60*1000), 'dd/MM/yyyy') : 'N/A',
          };
        });
    }

    setDialogState({ isOpen: true, data: dialogData, title, columns, type: 'rig' });
  }, []);

  const handleRigFinancialsClick = useCallback((
    data: any[],
    title: string
  ) => {
    if (data.length === 0) return;

    let columns: { key: string; label: string; isNumeric?: boolean }[] = [];
    let dialogData: Record<string, any>[] = [];

    // All clicks will produce a list of registrations or renewals
    if (title.includes('Renewal')) {
        columns = [
            { key: 'slNo', label: 'Sl. No.'},
            { key: 'agencyName', label: 'Agency Name'},
            { key: 'rigType', label: 'Rig Type'},
            { key: 'renewalNo', label: 'Rig Reg. No.'},
            { key: 'renewalFee', label: 'Fee (₹)', isNumeric: true },
        ];
        dialogData = data.map((item, index) => {
            return {
                slNo: index + 1,
                agencyName: item.agencyName,
                rigType: item.rigType,
                renewalNo: item.renewalNo || 'N/A',
                renewalFee: (item.renewalFee || 0).toLocaleString('en-IN'),
            }
        });
    } else if (title.toLowerCase().includes('application fee')) {
       columns = [
            { key: 'slNo', label: 'Sl. No.'},
            { key: 'agencyName', label: 'Agency Name'},
            { key: 'feeType', label: 'Fee Type'},
            { key: 'amount', label: 'Amount (₹)', isNumeric: true },
        ];
        dialogData = data.map((item, index) => {
            return {
                slNo: index + 1,
                agencyName: item.agencyName,
                feeType: item.feeType,
                amount: (item.amount || 0).toLocaleString('en-IN'),
            }
        });
    }
     else { // Agency and Rig Registrations
        columns = [
            { key: 'slNo', label: 'Sl. No.'},
            { key: 'agencyName', label: 'Agency Name'},
            { key: 'regNo', label: 'Registration No'},
            { key: 'fee', label: 'Reg. Fee (₹)', isNumeric: true },
        ];
        dialogData = data.map((item, index) => {
            return {
                slNo: index + 1,
                agencyName: item.agencyName,
                regNo: item.regNo || 'N/A',
                fee: (item.fee || 0).toLocaleString('en-IN'),
            }
        });
    }

    setDialogState({ isOpen: true, data: dialogData, title, columns, type: 'detail' });

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
          
          {rigRegistrationData && (
            <RigRegistrationOverview 
              data={rigRegistrationData}
              onCardClick={handleOpenRigDialog}
            />
          )}

          {agencyApplications && (
            <RigFinancialSummary 
              applications={agencyApplications}
              onCellClick={handleRigFinancialsClick}
             />
          )}
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
