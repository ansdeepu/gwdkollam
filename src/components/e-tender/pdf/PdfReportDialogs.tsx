
// src/components/e-tender/pdf/PdfReportDialogs.tsx
"use client";

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

const ReportButton = ({ reportType, label }: { reportType: string, label: string }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)} variant="outline" className="justify-start">
        <Download className="mr-2 h-4 w-4" />
        {label}
      </Button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl h-[80vh]">
            <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
            <DialogDescription>This is a placeholder for the report content. PDF generation will be implemented here.</DialogDescription>
            </DialogHeader>
            <ScrollArea className="flex-1 min-h-0 border rounded-md p-4 bg-secondary/20">
                 <p>Placeholder content for {label}.</p>
            </ScrollArea>
            <DialogFooter>
            <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
            <Button><Download className="mr-2 h-4 w-4" /> Download PDF</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default function PdfReportDialogs() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>PDF Reports Generation</CardTitle>
                <CardDescription>Generate and download PDF documents for this tender.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <ReportButton reportType="nit" label="Notice Inviting Tender (NIT)" />
                    <ReportButton reportType="tender_form" label="Tender Form" />
                    <ReportButton reportType="corrigendum" label="Corrigendum" />
                    <ReportButton reportType="bid_opening" label="Bid Opening Summary" />
                    <ReportButton reportType="technical_summary" label="Technical Summary" />
                    <ReportButton reportType="financial_summary" label="Financial Summary" />
                    <ReportButton reportType="selection_notice" label="Selection Notice" />
                    <ReportButton reportType="work_supply_order" label="Work / Supply Order" />
                    <ReportButton reportType="work_agreement" label="Work Agreement" />
                </div>
            </CardContent>
        </Card>
    );
}

