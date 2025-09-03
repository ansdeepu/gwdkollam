
"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, DropdownProps } from "react-day-picker"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select"
import { ScrollArea } from "./scroll-area"

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  fromYear?: number,
  toYear?: number,
};

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  fromYear = 2010,
  toYear = 2050,
  ...props
}: CalendarProps) {

  function CustomCaption(props: DropdownProps) {
    const handleMonthChange = (value: string) => {
      const newMonth = new Date(props.displayMonth);
      newMonth.setMonth(parseInt(value, 10));
      props.onMonthChange?.(newMonth);
    };

    const handleYearChange = (value: string) => {
      const newMonth = new Date(props.displayMonth);
      newMonth.setFullYear(parseInt(value, 10));
      props.onMonthChange?.(newMonth);
    };
    
    const years = [];
    for (let i = fromYear; i <= toYear; i++) {
        years.push(i);
    }

    return (
       <div className="flex justify-center items-center gap-2 mb-2">
        <Select
          value={String(props.displayMonth.getMonth())}
          onValueChange={handleMonthChange}
        >
          <SelectTrigger className="w-[120px] focus:ring-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <ScrollArea className="h-64">
              {Array.from({ length: 12 }, (_, i) => (
                <SelectItem key={i} value={String(i)}>
                  {format(new Date(2000, i), "MMMM")}
                </SelectItem>
              ))}
            </ScrollArea>
          </SelectContent>
        </Select>
        <Select
          value={String(props.displayMonth.getFullYear())}
          onValueChange={handleYearChange}
        >
          <SelectTrigger className="w-[100px] focus:ring-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
             <ScrollArea className="h-64">
                {years.map((year) => (
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
        caption_label: "text-sm font-medium hidden",
        nav: "space-x-1 flex items-center absolute w-full justify-between",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        nav_button_previous: "left-1",
        nav_button_next: "right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell:
          "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
        ),
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside: "text-muted-foreground opacity-50",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />,
        Caption: CustomCaption,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
