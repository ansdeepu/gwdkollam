// src/app/dashboard/e-tender/page.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FilePlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { usePageHeader } from "@/hooks/usePageHeader";
import { useEffect } from "react";

export default function ETenderPage() {
    const router = useRouter();
    const { setHeader } = usePageHeader();

    useEffect(() => {
        setHeader("e-Tender Document Generator", "Create and manage e-Tender documents.");
    }, [setHeader]);

    const handleCreateTender = () => {
        router.push('/dashboard/e-tender/new');
    };

    return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8">
            <Card className="max-w-4xl mx-auto shadow-lg">
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl font-bold tracking-tight">e-Tender Document Generator</CardTitle>
                    <CardDescription className="text-lg text-muted-foreground pt-2">
                        Streamline the creation of NIT, Corrigendum, Work Orders, and more.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center p-8">
                    <div className="text-center">
                        <p className="text-muted-foreground mb-6">
                            Click the button below to start creating a new tender document set.
                        </p>
                        <Button size="lg" onClick={handleCreateTender}>
                            <FilePlus className="mr-2 h-5 w-5" />
                            Create New Tender
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}