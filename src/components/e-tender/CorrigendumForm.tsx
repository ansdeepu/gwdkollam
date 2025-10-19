// src/components/e-tender/CorrigendumForm.tsx
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
import { CorrigendumSchema, type Corrigendum, corrigendumTypeOptions } from '@/lib/schemas/eTenderSchema';
import { v4 as uuidv4 } from 'uuid';
import { formatDateForInput } from './utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface CorrigendumFormProps {
    onSubmit: (data: Corrigendum) => void;
    onCancel: () => void;
    isSubmitting: boolean;
    initialData?: Corrigendum | null;
}

const createDefaultCorrigendum = (): Corrigendum => ({
    id: uuidv4(),
    corrigendumType: undefined,
    corrigendumDate: null,
    noOfBids: '',
});

export default function CorrigendumForm({ onSubmit, onCancel, isSubmitting, initialData }: CorrigendumFormProps) {
    const form = useForm<Corrigendum>({
        resolver: zodResolver(CorrigendumSchema),
        defaultValues: initialData ? { ...initialData, corrigendumDate: formatDateForInput(initialData.corrigendumDate) } : createDefaultCorrigendum(),
    });

    useEffect(() => {
        form.reset(initialData ? { ...initialData, corrigendumDate: formatDateForInput(initialData.corrigendumDate) } : createDefaultCorrigendum());
    }, [initialData, form]);

    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
                <DialogHeader className="p-6 pb-4">
                    <DialogTitle>{initialData ? 'Edit Corrigendum' : 'Add New Corrigendum'}</DialogTitle>
                    <DialogDescription>Enter the details for the corrigendum.</DialogDescription>
                </DialogHeader>
                <div className="flex-1 min-h-0">
                    <ScrollArea className="h-full px-6 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField name="corrigendumType" control={form.control} render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Type</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select Type"/></SelectTrigger></FormControl>
                                        <SelectContent>{corrigendumTypeOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField name="corrigendumDate" control={form.control} render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Date</FormLabel>
                                    <FormControl><Input type="date" {...field} value={formatDateForInput(field.value)} onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField name="noOfBids" control={form.control} render={({ field }) => (
                                <FormItem>
                                    <FormLabel>No. of Bids</FormLabel>
                                    <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
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
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save Corrigendum
                    </Button>
                </DialogFooter>
            </form>
        </FormProvider>
    );
}
