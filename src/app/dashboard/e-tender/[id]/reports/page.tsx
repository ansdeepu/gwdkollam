
// src/app/dashboard/e-tender/[id]/reports/page.tsx
"use client";

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import PdfReportDialogs from '@/components/e-tender/pdf/PdfReportDialogs';
import { ArrowLeft, FileText } from 'lucide-react';
import { usePageHeader } from '@/hooks/usePageHeader';
import { useE_tenders } from '@/hooks/useE_tenders';
import { TenderDataProvider } from '@/components/e-tender/TenderDataContext';

export default function TenderReportsPage() {
    const params = useParams();
    const router = useRouter();
    const { id } = params;
    const { getTender, isLoading } = useE_tenders();
    const [tender, setTender] = React.useState(null);
    const { setHeader } = usePageHeader();

    React.useEffect(() => {
        setHeader('e-Tender Reports', `Generate and download various PDF reports for the tender.`);
        if (typeof id === 'string') {
            getTender(id).then(setTender);
        }
    }, [id, getTender, setHeader]);

    if (isLoading || !tender) {
        return <div>Loading tender details...</div>;
    }
    
    return (
        <TenderDataProvider initialTender={tender}>
            <div className="space-y-6">
                <div className="flex justify-start">
                    <Button variant="outline" onClick={() => router.back()}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Tender Details
                    </Button>
                </div>
                <PdfReportDialogs />
            </div>
        </TenderDataProvider>
    );
}

