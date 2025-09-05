// src/app/dashboard/calendar-demo/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { usePageHeader } from "@/hooks/usePageHeader";
import { format } from "date-fns";

export default function CalendarDemoPage() {
  const { setHeader } = usePageHeader();
  const [date, setDate] = useState<Date | undefined>(new Date());

  useEffect(() => {
    setHeader("Calendar Demo", "Showcasing an inline calendar style.");
  }, [setHeader]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Inline Calendar Demo</CardTitle>
          <CardDescription>
            This is an example of an inline calendar. It is always visible on the page, which can be useful for pages where date selection is a primary action.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row items-center justify-center gap-8">
            <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="rounded-md border"
            />
            <div className="text-center">
                <p className="text-sm text-muted-foreground">Selected Date:</p>
                <p className="text-xl font-semibold">{date ? format(date, "PPP") : "No date selected"}</p>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
