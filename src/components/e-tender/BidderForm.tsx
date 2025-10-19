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
import { v4 as uuidv4 } from 'uuid';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

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
    quotedPercentage: undefined,
    aboveBelow: undefined,
    status: undefined,
});

export default function BidderForm({ onSubmit, onCancel, isSubmitting, initialData }: BidderFormProps) {
    const form = useForm<Bidder>({
        resolver: zodResolver(BidderSchema),
        defaultValues: initialData || createDefaultBidder(),
    });

    useEffect(() => {
        form.reset(initialData || createDefaultBidder());
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
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               <FormField name="name" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Bidder Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                               <FormField name="address" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Address</FormLabel><FormControl><Textarea {...field} className="min-h-[40px]"/></FormControl><FormMessage /></FormItem> )}/>
                            </div>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField name="quotedPercentage" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Quoted Percentage</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.valueAsNumber)}/></FormControl><FormMessage /></FormItem> )}/>
                                <FormField name="aboveBelow" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Above/Below</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select..."/></SelectTrigger></FormControl><SelectContent><SelectItem value="Above">Above</SelectItem><SelectItem value="Below">Below</SelectItem></SelectContent></Select><FormMessage /></FormItem> )}/>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField name="quotedAmount" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Quoted Amount</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.valueAsNumber)}/></FormControl><FormMessage /></FormItem> )}/>
                                <FormField name="status" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select..."/></SelectTrigger></FormControl><SelectContent><SelectItem value="Accepted">Accepted</SelectItem><SelectItem value="Rejected">Rejected</SelectItem></SelectContent></Select><FormMessage /></FormItem> )}/>
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
