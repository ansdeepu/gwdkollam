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
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const handleFileSelected = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            toast({ title: "No File Selected", description: "Please select a PDF template to continue.", variant: "default" });
            return;
        }

        setIsLoading(true);
        try {
            const existingPdfBytes = await file.arrayBuffer();
            const pdfDoc = await PDFDocument.load(existingPdfBytes);
            const form = pdfDoc.getForm();
            
            const fieldMappings: Record<string, any> = {
                'Name of Work': tender.nameOfWork,
                'Location': tender.location,
                'Amount': tender.estimateAmount?.toString(),
                'EMD': tender.emd?.toString(),
                'Cost of Tender Form': tender.tenderFormFee?.toString(),
                'Period of Completion': tender.periodOfCompletion ? `${tender.periodOfCompletion} days` : '',
                'Last Date and Time for receipt of tender': formatDateSafe(tender.dateTimeOfReceipt, true),
                'Date and Time of opening of Tender': formatDateSafe(tender.dateTimeOfOpening, true),
            };
            
            Object.keys(fieldMappings).forEach(fieldName => {
                try {
                    const field = form.getTextField(fieldName);
                    if (field) {
                        field.setText(String(fieldMappings[fieldName] || ''));
                    }
                } catch (e) {
                    console.warn(`Could not find or set field: ${fieldName}`);
                }
            });

            const pdfBytes = await pdfDoc.save();
            download(pdfBytes, `TenderForm_${tender.fileNo || 'filled'}.pdf`, 'application/pdf');
            toast({ title: "PDF Generated", description: "Your Tender Form has been downloaded." });

        } catch (error: any) {
            console.error("PDF Generation Error:", error);
            toast({ title: "PDF Generation Failed", description: error.message, variant: 'destructive' });
        } finally {
            setIsLoading(false);
            // Reset file input to allow selecting the same file again
            if(fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    }, [tender]);
    
    const handleGenerateTenderForm = () => {
        // Programmatically click the hidden file input
        fileInputRef.current?.click();
    };


    return (
        <Card>
            <CardHeader>
                <CardTitle>PDF Reports Generation</CardTitle>
                <CardDescription>Generate and download PDF documents for this tender.</CardDescription>
            </CardHeader>
            <CardContent>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelected}
                    className="hidden"
                    accept="application/pdf"
                />
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
