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

export default function BasicDetailsForm({ onSubmit, onCancel, isSubmitting }: BasicDetailsFormProps) {
    const { tender } = useTenderData();
    const { allRateDescriptions } = useDataStore();

    const form = useForm<BasicDetailsFormData>({
        resolver: zodResolver(BasicDetailsSchema),
        defaultValues: {
            ...tender,
            tenderDate: formatDateForInput(tender.tenderDate),
            dateTimeOfReceipt: formatDateForInput(tender.dateTimeOfReceipt, true),
            dateTimeOfOpening: formatDateForInput(tender.dateTimeOfOpening, true),
        }
    });
    
    const { control, setValue, handleSubmit, watch } = form;

    const [estimateAmount, tenderType] = watch([
        'estimateAmount',
        'tenderType',
    ]);

    const calculateFees = useCallback(() => {
        const amount = estimateAmount || 0;
        let fee = 0;
        let emd = 0;
        const roundToNext100 = (num: number) => Math.ceil(num / 100) * 100;

        if (tenderType === 'Work') {
            if (amount <= 50000) fee = 300;
            else if (amount <= 1000000) fee = Math.max(500, Math.min(amount * 0.002, 2000));
            else if (amount <= 10000000) fee = 2500;
            else if (amount <= 20000000) fee = 5000;
            else if (amount <= 50000000) fee = 7500;
            else if (amount <= 100000000) fee = 10000;
            else fee = 15000;
            fee = roundToNext100(fee);
            
            if (amount <= 20000000) emd = Math.min(amount * 0.025, 50000);
            else if (amount <= 50000000) emd = 100000;
            else if (amount <= 100000000) emd = 200000;
            else emd = 500000;
            emd = roundToNext100(emd);

        } else if (tenderType === 'Purchase') {
            if (amount <= 100000) fee = 0;
            else if (amount <= 1000000) fee = Math.max(400, Math.min(amount * 0.002, 1500));
            else fee = Math.min(amount * 0.0015, 25000);
            fee = roundToNext100(fee);

            if (amount > 0 && amount <= 20000000) emd = roundToNext100(amount * 0.01);
            else emd = 0;
        }

        setValue('tenderFormFee', fee, { shouldValidate: true, shouldDirty: true });
        setValue('emd', emd, { shouldValidate: true, shouldDirty: true });
    }, [estimateAmount, tenderType, setValue]);

    useEffect(() => {
        calculateFees();
    }, [calculateFees]);
     
    const onFormSubmit = (data: BasicDetailsFormData) => {
        const formData: Partial<E_tenderFormData> = { ...data };
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
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField name="eTenderNo" control={control} render={({ field }) => ( <FormItem><FormLabel>eTender No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                <FormField name="tenderDate" control={control} render={({ field }) => ( <FormItem><FormLabel>Tender Date</FormLabel><FormControl><Input type="date" {...field} value={formatDateForInput(field.value)} onChange={(e) => field.onChange(e.target.value || null)}/></FormControl><FormMessage /></FormItem> )}/>
                            </div>
                             <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <FormField name="fileNo" control={control} render={({ field }) => ( <FormItem><FormLabel>File No. 1</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                <FormField name="fileNo2" control={control} render={({ field }) => ( <FormItem><FormLabel>File No. 2</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                <FormField name="fileNo3" control={control} render={({ field }) => ( <FormItem><FormLabel>File No. 3</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                <FormField name="fileNo4" control={control} render={({ field }) => ( <FormItem><FormLabel>File No. 4</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                               <FormField name="nameOfWork" control={control} render={({ field }) => ( <FormItem><FormLabel>Name of Work</FormLabel><FormControl><Textarea {...field} className="min-h-[60px]"/></FormControl><FormMessage /></FormItem> )}/>
                               <FormField name="nameOfWorkMalayalam" control={control} render={({ field }) => ( <FormItem><FormLabel>Name of Work (in Malayalam)</FormLabel><FormControl><Textarea {...field} className="min-h-[60px]"/></FormControl><FormMessage /></FormItem> )}/>
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
                                        <FormLabel>Tender Fee (Rs.)</FormLabel>
                                        <FormControl><Input readOnly type="number" {...field} value={field.value ?? ''} className="bg-muted/50 font-semibold" /></FormControl>
                                        <FormDescription className="text-xs">Auto-calculated. Includes GST for 'Purchase' type.</FormDescription>
                                        <FormMessage />
                                    </FormItem> 
                                )}/>
                                <FormField name="emd" control={control} render={({ field }) => ( 
                                    <FormItem>
                                        <FormLabel>EMD (Rs.)</FormLabel>
                                        <FormControl><Input readOnly type="number" {...field} value={field.value ?? ''} className="bg-muted/50 font-semibold" /></FormControl>
                                        <FormDescription className="text-xs">Auto-calculated and rounded up.</FormDescription>
                                        <FormMessage />
                                    </FormItem> 
                                )}/>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField name="dateTimeOfReceipt" control={control} render={({ field }) => ( <FormItem><FormLabel>Last Date & Time of Receipt</FormLabel><FormControl><Input type="datetime-local" {...field} value={formatDateForInput(field.value, true)} onChange={(e) => field.onChange(e.target.value || null)}/></FormControl><FormMessage /></FormItem> )}/>
                                <FormField name="dateTimeOfOpening" control={control} render={({ field }) => ( <FormItem><FormLabel>Date & Time of Opening</FormLabel><FormControl><Input type="datetime-local" {...field} value={formatDateForInput(field.value, true)} onChange={(e) => field.onChange(e.target.value || null)}/></FormControl><FormMessage /></FormItem> )}/>
                            </div>
                            <FormField name="detailedEstimateUrl" control={control} render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Detailed Estimate PDF Link</FormLabel>
                                    <FormControl><Input {...field} placeholder="https://docs.google.com/..." /></FormControl>
                                    <FormDescription className="text-xs">Enter a public Google Drive link for the estimate PDF.</FormDescription>
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
