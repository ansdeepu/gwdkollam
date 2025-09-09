// src/components/dashboard/UserActivity.tsx
"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format } from 'date-fns';
import type { UserProfile } from '@/hooks/useAuth';
import type { StaffMember } from '@/lib/schemas';

interface UserActivityProps {
  allUsers: UserProfile[];
  staffMembers: StaffMember[];
}

export default function UserActivity({ allUsers, staffMembers }: UserActivityProps) {
  const activeUsers = useMemo(() => {
    return [...allUsers]
      .sort((a, b) => {
        const timeA = a.lastActiveAt?.getTime() ?? a.createdAt?.getTime() ?? 0;
        const timeB = b.lastActiveAt?.getTime() ?? b.createdAt?.getTime() ?? 0;
        return timeB - timeA;
      })
      .slice(0, 5);
  }, [allUsers]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" />User Activity</CardTitle>
        <CardDescription>Showing users by their most recent activity (top 5).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeUsers.length > 0 ? (
          <ul className="space-y-3">
            {activeUsers.map((usr) => (
                <li key={usr.uid} className="flex items-center gap-4 p-2 rounded-lg hover:bg-secondary/50">
                  <UserCircle className="h-10 w-10 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <p className="font-semibold text-foreground">{usr.name || usr.email?.split('@')[0]}</p>
                      <Badge variant="outline" className="text-xs">{(usr.role.charAt(0).toUpperCase() + usr.role.slice(1))}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {usr.lastActiveAt ? <>Last active: {formatDistanceToNow(usr.lastActiveAt, { addSuffix: true })}<span className="hidden sm:inline"> ({format(usr.lastActiveAt, 'dd MMM, p')})</span></> : (usr.createdAt ? `Registered: ${format(usr.createdAt, 'dd MMM yyyy, p')} (No activity logged)` : 'Activity status unknown')}
                      {!usr.isApproved && (<Badge variant="destructive" className="ml-2">Pending</Badge>)}
                    </p>
                  </div>
                </li>
              )
            )}
          </ul>
        ) : (<p className="text-muted-foreground italic">No user activity data to display.</p>)}
      </CardContent>
    </Card>
  );
}
