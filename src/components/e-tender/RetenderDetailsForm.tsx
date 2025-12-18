// src/components/e-tender/RetenderDetailsForm.tsx
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
import { RetenderDetailsSchema, type RetenderDetails } from '@/lib/schemas/eTenderSchema';
import { v4 as uuidv4 } from 'uuid';
import { formatDateForInput } from './utils';

interface RetenderDetailsFormProps {
    onSubmit: (data: RetenderDetails) => void;
    onCancel: () => void;
    isSubmitting: boolean;
    initialData?: RetenderDetails | null;
}

const createDefaultRetender = (): RetenderDetails => ({
    id: uuidv4(),
    retenderDate: null,
    lastDateOfReceipt: null,
    dateOfOpeningTender: null,
});

export default function RetenderDetailsForm({ onSubmit, onCancel, isSubmitting, initialData }: RetenderDetailsFormProps) {
    const form = useForm<RetenderDetails>({
        resolver: zodResolver(RetenderDetailsSchema),
        defaultValues: createDefaultRetender(),
    });

    useEffect(() => {
        const defaultValues = createDefaultRetender();
        const valuesToSet = {
            ...defaultValues,
            ...(initialData || {}),
            retenderDate: formatDateForInput(initialData?.retenderDate),
            lastDateOfReceipt: formatDateForInput(initialData?.lastDateOfReceipt, true),
            dateOfOpeningTender: formatDateForInput(initialData?.dateOfOpeningTender, true),
        };
        form.reset(valuesToSet);
    }, [initialData, form]);

    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
                <DialogHeader className="p-6 pb-4 shrink-0">
                    <DialogTitle>{initialData?.id ? 'Edit Retender' : 'Add New Retender'}</DialogTitle>
                    <DialogDescription>Enter the new dates for the retender process.</DialogDescription>
                </DialogHeader>
                <div className="flex-1 min-h-0">
                    <ScrollArea className="h-full px-6 py-4">
                        <div className="space-y-4">
                            <FormField name="retenderDate" control={form.control} render={({ field }) => (
                                <FormItem><FormLabel>Re-Tender Date</FormLabel><FormControl><Input type="date" {...field} value={formatDateForInput(field.value) ?? ''} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField name="lastDateOfReceipt" control={form.control} render={({ field }) => (
                                    <FormItem><FormLabel>New Last Date & Time</FormLabel><FormControl><Input type="datetime-local" {...field} value={formatDateForInput(field.value, true) ?? ''} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField name="dateOfOpeningTender" control={form.control} render={({ field }) => (
                                    <FormItem><FormLabel>New Opening Date & Time</FormLabel><FormControl><Input type="datetime-local" {...field} value={formatDateForInput(field.value, true) ?? ''} /></FormControl><FormMessage /></FormItem>
                                )}/>
                            </div>
                        </div>
                    </ScrollArea>
                </div>
                <DialogFooter className="p-6 pt-4 shrink-0 mt-auto">
                    <Button variant="outline" type="button" onClick={onCancel} disabled={isSubmitting}>
                        <X className="mr-2 h-4 w-4" /> Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save
                    </Button>
                </DialogFooter>
            </form>
        </FormProvider>
    );
}
