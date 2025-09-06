// src/app/dashboard/calendar-demo/page.tsx
"use client";

import { useState, useEffect } from "react";
import { addDays, format, isValid } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { usePageHeader } from "@/hooks/usePageHeader";

export default function CalendarDemoPage() {
  const { setHeader } = usePageHeader();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: addDays(new Date(), 7),
  });

  useEffect(() => {
    setHeader("Calendar Demo", "A demonstration of different calendar styles and functionalities.");
  }, [setHeader]);

  const css = `
  .day-saturday { 
    color: #1a73e8; /* Blue for Saturdays */
    font-weight: bold;
  }
  `;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Card 1: Basic Inline Calendar */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Inline Calendar</CardTitle>
          <CardDescription>A simple, non-interactive calendar display.</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            className="rounded-md border"
          />
        </CardContent>
      </Card>

      {/* Card 2: Popover Calendar Picker */}
      <Card>
        <CardHeader>
          <CardTitle>Popover Calendar Picker</CardTitle>
          <CardDescription>A date picker that appears in a popover.</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center pt-8">
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
        </CardContent>
      </Card>

      {/* Card 3: Date Range Picker */}
      <Card>
        <CardHeader>
          <CardTitle>Date Range Picker</CardTitle>
          <CardDescription>Select a start and end date.</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center pt-8">
           <div className="grid gap-2">
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
                    <span>Pick a date</span>
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
          </div>
        </CardContent>
      </Card>
      
      {/* Card 4: Custom Styled Days */}
      <Card>
        <CardHeader>
          <CardTitle>Custom Styled Days</CardTitle>
          <CardDescription>Highlighting weekends with custom styles.</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
            <style>{css}</style>
            <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                modifiersClassNames={{
                    saturdays: 'day-saturday',
                }}
                modifiers={{
                    saturdays: { dayOfWeek: [6] }, // Saturday
                }}
                className="rounded-md border"
            />
        </CardContent>
      </Card>
    </div>
  );
}
