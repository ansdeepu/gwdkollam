
// src/components/ai/ReportFormatSuggester.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { CustomReportBuilderSchema, type CustomReportBuilderData, reportableFields, type DataEntryFormData } from "@/lib/schemas";
import { useState, useTransition, useEffect, useCallback } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, FileDown, Settings2, ListChecks, XCircle, Table2, CalendarIcon, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, startOfDay, endOfDay, isValid, isWithinInterval, parseISO } from "date-fns";
import { useFileEntries } from "@/hooks/useFileEntries";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption,
} from "@/components/ui/table";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import * as XLSX from 'xlsx';

interface GeneratedRow {
  [key: string]: string | number | undefined | null;
}

export default function CustomReportBuilder() {
  const [generatedTableData, setGeneratedTableData] = useState<GeneratedRow[]>([]);
  const [displayedHeadings, setDisplayedHeadings] = useState<Array<{ id: string; label: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const { fileEntries, isLoading: entriesLoading } = useFileEntries();
  
  const [currentDate, setCurrentDate] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<string | null>(null);

  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    const now = new Date();
    setCurrentDate(format(now, 'dd/MM/yyyy'));
    setCurrentTime(format(now, 'hh:mm:ss a'));
    // Default date range (financial year) setting removed. Dates will start as undefined.
  }, []);

  const form = useForm<CustomReportBuilderData>({
    resolver: zodResolver(CustomReportBuilderSchema),
    defaultValues: {
      selectedHeadingIds: [],
    },
  });

  async function onSubmit(data: CustomReportBuilderData) {
    startTransition(async () => {
      setError(null);
      setGeneratedTableData([]);
      setDisplayedHeadings([]);

      if (entriesLoading) {
        toast({ title: "Processing...", description: "File entries are still loading. Please wait a moment and try again."});
        return;
      }

      try {
        const selectedFields = reportableFields.filter(field => data.selectedHeadingIds.includes(field.id));
        if (selectedFields.length === 0) {
          setError("No headings selected. Please choose at least one field.");
          return;
        }
        
        setDisplayedHeadings(selectedFields.map(f => ({id: f.id, label: f.label})));

        let currentEntries = [...fileEntries];
        // Apply date filtering only if both startDate and endDate are selected
        if (startDate && endDate) {
          const sDate = startOfDay(startDate);
          const eDate = endOfDay(endDate);
          currentEntries = fileEntries.filter(entry => {
            const remDateStr = entry.remittanceDetails?.[0]?.dateOfRemittance;
            if (!remDateStr) return false; 
            const remDate = remDateStr instanceof Date ? remDateStr : parseISO(remDateStr as any);
            return isValid(remDate) && isWithinInterval(remDate, { start: sDate, end: eDate });
          });
        }
        
        const tableData = currentEntries.map(entry => {
          const row: GeneratedRow = {};
          selectedFields.forEach(field => {
            row[field.id] = field.accessor(entry);
          });
          return row;
        });

        setGeneratedTableData(tableData);

        if (tableData.length === 0) {
            toast({
                title: "No Data Found",
                description: "No entries match the selected criteria or the database is empty.",
                variant: "default"
            });
        } else {
            toast({
                title: "Report Generated!",
                description: `Table with ${tableData.length} rows created successfully.`,
            });
        }
      } catch (e: any) {
        console.error("Error generating report:", e);
        setError(e.message || "Failed to generate report.");
        toast({
            title: "Error",
            description: "Could not generate report. Please try again.",
            variant: "destructive",
        });
      }
    });
  }

  const handleExportExcel = () => {
    const reportTitle = "Custom Generated Report";
    const columnLabels = displayedHeadings.map(heading => heading.label);
    const dataRows = generatedTableData.map(row => {
      return displayedHeadings.map(heading => {
        const value = row[heading.id];
        return value !== undefined && value !== null ? String(value) : '';
      });
    });
    const sheetName = "CustomReport";
    const fileNamePrefix = "Custom_GWD_Report";

    if (dataRows.length === 0) {
      toast({ title: "No Data to Export", description: "Generate a report first to export.", variant: "default" });
      return;
    }

    const wb = XLSX.utils.book_new();
    
    const headerRows = [
      ["Ground Water Department, Kollam"],
      [reportTitle],
      [`Report generated on: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`],
      []
    ];
    
    const numCols = columnLabels.length;
    const footerColIndex = numCols > 1 ? numCols - 2 : 0; 
    const footerRowData = new Array(numCols).fill("");
    footerRowData[footerColIndex] = "District Officer";
    
    const footerRows = [[], footerRowData];

    const finalData = [...headerRows, columnLabels, ...dataRows, ...footerRows];
    const ws = XLSX.utils.aoa_to_sheet(finalData, { cellStyles: false });
    
    const merges = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: numCols - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: numCols - 1 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: numCols - 1 } },
    ];
    const footerRowIndex = finalData.length - 1;
    if (numCols > 1) {
        merges.push({ s: { r: footerRowIndex, c: footerColIndex }, e: { r: footerRowIndex, c: numCols - 1 } });
    }
    ws['!merges'] = merges;

    const colWidths = columnLabels.map((label, i) => ({
      wch: Math.max(
        label.length, 
        ...dataRows.map(row => (row[i] ? String(row[i]).length : 0))
      ) + 2,
    }));
    ws['!cols'] = colWidths;

    const numRows = finalData.length;
    for (let R = 0; R < numRows; R++) {
      ws['!rows'] = ws['!rows'] || [];
      ws['!rows'][R] = { hpt: 20 }; 

      for (let C = 0; C < numCols; C++) {
        const cellRef = XLSX.utils.encode_cell({ c: C, r: R });
        if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };

        ws[cellRef].s = {
          alignment: { horizontal: "center", vertical: "center", wrapText: true },
          border: { 
            top: { style: "thin" }, bottom: { style: "thin" }, 
            left: { style: "thin" }, right: { style: "thin" } 
          }
        };

        if (R < 3) {
          ws[cellRef].s.font = { bold: true, sz: R === 0 ? 16 : (R === 1 ? 14 : 12) };
          if (R === 2) ws[cellRef].s.font.italic = true;
        } else if (R === 3) { // Column headers row
          ws[cellRef].s.font = { bold: true };
          ws[cellRef].s.fill = { fgColor: { rgb: "F0F0F0" } };
        } else if (R === footerRowIndex) {
          ws[cellRef].s.border = {};
          if (C === footerColIndex) {
             ws[cellRef].s.font = { bold: true };
             ws[cellRef].s.alignment.horizontal = "right";
          }
        }
      }
    }
    
    XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));
    const uniqueFileName = `${fileNamePrefix}_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
    XLSX.writeFile(wb, uniqueFileName);

    toast({
      title: "Excel Exported",
      description: `Report downloaded as ${uniqueFileName}.`,
    });
  };

  const handleClearFormAndDates = () => {
    form.reset();
    setGeneratedTableData([]);
    setDisplayedHeadings([]);
    setError(null);
    setStartDate(undefined); // Clear dates
    setEndDate(undefined);   // Clear dates
    toast({
      title: "Form Cleared",
      description: "Selected headings, date range, and any generated report have been cleared.",
    });
  };
  
  const handleCalendarInteraction = (e: Event) => {
    const target = e.target as HTMLElement;
    if (target.closest('.calendar-custom-controls-container') || target.closest('[data-radix-select-content]')) e.preventDefault();
  };


  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 no-print">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListChecks className="h-6 w-6 text-primary" />
                Select Report Filters & Fields
              </CardTitle>
              <CardDescription>
                Optionally, choose a date range (based on first remittance date) and the columns you want to include in your custom report.
                If no date range is selected, all data will be considered.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />{startDate ? format(startDate, "dd/MM/yyyy") : <span>From Date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start" onFocusOutside={handleCalendarInteraction} onPointerDownOutside={handleCalendarInteraction}>
                    <Calendar mode="single" selected={startDate} onSelect={setStartDate} disabled={(date) => (endDate ? date > endDate : false) || date > new Date()} initialFocus />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />{endDate ? format(endDate, "dd/MM/yyyy") : <span>To Date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start" onFocusOutside={handleCalendarInteraction} onPointerDownOutside={handleCalendarInteraction}>
                    <Calendar mode="single" selected={endDate} onSelect={setEndDate} disabled={(date) => (startDate ? date < startDate : false) || date > new Date()} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>

              <FormField
                control={form.control}
                name="selectedHeadingIds"
                render={() => (
                  <FormItem>
                    <FormLabel className="text-base">Available Fields:</FormLabel>
                    <ScrollArea className="h-72 w-full rounded-md border p-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {reportableFields.map((field) => (
                          <FormField
                            key={field.id}
                            control={form.control}
                            name="selectedHeadingIds"
                            render={({ field: controllerField }) => {
                              return (
                                <FormItem
                                  key={field.id}
                                  className="flex flex-row items-start space-x-3 space-y-0"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={controllerField.value?.includes(field.id)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? controllerField.onChange([...(controllerField.value || []), field.id])
                                          : controllerField.onChange(
                                              (controllerField.value || []).filter(
                                                (value) => value !== field.id
                                              )
                                            );
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="text-sm font-normal">
                                    {field.label}
                                  </FormLabel>
                                </FormItem>
                              );
                            }}
                          />
                        ))}
                      </div>
                    </ScrollArea>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
             <CardFooter className="flex flex-wrap gap-2 pt-4">
                <Button type="submit" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isPending || entriesLoading}>
                  {isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Settings2 className="mr-2 h-4 w-4" />
                  )}
                  {entriesLoading ? 'Loading Data...' : 'Generate Report'}
                </Button>
                <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={handleClearFormAndDates} disabled={isPending || entriesLoading}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Clear Filters & Selection
                </Button>
             </CardFooter>
          </Card>
        </form>
      </Form>

      {(isPending && !entriesLoading) && (
        <Alert className="bg-card shadow no-print">
          <Loader2 className="h-5 w-5 text-primary animate-spin" />
          <AlertTitle>Generating Report...</AlertTitle>
          <AlertDescription>
            Fetching and processing data based on your selections. Please wait a moment.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="shadow no-print">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {generatedTableData.length > 0 && !isPending && (
        <Card className="shadow-xl bg-card card-for-print">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div className="flex items-center gap-2">
                    <Table2 className="h-6 w-6 text-primary" />
                    <CardTitle className="text-xl text-primary">Generated Custom Report</CardTitle>
                </div>
                <div className="flex flex-wrap gap-2 no-print">
                    <Button onClick={handleExportExcel} variant="outline" size="sm">
                        <FileDown className="mr-2 h-4 w-4" />
                        Export Excel
                    </Button>
                </div>
            </div>
            <CardDescription>
                Showing {generatedTableData.length} entries based on your selected fields.
                {(startDate && endDate) ? (
                  <span className="block text-xs mt-1">
                    Filtered by first remittance date: {format(startDate, "dd/MM/yyyy")} - {format(endDate, "dd/MM/yyyy")}
                  </span>
                ) : (
                  <span className="block text-xs mt-1">Date Range: All-time data</span>
                )}
                <span className="print-only-block text-xs text-muted-foreground block mt-1">
                    {(currentDate && currentTime) && `Generated on: ${currentDate} at ${currentTime}`}
                </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {displayedHeadings.map((heading) => (
                    <TableHead key={heading.id} className="text-xs whitespace-nowrap">{heading.label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {generatedTableData.map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {displayedHeadings.map((heading) => (
                      <TableCell key={`${rowIndex}-${heading.id}`} className="text-xs whitespace-nowrap">
                        {row[heading.id] !== undefined && row[heading.id] !== null ? String(row[heading.id]) : 'N/A'}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
              {generatedTableData.length === 0 && (
                <TableCaption>No data available for the selected fields and date range.</TableCaption>
              )}
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
