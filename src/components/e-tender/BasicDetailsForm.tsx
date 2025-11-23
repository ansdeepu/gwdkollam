// src/components/e-tender/BasicDetailsForm.tsx
"use client";

import React, { useEffect, useCallback } from 'react';
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
import { useDataStore } from '@/hooks/use-data-store';
import { useTenderData } from './TenderDataContext';
import { zodResolver } from '@hookform/resolvers/zod';
import { BasicDetailsSchema } from '@/lib/schemas/eTenderSchema';

interface BasicDetailsFormProps {
  onSubmit: (data: Partial<E_tenderFormData>) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

// Helper to parse rules from a description string
const parseRules = (description: string): Array<[number, number]> => {
    const rules: Array<[number, number]> = [];
    const lines = description.split('\n');
    for (const line of lines) {
        const feeMatch = line.match(/Rs\s*([\d,]+)/);
        const amountMatch = line.match(/(?:Over|up to|Above)\s*([\d,]+(?:\s*Lakhs?|\s*Crores?)?)/gi);
        if (feeMatch && amountMatch) {
            const fee = parseInt(feeMatch[1].replace(/,/g, ''), 10);
            let maxAmount = Infinity;
            for (const match of amountMatch) {
                let numPart = parseFloat(match.replace(/,/g, '').split(' ')[1]);
                if (match.toLowerCase().includes('lakh')) numPart *= 100000;
                if (match.toLowerCase().includes('crore')) numPart *= 10000000;

                if (match.toLowerCase().includes('up to') || match.toLowerCase().includes('upto')) {
                    maxAmount = numPart;
                }
            }
            rules.push([maxAmount, fee]);
        } else if (line.toLowerCase().includes('no fee')) {
             const amountMatchNoFee = line.match(/Up to Rs ([\d,]+)/);
             if(amountMatchNoFee) {
                rules.push([parseInt(amountMatchNoFee[1].replace(/,/g, ''), 10), 0]);
             }
        }
    }
    rules.sort((a, b) => a[0] - b[0]);
    return rules;
};

// Main calculation function using parsed rules
const calculateFee = (amount: number, rules: Array<[number, number]>): number => {
    if (amount <= 0) return 0;
    for (const [limit, fee] of rules) {
        if (amount <= limit) {
            return fee;
        }
    }
    return rules.length > 0 ? rules[rules.length - 1][1] : 0; // Default to highest fee if above all limits
};

const parseEmdRules = (description: string): { type: 'percentage' | 'fixed', threshold: number, rate?: number, max?: number, fixedTiers?: Array<[number, number]>}[] => {
    const rules: { type: 'percentage' | 'fixed', threshold: number, rate?: number, max?: number, fixedTiers?: Array<[number, number]>}[] = [];
    const lines = description.split('\n');

    for (const line of lines) {
        const percentageMatch = line.match(/([\d.]+)%/);
        const maxMatch = line.match(/maximum of Rs. ([\d,]+)/);
        const upToMatch = line.match(/Up to Rs. ([\d,]+ Crore)/);
        
        if (percentageMatch && upToMatch) {
            const rate = parseFloat(percentageMatch[1]) / 100;
            const threshold = parseFloat(upToMatch[1].replace(/,/g, '').replace(' Crore', '')) * 10000000;
            const max = maxMatch ? parseInt(maxMatch[1].replace(/,/g, ''), 10) : undefined;
            rules.push({ type: 'percentage', threshold, rate, max });
        } else {
             const fixedTiers: Array<[number, number]> = [];
             const fixedTierMatches = line.matchAll(/Above Rs. ([\d,]+ Crore) up to Rs. ([\d,]+ Crore): Rs. ([\d,]+ Lakh)/g);
             for (const match of fixedTierMatches) {
                 const lowerBound = parseFloat(match[1].replace(/,/g, '').replace(' Crore', '')) * 10000000;
                 const fee = parseInt(match[3].replace(/,/g, ''), 10) * 100000;
                 fixedTiers.push([lowerBound, fee]);
             }
             if(fixedTiers.length > 0) {
                 rules.push({ type: 'fixed', threshold: Infinity, fixedTiers });
             } else {
                 const finalTierMatch = line.match(/Above Rs. ([\d,]+ Crore): Rs. ([\d,]+ Lakh)/);
                 if (finalTierMatch) {
                    rules.push({ type: 'fixed', threshold: Infinity, fixedTiers: [[parseFloat(finalTierMatch[1].replace(/,/g, '').replace(' Crore', ''))*10000000, parseInt(finalTierMatch[2].replace(/,/g, ''), 10)*100000]] });
                 }
             }
        }
    }
    return rules;
};

const calculateEmd = (amount: number, emdDesc: string): number => {
    const rules = parseEmdRules(emdDesc);
    const roundToNearest100 = (num: number) => Math.ceil(num / 100) * 100;

    for (const rule of rules) {
        if (rule.type === 'percentage' && amount <= rule.threshold) {
            let emd = amount * (rule.rate || 0);
            if (rule.max && emd > rule.max) emd = rule.max;
            return roundToNearest100(emd);
        }
        if (rule.type === 'fixed' && rule.fixedTiers) {
            for (const [threshold, fee] of rule.fixedTiers.sort((a,b) => b[0] - a[0])) { // sort descending
                if(amount > threshold) {
                    return fee;
                }
            }
        }
    }
    return 0; // Default
};


export default function BasicDetailsForm({ onSubmit, onCancel, isSubmitting }: BasicDetailsFormProps) {
    const { tender } = useTenderData();
    const { allRateDescriptions } = useDataStore();

    const form = useForm<BasicDetailsFormData>({
        resolver: zodResolver(BasicDetailsSchema),
        defaultValues: tender,
    });
    
    const { control, setValue, handleSubmit, watch, getValues } = form;

    const [estimateAmount, tenderType, id] = watch([
        'estimateAmount',
        'tenderType',
        'id'
    ]);
    
    const tenderFeeRulesWork = parseRules(allRateDescriptions.tenderFee.split('\n\nFor Purchase:')[0]);
    const tenderFeeRulesPurchase = parseRules(allRateDescriptions.tenderFee.split('\n\nFor Purchase:')[1] || '');
    
    const emdRulesWork = allRateDescriptions.emd.split('\n\nFor Purchase:')[0];
    const emdRulesPurchase = allRateDescriptions.emd.split('\n\nFor Purchase:')[1] || '';

    useEffect(() => {
        let fee = 0;
        let emd = 0;
        const amount = estimateAmount || 0;

        if (tenderType === 'Work') {
            fee = calculateFee(amount, tenderFeeRulesWork);
            emd = calculateEmd(amount, emdRulesWork);
        } else if (tenderType === 'Purchase') {
            fee = calculateFee(amount, tenderFeeRulesPurchase);
            emd = calculateEmd(amount, emdRulesPurchase);
        }

        setValue('tenderFormFee', fee, { shouldValidate: true, shouldDirty: true });
        setValue('emd', emd, { shouldValidate: true, shouldDirty: true });

    }, [estimateAmount, tenderType, setValue, tenderFeeRulesWork, tenderFeeRulesPurchase, emdRulesWork, emdRulesPurchase]);
     
    const tenderFeeDescription = getValues('tenderFeeDescription') || allRateDescriptions.tenderFee;
    const emdDescription = getValues('emdDescription') || allRateDescriptions.emd;

    const onFormSubmit = (data: BasicDetailsFormData) => {
        const formData: Partial<E_tenderFormData> = { ...data };
        // If this is a new tender or the descriptions haven't been set, snapshot them.
        if (id === 'new' || !getValues('tenderFeeDescription')) {
            formData.tenderFeeDescription = allRateDescriptions.tenderFee;
        }
        if (id === 'new' || !getValues('emdDescription')) {
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
