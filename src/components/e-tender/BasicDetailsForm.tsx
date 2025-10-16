
// src/components/e-tender/BasicDetailsForm.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BasicDetailsSchema, type BasicDetailsFormData } from "@/lib/schemas/eTenderSchema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface BasicDetailsFormProps {
    initialData: Partial<BasicDetailsFormData>;
    onSubmit: (data: BasicDetailsFormData) => void;
    onCancel: () => void;
    isSubmitting: boolean;
}

export default function BasicDetailsForm({ initialData, onSubmit, onCancel, isSubmitting }: BasicDetailsFormProps) {
    const form = useForm<BasicDetailsFormData>({
        resolver: zodResolver(BasicDetailsSchema),
        defaultValues: {
            ...initialData,
            tenderDate: initialData.tenderDate ? new Date(initialData.tenderDate).toISOString().split('T')[0] : '',
            lastDateOfReceipt: initialData.lastDateOfReceipt ? new Date(initialData.lastDateOfReceipt).toISOString().split('T')[0] : '',
            dateOfOpeningTender: initialData.dateOfOpeningTender ? new Date(initialData.dateOfOpeningTender).toISOString().split('T')[0] : '',
        }
    });

    return (
        <>
            <DialogHeader className="p-6 pb-4">
                <DialogTitle>Basic Tender Details</DialogTitle>
                <DialogDescription>
                    Enter the core information for the tender document.
                </DialogDescription>
            </DialogHeader>
            <div className="flex-1 min-h-0">
                <ScrollArea className="h-full px-6 py-4">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField name="eTenderNo" control={form.control} render={({ field }) => ( <FormItem><FormLabel>eTender No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                <FormField name="tenderDate" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Tender Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            </div>
                            <FormField name="fileNo" control={form.control} render={({ field }) => ( <FormItem><FormLabel>File No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            <FormField name="nameOfWork" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Name of Work (English)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            <FormField name="nameOfWorkMalayalam" control={form.control} render={({ field }) => ( <FormItem><FormLabel>വർക്കിന്റെ പേര് (Malayalam)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            <FormField name="location" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Location</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField name="estimateAmount" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Estimate Amount (Rs.)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} /></FormControl><FormMessage /></FormItem> )}/>
                                <FormField name="tenderFormFee" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Tender Form Fee (Rs.)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} /></FormControl><FormMessage /></FormItem> )}/>
                                <FormField name="emd" control={form.control} render={({ field }) => ( <FormItem><FormLabel>EMD (Rs.)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} /></FormControl><FormMessage /></FormItem> )}/>
                            </div>
                            <FormField name="periodOfCompletion" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Period of Completion (Days)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} /></FormControl><FormMessage /></FormItem> )}/>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField name="lastDateOfReceipt" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Last Date of Receipt</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                <FormField name="timeOfReceipt" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Time of Receipt</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField name="dateOfOpeningTender" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Date of Opening Tender</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                <FormField name="timeOfOpeningTender" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Time of Opening Tender</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            </div>
                             {/* This button is only here to allow form submission with enter key */}
                            <Button type="submit" className="hidden" />
                        </form>
                    </Form>
                </ScrollArea>
            </div>
            <DialogFooter className="p-6 pt-4 border-t">
                <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
                <Button type="button" onClick={form.handleSubmit(onSubmit)} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Details
                </Button>
            </DialogFooter>
        </>
    );
}
