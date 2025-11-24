
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";


// Import the new generator functions
import { generateNIT } from './generators/nitGenerator';
import { generateTenderForm } from './generators/tenderFormGenerator';
import { generateBidOpeningSummary } from './generators/bidOpeningSummaryGenerator';
import { generateTechnicalSummary } from './generators/technicalSummaryGenerator';
import { generateFinancialSummary } from './generators/financialSummaryGenerator';
import { generateRetenderCorrigendum } from './generators/retenderCorrigendumGenerator';
import { generateDateExtensionCorrigendum } from './generators/dateExtensionCorrigendumGenerator';
import { generateCancelCorrigendum } from './generators/cancelCorrigendumGenerator';
import { generateWorkAgreement } from './generators/workAgreementGenerator';
import type { Corrigendum } from '@/lib/schemas/eTenderSchema';


const ReportButton = ({
  label,
  onClick,
  disabled,
  href,
  tooltipContent,
}: {
  label: string;
  onClick?: () => Promise<void>;
  disabled?: boolean;
  href?: string;
  tooltipContent?: React.ReactNode;
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (!onClick) return;
    setIsLoading(true);
    await onClick();
    setIsLoading(false);
  };
  
  const buttonContent = (
      <Button onClick={handleClick} variant="outline" className="justify-start w-full" disabled={disabled || isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          {label}
      </Button>
  );

  const renderButton = () => {
    if (href) {
        return <Link href={href} passHref target="_blank" rel="noopener noreferrer" className={disabled ? 'pointer-events-none' : ''}>{buttonContent}</Link>;
    }
    return buttonContent;
  };

  if (disabled && tooltipContent) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="w-full">{renderButton()}</div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltipContent}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return renderButton();
};


export default function PdfReportDialogs() {
    const { tender } = useTenderData();
    const { allStaffMembers } = useDataStore();
    const [isLoading, setIsLoading] = useState(false);

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

    const handleCorrigendumGenerate = async (corrigendum: Corrigendum) => {
        setIsLoading(true);
        try {
          let pdfBytes: Uint8Array;
          let fileNamePrefix: string;
          
          switch (corrigendum.corrigendumType) {
            case 'Retender':
              pdfBytes = await generateRetenderCorrigendum(tender, corrigendum);
              fileNamePrefix = 'Corrigendum_Retender';
              break;
            case 'Date Extension':
              pdfBytes = await generateDateExtensionCorrigendum(tender, corrigendum);
              fileNamePrefix = 'Corrigendum_DateExtension';
              break;
            case 'Cancel':
              pdfBytes = await generateCancelCorrigendum(tender, corrigendum);
              fileNamePrefix = 'Corrigendum_Cancel';
              break;
            default:
              toast({ title: "Generation Not Supported", description: `PDF generation for type '${corrigendum.corrigendumType}' is not implemented.`, variant: 'destructive' });
              setIsLoading(false);
              return;
          }
          
          const fileName = `${fileNamePrefix}_${tender.eTenderNo?.replace(/\//g, '_') || 'generated'}.pdf`;
          download(pdfBytes, fileName, 'application/pdf');
          toast({ title: "PDF Generated", description: "Corrigendum report has been downloaded." });
    
        } catch (error: any) {
          console.error("Corrigendum PDF Generation Error:", error);
          toast({ title: "PDF Generation Failed", description: error.message, variant: 'destructive' });
        } finally {
          setIsLoading(false);
        }
    };

    const isOrderDisabled = !tender.id || tender.id === 'new';
    const orderTooltip = isOrderDisabled ? "Save the tender first to enable this report." : !tender.tenderType ? "Select a 'Type of Tender' in Basic Details." : undefined;

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
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="justify-start w-full" disabled={(tender.corrigendums?.length || 0) === 0}>
                                <Download className="mr-2 h-4 w-4" />
                                Corrigendum ({tender.corrigendums?.length || 0})
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            {(tender.corrigendums || []).map((corrigendum, index) => (
                                <DropdownMenuItem key={corrigendum.id} onSelect={() => handleCorrigendumGenerate(corrigendum)}>
                                    Corrigendum No. {index + 1}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <ReportButton 
                        label="Bid Opening Summary"
                        onClick={() => handleGeneratePdf(generateBidOpeningSummary, 'Bid_Opening_Summary', 'Your Bid Opening Summary has been downloaded.')}
                        disabled={(tender.bidders || []).length === 0}
                        tooltipContent={(tender.bidders || []).length === 0 ? "Add at least one bidder to enable." : undefined}
                    />
                    <ReportButton
                        label="Technical Summary"
                        onClick={() => handleGeneratePdf(generateTechnicalSummary, 'Technical_Summary', 'Your Technical Summary has been downloaded.')}
                    />
                    <ReportButton
                        label="Financial Summary"
                        onClick={() => handleGeneratePdf(generateFinancialSummary, 'Financial_Summary', 'Your Financial Summary has been downloaded.')}
                        disabled={(tender.bidders || []).length === 0}
                        tooltipContent={(tender.bidders || []).length === 0 ? "Add at least one bidder to enable." : undefined}
                    />
                    <ReportButton 
                        label="Selection Notice"
                        href={tender.id ? `/dashboard/e-tender/${tender.id}/selection-notice` : '#'}
                        disabled={isOrderDisabled}
                        tooltipContent={isOrderDisabled ? "Save the tender first to enable." : undefined}
                    />
                    <ReportButton
                        label="Work Agreement"
                        onClick={() => handleGeneratePdf(generateWorkAgreement, 'Work_Agreement', 'Your Work Agreement has been downloaded.')}
                        disabled={isOrderDisabled}
                        tooltipContent={isOrderDisabled ? "Save the tender first to enable." : undefined}
                    />
                    <ReportButton 
                        label="Work / Supply Order"
                        href={tender.id && tender.tenderType ? `/dashboard/e-tender/${tender.id}/${tender.tenderType === 'Work' ? 'work-order' : 'supply-order'}` : '#'}
                        disabled={isOrderDisabled || !tender.tenderType}
                        tooltipContent={orderTooltip}
                    />
                </div>
            </CardContent>
        </Card>
    );
}
