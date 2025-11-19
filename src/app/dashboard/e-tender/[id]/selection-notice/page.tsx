// src/app/dashboard/e-tender/[id]/selection-notice/page.tsx
"use client";

import React, { useEffect, useMemo } from 'react';
import { useTenderData } from '@/components/e-tender/TenderDataContext';
import { formatDateSafe, toDateOrNull } from '@/components/e-tender/utils';

export default function SelectionNoticePrintPage() {
    const { tender } = useTenderData();

    useEffect(() => {
        if (tender) {
            document.title = `Selection_Notice_${tender.eTenderNo?.replace(/\//g, '_') || 'Tender'}`;
        }
    }, [tender]);
    
    const l1Bidder = useMemo(() => {
        if (!tender.bidders || tender.bidders.length === 0) return null;
        return tender.bidders.reduce((lowest, current) => 
            (current.quotedAmount && lowest.quotedAmount && current.quotedAmount < lowest.quotedAmount) ? current : lowest
        );
    }, [tender.bidders]);

    const performanceGuarantee = tender.performanceGuaranteeAmount ?? 0;
    const stampPaperValue = tender.stampPaperAmount ?? 200;

    return (
        <div className="bg-white text-black p-8" style={{ fontFamily: 'AnjaliNewLipi, sans-serif' }}>
            <div className="max-w-4xl mx-auto border-2 border-black p-16 space-y-12 min-h-[29.7cm]">
                <div className="text-center">
                    <h1 className="text-lg font-bold underline">"ഭരണഭാഷ-മാതൃഭാഷ"</h1>
                </div>
                
                <div className="text-sm flex justify-between">
                    <div>
                        <p>നമ്പർ: {tender.fileNo ? `ജി.കെ.റ്റി / ${tender.fileNo}` : '__________'}</p>
                        <p>ടെണ്ടർ നമ്പർ : {tender.eTenderNo || '__________'}</p>
                    </div>
                    <div className="text-right">
                        <p>ജില്ലാ ആഫീസറുടെ കാര്യാലയം,</p>
                        <p>ഭൂജലവകുപ്പ്, ഹൈസ്കൂൾ ജംഗ്ഷൻ</p>
                        <p>തേവള്ളി പി. ഓ, കൊല്ലം -691009</p>
                        <p>ഫോൺനമ്പർ. 0474 - 2790313</p>
                        <p>ഇമെയിൽ: gwdklm@gmail.com</p>
                        <p>തീയതി: {formatDateSafe(new Date())}</p>
                    </div>
                </div>

                <div>
                    <p className="text-sm">പ്രേഷകൻ</p>
                    <p className="text-sm ml-8">ജില്ലാ ആഫീസർ</p>
                </div>

                <div>
                    <p className="text-sm">സ്വീകർത്താവ്</p>
                    <div className="text-sm ml-8">
                        <p>{l1Bidder?.name || '____________________'}</p>
                        <p className="whitespace-pre-wrap">{l1Bidder?.address || '____________________'}</p>
                    </div>
                </div>
                
                <div>
                    <p className="text-sm">സർ,</p>
                </div>

                <div className="text-sm space-y-2">
                    <p className="flex">
                        <span className="w-20">വിഷയം :</span>
                        <span>
                            ഭൂജല വകുപ്പ്, കൊല്ലം - {tender.location} {tender.nameOfWork} - ടെണ്ടർ അംഗീകരിച്ച് സെലക്ഷൻ നോട്ടീസ് നൽകുന്നത് - സംബന്ധിച്ച്
                        </span>
                    </p>
                    <p className="flex">
                        <span className="w-20">സൂചന :</span>
                        <span>ഈ ഓഫീസിലെ {formatDateSafe(tender.dateOfTechnicalAndFinancialBidOpening) || '__________'} തീയതിയിലെ ടെണ്ടർ നമ്പർ {tender.eTenderNo || '__________'}</span>
                    </p>
                </div>
                
                <p className="text-sm leading-relaxed text-justify">
                    മേൽ സൂചന പ്രകാരം {tender.location} {tender.nameOfWork} നടപ്പിലാക്കുന്നതിന് വേണ്ടി താങ്കൾ
                    സമർപ്പിച്ചിട്ടുള്ള ടെണ്ടർ അംഗീകരിച്ചു. ടെണ്ടർ പ്രകാരമുള്ള പ്രവൃത്തികൾ ഏറ്റെടുക്കുന്നതിന്
                    മുന്നോടിയായി ഈ നോട്ടീസ് തീയതി മുതൽ പതിന്നാല് ദിവസത്തിനകം പെർഫോമൻസ്
                    ഗ്യാരന്റിയായി ടെണ്ടറിൽ കോട്ട് ചെയ്തിരിക്കുന്ന {l1Bidder?.quotedAmount?.toLocaleString('en-IN') ?? '__________'}/- രൂപയുടെ 5% തുകയായ {performanceGuarantee.toLocaleString('en-IN') ?? '__________'}/-
                    രൂപയിൽ കുറയാത്ത തുക ട്രഷറി ഫിക്സഡ് ഡെപ്പോസിറ്റായി ഈ ഓഫീസിൽ
                    കെട്ടിവയ്ക്കുന്നതിനും {stampPaperValue.toLocaleString('en-IN') ?? '200'}/- രൂപയുടെ മുദ്രപത്രത്തിൽ വർക്ക് എഗ്രിമെൻ്റ് വയ്ക്കുന്നതിനും
                    നിർദ്ദേശിക്കുന്നു.
                </p>
                
                <div className="mt-24 text-right">
                    <p>വിശ്വസ്തതയോടെ</p>
                    <br /><br /><br />
                    <p className="font-semibold">ജില്ലാ ആഫീസർ</p>
                </div>
            </div>
        </div>
    );
}
