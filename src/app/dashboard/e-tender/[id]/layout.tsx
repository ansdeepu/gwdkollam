// src/app/dashboard/e-tender/[id]/layout.tsx
"use client";

import { useEffect, useState, ReactNode } from "react";
import { useParams } from "next/navigation";
import { useE_tenders, type E_tender } from "@/hooks/useE_tenders";
import { TenderDataProvider } from "@/components/e-tender/TenderDataContext";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useDataStore } from "@/hooks/use-data-store";

export default function TenderLayout({ children }: { children: ReactNode }) {
    const params = useParams();
    const { id } = params;
    const { getTender, isLoading } = useE_tenders();
    const { allStaffMembers, allRateDescriptions, allBidders } = useDataStore(); // Ensure data store is loaded
    const [tender, setTender] = useState<E_tender | null>(null);
    const [isLayoutLoading, setIsLayoutLoading] = useState(true);

    useEffect(() => {
        if (typeof id !== 'string' || !id) {
            setIsLayoutLoading(false);
            return;
        }

        if (id === 'new') {
            const newTenderData: E_tender = {
                id: 'new',
                eTenderNo: '', tenderDate: null, fileNo: '', nameOfWork: '', nameOfWorkMalayalam: '', location: '', estimateAmount: undefined,
                tenderFormFee: undefined, emd: undefined, periodOfCompletion: undefined, lastDateOfReceipt: null, timeOfReceipt: '',
                dateOfOpeningTender: null, timeOfOpeningTender: '', presentStatus: 'Tender Process', bidders: [], corrigendums: [],
                dateTimeOfReceipt: undefined, dateTimeOfOpening: undefined, noOfBids: undefined, noOfTenderers: undefined,
                noOfSuccessfulTenderers: undefined, quotedPercentage: undefined, aboveBelow: undefined, dateOfOpeningBid: undefined,
                dateOfTechnicalAndFinancialBidOpening: undefined, technicalCommitteeMember1: undefined, technicalCommitteeMember2: undefined,
                technicalCommitteeMember3: undefined, agreementDate: undefined, dateWorkOrder: undefined, nameOfAssistantEngineer: undefined,
                supervisor1Id: undefined, supervisor1Name: undefined, supervisor1Phone: undefined,
                supervisor2Id: undefined, supervisor2Name: undefined, supervisor2Phone: undefined,
                supervisor3Id: undefined, supervisor3Name: undefined, supervisor3Phone: undefined,
                nameOfSupervisor: undefined, supervisorPhoneNo: undefined, remarks: '',
            };
            setTender(newTenderData);
            setIsLayoutLoading(false);
        } else {
            const fetchTender = async () => {
                const fetchedTender = await getTender(id);
                if (fetchedTender) {
                    setTender(fetchedTender);
                } else {
                    toast({ title: "Tender Not Found", variant: "destructive" });
                }
                setIsLayoutLoading(false);
            };
            fetchTender();
        }
    }, [id, getTender]);

    if (isLoading || isLayoutLoading || !tender) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2">Loading Tender...</p>
            </div>
        );
    }

    return <TenderDataProvider initialTender={tender}>{children}</TenderDataProvider>;
}
