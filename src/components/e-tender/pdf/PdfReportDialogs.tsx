
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
import fontkit from '@pdf-lib/fontkit';
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

const PlaceholderReportButton = ({ label, hasIcon = true }: { label: string, hasIcon?: boolean }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
      <>
          <Button onClick={() => setIsOpen(true)} variant="outline" className="justify-start">
              {hasIcon && <Download className="mr-2 h-4 w-4" />}
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

const numberToWords = (num: number): string => {
    if (num < 0) return 'Negative';
    if (num === 0) return 'Zero';

    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    if (num < 10) return ones[num];
    if (num < 20) return teens[num - 10];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ` ${ones[num % 10]}` : '');
    
    // For numbers >= 100, just return the number as a string for this use case.
    return num.toString();
};


export default function PdfReportDialogs() {
    const { tender } = useTenderData();
    const [isLoading, setIsLoading] = useState(false);
    
    const fillPdfForm = useCallback(async (
        templatePath: string,
        fieldMappings: Record<string, any> = {},
        justifiedFields: Record<string, { fontSize?: number; lineHeight?: number; indent?: number }> = {}
    ): Promise<Uint8Array | null> => {
        try {
            const existingPdfBytes = await fetch(templatePath).then(res => {
                if (!res.ok) throw new Error(`Template file not found: ${templatePath.split('/').pop()}`);
                return res.arrayBuffer();
            });
            
            const pdfDoc = await PDFDocument.load(existingPdfBytes);
            pdfDoc.registerFontkit(fontkit);

            let customFont;
            try {
                const fontBytes = await fetch('/Times-New-Roman.ttf').then(res => res.arrayBuffer());
                customFont = await pdfDoc.embedFont(fontBytes);
            } catch (fontError) {
                console.warn("Custom font not found or failed to load. Falling back to standard font.");
                customFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
            }

            const form = pdfDoc.getForm();
            const pages = pdfDoc.getPages();
            const firstPage = pages[0];

            const tenderFee = tender.tenderFormFee || 0;
            const gst = tenderFee * 0.18;
            const displayTenderFee = tender.tenderFormFee ? `Rs. ${tenderFee.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} & Rs. ${gst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (GST 18%)` : 'N/A';
            
            const defaultMappings: Record<string, any> = {
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
                'period_of_completion': tender.periodOfCompletion,
                'place': 'Kollam',
                'bid_date': formatDateSafe(tender.dateOfOpeningBid),
            };

            const allMappings = { ...defaultMappings, ...fieldMappings };

            for (const [fieldName, fieldValue] of Object.entries(allMappings)) {
                 try {
                    const field = form.getField(fieldName);
                    if (justifiedFields[fieldName]) {
                        const { fontSize = 12, lineHeight = 1.3, indent = 0 } = justifiedFields[fieldName];
                        const text = String(fieldValue || '');
                        const widgets = field.acroField.getWidgets();
                        if (widgets.length === 0) continue;
                        const rect = widgets[0].getRectangle();
                        const availableWidth = rect.width - 4;

                        let words = text.split(' ');
                        let lines: string[] = [];
                        let currentLine = '';
                        
                        for (let i = 0; i < words.length; i++) {
                            const word = words[i];
                            const isFirstWordInLine = currentLine === '';
                            const lineWithNextWord = isFirstWordInLine ? word : `${currentLine} ${word}`;
                            const currentIndent = lines.length === 0 ? indent : 0;
                            const lineWidth = customFont.widthOfTextAtSize(lineWithNextWord, fontSize);
                        
                            if (lineWidth < (availableWidth - currentIndent)) {
                                currentLine = lineWithNextWord;
                            } else {
                                lines.push(currentLine);
                                currentLine = word;
                            }
                        }
                        lines.push(currentLine);

                        let y = rect.y + rect.height - fontSize;
                        
                        lines.forEach((line, index) => {
                            if (y < rect.y) return; // Stop if text overflows the box
                            const isLastLine = index === lines.length - 1;
                            const currentIndent = index === 0 ? indent : 0;
                            
                            if (isLastLine) {
                                firstPage.drawText(line, { x: rect.x + 2 + currentIndent, y, font: customFont, size: fontSize, color: rgb(0, 0, 0) });
                            } else {
                                const wordsInLine = line.split(' ');
                                if (wordsInLine.length > 1) {
                                    const textWidth = customFont.widthOfTextAtSize(line, fontSize);
                                    const totalSpacing = availableWidth - currentIndent - textWidth;
                                    const wordSpacing = totalSpacing / (wordsInLine.length - 1);
                                    firstPage.drawText(line, { x: rect.x + 2 + currentIndent, y, font: customFont, size: fontSize, color: rgb(0, 0, 0), wordSpacing });
                                } else {
                                     firstPage.drawText(line, { x: rect.x + 2 + currentIndent, y, font: customFont, size: fontSize, color: rgb(0, 0, 0) });
                                }
                            }
                            y -= fontSize * lineHeight;
                        });
                        
                        form.removeField(field);

                    } else if (field.constructor.name === 'PDFTextField') {
                        (field as any).setText(String(fieldValue || ''));
                    }
                } catch (e) {
                    console.warn(`Could not find or set field "${fieldName}" in PDF.`, e);
                }
            }
            
            form.flatten();
            return await pdfDoc.save();
        } catch (error) {
            console.error("Error in fillPdfForm:", error);
            throw error;
        }
    }, [tender]);
    
    const handleGenerateNIT = useCallback(async () => {
        setIsLoading(true);
        try {
            const pdfBytes = await fillPdfForm('/NIT.pdf');
            if (!pdfBytes) throw new Error("PDF generation failed.");
            const fileName = `NIT_${tender.eTenderNo?.replace(/\//g, '_') || 'generated'}.pdf`;
            download(pdfBytes, fileName, 'application/pdf');
            toast({ title: "PDF Generated", description: "Your Notice Inviting Tender has been downloaded." });
        } catch (error: any) {
            console.error("NIT Generation Error:", error);
            toast({ title: "PDF Generation Failed", description: error.message, variant: 'destructive', duration: 9000 });
        } finally {
            setIsLoading(false);
        }
    }, [tender.eTenderNo, fillPdfForm]);


    const handleGenerateTenderForm = useCallback(async () => {
        setIsLoading(true);
        try {
            const pdfBytes = await fillPdfForm('/Tender-Form.pdf');
            if (!pdfBytes) throw new Error("PDF generation failed.");
            const tenderNoFormatted = tender.eTenderNo?.replace(/\//g, '_') || 'filled';
            const fileName = `TenderForm_${tenderNoFormatted}.pdf`;
            download(pdfBytes, fileName, 'application/pdf');
            toast({ title: "PDF Generated", description: "Your Tender Form has been downloaded." });
        } catch (error: any) {
            console.error("Tender Form Generation Error:", error);
            toast({ title: "PDF Generation Failed", description: error.message, variant: 'destructive', duration: 9000 });
        } finally {
            setIsLoading(false);
        }
    }, [tender.eTenderNo, fillPdfForm]);
    
    const handleGenerateBidOpeningSummary = useCallback(async () => {
        setIsLoading(true);
        try {
            const bidders = tender.bidders || [];
            const numBidders = bidders.length;
            const numBiddersInWords = numberToWords(numBidders);
            
            const l1Bidder = bidders.length > 0 
                ? bidders.reduce((lowest, current) => 
                    (current.quotedAmount && lowest.quotedAmount && current.quotedAmount < lowest.quotedAmount) ? current : lowest
                  )
                : null;

            let bidOpeningText = `${numBiddersInWords} bids were received and opened as per the prescribed tender procedure. All participating contractors submitted the requisite documents, and the bids were found to be admissible.`;

            if (l1Bidder && l1Bidder.quotedPercentage !== undefined && l1Bidder.aboveBelow) {
                bidOpeningText += ` The lowest quoted rate, ${l1Bidder.quotedPercentage}% ${l1Bidder.aboveBelow.toLowerCase()} the estimated rate, was submitted by Sri. ${l1Bidder.name || 'N/A'}.`;
            }
            bidOpeningText += ' Accordingly, the bids are recommended for technical and financial evaluation.';
            
            const fieldMappings = {
                'bid_opening': bidOpeningText,
            };

            const justified = {
                'name_of_work': { fontSize: 13, lineHeight: 1.2 },
                'bid_opening': { fontSize: 13, lineHeight: 1.3, indent: 20 }
            };

            const pdfBytes = await fillPdfForm('/Bid-Opening-Summary.pdf', fieldMappings, justified);
            if (!pdfBytes) throw new Error("PDF generation failed.");
            const fileName = `Bid_Opening_Summary_${tender.eTenderNo?.replace(/\//g, '_') || 'generated'}.pdf`;
            download(pdfBytes, fileName, 'application/pdf');
            toast({ title: "PDF Generated", description: "Your Bid Opening Summary has been downloaded." });

        } catch (error: any) {
            console.error("Bid Opening Summary Generation Error:", error);
            toast({ title: "PDF Generation Failed", description: error.message, variant: 'destructive', duration: 9000 });
        } finally {
            setIsLoading(false);
        }
    }, [tender, fillPdfForm]);

    const handleGenerateTechnicalSummary = useCallback(async () => {
        setIsLoading(true);
        try {
            const l1Bidder = (tender.bidders || []).length > 0 
                ? (tender.bidders || []).reduce((lowest, current) => 
                    (current.quotedAmount && lowest.quotedAmount && current.quotedAmount < lowest.quotedAmount) ? current : lowest
                  )
                : null;

            let techSummaryText = `The bids received were scrutinized and all participating contractors submitted the required documents. Upon verification, all bids were found to be technically qualified and hence accepted.`;
            if (l1Bidder && l1Bidder.quotedPercentage !== undefined && l1Bidder.aboveBelow) {
                 techSummaryText += ` The lowest rate, ${l1Bidder.quotedPercentage}% ${l1Bidder.aboveBelow.toLowerCase()} the estimated rate, was quoted by Sri. ${l1Bidder.name || 'N/A'}.`;
            }
            techSummaryText += ' All technically qualified bids are recommended for financial evaluation.';
            
            const committeeMembers = [
                tender.technicalCommitteeMember1,
                tender.technicalCommitteeMember2,
                tender.technicalCommitteeMember3
            ].filter(Boolean).join('\n');

            const fieldMappings = {
                'tech_summary': techSummaryText,
                'committee_members': committeeMembers,
                'tech_date': formatDateSafe(tender.dateOfTechnicalAndFinancialBidOpening),
            };
            
            const justified = {
                'tech_summary': { fontSize: 13, lineHeight: 1.3, indent: 20 },
                 'name_of_work': { fontSize: 13, lineHeight: 1.2 },
            };

            const pdfBytes = await fillPdfForm('/Technical-Summary.pdf', fieldMappings, justified);
            if (!pdfBytes) throw new Error("PDF generation failed.");
            const fileName = `Technical_Summary_${tender.eTenderNo?.replace(/\//g, '_') || 'generated'}.pdf`;
            download(pdfBytes, fileName, 'application/pdf');
            toast({ title: "PDF Generated", description: "Your Technical Summary has been downloaded." });

        } catch (error: any) {
            console.error("Technical Summary Generation Error:", error);
            toast({ title: "PDF Generation Failed", description: error.message, variant: 'destructive', duration: 9000 });
        } finally {
            setIsLoading(false);
        }
    }, [tender, fillPdfForm]);
    

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
                    <ReportButton 
                        reportType="bidOpeningSummary"
                        label="Bid Opening Summary"
                        onClick={handleGenerateBidOpeningSummary}
                        isLoading={isLoading}
                        disabled={isLoading || (tender.bidders || []).length === 0}
                    />
                    <ReportButton
                        reportType="technicalSummary"
                        label="Technical Summary"
                        onClick={handleGenerateTechnicalSummary}
                        isLoading={isLoading}
                        disabled={isLoading}
                    />
                    <PlaceholderReportButton label="Financial Summary" />
                    <PlaceholderReportButton label="Selection Notice" />
                    <PlaceholderReportButton label="Work / Supply Order" />
                    <PlaceholderReportButton label="Work Agreement" />
                </div>
            </CardContent>
        </Card>
    );
}
