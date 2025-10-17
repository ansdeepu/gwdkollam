// src/components/e-tender/BidderForm.tsx
"use client";

import React, { useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Save, X } from 'lucide-react';
import { BidderSchema, type Bidder } from '@/lib/schemas/eTenderSchema';
import { formatDateForInput } from './utils';
import { v4 as uuidv4 } from 'uuid';

interface BidderFormProps {
    onSubmit: (data: Bidder) => void;
    onCancel: () => void;
    isSubmitting: boolean;
    initialData?: Bidder | null;
}

const createDefaultBidder = (): Bidder => ({
    id: uuidv4(),
    name: '',
    address: '',
    quotedAmount: undefined,
    securityDepositType: '',
    securityDepositAmount: undefined,
    agreementAmount: undefined,
    additionalSecurityDeposit: undefined,
    dateSelectionNotice: undefined,
});

export default function BidderForm({ onSubmit, onCancel, isSubmitting, initialData }: BidderFormProps) {
    const form = useForm<Bidder>({
        resolver: zodResolver(BidderSchema),
        defaultValues: initialData 
            ? { ...initialData, dateSelectionNotice: formatDateForInput(initialData.dateSelectionNotice) }
            : createDefaultBidder(),
    });

    useEffect(() => {
        const defaultValues = initialData 
            ? { ...initialData, dateSelectionNotice: formatDateForInput(initialData.dateSelectionNotice) }
            : createDefaultBidder();
        form.reset(defaultValues);
    }, [initialData, form]);

    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
                <DialogHeader className="p-6 pb-4">
                    <DialogTitle>{initialData ? 'Edit Bidder' : 'Add New Bidder'}</DialogTitle>
                    <DialogDescription>Enter the details for the bidder.</DialogDescription>
                </DialogHeader>
                <div className="flex-1 min-h-0">
                    <ScrollArea className="h-full px-6 py-4">
                        <div className="space-y-4">
                           <FormField name="name" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Bidder Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                           <FormField name="address" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Address</FormLabel><FormControl><Textarea {...field} className="min-h-[40px]"/></FormControl><FormMessage /></FormItem> )}/>
                           <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <FormField name="quotedAmount" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Quoted Amount</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.valueAsNumber)}/></FormControl><FormMessage /></FormItem> )}/>
                                <FormField name="securityDepositType" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Security Deposit Type</FormLabel><FormControl><Input {...field} value={field.value ?? ''}/></FormControl><FormMessage /></FormItem> )}/>
                                <FormField name="securityDepositAmount" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Security Deposit Amount</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.valueAsNumber)}/></FormControl><FormMessage /></FormItem> )}/>
                                <FormField name="agreementAmount" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Agreement Amount</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.valueAsNumber)}/></FormControl><FormMessage /></FormItem> )}/>
                                <FormField name="additionalSecurityDeposit" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Addtl. Security Deposit</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.valueAsNumber)}/></FormControl><FormMessage /></FormItem> )}/>
                                <FormField
                                    name="dateSelectionNotice"
                                    control={form.control}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Date - Selection Notice</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="date"
                                                    value={formatDateForInput(field.value)}
                                                    onChange={e => field.onChange(e.target.value)}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                           </div>
                        </div>
                    </ScrollArea>
                </div>
                <DialogFooter className="p-6 pt-4">
                    <Button variant="outline" type="button" onClick={onCancel} disabled={isSubmitting}>
                        <X className="mr-2 h-4 w-4" /> Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save Bidder
                    </Button>
                </DialogFooter>
            </form>
        </FormProvider>
    );
}
