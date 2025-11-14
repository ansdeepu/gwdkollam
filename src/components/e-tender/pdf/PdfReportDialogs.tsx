// src/components/e-tender/pdf/PdfReportDialogs.tsx
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { E_tenderFormData } from '@/lib/schemas/eTenderSchema';
import Link from 'next/link';

const FILLABLE_TENDER_FORM_URL = "https://drive.google.com/uc?export=download&id=1mxSBrLSE_Jy_XvLmNRfx_QzaA51ENJas";

interface PdfReportProps {
  tenderData: E_tenderFormData;
}

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

const NoticeInvitingTenderPdf = ({ tenderData }: PdfReportProps) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setIsOpen(true)} variant="outline" className="justify-start">
        <Download className="mr-2 h-4 w-4" /> Notice Inviting Tender
      </Button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <ReportDialogContent title="Notice Inviting Tender Report">
          <pre>{JSON.stringify({ type: "Notice Inviting Tender", data: "Placeholder" }, null, 2)}</pre>
        </ReportDialogContent>
      </Dialog>
    </>
  );
};


const CorrigendumPdf = ({ tenderData }: PdfReportProps) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setIsOpen(true)} variant="outline" className="justify-start">
        <Download className="mr-2 h-4 w-4" /> Corrigendum
      </Button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <ReportDialogContent title="Corrigendum Report">
          <pre>{JSON.stringify({ type: "Corrigendum", data: tenderData.corrigendums }, null, 2)}</pre>
        </ReportDialogContent>
      </Dialog>
    </>
  );
};

const BidOpeningSummaryPdf = ({ tenderData }: PdfReportProps) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setIsOpen(true)} variant="outline" className="justify-start">
        <Download className="mr-2 h-4 w-4" /> Bid Opening Summary
      </Button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <ReportDialogContent title="Bid Opening Summary Report">
          <pre>{JSON.stringify({ type: "Bid Opening", data: tenderData.bidders }, null, 2)}</pre>
        </ReportDialogContent>
      </Dialog>
    </>
  );
};

const TechnicalSummaryPdf = ({ tenderData }: PdfReportProps) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setIsOpen(true)} variant="outline" className="justify-start">
        <Download className="mr-2 h-4 w-4" /> Technical Summary
      </Button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <ReportDialogContent title="Technical Summary Report">
          <pre>{JSON.stringify({ type: "Technical Summary", data: "Placeholder" }, null, 2)}</pre>
        </ReportDialogContent>
      </Dialog>
    </>
  );
};

const FinancialSummaryPdf = ({ tenderData }: PdfReportProps) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setIsOpen(true)} variant="outline" className="justify-start">
        <Download className="mr-2 h-4 w-4" /> Financial Summary
      </Button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <ReportDialogContent title="Financial Summary Report">
          <pre>{JSON.stringify({ type: "Financial Summary", data: "Placeholder" }, null, 2)}</pre>
        </ReportDialogContent>
      </Dialog>
    </>
  );
};

const SelectionNoticePdf = ({ tenderData }: PdfReportProps) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setIsOpen(true)} variant="outline" className="justify-start">
        <Download className="mr-2 h-4 w-4" /> Selection Notice
      </Button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <ReportDialogContent title="Selection Notice Report">
          <pre>{JSON.stringify({ type: "Selection Notice", data: "Placeholder" }, null, 2)}</pre>
        </ReportDialogContent>
      </Dialog>
    </>
  );
};

const WorkSupplyOrderPdf = ({ tenderData }: PdfReportProps) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setIsOpen(true)} variant="outline" className="justify-start">
        <Download className="mr-2 h-4 w-4" /> Work / Supply Order
      </Button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <ReportDialogContent title="Work / Supply Order Report">
          <pre>{JSON.stringify({ type: "Work/Supply Order", data: "Placeholder" }, null, 2)}</pre>
        </ReportDialogContent>
      </Dialog>
    </>
  );
};

const WorkAgreementPdf = ({ tenderData }: PdfReportProps) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setIsOpen(true)} variant="outline" className="justify-start">
        <Download className="mr-2 h-4 w-4" /> Work Agreement
      </Button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <ReportDialogContent title="Work Agreement Report">
          <pre>{JSON.stringify({ type: "Work Agreement", data: "Placeholder" }, null, 2)}</pre>
        </ReportDialogContent>
      </Dialog>
    </>
  );
};

export default function PdfReportDialogs({ tenderData }: { tenderData: E_tenderFormData }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <Button asChild variant="outline" className="justify-start">
        <Link href={FILLABLE_TENDER_FORM_URL} target="_blank" rel="noopener noreferrer">
          <Download className="mr-2 h-4 w-4" />
          Tender Form
        </Link>
      </Button>
      <NoticeInvitingTenderPdf tenderData={tenderData} />
      <CorrigendumPdf tenderData={tenderData} />
      <BidOpeningSummaryPdf tenderData={tenderData} />
      <TechnicalSummaryPdf tenderData={tenderData} />
      <FinancialSummaryPdf tenderData={tenderData} />
      <SelectionNoticePdf tenderData={tenderData} />
      <WorkSupplyOrderPdf tenderData={tenderData} />
      <WorkAgreementPdf tenderData={tenderData} />
    </div>
  );
}
