// src/components/dashboard/RigRegistrationOverview.tsx
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertTriangle, Ban, FileStack } from "lucide-react";
import type { AgencyApplication, RigType } from '@/lib/schemas';
import { rigTypeOptions } from '@/lib/schemas';
import { addYears, isValid } from 'date-fns';
import { cn } from '@/lib/utils';

interface RigRegistrationOverviewProps {
  agencyApplications: AgencyApplication[];
  onOpenDialog: (data: any[], title: string, columns: any[]) => void;
}

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

const StatusCard = ({
  title,
  icon: Icon,
  totalCount,
  rigData,
  onTotalClick,
  onTypeClick,
  className,
  iconClassName
}: {
  title: string;
  icon: React.ElementType;
  totalCount: number;
  rigData: Record<RigType, { count: number; data: any[] }>;
  onTotalClick: () => void;
  onTypeClick: (type: RigType) => void;
  className?: string;
  iconClassName?: string;
}) => {
  const hasData = rigTypeOptions.some(type => rigData[type]?.count > 0);

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={cn("h-4 w-4 text-muted-foreground", iconClassName)} />
      </CardHeader>
      <CardContent>
        <Button
          variant="link"
          className="text-4xl font-bold p-0 h-auto"
          onClick={onTotalClick}
          disabled={totalCount === 0}
        >
          {totalCount}
        </Button>
        <div className="mt-4 space-y-2">
            {hasData ? rigTypeOptions.map(type => {
                const count = rigData[type]?.count || 0;
                if (count === 0) return null;
                return (
                    <div key={type} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{type}</span>
                        <Button variant="link" className="p-0 h-auto text-xs font-semibold" onClick={() => onTypeClick(type)} disabled={count === 0}>
                            {count}
                        </Button>
                    </div>
                )
            }) : <p className="text-xs text-muted-foreground italic text-center pt-4">No rigs in this category.</p>}
        </div>
      </CardContent>
    </Card>
  );
};


export default function RigRegistrationOverview({ agencyApplications, onOpenDialog }: RigRegistrationOverviewProps) {

  const summaryData = React.useMemo(() => {
    const initialCounts = () => ({
        active: { count: 0, data: [] as any[] },
        expired: { count: 0, data: [] as any[] },
        cancelled: { count: 0, data: [] as any[] },
    });
    
    const rigData = rigTypeOptions.reduce((acc, type) => ({ ...acc, [type]: initialCounts() }), {} as Record<RigType, ReturnType<typeof initialCounts>>);

    const completedApps = agencyApplications.filter(app => app.status === 'Active');

    completedApps.forEach(app => {
        (app.rigs || []).forEach(rig => {
            const rigWithContext = { ...rig, agencyName: app.agencyName, ownerName: app.owner.name };
            const rigType = rig.typeOfRig;
            if (!rigType || !rigTypeOptions.includes(rigType)) return;

            if (rig.status === 'Active') {
                const lastEffectiveDate = rig.renewals && rig.renewals.length > 0
                    ? [...rig.renewals].sort((a, b) => (safeParseDate(b.renewalDate)?.getTime() ?? 0) - (safeParseDate(a.renewalDate)?.getTime() ?? 0))[0].renewalDate
                    : rig.registrationDate;

                if (lastEffectiveDate) {
                    const validityDate = new Date(addYears(new Date(lastEffectiveDate), 1).getTime() - 24 * 60 * 60 * 1000);
                    if (isValid(validityDate) && new Date() > validityDate) {
                        rigData[rigType].expired.count++;
                        rigData[rigType].expired.data.push(rigWithContext);
                    } else {
                        rigData[rigType].active.count++;
                        rigData[rigType].active.data.push(rigWithContext);
                    }
                } else {
                     rigData[rigType].active.count++;
                     rigData[rigType].active.data.push(rigWithContext);
                }
            } else if (rig.status === 'Cancelled') {
                rigData[rigType].cancelled.count++;
                rigData[rigType].cancelled.data.push(rigWithContext);
            }
        });
    });

    const totals = {
      active: rigTypeOptions.reduce((sum, type) => sum + rigData[type].active.count, 0),
      expired: rigTypeOptions.reduce((sum, type) => sum + rigData[type].expired.count, 0),
      cancelled: rigTypeOptions.reduce((sum, type) => sum + rigData[type].cancelled.count, 0),
    };

    const totalData = {
        active: rigTypeOptions.flatMap(type => rigData[type].active.data),
        expired: rigTypeOptions.flatMap(type => rigData[type].expired.data),
        cancelled: rigTypeOptions.flatMap(type => rigData[type].cancelled.data),
    };
    
    const byStatus = {
        active: rigTypeOptions.reduce((acc, type) => ({...acc, [type]: {count: rigData[type].active.count, data: rigData[type].active.data}}), {} as Record<RigType, { count: number; data: any[] }>),
        expired: rigTypeOptions.reduce((acc, type) => ({...acc, [type]: {count: rigData[type].expired.count, data: rigData[type].expired.data}}), {} as Record<RigType, { count: number; data: any[] }>),
        cancelled: rigTypeOptions.reduce((acc, type) => ({...acc, [type]: {count: rigData[type].cancelled.count, data: rigData[type].cancelled.data}}), {} as Record<RigType, { count: number; data: any[] }>),
    };

    return { totals, totalData, byStatus };
  }, [agencyApplications]);
  
  const handleCellClick = (data: any[], title: string) => {
    const columns = [
        { key: 'slNo', label: 'Sl. No.' },
        { key: 'agencyName', label: 'Agency Name' },
        { key: 'ownerName', label: 'Owner' },
        { key: 'regNo', label: 'Rig Reg. No.' },
        { key: 'typeOfRig', label: 'Type of Rig' },
        { key: 'validity', label: 'Validity Upto' },
    ];
    
    const dialogData = data.map((item, index) => {
        let validity = 'N/A';
        if (item.status === 'Active') {
            const lastDate = item.renewals?.length > 0 ? [...item.renewals].sort((a: any, b: any) => (safeParseDate(b.renewalDate)?.getTime() ?? 0) - (safeParseDate(a.renewalDate)?.getTime() ?? 0))[0].renewalDate : item.registrationDate;
            if(lastDate) {
                const validityDate = new Date(addYears(new Date(lastDate), 1).getTime() - 24 * 60 * 60 * 1000);
                if (isValid(validityDate)) validity = validityDate.toLocaleDateString('en-IN');
            }
        } else if (item.status === 'Cancelled') {
            validity = 'Cancelled';
        }
        return {
            slNo: index + 1,
            agencyName: item.agencyName,
            ownerName: item.ownerName,
            regNo: item.rigRegistrationNo || 'N/A',
            typeOfRig: item.typeOfRig || 'N/A',
            validity,
        };
    });

    onOpenDialog(dialogData, title, columns);
  };

  return (
     <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileStack className="h-5 w-5 text-primary" />Rig Registration Overview</CardTitle>
            <CardDescription>A summary of all registered rigs by type and current status.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
           <StatusCard
                title="Active Rigs"
                icon={CheckCircle}
                totalCount={summaryData.totals.active}
                rigData={summaryData.byStatus.active}
                onTotalClick={() => handleCellClick(summaryData.totalData.active, "All Active Rigs")}
                onTypeClick={(type) => handleCellClick(summaryData.byStatus.active[type].data, `Active - ${type}`)}
                className="border-green-500/50 bg-green-500/5"
                iconClassName="text-green-600"
            />
            <StatusCard
                title="Expired Rigs"
                icon={AlertTriangle}
                totalCount={summaryData.totals.expired}
                rigData={summaryData.byStatus.expired}
                onTotalClick={() => handleCellClick(summaryData.totalData.expired, "All Expired Rigs")}
                onTypeClick={(type) => handleCellClick(summaryData.byStatus.expired[type].data, `Expired - ${type}`)}
                className="border-amber-500/50 bg-amber-500/5"
                iconClassName="text-amber-600"
            />
            <StatusCard
                title="Cancelled Rigs"
                icon={Ban}
                totalCount={summaryData.totals.cancelled}
                rigData={summaryData.byStatus.cancelled}
                onTotalClick={() => handleCellClick(summaryData.totalData.cancelled, "All Cancelled Rigs")}
                onTypeClick={(type) => handleCellClick(summaryData.byStatus.cancelled[type].data, `Cancelled - ${type}`)}
                className="border-red-500/50 bg-red-500/5"
                iconClassName="text-red-600"
            />
        </CardContent>
    </Card>
  );
}
