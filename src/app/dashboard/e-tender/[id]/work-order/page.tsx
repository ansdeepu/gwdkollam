// src/app/dashboard/e-tender/[id]/work-order/page.tsx
"use client";

import React, { useEffect, useMemo } from 'react';
import { useTenderData } from '@/components/e-tender/TenderDataContext';
import { formatDateSafe, toDateOrNull } from '@/components/e-tender/utils';
import { useDataStore } from '@/hooks/use-data-store';
import { StaffMember } from '@/lib/schemas';

const numberToWords = (num: number): string => {
    if (num < 0) return 'Negative';
    if (num === 0) return 'Zero';

    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const numToWords = (n: number): string => {
        if (n < 10) return ones[n];
        if (n < 20) return teens[n - 10];
        if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ` ${ones[n % 10]}` : '');
        if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ` and ${numToWords(n % 100)}` : '');
        if (n < 100000) return numToWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ` ${numToWords(n % 1000)}` : '');
        if (n < 10000000) return numToWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ` ${numToWords(n % 100000)}` : '');
        return 'Number too large';
    };

    return numToWords(num);
};

export default function WorkOrderPrintPage() {
    const { tender } = useTenderData();
    const { allStaffMembers } = useDataStore();

    useEffect(() => {
        if (tender) {
            document.title = `Work_Order_${tender.eTenderNo?.replace(/\//g, '_') || 'Tender'}`;
        }
    }, [tender]);

    const l1Bidder = useMemo(() => {
        if (!tender.bidders || tender.bidders.length === 0) return null;
        return tender.bidders.reduce((lowest, current) => 
            (current.quotedAmount && lowest.quotedAmount && current.quotedAmount < lowest.quotedAmount) ? current : lowest
        );
    }, [tender.bidders]);

    const workOrderTitle = tender.tenderType === 'Purchase' ? 'സപ്ലൈ ഓർഡർ' : 'വർക്ക് ഓർഡർ';
    
    const getStaffInfo = (name: string | undefined | null): StaffMember | undefined => {
        if (!name) return undefined;
        return allStaffMembers.find(s => s.name === name);
    };

    const measurer = getStaffInfo(tender.nameOfAssistantEngineer);
    const supervisor1 = getStaffInfo(tender.supervisor1Name);
    const supervisor2 = getStaffInfo(tender.supervisor2Name);
    const supervisor3 = getStaffInfo(tender.supervisor3Name);
    
    const amountInWords = l1Bidder?.quotedAmount ? numberToWords(Math.round(l1Bidder.quotedAmount)) : '';

    return (
        <div className="bg-white text-black p-8" style={{ fontFamily: 'AnjaliNewLipi, sans-serif' }}>
            <div className="max-w-4xl mx-auto border-2 border-black p-16 space-y-12 min-h-[29.7cm]">
                <div className="text-center">
                    <h1 className="text-lg font-bold underline">{workOrderTitle}</h1>
                </div>

                <div className="text-sm flex justify-between">
                    <div>
                        <p>നമ്പർ: {tender.fileNo ? `ജി.കെ.റ്റി / ${tender.fileNo}` : '__________'}</p>
                    </div>
                    <div className="text-right">
                        <p>ജില്ലാ ആഫീസറുടെ കാര്യാലയം,</p>
                        <p>ഭൂജലവകുപ്പ്, കൊല്ലം</p>
                        <p>തീയതി: {formatDateSafe(tender.dateWorkOrder) || '__________'}</p>
                    </div>
                </div>

                <div className="text-sm space-y-2">
                    <p className="flex">
                        <span className="w-20">വിഷയം :</span>
                        <span>
                            {tender.nameOfWork} - {workOrderTitle} നൽകുന്നത് സംബന്ധിച്ച്.
                        </span>
                    </p>
                    <p className="flex">
                        <span className="w-20">സൂചന :</span>
                        <span>
                            1) ഈ ഓഫീസിലെ ടെണ്ടർ നമ്പർ {tender.eTenderNo || '__________'}<br />
                            2) {formatDateSafe(tender.agreementDate) || '__________'} തീയതിയിലെ എഗ്രിമെന്റ്.
                        </span>
                    </p>
                </div>
                
                <p className="text-sm leading-relaxed text-justify">
                    സൂചന (1) പ്രകാരം {tender.location}-ൽ {tender.nameOfWork} എന്ന പ്രവൃത്തിക്ക് താങ്കൾ സമർപ്പിച്ച ടെണ്ടർ അംഗീകരിക്കുകയും സൂചന (2) പ്രകാരം താങ്കൾ എഗ്രിമെന്റ് വെക്കുകയും ചെയ്ത സാഹചര്യത്തിൽ പ്രസ്തുത പ്രവൃത്തി ചെയ്യുന്നതിനായി {l1Bidder?.quotedAmount?.toLocaleString('en-IN') ?? '__________'}/- രൂപക്ക് ({amountInWords} രൂപ) {workOrderTitle} നൽകുന്നു.
                </p>

                <p className="text-sm leading-relaxed text-justify">
                    പ്രവൃത്തിയുടെ മെഷർമെന്റ് രേഖപ്പെടുത്തുന്നതിന് താഴെ പറയുന്ന ഉദ്യോഗസ്ഥനെ ചുമതലപ്പെടുത്തിയിരിക്കുന്നു.
                </p>

                <div className="text-sm ml-8">
                    <p>{measurer?.name || '____________________'}</p>
                    <p>{measurer?.designation || '____________________'}</p>
                </div>

                <p className="text-sm leading-relaxed text-justify">
                    പ്രവൃത്തിയുടെ മേൽനോട്ടത്തിനായി താഴെ പറയുന്ന ഉദ്യോഗസ്ഥരെ ചുമതലപ്പെടുത്തിയിരിക്കുന്നു.
                </p>

                <div className="text-sm ml-8 space-y-2">
                    {supervisor1 && <div><p>{supervisor1.name}, {supervisor1.designation}</p></div>}
                    {supervisor2 && <div><p>{supervisor2.name}, {supervisor2.designation}</p></div>}
                    {supervisor3 && <div><p>{supervisor3.name}, {supervisor3.designation}</p></div>}
                    {!supervisor1 && !supervisor2 && !supervisor3 && <p>____________________</p>}
                </div>
                
                <div className="mt-24 text-right">
                    <p>വിശ്വസ്തതയോടെ</p>
                    <br /><br /><br />
                    <p className="font-semibold">ജില്ലാ ആഫീസർ</p>
                </div>
                
                <div className="text-xs space-y-1 mt-12">
                    <p>പകർപ്പ് :</p>
                    <ol className="list-decimal list-inside ml-4">
                        <li>{measurer?.name || '____________________'}, {measurer?.designation || '____________________'}</li>
                        <li>{supervisor1?.name || '____________________'}, {supervisor1?.designation || '____________________'}</li>
                        <li>{supervisor2?.name || '____________________'}, {supervisor2?.designation || '____________________'}</li>
                        <li>{supervisor3?.name || '____________________'}, {supervisor3?.designation || '____________________'}</li>
                        <li>ഫയൽ/ഓഫീസ് കോപ്പി</li>
                    </ol>
                </div>
            </div>
        </div>
    );
}
