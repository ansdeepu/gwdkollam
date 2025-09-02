
// src/app/dashboard/report-format-suggestion/page.tsx
"use client";
import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { reportableFields } from '@/lib/schemas';
import { useFileEntries } from '@/hooks/useFileEntries';
import * as XLSX from 'xlsx';
import { format, startOfDay, endOfDay, isValid, parseISO } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Filter, RotateCcw, FileDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { DataEntryFormData } from '@/lib/schemas';

interface GeneratedReportRow {
  [key: string]: string | number | undefined | null;
}

export default function CustomReportBuilderPage() {
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const { toast } = useToast();
  const { fileEntries: allEntries, isLoading: entriesLoading } = useFileEntries();

  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  
  const [reportData, setReportData] = useState<GeneratedReportRow[]>([]);
  const [reportHeaders, setReportHeaders] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const depositWorkEntries = useMemo(() => {
    return allEntries
      .map(entry => {
        const nonArsSites = entry.siteDetails?.filter(site => site.purpose !== 'ARS' && !site.isArsImport);
        return { ...entry, siteDetails: nonArsSites };
      })
      .filter(entry => entry.siteDetails && entry.siteDetails.length > 0);
  }, [allEntries]);


  const handleCheckboxChange = (fieldId: string) => {
    setSelectedFields(prev =>
      prev.includes(fieldId) ? prev.filter(id => id !== fieldId) : [...prev, fieldId]
    );
  };
  
  const handleGenerateReport = () => {
    setIsGenerating(true);
    if (selectedFields.length === 0) {
      toast({ title: "No Fields Selected", description: "Please select at least one field to generate a report.", variant: "destructive" });
      setReportData([]);
      setReportHeaders([]);
      setIsGenerating(false);
      return;
    }
    
    let filteredEntries = [...depositWorkEntries];

    if (startDate || endDate) {
        const sDate = startDate ? startOfDay(startDate) : null;
        const eDate = endDate ? endOfDay(endDate) : null;
        filteredEntries = filteredEntries.filter(entry => {
            const remDateStr = entry.remittanceDetails?.[0]?.dateOfRemittance;
            if (!remDateStr) return false;
            const remDate = remDateStr instanceof Date ? remDateStr : parseISO(String(remDateStr));
            if (!isValid(remDate)) return false;

            if (sDate && eDate) return remDate >= sDate && remDate <= eDate;
            if (sDate) return remDate >= sDate;
            if (eDate) return remDate <= eDate;
            return false;
        });
    }

    if (filteredEntries.length === 0) {
      toast({ title: "No Data Found", description: "No entries match the selected date range.", variant: "default" });
      setReportData([]);
      setReportHeaders([]);
      setIsGenerating(false);
      return;
    }

    const selectedFieldObjects = reportableFields.filter(f => selectedFields.includes(f.id));
    const headers = selectedFieldObjects.map(f => f.label);
    
    const dataForReport = filteredEntries.flatMap(entry => {
      // If a file has site details, create a row for each site. This handles ARS and non-ARS sites correctly.
      if (entry.siteDetails && entry.siteDetails.length > 0) {
        return entry.siteDetails.map(site => {
          const row: GeneratedReportRow = {};
          // Create a temporary entry with only the current site for the accessor to work on
          const syntheticEntry = { ...entry, siteDetails: [site] };
          selectedFieldObjects.forEach(field => {
            row[field.label] = field.accessor(syntheticEntry);
          });
          return row;
        });
      } 
      // If a file has no site details at all (e.g., an entry that was only for remittance)
      else {
        const row: GeneratedReportRow = {};
        selectedFieldObjects.forEach(field => {
          // The accessor will receive an entry with an empty siteDetails array.
          row[field.label] = field.accessor(entry);
        });
        return [row];
      }
    });


    setReportHeaders(headers);
    setReportData(dataForReport);
    toast({ title: "Report Generated", description: `Report with ${dataForReport.length} rows is ready.` });
    setIsGenerating(false);
  };
  
  const handleExportExcel = () => {
    if (reportData.length === 0) {
      toast({ title: "No Report Generated", description: "Please generate a report first before exporting.", variant: "destructive" });
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(reportData, { header: reportHeaders });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "CustomReport");
    const fileName = `Custom_Report_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    toast({ title: "Export Successful", description: `Downloaded report as ${fileName}` });
  };

  const handleClear = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setSelectedFields([]);
    setReportData([]);
    setReportHeaders([]);
    toast({ title: "Filters Cleared", description: "All selections have been reset." });
  };
  
  if (entriesLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading report data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-10 -mx-6 -mt-6 mb-4 bg-background/80 p-6 backdrop-blur-md border-b">
        <h1 className="text-3xl font-bold tracking-tight">Report Builder</h1>
        <p className="text-muted-foreground">
          Select report filters & fields. Choose a date range (based on first remittance date) and the columns you want to include in your custom report. If no date range is selected, all data will be considered.
        </p>
      </div>
      <Card>
        <CardContent className="space-y-8 pt-6">
          <div className="flex flex-wrap items-center gap-4">
              <Popover>
                <PopoverTrigger asChild>
                    <Button variant={"outline"} className={cn("w-[240px] justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />{startDate ? format(startDate, "dd/MM/yyyy") : <span>From Date</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={startDate} onSelect={setStartDate} disabled={(date) => (endDate ? date > endDate : false) || date > new Date()} initialFocus />
                </PopoverContent>
            </Popover>
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant={"outline"} className={cn("w-[240px] justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />{endDate ? format(endDate, "dd/MM/yyyy") : <span>To Date</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={endDate} onSelect={setEndDate} disabled={(date) => (startDate ? date < startDate : false) || date > new Date()} initialFocus />
                </PopoverContent>
            </Popover>
          </div>
          <div className="pt-8 border-t">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h3 className="text-lg font-semibold">Available Fields:</h3>
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {reportableFields.map(field => (
                <div
                  key={field.id}
                  className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-secondary/50 cursor-pointer"
                  onClick={() => handleCheckboxChange(field.id)}
                >
                  <Checkbox
                    id={field.id}
                    checked={selectedFields.includes(field.id)}
                    onCheckedChange={() => handleCheckboxChange(field.id)}
                  />
                  <label
                    htmlFor={field.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {field.label}
                  </label>
                </div>
              ))}
            </div>
            <div className="mt-8 flex gap-4">
              <Button onClick={handleGenerateReport} disabled={selectedFields.length === 0 || isGenerating}>
                  {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                  {isGenerating ? 'Generating...' : 'Generate Report'}
              </Button>
              <Button onClick={handleClear} variant="outline">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Clear Filters & Selection
              </Button>
            </div>
          </div>

          {reportData.length > 0 && (
            <div className="pt-8 border-t">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Generated Report ({reportData.length} rows)</h3>
                <Button onClick={handleExportExcel}>
                  <FileDown className="mr-2 h-4 w-4" />
                  Export to Excel
                </Button>
              </div>
              <div className="overflow-x-auto border rounded-lg max-h-[60vh]">
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
                          <TableCell key={`${header}-${rowIndex}`} className="whitespace-nowrap">
                            {row[header] !== null && row[header] !== undefined ? String(row[header]) : 'N/A'}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
