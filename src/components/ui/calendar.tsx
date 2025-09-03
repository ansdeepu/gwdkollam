
"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, type DayPickerProps, useDayPicker, useNavigation } from "react-day-picker"
import { format, addMonths, subMonths, isValid } from "date-fns"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"


function CustomCaptionLabel({ displayMonth }: { displayMonth: Date }) {
  const { fromDate, toDate, fromYear: dpFromYear, toYear: dpToYear, locale } = useDayPicker();
  const { goToMonth, currentMonth, previousMonth, nextMonth } = useNavigation();

  // Add a guard to handle undefined displayMonth on initial render
  const initialYear = displayMonth ? displayMonth.getFullYear().toString() : "";
  const [yearInputValue, setYearInputValue] = React.useState(initialYear);
  const [isYearInputFocused, setIsYearInputFocused] = React.useState(false); 

  React.useEffect(() => {
    // Only update from displayMonth if it exists and the input is not focused
    if (displayMonth && !isYearInputFocused) {
      setYearInputValue(displayMonth.getFullYear().toString());
    }
  }, [displayMonth, isYearInputFocused]);

  // Return null or a placeholder if displayMonth is not yet available
  if (!displayMonth) {
    return null; 
  }

  const minYearForInput = React.useMemo(() => dpFromYear || (fromDate ? fromDate.getFullYear() : 1900), [dpFromYear, fromDate]);
  const maxYearForInput = React.useMemo(() => dpToYear || (toDate ? toDate.getFullYear() : 2100), [dpToYear, toDate]);

  const handleYearInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setYearInputValue(e.target.value); 
  };

  const applyYearChange = React.useCallback(() => {
    let userEnteredYear = parseInt(yearInputValue, 10);

    if (isNaN(userEnteredYear)) {
      setYearInputValue(displayMonth.getFullYear().toString()); 
      return;
    }

    const clampedYear = Math.max(minYearForInput, Math.min(maxYearForInput, userEnteredYear));

    if (clampedYear !== displayMonth.getFullYear() || displayMonth.getMonth() !== currentMonth.getMonth()) {
      goToMonth(new Date(clampedYear, displayMonth.getMonth()));
    }
     if (clampedYear.toString() !== yearInputValue) {
        setYearInputValue(clampedYear.toString());
    }
  }, [yearInputValue, displayMonth, goToMonth, minYearForInput, maxYearForInput, currentMonth]);


  const handleYearInputFocus = () => {
    setIsYearInputFocused(true);
  };

  const handleYearInputBlur = () => {
    setIsYearInputFocused(false);
    applyYearChange(); 
  };

  const handleYearInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      applyYearChange();
      e.currentTarget.blur(); 
    }
  };

  const handleMonthChange = (value: string) => {
    const newMonth = parseInt(value, 10);
    let targetYear = parseInt(yearInputValue, 10);
    if (isNaN(targetYear) || targetYear < minYearForInput || targetYear > maxYearForInput) {
        targetYear = displayMonth.getFullYear(); 
    }
    goToMonth(new Date(targetYear, newMonth));
  };
  
  const monthOptions = React.useMemo(() => {
    const options = [];
    const currentDisplayYearForMonthOptions = displayMonth.getFullYear();
    for (let i = 0; i < 12; i++) {
      const monthDate = new Date(currentDisplayYearForMonthOptions, i);
      let isDisabled = false;
      
      const firstDayOfMonth = new Date(currentDisplayYearForMonthOptions, i, 1);
      const lastDayOfMonth = new Date(currentDisplayYearForMonthOptions, i + 1, 0);

      if (fromDate && isValid(fromDate) && lastDayOfMonth < fromDate) {
          isDisabled = true;
      }
      if (toDate && isValid(toDate) && firstDayOfMonth > toDate) {
          isDisabled = true;
      }
      options.push(
        <SelectItem key={i} value={i.toString()} disabled={isDisabled}>
          {format(monthDate, "MMMM", { locale })}
        </SelectItem>
      );
    }
    return options;
  }, [displayMonth, fromDate, toDate, locale]);


  return (
    <div className="flex items-center justify-between gap-1 p-1 calendar-custom-controls-container">
       <Button
        onClick={() => previousMonth && goToMonth(subMonths(currentMonth,1))}
        variant="outline"
        className="h-7 w-7 bg-transparent p-0 opacity-80 hover:opacity-100"
        aria-label="Go to previous month"
        disabled={!previousMonth}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="flex items-center gap-1">
        <Select onValueChange={handleMonthChange} value={displayMonth.getMonth().toString()}>
          <SelectTrigger
              aria-label="Go to month"
              className="h-7 text-xs px-2 w-auto focus:ring-0 border-input focus-visible:ring-offset-0 focus-visible:ring-0 bg-transparent hover:bg-accent/50 data-[state=open]:bg-accent/50 rounded-sm"
          >
              <SelectValue placeholder="Select month" />
          </SelectTrigger>
          <SelectContent className="max-h-[200px] overflow-y-auto">
              {monthOptions}
          </SelectContent>
        </Select>
        <Input
          type="number"
          aria-label="Go to year"
          className="h-7 text-xs px-1 w-[55px] focus-visible:ring-offset-0 focus-visible:ring-0 border-input bg-transparent hover:bg-accent/50 focus:bg-accent/50 rounded-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          value={yearInputValue}
          onChange={handleYearInputChange}
          onFocus={handleYearInputFocus}
          onBlur={handleYearInputBlur}
          onKeyDown={handleYearInputKeyDown}
          min={minYearForInput}
          max={maxYearForInput}
        />
      </div>
      <Button
        onClick={() => nextMonth && goToMonth(addMonths(currentMonth,1))}
        variant="outline"
        className="h-7 w-7 bg-transparent p-0 opacity-80 hover:opacity-100"
        aria-label="Go to next month"
        disabled={!nextMonth}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}


export type CalendarProps = DayPickerProps

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "dropdown-buttons", 
  ...props
}: CalendarProps) {
  const currentYear = new Date().getFullYear();
  
  const fromDateProp = props.fromDate ? (typeof props.fromDate === 'string' || props.fromDate instanceof Date ? new Date(props.fromDate) : undefined) : undefined;
  const toDateProp = props.toDate ? (typeof props.toDate instanceof Date ? new Date(props.toDate) : undefined) : undefined;
  
  const defaultFromYear = fromDateProp && isValid(fromDateProp) ? fromDateProp.getFullYear() : currentYear - 80;
  const defaultToYear = toDateProp && isValid(toDateProp) ? toDateProp.getFullYear() : currentYear + 10;

  const resolvedFromYear = props.fromYear ?? defaultFromYear;
  const resolvedToYear = props.toYear ?? defaultToYear;

  const isCustomCaptionLayout = captionLayout === "dropdown-buttons";

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      captionLayout={isCustomCaptionLayout ? undefined : captionLayout}
      fromYear={resolvedFromYear}
      toYear={resolvedToYear}
      fromDate={fromDateProp && isValid(fromDateProp) ? fromDateProp : undefined}
      toDate={toDateProp && isValid(toDateProp) ? toDateProp : undefined}
      className={cn("p-2", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: cn(
            "flex pt-1 relative items-center",
            isCustomCaptionLayout ? "justify-between" : "justify-center"
        ),
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell:
          "text-muted-foreground rounded-md w-8 font-normal text-[0.7rem]",
        row: "flex w-full mt-2",
        cell: "h-8 w-8 text-center text-xs p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-8 w-8 p-0 font-normal aria-selected:opacity-100"
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
        caption_label: cn(isCustomCaptionLayout && "hidden"),
        ...classNames,
      }}
      components={{
        IconLeft: ({ className: iconClassName, ...otherIconProps }) => <ChevronLeft className={cn("h-4 w-4", iconClassName)} {...otherIconProps} />,
        IconRight: ({ className: iconClassName, ...otherIconProps }) => <ChevronRight className={cn("h-4 w-4", iconClassName)} {...otherIconProps} />,
        ...(isCustomCaptionLayout && { CaptionLabel: CustomCaptionLabel }),
        ...props.components,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
