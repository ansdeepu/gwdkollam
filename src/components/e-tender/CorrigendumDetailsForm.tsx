// src/components/e-tender/CorrigendumDetailsForm.tsx
"use client";

import React, { useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Save, X } from 'lucide-react';
import { CorrigendumDetailsSchema, type E_tenderFormData, type CorrigendumDetailsFormData } from '@/lib/schemas/eTenderSchema';
import { formatDateForInput } from './utils';

interface CorrigendumDetailsFormProps {
    initialData?: Partial<E_tenderFormData>;
    onSubmit: (data: Partial<E_tenderFormData>) => void;
    onCancel: () => void;
    isSubmitting: boolean;
}

export default function CorrigendumDetailsForm({ initialData, onSubmit, onCancel, isSubmitting }: CorrigendumDetailsFormProps) {
    const form = useForm<CorrigendumDetailsFormData>({
        resolver: zodResolver(CorrigendumDetailsSchema),
        defaultValues: {
            corrigendumDate: formatDateForInput(initialData?.corrigendumDate),
            noOfBids: initialData?.noOfBids,
        }
    });

    useEffect(() => {
        form.reset({
            corrigendumDate: formatDateForInput(initialData?.corrigendumDate),
            noOfBids: initialData?.noOfBids,
        });
    }, [initialData, form]);

    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
                <DialogHeader className="p-6 pb-4">
                    <DialogTitle>Corrigendum Details</DialogTitle>
                    <DialogDescription>Enter details if there are any corrigendum updates.</DialogDescription>
                </DialogHeader>
                <div className="flex-1 min-h-0">
                    <ScrollArea className="h-full px-6 py-4">
                        <div className="space-y-4">
                            <FormField name="corrigendumDate" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Corrigendum Date</FormLabel><FormControl><Input type="date" {...field} value={formatDateForInput(field.value)} /></FormControl><FormMessage /></FormItem> )}/>
                            <FormField name="noOfBids" control={form.control} render={({ field }) => ( <FormItem><FormLabel>No. of Bids Received</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )}/>
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
