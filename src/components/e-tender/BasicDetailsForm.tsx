// src/components/e-tender/BasicDetailsForm.tsx
"use client";

import React, { useEffect } from 'react';
import { useForm, FormProvider, useWatch, useFormContext } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Save, X } from 'lucide-react';
import type { E_tenderFormData } from '@/lib/schemas/eTenderSchema';
import { formatDateForInput } from './utils';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';

interface BasicDetailsFormProps {
  onSubmit: (data: Partial<E_tenderFormData>) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export default function BasicDetailsForm({ onSubmit, onCancel, isSubmitting }: BasicDetailsFormProps) {
    const form = useFormContext<E_tenderFormData>();

    const { control, setValue, handleSubmit } = form;

    const [estimateAmount, tenderType] = useWatch({
        control: control,
        name: ['estimateAmount', 'tenderType']
    });

    useEffect(() => {
        let fee = 0;
        let emd = 0;
        const amount = estimateAmount || 0;
        const roundToNearest100 = (num: number) => Math.ceil(num / 100) * 100;

        if (tenderType === 'Work') {
            // Tender Form Fee Calculation for Work
            if (amount <= 100000) fee = 0;
            else if (amount > 100000 && amount <= 1000000) fee = 500;
            else if (amount > 1000000 && amount <= 5000000) fee = 2500;
            else if (amount > 5000000 && amount <= 10000000) fee = 5000;
            else fee = 10000;

            // EMD Calculation for Work
            if (amount <= 20000000) emd = roundToNearest100(Math.min(amount * 0.025, 50000));
            else if (amount > 20000000 && amount <= 50000000) emd = 100000;
            else if (amount > 50000000 && amount <= 100000000) emd = 200000;
            else emd = 500000;

        } else if (tenderType === 'Purchase') {
            // Tender Form Fee Calculation for Purchase
            if (amount <= 100000) fee = 0;
            else if (amount > 100000 && amount <= 1000000) fee = 800;
            else if (amount > 1000000 && amount <= 2500000) fee = 1600;
            else fee = 3000;
            
            // EMD Calculation for Purchase - 1% of amount, rounded up to nearest 100, up to 2 Crore
            if (amount > 0 && amount <= 20000000) {
              emd = Math.ceil((amount * 0.01) / 100) * 100;
            } else {
              emd = 0; // No EMD for purchase tenders above 2 Crore
            }
        }

        setValue('tenderFormFee', fee, { shouldValidate: true, shouldDirty: true });
        setValue('emd', emd, { shouldValidate: true, shouldDirty: true });

    }, [estimateAmount, tenderType, setValue]);
     
    return (
        <FormProvider {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
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
                                <FormField name="tenderFormFee" control={control} render={({ field }) => ( <FormItem><FormLabel>Tender Form Fee (Rs.)</FormLabel><FormControl><Input readOnly type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )}/>
                                <FormField name="emd" control={control} render={({ field }) => ( <FormItem><FormLabel>EMD (Rs.)</FormLabel><FormControl><Input readOnly type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )}/>
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
