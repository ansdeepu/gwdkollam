// src/components/reports/CustomReportBuilder.tsx
"use client";
import React, { useState, useCallback } from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { reportableFields } from '@/lib/schemas';
import { useFileEntries } from '@/hooks/useFileEntries';
import { useToast } from '@/hooks/use-toast';
import { format, parse, isValid, startOfDay, endOfDay, isWithinInterval, parseISO } from 'date-fns';
import * as XLSX from 'xlsx';
import { FileDown, RotateCcw, Filter, Table as TableIcon, CalendarIcon } from 'lucide-react';
import type { DataEntryFormData } from '@/lib/schemas';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

const safeParseDate = (dateValue: any): Date | null => {
  if (!dateValue) return null;
  if (dateValue instanceof Date) return dateValue;
  // Handle Firestore Timestamps
  if (typeof dateValue === 'object' && dateValue !== null && typeof (dateValue as any).seconds === 'number') {
    return new Date((dateValue as any).seconds * 1000);
  }
  // Handle string dates (ISO or other formats)
  if (typeof dateValue === 'string') {
    const parsed = parseISO(dateValue);
    if (isValid(parsed)) return parsed;
  }
  return null;
};

type ReportRow = Record<string, string | number | undefined | null>;

export default function CustomReportBuilder() {
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const { fileEntries } = useFileEntries();
  const { toast } = useToast();

  const [reportData, setReportData] = useState<ReportRow[] | null>(null);
  const [reportHeaders, setReportHeaders] = useState<string[]>([]);

  const handleCheckboxChange = (fieldId: string) => {
    setSelectedFields(prev =>
      prev.includes(fieldId) ? prev.filter(id => id !== fieldId) : [...prev, fieldId]
    );
  };
  
  const handleSelectAll = () => {
    if (selectedFields.length === reportableFields.length) {
      setSelectedFields([]);
    } else {
      setSelectedFields(reportableFields.map(f => f.id));
    }
  };

  const handleClear = () => {
    setSelectedFields([]);
    setStartDate(undefined);
    setEndDate(undefined);
    setReportData(null);
    setReportHeaders([]);
    toast({ title: 'Cleared', description: 'All selections and filters have been reset.' });
  };
  
  const handleGenerateReport = useCallback(() => {
    if (selectedFields.length === 0) {
      toast({ title: "No Fields Selected", description: "Please select at least one field to include in the report.", variant: "destructive" });
      return;
    }

    const fromDate = startDate ? startOfDay(startDate) : null;
    const toDate = endDate ? endOfDay(endDate) : null;

    let filteredEntries = fileEntries;

    if (fromDate && toDate && isValid(fromDate) && isValid(toDate)) {
        filteredEntries = fileEntries.filter(entry => {
            const remittanceDate = entry.remittanceDetails?.[0]?.dateOfRemittance;
            const entryDate = safeParseDate(remittanceDate);
            if (entryDate && isValid(entryDate)) {
                return isWithinInterval(entryDate, { start: fromDate, end: toDate });
            }
            return false;
        });
    }
    
    const selectedFieldObjects = reportableFields.filter(f => selectedFields.includes(f.id));
    const headers = selectedFieldObjects.map(f => f.label);
    
    const dataForReport = filteredEntries.map(entry => {
      const row: ReportRow = {};
      selectedFieldObjects.forEach(field => {
        const value = field.accessor(entry);
        row[field.label] = value === null || value === undefined ? 'N/A' : value;
      });
      return row;
    });

    if (dataForReport.length === 0) {
        toast({ title: "No Data Found", description: "No records match the selected date range.", variant: "default" });
        setReportData([]);
        setReportHeaders([]);
    } else {
        setReportData(dataForReport);
        setReportHeaders(headers);
        toast({ title: "Report Generated", description: `Showing ${dataForReport.length} records.` });
    }
  }, [selectedFields, fileEntries, startDate, endDate, toast]);

  const handleExportExcel = () => {
    if (!reportData || reportData.length === 0) {
        toast({ title: "No Report Generated", description: "Please generate a report before exporting.", variant: "destructive" });
        return;
    }

    const worksheet = XLSX.utils.json_to_sheet(reportData, { header: reportHeaders });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "CustomReport");
    const fileName = `Custom_Report_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    toast({ title: "Export Successful", description: `Downloaded ${reportData.length} records in ${fileName}` });
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2"><Filter className="h-5 w-5 text-primary"/>Select Report Filters & Fields</h3>
        <p className="text-sm text-muted-foreground">
          Optionally, choose a date range (based on first remittance date) and the columns you want to include in your custom report.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
        <div className="space-y-2">
            <Label htmlFor="from-date">From Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="from-date"
                  variant={"outline"}
                  className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "dd-MM-yyyy") : <span>dd-mm-yyyy</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                />
                <div className="p-2 border-t flex justify-between">
                  <Button size="sm" variant="ghost" onClick={() => setStartDate(undefined)}>Clear</Button>
                  <Button size="sm" variant="ghost" onClick={() => setStartDate(new Date())}>Today</Button>
                </div>
              </PopoverContent>
            </Popover>
        </div>
        <div className="space-y-2">
            <Label htmlFor="to-date">To Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="to-date"
                  variant={"outline"}
                  className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "dd-MM-yyyy") : <span>dd-mm-yyyy</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
                />
                 <div className="p-2 border-t flex justify-between">
                  <Button size="sm" variant="ghost" onClick={() => setEndDate(undefined)}>Clear</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEndDate(new Date())}>Today</Button>
                </div>
              </PopoverContent>
            </Popover>
        </div>
         <p className="text-xs text-muted-foreground pb-2">
            If no date range is selected, all data will be included in the report.
        </p>
      </div>

      <div className="pt-8 border-t">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Available Fields</h3>
          <Button variant="link" onClick={handleSelectAll} className="p-0 h-auto">
            {selectedFields.length === reportableFields.length ? 'Deselect All' : 'Select All'}
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4 border rounded-lg max-h-60 overflow-y-auto">
          {reportableFields.map(field => (
            <div
              key={field.id}
              className="flex items-center space-x-3 p-2 rounded-md hover:bg-secondary/50"
            >
              <Checkbox
                id={field.id}
                checked={selectedFields.includes(field.id)}
                onCheckedChange={() => handleCheckboxChange(field.id)}
              />
              <label
                htmlFor={field.id}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
              >
                {field.label}
              </label>
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex justify-start items-center gap-4 pt-6 border-t">
        <Button onClick={handleGenerateReport} disabled={selectedFields.length === 0}>
          <FileDown className="mr-2 h-4 w-4" />
          Generate Report ({selectedFields.length})
        </Button>
        <Button variant="outline" onClick={handleClear}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Clear Filters & Selection
        </Button>
      </div>

      {reportData && (
        <div className="pt-8 border-t">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2"><TableIcon className="h-5 w-5 text-primary"/>Generated Custom Report</h3>
              <p className="text-sm text-muted-foreground">
                Showing {reportData.length} entries based on your selected fields.
                Date Range: {startDate && endDate ? `${format(new Date(startDate), 'dd/MM/yyyy')} to ${format(new Date(endDate), 'dd/MM/yyyy')}` : 'All-time data'}.
              </p>
            </div>
            <Button onClick={handleExportExcel} disabled={reportData.length === 0}>
              <FileDown className="mr-2 h-4 w-4" /> Export Excel
            </Button>
          </div>
          <div className="border rounded-lg max-h-[600px] overflow-auto">
            <Table>
                <TableHeader className="sticky top-0 bg-secondary">
                    <TableRow>
                        {reportHeaders.map(header => <TableHead key={header}>{header}</TableHead>)}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {reportData.map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                            {reportHeaders.map(header => (
                                <TableCell key={`${rowIndex}-${header}`} className="whitespace-nowrap">
                                    {row[header]}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
