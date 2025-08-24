
// src/app/dashboard/history/page.tsx
"use client";

import React from 'react';
import { useAgencyApplications } from '@/hooks/useAgencyApplications';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Loader2, History as HistoryIcon } from 'lucide-react';

export default function HistoryPage() {
    const { applications, isLoading } = useAgencyApplications();

    if (isLoading) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="ml-3 text-muted-foreground">Loading history...</p>
            </div>
        );
    }

    const applicationsWithHistory = applications.filter(app => 
        app.rigs.some(rig => rig.history && rig.history.length > 0)
    );

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <HistoryIcon className="h-6 w-6" />
                        Registration History
                    </CardTitle>
                    <CardDescription>
                        A log of all updates, renewals, and cancellations for each rig registration.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {applicationsWithHistory.length > 0 ? (
                        <Accordion type="multiple" className="space-y-4">
                            {applicationsWithHistory.map(app => (
                                <AccordionItem key={app.id} value={`app-${app.id}`} className="border rounded-lg">
                                    <AccordionTrigger className="p-4 text-lg font-semibold">
                                        {app.agencyName} (File: {app.fileNo || 'N/A'})
                                    </AccordionTrigger>
                                    <AccordionContent className="p-4 pt-0">
                                        <div className="space-y-3">
                                            {app.rigs.map((rig, index) => (
                                                rig.history && rig.history.length > 0 && (
                                                    <div key={rig.id} className="p-3 border rounded-md bg-secondary/50">
                                                        <h4 className="font-semibold text-primary mb-2">
                                                            Rig #{index + 1} - {rig.typeOfRig || 'Unspecified Type'}
                                                        </h4>
                                                        <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                                                            {rig.history.map((entry, idx) => (
                                                                <li key={idx}>{entry}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )
                                            ))}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    ) : (
                        <div className="text-center py-10 text-muted-foreground">
                            <p>No history records found.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
