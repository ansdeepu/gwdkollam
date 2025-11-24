
// src/components/e-tender/BasicDetailsForm.tsx
"use client";

import React, { useEffect, useMemo, useCallback } from 'react';
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

const parseAmountString = (amountStr?: string | null): number => {
    if (!amountStr) return 0;
    const cleanedStr = String(amountStr).replace(/,/g, '').toLowerCase();
    const numMatch = cleanedStr.match(/([\d.]+)/);
    if (!numMatch) return 0;
    
    let num = parseFloat(numMatch[1]);
    if (isNaN(num)) return 0;

    if (cleanedStr.includes('lakh')) num *= 100000;
    if (cleanedStr.includes('crore')) num *= 10000000;
    
    return num;
};

type FeeRule = { limit: number; fee: number };
const parseFeeRules = (description: string): FeeRule[] => {
    const rules: FeeRule[] = [];
    if (!description) return rules;
    
    const lines = description.split('\n');
    for (const line of lines) {
        const parts = line.split(':');
        if (parts.length < 2) continue;

        const condition = parts[0].toLowerCase();
        const feePart = parts[1].trim();
        const fee = parseAmountString(feePart);

        if (condition.includes('no fee')) {
            const limitMatch = condition.match(/up to ([\d,.\s\w]+)/);
            if (limitMatch) {
                rules.push({ limit: parseAmountString(limitMatch[1]), fee: 0 });
            }
            continue;
        }
        
        const overUpToMatch = condition.match(/over\s*([\d,.\s\w]+)\s*up to\s*([\d,.\s\w]+)/);
        if (overUpToMatch) {
            rules.push({ limit: parseAmountString(overUpToMatch[2]), fee });
            continue;
        }

        const upToMatch = condition.match(/up to\s*([\d,.\s\w]+)/);
        if (upToMatch) {
            rules.push({ limit: parseAmountString(upToMatch[1]), fee });
            continue;
        }
        
        const aboveMatch = condition.match(/above\s*([\d,.\s\w]+)/);
        if (aboveMatch) {
            rules.push({ limit: Infinity, fee });
        }
    }
    return rules.sort((a, b) => a.limit - b.limit);
};

const calculateFee = (amount: number, rules: FeeRule[]): number => {
    if (amount <= 0 || rules.length === 0) return 0;
    for (const rule of rules) {
        if (amount <= rule.limit) {
            return rule.fee;
        }
    }
    const lastRule = rules.find(r => r.limit === Infinity);
    return lastRule?.fee ?? (rules.length > 0 ? rules[rules.length - 1].fee : 0);
};

type EmdRule = { type: 'percentage' | 'fixed'; threshold: number; rate?: number; max?: number; value?: number; };
const parseEmdRules = (description: string): EmdRule[] => {
    const rules: EmdRule[] = [];
    if (!description) return rules;
    const lines = description.split('\n').filter(line => line.trim() !== '');

    for (const line of lines) {
        const upToPercentageMatch = line.match(/up to ([\d,.\s\w]+):\s*([\d.]+)%/i);
        if (upToPercentageMatch) {
            const threshold = parseAmountString(upToPercentageMatch[1]);
            const rate = parseFloat(upToPercentageMatch[2]) / 100;
            const maxMatch = line.match(/maximum of ([\d,.\s\w]+)/i);
            const max = maxMatch ? parseAmountString(maxMatch[1]) : undefined;
            rules.push({ type: 'percentage', threshold, rate, max });
            continue;
        }
        
        const aboveFixedMatch = line.match(/above ([\d,.\s\w]+)\s*up to\s*([\d,.\s\w]+):\s*([\d,.\s\w]+)/i);
        if (aboveFixedMatch) {
            const threshold = parseAmountString(aboveFixedMatch[2]);
            const value = parseAmountString(aboveFixedMatch[3]);
            rules.push({ type: 'fixed', threshold, value });
            continue;
        }

        const aboveFixedSingleMatch = line.match(/above ([\d,.\s\w]+):\s*([\d,.\s\w]+)/i);
        if (aboveFixedSingleMatch) {
            rules.push({ type: 'fixed', threshold: Infinity, value: parseAmountString(aboveFixedSingleMatch[2]) });
            continue;
        }
    }
    return rules.sort((a, b) => a.threshold - b.threshold);
};


const calculateEmd = (amount: number, rules: EmdRule[]): number => {
    if (amount <= 0 || rules.length === 0) return 0;
    const roundToNearest100 = (num: number) => Math.ceil(num / 100) * 100;

    for (const rule of rules) {
        if (amount <= rule.threshold) {
            if (rule.type === 'percentage' && rule.rate !== undefined) {
                let emd = amount * rule.rate;
                if (rule.max !== undefined && emd > rule.max) emd = rule.max;
                return roundToNearest100(emd);
            }
            if (rule.type === 'fixed' && rule.value !== undefined) {
                return rule.value;
            }
        }
    }
    
    const lastRule = rules.find(r => r.threshold === Infinity);
    if (lastRule && lastRule.type === 'fixed' && lastRule.value !== undefined) {
      return lastRule.value;
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

    const form = useForm<BasicDetailsFormData>({
        resolver: zodResolver(BasicDetailsSchema),
        defaultValues: tender,
    });
    
    const { control, setValue, handleSubmit, watch, getValues } = form;

    const estimateAmount = watch('estimateAmount');
    const tenderType = watch('tenderType');
    const tenderId = getValues('id');
    
    useEffect(() => {
        const tenderFeeDesc = allRateDescriptions.tenderFee || defaultRateDescriptions.tenderFee;
        const [tenderFeeWork, tenderFeePurchase] = tenderFeeDesc.split('\n\nFor Purchase:');

        const emdDesc = allRateDescriptions.emd || defaultRateDescriptions.emd;
        const [emdWork, emdPurchase] = emdDesc.split('\n\nFor Purchase:');

        const calculationRules = {
            tenderFeeRulesWork: parseFeeRules(tenderFeeWork),
            tenderFeeRulesPurchase: parseFeeRules(tenderFeePurchase || ''),
            emdRulesWork: parseEmdRules(emdWork || ''),
            emdRulesPurchase: parseEmdRules(emdPurchase || ''),
        };

        const amount = estimateAmount || 0;
        let fee = 0;
        let emd = 0;

        if (tenderType === 'Work') {
            fee = calculateFee(amount, calculationRules.tenderFeeRulesWork);
            emd = calculateEmd(amount, calculationRules.emdRulesWork);
        } else if (tenderType === 'Purchase') {
            fee = calculateFee(amount, calculationRules.tenderFeeRulesPurchase);
            emd = calculateEmd(amount, calculationRules.emdRulesPurchase);
        }
        
        setValue('tenderFormFee', fee, { shouldDirty: true });
        setValue('emd', emd, { shouldDirty: true });

    }, [estimateAmount, tenderType, setValue, allRateDescriptions]);
     
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
                                        <FormDescription className="text-xs">Auto-calculated. GST (18%) is extra.</FormDescription>
                                        <FormMessage />
                                    </FormItem> 
                                )}/>
                                <FormField name="emd" control={control} render={({ field }) => ( 
                                    <FormItem>
                                        <FormLabel>EMD (Rs.)</FormLabel>
                                        <FormControl><Input readOnly type="number" {...field} value={field.value ?? ''} /></FormControl>
                                        <FormDescription className="text-xs">Auto-calculated. Rounded up.</FormDescription>
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
