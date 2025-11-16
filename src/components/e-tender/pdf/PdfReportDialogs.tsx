// src/components/e-tender/pdf/PdfReportDialogs.tsx
"use client";

import React, { useState, useCallback, useRef } from 'react';
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
  const [isButtonLoading, setIsButtonLoading] = useState(false);

  const handleClick = async () => {
    setIsButtonLoading(true);
    await onClick();
    setIsButtonLoading(false);
  };

  return (
    <Button onClick={handleClick} variant="outline" className="justify-start" disabled={disabled || isButtonLoading}>
        {(isLoading || isButtonLoading) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
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
                      <Button disabled><Download className="mr-2 h-5 w-5" /> Download PDF</Button>
                  </DialogFooter>
              </DialogContent>
          </Dialog>
      </>
  );
};


export default function PdfReportDialogs() {
    const { tender } = useTenderData();
    const [isLoading, setIsLoading] = useState(false);

    const fillPdfForm = useCallback(async (templatePath: string): Promise<Uint8Array> => {
        setIsLoading(true);
        try {
            const existingPdfBytes = await fetch(templatePath).then(res => {
                if (!res.ok) {
                    throw new Error(`The template file could not be found. Please ensure '${templatePath.split('/').pop()}' is in the public folder.`);
                }
                return res.arrayBuffer();
            });
            
            const pdfDoc = await PDFDocument.load(existingPdfBytes);
            const form = pdfDoc.getForm();
            
            const tenderFee = tender.tenderFormFee || 0;
            const gst = tenderFee * 0.18;
            const displayTenderFee = tender.tenderFormFee ? `Rs. ${tenderFee.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} & Rs. ${gst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (GST 18%)` : 'N/A';
            
            const fieldMappings: Record<string, any> = {
                'file_no_header': `GKT/${tender.fileNo || ''}`,
                'e_tender_no_header': tender.eTenderNo,
                'tender_date_header': formatDateSafe(tender.tenderDate),
                'name_of_work': tender.nameOfWork,
                'pac': tender.estimateAmount ? `Rs. ${tender.estimateAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A',
                'emd': tender.emd ? `Rs. ${tender.emd.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A',
                'last_date_submission': formatDateSafe(tender.dateTimeOfReceipt, true, true, false),
                'opening_date': formatDateSafe(tender.dateTimeOfOpening, true, false, true),
                'bid_submission_fee': displayTenderFee,
                'location': tender.location,
                'period_of_completion': tender.periodOfCompletion || '',
            };

            Object.entries(fieldMappings).forEach(([fieldName, fieldValue]) => {
                try {
                    const field = form.getTextField(fieldName);
                    field.setText(String(fieldValue || ''));
                } catch (e) {
                    console.warn(`Could not find or set field "${fieldName}" in PDF. It might be a read-only field or have a different name.`);
                }
            });

            form.flatten();
            return await pdfDoc.save();
        } finally {
            setIsLoading(false);
        }
    }, [tender]);
    
    const handleGenerateNIT = useCallback(async () => {
        try {
            const pdfBytes = await fillPdfForm('/NIT.pdf');
            const fileName = `NIT_${tender.eTenderNo?.replace(/\//g, '_') || 'generated'}.pdf`;
            download(pdfBytes, fileName, 'application/pdf');
            toast({ title: "PDF Generated", description: "Your Notice Inviting Tender has been downloaded." });
        } catch (error: any) {
            console.error("NIT Generation Error:", error);
            toast({ title: "PDF Generation Failed", description: error.message, variant: 'destructive', duration: 9000 });
        }
    }, [tender.eTenderNo, fillPdfForm]);


    const handleGenerateTenderForm = useCallback(async () => {
        try {
            const pdfBytes = await fillPdfForm('/Tender-Form.pdf');
            const tenderNoFormatted = tender.eTenderNo?.replace(/\//g, '_') || 'filled';
            const fileName = `bTenderForm${tenderNoFormatted}.pdf`;
            download(pdfBytes, fileName, 'application/pdf');
            toast({ title: "PDF Generated", description: "Your Tender Form has been downloaded." });
        } catch (error: any) {
            console.error("Tender Form Generation Error:", error);
            toast({ title: "PDF Generation Failed", description: error.message, variant: 'destructive', duration: 9000 });
        }
    }, [tender.eTenderNo, fillPdfForm]);
    

    return (
        <Card>
            <CardHeader>
                <CardTitle>PDF Reports Generation</CardTitle>
                <CardDescription>Generate and download PDF documents for this tender.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <ReportButton 
                        reportType="nit"
                        label="Notice Inviting Tender (NIT)"
                        onClick={handleGenerateNIT}
                        isLoading={isLoading}
                        disabled={isLoading}
                    />
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
