// src/components/e-tender/BasicDetailsForm.tsx
"use client";

import React, { useEffect, useCallback, useMemo } from 'react';
import { useForm, FormProvider, useWatch, useFormContext } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Save, X } from 'lucide-react';
import type { E_tenderFormData, BasicDetailsFormData } from '@/lib/schemas/eTenderSchema';
import { formatDateForInput } from './utils';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { useDataStore, defaultRateDescriptions } from '@/hooks/use-data-store';
import { useTenderData } from './TenderDataContext';
import { zodResolver } from '@hookform/resolvers/zod';
import { BasicDetailsSchema } from '@/lib/schemas/eTenderSchema';

// --- Start of Corrected Calculation Logic ---

const parseAmountString = (amountStr?: string): number => {
    if (!amountStr) return 0;
    const cleanedStr = amountStr.replace(/,/g, '').toLowerCase();
    const num = parseFloat(cleanedStr);
    if (isNaN(num)) return 0;

    if (cleanedStr.includes('lakh')) return num * 100000;
    if (cleanedStr.includes('crore')) return num * 10000000;
    return num;
};

const parseFeeRules = (description: string): Array<[number, number]> => {
    const rules: Array<[number, number]> = [];
    if (!description) return rules;
    
    const lines = description.split('\n');
    for (const line of lines) {
        const noFeeMatch = line.match(/up to rs\s*([\d,\s\w]+)/i);
        const feeMatch = line.match(/:\s*rs\s*([\d,]+)/i);
        
        if (line.toLowerCase().includes('no fee') && noFeeMatch) {
            rules.push([parseAmountString(noFeeMatch[1]), 0]);
            continue;
        }

        if (!feeMatch) continue;
        const fee = parseAmountString(feeMatch[1]);
        
        const overUpToMatch = line.match(/over\s*([\d,\s\w]+)\s*up to\s*([\d,\s\w]+)/i);
        if (overUpToMatch) {
            rules.push([parseAmountString(overUpToMatch[2]), fee]);
            continue;
        }

        const upToMatch = line.match(/up to\s*([\d,\s\w]+)/i);
        if (upToMatch) {
            rules.push([parseAmountString(upToMatch[1]), fee]);
            continue;
        }
        
        const aboveMatch = line.match(/above\s*([\d,\s\w]+)/i);
        if (aboveMatch) {
            rules.push([Infinity, fee]); 
        }
    }
    return rules.sort((a, b) => a[0] - b[0]);
};

const parseEmdRules = (description: string): { type: 'percentage' | 'fixed'; threshold: number; rate?: number; max?: number; value?: number; }[] => {
    const rules: { type: 'percentage' | 'fixed'; threshold: number; rate?: number; max?: number; value?: number; }[] = [];
    if (!description) return rules;

    const lines = description.split('\n').filter(line => line.trim() !== '');

    for (const line of lines) {
        const upToPercentageMatch = line.match(/up to rs\.\s*([\d,\s\w]+):\s*([\d.]+)%/i);
        if (upToPercentageMatch) {
            const threshold = parseAmountString(upToPercentageMatch[1]);
            const rate = parseFloat(upToPercentageMatch[2]) / 100;
            const maxMatch = line.match(/maximum of rs\.\s*([\d,]+)/i);
            const max = maxMatch ? parseAmountString(maxMatch[1]) : undefined;
            rules.push({ type: 'percentage', threshold, rate, max });
            continue;
        }

        const aboveFixedMatch = line.match(/above rs\.\s*([\d,\s\w]+)\s*up to\s*([\d,\s\w]+):\s*rs.\s*([\d,]+)/i);
        if (aboveFixedMatch) {
            const threshold = parseAmountString(aboveFixedMatch[2]);
            const value = parseAmountString(aboveFixedMatch[3]);
            rules.push({ type: 'fixed', threshold, value });
            continue;
        }

        const aboveFixedSingleMatch = line.match(/above rs.\s*([\d,\s\w]+):\s*rs.\s*([\d,]+)/i);
         if (aboveFixedSingleMatch) {
            const threshold = parseAmountString(aboveFixedSingleMatch[1]);
            const value = parseAmountString(aboveFixedSingleMatch[2]);
            rules.push({ type: 'fixed', threshold: Infinity, value }); // Represents 'above X'
            continue;
        }
    }
    return rules.sort((a, b) => a.threshold - b.threshold);
};

const calculateFee = (amount: number, rules: Array<[number, number]>): number => {
    if (amount <= 0) return 0;
    for (const [limit, fee] of rules) {
        if (amount <= limit) {
            return fee;
        }
    }
    return rules.length > 0 ? rules[rules.length - 1][1] : 0;
};

const calculateEmd = (amount: number, rules: { type: 'percentage' | 'fixed'; threshold: number; rate?: number; max?: number; value?: number; }[]): number => {
    if (amount <= 0) return 0;
    const roundToNearest100 = (num: number) => Math.ceil(num / 100) * 100;

    for (const rule of rules) {
        if (rule.type === 'percentage' && amount <= rule.threshold) {
            let emd = amount * (rule.rate || 0);
            if (rule.max && emd > rule.max) emd = rule.max;
            return roundToNearest100(emd);
        }
        if (rule.type === 'fixed' && amount <= rule.threshold) {
            return rule.value || 0;
        }
    }
    
    // Handle 'above' case
    const lastRule = rules[rules.length - 1];
    if (lastRule && lastRule.type === 'fixed' && lastRule.threshold === Infinity) {
        return lastRule.value || 0;
    }

    return 0;
};

// --- End of Corrected Calculation Logic ---

interface BasicDetailsFormProps {
    onSubmit: (data: Partial<E_tenderFormData>) => void;
    onCancel: () => void;
    isSubmitting: boolean;
}

export default function BasicDetailsForm({ onSubmit, onCancel, isSubmitting }: BasicDetailsFormProps) {
    const { tender } = useTenderData();
    const { allRateDescriptions } = useDataStore();

    const { tenderFeeRulesWork, tenderFeeRulesPurchase, emdRulesWork, emdRulesPurchase } = useMemo(() => {
        const [tenderFeeWork, tenderFeePurchase] = (allRateDescriptions.tenderFee || defaultRateDescriptions.tenderFee).split('\n\nFor Purchase:');
        const [emdWork, emdPurchase] = (allRateDescriptions.emd || defaultRateDescriptions.emd).split('\n\nFor Purchase:');
        return {
            tenderFeeRulesWork: parseFeeRules(tenderFeeWork),
            tenderFeeRulesPurchase: parseFeeRules(tenderFeePurchase || ''),
            emdRulesWork: parseEmdRules(emdWork || ''),
            emdRulesPurchase: parseEmdRules(emdPurchase || ''),
        };
    }, [allRateDescriptions]);

    const form = useForm<BasicDetailsFormData>({
        resolver: zodResolver(BasicDetailsSchema),
        defaultValues: tender,
    });
    
    const { control, setValue, handleSubmit, watch, getValues } = form;

    const estimateAmount = watch('estimateAmount');
    const tenderType = watch('tenderType');
    const tenderId = getValues('id');
    
    useEffect(() => {
        const amount = estimateAmount || 0;
        let fee = 0;
        let emd = 0;

        if (tenderType === 'Work') {
            fee = calculateFee(amount, tenderFeeRulesWork);
            emd = calculateEmd(amount, emdRulesWork);
        } else if (tenderType === 'Purchase') {
            fee = calculateFee(amount, tenderFeeRulesPurchase);
            emd = calculateEmd(amount, emdRulesPurchase);
        }
        
        setValue('tenderFormFee', fee, { shouldDirty: true });
        setValue('emd', emd, { shouldDirty: true });

    }, [estimateAmount, tenderType, setValue, tenderFeeRulesWork, tenderFeeRulesPurchase, emdRulesWork, emdRulesPurchase]);
     
    const onFormSubmit = (data: BasicDetailsFormData) => {
        const formData: Partial<E_tenderFormData> = { ...data };
        if (tenderId === 'new' || !getValues('tenderFeeDescription')) {
            formData.tenderFeeDescription = allRateDescriptions.tenderFee;
        }
        if (tenderId === 'new' || !getValues('emdDescription')) {
            formData.emdDescription = allRateDescriptions.emd;
        }
        onSubmit(formData);
    };

    return (
        <FormProvider {...form}>
            <form onSubmit={handleSubmit(onFormSubmit)} className="flex flex-col h-full">
                <DialogHeader className="p-6 pb-4">
                    <DialogTitle>Basic Tender Details</DialogTitle>
                    <DialogDescription>Enter the fundamental details for this tender.</DialogDescription>
                </DialogHeader>
                <div className="flex-1 min-h-0">
                    <ScrollArea className="h-full px-6 py-4">
                        <div className="space-y-4">
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField name="eTenderNo" control={control} render={({ field }) => ( <FormItem><FormLabel>eTender No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                <FormField name="tenderDate" control={control} render={({ field }) => ( <FormItem><FormLabel>Tender Date</FormLabel><FormControl><Input type="date" {...field} value={formatDateForInput(field.value)} onChange={(e) => field.onChange(e.target.value || null)}/></FormControl><FormMessage /></FormItem> )}/>
                                <FormField name="fileNo" control={control} render={({ field }) => ( <FormItem><FormLabel>File No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               <FormField name="nameOfWork" control={control} render={({ field }) => ( <FormItem><FormLabel>Name of Work</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                               <FormField name="nameOfWorkMalayalam" control={control} render={({ field }) => ( <FormItem><FormLabel>Name of Work (in Malayalam)</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            </div>
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField name="location" control={control} render={({ field }) => ( <FormItem><FormLabel>Location</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                <FormField name="tenderType" control={control} render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Type of Tender</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="Work">Work</SelectItem>
                                                <SelectItem value="Purchase">Purchase</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField name="periodOfCompletion" control={control} render={({ field }) => ( <FormItem><FormLabel>Period of Completion (Days)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.valueAsNumber)}/></FormControl><FormMessage /></FormItem> )}/>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField name="estimateAmount" control={control} render={({ field }) => ( <FormItem><FormLabel>Tender Amount (Rs.)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} /></FormControl><FormMessage /></FormItem> )}/>
                                <FormField name="tenderFormFee" control={control} render={({ field }) => ( 
                                    <FormItem>
                                        <FormLabel>Tender Form Fee (Rs.)</FormLabel>
                                        <FormControl><Input readOnly type="number" {...field} value={field.value ?? ''} /></FormControl>
                                        <FormDescription className="text-xs">Based on tender amount and type.</FormDescription>
                                        <FormMessage />
                                    </FormItem> 
                                )}/>
                                <FormField name="emd" control={control} render={({ field }) => ( 
                                    <FormItem>
                                        <FormLabel>EMD (Rs.)</FormLabel>
                                        <FormControl><Input readOnly type="number" {...field} value={field.value ?? ''} /></FormControl>
                                        <FormDescription className="text-xs">Based on tender amount and type.</FormDescription>
                                        <FormMessage />
                                    </FormItem> 
                                )}/>
                            </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField name="dateTimeOfReceipt" control={control} render={({ field }) => ( <FormItem><FormLabel>Last Date & Time of Receipt</FormLabel><FormControl><Input type="datetime-local" {...field} value={formatDateForInput(field.value, true)} onChange={(e) => field.onChange(e.target.value || null)}/></FormControl><FormMessage /></FormItem> )}/>
                                <FormField name="dateTimeOfOpening" control={control} render={({ field }) => ( <FormItem><FormLabel>Date & Time of Opening</FormLabel><FormControl><Input type="datetime-local" {...field} value={formatDateForInput(field.value, true)} onChange={(e) => field.onChange(e.target.value || null)}/></FormControl><FormMessage /></FormItem> )}/>
                            </div>
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
