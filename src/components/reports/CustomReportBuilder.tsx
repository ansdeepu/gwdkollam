
// src/components/reports/CustomReportBuilder.tsx
"use client";
import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { reportableFields } from '@/lib/schemas';
import { useFileEntries } from '@/hooks/useFileEntries';
import { useToast } from '@/hooks/use-toast';
import { format, parse, isValid, startOfDay, endOfDay, isWithinInterval, parseISO } from 'date-fns';
import * as XLSX from 'xlsx';
import { FileDown, RotateCcw, Filter, Table as TableIcon } from 'lucide-react';
import type { DataEntryFormData } from '@/lib/schemas';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Separator } from '../ui/separator';

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
      <Card>
        <CardHeader>
          <CardTitle>Build Your Custom Report</CardTitle>
          <CardDescription>
              Choose your date range and select the fields you want to include in the report.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div>
              <h3 className="text-base font-semibold text-primary mb-2">1. Filter by Date (Optional)</h3>
              <p className="text-sm text-muted-foreground mb-4">Select a date range based on the first remittance date.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                  <div className="space-y-2">
                      <Label htmlFor="from-date">From Date</Label>
                      <Input
                      id="from-date"
                      type="date"
                      value={startDate ? format(startDate, 'yyyy-MM-dd') : ''}
                      onChange={(e) => setStartDate(e.target.value ? parse(e.target.value, 'yyyy-MM-dd', new Date()) : undefined)}
                      />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="to-date">To Date</Label>
                      <Input
                      id="to-date"
                      type="date"
                      value={endDate ? format(endDate, 'yyyy-MM-dd') : ''}
                      onChange={(e) => setEndDate(e.target.value ? parse(e.target.value, 'yyyy-MM-dd', new Date()) : undefined)}
                      />
                  </div>
              </div>
            </div>
            
            <Separator />

            <div>
              <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-base font-semibold text-primary">2. Select Report Fields</h3>
                    <p className="text-sm text-muted-foreground">Choose the columns for your custom report.</p>
                  </div>
                  <Button variant="link" onClick={handleSelectAll} className="p-0 h-auto">
                      {selectedFields.length === reportableFields.length ? 'Deselect All' : 'Select All'}
                  </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4 border rounded-lg bg-secondary/20">
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
        </CardContent>
      </Card>
      
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
