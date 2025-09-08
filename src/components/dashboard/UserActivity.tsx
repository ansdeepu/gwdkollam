
// src/components/dashboard/UserActivity.tsx
"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format } from 'date-fns';
import type { UserProfile } from '@/hooks/useAuth';
import type { StaffMember } from '@/lib/schemas';

const hashCode = (str: string): number => { let hash = 0; for (let i = 0; i < str.length; i++) { const char = str.charCodeAt(i); hash = (hash << 5) - hash + char; hash |= 0; } return hash; };
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
const getInitials = (name?: string) => { if (!name) return 'U'; return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase(); };

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
            {activeUsers.map((usr) => {
              const staffInfo = staffMembers.find(s => s.id === usr.staffId);
              const photoUrl = staffInfo?.photoUrl;
              const avatarColorClass = getColorClass(usr.name || usr.email || 'user');
              return (
                <li key={usr.uid} className="flex items-center gap-4 p-2 rounded-lg hover:bg-secondary/50">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={photoUrl || usr.photoUrl || undefined} alt={usr.name || 'user'} data-ai-hint="person user" />
                    <AvatarFallback className={cn("font-semibold", avatarColorClass)}>{getInitials(usr.name)}</AvatarFallback>
                  </Avatar>
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
            })}
          </ul>
        ) : (<p className="text-muted-foreground italic">No user activity data to display.</p>)}
      </CardContent>
    </Card>
  );
}
