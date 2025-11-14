
// src/app/dashboard/e-tender/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useE_tenders, type E_tender } from "@/hooks/useE_tenders";
import { usePageHeader } from "@/hooks/usePageHeader";
import { Loader2, ArrowLeft, FileText, FilePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TenderDataProvider } from "@/components/e-tender/TenderDataContext";
import TenderDetails from "@/components/e-tender/TenderDetails";
import { toast } from "@/hooks/use-toast";

export default function TenderPage() {
    const params = useParams();
    const router = useRouter();
    const { id } = params;
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
    }, [id, getTender, setHeader, router, toast]);

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
                <div className="flex justify-between">
                    <Button variant="outline" onClick={() => router.back()}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                    <Button onClick={() => router.push(`/dashboard/e-tender/${id}/reports`)}>
                        <FileText className="mr-2 h-4 w-4" />
                        PDF Reports Generation
                    </Button>
                </div>
                <TenderDetails />
            </div>
        </TenderDataProvider>
    );
}
