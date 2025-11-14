// src/app/dashboard/e-tender/[id]/reports/page.tsx
"use client";

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Download, Printer } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTenderData } from '@/components/e-tender/TenderDataContext';
import Link from 'next/link';

const ReportDialogContent = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <DialogContent className="max-w-4xl h-[80vh]">
    <DialogHeader>
      <DialogTitle>{title}</DialogTitle>
      <DialogDescription>This is a preview of the report content. PDF generation will be implemented here.</DialogDescription>
    </DialogHeader>
    <ScrollArea className="flex-1 min-h-0 border rounded-md p-4 bg-secondary/20">
      {children}
    </ScrollArea>
    <DialogFooter>
      <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
      <Button><Download className="mr-2 h-4 w-4" /> Download PDF</Button>
    </DialogFooter>
  </DialogContent>
);

const ReportButton = ({ tenderId, reportType, label, isPrintable = false }: { tenderId: string, reportType: string, label: string, isPrintable?: boolean }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { tender } = useTenderData();

  if (isPrintable) {
    return (
        <Button asChild variant="outline" className="justify-start">
            <Link href={`/dashboard/e-tender/${tenderId}/print`} target="_blank">
                <Printer className="mr-2 h-4 w-4" />
                {label}
            </Link>
        </Button>
    );
  }

  return (
    <>
      <Button onClick={() => setIsOpen(true)} variant="outline" className="justify-start">
        <Download className="mr-2 h-4 w-4" />
        {label}
      </Button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <ReportDialogContent title={label}>
          <pre>{JSON.stringify({ type: reportType, data: tender }, null, 2)}</pre>
        </ReportDialogContent>
      </Dialog>
    </>
  );
};

export default function TenderReportsPage() {
    const params = useParams();
    const { id: tenderId } = params;
    const { tender } = useTenderData();

    if (typeof tenderId !== 'string') {
        return <p>Invalid Tender ID.</p>;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>PDF Reports Generation</CardTitle>
                <CardDescription>Generate and download PDF documents for this tender.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <ReportButton tenderId={tenderId} reportType="nit" label="Notice Inviting Tender (NIT)" isPrintable={true} />
                    <ReportButton tenderId={tenderId} reportType="tender_form" label="Tender Form" />
                    <ReportButton tenderId={tenderId} reportType="corrigendum" label="Corrigendum" />
                    <ReportButton tenderId={tenderId} reportType="bid_opening" label="Bid Opening Summary" />
                    <ReportButton tenderId={tenderId} reportType="technical_summary" label="Technical Summary" />
                    <ReportButton tenderId={tenderId} reportType="financial_summary" label="Financial Summary" />
                    <ReportButton tenderId={tenderId} reportType="selection_notice" label="Selection Notice" />
                    <ReportButton tenderId={tenderId} reportType="work_supply_order" label="Work / Supply Order" />
                    <ReportButton tenderId={tenderId} reportType="work_agreement" label="Work Agreement" />
                </div>
            </CardContent>
        </Card>
    );
}
