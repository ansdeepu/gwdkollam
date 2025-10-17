// src/components/e-tender/WorkOrderDetailsForm.tsx
"use client";

import React from 'react';
import { useForm, type UseFormReturn, FormProvider } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Save, X } from 'lucide-react';
import type { E_tenderFormData } from '@/lib/schemas/eTenderSchema';

interface WorkOrderDetailsFormProps {
    form: UseFormReturn<E_tenderFormData>;
    onSubmit: (data: Partial<E_tenderFormData>) => void;
    onCancel: () => void;
    isSubmitting: boolean;
    tenderType?: 'Work' | 'Purchase';
}

export default function WorkOrderDetailsForm({ form, onSubmit, onCancel, isSubmitting, tenderType }: WorkOrderDetailsFormProps) {

    const handleFormSubmit = (data: E_tenderFormData) => {
        onSubmit(data);
    };

    const title = tenderType === 'Purchase' ? 'Supply Order Details' : 'Work Order Details';

    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="flex flex-col h-full">
                <DialogHeader className="p-6 pb-4">
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>Enter details related to the final order.</DialogDescription>
                </DialogHeader>
                <div className="flex-1 min-h-0">
                    <ScrollArea className="h-full px-6 py-4">
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField name="agreementDate" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Agreement Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                <FormField name="dateWorkOrder" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Date - {tenderType === 'Purchase' ? 'Supply Order' : 'Work Order'}</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            </div>
                            <FormField name="nameOfAssistantEngineer" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Name of Assistant Engineer</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField name="nameOfSupervisor" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Name of Supervisor</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                <FormField name="supervisorPhoneNo" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Supervisor Phone No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
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
