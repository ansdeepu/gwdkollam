
"use client"

import * as React from "react"
import { DayPicker } from "react-day-picker"
import { enUS } from "date-fns/locale"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = false,
  ...props
}: CalendarProps) {
  const [month, setMonth] = React.useState<Date>(new Date())

  const years = Array.from({ length: 41 }, (_, i) => 2010 + i) // 2010 → 2050
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ]

  return (
    <DayPicker
      month={month}
      onMonthChange={setMonth}
      locale={{ ...enUS, options: { weekStartsOn: 0 } }} // Sunday as first day
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      formatters={{
        formatWeekdayName: (day) => format(day, 'eee'),
      }}
      classNames={{
        months: "flex flex-col space-y-4",
        month: "space-y-4",
        caption: "flex justify-center items-center px-2",
        caption_label: "hidden", // we use custom caption below
        nav: "hidden", // hide default arrows
        table: "w-full border-collapse",
        head_row: "grid grid-cols-7",
        head_cell:
          "flex items-center justify-center text-xs font-semibold text-muted-foreground",
        row: "grid grid-cols-7",
        cell: "flex items-center justify-center text-center text-xs relative",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal rounded-full aria-selected:bg-primary aria-selected:text-primary-foreground"
        ),
        day_today: "bg-accent/20 text-accent-foreground rounded-full",
        day_outside: "text-muted-foreground opacity-50",
        day_disabled: "text-muted-foreground opacity-50",
        day_hidden: "invisible",
        day_sunday: "text-red-600 font-semibold", // Sundays red
        ...classNames,
      }}
      components={{
        Caption: () => (
          <div className="flex items-center justify-center space-x-2 rdp">
            {/* Month Picker */}
            <select
              className="rounded-md border px-2 py-1 text-sm bg-background"
              value={month.getMonth()}
              onChange={(e) => {
                const newMonth = new Date(month)
                newMonth.setMonth(Number(e.target.value))
                setMonth(newMonth)
              }}
            >
              {months.map((m, idx) => (
                <option key={m} value={idx}>
                  {m}
                </option>
              ))}
            </select>

            {/* Year Picker */}
            <select
              className="rounded-md border px-2 py-1 text-sm bg-background"
              value={month.getFullYear()}
              onChange={(e) => {
                const newMonth = new Date(month)
                newMonth.setFullYear(Number(e.target.value))
                setMonth(newMonth)
              }}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        ),
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
