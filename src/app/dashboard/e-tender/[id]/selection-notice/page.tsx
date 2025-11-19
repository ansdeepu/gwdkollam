// src/app/dashboard/e-tender/[id]/selection-notice/page.tsx
"use client";

import React, { useEffect, useMemo } from 'react';
import { useTenderData } from '@/components/e-tender/TenderDataContext';
import { formatDateSafe, toDateOrNull } from '@/components/e-tender/utils';

export default function SelectionNoticePrintPage() {
    const { tender } = useTenderData();

    useEffect(() => {
        if (tender && tender.eTenderNo) {
            document.title = `Selection_Notice_${tender.eTenderNo.replace(/\//g, '_')}`;
            // Automatically trigger the print dialog
            window.print();
        } else {
            document.title = 'Selection_Notice';
        }
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
        // Check if quoted amount is less than estimate amount
        if (l1Bidder.quotedAmount >= tender.estimateAmount) return false;
        const difference = tender.estimateAmount - l1Bidder.quotedAmount;
        const percentageDifference = (difference / tender.estimateAmount);
        // APG is required if the bid is more than 10% below the estimate
        return percentageDifference > 0.10;
    }, [tender.estimateAmount, l1Bidder?.quotedAmount]);

    const performanceGuarantee = tender.performanceGuaranteeAmount ?? 0;
    const additionalPerformanceGuarantee = tender.additionalPerformanceGuaranteeAmount ?? 0;
    const stampPaperValue = tender.stampPaperAmount ?? 200;
    
    const apgPercentage = useMemo(() => {
        if (!isApgRequired || !tender.estimateAmount || !l1Bidder?.quotedAmount) return 0;
        const percentageDifference = (tender.estimateAmount - l1Bidder.quotedAmount) / tender.estimateAmount;
        const excessPercentage = percentageDifference - 0.10;
        return excessPercentage * 100;
    }, [isApgRequired, tender.estimateAmount, l1Bidder?.quotedAmount]);


    const MainContent = () => {
        const workName = tender.nameOfWorkMalayalam || tender.nameOfWork;
        const quotedAmountStr = (l1Bidder?.quotedAmount ?? 0).toLocaleString('en-IN');
        const performanceGuaranteeStr = performanceGuarantee.toLocaleString('en-IN');
        const stampPaperValueStr = stampPaperValue.toLocaleString('en-IN');

        if (isApgRequired) {
            const estimateAmountStr = (tender.estimateAmount ?? 0).toLocaleString('en-IN');
            const additionalPerformanceGuaranteeStr = additionalPerformanceGuarantee.toLocaleString('en-IN');
            const apgPercentageStr = apgPercentage.toFixed(2);

            return (
                 <p className="leading-normal text-justify indent-8">
                    മേൽ സൂചന പ്രകാരം {workName} എന്ന പ്രവൃത്തി നടപ്പിലാക്കുന്നതിന് വേണ്ടി താങ്കൾ
                    സമർപ്പിച്ചിട്ടുള്ള ടെണ്ടർ അംഗീകരിച്ചു. ടെണ്ടർ പ്രകാരമുള്ള പ്രവൃത്തികൾ ഏറ്റെടുക്കുന്നതിന്
                    മുന്നോടിയായി ഈ നോട്ടീസ് തീയതി മുതൽ പതിന്നാല് ദിവസത്തിനകം പെർഫോമൻസ്
                    ഗ്യാരന്റിയായി ടെണ്ടറിൽ ക്വോട്ട് ചെയ്തിരിക്കുന്ന {quotedAmountStr}/- രൂപയുടെ 5% തുകയായ {performanceGuaranteeStr}/-
                    രൂപയിൽ കുറയാത്ത തുക ട്രഷറി ഫിക്സഡ്  ഡെപ്പോസിറ്റായും അഡിഷണൽ പെർഫോമൻസ്
                    ഗ്യാരന്റിയായി എസ്റ്റിമേറ്റ് തുകയായ {estimateAmountStr}/- രൂപയുടെ {apgPercentageStr}% തുകയായ {additionalPerformanceGuaranteeStr}/- രൂപയിൽ കുറയാത്ത തുക ട്രഷറി ഫിക്സഡ്
                    ഡെപ്പോസിറ്റായും ഈ ഓഫീസിൽ കെട്ടിവയ്ക്കുന്നതിനും {stampPaperValueStr}/- രൂപയുടെ മുദ്രപത്രത്തിൽ വർക്ക് എഗ്രിമെൻ്റ്
                    വയ്ക്കുന്നതിനും നിർദ്ദേശിക്കുന്നു.
                </p>
            );
        }
        return (
            <p className="leading-normal text-justify indent-8">
                മേൽ സൂചന പ്രകാരം {workName} എന്ന പ്രവൃത്തി നടപ്പിലാക്കുന്നതിന് വേണ്ടി താങ്കൾ
                സമർപ്പിച്ചിട്ടുള്ള ടെണ്ടർ അംഗീകരിച്ചു. ടെണ്ടർ പ്രകാരമുള്ള പ്രവൃത്തികൾ ഏറ്റെടുക്കുന്നതിന്
                മുന്നോടിയായി ഈ നോട്ടീസ് തീയതി മുതൽ പതിന്നാല് ദിവസത്തിനകം പെอร์ഫോമൻസ്
                ഗ്യാരന്റിയായി ടെണ്ടറിൽ കോട്ട് ചെയ്തിരിക്കുന്ന {quotedAmountStr}/- രൂപയുടെ 5% തുകയായ {performanceGuaranteeStr}/-
                രൂപയിൽ കുറയാത്ത തുക ട്രഷറി ഫിക്സഡ് ഡെപ്പോസിറ്റായി ഈ ഓഫീസിൽ
                കെട്ടിവയ്ക്കുന്നതിനും {stampPaperValueStr}/- രൂപയുടെ മുദ്രപത്രത്തിൽ വർക്ക് എഗ്രിമെൻ്റ് വയ്ക്കുന്നതിനും
                നിർദ്ദേശിക്കുന്നു.
            </p>
        );
    };

    return (
        <div className="bg-white text-black text-sm p-8">
            <div 
                className="max-w-4xl mx-auto border-2 border-black px-12 py-4 space-y-4"
                style={{ fontFamily: '"Times New Roman", "AnjaliOldLipi", serif' }}
            >
                <div className="text-center">
                    <h1 className="text-lg font-bold underline">"ഭരണഭാഷ-മാതൃഭാഷ"</h1>
                </div>
                
                <div className="text-sm">
                    <div className="flex justify-between">
                        <div>
                            <p>നമ്പർ: {tender.fileNo ? `ജി.കെ.റ്റി / ${tender.fileNo}` : '__________'}</p>
                            <p className="mt-1">ടെണ്ടർ നമ്പർ : {tender.eTenderNo || '__________'}</p>
                        </div>
                        <div className="text-right">
                            <p>ജില്ലാ ആഫീസറുടെ കാര്യാലയം,</p>
                            <p>ഭൂജലവകുപ്പ്, ഹൈസ്കൂൾ ജംഗ്ഷൻ</p>
                            <p>തേവള്ളി പി. ഓ, കൊല്ലം -691009</p>
                            <p>ഫോൺനമ്പർ. 0474 - 2790313</p>
                            <p>ഇമെയിൽ: gwdklm@gmail.com</p>
                            <p>തീയതി: {formatDateSafe(tender.selectionNoticeDate) || '__________'}</p>
                        </div>
                    </div>
                </div>

                <div className="mt-6">
                    <p>പ്രേഷകൻ</p>
                    <p className="ml-8">ജില്ലാ ആഫീസർ</p>
                </div>

                <div className="mt-8">
                    <p>സ്വീകർത്താവ്</p>
                    <div className="ml-8">
                        <p>{l1Bidder?.name || '____________________'}</p>
                        <p className="whitespace-pre-wrap">{l1Bidder?.address || '____________________'}</p>
                    </div>
                </div>
                
                <div className="mt-4">
                    <p>സർ,</p>
                </div>

                <div className="space-y-2">
                    <p className="flex text-justify">
                        <span className="w-20 shrink-0">വിഷയം :</span>
                        <span className="flex-1">
                            ഭൂജല വകുപ്പ്, കൊല്ലം - {tender.nameOfWorkMalayalam || tender.nameOfWork} - ടെണ്ടർ അംഗീകരിച്ച് സെലക്ഷൻ നോട്ടീസ് നൽകുന്നത് - സംബന്ധിച്ച്
                        </span>
                    </p>
                    <p className="flex">
                        <span className="w-20 shrink-0">സൂചന :</span>
                        <span>ഈ ഓഫീസിലെ {formatDateSafe(tender.dateOfTechnicalAndFinancialBidOpening) || '__________'} തീയതിയിലെ ടെണ്ടർ നമ്പർ {tender.eTenderNo || '__________'}</span>
                    </p>
                </div>
                
                <div className="mt-4">
                    <MainContent />
                </div>
                
                <div className="text-right mt-8">
                    <p>വിശ്വസ്തതയോടെ</p>
                    <br /><br /><br /><br /><br /><br /><br /><br /><br /><br />
                    <p className="font-semibold">ജില്ലാ ആഫീസർ</p>
                </div>
            </div>
        </div>
    );
}
