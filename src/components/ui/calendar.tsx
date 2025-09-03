"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.HTMLAttributes<HTMLDivElement> & {
  month?: Date
  selected?: Date | null
  onSelect?: (date: Date) => void
  onMonthChange?: (date: Date) => void
  disabled?: (date: Date) => boolean
}

function Calendar({
  className,
  month: monthProp,
  selected,
  onSelect,
  onMonthChange,
  disabled,
  ...props
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(
    monthProp || new Date()
  )

  React.useEffect(() => {
    if (monthProp) {
      setCurrentMonth(monthProp)
    }
  }, [monthProp])

  const handleMonthChange = (offset: number) => {
    const newMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + offset,
      1
    )
    setCurrentMonth(newMonth)
    onMonthChange?.(newMonth)
  }

  const daysInMonth = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const date = new Date(year, month, 1)
    const days = []
    while (date.getMonth() === month) {
      days.push(new Date(date))
      date.setDate(date.getDate() + 1)
    }
    return days
  }

  const firstDayOfMonth = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    return new Date(year, month, 1).getDay()
  }

  const days = daysInMonth()
  const leadingEmptyDays = Array(firstDayOfMonth()).fill(null)
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  const isSameDay = (d1: Date, d2: Date | null | undefined) => {
    if (!d2) return false
    return (
      d1.getDate() === d2.getDate() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getFullYear() === d2.getFullYear()
    )
  }
  
  const isToday = (d: Date) => isSameDay(d, new Date());

  return (
    <div className={cn("w-full rounded-lg border bg-card p-4 text-card-foreground shadow-sm", className)} {...props}>
      <div className="flex items-center justify-between pb-4">
        <h2 className="text-lg font-semibold">
          {currentMonth.toLocaleString("default", {
            month: "long",
            year: "numeric",
          })}
        </h2>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleMonthChange(-1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleMonthChange(1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2 text-center text-sm text-muted-foreground">
        {weekdays.map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-7 gap-2">
        {leadingEmptyDays.map((_, index) => (
          <div key={`empty-${index}`} />
        ))}
        {days.map((day) => {
          const isDisabled = disabled?.(day)
          return (
            <button
              key={day.toString()}
              disabled={isDisabled}
              onClick={() => onSelect?.(day)}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                "disabled:pointer-events-none disabled:opacity-50",
                {
                  "bg-primary text-primary-foreground hover:bg-primary/90": isSameDay(day, selected),
                  "hover:bg-accent hover:text-accent-foreground": !isSameDay(day, selected) && !isDisabled,
                  "text-muted-foreground": isDisabled,
                  "border border-primary/50": isToday(day) && !isSameDay(day, selected),
                }
              )}
            >
              {day.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
