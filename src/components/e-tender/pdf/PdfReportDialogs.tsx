// src/components/e-tender/pdf/PdfReportDialogs.tsx
"use client";

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTenderData } from '../TenderDataContext';
import { PDFDocument } from 'pdf-lib';
import download from 'downloadjs';
import { formatDateSafe } from '../utils';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';

const ReportButton = ({ reportType, label, onClick, disabled, isLoading }: { reportType: string, label: string, onClick: () => void, disabled?: boolean, isLoading?: boolean }) => {

  return (
    <Button onClick={onClick} variant="outline" className="justify-start" disabled={disabled || isLoading}>
        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
        {label}
    </Button>
  );
};

const PlaceholderReportButton = ({ label }: { label: string }) => {
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
    const { tender } = useTenderData();
    const [isLoading, setIsLoading] = useState(false);

    const handleGenerateTenderForm = async () => {
        setIsLoading(true);
        try {
            const formUrl = '/Tender-Form.pdf';
            const formResponse = await fetch(formUrl);
            if (!formResponse.ok) {
                throw new Error(`Could not find the template PDF at ${formUrl}. Make sure the file exists in the 'public' folder and is named correctly (case-sensitive).`);
            }
            const existingPdfBytes = await formResponse.arrayBuffer();

            const pdfDoc = await PDFDocument.load(existingPdfBytes);
            const form = pdfDoc.getForm();

            const fields = {
                'file_no_header': tender.fileNo,
                'e_tender_no_header': tender.eTenderNo,
                'tender_date_header': formatDateSafe(tender.tenderDate),
                'name_of_work': tender.nameOfWork,
                'pac': tender.estimateAmount?.toLocaleString('en-IN') || '',
                'emd': tender.emd?.toLocaleString('en-IN') || '',
                'last_date_submission': formatDateSafe(tender.dateTimeOfReceipt, true),
                'opening_date': formatDateSafe(tender.dateTimeOfOpening, true),
                'bid_submission_fee': tender.tenderFormFee?.toLocaleString('en-IN') || '',
                'location': tender.location,
                'period_of_completion': tender.periodOfCompletion ? `${tender.periodOfCompletion} days` : '',
            };

            Object.entries(fields).forEach(([fieldName, value]) => {
                try {
                    const field = form.getTextField(fieldName);
                    if (value !== undefined && value !== null) {
                        field.setText(String(value));
                    }
                } catch (e) {
                    console.warn(`Could not find or set field: ${fieldName}`);
                }
            });

            const pdfBytes = await pdfDoc.save();
            const fileName = `TenderForm_${tender.fileNo || 'filled'}.pdf`;
            download(pdfBytes, fileName, "application/pdf");

            toast({ title: 'PDF Generated', description: 'Your tender form has been downloaded.' });

        } catch (error: any) {
            console.error('Error generating PDF:', error);
            toast({ title: 'PDF Generation Failed', description: error.message, variant: 'destructive', duration: 8000 });
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <Card>
            <CardHeader>
                <CardTitle>PDF Reports Generation</CardTitle>
                <CardDescription>Generate and download PDF documents for this tender.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <PlaceholderReportButton reportType="nit" label="Notice Inviting Tender (NIT)" />
                    <ReportButton
                        reportType="tender_form"
                        label="Tender Form"
                        onClick={handleGenerateTenderForm}
                        isLoading={isLoading}
                    />
                    <PlaceholderReportButton reportType="corrigendum" label="Corrigendum" />
                    <PlaceholderReportButton reportType="bid_opening" label="Bid Opening Summary" />
                    <PlaceholderReportButton reportType="technical_summary" label="Technical Summary" />
                    <PlaceholderReportButton reportType="financial_summary" label="Financial Summary" />
                    <PlaceholderReportButton reportType="selection_notice" label="Selection Notice" />
                    <PlaceholderReportButton reportType="work_supply_order" label="Work / Supply Order" />
                    <PlaceholderReportButton reportType="work_agreement" label="Work Agreement" />
                </div>
            </CardContent>
        </Card>
    );
}
