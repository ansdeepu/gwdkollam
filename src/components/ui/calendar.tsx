
"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, type DayPickerProps } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

function CustomCaption(props: { displayMonth: Date, fromYear?: number, toYear?: number }) {
  const { goToMonth, nextMonth, previousMonth } = DayPicker.useNavigation();
  const { fromYear = 2010, toYear = 2050 } = props;

  const handleYearChange = (value: string) => {
    const newYear = Number(value);
    const newDate = new Date(props.displayMonth);
    newDate.setFullYear(newYear);
    goToMonth(newDate);
  };

  const handleMonthChange = (value: string) => {
    const newMonth = Number(value);
    const newDate = new Date(props.displayMonth);
    newDate.setMonth(newMonth);
    goToMonth(newDate);
  };

  const years = Array.from({ length: (toYear - fromYear) + 1 }, (_, i) => fromYear + i);
  const months = Array.from({ length: 12 }, (_, i) => new Date(2000, i, 1).toLocaleString(undefined, { month: 'long' }));

  return (
    <div className="flex justify-center items-center gap-2 mb-4">
      <button
        type="button"
        disabled={!previousMonth}
        onClick={() => previousMonth && goToMonth(previousMonth)}
        className={cn(buttonVariants({ variant: "outline" }), "h-7 w-7 p-0")}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <Select value={String(props.displayMonth.getMonth())} onValueChange={handleMonthChange}>
        <SelectTrigger className="w-[120px] focus:ring-0 focus:ring-offset-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {months.map((month, i) => (
            <SelectItem key={i} value={String(i)}>{month}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={String(props.displayMonth.getFullYear())} onValueChange={handleYearChange}>
        <SelectTrigger className="w-[80px] focus:ring-0 focus:ring-offset-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map((year) => (
            <SelectItem key={year} value={String(year)}>{year}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <button
        type="button"
        disabled={!nextMonth}
        onClick={() => nextMonth && goToMonth(nextMonth)}
        className={cn(buttonVariants({ variant: "outline" }), "h-7 w-7 p-0")}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}


export type CalendarProps = DayPickerProps

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "hidden", // Hide default caption
        nav: "hidden", // Hide default nav buttons
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell:
          "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        Caption: (captionProps) => <CustomCaption {...captionProps} fromYear={2010} toYear={2050} />,
        ...props.components,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
