
// src/components/e-tender/CorrigendumDetailsForm.tsx
"use client";

import React from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Save, X, PlusCircle, Trash2 } from 'lucide-react';
import { type E_tenderFormData, corrigendumTypeOptions, type Corrigendum } from '@/lib/schemas/eTenderSchema';
import { formatDateForInput } from './utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { v4 as uuidv4 } from 'uuid';

interface CorrigendumDetailsFormProps {
    onSubmit: (data: Partial<E_tenderFormData>) => void;
    onCancel: () => void;
    isSubmitting: boolean;
}

const createDefaultCorrigendum = (): Corrigendum => ({
    id: uuidv4(),
    corrigendumType: undefined,
    corrigendumDate: null,
    noOfBids: '',
});

export default function CorrigendumDetailsForm({ onSubmit, onCancel, isSubmitting }: CorrigendumDetailsFormProps) {
    const form = useFormContext<E_tenderFormData>();
    const { control, getValues } = form;

    const { fields, append, remove } = useFieldArray({
        control,
        name: "corrigendums",
    });

    return (
        <div className="flex flex-col h-full">
            <DialogHeader className="p-6 pb-4">
                <DialogTitle>Manage Corrigendum Details</DialogTitle>
                <DialogDescription>Add, edit, or remove corrigendum updates for this tender.</DialogDescription>
            </DialogHeader>
            <div className="flex-1 min-h-0">
                <ScrollArea className="h-full px-6 py-4">
                    <div className="flex justify-end mb-4">
                        <Button type="button" variant="outline" size="sm" onClick={() => append(createDefaultCorrigendum())}>
                            <PlusCircle className="h-4 w-4 mr-2" /> Add New Corrigendum
                        </Button>
                    </div>
                    <div className="space-y-4">
                        {fields.map((field, index) => (
                            <div key={field.id} className="p-4 border rounded-lg space-y-4 bg-secondary/30 relative">
                                <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive h-7 w-7" onClick={() => remove(index)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <FormField
                                        name={`corrigendums.${index}.corrigendumType`}
                                        control={control}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Type</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Select Type"/></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        {corrigendumTypeOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        name={`corrigendums.${index}.corrigendumDate`}
                                        control={control}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Date</FormLabel>
                                                <FormControl><Input type="date" {...field} value={formatDateForInput(field.value)} onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        name={`corrigendums.${index}.noOfBids`}
                                        control={control}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>No. of Bids</FormLabel>
                                                <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>
                        ))}
                        {fields.length === 0 && <p className="text-center text-muted-foreground py-8">No corrigendums added.</p>}
                    </div>
                </ScrollArea>
            </div>
            <DialogFooter className="p-6 pt-4">
                <Button variant="outline" type="button" onClick={onCancel} disabled={isSubmitting}>
                    <X className="mr-2 h-4 w-4" /> Cancel
                </Button>
                <Button type="button" onClick={() => onSubmit(getValues())} disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save Details
                </Button>
            </DialogFooter>
        </div>
    );
}
