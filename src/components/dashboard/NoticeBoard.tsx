// src/components/dashboard/NoticeBoard.tsx
"use client";

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { StaffMember, Designation } from '@/lib/schemas';
import { isValid, format } from 'date-fns';

const Megaphone = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>
);
const Cake = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h16c1.1 0 2 .9 2 2v10c0 1.1-.9 2-2 2"/><path d="M16 16.5a2.5 2.5 0 1 1-5 0"/><path d="M12 8v4"/><path d="M12 4h.01"/></svg>
);
const Gift = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 5a4.8 8 0 0 1 4.5-2 2.5 2.5 0 0 1 0 5"/></svg>
);
const PartyPopper = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M19.65 12.35a2.12 2.12 0 0 1 0 3l-2.82 2.83a2.12 2.12 0 0 1-3 0L3.3 6.6a2.12 2.12 0 0 1 0-3l2.83-2.83a2.12 2.12 0 0 1 3 0l10.52 10.53z"/><path d="m13.41 12 4.25 4.24"/><path d="m6.12 5.12 1.41-1.42"/><path d="m3.3 20.7-.7-.7"/><path d="M12 22v-3.5"/><path d="M7.05 7.05 17 17"/><path d="m9 11 1 1"/><path d="M4 14h.01"/><path d="M20 9h.01"/><path d="m21.12 3.88.7.7"/><path d="M12.5 3.5c.3.3.5.7.7 1.1"/><path d="M3.5 12.5c.3-.3.7-.5 1.1-.7"/></svg>
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

const getInitials = (name?: string) => {
  if (!name) return 'U';
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
};

interface NoticeBoardProps {
  staffMembers: StaffMember[];
}

export default function NoticeBoard({ staffMembers }: NoticeBoardProps) {
  const [selectedBirthday, setSelectedBirthday] = useState<(typeof noticeData.todaysBirthdays)[0] | null>(null);
  
  const noticeData = useMemo(() => {
    const todaysBirthdays: { name: string, designation?: Designation, photoUrl?: string | null }[] = [];
    const upcomingBirthdaysInMonth: { name: string; designation?: Designation; photoUrl?: string | null; dateOfBirth: Date }[] = [];

    const today = new Date();
    const todayMonth = today.getMonth();
    const todayDate = today.getDate();
    
    const activeStaff = staffMembers.filter(s => s.status === 'Active');

    for (const staff of activeStaff) {
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

    return {
      todaysBirthdays,
      upcomingBirthdays: upcomingBirthdaysInMonth,
    };
  }, [staffMembers]);
  
  const enableTodayScrolling = noticeData.todaysBirthdays.length > 2;
  const enableUpcomingScrolling = noticeData.upcomingBirthdays.length > 3;
  const todayBirthdayList = enableTodayScrolling ? [...noticeData.todaysBirthdays, ...noticeData.todaysBirthdays] : noticeData.todaysBirthdays;
  const upcomingBirthdayList = enableUpcomingScrolling ? [...noticeData.upcomingBirthdays, ...noticeData.upcomingBirthdays] : noticeData.upcomingBirthdays;


  return (
    <Card className="shadow-lg flex flex-col h-[450px]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Megaphone className="h-5 w-5 text-primary" />Birthday Updates</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4 pt-0 min-h-0">
        <Dialog open={!!selectedBirthday} onOpenChange={(isOpen) => !isOpen && setSelectedBirthday(null)}>
          <div className={cn("border rounded-lg p-3 bg-background flex flex-col")}>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><Cake className="h-4 w-4 text-pink-500" />Today's Birthdays ({noticeData.todaysBirthdays.length})</h3>
            <div className={cn("pr-3", enableTodayScrolling ? "h-28 marquee-container-birthdays" : "h-auto")}>
              {todayBirthdayList.length > 0 ? (
                <div className={cn("space-y-3", enableTodayScrolling && "marquee-content-birthdays")}>
                  {todayBirthdayList.map((staff, index) => (
                    <DialogTrigger key={index} asChild>
                      <button onClick={() => setSelectedBirthday(staff)} className="w-full p-2 rounded-md bg-pink-500/10 hover:bg-pink-500/20 transition-colors flex items-center gap-3 text-left">
                        <Avatar className="h-10 w-10 border-2 border-pink-200">
                          <AvatarImage src={staff.photoUrl || undefined} alt={staff.name} />
                          <AvatarFallback className="bg-pink-100 text-pink-700 font-bold">{getInitials(staff.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-pink-700 text-xs -mb-1 flex items-center gap-1.5"><Gift className="h-3 w-3" />Happy Birthday!</p>
                          <p className="font-bold text-sm text-pink-800">{staff.name}</p>
                        </div>
                      </button>
                    </DialogTrigger>
                  ))}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center py-6">
                  <p className="text-sm text-muted-foreground italic">No birthdays today.</p>
                </div>
              )}
            </div>
          </div>
          <DialogContent>
            <div className="p-4 flex flex-col items-center text-center relative overflow-hidden">
                <PartyPopper className="absolute top-2 left-4 h-6 w-6 text-yellow-400 -rotate-45" />
                <PartyPopper className="absolute top-8 right-6 h-5 w-5 text-blue-400 rotate-12" />
                <PartyPopper className="absolute bottom-6 left-8 h-5 w-5 text-red-400 rotate-6" />
                <PartyPopper className="absolute bottom-2 right-4 h-6 w-6 text-green-400 -rotate-12" />
                <PartyPopper className="absolute top-20 left-2 h-4 w-4 text-purple-400 rotate-45" />
                <PartyPopper className="absolute bottom-20 right-2 h-4 w-4 text-orange-400 -rotate-12" />
                <div className="relative z-10 flex flex-col items-center">
                    <Avatar className="h-32 w-32 mb-4 border-2 p-1 border-primary/50 shadow-lg bg-gradient-to-br from-pink-300 via-purple-300 to-indigo-400">
                      <AvatarImage src={selectedBirthday?.photoUrl || undefined} alt={selectedBirthday?.name} />
                      <AvatarFallback className="text-4xl">{getInitials(selectedBirthday?.name)}</AvatarFallback>
                    </Avatar>
                    <h2 className="text-2xl font-bold text-primary">Happy Birthday!</h2>
                    <p className="mt-4 text-foreground">Wishing you a fantastic day filled with joy and celebration!</p>
                </div>
            </div>
          </DialogContent>
        </Dialog>
        
        <div className={cn("border rounded-lg p-3 bg-background flex flex-col flex-1 min-h-0")}>
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><Gift className="h-4 w-4 text-indigo-500" />Upcoming Birthdays ({noticeData.upcomingBirthdays.length})</h3>
           <ScrollArea className="flex-1 pr-3 -mr-3">
             <div className={cn("space-y-2", enableUpcomingScrolling && "marquee-container-birthdays")}>
               <div className={cn("space-y-2", enableUpcomingScrolling && "marquee-content-birthdays")}>
                  {upcomingBirthdayList.length > 0 ? (
                      upcomingBirthdayList.map((staff, index) => (
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
                      ))
                  ) : (
                      <div className="h-full flex items-center justify-center">
                          <p className="text-sm text-muted-foreground italic">No other birthdays this month.</p>
                      </div>
                  )}
                </div>
              </div>
           </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
