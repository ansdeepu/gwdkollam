// src/app/dashboard/e-tender/[id]/print/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useE_tenders, type E_tender } from "@/hooks/useE_tenders";
import { Loader2, Printer } from "lucide-react";
import { formatDateSafe } from "@/components/e-tender/utils";
import { Button } from "@/components/ui/button";

const DetailRow = ({ label, value, className = '' }: { label: string; value: any; className?: string }) => {
    if (value === null || value === undefined || value === '') return null;
    return (
        <tr className={className}>
            <td className="pr-4 py-1 font-semibold text-sm align-top">{label}</td>
            <td className="py-1 text-sm align-top break-words">{value}</td>
        </tr>
    );
};

export default function TenderPrintPage() {
    const params = useParams();
    const { id } = params;
    const { getTender, isLoading } = useE_tenders();
    const [tender, setTender] = useState<E_tender | null>(null);

    useEffect(() => {
        if (typeof id === 'string' && id) {
            getTender(id).then(setTender);
        }
    }, [id, getTender]);

    if (isLoading || !tender) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-gray-100">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="ml-3 text-muted-foreground">Loading Tender Data for Printing...</p>
            </div>
        );
    }

    const tenderAmount = tender.estimateAmount ? `Rs. ${tender.estimateAmount.toLocaleString('en-IN')}/-` : 'N/A';
    const emdAmount = tender.emd ? `Rs. ${tender.emd.toLocaleString('en-IN')}/-` : 'N/A';
    const submissionFee = tender.tenderFormFee ? `Rs. ${tender.tenderFormFee.toLocaleString('en-IN')} + GST` : 'N/A';

    return (
        <div className="bg-white text-black min-h-screen p-4 sm:p-8 md:p-12 print:p-2">
             <div className="max-w-4xl mx-auto bg-white p-6 border-2 border-black relative">
                <div className="text-center mb-6">
                    <h1 className="text-xl font-bold underline">GROUND WATER DEPARTMENT</h1>
                    <h2 className="text-lg font-bold">e-Government Procurement (e-GP)</h2>
                    <h3 className="text-lg font-bold">NOTICE INVITING TENDER</h3>
                </div>

                <div className="absolute top-4 right-4 no-print">
                    <Button onClick={() => window.print()}>
                        <Printer className="mr-2 h-4 w-4" /> Print
                    </Button>
                </div>
                
                <table className="w-full border-collapse mb-6 text-sm">
                    <tbody>
                        <DetailRow label="1. File No." value={tender.fileNo} />
                        <DetailRow label="2. e-Tender No." value={tender.eTenderNo} />
                        <DetailRow label="3. Tender Date" value={formatDateSafe(tender.tenderDate)} />
                    </tbody>
                </table>
                
                <table className="w-full border-collapse text-sm">
                    <tbody>
                        <DetailRow label="4. Name of Work" value={tender.nameOfWork} className="font-bold"/>
                        <tr className="font-bold"><td colSpan={2} className="py-1 text-xs">{tender.nameOfWorkMalayalam}</td></tr>
                        <DetailRow label="5. PAC" value={tenderAmount} />
                        <DetailRow label="6. EMD" value={emdAmount} />
                        <DetailRow label="7. Last Date and time of submission of tender" value={formatDateSafe(tender.dateTimeOfReceipt, true)} />
                        <DetailRow label="8. Date and time of opening of tender" value={formatDateSafe(tender.dateTimeOfOpening, true)} />
                        <DetailRow label="9. Bid submission fee" value={submissionFee} />
                        <DetailRow label="10. Location of work" value={tender.location} />
                        <DetailRow label="11. Period of completion" value={tender.periodOfCompletion ? `${tender.periodOfCompletion} Days` : 'N/A'} />
                    </tbody>
                </table>

                <div className="mt-12 text-sm">
                    <p>Tender documents and tender schedule may be downloaded free of cost from the e-GP Website <a href="http://www.etenders.kerala.gov.in" className="text-blue-600 underline">www.etenders.kerala.gov.in</a>. All bid/tender documents are to be submitted online only and in the designated cover(s)/envelope(s) on the e-GP website. Tenders/bids shall be accepted only through online mode on the e-GP website and no manual submission of the same shall be entertained. Late tenders will not be accepted.</p>
                    <p className="mt-4">The bids shall be opened online at the office of the District Officer, Ground Water Department, Kollam on the date and time mentioned above. If the tender opening date happens to be on a holiday or non-working day due to any other valid reason, the tender opening process will be done on the next working day at the same time and place.</p>
                    <p className="mt-4">More details can be had from the office of the District Officer, Ground Water Department, Kollam during working hours.</p>
                </div>

                 <div className="mt-20 flex justify-end">
                    <div className="text-center">
                        <p className="font-bold">(Sd/-)</p>
                        <p className="font-bold">District Officer</p>
                    </div>
                </div>

                <div className="mt-12 text-xs">
                    <p>Copy to: The Hydrogeologist, GWDSAP, Kottayam, The District Information Officer, Kollam, Notice Board, File.</p>
                </div>
            </div>
        </div>
    );
}

// Simple CSS for printing
const PrintStyles = () => (
    <style jsx global>{`
        @media print {
            body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .no-print {
                display: none;
            }
        }
    `}</style>
);
