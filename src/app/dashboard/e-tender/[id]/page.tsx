
// src/app/dashboard/e-tender/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useE_tenders, type E_tender } from "@/hooks/useE_tenders";
import { usePageHeader } from "@/hooks/usePageHeader";
import { Button } from "@/components/ui/button";
import { TenderDataProvider } from "@/components/e-tender/TenderDataContext";
import TenderDetails from "@/components/e-tender/TenderDetails";
import { toast } from "@/hooks/use-toast";


// Inline SVG components
const Loader2 = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
);
const ArrowLeft = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
);
const FileText = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>
);
const FilePlus = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M12 9v6"/><path d="M9 12h6"/></svg>
);


export default function TenderPage() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id;
    const { getTender, isLoading } = useE_tenders();
    const { setHeader } = usePageHeader();
    const [tender, setTender] = useState<E_tender | null>(null);

    useEffect(() => {
        if (typeof id !== 'string' || !id) {
            setHeader("Invalid Tender", "No tender ID was provided.");
            return;
        }

        if (id === 'new') {
            const newTenderData: E_tender = {
                id: 'new',
                eTenderNo: '',
                tenderDate: null,
                fileNo: '',
                nameOfWork: '',
                nameOfWorkMalayalam: '',
                location: '',
                estimateAmount: undefined,
                tenderFormFee: undefined,
                emd: undefined,
                periodOfCompletion: undefined,
                lastDateOfReceipt: null,
                timeOfReceipt: '',
                dateOfOpeningTender: null,
                timeOfOpeningTender: '',
                presentStatus: 'Tender Process',
                bidders: [],
                corrigendums: [],
                dateTimeOfReceipt: undefined,
                dateTimeOfOpening: undefined,
                noOfBids: undefined,
                noOfTenderers: undefined,
                noOfSuccessfulTenderers: undefined,
                quotedPercentage: undefined,
                aboveBelow: undefined,
                dateOfOpeningBid: undefined,
                dateOfTechnicalAndFinancialBidOpening: undefined,
                technicalCommitteeMember1: undefined,
                technicalCommitteeMember2: undefined,
                technicalCommitteeMember3: undefined,
                agreementDate: undefined,
                dateWorkOrder: undefined,
                nameOfAssistantEngineer: undefined,
                nameOfSupervisor: undefined,
                supervisorPhoneNo: undefined,
            };
            setTender(newTenderData);
            setHeader("Create New e-Tender", "Fill in the details for the new tender.");
        } else {
            const fetchTender = async () => {
                const fetchedTender = await getTender(id);
                if (fetchedTender) {
                    setTender(fetchedTender);
                    const refNo = `GKT/${fetchedTender.fileNo}/${fetchedTender.eTenderNo}`;
                    setHeader(`Edit e-Tender: ${refNo}`, `Editing details for tender: ${refNo}`);
                } else {
                    toast({ title: "Tender Not Found", description: "The requested tender could not be found.", variant: "destructive" });
                    setHeader("Tender Not Found", "The requested tender could not be found.");
                    router.push('/dashboard');
                }
            };
            fetchTender();
        }
    }, [id, getTender, setHeader, router]);

    if (isLoading || !tender) {
        return (
            <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="ml-3 text-muted-foreground">Loading Tender Data...</p>
            </div>
        );
    }
    
    return (
        <TenderDataProvider initialTender={tender}>
            <div className="space-y-6">
                <TenderDetails />
            </div>
        </TenderDataProvider>
    );
}
