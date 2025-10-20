// src/components/e-tender/TenderOpeningDetailsForm.tsx
"use client";

import React, { useEffect, useMemo } from 'react';
import { useForm, FormProvider, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Save, X } from 'lucide-react';
import { TenderOpeningDetailsSchema, type E_tenderFormData, type TenderOpeningDetailsFormData, type Designation } from '@/lib/schemas/eTenderSchema';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDateForInput } from './utils';
import { useDataStore } from '@/hooks/use-data-store';

interface TenderOpeningDetailsFormProps {
    initialData?: {
        memberIndex: 1 | 2 | 3;
        currentValue?: string | null;
    };
    onSubmit: (data: Partial<E_tenderFormData>) => void;
    onCancel: () => void;
    isSubmitting: boolean;
}

const committeeMemberDesignations: Designation[] = [
    "Assistant Executive Engineer",
    "Assistant Engineer",
    "Master Driller",
    "Senior Driller",
];

export default function TenderOpeningDetailsForm({ initialData, onSubmit, onCancel, isSubmitting }: TenderOpeningDetailsFormProps) {
    const { allStaffMembers } = useDataStore();

    const committeeMemberList = useMemo(() => {
        return allStaffMembers
            .filter(staff => committeeMemberDesignations.includes(staff.designation as Designation) && staff.status === 'Active')
            .sort((a, b) => {
                const orderA = committeeMemberDesignations.indexOf(a.designation as Designation);
                const orderB = committeeMemberDesignations.indexOf(b.designation as Designation);
                if (orderA !== orderB) return orderA - orderB;
                return a.name.localeCompare(b.name);
            });
    }, [allStaffMembers]);
    
    const form = useForm<any>({ // Use `any` for simplicity in this single-field form
        defaultValues: {
            memberName: initialData?.currentValue || undefined,
        }
    });

     useEffect(() => {
        form.reset({
            memberName: initialData?.currentValue || undefined,
        });
    }, [initialData, form]);

    const { control } = form;

    const handleFormSubmit = (data: { memberName?: string }) => {
        if (initialData?.memberIndex) {
            onSubmit({
                [`technicalCommitteeMember${initialData.memberIndex}`]: data.memberName,
            });
        }
    };


    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="flex flex-col h-full">
                <DialogHeader className="p-6 pb-4">
                    <DialogTitle>Edit Committee Member {initialData?.memberIndex}</DialogTitle>
                    <DialogDescription>Select a staff member for this committee slot.</DialogDescription>
                </DialogHeader>
                <div className="flex-1 min-h-0">
                    <ScrollArea className="h-full px-6 py-4">
                        <div className="space-y-4">
                             <FormField
                                name="memberName"
                                control={control}
                                render={({ field }) => (
                                <FormItem>
                                    <Select onValueChange={field.onChange} value={field.value || ""}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select a Member" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="_clear_" onSelect={(e) => { e.preventDefault(); field.onChange(undefined); }}>-- Clear Selection --</SelectItem>
                                            {committeeMemberList.map(staff => <SelectItem key={staff.id} value={staff.name}>{staff.name} ({staff.designation})</SelectItem>)}
                                        </SelectContent>
                                    </Select>
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
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save
                    </Button>
                </DialogFooter>
            </form>
        </FormProvider>
    );
}
