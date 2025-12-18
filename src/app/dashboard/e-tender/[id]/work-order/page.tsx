
// src/app/dashboard/e-tender/[id]/work-order/page.tsx
"use client";

import React, { useEffect, useMemo, useRef } from 'react';
import { useTenderData } from '@/components/e-tender/TenderDataContext';
import { formatDateSafe, formatTenderNoForFilename } from '@/components/e-tender/utils';
import { useDataStore } from '@/hooks/use-data-store';
import type { StaffMember } from '@/lib/schemas';
import { numberToWords } from '@/components/e-tender/pdf/generators/utils';

export default function WorkOrderPrintPage() {
    const { tender } = useTenderData();
    const { officeAddress, allStaffMembers } = useDataStore();
    const printTriggered = useRef(false);

    useEffect(() => {
        if (tender && !printTriggered.current) {
            const formattedTenderNo = formatTenderNoForFilename(tender.eTenderNo);
            document.title = `eWorkOrder${formattedTenderNo}`;
            setTimeout(() => window.print(), 500); // Automatically trigger print
            printTriggered.current = true;
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tender]);

    const l1Bidder = useMemo(() => {
        if (!tender.bidders || tender.bidders.length === 0) return null;
        const validBidders = tender.bidders.filter(b => typeof b.quotedAmount === 'number' && b.quotedAmount > 0);
        if (validBidders.length === 0) return null;
        return validBidders.reduce((lowest, current) =>
            (current.quotedAmount! < lowest.quotedAmount!) ? current : lowest
        );
    }, [tender.bidders]);
    
    // For "Work" type tenders (Malayalam)
    const workOrderTitle = 'വർക്ക് ഓർഡർ';
    const measurer = allStaffMembers.find(s => s.name === tender.nameOfAssistantEngineer);
    const supervisor1 = allStaffMembers.find(s => s.id === tender.supervisor1Id);
    const supervisor2 = allStaffMembers.find(s => s.id === tender.supervisor2Id);
    const supervisor3 = allStaffMembers.find(s => s.id === tender.supervisor3Id);

    const supervisors = [
        measurer,
        supervisor1,
        supervisor2,
        supervisor3
    ].filter((s): s is StaffMember => !!s);
    
    const supervisorListText = supervisors.length > 0 
        ? supervisors.map(s => `${s.nameMalayalam || s.name}, ${s.designationMalayalam || s.designation}${s.phoneNo ? ` (ഫോൺ നമ്പർ: ${s.phoneNo})` : ''}`).join(', ') 
        : '____________________';

    const mainParagraph = `മേൽ സൂചന പ്രകാരം ${tender.nameOfWorkMalayalam || tender.nameOfWork} നടപ്പിലാക്കുന്നതിന് വേണ്ടി താങ്കൾ സമർപ്പിച്ചിട്ടുള്ള ടെണ്ടർ അംഗീകരിച്ചു. ടെണ്ടർ ഷെഡ്യൂൾ പ്രവൃത്തികൾ ഏറ്റെടുത്ത് നിശ്ചിത സമയപരിധിയായ ${tender.periodOfCompletion || '___'} ദിവസത്തിനുള്ളിൽ ഈ ഓഫീസിലെ ${supervisorListText} എന്നിവരുടെ മേൽനോട്ടത്തിൽ വിജയകരമായി പൂർത്തിയാക്കി പൂർത്തീകരണ റിപ്പോർട്ടും വർക്ക് ബില്ലും ഓഫീസിൽ ഹാജരാക്കേണ്ടതാണ്.`;
    
    const copyToList = [
        ...supervisors,
        allStaffMembers.find(s => s.designation === "Assistant Executive Engineer"), // AEE
    ].filter((p): p is StaffMember => !!p);


    return (
        <div className="-m-6 bg-white min-h-screen">
          <div className="max-w-4xl mx-auto p-8 space-y-4 font-serif text-base">
              <div className="text-center">
                  <h1 className="font-bold underline">"ഭരണഭാഷ-മാതൃഭാഷ"</h1>
              </div>

              <div className="flex justify-between text-lg">
                  <div>
                      <p>നമ്പർ: ജി.കെ.റ്റി / {tender.fileNo || '__________'}</p>
                      <p>ടെണ്ടർ നമ്പർ : {tender.eTenderNo || '__________'}</p>
                  </div>
                  <div className="text-right">
                      <p className="whitespace-pre-wrap">{officeAddress?.officeNameMalayalam || 'ജില്ലാ ഓഫീസറുടെ കാര്യാലയം, ഭൂജലവകുപ്പ്'}</p>
                      <p className="whitespace-pre-wrap">{officeAddress?.addressMalayalam || 'ഹൈസ്കൂൾ ജംഗ്ഷൻ, തേവള്ളി പി. ഓ., കൊല്ലം - 691009'}</p>
                      <p>ഫോൺനമ്പർ. {officeAddress?.phoneNo || '0474 - 2790313'}</p>
                      <p>ഇമെയിൽ: {officeAddress?.email || 'gwdklm@gmail.com'}</p>
                      <p>തീയതി: {formatDateSafe(tender.dateWorkOrder) || '__________'}</p>
                  </div>
              </div>

               <div className="pt-4 text-lg">
                  <p>പ്രേഷകൻ</p>
                  <p className="ml-8">ജില്ലാ ആഫീസർ</p>
              </div>
              
              <div className="text-lg">
                  <p>സ്വീകർത്താവ്</p>
                  <div className="ml-8">
                      <p>{l1Bidder?.name || '____________________'}</p>
                      <p className="whitespace-pre-wrap">{l1Bidder?.address || '____________________'}</p>
                  </div>
              </div>
              
              <p className="text-lg">സർ,</p>

               <div className="grid grid-cols-[auto,1fr] gap-x-2 text-lg">
                    <span className="font-semibold">വിഷയം:</span>
                    <span className="text-justify">{tender.nameOfWorkMalayalam || tender.nameOfWork} - ടെണ്ടർ അംഗീകരിച്ച് {workOrderTitle} നൽകുന്നത്– സംബന്ധിച്ച്.</span>
                </div>
                <div className="grid grid-cols-[auto,1fr] gap-x-2 text-lg">
                    <span className="font-semibold">സൂചന:</span>
                    <span className="flex flex-col">
                        <span>1. ഈ ഓഫീസിലെ {formatDateSafe(tender.dateOfOpeningBid) || '__________'} തീയതിയിലെ ടെണ്ടർ നമ്പർ {tender.eTenderNo || '__________'}</span>
                        <span>2. വർക്ക് എഗ്രിമെന്റ് നമ്പർ {tender.eTenderNo || '__________'} തീയതി {formatDateSafe(tender.agreementDate) || '__________'}</span>
                    </span>
                </div>
              
              <p className="leading-normal text-justify indent-8 text-base">
                {mainParagraph}
              </p>

              <div className='pl-8 space-y-1 text-base'>
                <p>എസ്റ്റിമേറ്റ് തുക : {tender.estimateAmount?.toLocaleString('en-IN') || '0'} രൂപ</p>
                <p>എഗ്രിമെന്റ് തുക: {l1Bidder?.quotedAmount?.toLocaleString('en-IN') || '0'} രൂപ</p>
              </div>

              <div>
                <p className="font-bold underline text-lg">നിബന്ധനകൾ</p>
                <ol className="list-decimal list-outside ml-12 space-y-1 text-justify leading-normal text-base">
                    <li>എല്ലാ വർക്കുകളും തുടങ്ങേണ്ടതും പൂർത്തീകരിക്കേണ്ടതും വകുപ്പ് സൂപ്പർവിഷന് നിയോഗിക്കുന്ന ഉദ്യോഗസ്ഥന്റെ സാന്നിധ്യത്തിൽ ആയിരിക്കണം.</li>
                    <li>കുഴൽകിണർ നിർമ്മാണം, ട്യൂബ് വെൽ നിർമ്മാണം, കുടിവെള്ള പദ്ധതി, കൃത്രിമ ഭൂജലസംപോഷണ പദ്ധതി എന്നിവയ്ക്കായി ഉപയോഗിക്കുന്ന പൈപ്പുകളുടെ  ISI മുദ്ര, ബ്യൂറോ ഓഫ് ഇന്ത്യൻ സ്റ്റാൻഡേർഡ്‌സ്‌ അംഗീകരിച്ചിട്ടുള്ള ലിസ്റ്റിൽ ഉൾപ്പെടുന്നതായിരിക്കണം. ആയത് സംബന്ധിച്ച ഗുണനിലവാര സർട്ടിഫിക്കറ്റ് പ്രവൃത്തി നിർവഹണത്തിന് മുന്നോടിയായി ഓഫീസിൽ സമർപ്പിക്കേണ്ടതാണ്.</li>
                    <li>വർക്ക് ഓർഡർ ലഭിച്ചതിന് 5 ദിവസത്തിനകം വർക്ക് തുടങ്ങിയിരിക്കേണ്ടതും, വർക്ക് ഓർഡറിൽ പറഞ്ഞിരിക്കുന്ന നിശ്ചിത ദിവസത്തിനകം വർക്ക് പൂർത്തീകരിക്കുകയും ചെയ്യേണ്ടതാണ്.</li>
                    <li>കുടിവെള്ളപദ്ധതികൾക്കായി വാട്ടർ ടാങ്ക് സ്ഥാപിക്കുന്ന ആംഗിൾ അയൺ അഥവാ കോൺക്രീറ്റ് സ്ട്രക്ച്ചർ / കോൺക്രീറ്റ് അഥവാ സ്റ്റീൽ പമ്പ് ഹൌസ് / ഹൈഡ്രന്റ് / വെൽ പ്രൊട്ടക്ഷൻ കവർ തുടങ്ങിയ എല്ലാ പ്രവൃത്തികളും പൂർത്തികരിക്കുന്നത് എസ്റ്റിമേറ്റിൽ പറഞ്ഞിരിക്കുന്ന അളവിലും തന്നിരിക്കുന്ന ഡ്രോയിംഗിന്റെ അടിസ്ഥാനത്തിലും ആയിരിക്കണം.</li>
                    <li>എസ്റ്റിമേറ്റിൽ പറഞ്ഞിരിക്കുന്ന സ്പെസിഫിക്കേഷൻ പ്രകാരം ഉള്ള വസ്തുക്കൾ മാത്രമാണ് പ്രവൃത്തിയ്ക്ക് ഉപയോഗിക്കേണ്ടത്.</li>
                    <li>വർക്ക് പൂർത്തീകരിച്ച് കംപ്ലീഷൻ സർട്ടിഫിക്കറ്റ് ഉൾപ്പെടെ ബിൽ സമർപ്പിക്കേണ്ടതാണ്. ഫണ്ടിന്റെ ലഭ്യത അനുസരിച്ചാണ്  ബിൽ തുക മാറി നൽകുന്നത്.</li>
                    <li>പ്രവൃത്തി തൃപ്തികരമല്ലാത്ത പക്ഷം ബിൽ തുക മാറി നൽകുന്നതല്ല.</li>
                    <li>പ്രവൃത്തിക്ക് വേണ്ട നിശ്ചിത സമയ പരിധി നിർബന്ധമായും പാലിക്കേണ്ടതാണ്.</li>
                    <li>കുടിവെള്ളപദ്ധതിയുടെ കെട്ടിട നമ്പർ, കറണ്ട് കണക്ഷൻ എന്നിവ എടുത്ത് സ്‌کീം പൂർത്തീകരിച്ച് ഓണർഷിപ്പ് സർട്ടിഫിക്കറ്റ് ലഭ്യമാക്കേണ്ടത് കോൺട്രാക്ടറുടെ ചുമതലയാണ്.</li>
                    <li>കാലാ കാലങ്ങളിൽ ഉള്ള സർക്കാർ ഉത്തരവുകൾ  ഈ പ്രവൃത്തിക്കും ബാധകമായിരിക്കും.</li>
                    <li>സൈറ്റ് പരിതസ്ഥിതികൾക്ക് വിധേയമായി എന്തെങ്കിലും മാറ്റം നിർമ്മാണ ഘട്ടത്തിൽ പ്രവൃത്തിക്ക് വേണ്ടാതായി കാണുന്നുവെങ്കിൽ അത് ബന്ധപ്പെട്ട ഉദ്യോഗസ്ഥരുടെ നിർദ്ദേശാനുസരണം മാത്രം ചെയ്യേണ്ടതാണ് .</li>
                    <li>ഒരു കാരണവശാലും സ്‌کീമിന്റെ അന്തസത്തയ്ക്ക് കാതലായ മാറ്റം വരുത്തുന്ന രീതിയിലുള്ള രൂപഭേദങ്ങൾ വരുത്താൻ പാടില്ല.</li>
                    <li>പ്രവൃത്തിയെക്കുറിച്ചുള്ള ഏതൊരു അന്തിמ തീരുമാനവും ജില്ലാ ഓഫീസറിൽ നിക്ഷിപ്തമായിരിക്കും.</li>
                    <li>കരാറുടമ്പടി പ്രകാരം പ്രവൃത്തി പൂർത്തിയാക്കുന്നതിൽ കരാറുകാരൻ വീഴ്ച വരുത്തുകയാണെങ്കിൽ നിയമനുസൃതം നോട്ടീസ് അയച്ച് പതിന്നാല് ദിവസങ്ങൾക്ക് ശേഷം കരാർ റദ്ദാക്കാവുന്നതും മറ്റൊരു കരാറുകാരൻ വഴി പ്രവൃത്തി പൂർത്തിയാക്കാവുന്നതുമാണ്. അങ്ങനെ ചെയ്യുമ്പോൾ ഉണ്ടാകുന്ന അധിക ചെലവ് മുഴുവൻ കരാറുകാരന്റെ ബിൽ തുകയിൽ നിന്നും, ജാമ്യ നിക്ഷേപത്തിൽ നിന്നും, സ്ഥาวര ജംഗമ സ്വത്തുക്കളിൽ നിന്നും വസൂലാക്കുന്നതാണ്.</li>
                    <li>തൃപ്തികരമല്ലെന്ന് കാണുന്ന പ്രവൃത്തിയോ അല്ലെങ്കിൽ ഗുണനിലവാരമില്ലാത്ത സാധനങ്ങൾ ഉപയോഗിച്ചു കൊണ്ടുള്ള പ്രവൃത്തിയോ വകുപ്പ് നിർദ്ദേശിക്കുന്ന രീതിയിൽ പൊളിച്ചു മാറ്റി, ഗുണനിലവാരമുള്ള സാധനങ്ങൾ ഉപയോഗിച്ചു കൊണ്ട് കരാറുടമ്പടിയിൽ നിഷ്കർഷിക്കുന്ന രൂപത്തിലും ഘടനയിലും പുനർനിർമ്മിക്കുന്നതിന് കരാറുകാരൻ ബാധ്യസ്ഥനാണ്. അല്ലാത്ത പക്ഷം വകുപ്പിന്റെ യുക്തം പോലെ പിഴ ചുമത്തുന്നതാണ്.</li>
                </ol>
              </div>

              <div className="pt-8 text-right text-lg">
                  <p>വിശ്വസ്തതയോടെ</p>
                  <div className="h-12" />
                  <p className="font-semibold">ജില്ലാ ആഫീസർ</p>
              </div>

              <div className="text-base space-y-1 pt-6">
                  <p>പകർപ്പ്</p>
                  <ol className="list-decimal list-outside ml-8">
                      {copyToList.map((person, index) => (
                          <li key={index}>{person.nameMalayalam || person.name}, {person.designationMalayalam || person.designation}</li>
                      ))}
                      <li>ഫയൽ</li>
                  </ol>
              </div>
          </div>
        </div>
    );
}
