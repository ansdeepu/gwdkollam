// src/components/e-tender/SelectionNoticeForm.tsx

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
import { useTenderData } from './TenderDataContext';
import { cn } from '@/lib/utils';
import { Separator } from '../ui/separator';

interface SelectionNoticeFormProps {
    onSubmit: (data: Partial<E_tenderFormData>) => void;
    onCancel: () => void;
    isSubmitting: boolean;
    l1Amount?: number;
    hasRejectedBids?: boolean;
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
    const apgRequiredThresholdMatch = description.match(/between\s+([\d.]+)%\s+and\s*([\d.]+)%/);
    const noApgThresholdMatch = description.match(/up to ([\d.]+)%/);
    const moreThanMatch = description.match(/more than ([\d.]+)%/);

    if (moreThanMatch) {
        return { threshold: parseFloat(moreThanMatch[1]) / 100 };
    }
    if (apgRequiredThresholdMatch) {
        return { threshold: parseFloat(apgRequiredThresholdMatch[1]) / 100 };
    }
    if (noApgThresholdMatch) {
        return { threshold: parseFloat(noApgThresholdMatch[1]) / 100 };
    }
    
    return { threshold: 0.15 }; // Default to 15% to match the default text.
};


export default function SelectionNoticeForm({ onSubmit, onCancel, isSubmitting, l1Amount, hasRejectedBids }: SelectionNoticeFormProps) {
    const { tender } = useTenderData();
    const { allRateDescriptions } = useDataStore();
    const isNewTender = tender?.id === 'new';

    const stampPaperDescription = useMemo(() => {
        return tender?.stampPaperDescription || allRateDescriptions.stampPaper || defaultRateDescriptions.stampPaper;
    }, [tender?.stampPaperDescription, allRateDescriptions.stampPaper]);
    
    const performanceGuaranteeDescription = useMemo(() => {
        return tender?.performanceGuaranteeDescription || allRateDescriptions.performanceGuarantee || defaultRateDescriptions.performanceGuarantee;
    }, [tender?.performanceGuaranteeDescription, allRateDescriptions.performanceGuarantee]);
    
    const additionalPerformanceGuaranteeDescription = useMemo(() => {
        return tender?.additionalPerformanceGuaranteeDescription || allRateDescriptions.additionalPerformanceGuarantee || defaultRateDescriptions.additionalPerformanceGuarantee;
    }, [tender?.additionalPerformanceGuaranteeDescription, allRateDescriptions.additionalPerformanceGuarantee]);

    const lowestBidderOfAll = useMemo(() => {
        if (!tender.bidders || tender.bidders.length === 0) return null;
        const validBidders = tender.bidders.filter(b => typeof b.quotedAmount === 'number' && b.quotedAmount > 0);
        if (validBidders.length === 0) return null;
        return validBidders.reduce((lowest, current) => 
            (current.quotedAmount! < lowest.quotedAmount!) ? current : lowest
        );
    }, [tender.bidders]);

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
            const additionalPG = excessPercentage * estimateAmount;
            return Math.ceil(additionalPG / 100) * 100;
        }
        return 0;
    }, [additionalPerformanceGuaranteeDescription]);


    const form = useForm<SelectionNoticeDetailsFormData>({
        resolver: zodResolver(SelectionNoticeDetailsSchema),
        defaultValues: {
            selectionNoticeDate: formatDateForInput(tender?.selectionNoticeDate),
            performanceGuaranteeAmount: tender?.performanceGuaranteeAmount,
            additionalPerformanceGuaranteeAmount: tender?.additionalPerformanceGuaranteeAmount,
            stampPaperAmount: tender?.stampPaperAmount,
            agreedPercentage: tender?.agreedPercentage,
            agreedAmount: tender?.agreedAmount,
        }
    });
    
    const { handleSubmit, setValue, watch, getValues } = form;

    useEffect(() => {
        let contractAmount = l1Amount; // Default to L1 (accepted lowest)

        if (hasRejectedBids && lowestBidderOfAll) {
            setValue('agreedPercentage', lowestBidderOfAll.quotedPercentage);
            setValue('agreedAmount', lowestBidderOfAll.quotedAmount);
            contractAmount = lowestBidderOfAll.quotedAmount; // Use this for calculations
        } else {
             setValue('agreedPercentage', undefined);
             setValue('agreedAmount', undefined);
        }

        const pg = contractAmount ? Math.ceil((contractAmount * 0.05) / 100) * 100 : 0;
        const stamp = calculateStampPaperValue(contractAmount);
        const additionalPg = calculateAdditionalPG(tender?.estimateAmount, contractAmount);

        if (!getValues('selectionNoticeDate')) {
            setValue('selectionNoticeDate', formatDateForInput(tender?.selectionNoticeDate) || '');
        }
        
        setValue('performanceGuaranteeAmount', pg, { shouldValidate: true, shouldDirty: true });
        setValue('additionalPerformanceGuaranteeAmount', additionalPg, { shouldValidate: true, shouldDirty: true });
        setValue('stampPaperAmount', stamp, { shouldValidate: true, shouldDirty: true });

    }, [tender, l1Amount, hasRejectedBids, lowestBidderOfAll, calculateStampPaperValue, calculateAdditionalPG, setValue, getValues]);


    const handleFormSubmit = (data: SelectionNoticeDetailsFormData) => {
        const formData: Partial<E_tenderFormData> = { ...data };
        if (isNewTender || !tender?.performanceGuaranteeDescription) {
            formData.performanceGuaranteeDescription = performanceGuaranteeDescription;
        }
        if (isNewTender || !tender?.additionalPerformanceGuaranteeDescription) {
            formData.additionalPerformanceGuaranteeDescription = additionalPerformanceGuaranteeDescription;
        }
        if (isNewTender || !tender?.stampPaperDescription) {
            formData.stampPaperDescription = stampPaperDescription;
        }

        onSubmit(formData);
    };

    return (
        <FormProvider {...form}>
            <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col h-full">
                <DialogHeader className="p-6 pb-4 shrink-0">
                    <DialogTitle>Selection Notice Details</DialogTitle>
                    <DialogDescription>Enter details related to the selection notice.</DialogDescription>
                </DialogHeader>
                <div className="flex-1 min-h-0">
                    <ScrollArea className="h-full px-6 py-4">
                        <div className="space-y-4">
                             <div className={cn("grid grid-cols-1 gap-4", hasRejectedBids && "md:grid-cols-3")}>
                                <FormField name="selectionNoticeDate" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Selection Notice Date</FormLabel><FormControl><Input type="date" {...field} value={formatDateForInput(field.value)} /></FormControl><FormMessage /></FormItem> )}/>
                                {hasRejectedBids && (
                                    <>
                                        <FormField name="agreedPercentage" control={form.control} render={({ field }) => ( 
                                            <FormItem>
                                                <FormLabel>Agreed Percentage</FormLabel>
                                                <FormControl><Input type="number" {...field} value={field.value ?? ''} readOnly className="bg-muted/50 font-semibold" /></FormControl>
                                                <FormDescription className="text-xs">Lowest of all bids.</FormDescription>
                                                <FormMessage />
                                            </FormItem> 
                                        )}/>
                                        <FormField name="agreedAmount" control={form.control} render={({ field }) => ( 
                                            <FormItem>
                                                <FormLabel>Agreed Amount</FormLabel>
                                                <FormControl><Input type="number" {...field} value={field.value ?? ''} readOnly className="bg-muted/50 font-semibold" /></FormControl>
                                                <FormDescription className="text-xs">Lowest of all bids.</FormDescription>
                                                <FormMessage />
                                            </FormItem> 
                                        )}/>
                                    </>
                                )}
                            </div>
                            <Separator />
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField name="performanceGuaranteeAmount" control={form.control} render={({ field }) => ( 
                                    <FormItem>
                                        <FormLabel>Performance Guarantee Amount</FormLabel>
                                        <FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.valueAsNumber)} readOnly className="bg-muted/50" /></FormControl>
                                        <FormDescription className="text-xs">Based on 5% of the contract value (rounded up).</FormDescription>
                                        <FormMessage />
                                    </FormItem> 
                                )}/>
                                <FormField name="additionalPerformanceGuaranteeAmount" control={form.control} render={({ field }) => ( 
                                    <FormItem>
                                        <FormLabel>Additional Performance Guarantee Amount</FormLabel>
                                        <FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.valueAsNumber)} readOnly className="bg-muted/50" /></FormControl>
                                        <FormDescription className="text-xs">Required for bids over 10% below estimate; calculated on the excess percentage of the estimate amount.</FormDescription>
                                        <FormMessage />
                                    </FormItem> 
                                )}/>
                                <FormField name="stampPaperAmount" control={form.control} render={({ field }) => ( 
                                    <FormItem>
                                        <FormLabel>Stamp Paper required</FormLabel>
                                        <FormControl><Input type="number" {...field} value={field.value ?? ''} readOnly className="bg-muted/50"/></FormControl>
                                        <FormDescription className="text-xs">Based on the contract amount.</FormDescription>
                                        <FormMessage />
                                    </FormItem> 
                                )}/>
                            </div>
                        </div>
                    </ScrollArea>
                </div>
                <DialogFooter className="p-6 pt-4 shrink-0 mt-auto">
                    <Button variant="outline" type="button" onClick={onCancel} disabled={isSubmitting}>
                        <X className="mr-2 h-4 w-4" /> Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Update Details
                    </Button>
                </DialogFooter>
            </form>
        </FormProvider>
    );
}
