// src/components/dashboard/NoticeBoard.tsx
"use client";

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Megaphone, Cake, Gift, PartyPopper, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StaffMember, Designation } from '@/lib/schemas';
import { isValid, format } from 'date-fns';

interface NoticeBoardProps {
  staffMembers: StaffMember[];
}

export default function NoticeBoard({ staffMembers }: NoticeBoardProps) {
  const [selectedBirthday, setSelectedBirthday] = useState<(typeof noticeData.todaysBirthdays)[0] | null>(null);
  
  const noticeData = useMemo(() => {
    const todaysBirthdays: { name: string, designation?: Designation }[] = [];
    const upcomingBirthdaysInMonth: { name: string; designation?: Designation; dateOfBirth: Date }[] = [];

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
                todaysBirthdays.push({ name: staff.name, designation: staff.designation });
            } else if (dobDate > todayDate) {
                upcomingBirthdaysInMonth.push({ name: staff.name, designation: staff.designation, dateOfBirth: dob });
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

  const shouldAnimateBirthdays = noticeData.upcomingBirthdays.length > 2;

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
                      <UserCircle className="h-10 w-10 text-pink-300" />
                      <div>
                        <p className="font-semibold text-pink-700 text-xs -mb-1 flex items-center gap-1.5"><Gift className="h-3 w-3" />Happy Birthday!</p>
                        <p className="font-bold text-sm text-pink-800">{staff.name}</p>
                      </div>
                    </button>
                  ))}
                  <DialogContent>
                    <div className="p-4 flex flex-col items-center text-center relative overflow-hidden">
                      <PartyPopper className="absolute top-2 left-4 h-6 w-6 text-yellow-400 -rotate-45" /><PartyPopper className="absolute top-8 right-6 h-5 w-5 text-blue-400 rotate-12" /><PartyPopper className="absolute bottom-6 left-8 h-5 w-5 text-red-400 rotate-6" /><PartyPopper className="absolute bottom-2 right-4 h-6 w-6 text-green-400 -rotate-12" /><PartyPopper className="absolute top-20 left-2 h-4 w-4 text-purple-400 rotate-45" /><PartyPopper className="absolute bottom-20 right-2 h-4 w-4 text-orange-400 -rotate-12" />
                      <UserCircle className="h-32 w-32 mb-4 text-primary/50" />
                      <h2 className="text-2xl font-bold text-primary">Happy Birthday, {selectedBirthday?.name}!</h2>
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
        
        <div className={cn("border rounded-lg p-3 bg-background flex flex-col h-[200px] overflow-hidden", shouldAnimateBirthdays && "marquee-v-container")}>
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><Gift className="h-4 w-4 text-indigo-500" />Upcoming Birthdays ({noticeData.upcomingBirthdays.length})</h3>
           <div className={cn("flex-1", !shouldAnimateBirthdays && "overflow-y-auto no-scrollbar")}>
              <div className={cn("space-y-2", shouldAnimateBirthdays && "marquee-v-content")}>
                {noticeData.upcomingBirthdays.length > 0 ? (
                  <>
                    {noticeData.upcomingBirthdays.map((staff, index) => (
                      <div key={index} className="w-full p-2 rounded-md bg-indigo-500/10 flex items-center gap-3 text-left">
                        <UserCircle className="h-10 w-10 text-indigo-300" />
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
                     {shouldAnimateBirthdays && noticeData.upcomingBirthdays.map((staff, index) => (
                      <div key={`clone-${index}`} className="w-full p-2 rounded-md bg-indigo-500/10 flex items-center gap-3 text-left" aria-hidden="true">
                        <UserCircle className="h-10 w-10 text-indigo-300" />
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
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground italic h-full flex items-center justify-center">No other birthdays this month.</p>
                )}
              </div>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
