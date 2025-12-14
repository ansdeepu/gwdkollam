// src/components/reports/CustomReportBuilder.tsx
"use client";
import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { reportableFields, sitePurposeOptions, applicationTypeOptions, applicationTypeDisplayMap, constituencyOptions, type ApplicationType, type SitePurpose, type DataEntryFormData, type ArsEntryFormData, arsTypeOfSchemeOptions } from '@/lib/schemas';
import { useDataStore } from '@/hooks/use-data-store';
import { useToast } from '@/hooks/use-toast';
import { format, parse, isValid, startOfDay, endOfDay, isWithinInterval, parseISO } from 'date-fns';
import ExcelJS from 'exceljs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

const FileDown = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M12 18v-6"/><path d="m15 15-3 3-3-3"/></svg> );
const RotateCcw = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg> );
const Filter = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg> );
const TableIcon = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 3v18"/><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/></svg> );
const Database = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg> );


type ReportSource = 'deposit' | 'private' | 'ars';
type ReportRow = Record<string, string | number | undefined | null>;

const safeParseDate = (dateValue: any): Date | null => {
  if (!dateValue) return null;
  if (dateValue instanceof Date) return dateValue;
  if (typeof dateValue === 'object' && dateValue !== null && typeof (dateValue as any).seconds === 'number') {
    return new Date((dateValue as any).seconds * 1000);
  }
  if (typeof dateValue === 'string') {
    const parsed = parseISO(dateValue);
    if (isValid(parsed)) return parsed;
  }
  return null;
};

const PRIVATE_APPLICATION_TYPES: ApplicationType[] = ["Private_Domestic", "Private_Irrigation", "Private_Institution", "Private_Industry"];

export default function CustomReportBuilder() {
  const { allFileEntries, allArsEntries, allLsgConstituencyMaps } = useDataStore();
  const { toast } = useToast();

  // Filters
  const [selectedPage, setSelectedPage] = useState<ReportSource>('deposit');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [selectedPurpose, setSelectedPurpose] = useState<string>('all');
  const [selectedLsg, setSelectedLsg] = useState<string>('all');
  const [selectedConstituency, setSelectedConstituency] = useState<string>('all');
  const [selectedAppType, setSelectedAppType] = useState<string>('all');
  const [selectedSchemeType, setSelectedSchemeType] = useState<string>('all');
  
  // Field Selection & Report Data
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [reportData, setReportData] = useState<ReportRow[] | null>(null);
  const [reportHeaders, setReportHeaders] = useState<string[]>([]);

  const lsgOptions = useMemo(() => allLsgConstituencyMaps.map(m => m.name).sort(), [allLsgConstituencyMaps]);

  const availableFields = useMemo(() => {
    if (selectedPage === 'ars') {
        return reportableFields.filter(f => f.arsApplicable);
    }
    // For deposit and private works
    const purposeFiltered = reportableFields.filter(f => 
        !f.arsOnly && 
        (selectedPurpose === 'all' || !f.purpose || f.purpose.includes(selectedPurpose as SitePurpose))
    );
    return purposeFiltered;
  }, [selectedPurpose, selectedPage]);
  
  const handleSelectAllFields = () => {
    if (selectedFields.length === availableFields.length) {
      setSelectedFields([]);
    } else {
      setSelectedFields(availableFields.map(f => f.id));
    }
  };

  const handleGenerateReport = useCallback(() => {
    if (selectedFields.length === 0) {
        toast({ title: "No Fields Selected", description: "Please select at least one field for the report.", variant: "destructive" });
        return;
    }

    let sourceData: (DataEntryFormData | ArsEntryFormData)[] = [];
    if (selectedPage === 'deposit') {
        sourceData = allFileEntries.filter(e => !e.applicationType || !PRIVATE_APPLICATION_TYPES.includes(e.applicationType));
    } else if (selectedPage === 'private') {
        sourceData = allFileEntries.filter(e => e.applicationType && PRIVATE_APPLICATION_TYPES.includes(e.applicationType));
    } else if (selectedPage === 'ars') {
        sourceData = allArsEntries;
    }

    const fromDate = startDate ? startOfDay(startDate) : null;
    const toDate = endDate ? endOfDay(endDate) : null;
    let filteredData = sourceData;

    // Filter by Date Range
    if (fromDate && toDate) {
        filteredData = filteredData.filter(entry => {
            const dateToTest = selectedPage === 'ars'
                ? (entry as ArsEntryFormData).arsSanctionedDate
                : (entry as DataEntryFormData).remittanceDetails?.[0]?.dateOfRemittance;
            const entryDate = safeParseDate(dateToTest);
            return entryDate ? isWithinInterval(entryDate, { start: fromDate, end: toDate }) : false;
        });
    }

    // Unpack entries with multiple sites into individual rows
    let siteLevelData: ReportableEntry[] = [];
    if (selectedPage === 'deposit' || selectedPage === 'private') {
        filteredData.forEach(entry => {
            const fileEntry = entry as DataEntryFormData;
            if (fileEntry.siteDetails && fileEntry.siteDetails.length > 0) {
                fileEntry.siteDetails.forEach(site => {
                    siteLevelData.push({ ...fileEntry, ...site, siteDetails: undefined });
                });
            } else {
                 siteLevelData.push({ ...fileEntry, siteDetails: undefined });
            }
        });
    } else {
        siteLevelData = filteredData as ReportableEntry[];
    }

    // Apply Site-level Filters on unpacked data
    if (selectedPage === 'ars') {
        if (selectedSchemeType !== 'all') {
            siteLevelData = siteLevelData.filter(entry => (entry as ArsEntryFormData).arsTypeOfScheme === selectedSchemeType);
        }
    } else {
        if (selectedPurpose !== 'all') {
            siteLevelData = siteLevelData.filter(entry => (entry as any).purpose === selectedPurpose);
        }
        if (selectedAppType !== 'all') {
            siteLevelData = siteLevelData.filter(entry => ('applicationType' in entry && entry.applicationType === selectedAppType));
        }
    }
    
    if (selectedLsg !== 'all') {
        siteLevelData = siteLevelData.filter(entry => (entry as any).localSelfGovt === selectedLsg);
    }
    if (selectedConstituency !== 'all') {
        siteLevelData = siteLevelData.filter(entry => (entry as any).constituency === selectedConstituency);
    }
    
    // Generate Report Rows from the final, site-level data
    const selectedFieldObjects = reportableFields.filter(f => selectedFields.includes(f.id));
    const headers = selectedFieldObjects.map(f => f.label);
    const dataForReport = siteLevelData.map(entry => {
        const row: ReportRow = {};
        selectedFieldObjects.forEach(field => {
            const value = field.accessor(entry as any);
            if (typeof value === 'object' && value instanceof Date) {
                 row[field.label] = formatDateHelper(value);
            } else {
                 row[field.label] = value === null || value === undefined ? 'N/A' : value;
            }
        });
        return row;
    });

    if (dataForReport.length === 0) {
        toast({ title: "No Data Found", description: "No records match the selected filters.", variant: "default" });
    }
    setReportData(dataForReport);
    setReportHeaders(headers);
  }, [selectedFields, selectedPage, startDate, endDate, selectedPurpose, selectedLsg, selectedConstituency, selectedAppType, selectedSchemeType, allFileEntries, allArsEntries, toast]);

  const handleClear = () => {
    setSelectedFields([]);
    setStartDate(undefined);
    setEndDate(undefined);
    setSelectedPurpose('all');
    setSelectedLsg('all');
    setSelectedConstituency('all');
    setSelectedAppType('all');
    setSelectedSchemeType('all');
    setReportData(null);
    setReportHeaders([]);
    toast({ title: 'Cleared', description: 'All selections and filters have been reset.' });
  };
  
  const handleExportExcel = async () => {
    if (!reportData || reportData.length === 0) {
      toast({ title: "No report data to export.", variant: "destructive" });
      return;
    }
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Custom_Report');
    
    worksheet.addRow(reportHeaders).font = { bold: true };

    reportData.forEach(row => {
        const rowData = reportHeaders.map(header => row[header]);
        worksheet.addRow(rowData);
    });

    worksheet.columns.forEach(column => {
        let maxLength = 0;
        column.eachCell!({ includeEmpty: true }, cell => {
            const columnLength = cell.value ? String(cell.value).length : 10;
            if (columnLength > maxLength) {
                maxLength = columnLength;
            }
        });
        column.width = maxLength < 15 ? 15 : maxLength + 2;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `GWD_Custom_Report_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    toast({ title: "Excel Exported", description: "Custom report has been downloaded." });
  };
  
  const formatDateHelper = (date: Date | string | null | undefined): string => {
    if (!date) return 'N/A';
    try {
        const d = date instanceof Date ? date : new Date(date);
        return isValid(d) ? format(d, "dd/MM/yyyy") : 'Invalid Date';
    } catch {
        return 'Invalid Date';
    }
  };

  return (
    <div className="space-y-6">
        <Card>
            <CardContent className="space-y-4 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2"><Label>Data Source</Label><Select value={selectedPage} onValueChange={(v) => setSelectedPage(v as ReportSource)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="deposit">Deposit Works</SelectItem><SelectItem value="private">Private Deposit Works</SelectItem><SelectItem value="ars">ARS</SelectItem></SelectContent></Select></div>
                    <div className="space-y-2"><Label>From Date</Label><Input type="date" value={startDate ? format(startDate, 'yyyy-MM-dd') : ''} onChange={(e) => setStartDate(e.target.value ? parse(e.target.value, 'yyyy-MM-dd', new Date()) : undefined)} /></div>
                    <div className="space-y-2"><Label>To Date</Label><Input type="date" value={endDate ? format(endDate, 'yyyy-MM-dd') : ''} onChange={(e) => setEndDate(e.target.value ? parse(e.target.value, 'yyyy-MM-dd', new Date()) : undefined)} /></div>
                    <div className="space-y-2"><Label>Purpose</Label><Select value={selectedPurpose} onValueChange={setSelectedPurpose} disabled={selectedPage === 'ars'}><SelectTrigger><SelectValue placeholder="Select Purpose"/></SelectTrigger><SelectContent><SelectItem value="all">All Purposes</SelectItem>{sitePurposeOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-2"><Label>Type of Scheme (ARS)</Label><Select value={selectedSchemeType} onValueChange={setSelectedSchemeType} disabled={selectedPage !== 'ars'}><SelectTrigger><SelectValue placeholder="Select Scheme"/></SelectTrigger><SelectContent><SelectItem value="all">All Scheme Types</SelectItem>{arsTypeOfSchemeOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-2"><Label>Type of Application</Label><Select value={selectedAppType} onValueChange={setSelectedAppType} disabled={selectedPage === 'ars'}><SelectTrigger><SelectValue placeholder="Select Type"/></SelectTrigger><SelectContent position="popper"><SelectItem value="all">All Types</SelectItem>{applicationTypeOptions.map(t => <SelectItem key={t} value={t}>{applicationTypeDisplayMap[t]}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-2"><Label>Local Self Govt.</Label><Select value={selectedLsg} onValueChange={setSelectedLsg}><SelectTrigger><SelectValue placeholder="Select LSG"/></SelectTrigger><SelectContent className="max-h-80"><SelectItem value="all">All LSGs</SelectItem>{lsgOptions.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-2"><Label>Constituency (LAC)</Label><Select value={selectedConstituency} onValueChange={setSelectedConstituency}><SelectTrigger><SelectValue placeholder="Select Constituency"/></SelectTrigger><SelectContent position="popper"><SelectItem value="all">All Constituencies</SelectItem>{[...constituencyOptions].sort().map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
                </div>
            </CardContent>
        </Card>

        {selectedPage && (
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-base font-semibold text-primary">Select Report Fields</h3>
                         <p className="text-sm text-muted-foreground">Choose columns for your report. {selectedPage !== 'ars' && selectedPurpose === 'all' && 'Some fields are available only after selecting a specific purpose.'}</p>
                      </div>
                      <Button variant="link" onClick={handleSelectAllFields} disabled={availableFields.length === 0} className="p-0 h-auto">
                        {selectedFields.length === availableFields.length ? 'Deselect All' : 'Select All'}
                      </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4 border rounded-lg bg-secondary/20 max-h-96 overflow-y-auto">
                        {availableFields.map(field => (
                            <div key={field.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-secondary/50">
                                <Checkbox id={field.id} checked={selectedFields.includes(field.id)} onCheckedChange={() => setSelectedFields(prev => prev.includes(field.id) ? prev.filter(id => id !== field.id) : [...prev, field.id])} />
                                <label htmlFor={field.id} className="text-sm font-medium leading-none cursor-pointer">{field.label}</label>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        )}

        <div className="flex justify-start items-center gap-4 pt-4 border-t">
          <Button onClick={handleGenerateReport} disabled={selectedFields.length === 0}><FileDown className="mr-2 h-4 w-4" />Generate Report ({reportData?.length ?? 0})</Button>
          <Button variant="outline" onClick={handleClear}><RotateCcw className="mr-2 h-4 w-4" />Clear</Button>
          <Button onClick={handleExportExcel} disabled={!reportData || reportData.length === 0}><FileDown className="mr-2 h-4 w-4" />Export Excel</Button>
        </div>

        {reportData && (
          <div className="pt-8 border-t">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-2"><TableIcon className="h-5 w-5 text-primary"/>Generated Report</h3>
            <div className="border rounded-lg max-h-[60vh] overflow-auto">
              <Table>
                  <TableHeader className="sticky top-0 bg-secondary z-10">
                      <TableRow>{reportHeaders.map(header => <TableHead key={header}>{header}</TableHead>)}</TableRow>
                  </TableHeader>
                  <TableBody>
                      {reportData.length > 0 ? (
                        reportData.map((row, rowIndex) => (
                            <TableRow key={rowIndex}>
                                {reportHeaders.map(header => (
                                    <TableCell key={`${rowIndex}-${header}`} className="whitespace-nowrap text-xs">{String(row[header] ?? 'N/A')}</TableCell>
                                ))}
                            </TableRow>
                        ))
                      ) : (
                        <TableRow><TableCell colSpan={reportHeaders.length} className="h-24 text-center">No records found for the selected filters.</TableCell></TableRow>
                      )}
                  </TableBody>
              </Table>
            </div>
          </div>
        )}
    </div>
  );
}

// Add a new type to handle both entry types
type ReportableEntry = (DataEntryFormData | ArsEntryFormData) & { [key: string]: any };

