// src/app/dashboard/e-tender/[id]/selection-notice/page.tsx
"use client";

import React, { useEffect, useMemo } from 'react';
import { useTenderData } from '@/components/e-tender/TenderDataContext';
import { formatDateSafe } from '@/components/e-tender/utils';
import { useDataStore } from '@/hooks/use-data-store';

export default function SelectionNoticePrintPage() {
    const { tender } = useTenderData();
    const { officeAddress } = useDataStore();

    useEffect(() => {
        if (tender && tender.eTenderNo) {
            document.title = `Selection_Notice_${tender.eTenderNo.replace(/\//g, '_')}`;
        } else {
            document.title = 'Selection_Notice';
        }
        // Automatically trigger print dialog
        window.print();
    }, [tender]);
    
    const l1Bidder = useMemo(() => {
        if (!tender.bidders || tender.bidders.length === 0) return null;
        const validBidders = tender.bidders.filter(b => b.quotedAmount);
        if (validBidders.length === 0) return null;
        return validBidders.reduce((lowest, current) => 
            (current.quotedAmount! < lowest.quotedAmount!) ? current : lowest
        );
    }, [tender.bidders]);
    
    const isApgRequired = useMemo(() => {
        if (!tender.estimateAmount || !l1Bidder?.quotedAmount) return false;
        if (l1Bidder.quotedAmount >= tender.estimateAmount) return false;
        
        const description = tender.additionalPerformanceGuaranteeDescription || '';
        // Look for patterns like "up to 10%" or "between 10% and 15%"
        const thresholdMatch = description.match(/up to ([\d.]+)%|between\s+([\d.]+)%/);
        // Default to 10% if no specific threshold is found in the description
        const threshold = thresholdMatch ? parseFloat(thresholdMatch.find(v => v) || '10') / 100 : 0.10;

        const percentageDifference = (tender.estimateAmount - l1Bidder.quotedAmount) / tender.estimateAmount;
        return percentageDifference > threshold;

    }, [tender.estimateAmount, l1Bidder?.quotedAmount, tender.additionalPerformanceGuaranteeDescription]);

    const performanceGuarantee = tender.performanceGuaranteeAmount ?? 0;
    const additionalPerformanceGuarantee = tender.additionalPerformanceGuaranteeAmount ?? 0;
    const stampPaperValue = tender.stampPaperAmount ?? 200;
    
    const apgPercentageText = useMemo(() => {
        if (!isApgRequired || !tender.estimateAmount || !l1Bidder?.quotedAmount) return '0';
        
        const description = tender.additionalPerformanceGuaranteeDescription || '';
        const thresholdMatch = description.match(/up to ([\d.]+)%|between\s+([\d.]+)%/);
        const threshold = thresholdMatch ? parseFloat(thresholdMatch.find(v => v) || '10') / 100 : 0.10;
        
        const percentageDifference = (tender.estimateAmount - l1Bidder.quotedAmount) / tender.estimateAmount;
        const excessPercentage = percentageDifference - threshold;
        
        return (excessPercentage * 100).toFixed(1);

    }, [isApgRequired, tender.estimateAmount, l1Bidder?.quotedAmount, tender.additionalPerformanceGuaranteeDescription]);


    const MainContent = () => {
        const workName = tender.nameOfWorkMalayalam || tender.nameOfWork;
        const quotedAmountStr = (l1Bidder?.quotedAmount ?? 0).toLocaleString('en-IN');
        const performanceGuaranteeStr = performanceGuarantee.toLocaleString('en-IN');
        const stampPaperValueStr = stampPaperValue.toLocaleString('en-IN');

        if (isApgRequired) {
            const estimateAmountStr = (tender.estimateAmount ?? 0).toLocaleString('en-IN');
            const additionalPerformanceGuaranteeStr = additionalPerformanceGuarantee.toLocaleString('en-IN');

            return (
                 <p className="leading-normal text-justify indent-8">
                    മേൽ സൂചന പ്രകാരം <span>{workName}</span> എന്ന പ്രവൃത്തി നടപ്പിലാക്കുന്നതിന് വേണ്ടി താങ്കൾ
                    സമർപ്പിച്ചിട്ടുള്ള ടെണ്ടർ അംഗീകരിച്ചു. ടെണ്ടർ പ്രകാരമുള്ള പ്രവൃത്തികൾ ഏറ്റെടുക്കുന്നതിന്
                    മുന്നോടിയായി ഈ നോട്ടീസ് തീയതി മുതൽ പതിന്നാല് ദിവസത്തിനകം പെർഫോമൻസ്
                    ഗ്യാരന്റിയായി ടെണ്ടറിൽ ക്വോട്ട് ചെയ്തിരിക്കുന്ന <span className="font-mono">{quotedAmountStr}/-</span> രൂപയുടെ <span className="font-mono">5%</span> തുകയായ <span className="font-mono">{performanceGuaranteeStr}/-</span>
                    രൂപയിൽ കുറയാത്ത തുക ട്രഷറി ഫിക്സഡ്  ഡെപ്പോസിറ്റായും അഡിഷണൽ പെർഫോമൻസ്
                    ഗ്യാരന്റിയായി എസ്റ്റിമേറ്റ് തുകയായ <span className="font-mono">{estimateAmountStr}/-</span> രൂപയുടെ <span className="font-mono">{apgPercentageText}%</span> തുകയായ <span className="font-mono">{additionalPerformanceGuaranteeStr}/-</span> രൂപയിൽ കുറയാത്ത തുക ട്രഷറി ഫിക്സഡ്
                    ഡെപ്പോസിറ്റായും ഈ ഓഫീസിൽ കെട്ടിവയ്ക്കുന്നതിനും <span className="font-mono">{stampPaperValueStr}/-</span> രൂപയുടെ മുദ്രപത്രത്തിൽ വർക്ക് എഗ്രിമെന്റ്
                    വയ്ക്കുന്നതിനും നിർദ്ദേശിക്കുന്നു.
                </p>
            );
        }
        return (
            <p className="leading-normal text-justify indent-8">
                മേൽ സൂചന പ്രകാരം <span>{workName}</span> എന്ന പ്രവൃത്തി നടപ്പിലാക്കുന്നതിന് വേണ്ടി താങ്കൾ
                സമർപ്പിച്ചിട്ടുള്ള ടെണ്ടർ അംഗീകരിച്ചു. ടെണ്ടർ പ്രകാരമുള്ള പ്രവൃത്തികൾ ഏറ്റെടുക്കുന്നതിന്
                മുന്നോടിയായി ഈ നോട്ടീസ് തീയതി മുതൽ പതിന്നാല് ദിവസത്തിനകം പെർഫോമൻസ്
                ഗ്യാരന്റിയായി ടെണ്ടറിൽ ക്വോട്ട് ചെയ്തിരിക്കുന്ന <span className="font-mono">{quotedAmountStr}/-</span> രൂപയുടെ <span className="font-mono">5%</span> തുകയായ <span className="font-mono">{performanceGuaranteeStr}/-</span>
                രൂപയിൽ കുറയാത്ത തുക ട്രഷറി ഫിക്സഡ് ഡെപ്പോസിറ്റായി ഈ ഓഫീസിൽ
                കെട്ടിവയ്ക്കുന്നതിനും <span className="font-mono">{stampPaperValueStr}/-</span> രൂപയുടെ മുദ്രപത്രത്തിൽ വർക്ക് എഗ്രിമെൻ്റ് വയ്ക്കുന്നതിനും
                നിർദ്ദേശിക്കുന്നു.
            </p>
        );
    };

    return (
        <div className="bg-white text-black p-8 font-serif">
            <div className="max-w-4xl mx-auto p-12">
                <div className="text-center">
                    <h1 className="text-lg font-bold underline">"ഭരണഭാഷ-മാതൃഭാഷ"</h1>
                </div>
                
                <div className="text-sm flex justify-between mt-4">
                    <div>
                        <p>നമ്പർ: {tender.fileNo ? `ജി.കെ.റ്റി / ${tender.fileNo}` : '__________'}</p>
                        <p>ടെണ്ടർ നമ്പർ : {tender.eTenderNo || '__________'}</p>
                    </div>
                    <div className="text-right">
                        <p>{officeAddress?.officeName || 'ജില്ലാ ആഫീസറുടെ കാര്യാലയം,'}</p>
                        <p className="whitespace-pre-wrap">{officeAddress?.address || 'ഭൂജലവകുപ്പ്, കൊല്ലം'}</p>
                        <p>ഫോൺനമ്പർ: {officeAddress?.phoneNo || '0474 - 2790313'}</p>
                        <p>ഇമെയിൽ: {officeAddress?.email || 'gwdklm@gmail.com'}</p>
                        <p>തീയതി: {formatDateSafe(tender.selectionNoticeDate) || '__________'}</p>
                    </div>
                </div>

                <div className="pt-8">
                    <p>പ്രേഷകൻ</p>
                    <p className="ml-8">{officeAddress?.districtOfficer || 'ജില്ലാ ആഫീസർ'}</p>
                </div>

                <div className="pt-4">
                    <p>സ്വീകർത്താവ്</p>
                    <div className="ml-8">
                        <p>{l1Bidder?.name || '____________________'}</p>
                        <p className="whitespace-pre-wrap">{l1Bidder?.address || '____________________'}</p>
                    </div>
                </div>
                
                <div className="pt-4">
                    <p>സർ,</p>
                </div>

                <div className="space-y-2 mt-4">
                    <p className="flex text-justify">
                        <span className="w-20 shrink-0">വിഷയം:</span>
                        <span>
                            {tender.nameOfWorkMalayalam || tender.nameOfWork} - ടെണ്ടർ അംഗീകരിച്ച് സെലക്ഷൻ നോട്ടീസ് നൽകുന്നത് സംബന്ധിച്ച്.
                        </span>
                    </p>
                    <p className="flex">
                        <span className="w-20 shrink-0">സൂചന:</span>
                        <span>ഈ ഓഫീസിലെ {formatDateSafe(tender.dateOfTechnicalAndFinancialBidOpening) || '__________'} തീയതിയിലെ ടെണ്ടർ നമ്പർ {tender.eTenderNo || '__________'}</span>
                    </p>
                </div>
                
                <div className="pt-4">
                    <MainContent />
                </div>
                
                <div className="pt-16 text-right">
                    <p>വിശ്വസ്തതയോടെ</p>
                    <div className="h-16" />
                    <p className="font-semibold">{officeAddress?.districtOfficer || 'ജില്ലാ ആഫീസർ'}</p>
                </div>
            </div>
        </div>
    );
}
