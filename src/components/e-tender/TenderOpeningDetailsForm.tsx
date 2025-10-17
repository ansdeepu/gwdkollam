// src/components/e-tender/TenderOpeningDetailsForm.tsx
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TenderOpeningDetailsFormProps {
    form: UseFormReturn<E_tenderFormData>;
    onSubmit: (data: Partial<E_tenderFormData>) => void;
    onCancel: () => void;
    isSubmitting: boolean;
}

export default function TenderOpeningDetailsForm({ form, onSubmit, onCancel, isSubmitting }: TenderOpeningDetailsFormProps) {
    
    const handleFormSubmit = (data: E_tenderFormData) => {
        onSubmit(data);
    };

    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="flex flex-col h-full">
                <DialogHeader className="p-6 pb-4">
                    <DialogTitle>Tender Opening Details</DialogTitle>
                    <DialogDescription>Enter general details related to the tender opening process.</DialogDescription>
                </DialogHeader>
                <div className="flex-1 min-h-0">
                    <ScrollArea className="h-full px-6 py-4">
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField name="noOfTenderers" control={form.control} render={({ field }) => ( <FormItem><FormLabel>No. of Tenderers</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                <FormField name="noOfSuccessfulTenderers" control={form.control} render={({ field }) => ( <FormItem><FormLabel>No. of Successful Tenderers</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                <FormField name="quotedPercentage" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Quoted Percentage</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} /></FormControl><FormMessage /></FormItem> )}/>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField name="aboveBelow" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Above/Below</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="Above">Above</SelectItem><SelectItem value="Below">Below</SelectItem></SelectContent></Select><FormMessage /></FormItem> )}/>
                                <FormField name="dateOfOpeningBid" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Date of Opening Bid</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                <FormField name="dateOfTechnicalAndFinancialBidOpening" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Date of Tech/Fin Bid Opening</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            </div>
                            <div className="space-y-2">
                                <FormLabel>Committee Members</FormLabel>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <FormField name="technicalCommitteeMember1" control={form.control} render={({ field }) => ( <FormItem><FormControl><Input {...field} placeholder="Member 1"/></FormControl><FormMessage /></FormItem> )}/>
                                    <FormField name="technicalCommitteeMember2" control={form.control} render={({ field }) => ( <FormItem><FormControl><Input {...field} placeholder="Member 2"/></FormControl><FormMessage /></FormItem> )}/>
                                    <FormField name="technicalCommitteeMember3" control={form.control} render={({ field }) => ( <FormItem><FormControl><Input {...field} placeholder="Member 3"/></FormControl><FormMessage /></FormItem> )}/>
                                </div>
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
