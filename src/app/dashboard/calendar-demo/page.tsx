// src/app/dashboard/calendar-demo/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { usePageHeader } from "@/hooks/usePageHeader";

export default function CalendarDemoPage() {
  const { setHeader } = usePageHeader();
  const [date, setDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    setHeader("Calendar Demo", "A simple, clean calendar implementation.");
    // Set initial date on the client to avoid hydration mismatch
    setDate(new Date());
  }, [setHeader]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basic Inline Calendar</CardTitle>
          <CardDescription>
            This is a standard inline calendar, always visible on the page.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center pt-6">
            <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="rounded-md border"
            />
        </CardContent>
      </Card>
    </div>
  );
}
