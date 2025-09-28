// src/components/dashboard/RigRegistrationOverview.tsx
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileStack, CheckCircle, AlertTriangle, Ban } from "lucide-react";
import type { AgencyApplication, RigRegistration, RigType } from '@/lib/schemas';
import { rigTypeOptions } from '@/lib/schemas';
import { addYears, isValid } from 'date-fns';

interface RigRegistrationOverviewProps {
  agencyApplications: AgencyApplication[];
  onOpenDialog: (data: any[], title: string, columns: any[]) => void;
}

const rigTypeColumns: RigType[] = ["Hand Bore", "Filter Point Rig", "Calyx Rig", "Rotary Rig", "DTH Rig", "Rotary cum DTH Rig"];

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

const StatusCard = ({ title, icon: Icon, totalData, breakdownData, onOpenDialog, rigTypes, cardClass }: { title: string, icon: React.ElementType, totalData: any, breakdownData: any, onOpenDialog: any, rigTypes: RigType[], cardClass: string }) => {
  const handleTotalClick = () => {
    onOpenDialog(totalData.data, `Total ${title}`, []);
  };

  const handleTypeClick = (type: RigType) => {
    onOpenDialog(breakdownData[type].data, `${title} - ${type}`, []);
  };

  return (
    <Card className={cardClass}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-6 w-6" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center mb-4">
          <button onClick={handleTotalClick} disabled={totalData.count === 0} className="disabled:cursor-not-allowed">
            <p className="text-5xl font-bold">{totalData.count}</p>
            <p className="text-sm text-muted-foreground">Total Rigs</p>
          </button>
        </div>
        <div className="space-y-2">
          {rigTypes.map(type => (
            <button key={type} onClick={() => handleTypeClick(type)} disabled={breakdownData[type].count === 0} className="w-full flex justify-between items-center p-2 rounded-md hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed text-sm">
              <span className="font-medium">{type}</span>
              <span className="font-bold">{breakdownData[type].count}</span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};


export default function RigRegistrationOverview({ agencyApplications, onOpenDialog }: RigRegistrationOverviewProps) {

  const summaryData = React.useMemo(() => {
    const initialCounts = () => rigTypeColumns.reduce((acc, type) => ({ ...acc, [type]: { count: 0, data: [] } }), {} as Record<RigType, { count: number; data: any[] }>);
    
    const activeRigs = initialCounts();
    const expiredRigs = initialCounts();
    const cancelledRigs = initialCounts();
    let totalAgencies = 0;
    
    const completedApps = agencyApplications.filter(app => app.status === 'Active');
    totalAgencies = completedApps.length;

    completedApps.forEach(app => {
        (app.rigs || []).forEach(rig => {
            const rigWithContext = { ...rig, agencyName: app.agencyName, ownerName: app.owner.name };
            const rigType = rig.typeOfRig;
            if (!rigType || !rigTypeColumns.includes(rigType)) return;

            if (rig.status === 'Active') {
                const lastEffectiveDate = rig.renewals && rig.renewals.length > 0
                    ? [...rig.renewals].sort((a, b) => (safeParseDate(b.renewalDate)?.getTime() ?? 0) - (safeParseDate(a.renewalDate)?.getTime() ?? 0))[0].renewalDate
                    : rig.registrationDate;

                if (lastEffectiveDate) {
                    const validityDate = new Date(addYears(new Date(lastEffectiveDate), 1).getTime() - 24 * 60 * 60 * 1000);
                    if (isValid(validityDate) && new Date() > validityDate) {
                        expiredRigs[rigType].count++;
                        expiredRigs[rigType].data.push(rigWithContext);
                    } else {
                        activeRigs[rigType].count++;
                        activeRigs[rigType].data.push(rigWithContext);
                    }
                } else {
                     activeRigs[rigType].count++;
                     activeRigs[rigType].data.push(rigWithContext);
                }
            } else if (rig.status === 'Cancelled') {
                cancelledRigs[rigType].count++;
                cancelledRigs[rigType].data.push(rigWithContext);
            }
        });
    });

    const calculateTotal = (data: Record<RigType, { count: number; data: any[] }>) => ({
        count: rigTypeColumns.reduce((sum, type) => sum + data[type].count, 0),
        data: rigTypeColumns.flatMap(type => data[type].data)
    });
    
    return {
        activeRigs,
        expiredRigs,
        cancelledRigs,
        activeTotal: calculateTotal(activeRigs),
        expiredTotal: calculateTotal(expiredRigs),
        cancelledTotal: calculateTotal(cancelledRigs),
    };

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
            <CardTitle className="flex items-center gap-2"><FileStack className="h-5 w-5 text-primary" />Abstract Details (Rig Registration)</CardTitle>
            <CardDescription>A summary of all registered rigs by their current status.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatusCard
                title="Active Rigs"
                icon={CheckCircle}
                totalData={summaryData.activeTotal}
                breakdownData={summaryData.activeRigs}
                onOpenDialog={handleCellClick}
                rigTypes={rigTypeColumns}
                cardClass="border-green-500/50 bg-green-500/5 text-green-700"
            />
            <StatusCard
                title="Expired Rigs"
                icon={AlertTriangle}
                totalData={summaryData.expiredTotal}
                breakdownData={summaryData.expiredRigs}
                onOpenDialog={handleCellClick}
                rigTypes={rigTypeColumns}
                cardClass="border-amber-500/50 bg-amber-500/5 text-amber-700"
            />
            <StatusCard
                title="Cancelled Rigs"
                icon={Ban}
                totalData={summaryData.cancelledTotal}
                breakdownData={summaryData.cancelledRigs}
                onOpenDialog={handleCellClick}
                rigTypes={rigTypeColumns}
                cardClass="border-red-500/50 bg-red-500/5 text-red-700"
            />
        </CardContent>
    </Card>
  );
}
