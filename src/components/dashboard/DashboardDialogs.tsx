// src/components/dashboard/DashboardDialogs.tsx
"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import ExcelJS from 'exceljs';
import { format, isWithinInterval, startOfDay, endOfDay, isValid, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import type { DataEntryFormData } from '@/lib/schemas';

const FileDown = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M12 18v-6"/><path d="m15 15-3 3-3-3"/></svg>
);

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
  const { isOpen, title, data, columns, type } = dialogState;
  
  const exportDialogDataToExcel = async () => {
    const reportTitle = title;
    const columnLabels = columns.map(col => col.label);
    
    if (data.length === 0) {
      toast({ title: "No Data to Export", variant: "default" });
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30));

    // Add Header Rows
    worksheet.addRow(["Ground Water Department, Kollam"]).commit();
    worksheet.addRow([reportTitle]).commit();
    worksheet.addRow([`Report generated on: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`]).commit();
    worksheet.addRow([]).commit(); // Spacer

    const numCols = columnLabels.length;
    worksheet.mergeCells(1, 1, 1, numCols);
    worksheet.mergeCells(2, 1, 2, numCols);
    worksheet.mergeCells(3, 1, 3, numCols);

    worksheet.getCell('A1').alignment = { horizontal: 'center' };
    worksheet.getCell('A2').alignment = { horizontal: 'center' };
    
    worksheet.getRow(1).font = { bold: true, size: 16 };
    worksheet.getRow(2).font = { bold: true, size: 14 };
    
    // Add Table Header
    const headerRow = worksheet.addRow(columnLabels);
    headerRow.font = { bold: true };
    headerRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern:'solid', fgColor:{argb:'F0F0F0'} };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });

    // Add Data Rows
    data.forEach(rowData => {
      const values = columns.map(col => rowData[col.key] ?? '');
      const newRow = worksheet.addRow(values);
      newRow.eachCell((cell, colNumber) => {
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
          if (columns[colNumber - 1]?.isNumeric) {
            cell.alignment = { horizontal: 'right' };
          }
      });
    });

    // Auto-fit columns
     worksheet.columns.forEach((column, i) => {
        let maxLength = 0;
        column.eachCell!({ includeEmpty: true }, (cell) => {
            let columnLength = cell.value ? cell.value.toString().length : 10;
            if (columnLength > maxLength) {
                maxLength = columnLength;
            }
        });
        column.width = maxLength < 10 ? 10 : maxLength + 2;
    });
    
    // Save the file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gwd_report_${title.replace(/[^a-zA-Z0-9]/g, '_')}_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Excel Exported", description: `Report downloaded.` });
  };
  
    const getColumnsForType = (type: DialogState['type'], title: string) => {
        return columns; // Always use the columns passed in the dialog state
    };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => setDialogState({ ...dialogState, isOpen: open })}>
      <DialogContent onPointerDownOutside={(e) => e.preventDefault()} className="max-w-4xl p-0 flex flex-col h-[90vh]">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Showing {data.length} records. {financeDates?.start && financeDates?.end ? `from ${format(financeDates.start, "dd/MM/yyyy")} to ${format(financeDates.end, "dd/MM/yyyy")}` : ""}.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 px-6 py-4">
            <ScrollArea className="h-full pr-4">
              {data.length > 0 ? (
                <Table>
                  <TableHeader><TableRow>{getColumnsForType(type, title).map(col => <TableHead key={col.key} className={cn(col.isNumeric && 'text-right')}>{col.label}</TableHead>)}</TableRow></TableHeader>
                  <TableBody>
                    {data.map((row, rowIndex) => (
                      <TableRow key={rowIndex}>{getColumnsForType(type, title).map(col => <TableCell key={col.key} className={cn('text-xs', col.isNumeric && 'text-right font-mono')}>{row[col.key]}</TableCell>)}</TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (<p className="text-center text-muted-foreground py-8">No details found for the selected criteria.</p>)}
            </ScrollArea>
        </div>
        <DialogFooter className="p-6 pt-4 border-t">
          <Button variant="outline" onClick={exportDialogDataToExcel} disabled={data.length === 0}><FileDown className="mr-2 h-4 w-4" /> Export Excel</Button>
          <DialogClose asChild><Button type="button" variant="secondary">Close</Button></DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
