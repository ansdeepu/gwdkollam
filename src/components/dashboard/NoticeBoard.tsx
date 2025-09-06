// src/components/dashboard/NoticeBoard.tsx
"use client";

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Megaphone, Cake, Bell, Gift, PartyPopper } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StaffMember, DataEntryFormData, SiteWorkStatus, Designation } from '@/lib/schemas';
import { isValid, format } from 'date-fns';

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

const getInitials = (name?: string) => {
  if (!name) return 'U';
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
};

interface NoticeBoardProps {
  staffMembers: StaffMember[];
  allFileEntries: DataEntryFormData[];
}

export default function NoticeBoard({ staffMembers, allFileEntries }: NoticeBoardProps) {
  const [selectedBirthday, setSelectedBirthday] = useState<(typeof noticeData.todaysBirthdays)[0] | null>(null);
  
  const noticeData = useMemo(() => {
    const todaysBirthdays: { name: string, designation?: Designation, photoUrl?: string | null }[] = [];
    const upcomingBirthdaysInMonth: { name: string; designation?: Designation; photoUrl?: string | null; dateOfBirth: Date }[] = [];
    const workAlertsMap = new Map<string, { title: string; details: string; }>();
    const siteWorkStatusAlerts: SiteWorkStatus[] = ["To be Refunded", "To be Tendered", "Under Process"];

    const today = new Date();
    const todayMonth = today.getMonth();
    const todayDate = today.getDate();

    for (const staff of staffMembers) {
      if (!staff.dateOfBirth) continue;
      const dob = new Date(staff.dateOfBirth);
      if (isValid(dob)) {
        const dobMonth = dob.getMonth();
        const dobDate = dob.getDate();
        if (dobMonth === todayMonth) {
            if (dobDate === todayDate) {
                todaysBirthdays.push({ name: staff.name, designation: staff.designation, photoUrl: staff.photoUrl });
            } else if (dobDate > todayDate) {
                upcomingBirthdaysInMonth.push({ name: staff.name, designation: staff.designation, photoUrl: staff.photoUrl, dateOfBirth: dob });
            }
        }
      }
    }

    upcomingBirthdaysInMonth.sort((a, b) => a.dateOfBirth.getDate() - b.dateOfBirth.getDate());

    for (const entry of allFileEntries) {
      entry.siteDetails?.forEach(site => {
        if (site.workStatus && siteWorkStatusAlerts.includes(site.workStatus as SiteWorkStatus)) {
          const details = `Site: ${site.nameOfSite || 'Unnamed Site'}, App: ${entry.applicantName}, File: ${entry.fileNo}`;
          const key = `${entry.fileNo}-${site.nameOfSite}-${site.workStatus}`;
          if (!workAlertsMap.has(key)) {
            workAlertsMap.set(key, { title: site.workStatus, details });
          }
        }
      });
    }

    return {
      todaysBirthdays,
      upcomingBirthdays: upcomingBirthdaysInMonth,
      workAlerts: Array.from(workAlertsMap.values()),
    };
  }, [staffMembers, allFileEntries]);

  const shouldAnimateUpdates = noticeData.workAlerts.length > 5;

  return (
    <Card className="shadow-lg flex flex-col h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Megaphone className="h-5 w-5 text-primary" />Notice Board</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-0 flex-1">
        
        <div className="border rounded-lg p-3 bg-background flex flex-col h-[200px]">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><Cake className="h-4 w-4 text-pink-500" />Today's Birthdays ({noticeData.todaysBirthdays.length})</h3>
          <ScrollArea className="flex-1 pr-2">
            {noticeData.todaysBirthdays.length > 0 ? (
              <div className="space-y-3">
                <Dialog open={!!selectedBirthday} onOpenChange={() => setSelectedBirthday(null)}>
                  {noticeData.todaysBirthdays.map((staff, index) => (
                    <button key={index} onClick={() => setSelectedBirthday(staff)} className="w-full p-2 rounded-md bg-pink-500/10 hover:bg-pink-500/20 transition-colors flex items-center gap-3 text-left">
                      <Avatar className="h-10 w-10 border-2 border-pink-200">
                        <AvatarImage src={staff.photoUrl || undefined} alt={staff.name} />
                        <AvatarFallback className="bg-pink-100 text-pink-700 font-bold">{getInitials(staff.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-pink-700 text-xs -mb-1 flex items-center gap-1.5"><Gift className="h-3 w-3" />Happy Birthday!</p>
                        <p className="font-bold text-sm text-pink-800">{staff.name}</p>
                      </div>
                    </button>
                  ))}
                  <DialogContent>
                    <div className="p-4 flex flex-col items-center text-center relative overflow-hidden">
                      <PartyPopper className="absolute top-2 left-4 h-6 w-6 text-yellow-400 -rotate-45" /><PartyPopper className="absolute top-8 right-6 h-5 w-5 text-blue-400 rotate-12" /><PartyPopper className="absolute bottom-6 left-8 h-5 w-5 text-red-400 rotate-6" /><PartyPopper className="absolute bottom-2 right-4 h-6 w-6 text-green-400 -rotate-12" /><PartyPopper className="absolute top-20 left-2 h-4 w-4 text-purple-400 rotate-45" /><PartyPopper className="absolute bottom-20 right-2 h-4 w-4 text-orange-400 -rotate-12" />
                      <Avatar className="h-32 w-32 mb-4 border-2 p-1 border-primary/50 shadow-lg bg-gradient-to-br from-pink-300 via-purple-300 to-indigo-400">
                        <AvatarImage src={selectedBirthday?.photoUrl || undefined} alt={selectedBirthday?.name} />
                        <AvatarFallback className="text-4xl">{getInitials(selectedBirthday?.name)}</AvatarFallback>
                      </Avatar>
                      <h2 className="text-2xl font-bold text-primary">Happy Birthday!</h2>
                      <p className="mt-4 text-foreground">Wishing you a fantastic day filled with joy and celebration!</p>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic h-full flex items-center justify-center">No birthdays today.</p>
            )}
          </ScrollArea>
        </div>
        
        <div className="border rounded-lg p-3 bg-background flex flex-col h-[200px]">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><Gift className="h-4 w-4 text-indigo-500" />Upcoming Birthdays ({noticeData.upcomingBirthdays.length})</h3>
          <ScrollArea className="flex-1 pr-2">
            {noticeData.upcomingBirthdays.length > 0 ? (
              <div className="space-y-2">
                {noticeData.upcomingBirthdays.map((staff, index) => (
                  <div key={index} className="w-full p-2 rounded-md bg-indigo-500/10 flex items-center gap-3 text-left">
                    <Avatar className="h-10 w-10 border-2 border-indigo-200">
                      <AvatarImage src={staff.photoUrl || undefined} alt={staff.name} />
                      <AvatarFallback className="bg-indigo-100 text-indigo-700 font-bold">{getInitials(staff.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-bold text-sm text-indigo-800">{staff.name}</p>
                      <p className="text-xs text-indigo-700">{staff.designation}</p>
                    </div>
                    <div className="text-right">
                       <p className="font-bold text-lg text-indigo-800">{format(staff.dateOfBirth, 'dd')}</p>
                       <p className="text-xs text-indigo-700 -mt-1">{format(staff.dateOfBirth, 'MMM')}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic h-full flex items-center justify-center">No other birthdays this month.</p>
            )}
          </ScrollArea>
        </div>

        <div className="border rounded-lg p-3 bg-background flex-1 flex flex-col min-h-0">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><Bell className="h-4 w-4 text-amber-500" />Important Updates ({noticeData.workAlerts.length})</h3>
          <div className={cn("no-scrollbar flex-1 relative h-full", shouldAnimateUpdates && "marquee-v-container")}>
            <div className={cn("space-y-2 overflow-y-auto", shouldAnimateUpdates && "marquee-v-content", !shouldAnimateUpdates && "h-full")}>
              {noticeData.workAlerts.length > 0 ? (
                <>
                  {noticeData.workAlerts.map((alert, index) => (
                    <div key={index} className="p-2 rounded-md bg-amber-500/10">
                      <p className="font-semibold text-sm text-amber-700">{alert.title}</p>
                      <p className="text-xs text-amber-600">{alert.details}</p>
                    </div>
                  ))}
                  {shouldAnimateUpdates && noticeData.workAlerts.map((alert, index) => (
                    <div key={`clone-${index}`} className="p-2 rounded-md bg-amber-500/10" aria-hidden="true">
                      <p className="font-semibold text-sm text-amber-700">{alert.title}</p>
                      <p className="text-xs text-amber-600">{alert.details}</p>
                    </div>
                  ))}
                </>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-sm text-muted-foreground italic">No important updates.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
