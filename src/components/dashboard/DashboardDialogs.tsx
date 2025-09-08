
// src/components/dashboard/DashboardDialogs.tsx
"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { cn } from "@/lib/utils";
import * as XLSX from 'xlsx';
import { format, isWithinInterval, startOfDay, endOfDay, isValid, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import type { DataEntryFormData } from '@/lib/schemas';

interface DetailDialogColumn {
  key: string;
  label: string;
  isNumeric?: boolean;
}

interface DialogState {
  isOpen: boolean;
  title: string;
  data: any[];
  columns: DetailDialogColumn[];
  type: 'detail' | 'rig' | 'age' | 'month' | 'fileStatus' | 'finance';
}

interface DashboardDialogsProps {
  dialogState: DialogState;
  setDialogState: React.Dispatch<React.SetStateAction<DialogState>>;
  allFileEntries: DataEntryFormData[];
  financeDates?: { start?: Date, end?: Date };
}

export default function DashboardDialogs({ dialogState, setDialogState, allFileEntries, financeDates }: DashboardDialogsProps) {
  const { toast } = useToast();
  const { isOpen, title, data, columns } = dialogState;
  
  const exportDialogDataToExcel = () => {
    const reportTitle = title;
    const columnLabels = columns.map(col => col.label);
    const dataRows = data.map(row => columns.map(col => row[col.key] ?? ''));
    const sheetName = title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
    const fileNamePrefix = `gwd_report_${sheetName}`;

    if (dataRows.length === 0) {
      toast({ title: "No Data to Export", variant: "default" });
      return;
    }

    const wb = XLSX.utils.book_new();
    const ws_data = [columnLabels, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    
    // Add headers and footer
    const headerRows = [["Ground Water Department, Kollam"], [reportTitle], [`Report generated on: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`], []];
    XLSX.utils.sheet_add_aoa(ws, headerRows, { origin: "A1" });

    const numCols = columnLabels.length;
    const footerRowData = new Array(numCols).fill("");
    footerRowData[numCols > 1 ? numCols - 2 : 0] = "District Officer";
    XLSX.utils.sheet_add_aoa(ws, [[], footerRowData], { origin: -1 });

    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: numCols - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: numCols - 1 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: numCols - 1 } },
      { s: { r: ws_data.length + 5, c: numCols > 1 ? numCols - 2 : 0 }, e: { r: ws_data.length + 5, c: numCols - 1 } }
    ];

    ws['!cols'] = columnLabels.map((label, i) => ({ wch: Math.max(label.length, ...dataRows.map(row => String(row[i] ?? '').length)) + 2 }));

    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${fileNamePrefix}_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`);

    toast({ title: "Excel Exported", description: `Report downloaded.` });
  };


  return (
    <Dialog open={isOpen} onOpenChange={(open) => setDialogState({ ...dialogState, isOpen: open })}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Showing {data.length} records. {financeDates?.start && financeDates?.end ? `from ${format(financeDates.start, "dd/MM/yyyy")} to ${format(financeDates.end, "dd/MM/yyyy")}` : ""}.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          {data.length > 0 ? (
            <Table>
              <TableHeader><TableRow>{columns.map(col => <TableHead key={col.key} className={cn(col.isNumeric && 'text-right')}>{col.label}</TableHead>)}</TableRow></TableHeader>
              <TableBody>
                {data.map((row, rowIndex) => (
                  <TableRow key={rowIndex}>{columns.map(col => <TableCell key={col.key} className={cn('text-xs', col.isNumeric && 'text-right font-mono')}>{row[col.key]}</TableCell>)}</TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (<p className="text-center text-muted-foreground py-8">No details found for the selected criteria.</p>)}
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={exportDialogDataToExcel} disabled={data.length === 0}><FileDown className="mr-2 h-4 w-4" /> Export Excel</Button>
          <DialogClose asChild><Button type="button" variant="secondary">Close</Button></DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
