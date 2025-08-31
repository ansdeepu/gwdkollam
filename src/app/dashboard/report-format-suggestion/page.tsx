// src/app/dashboard/report-format-suggestion/page.tsx
"use client";
import { useState, useCallback } from 'react';
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
import { CalendarIcon, Filter, RotateCcw, FileDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CustomReportBuilderPage() {
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const { toast } = useToast();
  const { fileEntries } = useFileEntries();

  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const handleCheckboxChange = (fieldId: string) => {
    setSelectedFields(prev =>
      prev.includes(fieldId) ? prev.filter(id => id !== fieldId) : [...prev, fieldId]
    );
  };
  
  const handleExportExcel = () => {
    if (selectedFields.length === 0) {
      toast({ title: "No Fields Selected", description: "Please select at least one field to export.", variant: "destructive" });
      return;
    }
    
    let filteredEntries = [...fileEntries];

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
      return;
    }

    const selectedFieldObjects = reportableFields.filter(f => selectedFields.includes(f.id));
    const headers = selectedFieldObjects.map(f => f.label);
    
    const dataForExport = filteredEntries.map(entry => {
      const row: Record<string, any> = {};
      selectedFieldObjects.forEach(field => {
        row[field.label] = field.accessor(entry);
      });
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataForExport, { header: headers });
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
    toast({ title: "Filters Cleared", description: "All selections have been reset." });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Filter />
            Report Builder
        </CardTitle>
        <CardDescription>
          Select report filters & fields. Choose a date range (based on first remittance date) and the columns you want to include in your custom report. If no date range is selected, all data will be considered.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
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
            <Button onClick={handleExportExcel} disabled={selectedFields.length === 0}>
                <FileDown className="mr-2 h-4 w-4" />
                Generate Report
            </Button>
             <Button onClick={handleClear} variant="outline">
                <RotateCcw className="mr-2 h-4 w-4" />
                Clear Filters & Selection
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
