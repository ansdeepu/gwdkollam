
// src/components/e-tender/SelectionNoticeForm.tsx
"use client";

import React, { useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Save, X } from 'lucide-react';
import { SelectionNoticeDetailsSchema, type E_tenderFormData, type SelectionNoticeDetailsFormData } from '@/lib/schemas/eTenderSchema';
import { formatDateForInput } from './utils';
import { useDataStore } from '@/hooks/use-data-store';

interface SelectionNoticeFormProps {
    initialData?: Partial<E_tenderFormData>;
    onSubmit: (data: Partial<E_tenderFormData>) => void;
    onCancel: () => void;
    isSubmitting: boolean;
    l1Amount?: number;
}

export default function SelectionNoticeForm({ initialData, onSubmit, onCancel, isSubmitting, l1Amount }: SelectionNoticeFormProps) {
    const { allRateDescriptions } = useDataStore();
    
    const calculateStampPaperValue = (amount?: number): number => {
        if (amount === undefined || amount === null || amount <= 0) {
            return 200; // Default to minimum if no amount
        }
        // Calculate duty as ₹1 for every ₹1,000 or part thereof.
        const duty = Math.ceil(amount / 1000) * 1; 
        
        // Round the calculated duty up to the nearest 100.
        const roundedDuty = Math.ceil(duty / 100) * 100;
        
        // Ensure the final value is within the min/max range.
        return Math.max(200, Math.min(roundedDuty, 100000));
    };

    const form = useForm<SelectionNoticeDetailsFormData>({
        resolver: zodResolver(SelectionNoticeDetailsSchema),
        defaultValues: {
            selectionNoticeDate: formatDateForInput(initialData?.selectionNoticeDate),
            performanceGuaranteeAmount: initialData?.performanceGuaranteeAmount,
            additionalPerformanceGuaranteeAmount: initialData?.additionalPerformanceGuaranteeAmount ?? 0,
            stampPaperAmount: initialData?.stampPaperAmount,
        }
    });

    useEffect(() => {
        const pg = l1Amount ? Math.round((l1Amount * 0.05) / 100) * 100 : 0;
        const stamp = calculateStampPaperValue(l1Amount);

        form.reset({
            selectionNoticeDate: formatDateForInput(initialData?.selectionNoticeDate),
            performanceGuaranteeAmount: initialData?.performanceGuaranteeAmount ?? pg,
            additionalPerformanceGuaranteeAmount: initialData?.additionalPerformanceGuaranteeAmount ?? 0,
            stampPaperAmount: initialData?.stampPaperAmount ?? stamp,
        });
    }, [initialData, form, l1Amount]);

    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
                <DialogHeader className="p-6 pb-4">
                    <DialogTitle>Selection Notice Details</DialogTitle>
                    <DialogDescription>Enter details related to the selection notice.</DialogDescription>
                </DialogHeader>
                <div className="flex-1 min-h-0">
                    <ScrollArea className="h-full px-6 py-4">
                        <div className="space-y-4">
                            <FormField name="selectionNoticeDate" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Selection Notice Date</FormLabel><FormControl><Input type="date" {...field} value={formatDateForInput(field.value)} /></FormControl><FormMessage /></FormItem> )}/>
                            <FormField name="performanceGuaranteeAmount" control={form.control} render={({ field }) => ( 
                                <FormItem>
                                    <FormLabel>Performance Guarantee Amount</FormLabel>
                                    <FormControl><Input type="number" {...field} value={field.value ?? ''} readOnly className="bg-muted/50"/></FormControl>
                                    <FormDescription className="text-xs whitespace-pre-wrap">{allRateDescriptions.performanceGuarantee}</FormDescription>
                                    <FormMessage />
                                </FormItem> 
                            )}/>
                            <FormField name="additionalPerformanceGuaranteeAmount" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Additional Performance Guarantee Amount</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} readOnly className="bg-muted/50"/></FormControl><FormMessage /></FormItem> )}/>
                            <FormField name="stampPaperAmount" control={form.control} render={({ field }) => ( 
                                <FormItem>
                                    <FormLabel>Stamp Paper required</FormLabel>
                                    <FormControl><Input type="number" {...field} value={field.value ?? ''} readOnly className="bg-muted/50"/></FormControl>
                                    <FormDescription className="text-xs whitespace-pre-wrap">{allRateDescriptions.stampPaper}</FormDescription>
                                    <FormMessage />
                                </FormItem> 
                            )}/>
                        </div>
                    </ScrollArea>
                </div>
                <DialogFooter className="p-6 pt-4">
                    <Button variant="outline" type="button" onClick={onCancel} disabled={isSubmitting}>
                        <X className="mr-2 h-4 w-4" /> Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save Details
                    </Button>
                </DialogFooter>
            </form>
        </FormProvider>
    );
}
