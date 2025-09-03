"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, DropdownProps } from "react-day-picker"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  fromYear?: number;
  toYear?: number;
};

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  fromYear = 2010,
  toYear = 2050,
  ...props
}: CalendarProps) {
  
  function CustomCaption(captionProps: DropdownProps) {
    const { fromDate, toDate, goToMonth, displayMonth } = props;
    
    const currentYear = displayMonth.getFullYear();
    const fromYearValue = fromDate?.getFullYear() ?? fromYear;
    const toYearValue = toDate?.getFullYear() ?? toYear;
    
    const yearOptions: number[] = [];
    for (let i = fromYearValue; i <= toYearValue; i++) {
        yearOptions.push(i);
    }
    
    const monthOptions = Array.from({ length: 12 }, (_, i) => ({
      value: i,
      label: format(new Date(2000, i), 'MMMM'),
    }));

    return (
      <div className="flex justify-between items-center gap-2 px-2">
        <Select
          value={String(displayMonth.getMonth())}
          onValueChange={(newMonth) => {
            const newDate = new Date(displayMonth);
            newDate.setMonth(parseInt(newMonth, 10));
            goToMonth(newDate);
          }}
        >
          <SelectTrigger className="w-[60%] h-8 focus:ring-0 focus:ring-offset-0">
            <SelectValue>{format(displayMonth, 'MMMM')}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((month) => (
              <SelectItem key={month.value} value={String(month.value)}>
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={String(currentYear)}
          onValueChange={(newYear) => {
            const newDate = new Date(displayMonth);
            newDate.setFullYear(parseInt(newYear, 10));
            goToMonth(newDate);
          }}
        >
          <SelectTrigger className="w-[40%] h-8 focus:ring-0 focus:ring-offset-0">
            <SelectValue>{currentYear}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <ScrollArea className="h-72">
              {yearOptions.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </ScrollArea>
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium hidden", // Hide default label
        caption_dropdowns: "flex justify-center gap-1",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
        ),
        day_range_end: "day-range-end",
        day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside: "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />,
        Caption: props.captionLayout === "dropdown-buttons" ? CustomCaption : undefined,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }