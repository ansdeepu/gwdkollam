// src/components/e-tender/BasicDetailsForm.tsx
"use client";

import React, { useEffect } from 'react';
import { useForm, FormProvider, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Save, X } from 'lucide-react';
import { BasicDetailsSchema, type E_tenderFormData } from '@/lib/schemas/eTenderSchema';
import { formatDateForInput } from './utils';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';

interface BasicDetailsFormProps {
  initialData?: Partial<E_tenderFormData>;
  onSubmit: (data: Partial<E_tenderFormData>) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export default function BasicDetailsForm({ initialData, onSubmit, onCancel, isSubmitting }: BasicDetailsFormProps) {
    const form = useForm<E_tenderFormData>({
        resolver: zodResolver(BasicDetailsSchema),
        defaultValues: {
            ...initialData,
            tenderDate: formatDateForInput(initialData?.tenderDate),
            dateTimeOfReceipt: formatDateForInput(initialData?.dateTimeOfReceipt, true),
            dateTimeOfOpening: formatDateForInput(initialData?.dateTimeOfOpening, true),
        },
    });

    const estimateAmount = useWatch({
        control: form.control,
        name: 'estimateAmount'
    });

    useEffect(() => {
        if (estimateAmount === undefined || estimateAmount === null) {
            form.setValue('tenderFormFee', undefined);
            form.setValue('emd', undefined);
            return;
        }

        // Calculate Tender Form Fee
        let fee = 0;
        if (estimateAmount > 100000 && estimateAmount <= 1000000) {
            fee = 500;
        } else if (estimateAmount > 1000000 && estimateAmount <= 5000000) {
            fee = 2500;
        } else if (estimateAmount > 5000000 && estimateAmount <= 10000000) {
            fee = 5000;
        } else if (estimateAmount > 10000000) {
            fee = 10000;
        }
        form.setValue('tenderFormFee', fee);

        // Calculate EMD
        let emd = 0;
        if (estimateAmount > 200000) {
            const calculatedEmd = Math.round((estimateAmount * 0.025) / 100) * 100;
            emd = Math.min(calculatedEmd, 200000);
        }
        form.setValue('emd', emd);

    }, [estimateAmount, form.setValue]);
     
    useEffect(() => {
        form.reset({
            ...initialData,
            tenderDate: formatDateForInput(initialData?.tenderDate),
            dateTimeOfReceipt: formatDateForInput(initialData?.dateTimeOfReceipt, true),
            dateTimeOfOpening: formatDateForInput(initialData?.dateTimeOfOpening, true),
        });
    }, [initialData, form]);

    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
                <DialogHeader className="p-6 pb-4">
                    <DialogTitle>Basic Tender Details</DialogTitle>
                    <DialogDescription>Enter the fundamental details for this tender.</DialogDescription>
                </DialogHeader>
                <div className="flex-1 min-h-0">
                    <ScrollArea className="h-full px-6 py-4">
                        <div className="space-y-4">
                             <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <FormField name="eTenderNo" control={form.control} render={({ field }) => ( <FormItem><FormLabel>eTender No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                <FormField name="tenderType" control={form.control} render={({ field }) => (
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
                                 <FormField name="tenderDate" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Tender Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                <FormField name="fileNo" control={form.control} render={({ field }) => ( <FormItem><FormLabel>File No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               <FormField name="nameOfWork" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Name of Work</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                               <FormField name="nameOfWorkMalayalam" control={form.control} render={({ field }) => ( <FormItem><FormLabel>വർക്കിന്റെ പേര് (Name of Work in Malayalam)</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField name="location" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Location</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                <FormField name="periodOfCompletion" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Period of Completion (Days)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.valueAsNumber)}/></FormControl><FormMessage /></FormItem> )}/>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField name="estimateAmount" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Tender Amount (Rs.)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} /></FormControl><FormMessage /></FormItem> )}/>
                                <FormField name="tenderFormFee" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Tender Form Fee (Rs.)</FormLabel><FormControl><Input readOnly type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )}/>
                                <FormField name="emd" control={form.control} render={({ field }) => ( <FormItem><FormLabel>EMD (Rs.)</FormLabel><FormControl><Input readOnly type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )}/>
                            </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField name="dateTimeOfReceipt" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Last Date & Time of Receipt</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                <FormField name="dateTimeOfOpening" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Date & Time of Opening</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl><FormMessage /></FormItem> )}/>
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
