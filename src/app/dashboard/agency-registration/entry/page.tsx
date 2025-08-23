// This file is intentionally left blank. The functionality has been moved to the main agency-registration page.
"use client";

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Info } from "lucide-react";
import Link from 'next/link';

export default function AgencyRegistrationEntryPage() {
  return (
    <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-md text-center shadow-lg">
            <CardHeader>
                <div className="mx-auto bg-primary/10 p-3 rounded-full mb-4">
                    <Info className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>Page Moved</CardTitle>
                <CardDescription>
                    The functionality to add and edit rig registrations has been integrated directly into the main{' '}
                    <Link href="/dashboard/agency-registration" className="text-primary underline hover:text-primary/80">
                        Rig Registration
                    </Link>
                    {' '}page for a more streamlined workflow.
                </CardDescription>
            </CardHeader>
        </Card>
    </div>
  );
}
