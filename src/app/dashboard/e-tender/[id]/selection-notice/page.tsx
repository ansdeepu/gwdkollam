// src/app/dashboard/e-tender/[id]/selection-notice/page.tsx
"use client";

import React, { useEffect, useMemo } from 'react';
import { useTenderData } from '@/components/e-tender/TenderDataContext';
import { formatDateSafe, formatTenderNoForFilename } from '@/components/e-tender/utils';
import { useDataStore } from '@/hooks/use-data-store';

export default function SelectionNoticePrintPage() {
    const { tender } = useTenderData();
    const { officeAddress } = useDataStore();

    useEffect(() => {
        const formattedTenderNo = formatTenderNoForFilename(tender.eTenderNo);
        document.title = `dSelectionNotice${formattedTenderNo}`;
        // Automatically trigger print dialog
        setTimeout(() => window.print(), 500);
    }, [tender]);
    
    const l1Bidder = useMemo(() => {
        if (!tender.bidders || tender.bidders.length === 0) return null;
        const validBidders = tender.bidders.filter(b => b.quotedAmount);
        if (validBidders.length === 0) return null;
        return validBidders.reduce((lowest, current) => 
            (current.quotedAmount! < lowest.quotedAmount!) ? current : lowest
        );
    }, [tender.bidders]);
    
    const apgThreshold = useMemo(() => {
        const description = tender.additionalPerformanceGuaranteeDescription || '';
        const thresholdMatch = description.match(/between\s+([\d.]+)%\s+and\s+([\d.]+)%/);
        return thresholdMatch ? parseFloat(thresholdMatch[1]) / 100 : 0.15;
    }, [tender.additionalPerformanceGuaranteeDescription]);
    
    const isApgRequired = useMemo(() => {
        if (!tender.estimateAmount || !l1Bidder?.quotedAmount) return false;
        if (l1Bidder.quotedAmount >= tender.estimateAmount) return false; // Not below estimate
        const percentageDifference = (tender.estimateAmount - l1Bidder.quotedAmount) / tender.estimateAmount;
        return percentageDifference > apgThreshold;
    }, [tender.estimateAmount, l1Bidder?.quotedAmount, apgThreshold]);

    const performanceGuarantee = tender.performanceGuaranteeAmount ?? 0;
    const additionalPerformanceGuarantee = tender.additionalPerformanceGuaranteeAmount ?? 0;
    const stampPaperValue = tender.stampPaperAmount ?? 200;
    
    const excessPercentageText = useMemo(() => {
        if (!isApgRequired || !tender.estimateAmount || !l1Bidder?.quotedAmount) return '0';
        const percentageDifference = (tender.estimateAmount - l1Bidder.quotedAmount) / tender.estimateAmount;
        const excessPercentage = percentageDifference - apgThreshold;
        return (excessPercentage * 100).toFixed(2);
    }, [isApgRequired, tender.estimateAmount, l1Bidder?.quotedAmount, apgThreshold]);


    const MainContent = () => {
        const workName = tender.nameOfWorkMalayalam || tender.nameOfWork;
        
        if (!l1Bidder) {
            return <p className="leading-relaxed text-justify indent-8">ടെണ്ടർ അംഗീകരിച്ചു. ദയവായി മറ്റ് വിവരങ്ങൾ ചേർക്കുക.</p>
        }

        const quotedAmountStr = (l1Bidder.quotedAmount ?? 0).toLocaleString('en-IN');
        const performanceGuaranteeStr = performanceGuarantee.toLocaleString('en-IN');
        const stampPaperValueStr = stampPaperValue.toLocaleString('en-IN');

        if (isApgRequired) {
            const additionalPerformanceGuaranteeStr = additionalPerformanceGuarantee.toLocaleString('en-IN');

            return (
                 <p className="leading-relaxed text-justify indent-8">
                    മേൽ സൂചന പ്രകാരം {workName} നടപ്പിലാക്കുന്നതിന് വേണ്ടി താങ്കൾ സമർപ്പിച്ചിട്ടുള്ള ടെണ്ടർ അംഗീകരിച്ചു. ടെണ്ടർ പ്രകാരമുള്ള പ്രവൃത്തികൾ ഏറ്റെടുക്കുന്നതിന് മുന്നോടിയായി ഈ നോട്ടീസ് തീയതി മുതൽ <span className="font-mono">പതിന്നാല്</span> ദിവസത്തിനകം പെർഫോമൻസ് ഗ്യാരന്റിയായി ടെണ്ടറിൽ ക്വോട്ട് ചെയ്തിരിക്കുന്ന <span className="font-mono">{quotedAmountStr}/-</span> രൂപയുടെ <span className="font-mono">5%</span> തുകയായ <span className="font-mono">{performanceGuaranteeStr}/-</span> രൂപയിൽ കുറയാത്ത തുക ട്രഷറി ഫിക്സഡ് ഡെപ്പോസിറ്റായും, അഡിഷണൽ പെർഫോമൻസ് ഗ്യാരന്റിയായി എസ്റ്റിമേറ്റ് തുകയുടെ <span className="font-mono">{excessPercentageText}%</span> കുറവ് വന്ന തുകയായ <span className="font-mono">{additionalPerformanceGuaranteeStr}/-</span> രൂപയിൽ കുറയാത്ത തുക ട്രഷറി ഫിക്സഡ് ഡെപ്പോസിറ്റായും ഈ ഓഫീസിൽ കെട്ടിവയ്ക്കുന്നതിനും <span className="font-mono">{stampPaperValueStr}/-</span> രൂപയുടെ മുദ്രപത്രത്തിൽ വർക്ക് എഗ്രിമെന്റ് വയ്ക്കുന്നതിനും നിർദ്ദേശിക്കുന്നു.
                </p>
            );
        }

        return (
            <p className="leading-relaxed text-justify indent-8">
                മേൽ സൂചന പ്രകാരം {workName} നടപ്പിലാക്കുന്നതിന് വേണ്ടി താങ്കൾ സമർപ്പിച്ചിട്ടുള്ള ടെണ്ടർ അംഗീകരിച്ചു. ടെണ്ടർ പ്രകാരമുള്ള പ്രവൃത്തികൾ ഏറ്റെടുക്കുന്നതിന് മുന്നോടിയായി ഈ നോട്ടീസ് തീയതി മുതൽ <span className="font-mono">പതിന്നാല്</span> ദിവസത്തിനകം പെർഫോമൻസ് ഗ്യാരന്റിയായി ടെണ്ടറിൽ ക്വോട്ട് ചെയ്തിരിക്കുന്ന <span className="font-mono">{quotedAmountStr}/-</span> രൂപയുടെ <span className="font-mono">5%</span> തുകയായ <span className="font-mono">{performanceGuaranteeStr}/-</span> രൂപയിൽ കുറയാത്ത തുക ട്രഷറി ഫിക്സഡ് ഡെപ്പോസിറ്റായി ഈ ഓഫീസിൽ കെട്ടിവയ്ക്കുന്നതിനും <span className="font-mono">{stampPaperValueStr}/-</span> രൂപയുടെ മുദ്രപത്രത്തിൽ വർക്ക് എഗ്രിമെൻ്റ് വയ്ക്കുന്നതിനും നിർദ്ദേശിക്കുന്നു.
            </p>
        );
    };

    return (
        <div className="-m-6 bg-white min-h-screen">
          <div className="max-w-4xl mx-auto p-12 space-y-4 font-serif">
              <div className="text-center">
                  <h1 className="text-lg font-bold underline">"ഭരണഭാഷ-മാതൃഭാഷ"</h1>
              </div>
              
              <div className="text-sm flex justify-between pt-2">
                  <div>
                      <p>നമ്പർ: ജി.കെ.റ്റി / <span className="font-mono">{tender.fileNo || '__________'}</span></p>
                      <p>ടെണ്ടർ നമ്പർ : <span className="font-mono">{tender.eTenderNo || '__________'}</span></p>
                  </div>
                  <div className="text-right">
                      <p>ജില്ലാ ഓഫീസറുടെ കാര്യാലയം</p>
                      <p>ഭൂജലവകുപ്പ്</p>
                      <p className="whitespace-pre-wrap">{officeAddress?.addressMalayalam || 'ഹൈസ്കൂൾ ജംഗ്ഷൻ\nതേവള്ളി പി. ഓ.\nകൊല്ലം - 691009'}</p>
                      <p>ഫോൺനമ്പർ: <span className="font-mono">{officeAddress?.phoneNo || '0474 - 2790313'}</span></p>
                      <p>ഇമെയിൽ: {officeAddress?.email || 'gwdklm@gmail.com'}</p>
                      <p>തീയതി: <span className="font-mono">{formatDateSafe(tender.selectionNoticeDate) || '__________'}</span></p>
                  </div>
              </div>

              <div className="pt-6">
                  <p>പ്രേഷകൻ</p>
                  <p className="ml-8">ജില്ലാ ആഫീസർ</p>
              </div>

              <div className="pt-2">
                  <p>സ്വീകർത്താവ്</p>
                  <div className="ml-8">
                      <p>{l1Bidder?.name || '____________________'}</p>
                      <p className="whitespace-pre-wrap">{l1Bidder?.address || '____________________'}</p>
                  </div>
              </div>
              
              <div className="pt-2">
                  <p>സർ,</p>
              </div>

              <div className="space-y-2 pt-2">
                  <div className="grid grid-cols-[auto,1fr] gap-x-2">
                      <span className="font-semibold">വിഷയം:</span>
                      <span className="text-justify">: {tender.nameOfWorkMalayalam || tender.nameOfWork} - ടെണ്ടർ അംഗീകരിച്ച് സെലക്ഷൻ നോട്ടീസ് നൽകുന്നത് സംബന്ധിച്ച്.</span>
                  </div>
                  <div className="grid grid-cols-[auto,1fr] gap-x-2">
                      <span className="font-semibold">സൂചന:</span>
                      <span>: ഈ ഓഫീസിലെ <span className="font-mono">{formatDateSafe(tender.dateOfTechnicalAndFinancialBidOpening) || '__________'}</span> തീയതിയിലെ ടെണ്ടർ നമ്പർ <span className="font-mono">{tender.eTenderNo || '__________'}</span></span>
                  </div>
              </div>
              
              <div className="pt-2">
                  <MainContent />
              </div>
              
              <div className="pt-10 text-right">
                  <p>വിശ്വസ്തതയോടെ</p>
                  <div className="h-16" />
                  <p className="font-semibold">ജില്ലാ ആഫീസർ</p>
              </div>
          </div>
        </div>
    );
}
