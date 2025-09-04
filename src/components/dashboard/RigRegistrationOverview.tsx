// src/components/dashboard/RigRegistrationOverview.tsx
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileStack, Wrench, CheckCircle, AlertTriangle } from "lucide-react";
import type { AgencyApplication, RigRegistration } from '@/hooks/useAgencyApplications';

interface RigRegistrationOverviewProps {
  data: {
    totalAgencies: number;
    totalRigs: number;
    activeRigs: number;
    expiredRigs: number;
    allAgenciesData: AgencyApplication[];
    allRigsData: (RigRegistration & { agencyName: string; ownerName: string; })[];
    activeRigsData: (RigRegistration & { agencyName: string; ownerName: string; })[];
    expiredRigsData: (RigRegistration & { agencyName: string; ownerName: string; })[];
  };
  onCardClick: (data: any[], title: string) => void;
}

export default function RigRegistrationOverview({ data, onCardClick }: RigRegistrationOverviewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><FileStack className="h-5 w-5 text-primary" />Rig Registration Overview</CardTitle>
        <CardDescription>Summary of all registered rig agencies and their status.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
        </div>
      </CardContent>
    </Card>
  );
}
