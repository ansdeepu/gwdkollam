// src/app/dashboard/calendar-demo/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { usePageHeader } from "@/hooks/usePageHeader";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CalendarDemoPage() {
  const { setHeader } = usePageHeader();
  const [date, setDate] = useState<Date | undefined>(new Date());

  useEffect(() => {
    setHeader("Calendar Demo", "Showcasing different calendar styles.");
  }, [setHeader]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Popover Calendar Picker Demo</CardTitle>
          <CardDescription>
            This calendar is displayed inside a popover, which is triggered by a button. This is useful for forms and filters where space is limited.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row items-center justify-center gap-8 pt-6">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-[280px] justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
           <div className="text-center">
              <p className="text-sm text-muted-foreground">Selected Date:</p>
              <p className="text-xl font-semibold">{date ? format(date, "PPP") : "No date selected"}</p>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Inline Calendar Demo</CardTitle>
          <CardDescription>
            This is an example of an inline calendar. It is always visible on the page, which can be useful for pages where date selection is a primary action.
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
