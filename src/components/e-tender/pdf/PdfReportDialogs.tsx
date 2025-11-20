// src/components/e-tender/pdf/PdfReportDialogs.tsx
"use client";

import React, { useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useTenderData } from '../TenderDataContext';
import download from 'downloadjs';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useDataStore } from '@/hooks/use-data-store';

// Import the new generator functions
import { generateNIT } from './generators/nitGenerator';
import { generateTenderForm } from './generators/tenderFormGenerator';
import { generateBidOpeningSummary } from './generators/bidOpeningSummaryGenerator';
import { generateTechnicalSummary } from './generators/technicalSummaryGenerator';
import { generateFinancialSummary } from './generators/financialSummaryGenerator';

const ReportButton = ({
  label,
  onClick,
  disabled,
  href,
}: {
  label: string;
  onClick?: () => Promise<void>;
  disabled?: boolean;
  href?: string;
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (!onClick) return;
    setIsLoading(true);
    await onClick();
    setIsLoading(false);
  };
  
  const content = (
      <Button onClick={handleClick} variant="outline" className="justify-start" disabled={disabled || isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          {label}
      </Button>
  );
  
  if (href) {
      return <Link href={href} passHref target="_blank" rel="noopener noreferrer">{content}</Link>;
  }

  return content;
};

const PlaceholderReportButton = ({ label }: { label: string }) => (
  <Button variant="outline" className="justify-start" disabled>
    <Download className="mr-2 h-4 w-4" />
    {label} (WIP)
  </Button>
);


export default function PdfReportDialogs() {
    const { tender } = useTenderData();
    const { allStaffMembers } = useDataStore();

    const handleGeneratePdf = useCallback(async (
        generator: (tender: typeof tender, staff?: typeof allStaffMembers) => Promise<Uint8Array>,
        fileNamePrefix: string,
        successMessage: string
    ) => {
        try {
            const pdfBytes = await generator(tender, allStaffMembers);
            const fileName = `${fileNamePrefix}_${tender.eTenderNo?.replace(/\//g, '_') || 'generated'}.pdf`;
            download(pdfBytes, fileName, 'application/pdf');
            toast({ title: "PDF Generated", description: successMessage });
        } catch (error: any) {
            console.error(`${fileNamePrefix} Generation Error:`, error);
            toast({ title: "PDF Generation Failed", description: error.message, variant: 'destructive', duration: 9000 });
        }
    }, [tender, allStaffMembers]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>PDF Reports Generation</CardTitle>
                <CardDescription>Generate and download PDF documents for this tender.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <ReportButton 
                        label="Notice Inviting Tender (NIT)"
                        onClick={() => handleGeneratePdf(generateNIT, 'NIT', 'Your Notice Inviting Tender has been downloaded.')}
                    />
                     <ReportButton 
                        label="Tender Form"
                        onClick={() => handleGeneratePdf(generateTenderForm, 'TenderForm', 'Your Tender Form has been downloaded.')}
                    />
                    <ReportButton 
                        label="Bid Opening Summary"
                        onClick={() => handleGeneratePdf(generateBidOpeningSummary, 'Bid_Opening_Summary', 'Your Bid Opening Summary has been downloaded.')}
                        disabled={(tender.bidders || []).length === 0}
                    />
                    <ReportButton
                        label="Technical Summary"
                        onClick={() => handleGeneratePdf(generateTechnicalSummary, 'Technical_Summary', 'Your Technical Summary has been downloaded.')}
                    />
                    <ReportButton
                        label="Financial Summary"
                        onClick={() => handleGeneratePdf(generateFinancialSummary, 'Financial_Summary', 'Your Financial Summary has been downloaded.')}
                        disabled={(tender.bidders || []).length === 0}
                    />
                    <ReportButton 
                        label="Selection Notice"
                        href={tender.id ? `/dashboard/e-tender/${tender.id}/selection-notice` : '#'}
                        disabled={!tender.id || tender.id === 'new'}
                    />
                    {tender.tenderType === 'Work' && (
                        <ReportButton 
                            label="Work Order"
                            href={tender.id ? `/dashboard/e-tender/${tender.id}/work-order` : '#'}
                            disabled={!tender.id || tender.id === 'new'}
                        />
                    )}
                    {tender.tenderType === 'Purchase' && (
                        <ReportButton 
                            label="Supply Order"
                            href={tender.id ? `/dashboard/e-tender/${tender.id}/supply-order` : '#'}
                            disabled={!tender.id || tender.id === 'new'}
                        />
                    )}
                    <PlaceholderReportButton label="Work Agreement" />
                </div>
            </CardContent>
        </Card>
    );
}
