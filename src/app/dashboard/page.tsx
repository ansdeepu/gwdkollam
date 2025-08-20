
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
  Waves,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAllFileEntriesForReports } from '@/hooks/useAllFileEntriesForReports';

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

interface WorkSummary {
  totalCount: number;
  byPurpose: Record<SitePurpose, number>;
  data: Array<SiteDetailFormData & { fileNo: string; applicantName: string; }>;
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

const hashCode = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0; 
    }
    return hash;
};

const getColorClass = (nameOrEmail: string): string => {
    const colors = [
        "bg-red-200 text-red-800", "bg-orange-200 text-orange-800", "bg-amber-200 text-amber-800",
        "bg-yellow-200 text-yellow-800", "bg-lime-200 text-lime-800", "bg-green-200 text-green-800",
        "bg-emerald-200 text-emerald-800", "bg-teal-200 text-teal-800", "bg-cyan-200 text-cyan-800",
        "bg-sky-200 text-sky-800", "bg-blue-200 text-blue-800", "bg-indigo-200 text-indigo-800",
        "bg-violet-200 text-violet-800", "bg-purple-200 text-purple-800", "bg-fuchsia-200 text-fuchsia-800",
        "bg-pink-200 text-pink-800", "bg-rose-200 text-rose-800"
    ];
    const hash = hashCode(nameOrEmail);
    const index = Math.abs(hash) % colors.length;
    return colors[index];
};


export default function DashboardPage() {
  const router = useRouter();
  const { fileEntries: filteredFileEntries, isLoading: filteredEntriesLoading } = useFileEntries();
  const { reportEntries: allFileEntries, isReportLoading: allEntriesLoading } = useAllFileEntriesForReports();
  const { staffMembers, isLoading: staffLoading } = useStaffMembers();
  const { user: currentUser, isLoading: authLoading, fetchAllUsers } = useAuth();
  const { toast } = useToast();
  
  const [unapprovedUsersCount, setUnapprovedUsersCount] = useState<number>(0);
  const [usersLoading, setUsersLoading] = useState<boolean>(true);
  const [activeUsers, setActiveUsers] = useState<UserProfile[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  
  const [financeStartDate, setFinanceStartDate] = useState<Date | undefined>(undefined);
  const [financeEndDate, setFinanceEndDate] = useState<Date | undefined>(undefined);
  const [transformedFinanceMetrics, setTransformedFinanceMetrics] = useState<TransformedFinanceMetrics | null >(null);
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

  const [isFileStatusDetailDialogOpen, setIsFileStatusDetailDialogOpen] = useState(false);
  const [fileStatusDetailDialogTitle, setFileStatusDetailDialogTitle] = useState("");
  const [fileStatusDetailDialogData, setFileStatusDetailDialogData] = useState<Array<Record<string, any>>>([]);
  const [fileStatusDetailDialogColumns, setFileStatusDetailDialogColumns] = useState<DetailDialogColumn[]>([]);

  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string | undefined>(undefined);
  const [workReportMonth, setWorkReportMonth] = useState<Date>(new Date());

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };

  const calculateFinanceData = useCallback(() => {
    if (allEntriesLoading) return;
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

    allFileEntries.forEach(entry => {
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
  }, [financeStartDate, financeEndDate, allFileEntries, allEntriesLoading]);
  
  useEffect(() => {
    if (!allEntriesLoading) calculateFinanceData();
  }, [financeStartDate, financeEndDate, allFileEntries, allEntriesLoading, calculateFinanceData]); 

  const handleClearFinanceDates = () => {
    setFinanceStartDate(undefined);
    setFinanceEndDate(undefined);
  };


  useEffect(() => {
    if (!authLoading && currentUser) {
        if (currentUser.role === 'editor' || currentUser.role === 'viewer') {
            setUsersLoading(true);
            fetchAllUsers()
            .then(users => {
                setAllUsers(users);
                const count = users.filter(user => !user.isApproved).length;
                setUnapprovedUsersCount(count);
                const sortedUsers = [...users]
                    .sort((a, b) => {
                    const timeA = a.lastActiveAt?.getTime() ?? a.createdAt?.getTime() ?? 0;
                    const timeB = b.lastActiveAt?.getTime() ?? b.createdAt?.getTime() ?? 0;
                    return timeB - timeA;
                    });
                setActiveUsers(sortedUsers.slice(0, 5));
            })
            .catch(error => console.error("Error fetching users for dashboard:", error))
            .finally(() => setUsersLoading(false));
        } else {
             setAllUsers([]);
             setActiveUsers([]);
             setUsersLoading(false);
        }
    }
  }, [authLoading, currentUser, fetchAllUsers]);

  const dashboardData = useMemo(() => {
    if (filteredEntriesLoading || allEntriesLoading || staffLoading || !currentUser) return null;
    
    const entriesForFileStatus = filteredFileEntries;
    const entriesForWorkStatus = filteredFileEntries;
    
    let pendingTasksCount = 0;
    
    const workStatusRows = [...siteWorkStatusOptions];
    const totalApplicationsRow = "Total No. of Applications";
    const reorderedRowLabels = [...workStatusRows, totalApplicationsRow];
    
    const initialWorkStatusData = reorderedRowLabels.map(statusCategory => {
        const serviceCounts: { [service: string]: { count: number, data: any[] } } = {};
        [...sitePurposeOptions].filter(p => p !== 'ARS').forEach(service => {
            serviceCounts[service] = { count: 0, data: [] };
        });
        return { statusCategory, ...serviceCounts, total: { count: 0, data: [] } };
    });

    const birthdayWishes: { name: string, designation?: Designation }[] = [];
    const workAlertsMap = new Map<string, { title: string; details: string; }>();
    
    const ageGroups: Record<string, DataEntryFormData[]> = {
        lessThan1: [], between1And2: [], between2And3: [], between3And4: [], between4And5: [], above5: [],
    };

    const fileStatusCounts = new Map<string, number>();
    fileStatusOptions.forEach(status => fileStatusCounts.set(status, 0));
    
    const arsStatusCounts = new Map<string, { count: number, data: SiteDetailFormData[] }>();
    siteWorkStatusOptions.forEach(status => arsStatusCounts.set(status, { count: 0, data: [] }));

    const now = new Date();
    const fileStatusesForPending: FileStatus[] = ["File Under Process"];
    const siteWorkStatusesForPending: SiteWorkStatus[] = ["Addl. AS Awaited", "To be Refunded", "To be Tendered", "TS Pending"];
    const siteWorkStatusAlerts: SiteWorkStatus[] = ["To be Refunded", "To be Tendered", "Under Process"];

    for (const entry of entriesForFileStatus) {
        let isFilePending = false;
        if (entry.fileStatus && fileStatusesForPending.includes(entry.fileStatus as FileStatus)) isFilePending = true;
        else if (entry.siteDetails?.some(sd => sd.workStatus && siteWorkStatusesForPending.includes(sd.workStatus as SiteWorkStatus))) isFilePending = true;
        if (isFilePending) pendingTasksCount++;
        
        entry.siteDetails?.forEach(site => {
            if (site.workStatus && siteWorkStatusAlerts.includes(site.workStatus as SiteWorkStatus)) {
                const details = `Site: ${site.nameOfSite || 'Unnamed Site'}, App: ${entry.applicantName}, File: ${entry.fileNo}`;
                const key = `${entry.fileNo}-${site.nameOfSite}-${site.workStatus}`;
                if (!workAlertsMap.has(key)) {
                    workAlertsMap.set(key, { title: site.workStatus, details });
                }
            }
        });

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

        if (entry.fileStatus && fileStatusCounts.has(entry.fileStatus)) {
            fileStatusCounts.set(entry.fileStatus, (fileStatusCounts.get(entry.fileStatus) || 0) + 1);
        }
    }

    for (const entry of entriesForWorkStatus) {
        entry.siteDetails?.forEach(sd => {
            const siteData = { ...sd, fileNo: entry.fileNo, applicantName: entry.applicantName };
            const purpose = sd.purpose as SitePurpose;
            if (sd.purpose && sd.workStatus) {
                if (sitePurposeOptions.includes(purpose) && purpose !== 'ARS') {
                    const workStatusRow = initialWorkStatusData.find(row => row.statusCategory === sd.workStatus);
                    if (workStatusRow) {
                        workStatusRow[purpose].count++;
                        workStatusRow[purpose].data.push(siteData);
                        workStatusRow.total.count++;
                        workStatusRow.total.data.push(siteData);
                    }
                    const totalAppsRow = initialWorkStatusData.find(row => row.statusCategory === totalApplicationsRow);
                    if (totalAppsRow) {
                        totalAppsRow[purpose].count++;
                        totalAppsRow.total.count++;
                        totalAppsRow.total.data.push(siteData);
                    }
                }
            }
        });
    }

    allFileEntries.forEach(entry => {
        entry.siteDetails?.forEach(sd => {
            if (sd.purpose === 'ARS') {
                const siteData = { ...sd, fileNo: entry.fileNo, applicantName: entry.applicantName };
                if (sd.workStatus && arsStatusCounts.has(sd.workStatus)) {
                    const current = arsStatusCounts.get(sd.workStatus)!;
                    current.count++;
                    current.data.push(siteData);
                    arsStatusCounts.set(sd.workStatus, current);
                }
            }
        });
    });
    
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
    
    let finalWorkStatusData = initialWorkStatusData;
    if (currentUser.role === 'supervisor') {
        finalWorkStatusData = initialWorkStatusData.filter(row => row.total.count > 0 || row.statusCategory === "Total No. of Applications");
    }

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
    
    const arsStatusCountsData = Array.from(arsStatusCounts.entries())
        .map(([status, { count, data }]) => ({ status, count, data }))
        .filter(item => item.count > 0)
        .sort((a,b) => a.status.localeCompare(b.status));
    
    const totalArsSites = allFileEntries.flatMap(entry => entry.siteDetails ?? []).filter(site => site.purpose === 'ARS').length;

    return {
        pendingTasksCount,
        workStatusByServiceData: finalWorkStatusData,
        birthdayWishes,
        workAlerts,
        filesByAgeData: ageGroups,
        filesByAgeCounts,
        fileStatusCountsData,
        arsStatusCountsData,
        totalArsSites,
        totalFiles: entriesForFileStatus.length,
    };
  }, [filteredEntriesLoading, allEntriesLoading, staffLoading, currentUser, filteredFileEntries, allFileEntries, staffMembers]);

  const currentMonthStats = useMemo(() => {
    if (allEntriesLoading || !currentUser) return null;

    const startOfMonth = new Date(workReportMonth.getFullYear(), workReportMonth.getMonth(), 1);
    const endOfMonth = new Date(workReportMonth.getFullYear(), workReportMonth.getMonth() + 1, 0, 23, 59, 59);

    const ongoingWorkStatuses: SiteWorkStatus[] = ["Work in Progress", "Work Order Issued", "Awaiting Dept. Rig"];
    const completedWorkStatuses: SiteWorkStatus[] = ["Work Failed", "Work Completed", "Bill Prepared", "Payment Completed", "Utilization Certificate Issued"];
    
    const isSupervisor = currentUser.role === 'supervisor';
    const uniqueCompletedSites = new Map<string, SiteDetailFormData & { fileNo: string; applicantName: string; }>();
    const ongoingSites: Array<SiteDetailFormData & { fileNo: string; applicantName: string; }> = [];

    for (const entry of allFileEntries) {
      if (!entry.siteDetails) continue;
      for (const site of entry.siteDetails) {
        if (isSupervisor && site.supervisorUid !== currentUser.uid) {
            continue; 
        }

        if (site.workStatus && completedWorkStatuses.includes(site.workStatus as SiteWorkStatus) && site.dateOfCompletion) {
          const completionDate = new Date(site.dateOfCompletion);
          if (isValid(completionDate) && isWithinInterval(completionDate, { start: startOfMonth, end: endOfMonth })) {
             const siteKey = `${entry.fileNo}-${site.nameOfSite}-${site.purpose}`;
             if (!uniqueCompletedSites.has(siteKey)) {
                uniqueCompletedSites.set(siteKey, { ...site, fileNo: entry.fileNo || 'N/A', applicantName: entry.applicantName || 'N/A' });
             }
          }
        }
        
        if (site.workStatus && ongoingWorkStatuses.includes(site.workStatus as SiteWorkStatus)) {
            ongoingSites.push({ ...site, fileNo: entry.fileNo || 'N/A', applicantName: entry.applicantName || 'N/A' });
        }
      }
    }
    
    const completedThisMonthSites = Array.from(uniqueCompletedSites.values());

    const createSummary = (sites: typeof completedThisMonthSites): WorkSummary => {
        const byPurpose = [...sitePurposeOptions, 'ARS'].reduce((acc, purpose) => {
          acc[purpose as SitePurpose] = 0;
          return acc;
        }, {} as Record<SitePurpose, number>);

        sites.forEach(site => {
          if (site.purpose && (sitePurposeOptions.includes(site.purpose as SitePurpose) || site.purpose === 'ARS')) {
            byPurpose[site.purpose as SitePurpose]++;
          }
        });

        return {
            totalCount: sites.length,
            byPurpose,
            data: sites,
        };
    };

    return {
        completedSummary: createSummary(completedThisMonthSites),
        ongoingSummary: createSummary(ongoingSites),
    };
  }, [allFileEntries, allEntriesLoading, workReportMonth, currentUser]);

  const supervisorList = useMemo(() => {
    if (staffLoading || usersLoading) return [];
    return allUsers
        .filter(u => u.role === 'supervisor' && u.isApproved && u.staffId)
        .map(u => {
            const staffInfo = staffMembers.find(s => s.id === u.staffId);
            return {
                uid: u.uid,
                name: staffInfo?.name || u.name || u.email,
            };
        })
        .sort((a,b) => a.name.localeCompare(b.name));
  }, [allUsers, staffMembers, usersLoading, staffLoading]);


  const supervisorOngoingWorks = useMemo(() => {
    const byPurpose = [...sitePurposeOptions, 'ARS'].reduce((acc, purpose) => {
        acc[purpose as SitePurpose] = 0;
        return acc;
    }, {} as Record<SitePurpose, number>);
    
    if (!selectedSupervisorId || allEntriesLoading) {
      return { works: [], byPurpose, totalCount: 0 };
    }
    
    const ongoingWorkStatuses: SiteWorkStatus[] = ["Work Order Issued", "Work in Progress", "Awaiting Dept. Rig"];
    let works: Array<{ fileNo: string; applicantName: string; siteName: string; workStatus: string; purpose?: SitePurpose; supervisorName?: string | null }> = [];

    for (const entry of allFileEntries) {
        entry.siteDetails?.forEach(site => {
            if (site.supervisorUid === selectedSupervisorId && site.workStatus && ongoingWorkStatuses.includes(site.workStatus as SiteWorkStatus)) {
                works.push({
                    fileNo: entry.fileNo || 'N/A',
                    applicantName: entry.applicantName || 'N/A',
                    siteName: site.nameOfSite || 'Unnamed Site',
                    workStatus: site.workStatus,
                    purpose: site.purpose,
                    supervisorName: site.supervisorName,
                });
                if(site.purpose && ([...sitePurposeOptions, 'ARS'].includes(site.purpose as SitePurpose))) {
                    byPurpose[site.purpose as SitePurpose]++;
                }
            }
        });
    }
    return { works, byPurpose, totalCount: works.length };
  }, [selectedSupervisorId, allFileEntries, allEntriesLoading]);

  const handleFileStatusCardClick = (status: string) => {
    const dataForDialog = filteredFileEntries
      .filter(entry => entry.fileStatus === status)
      .map((entry, index) => {
        const firstRemittanceDate = entry.remittanceDetails?.[0]?.dateOfRemittance;
        const siteNames = entry.siteDetails?.map(s => s.nameOfSite).join(', ') || 'N/A';
        const workStatuses = entry.siteDetails?.map(s => s.workStatus).join(', ') || 'N/A';
        return {
          slNo: index + 1,
          fileNo: entry.fileNo || 'N/A',
          applicantName: entry.applicantName || 'N/A',
          siteNames,
          firstRemittanceDate: firstRemittanceDate ? format(new Date(firstRemittanceDate), 'dd/MM/yyyy') : 'N/A',
          workStatuses,
        };
      });

    const columns: DetailDialogColumn[] = [
      { key: 'slNo', label: 'Sl. No.' },
      { key: 'fileNo', label: 'File No.' },
      { key: 'applicantName', label: 'Applicant Name' },
      { key: 'siteNames', label: 'Site(s)' },
      { key: 'firstRemittanceDate', label: 'First Remittance' },
      { key: 'workStatuses', label: 'Site Status(es)' },
    ];

    setFileStatusDetailDialogTitle(`Files with Status: "${status}"`);
    setFileStatusDetailDialogColumns(columns);
    setFileStatusDetailDialogData(dataForDialog);
    setIsFileStatusDetailDialogOpen(true);
  };

  const handleWorkStatusCellClick = (data: any[], title: string) => {
    const dialogData = data.map((site, index) => ({
      slNo: index + 1,
      fileNo: site.fileNo,
      applicantName: site.applicantName,
      siteName: site.nameOfSite,
      purpose: site.purpose,
      workStatus: site.workStatus,
      supervisorName: site.supervisorName || 'N/A'
    }));
    const columns: DetailDialogColumn[] = [
      { key: 'slNo', label: 'Sl. No.' },
      { key: 'fileNo', label: 'File No.' },
      { key: 'applicantName', label: 'Applicant Name' },
      { key: 'siteName', label: 'Site Name' },
      { key: 'purpose', label: 'Purpose' },
      { key: 'workStatus', label: 'Work Status' },
      { key: 'supervisorName', label: 'Supervisor' }
    ];
    setDetailDialogTitle(title);
    setDetailDialogColumns(columns);
    setDetailDialogData(dialogData);
    setIsDetailDialogOpen(true);
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
  
    allFileEntries.forEach(entry => {
      const siteNames = entry.siteDetails?.map(sd => sd.nameOfSite || 'N/A').filter(Boolean).join(', ') || 'N/A';
      const sitePurposes = entry.siteDetails?.map(sd => sd.purpose || 'N/A').filter(Boolean).join(', ') || 'N/A';
  
      if ((account === 'SBI' || account === 'STSB') && type === 'credit') {
        title = `${account} - Credit Details`;
        columnsForDialog = [
          { key: 'slNo', label: 'Sl. No.' }, { key: 'fileNo', label: 'File No.' }, { key: 'applicantName', label: 'Applicant Name' },
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
          { key: 'slNo', label: 'Sl. No.' }, { key: 'fileNo', label: 'File No.' }, { key: 'applicantName', label: 'Applicant Name' },
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
          { key: 'slNo', label: 'Sl. No.' }, { key: 'fileNo', label: 'File No.' }, { key: 'applicantName', label: 'Applicant Name' },
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

    const dataWithSlNo = dataForDialog.map((item, index) => ({ slNo: index + 1, ...item }));
  
    setDetailDialogTitle(title);
    setDetailDialogColumns(columnsForDialog);
    setDetailDialogData(dataWithSlNo);
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
    
    const headerRows = [
      ["Ground Water Department, Kollam"],
      [reportTitle],
      [`Report generated on: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`],
      []
    ];
    
    const numCols = columnLabels.length;
    const footerColIndex = numCols > 1 ? numCols - 2 : 0; 
    const footerRowData = new Array(numCols).fill("");
    footerRowData[footerColIndex] = "District Officer";
    
    const footerRows = [
      [], 
      footerRowData
    ];

    const finalData = [...headerRows, columnLabels, ...dataRows, ...footerRows];
    const ws = XLSX.utils.aoa_to_sheet(finalData, { cellStyles: false });
    
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
        } else if (R === 3) { 
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
    if (!dashboardData) return;
    const dataForDialog = dashboardData.filesByAgeData[category].map((entry, index) => {
      const latestRemittanceDate = entry.remittanceDetails
        ?.map(rd => (rd.dateOfRemittance ? new Date(rd.dateOfRemittance) : null))
        .filter((d): d is Date => d !== null && isValid(d))
        .sort((a, b) => b.getTime() - a.getTime())[0];
      
      const siteNames = entry.siteDetails?.map(sd => sd.nameOfSite).filter(Boolean).join(', ') || 'N/A';

      return {
        slNo: index + 1,
        fileNo: entry.fileNo || 'N/A',
        applicantName: entry.applicantName || 'N/A',
        siteNames: siteNames,
        lastRemittanceDate: latestRemittanceDate ? format(latestRemittanceDate, 'dd/MM/yyyy') : 'N/A',
        fileStatus: entry.fileStatus || 'N/A',
      };
    }) || [];

    const columns: DetailDialogColumn[] = [
      { key: 'slNo', label: 'Sl. No.' },
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
        { key: 'slNo', label: 'Sl. No.' },
        { key: 'fileNo', label: 'File No.' },
        { key: 'applicantName', label: 'Applicant Name' },
        { key: 'siteName', label: 'Site Name' },
        { key: 'purpose', label: 'Purpose' },
        { key: 'workStatus', label: 'Work Status' },
        { key: 'supervisorName', label: 'Supervisor' },
    ];

    const mapSiteToDialogData = (site: SiteDetailFormData & { fileNo: string; applicantName: string; }, index: number) => ({
        slNo: index + 1,
        fileNo: site.fileNo,
        applicantName: site.applicantName,
        siteName: site.nameOfSite,
        purpose: site.purpose,
        workStatus: site.workStatus,
        supervisorName: site.supervisorName || 'N/A',
    });
    
    if (type === 'ongoing') {
        setMonthDetailDialogTitle("Total Ongoing Works");
        setMonthDetailDialogData(currentMonthStats.ongoingSummary.data.map(mapSiteToDialogData));
    } else {
        setMonthDetailDialogTitle(`Works Completed in ${format(workReportMonth, 'MMMM yyyy')}`);
        setMonthDetailDialogData(currentMonthStats.completedSummary.data.map(mapSiteToDialogData));
    }
    setMonthDetailDialogColumns(columns);
    setIsMonthDetailDialogOpen(true);
  };

  const handleMonthPurposeClick = (
    dataSource: Array<SiteDetailFormData & { fileNo: string; applicantName: string; }>,
    purpose: SitePurpose,
    type: 'Ongoing' | 'Completed'
  ) => {
    const filteredData = dataSource.filter(d => d.purpose === purpose);
    if (filteredData.length === 0) return;

    const title = `${type} '${purpose}' Works`;
    const dialogData = filteredData.map((site, index) => ({
      slNo: index + 1,
      fileNo: site.fileNo,
      applicantName: site.applicantName,
      siteName: site.nameOfSite,
      workStatus: site.workStatus,
      supervisorName: site.supervisorName || 'N/A',
    }));

    const columns: DetailDialogColumn[] = [
      { key: 'slNo', label: 'Sl. No.' },
      { key: 'fileNo', label: 'File No.' },
      { key: 'applicantName', label: 'Applicant Name' },
      { key: 'siteName', label: 'Site Name' },
      { key: 'workStatus', label: 'Work Status' },
      { key: 'supervisorName', label: 'Supervisor' },
    ];
    
    setMonthDetailDialogTitle(title);
    setMonthDetailDialogColumns(columns);
    setMonthDetailDialogData(dialogData);
    setIsMonthDetailDialogOpen(true);
  };


  const handleMonthDialogExcelExport = () => {
    if (monthDetailDialogData.length === 0 || monthDetailDialogColumns.length === 0) {
      toast({ title: "No Data", description: "No data in the dialog to export.", variant: "default" });
      return;
    }
    exportDialogDataToExcel(monthDetailDialogTitle, monthDetailDialogColumns, monthDetailDialogData);
  };

  const handleSupervisorWorkClick = (purpose: string) => {
    if (!supervisorOngoingWorks || supervisorOngoingWorks.totalCount === 0) return;
  
    const filteredWorks = supervisorOngoingWorks.works.filter(work => work.purpose === purpose);
  
    const columns: DetailDialogColumn[] = [
      { key: 'slNo', label: 'Sl. No.' },
      { key: 'fileNo', label: 'File No.' },
      { key: 'applicantName', label: 'Applicant Name' },
      { key: 'siteName', label: 'Site Name' },
      { key: 'workStatus', label: 'Work Status' },
    ];

    const dataWithSlNo = filteredWorks.map((work, index) => ({
      slNo: index + 1,
      ...work
    }));
  
    const selectedSupervisorName = supervisorList.find(s => s.uid === selectedSupervisorId)?.name || "Selected Supervisor";
    setMonthDetailDialogTitle(`Ongoing '${purpose}' Works for ${selectedSupervisorName}`);
    setMonthDetailDialogData(dataWithSlNo);
    setMonthDetailDialogColumns(columns);
    setIsMonthDetailDialogOpen(true);
  };


  if (filteredEntriesLoading || allEntriesLoading || authLoading || usersLoading || staffLoading || !dashboardData || !currentMonthStats) { 
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  const shouldAnimateBirthdays = dashboardData.birthdayWishes.length > 1;
  const shouldAnimateUpdates = dashboardData.workAlerts.length > 5; // Animate only if there are many updates
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-6">
           <Card className="shadow-lg flex flex-col h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                File Status Overview
              </CardTitle>
              <CardDescription>
                Current count of files by status, based on your visible files. Click a status to see details.
              </CardDescription>
              <div className="mt-2">
                <div className="inline-flex items-baseline gap-2 p-3 rounded-lg shadow-sm bg-primary/10 border border-primary/20">
                  <h4 className="text-sm font-medium text-primary">Total Visible Files</h4>
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
                  <p>Calculating age data...</p>
                )}
              </div>
            </CardHeader>
            <CardContent className="mt-auto space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                {dashboardData.fileStatusCountsData.map((item) => (
                  <button
                    key={item.status}
                    className="flex items-center justify-between p-3 rounded-lg border bg-secondary/30 text-left hover:bg-secondary/50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                    onClick={() => handleFileStatusCardClick(item.status)}
                    disabled={item.count === 0}
                  >
                    <span className="text-sm font-medium text-foreground">{item.status}</span>
                    <span className="text-lg font-bold text-primary">{item.count}</span>
                  </button>
                ))}
              </div>
            </CardContent>
           </Card>
        </div>
        
        <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-lg flex flex-col h-full">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                    <Megaphone className="h-5 w-5 text-primary" />
                    Notice Board
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 pt-0 flex-1">
                    <div className="border rounded-lg p-3 bg-background flex-1 flex flex-col">
                        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><Cake className="h-4 w-4 text-pink-500" />Today's Birthdays ({dashboardData.birthdayWishes.length})</h3>
                        <ScrollArea className="flex-1 pr-2">
                            {dashboardData.birthdayWishes.length > 0 ? (
                                <div className="space-y-2">
                                    {dashboardData.birthdayWishes.map((staff, index) => (
                                        <div key={index} className="p-2 rounded-md bg-pink-500/10 mb-2 flex flex-col justify-center">
                                            <p className="font-semibold text-pink-700 text-xs -mb-1">Happy Birthday!</p>
                                            <p className="font-bold text-sm text-pink-800 ">{staff.name}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground italic h-full flex items-center justify-center">No birthdays today.</p>
                            )}
                        </ScrollArea>
                    </div>
                    <div className="border rounded-lg p-3 bg-background flex-1 flex flex-col min-h-0">
                        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><Bell className="h-4 w-4 text-amber-500" /> Important Updates ({dashboardData.workAlerts.length})</h3>
                        <div className={cn("no-scrollbar flex-1 relative", shouldAnimateUpdates && "marquee-v-container")}>
                            {dashboardData.workAlerts.length > 0 ? (
                                <div className={cn("absolute inset-0", shouldAnimateUpdates && "marquee-v-content")}>
                                    {dashboardData.workAlerts.map((alert, index) => (
                                        <div key={index} className="p-2 rounded-md bg-amber-500/10 mb-2">
                                            <p className="font-semibold text-sm text-amber-700">{alert.title}</p>
                                            <p className="text-xs text-amber-600">{alert.details}</p>
                                        </div>
                                    ))}
                                    {shouldAnimateUpdates && dashboardData.workAlerts.map((alert, index) => (
                                        <div key={`clone-${index}`} className="p-2 rounded-md bg-amber-500/10 mb-2" aria-hidden="true">
                                            <p className="font-semibold text-sm text-amber-700">{alert.title}</p>
                                            <p className="text-xs text-amber-600">{alert.details}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground italic h-full flex items-center justify-center">No important updates.</p>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>

       <Card>
          <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Work Status by Service
              </CardTitle>
              <CardDescription>
                Breakdown of application statuses across different service categories (excluding ARS). Click on a number to see detailed reports.
              </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {dashboardData.workStatusByServiceData && dashboardData.workStatusByServiceData.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold whitespace-nowrap">Work Category</TableHead>
                      {[...sitePurposeOptions].filter(p => p !== 'ARS').map(service => (
                          <TableHead key={service} className="text-center font-semibold whitespace-nowrap">
                            { service === 'Pumping Scheme' ? 'Pumping<br/>Scheme' :
                              service === 'BW Dev' ? 'BW<br/>Dev' :
                              service === 'TW Dev' ? 'TW<br/>Dev' :
                              service === 'FPW Dev' ? 'FPW<br/>Dev' :
                              service === 'MWSS Ext' ? 'MWSS<br/>Ext' :
                              service === 'MWSS Pump Reno' ? 'MWSS<br/>Pump<br/>Reno' :
                              service
                            }
                          </TableHead>
                      ))}
                      <TableHead className="text-center font-semibold">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboardData.workStatusByServiceData.map((row) => (
                      <TableRow key={row.statusCategory}>
                        <TableCell className="font-medium whitespace-nowrap">{row.statusCategory}</TableCell>
                        {[...sitePurposeOptions].filter(p => p !== 'ARS').map(service => (
                          <TableCell key={service} className="text-center">
                            {(row as any)[service].count > 0 ? (
                                <Button variant="link" className="p-0 h-auto font-semibold" onClick={() => handleWorkStatusCellClick((row as any)[service].data, `${row.statusCategory} - ${service}`)}>{(row as any)[service].count}</Button>
                            ) : (
                                0
                            )}
                          </TableCell>
                        ))}
                        <TableCell className="text-center font-bold">
                           {(row as any)['total'].count > 0 ? (
                             <Button variant="link" className="p-0 h-auto font-bold" onClick={() => handleWorkStatusCellClick((row as any)['total'].data, `${row.statusCategory} - Total`)}>{(row as any)['total'].count}</Button>
                          ) : (
                            0
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
            ) : (
                <p className="text-center text-muted-foreground py-4">No work status data available for services.</p>
            )}
          </CardContent>
      </Card>
      
      <Card>
          <CardHeader className="flex flex-row items-center justify-between">
              <div>
                  <CardTitle className="flex items-center gap-2">
                      <Waves className="h-5 w-5 text-primary" />
                      ARS Status Overview
                  </CardTitle>
                  <CardDescription>
                      Current count of ARS sites by their work status.
                  </CardDescription>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total ARS Sites</p>
                <p className="text-3xl font-bold text-primary">{dashboardData.totalArsSites}</p>
              </div>
          </CardHeader>
          <CardContent>
              {dashboardData.arsStatusCountsData.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {dashboardData.arsStatusCountsData.map((item) => (
                          <button
                              key={item.status}
                              className="flex items-center justify-between p-3 rounded-lg border bg-secondary/30 text-left hover:bg-secondary/50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                              onClick={() => handleWorkStatusCellClick(item.data, `ARS - ${item.status}`)}
                              disabled={item.count === 0}
                          >
                              <span className="text-sm font-medium text-foreground">{item.status}</span>
                              <span className="text-lg font-bold text-primary">{item.count}</span>
                          </button>
                      ))}
                  </div>
              ) : (
                  <div className="py-10 text-center">
                      <p className="text-muted-foreground">No ARS sites found.</p>
                  </div>
              )}
          </CardContent>
      </Card>
      
      <Card>
          <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                 Finance Overview
              </CardTitle>
              <CardDescription>
                Summary of credits, withdrawals and balance. Defaults to all-time data. Click amounts for details.
              </CardDescription>
            <div className="flex flex-col sm:flex-row flex-wrap items-center gap-2 pt-4 border-t mt-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={"outline"} className={cn("w-full sm:w-[150px] justify-start text-left font-normal", !financeStartDate && "text-muted-foreground")}>
                    <CalendarIconLucide className="mr-2 h-4 w-4" />{financeStartDate ? format(financeStartDate, "dd/MM/yyyy") : "From Date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start" onFocusOutside={handleCalendarInteraction} onPointerDownOutside={handleCalendarInteraction}>
                  <Calendar mode="single" selected={financeStartDate} onSelect={setFinanceStartDate} disabled={(date) => (financeEndDate ? date > financeEndDate : false) || date > new Date()} initialFocus />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={"outline"} className={cn("w-full sm:w-[150px] justify-start text-left font-normal", !financeEndDate && "text-muted-foreground")}>
                    <CalendarIconLucide className="mr-2 h-4 w-4" />{financeEndDate ? format(financeEndDate, "dd/MM/yyyy") : "To Date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start" onFocusOutside={handleCalendarInteraction} onPointerDownOutside={handleCalendarInteraction}>
                  <Calendar mode="single" selected={financeEndDate} onSelect={setFinanceEndDate} disabled={(date) => (financeStartDate ? date < financeStartDate : false) || date > new Date()} initialFocus />
                </PopoverContent>
              </Popover>
               <Button onClick={handleClearFinanceDates} variant="ghost" className="h-9 px-3"><XCircle className="mr-2 h-4 w-4"/>Clear Dates</Button>
              <div className="flex-grow text-sm text-muted-foreground text-center sm:text-right">
                {financeStartDate && financeEndDate ? (
                  <span>Displaying data for period: <strong>{format(financeStartDate, "dd/MM/yyyy")} - {format(financeEndDate, "dd/MM/yyyy")}</strong></span>
                ) : (
                  <span>Displaying all-time financial data.</span>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {financeLoading ? (
                <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : transformedFinanceMetrics ? (
              <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-semibold">Account</TableHead>
                        <TableHead className="text-right font-semibold">
                          <span className="text-green-600">Credit (₹)</span>
                        </TableHead>
                        <TableHead className="text-right font-semibold">
                          <span className="text-red-600">Withdrawal (₹)</span>
                        </TableHead>
                        <TableHead className="text-right font-semibold">
                          <span className="text-blue-600">Balance (₹)</span>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">SBI</TableCell>
                        <TableCell className="text-right">
                          <Button variant="link" className="p-0 h-auto text-green-600" onClick={() => handleAmountClick('SBI', 'credit')} disabled={transformedFinanceMetrics.sbiCredit === 0}>{transformedFinanceMetrics.sbiCredit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Button>
                        </TableCell>
                        <TableCell className="text-right">
                           <Button variant="link" className="p-0 h-auto text-red-600" onClick={() => handleAmountClick('SBI', 'debit')} disabled={transformedFinanceMetrics.sbiDebit === 0}>{transformedFinanceMetrics.sbiDebit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Button>
                        </TableCell>
                        <TableCell className={cn("text-right font-bold", transformedFinanceMetrics.sbiBalance < 0 ? 'text-red-600' : 'text-blue-600')}>{transformedFinanceMetrics.sbiBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">STSB</TableCell>
                        <TableCell className="text-right">
                          <Button variant="link" className="p-0 h-auto text-green-600" onClick={() => handleAmountClick('STSB', 'credit')} disabled={transformedFinanceMetrics.stsbCredit === 0}>{transformedFinanceMetrics.stsbCredit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Button>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="link" className="p-0 h-auto text-red-600" onClick={() => handleAmountClick('STSB', 'debit')} disabled={transformedFinanceMetrics.stsbDebit === 0}>{transformedFinanceMetrics.stsbDebit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Button>
                        </TableCell>
                        <TableCell className={cn("text-right font-bold", transformedFinanceMetrics.stsbBalance < 0 ? 'text-red-600' : 'text-blue-600')}>{transformedFinanceMetrics.stsbBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Revenue Head</TableCell>
                        <TableCell className="text-right">
                          <Button variant="link" className="p-0 h-auto text-green-600" onClick={() => handleAmountClick('RevenueHead', 'credit')} disabled={transformedFinanceMetrics.revenueHeadCredit === 0}>{transformedFinanceMetrics.revenueHeadCredit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Button>
                        </TableCell>
                        <TableCell className="text-right">-</TableCell>
                        <TableCell className={cn("text-right font-bold", transformedFinanceMetrics.revenueHeadBalance < 0 ? 'text-red-600' : 'text-blue-600')}>{transformedFinanceMetrics.revenueHeadBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
            ) : (
              <p>No financial data available.</p>
            )}
           <CardFooter className="text-xs text-muted-foreground pt-4">Note: Withdrawals for SBI/STSB are based on the 'Payment Account' selected for each payment entry. Revenue Head credits include direct remittances and amounts specified in the 'Revenue Head' field of payment details. Balance = Credits - Withdrawals.</CardFooter>
      </CardContent>
      </Card>
      
      <Card>
          <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarCheck className="h-5 w-5 text-primary" />
                 Work Progress for {format(workReportMonth, 'MMMM yyyy')}
              </CardTitle>
              <CardDescription>
                Summary of completed and ongoing work. Select a month to view its report.
              </CardDescription>
             <div className="pt-4 border-t mt-4">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant={"outline"} className="w-[200px] justify-start text-left font-normal">
                      <CalendarIconLucide className="mr-2 h-4 w-4" />{format(workReportMonth, 'MMMM yyyy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={workReportMonth}
                        onSelect={(date) => date && setWorkReportMonth(date)}
                        initialFocus
                        captionLayout="dropdown-buttons"
                        fromYear={2020}
                        toYear={new Date().getFullYear()}
                    />
                  </PopoverContent>
                </Popover>
             </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3 p-4 border rounded-lg bg-secondary/20">
                  <div className="flex justify-between items-center">
                    <h3 className="text-base font-semibold flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-600"/>
                      Completed in {format(workReportMonth, 'MMMM')}
                    </h3>
                    <Button variant="link" className="text-sm p-0 h-auto" onClick={() => handleMonthStatClick('completed')} disabled={(currentMonthStats?.completedSummary.totalCount ?? 0) === 0}>View All ({currentMonthStats?.completedSummary.totalCount ?? 0})</Button>
                  </div>
                  <div className="space-y-2">
                    { currentMonthStats && currentMonthStats.completedSummary.totalCount > 0 ? (
                       <div className="grid grid-cols-2 gap-2">
                         {[...sitePurposeOptions, 'ARS']
                        .filter(purpose => (currentMonthStats.completedSummary.byPurpose[purpose as SitePurpose] || 0) > 0)
                        .map((purpose) => (
                          <button key={purpose} className="flex justify-between items-center text-sm p-2 rounded-md hover:bg-green-100/50" onClick={() => handleMonthPurposeClick(currentMonthStats.completedSummary.data, purpose as SitePurpose, 'Completed')}>
                            <span className="font-medium">{purpose}</span>
                            <span className="font-bold text-green-700">{currentMonthStats.completedSummary.byPurpose[purpose as SitePurpose] || 0}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic text-center py-4">No works completed this month.</p>
                    )}
                  </div>
              </div>

              <div className="space-y-3 p-4 border rounded-lg bg-secondary/20">
                  <div className="flex justify-between items-center">
                    <h3 className="text-base font-semibold flex items-center gap-2">
                      <Hourglass className="h-5 w-5 text-orange-600"/>
                      Total Ongoing Works
                    </h3>
                    <Button variant="link" className="text-sm p-0 h-auto" onClick={() => handleMonthStatClick('ongoing')} disabled={(currentMonthStats?.ongoingSummary.totalCount ?? 0) === 0}>View All ({currentMonthStats?.ongoingSummary.totalCount ?? 0})</Button>
                  </div>
                  <div className="space-y-2">
                    { currentMonthStats && currentMonthStats.ongoingSummary.totalCount > 0 ? (
                       <div className="grid grid-cols-2 gap-2">
                         {[...sitePurposeOptions, 'ARS']
                        .filter(purpose => (currentMonthStats.ongoingSummary.byPurpose[purpose as SitePurpose] || 0) > 0)
                        .map((purpose) => (
                          <button key={purpose} className="flex justify-between items-center text-sm p-2 rounded-md hover:bg-orange-100/50" onClick={() => handleMonthPurposeClick(currentMonthStats.ongoingSummary.data, purpose as SitePurpose, 'Ongoing')}>
                            <span className="font-medium">{purpose}</span>
                            <span className="font-bold text-orange-700">{currentMonthStats.ongoingSummary.byPurpose[purpose as SitePurpose] || 0}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic text-center py-4">No ongoing works found.</p>
                    )}
                  </div>
              </div>
          </CardContent>
      </Card>
        
        { (currentUser?.role === 'editor' || currentUser?.role === 'viewer') && (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        Supervisor's Ongoing Work
                    </CardTitle>
                    <CardDescription>
                        Select a Supervisor to view their assigned ongoing projects by category.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-3 gap-6">
                    <div className="md:col-span-1">
                        <Select onValueChange={setSelectedSupervisorId} value={selectedSupervisorId}>
                            <SelectTrigger>
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
                                    <p className="p-2 text-sm text-muted-foreground">No Supervisors available</p>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="md:col-span-2">
                        { selectedSupervisorId ? (
                            supervisorOngoingWorks.totalCount > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Category</TableHead>
                                            <TableHead className="text-right">Count</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {[...sitePurposeOptions, 'ARS']
                                        .filter(purpose => (supervisorOngoingWorks.byPurpose[purpose as SitePurpose] || 0) > 0)
                                        .map((purpose) => {
                                            const count = supervisorOngoingWorks.byPurpose[purpose as SitePurpose] || 0;
                                            return (
                                                <TableRow key={purpose}>
                                                    <TableCell className="font-medium">{purpose}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Button variant="link" className="p-0 h-auto" onClick={() => handleSupervisorWorkClick(purpose as string)}>
                                                            {count}
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            ) : (
                                <p className="text-muted-foreground italic mt-2">No ongoing works found for this supervisor.</p>
                            )
                        ) : (
                            <p className="text-muted-foreground italic mt-2">Please select a Supervisor to see their work.</p>
                        )}
                    </div>
                </CardContent>
            </Card>
        )}

        { (currentUser?.role === 'editor' || currentUser?.role === 'viewer') && (
            <Card>
              <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    User Activity
                  </CardTitle>
                  <CardDescription>
                   Showing users by their most recent activity (top 5).
                  </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {activeUsers.length > 0 ? (
                  <ul className="space-y-3">
                    {activeUsers.map((usr) => {
                      const staffInfo = staffMembers.find(s => s.id === usr.staffId);
                      const photoUrl = staffInfo?.photoUrl;
                      const avatarColorClass = getColorClass(usr.name || usr.email || 'user');
                      return (
                      <li key={usr.uid} className="flex items-center gap-4 p-2 rounded-lg hover:bg-secondary/50">
                          <Avatar className="h-10 w-10">
                              <AvatarImage src={photoUrl || undefined} alt={usr.name || 'user'} data-ai-hint="person user" />
                              <AvatarFallback className={cn("font-semibold", avatarColorClass)}>{getInitials(usr.name)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                              <div className="flex items-baseline gap-2">
                                <p className="font-semibold text-foreground">{usr.name || usr.email?.split('@')[0]}</p>
                                <Badge variant="outline" className="text-xs">{(usr.role.charAt(0).toUpperCase() + usr.role.slice(1))}</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {usr.lastActiveAt
                                ? <>Last active: {formatDistanceToNow(usr.lastActiveAt, { addSuffix: true })}
                                <span className="hidden sm:inline"> ({format(usr.lastActiveAt, 'dd MMM, p')})</span>
                                </>
                                : (usr.createdAt ? `Registered: ${format(usr.createdAt, 'dd MMM yyyy, p')} (No activity logged)` : 'Activity status unknown')
                                }
                                {!usr.isApproved && (<Badge variant="destructive" className="ml-2">Pending</Badge>)}
                              </p>
                          </div>
                      </li>
                    )})}
                  </ul>
                ) : (
                  <p className="text-muted-foreground italic">No user activity data to display.</p>
                )}
              </CardContent>
            </Card>
        )}
      
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
                      <TableHead key={col.key} className={cn(col.isNumeric && 'text-right')}>{col.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailDialogData.map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {detailDialogColumns.map(col => (
                        <TableCell key={col.key} className={cn('text-xs', col.isNumeric && 'text-right font-mono')}>
                          {row[col.key]}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-8">No details found for the selected criteria.</p>
            )}
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={handleDialogExcelExport} disabled={detailDialogData.length === 0}>
                <FileDown className="mr-2 h-4 w-4" /> Export Excel
            </Button>
            <DialogClose asChild>
              <Button type="button" variant="secondary">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                        <TableHead key={col.key}>{col.label}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ageDetailDialogData.map((row, rowIndex) => (
                      <TableRow key={rowIndex}>
                        {ageDetailDialogColumns.map(col => (
                          <TableCell key={col.key} className="text-xs">
                            {row[col.key]}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">No files found in this age category.</p>
              )}
            </ScrollArea>
            <DialogFooter>
                <Button variant="outline" onClick={handleAgeDialogExcelExport} disabled={ageDetailDialogData.length === 0}>
                   <FileDown className="mr-2 h-4 w-4" /> Export Excel
                </Button>
                <DialogClose asChild>
                  <Button type="button" variant="secondary">Close</Button>
                </DialogClose>
            </DialogFooter>
          </DialogContent>
      </Dialog>
      
      <Dialog open={isMonthDetailDialogOpen} onOpenChange={setIsMonthDetailDialogOpen}>
        <DialogContent className="sm:max-w-4xl">
            <DialogHeader>
                <DialogTitle>{monthDetailDialogTitle}</DialogTitle>
                <DialogDescription>
                  {monthDetailDialogTitle.includes('Ongoing')
                    ? 'List of sites currently in an ongoing work status.'
                    : `List of sites completed in ${format(workReportMonth, 'MMMM yyyy')}.`}
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
                                        <TableCell key={col.key} className="text-xs">
                                            {row[col.key]}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <p className="text-center text-muted-foreground py-8">No details found for this category.</p>
                )}
            </ScrollArea>
            <DialogFooter>
                <Button variant="outline" onClick={handleMonthDialogExcelExport} disabled={monthDetailDialogData.length === 0}>
                    <FileDown className="mr-2 h-4 w-4" /> Export Excel
                </Button>
                 <DialogClose asChild>
                    <Button type="button" variant="secondary">Close</Button>
                </DialogClose>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isFileStatusDetailDialogOpen} onOpenChange={setIsFileStatusDetailDialogOpen}>
        <DialogContent className="sm:max-w-4xl">
            <DialogHeader>
                <DialogTitle>{fileStatusDetailDialogTitle}</DialogTitle>
                <DialogDescription>
                  List of all files matching the selected status.
                </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] pr-4">
                {fileStatusDetailDialogData.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {fileStatusDetailDialogColumns.map(col => (
                                    <TableHead key={col.key}>{col.label}</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {fileStatusDetailDialogData.map((row, rowIndex) => (
                                <TableRow key={rowIndex}>
                                    {monthDetailDialogColumns.map(col => (
                                        <TableCell key={col.key} className="text-xs">
                                            {row[col.key]}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <p className="text-center text-muted-foreground py-8">No files found with this status.</p>
                )}
            </ScrollArea>
            <DialogFooter>
                 <Button variant="outline" onClick={() => exportDialogDataToExcel(fileStatusDetailDialogTitle, fileStatusDetailDialogColumns, fileStatusDetailDialogData)} disabled={fileStatusDetailDialogData.length === 0}>
                   <FileDown className="mr-2 h-4 w-4" /> Export Excel
                </Button>
                <DialogClose asChild>
                  <Button type="button" variant="secondary">Close</Button>
                </DialogClose>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
