// src/app/dashboard/calendar-demo/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { usePageHeader } from "@/hooks/usePageHeader";
import { addDays, format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

export default function CalendarDemoPage() {
  const { setHeader } = usePageHeader();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: addDays(new Date(), 7),
  });

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
      
      <Card>
        <CardHeader>
          <CardTitle>Date Range Picker Demo</CardTitle>
          <CardDescription>
            This calendar style allows for selecting a start and end date, highlighting the range. It's ideal for reports and data filtering.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row items-center justify-center gap-8 pt-6">
           <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={"outline"}
                  className={cn(
                    "w-[300px] justify-start text-left font-normal",
                    !dateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} -{" "}
                        {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
             <div className="text-center">
              <p className="text-sm text-muted-foreground">Selected Range:</p>
              <p className="text-lg font-semibold">
                {dateRange?.from ? format(dateRange.from, "PPP") : "..."}
                <span className="text-sm text-muted-foreground mx-2">to</span>
                {dateRange?.to ? format(dateRange.to, "PPP") : "..."}
              </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
