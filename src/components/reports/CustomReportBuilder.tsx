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
import { FileDown, RotateCcw, Filter } from 'lucide-react';
import type { DataEntryFormData } from '@/lib/schemas';

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

export default function CustomReportBuilder() {
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const { fileEntries } = useFileEntries();
  const { toast } = useToast();

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
    setStartDate('');
    setEndDate('');
    toast({ title: 'Cleared', description: 'All selections and filters have been reset.' });
  };
  
  const handleExportExcel = useCallback(() => {
    if (selectedFields.length === 0) {
      toast({ title: "No Fields Selected", description: "Please select at least one field to export.", variant: "destructive" });
      return;
    }

    const fromDate = startDate ? startOfDay(parse(startDate, 'yyyy-MM-dd', new Date())) : null;
    const toDate = endDate ? endOfDay(parse(endDate, 'yyyy-MM-dd', new Date())) : null;

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
    
    const dataForExport = filteredEntries.map(entry => {
      const row: Record<string, any> = {};
      selectedFieldObjects.forEach(field => {
        const value = field.accessor(entry);
        row[field.label] = value === null || value === undefined ? 'N/A' : value;
      });
      return row;
    });

    if (dataForExport.length === 0) {
        toast({ title: "No Data Found", description: "No records match the selected date range.", variant: "default" });
        return;
    }

    const worksheet = XLSX.utils.json_to_sheet(dataForExport, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "CustomReport");
    const fileName = `Custom_Report_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    toast({ title: "Export Successful", description: `Downloaded ${dataForExport.length} records in ${fileName}` });
  }, [selectedFields, fileEntries, toast, startDate, endDate]);


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
            <Input id="from-date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div className="space-y-2">
            <Label htmlFor="to-date">To Date</Label>
            <Input id="to-date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4 border rounded-lg">
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
        <Button onClick={handleExportExcel} disabled={selectedFields.length === 0}>
          <FileDown className="mr-2 h-4 w-4" />
          Generate Report ({selectedFields.length})
        </Button>
        <Button variant="outline" onClick={handleClear}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Clear Filters & Selection
        </Button>
      </div>
    </div>
  );
}
