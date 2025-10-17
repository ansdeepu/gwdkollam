// src/components/e-tender/CorrigendumDetailsForm.tsx
"use client";

import React from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Save, X } from 'lucide-react';
import type { E_tenderFormData } from '@/lib/schemas/eTenderSchema';

interface CorrigendumDetailsFormProps {
    form: UseFormReturn<E_tenderFormData>;
    onSubmit: (data: Partial<E_tenderFormData>) => void;
    onCancel: () => void;
    isSubmitting: boolean;
}

export default function CorrigendumDetailsForm({ form, onSubmit, onCancel, isSubmitting }: CorrigendumDetailsFormProps) {

    const handleFormSubmit = (data: E_tenderFormData) => {
        onSubmit(data);
    };
    
    return (
         <>
            <DialogHeader className="p-6 pb-4">
                <DialogTitle>Corrigendum Details</DialogTitle>
                <DialogDescription>Enter details if there are any corrigendum updates.</DialogDescription>
            </DialogHeader>
             <div className="flex-1 min-h-0">
                <ScrollArea className="h-full px-6 py-4">
                    <div className="space-y-4">
                        <FormField name="dateTimeOfReceipt" control={form.control} render={({ field }) => ( <FormItem><FormLabel>New Date & Time of Receipt</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField name="dateTimeOfOpening" control={form.control} render={({ field }) => ( <FormItem><FormLabel>New Date & Time of Opening</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField name="corrigendumDate" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Corrigendum Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField name="noOfBids" control={form.control} render={({ field }) => ( <FormItem><FormLabel>No. of Bids Received</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    </div>
                </ScrollArea>
            </div>
            <DialogFooter className="p-6 pt-4">
                <Button variant="outline" type="button" onClick={onCancel} disabled={isSubmitting}>
                    <X className="mr-2 h-4 w-4" /> Cancel
                </Button>
                <Button type="button" onClick={form.handleSubmit(handleFormSubmit)} disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save Details
                </Button>
            </DialogFooter>
        </>
    );
}
