
"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export type CalendarProps = {
  mode?: "single"
  selected?: Date
  onSelect?: (date: Date | undefined) => void
  initialFocus?: boolean
  className?: string
  disabled?: (date: Date) => boolean
  fromYear?: number
  toYear?: number
  captionLayout?: "dropdown-buttons"
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const WEEK_DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function Calendar({
  className,
  selected,
  onSelect,
  initialFocus,
  disabled,
  fromYear = 2020,
  toYear = 2050,
}: CalendarProps) {
  const [currentDate, setCurrentDate] = React.useState(selected || new Date())
  const [showMonthPicker, setShowMonthPicker] = React.useState(false)
  const [showYearPicker, setShowYearPicker] = React.useState(false)

  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
  const daysInMonth = endOfMonth.getDate()
  const startDay = startOfMonth.getDay()

  const years = Array.from({ length: toYear - fromYear + 1 }, (_, i) => fromYear + i)

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const handleDayClick = (day: number) => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    if (onSelect) {
      onSelect(newDate)
    }
  }
  
  const handleMonthSelect = (monthIndex: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), monthIndex, 1));
    setShowMonthPicker(false);
  }

  const handleYearSelect = (year: number) => {
    setCurrentDate(new Date(year, currentDate.getMonth(), 1));
    setShowYearPicker(false);
  }

  const renderDays = () => {
    const days = []
    // Blank days for the start of the month
    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`blank-${i}`} className="h-9 w-9" />)
    }
    // Actual days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      const isSelected = selected &&
        date.getDate() === selected.getDate() &&
        date.getMonth() === selected.getMonth() &&
        date.getFullYear() === selected.getFullYear()
      const isToday = new Date().toDateString() === date.toDateString()
      const isDisabled = disabled ? disabled(date) : false

      days.push(
        <button
          key={day}
          disabled={isDisabled}
          onClick={() => handleDayClick(day)}
          className={cn(
            "h-9 w-9 rounded-md text-sm transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            {
              "bg-primary text-primary-foreground": isSelected,
              "bg-accent text-accent-foreground": isToday && !isSelected,
              "hover:bg-accent hover:text-accent-foreground": !isSelected && !isDisabled,
              "opacity-50 cursor-not-allowed": isDisabled
            }
          )}
        >
          {day}
        </button>
      )
    }
    return days
  }

  return (
    <div className={cn("w-full max-w-xs rounded-lg border bg-card p-3 shadow-sm", className)}>
      <div className="relative">
        <div className="flex items-center justify-between px-2 py-1.5">
          <button
            onClick={() => { setShowYearPicker(!showYearPicker); setShowMonthPicker(false); }}
            className="px-2 py-1 rounded-md text-sm font-semibold hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {currentDate.getFullYear()}
          </button>
          <button
            onClick={() => { setShowMonthPicker(!showMonthPicker); setShowYearPicker(false); }}
            className="px-2 py-1 rounded-md text-sm font-semibold hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {MONTHS[currentDate.getMonth()]}
          </button>
          <div className="flex items-center space-x-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {showMonthPicker && (
          <div className="absolute z-10 grid grid-cols-3 gap-2 w-full rounded-md border bg-popover p-2 shadow-md">
            {MONTHS.map((month, index) => (
              <Button
                key={month}
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => handleMonthSelect(index)}
              >
                {month.substring(0,3)}
              </Button>
            ))}
          </div>
        )}
        
        {showYearPicker && (
           <div className="absolute z-10 w-full rounded-md border bg-popover p-2 shadow-md">
             <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
              {years.map((year) => (
                <Button
                  key={year}
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => handleYearSelect(year)}
                >
                  {year}
                </Button>
              ))}
            </div>
           </div>
        )}
      </div>

      <div className="grid grid-cols-7 gap-y-2 mt-2">
        {WEEK_DAYS.map((day) => (
          <div key={day} className="text-center text-xs font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1 mt-2">
        {renderDays()}
      </div>
    </div>
  )
}
Calendar.displayName = "Calendar"
