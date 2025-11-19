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
            const prefix = tender.tenderType === 'Purchase' ? 'Supply_Order' : 'Work_Order';
            document.title = `${prefix}_${tender.eTenderNo?.replace(/\//g, '_') || 'Tender'}`;
        }
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
    const workOrderTitle = tender.tenderType === 'Purchase' ? 'സപ്ലൈ ഓർഡർ' : 'വർക്ക് ഓർഡർ';
    const measurer = allStaffMembers.find(s => s.name === tender.nameOfAssistantEngineer);
    const supervisor1 = allStaffMembers.find(s => s.id === tender.supervisor1Id);
    const supervisor2 = allStaffMembers.find(s => s.id === tender.supervisor2Id);
    const supervisor3 = allStaffMembers.find(s => s.id === tender.supervisor3Id);

    const supervisors = [
        measurer ? `${measurer.name}, ${measurer.designation}` : null,
        ...[supervisor1, supervisor2, supervisor3]
            .filter((s): s is StaffMember => !!s)
            .map(s => `${s.name}, ${s.designation}${s.phoneNo ? ` (ഫോൺ നമ്പർ: ${s.phoneNo})` : ''}`)
    ].filter(Boolean);

    const supervisorListText = supervisors.length > 0 ? supervisors.join(', ') : '____________________';

    const mainParagraph = `മേൽ സൂചന പ്രകാരം ${tender.nameOfWorkMalayalam || tender.nameOfWork} എന്ന പ്രവൃത്തി നടപ്പിലാക്കുന്നതിന് വേണ്ടി താങ്കൾ സമർപ്പിച്ചിട്ടുള്ള ടെണ്ടർ അംഗീകരിച്ചു. ടെണ്ടർ ഷെഡ്യൂൾ പ്രവൃത്തികൾ ഏറ്റെടുത്ത് നിശ്ചിത സമയപരിധിയായ ${tender.periodOfCompletion || '___'} ദിവസത്തിനുള്ളിൽ ഈ ഓഫീസിലെ ${supervisorListText} എന്നിവരുടെ മേൽനോട്ടത്തിൽ വിജയകരമായി പൂർത്തിയാക്കി പൂർത്തീകരണ റിപ്പോർട്ടും വർക്ക് ബില്ലും ഓഫീസിൽ ഹാജരാക്കേണ്ടതാണ്.`;
    
    const copyToList = [
        measurer,
        supervisor1,
        supervisor2,
        supervisor3,
        allStaffMembers.find(s => s.designation === "Assistant Executive Engineer"), // AEE
    ].filter((p): p is StaffMember => !!p);


    // For "Purchase" type tenders (English)
    const quotedAmountInWords = l1Bidder?.quotedAmount ? numberToWords(Math.floor(l1Bidder.quotedAmount)) : '';
    const supplySupervisors = [
        measurer?.name,
        supervisor1?.name,
        supervisor2?.name,
        supervisor3?.name,
    ].filter(Boolean).join(', ');
    const supplySupervisorPhone = measurer?.phoneNo || supervisor1?.phoneNo || supervisor2?.phoneNo || supervisor3?.phoneNo;
    const supervisorDetailsText = `${supplySupervisors}${supplySupervisorPhone ? ` (Phone: ${supplySupervisorPhone})` : ''}`;


    if (tender.tenderType === 'Purchase') {
        return (
            <div className="-m-6 bg-white min-h-screen">
              <div className="max-w-5xl mx-auto p-12 text-black text-sm" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
                {/* Page 1 */}
                <div className="space-y-4">
                    <div className="flex justify-between">
                        <div>
                            <p>File No. GKT/{tender.fileNo || '__________'}</p>
                            <p>Tender No. {tender.eTenderNo || '__________'}</p>
                        </div>
                        <div className="text-right">
                            <p>Office of the District Officer</p>
                            <p>Ground Water Department</p>
                            <p>Kollam - 691009</p>
                            <p>Phone: 0474 - 2790313</p>
                            <p>Email: gwdklm@gmail.com</p>
                            <p>Date: {formatDateSafe(tender.dateWorkOrder) || '__________'}</p>
                        </div>
                    </div>
                    <div className="flex justify-between items-start pt-6">
                        <span>From</span>
                        <span>District Officer</span>
                    </div>
                    <div className="pt-2">
                        <p>To</p>
                        <div className="ml-8">
                            <p>{l1Bidder?.name || '____________________'}</p>
                            <p className="whitespace-pre-wrap">{l1Bidder?.address || '____________________'}</p>
                        </div>
                    </div>
                    <p>Sir,</p>
                    <div className="flex space-x-4">
                        <span>Sub:</span>
                        <p className="text-justify leading-relaxed">GWD, Kollam - {tender.nameOfWork} - Supply Order issued – reg.</p>
                    </div>
                    <div className="flex space-x-4">
                        <span>Ref:</span>
                        <div className="flex-1">
                            <p>1. e-Tender Notice of this office, {tender.eTenderNo || '__________'}, dated {formatDateSafe(tender.tenderDate) || '__________'}.</p>
                            <p>2. Supply Agreement No. {tender.eTenderNo || '__________'}, dated {formatDateSafe(tender.agreementDate) || '__________'}.</p>
                        </div>
                    </div>
                    <p className="text-justify leading-relaxed indent-8">As per the 1st reference cited above, e-tender was invited for the purchase of {tender.nameOfWork}.</p>
                    <p className="text-justify leading-relaxed indent-8">Vide the 2nd reference cited, {l1Bidder?.name || 'N/A'}, {l1Bidder?.address || 'N/A'}, submitted the lowest bid of Rs. {l1Bidder?.quotedAmount?.toLocaleString('en-IN') || '0.00'}/- (Rupees {quotedAmountInWords} only) for the aforesaid purchase. Your bid was accepted accordingly.</p>
                    <p className="text-justify leading-relaxed indent-8">You are therefore directed to supply the items as per the schedule and specifications mentioned in the e-tender, and complete the supply within the stipulated period of {tender.periodOfCompletion || '___'} days under the supervision of {supervisorDetailsText}. Thereafter, you shall submit the bill in triplicate to this office for processing of payment.</p>
                    <div className="flex justify-end pt-8">
                        <span>District Officer</span>
                    </div>
                    <div className="pt-16 text-xs">
                      <p>Copy to:</p>
                      <p>1. File</p>
                      <p>2. OC</p>
                    </div>
                </div>

                {/* Page 2 */}
                <div className="space-y-6 print:break-before-page pt-12">
                    <div className="text-center">
                        <h2 className="font-bold underline">Special Conditions</h2>
                        <ol className="list-decimal list-inside text-left mt-2 space-y-1">
                            <li>The entire supply shall be completed within 15 days from the date of receipt of this order.</li>
                            <li>No advance payment will be made for the entire supply of items.</li>
                        </ol>
                    </div>
                     <div className="text-center">
                        <h2 className="font-bold underline">Notes</h2>
                        <ol className="list-decimal list-inside text-left mt-2 space-y-2 text-justify">
                            <li>INVOICES IN TRIPLICATE SHOULD BE DRAWN ON AND FORWARDED FOR PAYMENT TO The District Officer, District Office, Groundwater Department, High School Junction, Kollam – 691009.</li>
                            <li>Acknowledgment and all other communications regarding this purchase may be sent to the District Officer.</li>
                            <li>In all future correspondence and bills relating to this order the number and date at the top should INVARIABLY be quoted.</li>
                            <li>The payment will be paid for only after getting the satisfactory report from supervisory staff of this office.</li>
                        </ol>
                    </div>
                    <div className="text-center pt-4">
                        <h2 className="font-bold underline">List of items to be supplied</h2>
                         <table className="w-full mt-2 border-collapse border border-black text-xs">
                            <thead>
                                <tr className="border border-black">
                                    <th className="border border-black p-1">Item No</th>
                                    <th className="border border-black p-1">Description of item</th>
                                    <th className="border border-black p-1">Quantity</th>
                                    <th className="border border-black p-1">Unit</th>
                                    <th colSpan={2} className="border border-black p-1">Rates</th>
                                    <th colSpan={2} className="border border-black p-1">Total</th>
                                </tr>
                                <tr className="border border-black">
                                  <th className="border border-black p-1"></th><th className="border border-black p-1"></th><th className="border border-black p-1"></th><th className="border border-black p-1"></th>
                                  <th className="border border-black p-1">Rs.</th><th className="border border-black p-1">Ps.</th>
                                  <th className="border border-black p-1">Rs.</th><th className="border border-black p-1">Ps.</th>
                                </tr>
                                 <tr className="border border-black text-center"><th className="border border-black p-1">1</th><th className="border border-black p-1">2</th><th className="border border-black p-1">3</th><th className="border border-black p-1">4</th><th colSpan={2} className="border border-black p-1">5</th><th colSpan={2} className="border border-black p-1"></th></tr>
                            </thead>
                            <tbody>
                                <tr className="border border-black">
                                    <td className="border border-black p-1 text-center">1</td>
                                    <td className="border border-black p-1 text-left">{tender.nameOfWork}</td>
                                    <td className="border border-black p-1 text-center"></td>
                                    <td className="border border-black p-1 text-center"></td>
                                    <td colSpan={2} className="border border-black p-1 text-center">-</td>
                                    <td colSpan={2} className="border border-black p-1 text-center">Rs. {l1Bidder?.quotedAmount?.toLocaleString('en-IN') || ''}/-</td>
                                </tr>
                                <tr className="border-t border-black">
                                    <td colSpan={6} className="text-right p-1 font-bold">Total (Rounded to)</td>
                                    <td colSpan={2} className="p-1 text-center font-bold">Rs. {l1Bidder?.quotedAmount?.toLocaleString('en-IN') || ''}/-</td>
                                </tr>
                                <tr>
                                    <td colSpan={8} className="p-2 text-center font-bold">(Rupees {quotedAmountInWords} only)</td>
                                </tr>
                            </tbody>
                        </table>
                        <p className="text-xs text-left mt-2">N.B: The specifications, quantities, price, etc., are subject to correction. Errors or omissions, if any, will be intimated to or by the contractor within ten days from this date.</p>
                    </div>
                    <div className="pt-24 flex justify-end">
                        <span>District officer</span>
                    </div>
                </div>
              </div>
            </div>
        );
    }
    
    // Default to "Work" order format
    return (
        <div className="-m-6 bg-white min-h-screen">
          <div className="max-w-4xl mx-auto p-12 space-y-6 font-serif text-black text-sm">
              <div className="text-center">
                  <h1 className="text-lg font-bold underline">"ഭരണഭാഷ-മാതൃഭാഷ"</h1>
              </div>

              <div className="flex justify-between">
                  <div>
                      <p>നമ്പർ: ജി.കെ.റ്റി / {tender.fileNo || '__________'}</p>
                      <p>ടെണ്ടർ നമ്പർ : {tender.eTenderNo || '__________'}</p>
                  </div>
                  <div className="text-right">
                      <p>{officeAddress?.officeName || 'ജില്ലാ ആഫീസറുടെ കാര്യാലയം,'}</p>
                      <p className="whitespace-pre-wrap">{officeAddress?.address || 'ഭൂജലവകുപ്പ്, കൊല്ലം - 691009'}</p>
                      <p>ഫോൺനമ്പർ. {officeAddress?.phoneNo || '0474 - 2790313'}</p>
                      <p>ഇമെയിൽ: {officeAddress?.email || 'gwdklm@gmail.com'}</p>
                      <p>തീയതി: {formatDateSafe(tender.dateWorkOrder) || '__________'}</p>
                  </div>
              </div>

              <div>
                  <p>പ്രേഷകൻ</p>
                  <p className="ml-8">{officeAddress?.districtOfficer || 'ജില്ലാ ആഫീസർ'}</p>
              </div>

              <div>
                  <p>സ്വീകർത്താവ്</p>
                  <div className="ml-8">
                      <p>{l1Bidder?.name || '____________________'}</p>
                      <p className="whitespace-pre-wrap">{l1Bidder?.address || '____________________'}</p>
                  </div>
              </div>
              
              <p>സർ,</p>

              <div className="space-y-2">
                    <div className="grid grid-cols-[auto,1fr] gap-x-2">
                        <span className="font-semibold">വിഷയം:</span>
                        <span className="text-justify">{tender.nameOfWorkMalayalam || tender.nameOfWork} - ടെണ്ടർ അംഗീകരിച്ച് {workOrderTitle} നൽകുന്നത്– സംബന്ധിച്ച്.</span>
                    </div>
                    <div className="grid grid-cols-[auto,1fr] gap-x-2">
                        <span className="font-semibold">സൂചന:</span>
                        <span className="flex flex-col">
                            <span>1. ഈ ഓഫീസിലെ {formatDateSafe(tender.dateOfOpeningBid) || '__________'} തീയതിയിലെ ടെണ്ടർ നമ്പർ {tender.eTenderNo || '__________'}</span>
                            <span>2. വർക്ക് എഗ്രിമെന്റ് നമ്പർ {tender.eTenderNo || '__________'} തീയതി {formatDateSafe(tender.agreementDate) || '__________'}</span>
                        </span>
                    </div>
              </div>
              
              <p className="leading-relaxed text-justify indent-8">
                {mainParagraph}
              </p>

              <div className='pl-8 space-y-1'>
                <p>എസ്റ്റിമേറ്റ് തുക : {tender.estimateAmount?.toLocaleString('en-IN') || '0'} രൂപ</p>
                <p>എഗ്രിമെന്റ് തുക: {l1Bidder?.quotedAmount?.toLocaleString('en-IN') || '0'} രൂപ</p>
              </div>

              <div>
                <p className="font-bold underline">നിബന്ധനകൾ</p>
                <ol className="list-decimal list-outside ml-12 space-y-1 text-justify leading-relaxed">
                    <li>എല്ലാ വർക്കുകളും തുടങ്ങേണ്ടതും പൂർത്തീകരിക്കേണ്ടതും വകുപ്പ് സൂപ്പർവിഷന് നിയോഗിക്കുന്ന ഉദ്യോഗസ്ഥന്റെ സാന്നിധ്യത്തിൽ ആയിരിക്കണം.</li>
                    <li>കുഴൽകിണർ നിർമ്മാണം, ട്യൂബ് വെൽ നിർമ്മാണം, കുടിവെള്ള പദ്ധതി, കൃത്രിമ ഭൂജലസംപോഷണ പദ്ധതി എന്നിവയ്ക്കായി ഉപയോഗിക്കുന്ന പൈപ്പുകളുടെ  ISI മുദ്ര, ബ്യൂറോ ഓഫ് ഇന്ത്യൻ സ്റ്റാൻഡേർഡ്‌സ്‌ അംഗീകരിച്ചിട്ടുള്ള ലിസ്റ്റിൽ ഉൾപ്പെടുന്നതായിരിക്കണം. ആയത് സംബന്ധിച്ച ഗുണനിലവാര സർട്ടിഫിക്കറ്റ് പ്രവൃത്തി നിർവഹണത്തിന് മുന്നോടിയായി ഓഫീസിൽ സമർപ്പിക്കേണ്ടതാണ്.</li>
                    <li>വർക്ക് ഓർഡർ ലഭിച്ചതിന് 5 ദിവസത്തിനകം വർക്ക് തുടങ്ങിയിരിക്കേണ്ടതും, വർക്ക് ഓർഡറിൽ പറഞ്ഞിരിക്കുന്ന നിശ്ചിത ദിവസത്തിനകം വർക്ക് പൂർത്തീകരിക്കുകയും ചെയ്യേണ്ടതാണ്.</li>
                    <li>കുടിവെള്ളപദ്ധതികൾക്കായി വാട്ടർ ടാങ്ക് സ്ഥാപിക്കുന്ന ആംഗിൾ അയൺ അഥവാ കോൺക്രീറ്റ് സ്ട്രക്ച്ചർ / കോൺക്രീറ്റ് അഥവാ സ്റ്റീൽ പമ്പ് ഹൌസ് / ഹൈഡ്രന്റ് / വെൽ പ്രൊട്ടക്ഷൻ കവർ തുടങ്ങിയ എല്ലാ പ്രവൃത്തികളും പൂർത്തികരിക്കുന്നത് എസ്റ്റിമേറ്റിൽ പറഞ്ഞിരിക്കുന്ന അളവിലും തന്നിരിക്കുന്ന ഡ്രോയിംഗിന്റെ അടിസ്ഥാനത്തിലും ആയിരിക്കണം.</li>
                    <li>എസ്റ്റിമേറ്റിൽ പറഞ്ഞിരിക്കുന്ന സ്പെസിഫിക്കേഷൻ പ്രകാരം ഉള്ള വസ്തുക്കൾ മാത്രമാണ് പ്രവൃത്തിയ്ക്ക് ഉപയോഗിക്കേണ്ടത്.</li>
                    <li>വർക്ക് പൂർത്തീകരിച്ച് കംപ്ലീഷൻ സർട്ടിഫിക്കറ്റ് ഉൾപ്പെടെ ബിൽ സമർപ്പിക്കേണ്ടതാണ്. ഫണ്ടിന്റെ ലഭ്യത അനുസരിച്ചാണ്  ബിൽ തുക അനുവദിക്കുന്നത്.</li>
                    <li>പ്രവൃത്തി തൃപ്തികരമല്ലാത്ത പക്ഷം ബിൽ തുക മാറി നൽകുന്നതല്ല.</li>
                    <li>പ്രവൃത്തിക്ക് വേണ്ട നിശ്ചിത സമയ പരിധി നിർബന്ധമായും പാലിക്കേണ്ടതാണ്.</li>
                    <li>കുടിവെള്ളപദ്ധതിയുടെ കെട്ടിട നമ്പർ, കറണ്ട് കണക്ഷൻ എന്നിവ എടുത്ത് സ്‌കീം പൂർത്തീകരിച്ച് ഓണർഷിപ്പ് സർട്ടിഫിക്കറ്റ് ലഭ്യമാക്കേണ്ടത് കോൺട്രാക്ടറുടെ ചുമതലയാണ്.</li>
                    <li>കാലാ കാലങ്ങളിൽ ഉള്ള സർക്കാർ ഉത്തരവുകൾ  ഈ പ്രവൃത്തിക്കും ബാധകമായിരിക്കും.</li>
                    <li>സൈറ്റ് പരിതസ്ഥിതികൾക്ക് വിധേയമായി എന്തെങ്കിലും മാറ്റം നിർമ്മാണ ഘട്ടത്തിൽ പ്രവൃത്തിക്ക് വേണ്ടാതായി കാണുന്നുവെങ്കിൽ അത് ബന്ധപ്പെട്ട ഉദ്യോഗസ്ഥരുടെ നിർദ്ദേശാനുസരണം മാത്രം ചെയ്യേണ്ടതാണ് .</li>
                    <li>ഒരു കാരണവശാലും സ്‌കീമിന്റെ അന്തസത്തയ്ക്ക് കാതലായ മാറ്റം വരുത്തുന്ന രീതിയിലുള്ള രൂപഭേദങ്ങൾ വരുത്താൻ പാടില്ല.</li>
                    <li>പ്രവൃത്തിയെക്കുറിച്ചുള്ള ഏതൊരു അന്തിമ തീരുമാനവും ജില്ലാ ഓഫീസറിൽ നിക്ഷിപ്തമായിരിക്കും.</li>
                    <li>കരാറുടമ്പടി പ്രകാരം പ്രവൃത്തി പൂർത്തിയാക്കുന്നതിൽ കരാറുകാരൻ വീഴ്ച വരുത്തുകയാണെങ്കിൽ നിയമനുസൃതം നോട്ടീസ് അയച്ച് പതിന്നാല് ദിവസങ്ങൾക്ക് ശേഷം കരാർ റദ്ദാക്കാവുന്നതും മറ്റൊരു കരാറുകാരൻ വഴി പ്രവൃത്തി പൂർത്തിയാക്കാവുന്നതുമാണ്. അങ്ങനെ ചെയ്യുമ്പോൾ ഉണ്ടാകുന്ന അധിക ചെലവ് മുഴുവൻ കരാറുകാരന്റെ ബിൽ തുകയിൽ നിന്നും, ജാമ്യ നിക്ഷേപത്തിൽ നിന്നും, സ്ഥാവര ജംഗമ സ്വത്തുക്കളിൽ നിന്നും വസൂലാക്കുന്നതാണ്.</li>
                    <li>തൃപ്തികരമല്ലെന്ന് കാണുന്ന പ്രവൃത്തിയോ അല്ലെങ്കിൽ ഗുണനിലവാരമില്ലാത്ത സാധനങ്ങൾ ഉപയോഗിച്ചു കൊണ്ടുള്ള പ്രവൃത്തിയോ വകുപ്പ് നിർദ്ദേശിക്കുന്ന രീതിയിൽ പൊളിച്ചു മാറ്റി, ഗുണനിലവാരമുള്ള സാധനങ്ങൾ ഉപയോഗിച്ചു കൊണ്ട് കരാറുടമ്പടിയിൽ നിഷ്കർഷിക്കുന്ന രൂപത്തിലും ഘടനയിലും പുനർനിർമ്മിക്കുന്നതിന് കരാറുകാരൻ ബാധ്യസ്ഥനാണ്. അല്ലാത്ത പക്ഷം വകുപ്പിന്റെ യുക്തം പോലെ പിഴ ചുമത്തുന്നതാണ്.</li>
                </ol>
              </div>

              <div className="pt-10 text-right">
                  <p>വിശ്വസ്തതയോടെ</p>
                  <div className="h-16" />
                  <p className="font-semibold">{officeAddress?.districtOfficer || 'ജില്ലാ ആഫീസർ'}</p>
              </div>

              <div className="text-xs space-y-1 pt-8">
                  <p>പകർപ്പ്</p>
                  <ol className="list-decimal list-outside ml-8">
                      {copyToList.map((person, index) => (
                          <li key={index}>{person.name}, {person.designation}</li>
                      ))}
                      <li>ഫയൽ</li>
                  </ol>
              </div>
          </div>
        </div>
    );
}
