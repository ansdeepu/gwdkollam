
// src/components/e-tender/NewBidderForm.tsx
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
import { Loader2, Save, X, UserPlus } from 'lucide-react';
import { z } from 'zod';

const NewBidderSchema = z.object({
  name: z.string().min(1, "Bidder Name is required."),
  address: z.string().optional(),
  phoneNo: z.string().optional(),
  secondaryPhoneNo: z.string().optional(),
  email: z.string().email({ message: "Please enter a valid email." }).optional().or(z.literal('')),
  order: z.number().optional(),
});
export type NewBidderFormData = z.infer<typeof NewBidderSchema>;
export type Bidder = z.infer<typeof NewBidderSchema> & { id: string };


const createDefaultBidder = (): NewBidderFormData => ({
    name: '',
    address: '',
    phoneNo: '',
    secondaryPhoneNo: '',
    email: '',
});

interface NewBidderFormProps {
    onSubmit: (data: NewBidderFormData) => Promise<void>;
    onCancel: () => void;
    isSubmitting: boolean;
    initialData?: Bidder | null;
}

export default function NewBidderForm({ onSubmit, onCancel, isSubmitting, initialData }: NewBidderFormProps) {
    const form = useForm<NewBidderFormData>({
        resolver: zodResolver(NewBidderSchema),
        defaultValues: initialData || createDefaultBidder(),
    });

    useEffect(() => {
        if (initialData) {
            form.reset(initialData);
        } else {
            form.reset(createDefaultBidder());
        }
    }, [initialData, form]);

    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
                <DialogHeader className="p-6 pb-4">
                    <DialogTitle>{initialData ? 'Edit Bidder Details' : 'Add New Bidder'}</DialogTitle>
                    <DialogDescription>Enter the contact information for the bidder.</DialogDescription>
                </DialogHeader>
                <div className="flex-1 min-h-0">
                    <ScrollArea className="h-full px-6 py-4">
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField name="name" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Bidder Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                <FormField name="address" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Address</FormLabel><FormControl><Textarea {...field} className="min-h-[60px]"/></FormControl><FormMessage /></FormItem> )}/>
                            </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField name="phoneNo" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Phone No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                <FormField name="secondaryPhoneNo" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Secondary Phone No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                             </div>
                             <FormField name="email" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Email ID</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        </div>
                    </ScrollArea>
                </div>
                <DialogFooter className="p-6 pt-4">
                    <Button variant="outline" type="button" onClick={onCancel} disabled={isSubmitting}>
                        <X className="mr-2 h-4 w-4" /> Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} {initialData ? 'Save Changes' : 'Add Bidder'}
                    </Button>
                </DialogFooter>
            </form>
        </FormProvider>
    );
}
