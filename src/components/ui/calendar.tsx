
"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, DropdownProps } from "react-day-picker"

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

  const handleCalendarInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
  }

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium hidden",
        caption_dropdowns: "flex gap-2",
        vhidden: "hidden",
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
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
        ),
        day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside: "text-muted-foreground opacity-50",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />,
        Dropdown: (dropdownProps: DropdownProps) => {
           const { fromDate, toDate, fromMonth, toMonth, fromYear, toYear } = dropdownProps;
           const { month, onChange: onDropdownChange, name } = dropdownProps;
           
           if (name === "months") {
            const months = Array.from({ length: 12 }, (_, i) => new Date(2024, i));
            return (
              <Select
                value={month?.getMonth().toString()}
                onValueChange={(value) => {
                  const newDate = new Date(month || new Date());
                  newDate.setMonth(parseInt(value));
                  onDropdownChange?.(newDate);
                }}
              >
                <SelectTrigger>{month?.toLocaleString("default", { month: "long" })}</SelectTrigger>
                <SelectContent>
                   <ScrollArea className="h-48">
                    {months.map((m, i) => (
                      <SelectItem key={i} value={i.toString()}>
                        {m.toLocaleString("default", { month: "long" })}
                      </SelectItem>
                    ))}
                  </ScrollArea>
                </SelectContent>
              </Select>
            );
          } else if (name === "years") {
            const years = Array.from({ length: (toYear || 0) - (fromYear || 0) + 1 }, (_, i) => (fromYear || 0) + i);
            return (
              <Select
                value={month?.getFullYear().toString()}
                onValueChange={(value) => {
                  const newDate = new Date(month || new Date());
                  newDate.setFullYear(parseInt(value));
                  onDropdownChange?.(newDate);
                }}
              >
                <SelectTrigger>{month?.getFullYear()}</SelectTrigger>
                <SelectContent>
                  <ScrollArea className="h-48">
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))}
                  </ScrollArea>
                </SelectContent>
              </Select>
            );
          }
          return null;
        }
      }}
      captionLayout="dropdown-buttons"
      fromYear={fromYear}
      toYear={toYear}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
