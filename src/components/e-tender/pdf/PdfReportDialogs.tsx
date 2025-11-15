// src/components/e-tender/pdf/PdfReportDialogs.tsx
"use client";

import React, { useState, useCallback, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTenderData } from '../TenderDataContext';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
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
                      <Button disabled><Download className="mr-2 h-4 w-4" /> Download PDF</Button>
                  </DialogFooter>
              </DialogContent>
          </Dialog>
      </>
  );
};


export default function PdfReportDialogs() {
    const { tender } = useTenderData();
    const [isLoading, setIsLoading] = useState(false);

    const handleGenerateTenderForm = useCallback(async () => {
        setIsLoading(true);
        try {
            const pdfUrl = '/Tender-Form.pdf'; 
            
            const existingPdfBytes = await fetch(pdfUrl).then(res => {
                if (!res.ok) {
                    throw new Error(`The template file could not be found. Please ensure 'Tender-Form.pdf' is in the public folder.`);
                }
                return res.arrayBuffer();
            });

            const pdfDoc = await PDFDocument.load(existingPdfBytes);
            const form = pdfDoc.getForm();
            
            const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
            
            const tenderFee = tender.tenderFormFee || 0;
            const gst = tenderFee * 0.18;

            const fieldMappings: Record<string, any> = {
                'file_no_header': `GKT/${tender.fileNo || ''}`,
                'e_tender_no_header': tender.eTenderNo,
                'tender_date_header': formatDateSafe(tender.tenderDate),
                'name_of_work': tender.nameOfWork,
                'pac': tender.estimateAmount ? `Rs. ${tender.estimateAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A',
                'emd': tender.emd ? `Rs. ${tender.emd.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A',
                'last_date_submission': formatDateSafe(tender.dateTimeOfReceipt, true, true, false),
                'opening_date': formatDateSafe(tender.dateTimeOfOpening, true, false, true),
                'bid_submission_fee': tender.tenderFormFee ? `Rs. ${tenderFee.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} & Rs. ${gst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (GST 18%)` : 'N/A',
                'location': tender.location,
                'period_of_completion': tender.periodOfCompletion || '',
            };
            
            Object.keys(fieldMappings).forEach(fieldName => {
                try {
                    const field = form.getTextField(fieldName);
                    if (field) {
                        const fieldValue = String(fieldMappings[fieldName] || '');
                        field.setText(fieldValue);
                        field.updateAppearances(timesRomanFont, { fontSize: 12, textColor: rgb(0, 0, 0) });
                    }
                } catch (e) {
                    console.warn(`Could not find or set field: ${fieldName}`);
                }
            });
            
            form.flatten();

            const pdfBytes = await pdfDoc.save();
            const fileName = `bTenderForm${tender.eTenderNo?.replace(/\//g, '_') || 'filled'}.pdf`;
            download(pdfBytes, fileName, 'application/pdf');
            toast({ title: "PDF Generated", description: "Your Tender Form has been downloaded." });

        } catch (error: any) {
            console.error("PDF Generation Error:", error);
            toast({ title: "PDF Generation Failed", description: error.message, variant: 'destructive', duration: 9000 });
        } finally {
            setIsLoading(false);
        }
    }, [tender]);
    

    return (
        <Card>
            <CardHeader>
                <CardTitle>PDF Reports Generation</CardTitle>
                <CardDescription>Generate and download PDF documents for this tender.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                     <ReportButton 
                        reportType="tenderForm"
                        label="Tender Form"
                        onClick={handleGenerateTenderForm}
                        isLoading={isLoading}
                        disabled={isLoading}
                    />
                    <PlaceholderReportButton label="Corrigendum" />
                    <PlaceholderReportButton label="Bid Opening Summary" />
                    <PlaceholderReportButton label="Technical Summary" />
                    <PlaceholderReportButton label="Financial Summary" />
                    <PlaceholderReportButton label="Selection Notice" />
                    <PlaceholderReportButton label="Work / Supply Order" />
                    <PlaceholderReportButton label="Work Agreement" />
                </div>
            </CardContent>
        </Card>
    );
}
