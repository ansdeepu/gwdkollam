
// src/components/e-tender/pdf/PdfReportDialogs.tsx
"use client";

import React, { useState, useCallback, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTenderData } from '../TenderDataContext';
import { PDFDocument, rgb, StandardFonts, PDFFont } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import download from 'downloadjs';
import { formatDateSafe } from '../utils';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useDataStore } from '@/hooks/use-data-store';

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
    const { allStaffMembers } = useDataStore();
    const [isLoading, setIsLoading] = useState(false);
    
    const fillPdfForm = useCallback(async (
        templatePath: string,
        fieldMappings: Record<string, any> = {}
    ): Promise<Uint8Array | null> => {
        try {
            const existingPdfBytes = await fetch(templatePath).then(res => {
                if (!res.ok) throw new Error(`Template file not found: ${templatePath.split('/').pop()}`);
                return res.arrayBuffer();
            });
            
            const pdfDoc = await PDFDocument.load(existingPdfBytes);
            pdfDoc.registerFontkit(fontkit);

            let timesRomanFont;
            try {
                const fontBytes = await fetch('/Times-New-Roman.ttf').then(res => res.arrayBuffer());
                timesRomanFont = await pdfDoc.embedFont(fontBytes);
            } catch (fontError) {
                console.warn("Custom Times New Roman font not found. Falling back to standard font.");
                timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
            }
            
            const courierFont = await pdfDoc.embedFont(StandardFonts.Courier);

            const form = pdfDoc.getForm();
            
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
                    if (field.constructor.name === 'PDFTextField') {
                        const font = fieldName === 'fin_table' ? courierFont : timesRomanFont;
                        (field as any).setText(String(fieldValue || ''));
                        (field as any).updateAppearances(font);
                    }
                } catch (e) {
                    // This is expected if a field doesn't exist, e.g., only one template has 'tech_summary'
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
                bidOpeningText += ` The lowest quoted rate, ${l1Bidder.quotedPercentage}% ${l1Bidder.aboveBelow.toLowerCase()} the estimated rate, was submitted by ${l1Bidder.name || 'N/A'}.`;
            }
            bidOpeningText += ' Accordingly, the bids are recommended for technical and financial evaluation.';
            
            const fieldMappings = { 'bid_opening': bidOpeningText };

            const pdfBytes = await fillPdfForm('/Bid-Opening-Summary.pdf', fieldMappings);
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
                techSummaryText += ` The lowest rate, ${l1Bidder.quotedPercentage}% ${l1Bidder.aboveBelow.toLowerCase()} the estimated rate, was quoted by ${l1Bidder.name || 'N/A'}.`;
            }
            techSummaryText += ' All technically qualified bids are recommended for financial evaluation.';
            
            const committeeMemberNames = [
                tender.technicalCommitteeMember1,
                tender.technicalCommitteeMember2,
                tender.technicalCommitteeMember3,
            ].filter(Boolean) as string[];

            const committeeMembersText = committeeMemberNames.map((name, index) => {
                const staffInfo = allStaffMembers.find(s => s.name === name);
                const designation = staffInfo ? staffInfo.designation : 'N/A';
                return `${index + 1}. ${name}, ${designation}`;
            }).join('\n');


            const fieldMappings = {
                'tech_summary': techSummaryText,
                'committee_members': committeeMembersText,
                'tech_date': formatDateSafe(tender.dateOfTechnicalAndFinancialBidOpening),
            };

            const pdfBytes = await fillPdfForm('/Technical-Summary.pdf', fieldMappings);
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
    }, [tender, fillPdfForm, allStaffMembers]);
    
     const handleGenerateFinancialSummary = useCallback(async () => {
        setIsLoading(true);
        try {
            const bidders = [...(tender.bidders || [])]
                .filter(b => typeof b.quotedAmount === 'number' && b.quotedAmount > 0)
                .sort((a, b) => a.quotedAmount! - b.quotedAmount!);

            const l1Bidder = bidders[0];
            const ranks = bidders.map((_, i) => `L${i + 1}`).join(' and ');

            let finSummaryText = `The technically qualified bids were scrutinized, and all the contractors remitted the required tender fee and EMD. All bids were found to be financially qualified. The bids were evaluated, and the lowest quoted bid was accepted and ranked accordingly as ${ranks}.`;
            
            const finTableText = bidders.map((bidder, index) => {
                const sl = `${index + 1}.`;
                const name = bidder.name || 'N/A';
                const amount = (bidder.quotedAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                const rank = `L${index + 1}`;
                return `${sl} ${name} ${amount} ${rank}`;
            }).join('\n');
            
            let finResultText = 'No valid bids to recommend.';
            if (l1Bidder) {
              const bidderName = l1Bidder.name || 'N/A';
              finResultText = `${bidderName}, who quoted the lowest rate, may be accepted and recommended for issuance of the selection notice.`;
            }
            
            const committeeMemberNames = [
                tender.technicalCommitteeMember1,
                tender.technicalCommitteeMember2,
                tender.technicalCommitteeMember3,
            ].filter(Boolean) as string[];

            const committeeMembersText = committeeMemberNames.map((name, index) => {
                const staffInfo = allStaffMembers.find(s => s.name === name);
                const designation = staffInfo ? staffInfo.designation : 'N/A';
                return `${index + 1}. ${name}, ${designation}`;
            }).join('\n');
            
            const pdfBytes = await fillPdfForm('/Financial-Summary.pdf',
                {
                    'fin_summary': finSummaryText,
                    'fin_table': finTableText,
                    'fin_result': finResultText,
                    'fin_committee': committeeMembersText,
                    'fin_date': formatDateSafe(tender.dateOfTechnicalAndFinancialBidOpening),
                }
            );

            if (!pdfBytes) throw new Error("PDF generation failed.");
            const fileName = `Financial_Summary_${tender.eTenderNo?.replace(/\//g, '_') || 'generated'}.pdf`;
            download(pdfBytes, fileName, 'application/pdf');
            toast({ title: "PDF Generated", description: "Your Financial Summary has been downloaded." });

        } catch (error: any) {
            console.error("Financial Summary Generation Error:", error);
            toast({ title: "PDF Generation Failed", description: error.message, variant: 'destructive', duration: 9000 });
        } finally {
            setIsLoading(false);
        }
    }, [tender, fillPdfForm, allStaffMembers]);

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
                    <ReportButton
                        reportType="financialSummary"
                        label="Financial Summary"
                        onClick={handleGenerateFinancialSummary}
                        isLoading={isLoading}
                        disabled={isLoading || (tender.bidders || []).length === 0}
                    />
                    <PlaceholderReportButton label="Selection Notice" />
                    <PlaceholderReportButton label="Work / Supply Order" />
                    <PlaceholderReportButton label="Work Agreement" />
                </div>
            </CardContent>
        </Card>
    );
}
