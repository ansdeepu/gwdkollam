// src/components/e-tender/CorrigendumDetailsForm.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CorrigendumDetailsSchema, type CorrigendumDetailsFormData } from "@/lib/schemas/eTenderSchema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CorrigendumDetailsFormProps {
    initialData: Partial<CorrigendumDetailsFormData>;
    onSubmit: (data: CorrigendumDetailsFormData) => void;
    onCancel: () => void;
    isSubmitting: boolean;
}

const formatDateForInput = (date: any) => {
    if (!date) return '';
    try {
        return new Date(date).toISOString().split('T')[0];
    } catch (e) {
        return '';
    }
};

export default function CorrigendumDetailsForm({ initialData, onSubmit, onCancel, isSubmitting }: CorrigendumDetailsFormProps) {
    const form = useForm<CorrigendumDetailsFormData>({
        resolver: zodResolver(CorrigendumDetailsSchema),
        defaultValues: {
            ...initialData,
            dateTimeOfReceipt: formatDateForInput(initialData.dateTimeOfReceipt),
            dateTimeOfOpening: formatDateForInput(initialData.dateTimeOfOpening),
            corrigendumDate: formatDateForInput(initialData.corrigendumDate),
        }
    });

    return (
        <>
            <DialogHeader className="p-6 pb-4">
                <DialogTitle>Corrigendum Details</DialogTitle>
                <DialogDescription>
                    Enter revised dates and bid information for the corrigendum notice.
                </DialogDescription>
            </DialogHeader>
            <div className="flex-1 min-h-0">
                <ScrollArea className="h-full px-6 py-4">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField name="dateTimeOfReceipt" control={form.control} render={({ field }) => ( <FormItem><FormLabel>New Date & Time of Receipt</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            <FormField name="dateTimeOfOpening" control={form.control} render={({ field }) => ( <FormItem><FormLabel>New Date & Time of Opening</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            <FormField name="corrigendumDate" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Corrigendum Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            <FormField name="noOfBids" control={form.control} render={({ field }) => ( <FormItem><FormLabel>No. of Bids Received (in words)</FormLabel><FormControl><Input {...field} placeholder="e.g., Three Nos" /></FormControl><FormMessage /></FormItem> )}/>
                            <Button type="submit" className="hidden" />
                        </form>
                    </Form>
                </ScrollArea>
            </div>
            <DialogFooter className="p-6 pt-4 border-t">
                <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
                <Button type="button" onClick={form.handleSubmit(onSubmit)} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Corrigendum
                </Button>
            </DialogFooter>
        </>
    );
}
