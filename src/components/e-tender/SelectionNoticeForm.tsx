// src/components/e-tender/SelectionNoticeForm.tsx
"use client";

import React, { useEffect, useMemo, useCallback } from 'react';
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
import { useDataStore, defaultRateDescriptions } from '@/hooks/use-data-store';

interface SelectionNoticeFormProps {
    initialData?: Partial<E_tenderFormData>;
    onSubmit: (data: Partial<E_tenderFormData>) => void;
    onCancel: () => void;
    isSubmitting: boolean;
    l1Amount?: number;
}

const parseStampPaperLogic = (description: string) => {
    const rateMatch = description.match(/₹\s*([\d,]+)\s*for\s*every\s*₹\s*([\d,]+)/);
    const minMatch = description.match(/minimum\s*of\s*₹\s*([\d,]+)/);
    const maxMatch = description.match(/maximum\s*of\s*₹\s*([\d,]+)/);
    
    const parseNumber = (str: string | undefined) => str ? parseInt(str.replace(/,/g, ''), 10) : undefined;

    return {
        rate: rateMatch ? parseNumber(rateMatch[1]) : 1,
        basis: rateMatch ? parseNumber(rateMatch[2]) : 1000,
        min: minMatch ? parseNumber(minMatch[1]) : 200,
        max: maxMatch ? parseNumber(maxMatch[1]) : 100000,
    };
};

const parseAdditionalPerformanceGuaranteeLogic = (description: string) => {
    const apgRequiredThresholdMatch = description.match(/between\s+([\d.]+)%\s+and\s+([\d.]+)%/);
    const noApgThresholdMatch = description.match(/up to ([\d.]+)%/);

    let threshold = 0.10; // Default threshold
    if (apgRequiredThresholdMatch) {
        threshold = parseFloat(apgRequiredThresholdMatch[1]) / 100;
    } else if (noApgThresholdMatch) {
        threshold = parseFloat(noApgThresholdMatch[1]) / 100;
    }
    return { threshold };
};

export default function SelectionNoticeForm({ initialData, onSubmit, onCancel, isSubmitting, l1Amount }: SelectionNoticeFormProps) {
    const { allRateDescriptions } = useDataStore();
    const isNewTender = initialData?.id === 'new';

    const stampPaperDescription = useMemo(() => {
        return initialData?.stampPaperDescription || allRateDescriptions.stampPaper || defaultRateDescriptions.stampPaper;
    }, [initialData?.stampPaperDescription, allRateDescriptions.stampPaper]);
    
    const performanceGuaranteeDescription = useMemo(() => {
        return initialData?.performanceGuaranteeDescription || allRateDescriptions.performanceGuarantee || defaultRateDescriptions.performanceGuarantee;
    }, [initialData?.performanceGuaranteeDescription, allRateDescriptions.performanceGuarantee]);
    
    const additionalPerformanceGuaranteeDescription = useMemo(() => {
        return initialData?.additionalPerformanceGuaranteeDescription || allRateDescriptions.additionalPerformanceGuarantee || defaultRateDescriptions.additionalPerformanceGuarantee;
    }, [initialData?.additionalPerformanceGuaranteeDescription, allRateDescriptions.additionalPerformanceGuarantee]);

    const calculateStampPaperValue = useCallback((amount?: number): number => {
        const logic = parseStampPaperLogic(stampPaperDescription);
        const { rate, basis, min, max } = logic;
        if (amount === undefined || amount === null || amount <= 0) return min ?? 0;
        const duty = Math.ceil(amount / (basis ?? 1000)) * (rate ?? 1); 
        const roundedDuty = Math.ceil(duty / 100) * 100;
        return Math.max(min ?? 0, Math.min(roundedDuty, max ?? Infinity));
    }, [stampPaperDescription]);

    const calculateAdditionalPG = useCallback((estimateAmount?: number, tenderAmount?: number): number => {
        if (!estimateAmount || !tenderAmount || tenderAmount >= estimateAmount) return 0;
        
        const logic = parseAdditionalPerformanceGuaranteeLogic(additionalPerformanceGuaranteeDescription);
        const percentageDifference = (estimateAmount - tenderAmount) / estimateAmount;
        
        if (percentageDifference > logic.threshold) {
            const excessPercentage = percentageDifference - logic.threshold;
            const additionalPG = excessPercentage * tenderAmount; // Use tenderAmount here as per user correction
            return Math.ceil(additionalPG / 100) * 100;
        }
        return 0;
    }, [additionalPerformanceGuaranteeDescription]);


    const form = useForm<SelectionNoticeDetailsFormData>({
        resolver: zodResolver(SelectionNoticeDetailsSchema),
        defaultValues: {
            selectionNoticeDate: formatDateForInput(initialData?.selectionNoticeDate),
            performanceGuaranteeAmount: initialData?.performanceGuaranteeAmount,
            additionalPerformanceGuaranteeAmount: initialData?.additionalPerformanceGuaranteeAmount,
            stampPaperAmount: initialData?.stampPaperAmount,
        }
    });
    
    const { reset, handleSubmit, setValue } = form;

    useEffect(() => {
        const pg = l1Amount ? Math.round((l1Amount * 0.05) / 100) * 100 : 0;
        const stamp = calculateStampPaperValue(l1Amount);
        const additionalPg = calculateAdditionalPG(initialData?.estimateAmount, l1Amount);

        reset({
            selectionNoticeDate: formatDateForInput(initialData?.selectionNoticeDate),
            performanceGuaranteeAmount: initialData?.performanceGuaranteeAmount ?? pg,
            additionalPerformanceGuaranteeAmount: initialData?.additionalPerformanceGuaranteeAmount ?? additionalPg,
            stampPaperAmount: initialData?.stampPaperAmount ?? stamp,
        });
    }, [initialData, l1Amount, calculateStampPaperValue, calculateAdditionalPG, reset]);

    const handleFormSubmit = (data: SelectionNoticeDetailsFormData) => {
        const formData: Partial<E_tenderFormData> = { ...data };
        if (isNewTender || !initialData?.performanceGuaranteeDescription) {
            formData.performanceGuaranteeDescription = performanceGuaranteeDescription;
        }
        if (isNewTender || !initialData?.additionalPerformanceGuaranteeDescription) {
            formData.additionalPerformanceGuaranteeDescription = additionalPerformanceGuaranteeDescription;
        }
        if (isNewTender || !initialData?.stampPaperDescription) {
            formData.stampPaperDescription = stampPaperDescription;
        }

        onSubmit(formData);
    };

    return (
        <FormProvider {...form}>
            <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col h-full">
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
                                    <FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.valueAsNumber)} readOnly className="bg-muted/50" /></FormControl>
                                    <FormDescription className="text-xs">Auto-calculated: 5% of the L1 contract value.</FormDescription>
                                    <FormMessage />
                                </FormItem> 
                            )}/>
                            <FormField name="additionalPerformanceGuaranteeAmount" control={form.control} render={({ field }) => ( 
                                <FormItem>
                                    <FormLabel>Additional Performance Guarantee Amount</FormLabel>
                                    <FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.valueAsNumber)} readOnly className="bg-muted/50" /></FormControl>
                                    <FormDescription className="text-xs">Auto-calculated if bid is below estimate threshold.</FormDescription>
                                    <FormMessage />
                                </FormItem> 
                            )}/>
                            <FormField name="stampPaperAmount" control={form.control} render={({ field }) => ( 
                                <FormItem>
                                    <FormLabel>Stamp Paper required</FormLabel>
                                    <FormControl><Input type="number" {...field} value={field.value ?? ''} readOnly className="bg-muted/50"/></FormControl>
                                    <FormDescription className="text-xs">Auto-calculated based on the L1 contract amount.</FormDescription>
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
