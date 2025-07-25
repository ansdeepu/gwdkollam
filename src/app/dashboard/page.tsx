
// src/app/dashboard/page.tsx
"use client"; 

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Hourglass, 
  FilePlus2, 
  ListX,
  ClipboardList, 
  Briefcase,
  Users,
  CalendarDays,
  Clock,
  FileText,
  Activity,
  Landmark, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  XCircle, 
  Calendar as CalendarIconLucide,
  FileDown, 
  DollarSign,
  Megaphone,
  Cake,
  Bell,
  CalendarCheck,
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { 
  fileStatusOptions, 
  siteWorkStatusOptions, 
  sitePurposeOptions, 
  type DataEntryFormData, 
  type FileStatus, 
  type SiteWorkStatus,
  type SiteDetailFormData,
  type SitePurpose,
  type Designation,
} from '@/lib/schemas';
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useFileEntries } from "@/hooks/useFileEntries";
import { useStaffMembers } from "@/hooks/useStaffMembers"; 
import { Loader2 } from 'lucide-react';
import { format, parseISO, isValid, formatDistanceToNow, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { useAuth, type UserProfile } from '@/hooks/useAuth';
import { cn } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TransformedFinanceMetrics {
  sbiCredit: number;
  sbiDebit: number;
  stsbCredit: number;
  stsbDebit: number;
  revenueHeadCredit: number;
  sbiBalance: number;
  stsbBalance: number;
  revenueHeadBalance: number;
}

interface DetailDialogColumn {
  key: string;
  label: string;
  isNumeric?: boolean;
}

const AgeStatCard = ({ title, count, onClick }: { title: string; count: number; onClick: () => void }) => (
  <button
    onClick={onClick}
    disabled={count === 0}
    className="p-2 text-center rounded-md border bg-secondary/30 hover:bg-secondary/50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
  >
    <p className="text-xs font-medium text-muted-foreground">{title}</p>
    <p className="text-xl font-bold text-foreground">{count}</p>
  </button>
);


export default function DashboardPage() {
  const router = useRouter();
  const { fileEntries: rawFileEntries, isLoading: entriesLoading } = useFileEntries();
  const { staffMembers, isLoading: staffLoading } = useStaffMembers(); 
  const { user: currentUser, isLoading: authLoading, fetchAllUsers } = useAuth();
  const { toast } = useToast();
  
  const [currentDateState, setCurrentDateState] = useState<string | null>(null); 
  const [currentTimeState, setCurrentTimeState] = useState<string | null>(null); 

  const [unapprovedUsersCount, setUnapprovedUsersCount] = useState<number>(0);
  const [usersLoading, setUsersLoading] = useState<boolean>(true);
  const [activeUsers, setActiveUsers] = useState<UserProfile[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  
  const [financeStartDate, setFinanceStartDate] = useState<Date | undefined>(undefined);
  const [financeEndDate, setFinanceEndDate] = useState<Date | undefined>(undefined);
  const [transformedFinanceMetrics, setTransformedFinanceMetrics] = useState<TransformedFinanceMetrics | null>(null);
  const [financeLoading, setFinanceLoading] = useState(false);

  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [detailDialogTitle, setDetailDialogTitle] = useState("");
  const [detailDialogData, setDetailDialogData] = useState<Array<Record<string, any>>>([]);
  const [detailDialogColumns, setDetailDialogColumns] = useState<DetailDialogColumn[]>([]);

  const [isAgeDetailDialogOpen, setIsAgeDetailDialogOpen] = useState(false);
  const [ageDetailDialogTitle, setAgeDetailDialogTitle] = useState("");
  const [ageDetailDialogData, setAgeDetailDialogData] = useState<Array<Record<string, any>>>([]);
  const [ageDetailDialogColumns, setAgeDetailDialogColumns] = useState<DetailDialogColumn[]>([]);

  const [isMonthDetailDialogOpen, setIsMonthDetailDialogOpen] = useState(false);
  const [monthDetailDialogTitle, setMonthDetailDialogTitle] = useState("");
  const [monthDetailDialogData, setMonthDetailDialogData] = useState<Array<Record<string, any>>>([]);
  const [monthDetailDialogColumns, setMonthDetailDialogColumns] = useState<DetailDialogColumn[]>([]);

  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string | undefined>(undefined);

  const fileEntries = useMemo(() => {
    if (currentUser?.role !== 'supervisor') {
      return rawFileEntries;
    }
    // For supervisors, filter to only show sites assigned to them.
    return rawFileEntries
      .map(entry => {
        if (!entry.siteDetails || entry.siteDetails.length === 0) return null;
        
        const assignedSites = entry.siteDetails.filter(
          site => site.supervisorUid === currentUser.uid
        );

        if (assignedSites.length === 0) return null;

        return { ...entry, siteDetails: assignedSites };
      })
      .filter((entry): entry is DataEntryFormData => entry !== null);
  }, [rawFileEntries, currentUser]);


  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };

  useEffect(() => {
    const now = new Date();
    setCurrentDateState(format(now, 'dd/MM/yyyy'));
    setCurrentTimeState(format(now, 'hh:mm:ss a'));
    const timerId = setInterval(() => setCurrentTimeState(format(new Date(), 'hh:mm:ss a')), 1000);
    return () => clearInterval(timerId);
  }, []);

  const calculateFinanceData = useCallback(() => {
    if (entriesLoading) return;
    setFinanceLoading(true);
    
    let sDate: Date | null = null;
    let eDate: Date | null = null;
    const isDateFilterActive = !!financeStartDate && !!financeEndDate;

    if (isDateFilterActive && financeStartDate && financeEndDate) {
        sDate = startOfDay(financeStartDate);
        eDate = endOfDay(financeEndDate);
    }

    let sbiCredit = 0;
    let stsbCredit = 0;
    let revenueHeadCreditDirect = 0; 
    let sbiDebit = 0;
    let stsbDebit = 0;

    fileEntries.forEach(entry => {
      entry.remittanceDetails?.forEach(rd => {
        const remittedDate = rd.dateOfRemittance ? new Date(rd.dateOfRemittance) : null;
        const isInPeriod = !isDateFilterActive || (remittedDate && isValid(remittedDate) && sDate && eDate && isWithinInterval(remittedDate, { start: sDate, end: eDate }));

        if (isInPeriod) {
          const amount = Number(rd.amountRemitted) || 0;
          if (rd.remittedAccount === 'SBI') sbiCredit += amount;
          else if (rd.remittedAccount === 'STSB') stsbCredit += amount;
          else if (rd.remittedAccount === 'RevenueHead') revenueHeadCreditDirect += amount;
        }
      });

      entry.paymentDetails?.forEach(pd => {
        const paymentDate = pd.dateOfPayment ? new Date(pd.dateOfPayment) : null;
        const isInPeriod = !isDateFilterActive || (paymentDate && isValid(paymentDate) && sDate && eDate && isWithinInterval(paymentDate, { start: sDate, end: eDate }));

        if (isInPeriod) {
          const currentPaymentDebitAmount = 
            (Number(pd.contractorsPayment) || 0) +
            (Number(pd.gst) || 0) +
            (Number(pd.incomeTax) || 0) +
            (Number(pd.kbcwb) || 0) +
            (Number(pd.refundToParty) || 0);

          if (pd.paymentAccount === 'SBI') sbiDebit += currentPaymentDebitAmount;
          else if (pd.paymentAccount === 'STSB') stsbDebit += currentPaymentDebitAmount;
          
          if (pd.revenueHead) revenueHeadCreditDirect += Number(pd.revenueHead) || 0;
        }
      });
    });
    
    const sbiBalance = sbiCredit - sbiDebit;
    const stsbBalance = stsbCredit - stsbDebit;
    const revenueHeadBalance = revenueHeadCreditDirect;

    setTransformedFinanceMetrics({
      sbiCredit, sbiDebit, sbiBalance,
      stsbCredit, stsbDebit, stsbBalance,
      revenueHeadCredit: revenueHeadCreditDirect,
      revenueHeadBalance,
    });
    setFinanceLoading(false);
  }, [financeStartDate, financeEndDate, fileEntries, entriesLoading]);
  
  useEffect(() => {
    if (!entriesLoading) calculateFinanceData();
  }, [financeStartDate, financeEndDate, fileEntries, entriesLoading, calculateFinanceData]); 

  const handleClearFinanceDates = () => {
    setFinanceStartDate(undefined);
    setFinanceEndDate(undefined);
  };


  useEffect(() => {
    setUsersLoading(true);
    fetchAllUsers()
      .then(users => {
        setAllUsers(users);
        if (currentUser?.role === 'editor') {
          const count = users.filter(user => !user.isApproved).length;
          setUnapprovedUsersCount(count);
          const sortedUsers = [...users]
            .sort((a, b) => {
              const timeA = a.lastActiveAt?.getTime() ?? a.createdAt?.getTime() ?? 0;
              const timeB = b.lastActiveAt?.getTime() ?? b.createdAt?.getTime() ?? 0;
              return timeB - timeA;
            });
          setActiveUsers(sortedUsers.slice(0, 5));
        } else {
          setActiveUsers([]);
        }
      })
      .catch(error => console.error("Error fetching users for dashboard:", error))
      .finally(() => setUsersLoading(false));
  }, [authLoading, currentUser, fetchAllUsers]);

  const dashboardData = useMemo(() => {
    if (entriesLoading || staffLoading) return null;

    // --- Start Initializing accumulators ---
    let pendingTasksCount = 0;
    
    const workStatusRows = [...siteWorkStatusOptions];
    const totalApplicationsRow = "Total No. of Applications";
    const reorderedRowLabels = [...workStatusRows, totalApplicationsRow];
    
    const initialWorkStatusData = reorderedRowLabels.map(statusCategory => {
        const serviceCounts: { [service: string]: number } = {};
        sitePurposeOptions.forEach(service => {
            serviceCounts[service] = 0;
        });
        return { statusCategory, ...serviceCounts, total: 0 };
    });

    const birthdayWishes: { name: string, designation?: Designation }[] = [];
    const workAlertsMap = new Map<string, { title: string; details: string; }>();
    
    const ageGroups: Record<string, DataEntryFormData[]> = {
        lessThan1: [], between1And2: [], between2And3: [], between3And4: [], between4And5: [], above5: [],
    };

    const fileStatusCounts = new Map<string, number>();
    fileStatusOptions.forEach(status => fileStatusCounts.set(status, 0));
    // --- End Initializing accumulators ---

    const now = new Date();
    const fileStatusesForPending: FileStatus[] = ["File Under Process"];
    const siteWorkStatusesForPending: SiteWorkStatus[] = ["Addl. AS Awaited", "To be Refunded", "To be Tendered", "TS Pending"];
    const siteWorkStatusAlerts: SiteWorkStatus[] = ["To be Refunded", "To be Tendered", "Under Process"];

    // --- SINGLE LOOP over fileEntries ---
    for (const entry of fileEntries) {
        // 1. Pending Tasks Calculation
        let isFilePending = false;
        if (entry.fileStatus && fileStatusesForPending.includes(entry.fileStatus as FileStatus)) isFilePending = true;
        else if (entry.siteDetails?.some(sd => sd.workStatus && siteWorkStatusesForPending.includes(sd.workStatus as SiteWorkStatus))) isFilePending = true;
        if (isFilePending) pendingTasksCount++;
        
        // 2. Work Status by Service Calculation
        entry.siteDetails?.forEach(sd => {
            if (sd.purpose && sd.workStatus) {
                const purposeIndex = sitePurposeOptions.indexOf(sd.purpose as SitePurpose);
                if (purposeIndex > -1) {
                    const service = sd.purpose as SitePurpose;
                    // Find row for this workStatus
                    const workStatusRow = initialWorkStatusData.find(row => row.statusCategory === sd.workStatus);
                    if (workStatusRow) {
                        workStatusRow[service]++;
                        workStatusRow.total++;
                    }
                    // Find row for total applications
                    const totalAppsRow = initialWorkStatusData.find(row => row.statusCategory === totalApplicationsRow);
                    if (totalAppsRow) {
                        totalAppsRow[service]++;
                        totalAppsRow.total++;
                    }
                }
            }
        });

        // 3. Work Alerts Calculation
        entry.siteDetails?.forEach(site => {
            if (site.workStatus && siteWorkStatusAlerts.includes(site.workStatus as SiteWorkStatus)) {
                const details = `Site: ${site.nameOfSite || 'Unnamed Site'}, App: ${entry.applicantName}, File: ${entry.fileNo}`;
                const key = `${entry.fileNo}-${site.nameOfSite}-${site.workStatus}`;
                if (!workAlertsMap.has(key)) {
                    workAlertsMap.set(key, { title: site.workStatus, details });
                }
            }
        });

        // 4. Files by Age Calculation
        const latestRemittanceDate = entry.remittanceDetails
            ?.map(rd => (rd.dateOfRemittance ? new Date(rd.dateOfRemittance) : null))
            .filter((d): d is Date => d !== null && isValid(d))
            .sort((a, b) => b.getTime() - a.getTime())[0];

        const basisDate = latestRemittanceDate || (entry.createdAt ? new Date(entry.createdAt) : null);

        if (basisDate && isValid(basisDate)) {
            const ageInMs = now.getTime() - basisDate.getTime();
            const ageInYears = ageInMs / (1000 * 3600 * 24 * 365.25);
            if (ageInYears < 1) ageGroups.lessThan1.push(entry);
            else if (ageInYears >= 1 && ageInYears < 2) ageGroups.between1And2.push(entry);
            else if (ageInYears >= 2 && ageInYears < 3) ageGroups.between2And3.push(entry);
            else if (ageInYears >= 3 && ageInYears < 4) ageGroups.between3And4.push(entry);
            else if (ageInYears >= 4 && ageInYears < 5) ageGroups.between4And5.push(entry);
            else if (ageInYears >= 5) ageGroups.above5.push(entry);
        }

        // 5. File Status Counts
        if (entry.fileStatus && fileStatusCounts.has(entry.fileStatus)) {
            fileStatusCounts.set(entry.fileStatus, (fileStatusCounts.get(entry.fileStatus) || 0) + 1);
        }
    }

    // --- SINGLE LOOP over staffMembers ---
    const today = new Date();
    const todayMonth = today.getMonth();
    const todayDate = today.getDate();
    for (const staff of staffMembers) {
        if (!staff.dateOfBirth) continue;
        const dob = new Date(staff.dateOfBirth);
        if (isValid(dob) && dob.getMonth() === todayMonth && dob.getDate() === todayDate) {
            birthdayWishes.push({ name: staff.name, designation: staff.designation });
        }
    }
    
    // --- Final Data Assembly ---
    const workAlerts = Array.from(workAlertsMap.values());
    const filesByAgeCounts = {
        lessThan1: ageGroups.lessThan1.length,
        between1And2: ageGroups.between1And2.length,
        between2And3: ageGroups.between2And3.length,
        between3And4: ageGroups.between3And4.length,
        between4And5: ageGroups.between4And5.length,
        above5: ageGroups.above5.length,
    };
    const fileStatusCountsData = fileStatusOptions.map(status => ({
        status,
        count: fileStatusCounts.get(status) || 0,
    }));

    return {
        pendingTasksCount,
        workStatusByServiceData: initialWorkStatusData,
        birthdayWishes,
        workAlerts,
        filesByAgeData: ageGroups,
        filesByAgeCounts,
        fileStatusCountsData,
        totalFiles: fileEntries.length,
    };
  }, [entriesLoading, fileEntries, staffLoading, staffMembers]);

  const currentMonthStats = useMemo(() => {
    if (entriesLoading) return null;
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const ongoingWorkStatuses: SiteWorkStatus[] = ["Work in Progress", "Work Order Issued", "Awaiting Dept. Rig"];
    const completedWorkStatuses: SiteWorkStatus[] = ["Work Completed"];

    const completedThisMonthSites: Array<SiteDetailFormData & { fileNo: string; applicantName: string; }> = [];
    const ongoingSites: Array<SiteDetailFormData & { fileNo: string; applicantName: string; }> = [];

    for (const entry of fileEntries) {
        entry.siteDetails?.forEach(site => {
            if (site.workStatus && completedWorkStatuses.includes(site.workStatus as SiteWorkStatus) && site.dateOfCompletion) {
                const completionDate = new Date(site.dateOfCompletion);
                if (isValid(completionDate) && isWithinInterval(completionDate, { start: startOfMonth, end: endOfMonth })) {
                    completedThisMonthSites.push({ ...site, fileNo: entry.fileNo || 'N/A', applicantName: entry.applicantName || 'N/A' });
                }
            }
            
            if (site.workStatus && ongoingWorkStatuses.includes(site.workStatus as SiteWorkStatus)) {
               ongoingSites.push({ ...site, fileNo: entry.fileNo || 'N/A', applicantName: entry.applicantName || 'N/A' });
            }
        });
    }
    
    return {
        completedThisMonthCount: completedThisMonthSites.length,
        completedThisMonthData: completedThisMonthSites,
        ongoingCount: ongoingSites.length,
        ongoingData: ongoingSites
    }
  }, [fileEntries, entriesLoading]);

  const supervisorList = useMemo(() => {
    if (staffLoading || usersLoading) return [];
    return allUsers
        .filter(u => u.role === 'supervisor' && u.isApproved && u.staffId)
        .map(u => {
            const staffInfo = staffMembers.find(s => s.id === u.staffId);
            return {
                uid: u.uid,
                name: staffInfo?.name || u.name || u.email,
            }
        })
        .sort((a,b) => a.name.localeCompare(b.name));
  }, [allUsers, staffMembers, usersLoading, staffLoading]);


  const supervisorOngoingWorks = useMemo(() => {
      if (!selectedSupervisorId || entriesLoading) return [];
      
      const ongoingWorkStatuses: SiteWorkStatus[] = ["Work Order Issued", "Work in Progress", "Awaiting Dept. Rig"];
      const works: Array<{ fileNo: string; applicantName: string; siteName: string; workStatus: string; }> = [];

      for (const entry of rawFileEntries) { // Use rawFileEntries to check all files
          entry.siteDetails?.forEach(site => {
              if (site.supervisorUid === selectedSupervisorId && site.workStatus && ongoingWorkStatuses.includes(site.workStatus as SiteWorkStatus)) {
                  works.push({
                      fileNo: entry.fileNo || 'N/A',
                      applicantName: entry.applicantName || 'N/A',
                      siteName: site.nameOfSite || 'Unnamed Site',
                      workStatus: site.workStatus,
                  });
              }
          });
      }
      return works;
  }, [selectedSupervisorId, rawFileEntries, entriesLoading]);


  const handleStatusCardClick = (status: string) => {
    router.push(`/dashboard/reports?status=${encodeURIComponent(status)}`);
  };

  const handleWorkStatusCellClick = (workCategory: string, serviceType: string) => {
    router.push(`/dashboard/reports?workCategory=${encodeURIComponent(workCategory)}&serviceType=${encodeURIComponent(serviceType)}`);
  };
  
  const handlePendingTasksClick = () => {
    router.push('/dashboard/reports?reportType=pendingDashboardTasks');
  };
  
  const handleCalendarInteraction = (e: Event) => {
    const target = e.target as HTMLElement;
    if (target.closest('.calendar-custom-controls-container') || target.closest('[data-radix-select-content]') || target.closest('.rdp-caption_label input')) {
      e.preventDefault();
    }
  };

  const handleAmountClick = (account: 'SBI' | 'STSB' | 'RevenueHead', type: 'credit' | 'debit') => {
    let title = '';
    const dataForDialog: Array<Record<string, any>> = [];
    let columnsForDialog: DetailDialogColumn[] = [];
  
    const sDateObj = financeStartDate ? startOfDay(financeStartDate) : null;
    const eDateObj = financeEndDate ? endOfDay(financeEndDate) : null;
    const isDateFilterActive = !!sDateObj && !!eDateObj;
  
    const checkDateInRange = (targetDateValue?: Date | string | null): boolean => {
      if (!isDateFilterActive) return true; 
      if (!targetDateValue || !sDateObj || !eDateObj) return false;
      const targetDate = targetDateValue instanceof Date ? targetDateValue : parseISO(targetDateValue as any);
      if (!isValid(targetDate)) return false;
      return isWithinInterval(targetDate, { start: sDateObj, end: eDateObj });
    };
  
    fileEntries.forEach(entry => {
      const siteNames = entry.siteDetails?.map(sd => sd.nameOfSite || 'N/A').filter(Boolean).join(', ') || 'N/A';
      const sitePurposes = entry.siteDetails?.map(sd => sd.purpose || 'N/A').filter(Boolean).join(', ') || 'N/A';
  
      if ((account === 'SBI' || account === 'STSB') && type === 'credit') {
        title = `${account} - Credit Details`;
        columnsForDialog = [
          { key: 'fileNo', label: 'File No.' }, { key: 'applicantName', label: 'Applicant Name' },
          { key: 'siteNames', label: 'Site(s)' }, { key: 'sitePurposes', label: 'Purpose(s)' },
          { key: 'amount', label: 'Remitted (₹)', isNumeric: true }, { key: 'date', label: 'Remitted Date' },
        ];
        entry.remittanceDetails?.forEach(rd => {
          if (rd.remittedAccount === account && checkDateInRange(rd.dateOfRemittance)) {
            dataForDialog.push({
              fileNo: entry.fileNo || 'N/A', applicantName: entry.applicantName || 'N/A', siteNames, sitePurposes,
              amount: Number(rd.amountRemitted || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
              date: rd.dateOfRemittance ? format(new Date(rd.dateOfRemittance), 'dd/MM/yyyy') : 'N/A',
            });
          }
        });
      } else if ((account === 'SBI' || account === 'STSB') && type === 'debit') {
        title = `${account} - Withdrawal Details`;
        columnsForDialog = [
          { key: 'fileNo', label: 'File No.' }, { key: 'applicantName', label: 'Applicant Name' },
          { key: 'siteNames', label: 'Site(s)' }, { key: 'sitePurposes', label: 'Purpose(s)' },
          { key: 'amount', label: 'Paid (₹)', isNumeric: true }, { key: 'date', label: 'Payment Date' },
        ];
        entry.paymentDetails?.forEach(pd => {
          if (pd.paymentAccount === account && checkDateInRange(pd.dateOfPayment)) {
            const paymentAmount = (Number(pd.contractorsPayment) || 0) + (Number(pd.gst) || 0) + (Number(pd.incomeTax) || 0) + (Number(pd.kbcwb) || 0) + (Number(pd.refundToParty) || 0);
            if (paymentAmount > 0) {
              dataForDialog.push({
                fileNo: entry.fileNo || 'N/A', applicantName: entry.applicantName || 'N/A', siteNames, sitePurposes,
                amount: paymentAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                date: pd.dateOfPayment ? format(new Date(pd.dateOfPayment), 'dd/MM/yyyy') : 'N/A',
              });
            }
          }
        });
      } else if (account === 'RevenueHead' && type === 'credit') {
        title = 'Revenue Head - Credit Details';
        columnsForDialog = [
          { key: 'fileNo', label: 'File No.' }, { key: 'applicantName', label: 'Applicant Name' },
          { key: 'siteNames', label: 'Site(s)' }, { key: 'sitePurposes', label: 'Purpose(s)' },
          { key: 'source', label: 'Source' }, { key: 'amount', label: 'Credited (₹)', isNumeric: true },
          { key: 'date', label: 'Credited Date' },
        ];
        entry.remittanceDetails?.forEach(rd => {
          if (rd.remittedAccount === 'RevenueHead' && checkDateInRange(rd.dateOfRemittance)) {
            dataForDialog.push({
              fileNo: entry.fileNo || 'N/A', applicantName: entry.applicantName || 'N/A', siteNames, sitePurposes,
              source: 'Direct Remittance',
              amount: Number(rd.amountRemitted || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
              date: rd.dateOfRemittance ? format(new Date(rd.dateOfRemittance), 'dd/MM/yyyy') : 'N/A',
            });
          }
        });
        entry.paymentDetails?.forEach(pd => {
          if (pd.revenueHead && Number(pd.revenueHead) > 0 && checkDateInRange(pd.dateOfPayment)) {
            dataForDialog.push({
              fileNo: entry.fileNo || 'N/A', applicantName: entry.applicantName || 'N/A', siteNames, sitePurposes,
              source: 'From Payment Entry',
              amount: Number(pd.revenueHead).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
              date: pd.dateOfPayment ? format(new Date(pd.dateOfPayment), 'dd/MM/yyyy') : 'N/A',
            });
          }
        });
      }
    });
  
    setDetailDialogTitle(title);
    setDetailDialogColumns(columnsForDialog);
    setDetailDialogData(dataForDialog);
    setIsDetailDialogOpen(true);
  };

  const exportDialogDataToExcel = (title: string, columns: DetailDialogColumn[], data: Array<Record<string, any>>) => {
    const reportTitle = title;
    const columnLabels = columns.map(col => col.label);
    const dataRows = data.map(row => columns.map(col => row[col.key] ?? ''));
    const sheetName = title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
    const fileNamePrefix = `gwd_report_${sheetName}`;

    if (dataRows.length === 0) {
      toast({ title: "No Data to Export", description: "There is no data to export.", variant: "default" });
      return;
    }

    const wb = XLSX.utils.book_new();
    
    // --- Data Preparation ---
    const headerRows = [
      ["Ground Water Department, Kollam"],
      [reportTitle],
      [`Report generated on: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`],
      [] // Blank row
    ];
    
    const numCols = columnLabels.length;
    const footerColIndex = numCols > 1 ? numCols - 2 : 0; 
    const footerRowData = new Array(numCols).fill("");
    footerRowData[footerColIndex] = "District Officer";
    
    const footerRows = [
      [], // Spacer row
      footerRowData
    ];

    const finalData = [...headerRows, columnLabels, ...dataRows, ...footerRows];
    const ws = XLSX.utils.aoa_to_sheet(finalData, { cellStyles: false });
    
    // --- Styling ---
    const merges = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: numCols - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: numCols - 1 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: numCols - 1 } },
    ];
    const footerRowIndex = finalData.length - 1;
    if (numCols > 1) {
        merges.push({ s: { r: footerRowIndex, c: footerColIndex }, e: { r: footerRowIndex, c: numCols - 1 } });
    }
    ws['!merges'] = merges;

    const colWidths = columnLabels.map((label, i) => ({
      wch: Math.max(
        label.length, 
        ...finalData.map(row => (row[i] ? String(row[i]).length : 0))
      ) + 2,
    }));
    ws['!cols'] = colWidths;

    const numRows = finalData.length;
    for (let R = 0; R < numRows; R++) {
      ws['!rows'] = ws['!rows'] || [];
      ws['!rows'][R] = { hpt: 20 }; 

      for (let C = 0; C < numCols; C++) {
        const cellRef = XLSX.utils.encode_cell({ c: C, r: R });
        if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };

        ws[cellRef].s = {
          alignment: { horizontal: "center", vertical: "center", wrapText: true },
          border: { 
            top: { style: "thin" }, bottom: { style: "thin" }, 
            left: { style: "thin" }, right: { style: "thin" } 
          }
        };

        if (R < 3) {
          ws[cellRef].s.font = { bold: true, sz: R === 0 ? 16 : (R === 1 ? 14 : 12) };
          if (R === 2) ws[cellRef].s.font.italic = true;
        } else if (R === 3) { // Column headers row
          ws[cellRef].s.font = { bold: true };
          ws[cellRef].s.fill = { fgColor: { rgb: "F0F0F0" } };
        } else if (R === footerRowIndex) {
          ws[cellRef].s.border = {};
          if (C === footerColIndex) {
             ws[cellRef].s.font = { bold: true };
             ws[cellRef].s.alignment.horizontal = "right";
          }
        }
      }
    }
    
    // --- Write File ---
    XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));
    const uniqueFileName = `${fileNamePrefix}_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
    XLSX.writeFile(wb, uniqueFileName);

    toast({ title: "Excel Exported", description: `Your report has been downloaded as ${uniqueFileName}.` });
  };


  const handleDialogExcelExport = () => {
    if (detailDialogData.length === 0 || detailDialogColumns.length === 0) {
      toast({ title: "No Data", description: "No data in the dialog to export.", variant: "default" });
      return;
    }
    exportDialogDataToExcel(detailDialogTitle, detailDialogColumns, detailDialogData);
  };

  const handleAgeCardClick = (category: keyof NonNullable<typeof dashboardData>['filesByAgeData'], title: string) => {
    const dataForDialog = dashboardData?.filesByAgeData[category].map(entry => {
      const latestRemittanceDate = entry.remittanceDetails
        ?.map(rd => (rd.dateOfRemittance ? new Date(rd.dateOfRemittance) : null))
        .filter((d): d is Date => d !== null && isValid(d))
        .sort((a, b) => b.getTime() - a.getTime())[0];
      
      const siteNames = entry.siteDetails?.map(sd => sd.nameOfSite).filter(Boolean).join(', ') || 'N/A';

      return {
        fileNo: entry.fileNo || 'N/A',
        applicantName: entry.applicantName || 'N/A',
        siteNames: siteNames,
        lastRemittanceDate: latestRemittanceDate ? format(latestRemittanceDate, 'dd/MM/yyyy') : 'N/A',
        fileStatus: entry.fileStatus || 'N/A',
      };
    }) || [];

    const columns: DetailDialogColumn[] = [
      { key: 'fileNo', label: 'File No.' },
      { key: 'applicantName', label: 'Applicant Name' },
      { key: 'siteNames', label: 'Site Name(s)' },
      { key: 'lastRemittanceDate', label: 'Last Remittance Date' },
      { key: 'fileStatus', label: 'File Status' },
    ];
    setAgeDetailDialogTitle(title);
    setAgeDetailDialogColumns(columns);
    setAgeDetailDialogData(dataForDialog);
    setIsAgeDetailDialogOpen(true);
  };

  const handleAgeDialogExcelExport = () => {
    if (ageDetailDialogData.length === 0 || ageDetailDialogColumns.length === 0) {
      toast({ title: "No Data", description: "No data in the dialog to export.", variant: "default" });
      return;
    }
    exportDialogDataToExcel(ageDetailDialogTitle, ageDetailDialogColumns, ageDetailDialogData);
  };

  const handleMonthStatClick = (type: 'ongoing' | 'completed') => {
    if (!currentMonthStats) return;

    const columns: DetailDialogColumn[] = [
        { key: 'fileNo', label: 'File No.' },
        { key: 'applicantName', label: 'Applicant Name' },
        { key: 'siteName', label: 'Site Name' },
        { key: 'purpose', label: 'Purpose' },
        { key: 'workStatus', label: 'Work Status' },
        { key: 'supervisorName', label: 'Supervisor' },
    ];

    const mapSiteToDialogData = (site: SiteDetailFormData & { fileNo: string; applicantName: string; }) => ({
        fileNo: site.fileNo,
        applicantName: site.applicantName,
        siteName: site.nameOfSite,
        purpose: site.purpose,
        workStatus: site.workStatus,
        supervisorName: site.supervisorName || 'N/A',
    });
    
    if (type === 'ongoing') {
        setMonthDetailDialogTitle("Total Ongoing Works");
        setMonthDetailDialogData(currentMonthStats.ongoingData.map(mapSiteToDialogData));
    } else {
        setMonthDetailDialogTitle("Works Completed This Month");
        setMonthDetailDialogData(currentMonthStats.completedThisMonthData.map(mapSiteToDialogData));
    }
    setMonthDetailDialogColumns(columns);
    setIsMonthDetailDialogOpen(true);
  };

  const handleMonthDialogExcelExport = () => {
    if (monthDetailDialogData.length === 0 || monthDetailDialogColumns.length === 0) {
      toast({ title: "No Data", description: "No data in the dialog to export.", variant: "default" });
      return;
    }
    exportDialogDataToExcel(monthDetailDialogTitle, monthDetailDialogColumns, monthDetailDialogData);
  };


  if (entriesLoading || authLoading || usersLoading || staffLoading || !currentDateState || !currentTimeState || !dashboardData || !currentMonthStats) { 
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  const shouldAnimateBirthdays = dashboardData.birthdayWishes.length > 1;
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard Overview</h1>
        <div className="text-sm text-foreground text-right space-y-1">
          {currentDateState && (
            <div className="flex items-center justify-end gap-2">
              <CalendarDays className="h-4 w-4" />
              <span>{currentDateState}</span>
            </div>
          )}
          {currentTimeState && (
            <div className="flex items-center justify-end gap-2">
              <Clock className="h-4 w-4" />
              <span>{currentTimeState}</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-stretch">
        <div className="lg:col-span-3">
          <Card className="shadow-lg flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                File Status Overview
              </CardTitle>
              <CardDescription>
                Current count of files by status. Click on a status to see details.
              </CardDescription>
              <div className="mt-2">
                <div className="inline-flex items-baseline gap-2 p-3 rounded-lg shadow-sm bg-primary/10 border border-primary/20">
                  <h4 className="text-sm font-medium text-primary">Total Files</h4>
                  <p className="text-2xl font-bold text-primary">{dashboardData.totalFiles}</p>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-border/60">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-primary">Files by Age</h4>
                  <p className="text-xs text-muted-foreground">Based on last remittance or creation date</p>
                </div>
                {dashboardData.filesByAgeCounts ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                    <AgeStatCard title="< 1 Year" count={dashboardData.filesByAgeCounts.lessThan1} onClick={() => handleAgeCardClick('lessThan1', 'Files Aged Less Than 1 Year')} />
                    <AgeStatCard title="1-2 Years" count={dashboardData.filesByAgeCounts.between1And2} onClick={() => handleAgeCardClick('between1And2', 'Files Aged 1-2 Years')} />
                    <AgeStatCard title="2-3 Years" count={dashboardData.filesByAgeCounts.between2And3} onClick={() => handleAgeCardClick('between2And3', 'Files Aged 2-3 Years')} />
                    <AgeStatCard title="3-4 Years" count={dashboardData.filesByAgeCounts.between3And4} onClick={() => handleAgeCardClick('between3And4', 'Files Aged 3-4 Years')} />
                    <AgeStatCard title="4-5 Years" count={dashboardData.filesByAgeCounts.between4And5} onClick={() => handleAgeCardClick('between4And5', 'Files Aged 4-5 Years')} />
                    <AgeStatCard title="> 5 Years" count={dashboardData.filesByAgeCounts.above5} onClick={() => handleAgeCardClick('above5', 'Files Aged Over 5 Years')} />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Calculating age data...</p>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden pt-6">
              {dashboardData.fileStatusCountsData.length > 0 ? (
                <ScrollArea className="no-scrollbar">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                    {dashboardData.fileStatusCountsData.map((item) => (
                      <Card 
                        key={item.status} 
                        className={cn(
                          "shadow-sm transition-all",
                          item.count > 0 ? "cursor-pointer hover:shadow-md hover:bg-secondary/10 hover:border-primary/30" : "cursor-not-allowed opacity-75"
                        )}
                        onClick={() => item.count > 0 && handleStatusCardClick(item.status)}
                        role="button"
                        tabIndex={item.count > 0 ? 0 : -1}
                        aria-disabled={item.count === 0}
                        aria-label={`View details for status: ${item.status}`}
                        onKeyDown={(e) => { if (item.count > 0 && (e.key === 'Enter' || e.key === ' ')) handleStatusCardClick(item.status)}}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-foreground" title={item.status}>
                              {item.status}
                            </p>
                            <Badge 
                              variant={item.count > 0 ? "default" : "secondary"}
                              className={cn(
                                "text-sm font-semibold",
                                item.count === 0 && "bg-muted text-muted-foreground"
                              )}
                            >
                              {item.count}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 h-full">
                  <ListX className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No file status data available.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-2">
          <Card className="shadow-lg flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                Notice Board
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 overflow-hidden p-3 pt-0">
              <div className="flex flex-col p-3 rounded-lg border bg-secondary/30 h-[150px]">
                <h4 className="text-sm font-semibold text-accent-foreground mb-2 flex items-center gap-2 shrink-0 p-2 bg-accent rounded-t-md text-white">
                  <Cake className="h-4 w-4" />
                  Today's Birthdays ({dashboardData.birthdayWishes.length})
                </h4>
                <div className="flex-1 marquee-v-container no-scrollbar bg-white p-2 rounded-b-md">
                  {dashboardData.birthdayWishes.length > 0 ? (
                    <div className={cn("space-y-4 py-2", shouldAnimateBirthdays && "marquee-v-content")}>
                      {[
                        ...dashboardData.birthdayWishes,
                        ...(shouldAnimateBirthdays ? dashboardData.birthdayWishes : []),
                      ].map((staff, index) => (
                        <div key={index} className="text-center">
                          <p className="text-sm text-accent/90 font-medium">Wishing you a Happy Birthday!</p>
                          <p className="font-bold text-lg text-primary">{staff.name}</p>
                          <p className="text-xs text-muted-foreground">{staff.designation}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-sm text-muted-foreground italic">No birthdays today.</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col p-3 rounded-lg border bg-secondary/30 h-[450px]">
                <h4 className="text-sm font-semibold text-orange-600 mb-2 flex items-center gap-2 shrink-0 p-2 bg-orange-100 rounded-t-md">
                  <Megaphone className="h-4 w-4" />
                  📢 Important Updates ({dashboardData.workAlerts.length})
                </h4>
                <div className="flex-1 marquee-v-container no-scrollbar bg-white p-2 rounded-b-md">
                  {dashboardData.workAlerts.length > 0 ? (
                    <div className="marquee-v-content space-y-3">
                      {[...dashboardData.workAlerts, ...dashboardData.workAlerts].map((alert, index) => (
                        <div key={index} className="border-b border-border/50 pb-3 last:border-b-0">
                          <p className="font-semibold text-sm text-orange-500">{alert.title}</p>
                          <p className="text-sm text-muted-foreground">{alert.details}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-sm text-muted-foreground italic">No important updates.</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            Work Status by Service
          </CardTitle>
          <CardDescription>
            Breakdown of application statuses across different service categories. Click on a number to see detailed reports.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dashboardData.workStatusByServiceData.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px] font-semibold px-2 py-2">Work Category</TableHead>
                  {sitePurposeOptions.map(service => (
                    <TableHead key={service} className="text-center px-2 py-2 max-w-20 whitespace-normal">
                      {
                        service === "Pumping Scheme" ? (<>Pumping<br />Scheme</>) :
                        service === "BW Dev" ? (<>BW<br />Dev</>) :
                        service === "TW Dev" ? (<>TW<br />Dev</>) :
                        service === "FPW Dev" ? (<>FPW<br />Dev</>) :
                        service === "MWSS Ext" ? (<>MWSS<br />Ext</>) :
                        service === "MWSS Pump Reno" ? (<>MWSS<br />Pump<br />Reno</>) :
                        (service)
                      }
                    </TableHead>
                  ))}
                  <TableHead className="text-center font-semibold px-2 py-2 max-w-20 whitespace-normal">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboardData.workStatusByServiceData.map((row) => (
                  <TableRow key={row.statusCategory}>
                    <TableCell 
                      className={cn(
                        "px-2 py-2", 
                        row.statusCategory === "Total No. of Applications" ? "font-bold text-accent" : "font-medium"
                      )}
                    >
                      {row.statusCategory}
                    </TableCell>
                    {sitePurposeOptions.map(service => (
                      <TableCell 
                        key={`${row.statusCategory}-${service}`} 
                        className="text-center px-2 py-2"
                      >
                        {(row as any)[service] > 0 ? (
                          <Button 
                            variant="link" 
                            className={cn(
                              "p-0 h-auto hover:underline font-semibold",
                              row.statusCategory === "Total No. of Applications" 
                                ? "text-accent font-bold" 
                                : "text-primary"
                            )}
                            onClick={() => handleWorkStatusCellClick(row.statusCategory, service)}
                            aria-label={`View details for ${row.statusCategory} under ${service}`}
                          >
                            {(row as any)[service]}
                          </Button>
                        ) : (
                          <span className="text-muted-foreground font-normal">0</span>
                        )}
                      </TableCell>
                    ))}
                    <TableCell className="text-center px-2 py-2">
                       {(row as any)['total'] > 0 ? (
                        <Button
                          variant="link"
                          className={cn(
                            "p-0 h-auto hover:underline font-bold",
                             row.statusCategory === "Total No. of Applications" 
                               ? "text-accent" 
                               : "text-primary",
                          )}
                          onClick={() => handleWorkStatusCellClick(row.statusCategory, 'all')}
                          aria-label={`View details for total of ${row.statusCategory}`}
                        >
                            {(row as any)['total']}
                        </Button>
                      ) : (
                        <span className="text-muted-foreground font-medium">0</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              {dashboardData.workStatusByServiceData.length === 0 && (
                 <caption className="py-4 text-muted-foreground">No work status data available for services.</caption>
              )}
            </Table>
          ) : (
             <div className="flex flex-col items-center justify-center py-10">
              <ListX className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No work status data available for services.</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-lg md:col-span-2"> 
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Landmark className="h-5 w-5 text-primary" />
              Finance Overview
            </CardTitle>
            <CardDescription>
              Summary of credits, withdrawals and balance. Defaults to all-time data. Click amounts for details.
            </CardDescription>
            <div className="flex flex-col sm:flex-row flex-wrap gap-2 pt-3">
              <Popover>
                  <PopoverTrigger asChild>
                      <Button variant={"outline"} className={cn("w-full sm:w-auto justify-start text-left font-normal", !financeStartDate && "text-muted-foreground")}>
                      <CalendarIconLucide className="mr-2 h-4 w-4" />{financeStartDate ? format(financeStartDate, "dd/MM/yyyy") : <span>From Date</span>}
                      </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start" onFocusOutside={handleCalendarInteraction} onPointerDownOutside={handleCalendarInteraction}>
                      <Calendar 
                        mode="single" 
                        selected={financeStartDate} 
                        onSelect={setFinanceStartDate} 
                        disabled={(date) => (financeEndDate ? date > financeEndDate : false) || date > new Date()} 
                        initialFocus
                      />
                  </PopoverContent>
              </Popover>
              <Popover>
                  <PopoverTrigger asChild>
                      <Button variant={"outline"} className={cn("w-full sm:w-auto justify-start text-left font-normal", !financeEndDate && "text-muted-foreground")}>
                      <CalendarIconLucide className="mr-2 h-4 w-4" />{financeEndDate ? format(financeEndDate, "dd/MM/yyyy") : <span>To Date</span>}
                      </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start" onFocusOutside={handleCalendarInteraction} onPointerDownOutside={handleCalendarInteraction}>
                      <Calendar 
                        mode="single" 
                        selected={financeEndDate} 
                        onSelect={setFinanceEndDate} 
                        disabled={(date) => (financeStartDate ? date < financeStartDate : false) || date > new Date()} 
                        initialFocus
                      />
                  </PopoverContent>
              </Popover>
              <Button onClick={calculateFinanceData} disabled={financeLoading || !financeStartDate || !financeEndDate} className="w-full sm:w-auto flex-grow sm:flex-grow-0">
                  {financeLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  Apply Dates
              </Button>
              <Button onClick={handleClearFinanceDates} variant="outline" className="w-full sm:w-auto flex-grow sm:flex-grow-0">
                  <XCircle className="mr-2 h-4 w-4" />
                  Clear Dates
              </Button>
            </div>
             {(financeStartDate && financeEndDate) ? (
                <p className="text-xs text-muted-foreground pt-2">
                    Displaying data for period: {format(financeStartDate, "dd/MM/yyyy")} - {format(financeEndDate, "dd/MM/yyyy")}
                </p>
            ) : (
                 <p className="text-xs text-muted-foreground pt-2">Displaying all-time financial data.</p>
            )}
          </CardHeader>
          <CardContent>
            {financeLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : transformedFinanceMetrics ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold text-left">Account</TableHead>
                    <TableHead className="text-right font-semibold">
                       <div className="flex items-center justify-end gap-1 flex-wrap">
                        <TrendingUp className="h-4 w-4 text-green-700" />
                        <span>Credit (₹)</span>
                      </div>
                    </TableHead>
                    <TableHead className="text-right font-semibold">
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        <TrendingDown className="h-4 w-4 text-red-700" />
                        <span>Withdrawal (₹)</span>
                      </div>
                    </TableHead>
                    <TableHead className="text-right font-semibold">
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        <DollarSign className="h-4 w-4 text-blue-700" />
                        <span>Balance (₹)</span>
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow>
                        <TableCell className="font-medium">SBI</TableCell>
                        <TableCell className="text-right">
                          <Button variant="link" className="p-0 h-auto font-medium text-green-700 hover:underline" onClick={() => handleAmountClick('SBI', 'credit')}>
                            {transformedFinanceMetrics.sbiCredit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </Button>
                        </TableCell>
                        <TableCell className="text-right">
                           <Button variant="link" className="p-0 h-auto font-medium text-red-700 hover:underline" onClick={() => handleAmountClick('SBI', 'debit')}>
                            {transformedFinanceMetrics.sbiDebit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </Button>
                        </TableCell>
                         <TableCell className={cn("text-right font-medium", transformedFinanceMetrics.sbiBalance >= 0 ? "text-blue-700" : "text-destructive")}>
                            {transformedFinanceMetrics.sbiBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell className="font-medium">STSB</TableCell>
                        <TableCell className="text-right">
                          <Button variant="link" className="p-0 h-auto font-medium text-green-700 hover:underline" onClick={() => handleAmountClick('STSB', 'credit')}>
                            {transformedFinanceMetrics.stsbCredit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                           </Button>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="link" className="p-0 h-auto font-medium text-red-700 hover:underline" onClick={() => handleAmountClick('STSB', 'debit')}>
                            {transformedFinanceMetrics.stsbDebit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </Button>
                        </TableCell>
                         <TableCell className={cn("text-right font-medium", transformedFinanceMetrics.stsbBalance >= 0 ? "text-blue-700" : "text-destructive")}>
                            {transformedFinanceMetrics.stsbBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell className="font-medium">Revenue Head</TableCell>
                        <TableCell className="text-right">
                          <Button variant="link" className="p-0 h-auto font-medium text-green-700 hover:underline" onClick={() => handleAmountClick('RevenueHead', 'credit')}>
                            {transformedFinanceMetrics.revenueHeadCredit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </Button>
                        </TableCell>
                        <TableCell className="text-right font-medium text-muted-foreground">-</TableCell>
                        <TableCell className={cn("text-right font-medium", transformedFinanceMetrics.revenueHeadBalance >= 0 ? "text-blue-700" : "text-destructive")}>
                            {transformedFinanceMetrics.revenueHeadBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                    </TableRow>
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-center py-4">No financial data available.</p>
            )}
          </CardContent>
           <CardFooter className="text-xs text-muted-foreground pt-3 border-t">
               Note: Withdrawals for SBI/STSB are based on the 'Payment Account' selected for each payment entry. Revenue Head credits include direct remittances and amounts specified in the 'Revenue Head' field of payment details. Balance = Credits - Withdrawals.
          </CardFooter>
        </Card>
      </div>
      
      <div className="space-y-6 mt-6">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-primary" />
              This Month's Work
            </CardTitle>
            <CardDescription>A summary of works completed and those currently in progress for this month. Click "View All" for more details and export options.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Completed Works Column */}
              <div className="space-y-3 p-4 border rounded-lg bg-secondary/30">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold text-foreground">Completed This Month</h4>
                  <Button variant="outline" size="sm" onClick={() => handleMonthStatClick('completed')} disabled={!currentMonthStats || currentMonthStats.completedThisMonthCount === 0}>
                    View All ({currentMonthStats?.completedThisMonthCount ?? 0})
                  </Button>
                </div>
                <ScrollArea className="h-[250px] pr-4 bg-background rounded-md p-2 shadow-inner">
                  {currentMonthStats && currentMonthStats.completedThisMonthData.length > 0 ? (
                    <ul className="space-y-3 text-sm">
                      {currentMonthStats.completedThisMonthData.map((item, index) => (
                        <li key={`completed-${index}`} className="flex flex-col gap-1 border-b pb-2 last:border-b-0">
                          <p className="font-medium text-foreground text-xs" title={`${item.purpose} - ${item.nameOfSite}`}>{item.purpose} - {item.nameOfSite}</p>
                          <p className="text-xs text-foreground" title={`${item.applicantName} - File: ${item.fileNo}`}>{item.applicantName} - File: {item.fileNo}</p>
                          <div className="flex items-center justify-between mt-1">
                            <Badge variant="secondary" className="text-xs">{item.workStatus}</Badge>
                            {item.supervisorName && <span className="text-xs text-muted-foreground" title={`Supervisor: ${item.supervisorName}`}>Sup: {item.supervisorName}</span>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <p className="text-muted-foreground text-center text-sm">No works completed this month.</p>
                    </div>
                  )}
                </ScrollArea>
              </div>

              {/* Ongoing Works Column */}
              <div className="space-y-3 p-4 border rounded-lg bg-secondary/30">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold text-foreground">Ongoing Works</h4>
                  <Button variant="outline" size="sm" onClick={() => handleMonthStatClick('ongoing')} disabled={!currentMonthStats || currentMonthStats.ongoingCount === 0}>
                    View All ({currentMonthStats?.ongoingCount ?? 0})
                  </Button>
                </div>
                <ScrollArea className="h-[250px] pr-4 bg-background rounded-md p-2 shadow-inner">
                  {currentMonthStats && currentMonthStats.ongoingData.length > 0 ? (
                    <ul className="space-y-3 text-sm">
                      {currentMonthStats.ongoingData.map((item, index) => (
                        <li key={`ongoing-${index}`} className="flex flex-col gap-1 border-b pb-2 last:border-b-0">
                          <p className="font-medium text-foreground text-xs" title={`${item.purpose} - ${item.nameOfSite}`}>
                            {item.purpose} - {item.nameOfSite}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">{item.applicantName}</span> - File: {item.fileNo}
                          </p>
                          <div className="flex items-center justify-between">
                            <Badge variant="secondary" className="text-xs">{item.workStatus}</Badge>
                            {item.supervisorName && (
                              <span className="text-xs text-muted-foreground" title={`Supervisor: ${item.supervisorName}`}>
                                Sup: {item.supervisorName}
                              </span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="flex h-full items-center justify-center">
                       <p className="text-muted-foreground text-center text-sm">No ongoing works found.</p>
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          </CardContent>
        </Card>

        {currentUser?.role === 'editor' && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Supervisor's Ongoing Work ({selectedSupervisorId ? supervisorOngoingWorks.length : 'Total'})
              </CardTitle>
              <CardDescription>
                Select a supervisor to view their assigned ongoing projects.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedSupervisorId} onValueChange={setSelectedSupervisorId}>
                <SelectTrigger className="w-full sm:w-[300px]">
                    <SelectValue placeholder="Select a Supervisor" />
                </SelectTrigger>
                <SelectContent>
                    {supervisorList.length > 0 ? (
                        supervisorList.map(supervisor => (
                            <SelectItem key={supervisor.uid} value={supervisor.uid}>
                                {supervisor.name}
                            </SelectItem>
                        ))
                    ) : (
                        <SelectItem value="no-supervisors" disabled>No supervisors available</SelectItem>
                    )}
                </SelectContent>
              </Select>
              <ScrollArea className="h-[250px] pr-4 bg-background rounded-md p-2 shadow-inner border">
                {selectedSupervisorId ? (
                    supervisorOngoingWorks.length > 0 ? (
                        <ul className="space-y-3 text-sm">
                            {supervisorOngoingWorks.map((item, index) => (
                                <li key={`ongoing-supervisor-${index}`} className="flex flex-col gap-1 border-b pb-2 last:border-b-0">
                                    <p className="font-medium text-foreground text-xs" title={item.siteName}>Site: {item.siteName}</p>
                                    <p className="text-xs text-foreground" title={`${item.applicantName} - File: ${item.fileNo}`}>
                                        {item.applicantName} - File: {item.fileNo}
                                    </p>
                                    <Badge variant="secondary" className="mt-1 self-start">{item.workStatus}</Badge>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="flex h-full items-center justify-center">
                            <p className="text-muted-foreground text-center text-sm">No ongoing works found for the selected supervisor.</p>
                        </div>
                    )
                ) : (
                    <div className="flex h-full items-center justify-center">
                        <p className="text-muted-foreground text-center text-sm">Please select a supervisor to see their work.</p>
                    </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {currentUser?.role === 'editor' && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                User Activity
              </CardTitle>
              <CardDescription>Showing users by their most recent activity (top 5).</CardDescription>
            </CardHeader>
            <CardContent>
              {activeUsers.length > 0 ? (
                <ul className="space-y-3">
                  {activeUsers.map((usr) => {
                    const staffInfo = staffMembers.find(s => s.id === usr.staffId);
                    const photoUrl = staffInfo?.photoUrl;
                    return (
                    <li key={usr.uid} className="flex items-center space-x-3 p-2 hover:bg-secondary/50 rounded-md">
                      <Avatar className="h-9 w-9">
                        <AvatarImage
                          src={photoUrl || undefined}
                          alt={usr.name || 'User'}
                          data-ai-hint="person user"
                        />
                        <AvatarFallback className="text-xs">{getInitials(usr.name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p
                            className="text-sm font-medium text-foreground truncate"
                            title={usr.name || usr.email?.split('@')[0]}
                          >
                            {usr.name || usr.email?.split('@')[0]}
                          </p>
                          <Badge
                            variant={usr.role === 'editor' ? 'default' : 'secondary'}
                            className="text-xs whitespace-nowrap ml-2"
                          >
                            {usr.role.charAt(0).toUpperCase() + usr.role.slice(1)}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {usr.lastActiveAt
                            ? <>Last active: {formatDistanceToNow(usr.lastActiveAt, { addSuffix: true })}
                              <span className="text-muted-foreground/70"> ({format(usr.lastActiveAt, 'dd MMM, p')})</span>
                            </>
                            : (usr.createdAt ? `Registered: ${format(usr.createdAt, 'dd MMM yyyy, p')} (No activity logged)` : 'Activity status unknown')
                          }
                          {!usr.isApproved && <span className="ml-2 text-orange-500 font-medium">(Pending)</span>}
                        </p>
                      </div>
                    </li>
                  )})}
                </ul>
              ) : (
                <p className="text-muted-foreground text-center py-4">No user activity data to display.</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>


      {/* Finance Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{detailDialogTitle}</DialogTitle>
            <DialogDescription>
              Showing details { (financeStartDate && financeEndDate) ? `from ${format(financeStartDate, "dd/MM/yyyy")} to ${format(financeEndDate, "dd/MM/yyyy")}` : "for all-time"}.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            {detailDialogData.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    {detailDialogColumns.map(col => (
                      <TableHead key={col.key} className={cn(col.isNumeric && "text-right")}>{col.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailDialogData.map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {detailDialogColumns.map(col => (
                        <TableCell key={`${rowIndex}-${col.key}`} className={cn("text-xs", col.isNumeric && "text-right font-mono")}>
                          {row[col.key]}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="py-4 text-center text-muted-foreground">No details found for the selected criteria.</p>
            )}
          </ScrollArea>
           <DialogFooter className="pt-4">
              <Button variant="outline" onClick={handleDialogExcelExport} disabled={detailDialogData.length === 0}>
                <FileDown className="mr-2 h-4 w-4" /> Export Excel
              </Button>
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Close
                </Button>
              </DialogClose>
            </DialogFooter>
        </DialogContent>
      </Dialog>

       {/* Age Detail Dialog */}
      <Dialog open={isAgeDetailDialogOpen} onOpenChange={setIsAgeDetailDialogOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{ageDetailDialogTitle}</DialogTitle>
            <DialogDescription>
              Showing files based on their age from the last remittance date.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            {ageDetailDialogData.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    {ageDetailDialogColumns.map(col => (
                      <TableHead key={col.key} className={cn(col.isNumeric && "text-right")}>{col.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ageDetailDialogData.map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {ageDetailDialogColumns.map(col => (
                        <TableCell key={`${rowIndex}-${col.key}`} className={cn("text-xs", col.isNumeric && "text-right font-mono")}>
                          {row[col.key]}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="py-4 text-center text-muted-foreground">No files found in this age category.</p>
            )}
          </ScrollArea>
           <DialogFooter className="pt-4">
              <Button variant="outline" onClick={handleAgeDialogExcelExport} disabled={ageDetailDialogData.length === 0}>
                <FileDown className="mr-2 h-4 w-4" /> Export Excel
              </Button>
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Close
                </Button>
              </DialogClose>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Monthly Work Detail Dialog */}
      <Dialog open={isMonthDetailDialogOpen} onOpenChange={setIsMonthDetailDialogOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{monthDetailDialogTitle}</DialogTitle>
            <DialogDescription>
              {monthDetailDialogTitle === 'Total Ongoing Works'
                ? 'List of all sites currently in an ongoing work status.'
                : `List of all sites completed in ${format(new Date(), 'MMMM yyyy')}.`}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            {monthDetailDialogData.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    {monthDetailDialogColumns.map(col => (
                      <TableHead key={col.key}>{col.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthDetailDialogData.map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {monthDetailDialogColumns.map(col => (
                        <TableCell key={`${rowIndex}-${col.key}`} className="text-xs">
                          {row[col.key]}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="py-4 text-center text-muted-foreground">No details found for this category.</p>
            )}
          </ScrollArea>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={handleMonthDialogExcelExport} disabled={monthDetailDialogData.length === 0}>
              <FileDown className="mr-2 h-4 w-4" /> Export Excel
            </Button>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
    

    

    






















