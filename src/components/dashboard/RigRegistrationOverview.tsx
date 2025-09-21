// src/components/dashboard/RigRegistrationOverview.tsx
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileStack, Wrench, CheckCircle, AlertTriangle, Ban } from "lucide-react";
import type { AgencyApplication, RigRegistration, RigType } from '@/lib/schemas';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

interface RigRegistrationOverviewProps {
  data: {
    totalAgencies: number;
    totalRigs: number;
    activeRigs: number;
    expiredRigs: number;
    cancelledRigs: number;
    allAgenciesData: AgencyApplication[];
    allRigsData: (RigRegistration & { agencyName: string; ownerName: string; })[];
    activeRigsData: (RigRegistration & { agencyName: string; ownerName: string; })[];
    expiredRigsData: (RigRegistration & { agencyName: string; ownerName: string; })[];
    cancelledRigsData: (RigRegistration & { agencyName: string; ownerName: string; })[];
  };
  onCardClick: (data: any[], title: string) => void;
}

const rigTypeColumns: RigType[] = ["Hand Bore", "Filter Point Rig", "Calyx Rig", "Rotary Rig", "DTH Rig", "Rotary cum DTH Rig"];

export default function RigRegistrationOverview({ data, onCardClick }: RigRegistrationOverviewProps) {

  const abstractData = React.useMemo(() => {
    const counts: Record<RigType, number> = {
      "Hand Bore": 0,
      "Filter Point Rig": 0,
      "Calyx Rig": 0,
      "Rotary Rig": 0,
      "DTH Rig": 0,
      "Rotary cum DTH Rig": 0,
    };

    // Only count active rigs for the abstract breakdown
    data.activeRigsData.forEach(rig => {
      if (rig.typeOfRig && rigTypeColumns.includes(rig.typeOfRig)) {
        counts[rig.typeOfRig]++;
      }
    });

    return counts;
  }, [data.activeRigsData]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><FileStack className="h-5 w-5 text-primary" />Rig Registration Overview</CardTitle>
        <CardDescription>Summary of all registered rig agencies and their status.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <button onClick={() => onCardClick(data.allAgenciesData, 'Total Agencies')} disabled={data.totalAgencies === 0} className="p-4 border rounded-lg bg-secondary/30 text-center hover:bg-secondary/40 transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
            <FileStack className="h-8 w-8 text-primary mx-auto mb-2" /><p className="text-3xl font-bold">{data.totalAgencies}</p><p className="text-sm font-medium text-muted-foreground">Total Agencies</p>
          </button>
          <button onClick={() => onCardClick(data.allRigsData, 'Total Rigs')} disabled={data.totalRigs === 0} className="p-4 border rounded-lg bg-secondary/30 text-center hover:bg-secondary/40 transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
            <Wrench className="h-8 w-8 text-primary mx-auto mb-2" /><p className="text-3xl font-bold">{data.totalRigs}</p><p className="text-sm font-medium text-muted-foreground">Total Rigs</p>
          </button>
          <button onClick={() => onCardClick(data.activeRigsData, 'Active Rigs')} disabled={data.activeRigs === 0} className="p-4 border rounded-lg bg-green-500/10 text-center hover:bg-green-500/20 transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
            <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" /><p className="text-3xl font-bold text-green-700">{data.activeRigs}</p><p className="text-sm font-medium text-green-800">Active Rigs</p>
          </button>
          <button onClick={() => onCardClick(data.expiredRigsData, 'Expired Rigs')} disabled={data.expiredRigs === 0} className="p-4 border rounded-lg bg-amber-500/10 text-center hover:bg-amber-500/20 transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
            <AlertTriangle className="h-8 w-8 text-amber-600 mx-auto mb-2" /><p className="text-3xl font-bold text-amber-700">{data.expiredRigs}</p><p className="text-sm font-medium text-amber-800">Expired Rigs</p>
          </button>
          <button onClick={() => onCardClick(data.cancelledRigsData, 'Cancelled Rigs')} disabled={data.cancelledRigs === 0} className="p-4 border rounded-lg bg-red-500/10 text-center hover:bg-red-500/20 transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
            <Ban className="h-8 w-8 text-red-600 mx-auto mb-2" /><p className="text-3xl font-bold text-red-700">{data.cancelledRigs}</p><p className="text-sm font-medium text-red-800">Cancelled Rigs</p>
          </button>
        </div>
        
        <div className="pt-6 border-t">
            <h4 className="text-base font-semibold text-primary mb-2">Abstract Details (Active Rigs)</h4>
            <div className="border rounded-lg overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-secondary/50">
                            {rigTypeColumns.map(type => (
                                <TableHead key={type} className="text-center font-bold">{type}</TableHead>
                            ))}
                            <TableHead className="text-center font-bold">Total Active Rigs</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow>
                            {rigTypeColumns.map(type => (
                                <TableCell key={type} className="text-center font-semibold text-lg">{abstractData[type]}</TableCell>
                            ))}
                            <TableCell className="text-center font-semibold text-lg">{data.activeRigs}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>
        </div>

      </CardContent>
    </Card>
  );
}
