// src/app/dashboard/e-tender/[id]/work-order/page.tsx
"use client";

import React, { useEffect, useMemo } from 'react';
import { useTenderData } from '@/components/e-tender/TenderDataContext';
import { formatDateSafe } from '@/components/e-tender/utils';
import { useDataStore } from '@/hooks/use-data-store';
import type { StaffMember } from '@/lib/schemas';
import { numberToWords } from '@/components/e-tender/pdf/generators/utils';

export default function WorkOrderPrintPage() {
    const { tender } = useTenderData();
    const { officeAddress, allStaffMembers } = useDataStore();

    useEffect(() => {
        if (tender) {
            document.title = `Work_Order_${tender.eTenderNo?.replace(/\//g, '_') || 'Tender'}`;
            window.print();
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
        <div className="-m-6 bg-white min-h-screen">
          <div className="max-w-4xl mx-auto p-12 space-y-8 font-serif text-black">
              <div className="text-center">
                  <h1 className="text-lg font-bold underline">{workOrderTitle}</h1>
              </div>

              <div className="text-sm flex justify-between">
                  <div>
                      <p>നമ്പർ: <span className="font-mono">{tender.fileNo ? `ജി.കെ.റ്റി / ${tender.fileNo}` : '__________'}</span></p>
                  </div>
                  <div className="text-right">
                      <p>{officeAddress?.officeName || 'ജില്ലാ ആഫീസറുടെ കാര്യാലയം,'}</p>
                      <p className="whitespace-pre-wrap">{officeAddress?.address || 'ഭൂജലവകുപ്പ്, കൊല്ലം'}</p>
                      <p>തീയതി: <span className="font-mono">{formatDateSafe(tender.dateWorkOrder) || '__________'}</span></p>
                  </div>
              </div>

              <div className="text-sm space-y-2">
                  <p className="flex">
                      <span className="w-20 shrink-0">വിഷയം :</span>
                      <span className="text-justify">
                          {tender.nameOfWorkMalayalam || tender.nameOfWork} - {workOrderTitle} നൽകുന്നത് സംബന്ധിച്ച്.
                      </span>
                  </p>
                  <p className="flex">
                      <span className="w-20 shrink-0">സൂചന :</span>
                      <span>
                          1) ഈ ഓഫീസിലെ ടെണ്ടർ നമ്പർ <span className="font-mono">{tender.eTenderNo || '__________'}</span><br />
                          2) <span className="font-mono">{formatDateSafe(tender.agreementDate) || '__________'}</span> തീയതിയിലെ എഗ്രിമെന്റ്.
                      </span>
                  </p>
              </div>
              
              <p className="text-sm leading-relaxed text-justify indent-8">
                  സൂചന (1) പ്രകാരം {tender.location}-ൽ {tender.nameOfWorkMalayalam || tender.nameOfWork} എന്ന പ്രവൃത്തിക്ക് താങ്കൾ സമർപ്പിച്ച ടെണ്ടർ അംഗീകരിക്കുകയും സൂചന (2) പ്രകാരം താങ്കൾ എഗ്രിമെന്റ് വെക്കുകയും ചെയ്ത സാഹചര്യത്തിൽ പ്രസ്തുത പ്രവൃത്തി ചെയ്യുന്നതിനായി <span className="font-mono">{l1Bidder?.quotedAmount?.toLocaleString('en-IN') ?? '__________'}/-</span> രൂപക്ക് ({amountInWords} രൂപ) {workOrderTitle} നൽകുന്നു.
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
              
              <div className="pt-24 text-right">
                  <p>വിശ്വസ്തതയോടെ</p>
                  <div className="h-16" />
                  <p className="font-semibold">{officeAddress?.districtOfficer || 'ജില്ലാ ആഫീസർ'}</p>
              </div>
              
              <div className="text-xs space-y-1 pt-12">
                  <p>പകർപ്പ് :</p>
                  <ol className="list-decimal list-inside ml-4">
                      <li>{measurer?.name || '____________________'}, {measurer?.designation || '____________________'}</li>
                      <li>{supervisor1?.name || '____________________'}, {supervisor1?.designation || '____________________'}</li>
                      {supervisor2 && <li>{supervisor2.name}, {supervisor2.designation}</li>}
                      {supervisor3 && <li>{supervisor3.name}, {supervisor3.designation}</li>}
                      <li>ഫയൽ/ഓഫീസ് കോപ്പി</li>
                  </ol>
              </div>
          </div>
        </div>
    );
}
