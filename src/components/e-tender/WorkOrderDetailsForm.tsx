
// src/components/e-tender/WorkOrderDetailsForm.tsx
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
import { WorkOrderDetailsSchema, type E_tenderFormData, type WorkOrderDetailsFormData, type Designation, designationOptions } from '@/lib/schemas/eTenderSchema';
import { formatDateForInput } from './utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useDataStore } from '@/hooks/use-data-store';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Separator } from '../ui/separator';


interface WorkOrderDetailsFormProps {
    initialData?: Partial<E_tenderFormData>;
    onSubmit: (data: Partial<E_tenderFormData>) => void;
    onCancel: () => void;
    isSubmitting: boolean;
    tenderType?: 'Work' | 'Purchase';
}

const assistantEngineerDesignations: Designation[] = ["Senior Driller", "Master Driller", "Assistant Engineer"];
const supervisorDesignations: Designation[] = ["Drilling Assistant", "Driller", "Driller Mechanic", "Senior Driller", "Master Driller"];

export default function WorkOrderDetailsForm({ initialData, onSubmit, onCancel, isSubmitting, tenderType }: WorkOrderDetailsFormProps) {
    const { allStaffMembers } = useDataStore();

    const getSortedStaffList = (designations: Designation[]) => {
        return allStaffMembers
            .filter(staff => designations.includes(staff.designation as Designation) && staff.status === 'Active')
            .sort((a, b) => {
                const orderA = designationOptions.indexOf(a.designation as Designation);
                const orderB = designationOptions.indexOf(b.designation as Designation);
                if (orderA !== orderB) return orderA - orderB;
                return a.name.localeCompare(b.name);
            });
    };

    const assistantEngineerList = useMemo(() => getSortedStaffList(assistantEngineerDesignations), [allStaffMembers]);
    const supervisorList = useMemo(() => getSortedStaffList(supervisorDesignations), [allStaffMembers]);
    
    const form = useForm<WorkOrderDetailsFormData>({
        resolver: zodResolver(WorkOrderDetailsSchema),
        defaultValues: {
            ...initialData,
            agreementDate: formatDateForInput(initialData?.agreementDate),
            dateWorkOrder: formatDateForInput(initialData?.dateWorkOrder),
        }
    });
    
    const { setValue, watch, control, reset } = form;

    useEffect(() => {
        reset({
             ...initialData,
            agreementDate: formatDateForInput(initialData?.agreementDate),
            dateWorkOrder: formatDateForInput(initialData?.dateWorkOrder),
        });
    }, [initialData, reset]);

    const title = tenderType === 'Purchase' ? 'Supply Order Details' : 'Work Order Details';
    
    const handleSupervisorChange = (staffId: string | null, fieldIndex: 1 | 2 | 3) => {
        const selectedStaff = staffId ? supervisorList.find(s => s.id === staffId) : null;
        setValue(`supervisor${fieldIndex}Id`, selectedStaff?.id || null);
        setValue(`supervisor${fieldIndex}Name`, selectedStaff?.name || null);
        setValue(`supervisor${fieldIndex}Phone`, selectedStaff?.phoneNo || null);
    };

    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
                <DialogHeader className="p-6 pb-4">
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>Enter details related to the final order.</DialogDescription>
                </DialogHeader>
                 <div className="flex-1 min-h-0 px-6 py-4">
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                            <FormField name="agreementDate" control={form.control} render={({ field }) => ( <FormItem className="lg:col-span-1"><FormLabel>Agreement Date</FormLabel><FormControl><Input type="date" {...field} value={formatDateForInput(field.value)} /></FormControl><FormMessage /></FormItem> )}/>
                            <FormField name="dateWorkOrder" control={form.control} render={({ field }) => ( <FormItem className="lg:col-span-1"><FormLabel>Date - {tenderType === 'Purchase' ? 'Supply Order' : 'Work Order'}</FormLabel><FormControl><Input type="date" {...field} value={formatDateForInput(field.value)}/></FormControl><FormMessage /></FormItem> )}/>
                             <FormField
                                name="nameOfAssistantEngineer"
                                control={form.control}
                                render={({ field }) => (
                                    <FormItem className="lg:col-span-1">
                                        <FormLabel>Measurer</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value || ""}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Select an Engineer" /></SelectTrigger></FormControl>
                                            <SelectContent position="popper">
                                                <SelectItem value="_clear_" onSelect={(e) => { e.preventDefault(); field.onChange(undefined); }}>-- Clear Selection --</SelectItem>
                                                {assistantEngineerList.map(staff => <SelectItem key={staff.id} value={staff.name}>{staff.name} ({staff.designation})</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            {([1, 2, 3] as const).map((i) => (
                                <div key={i} className="space-y-2 lg:col-span-1">
                                     <FormField name={`supervisor${i}Id`} control={control} render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Supervisor {i}</FormLabel>
                                            <Select onValueChange={(value) => handleSupervisorChange(value === '_clear_' ? null : value, i)} value={field.value || ""}>
                                                <FormControl><SelectTrigger><SelectValue placeholder={`Select Supervisor ${i}`} /></SelectTrigger></FormControl>
                                                <SelectContent position="popper">
                                                    <SelectItem value="_clear_" >-- Clear Selection --</SelectItem>
                                                    {supervisorList.map(staff => <SelectItem key={staff.id} value={staff.id}>{staff.name} ({staff.designation})</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <DialogFooter className="p-6 pt-4">
                    <Button variant="outline" type="button" onClick={onCancel} disabled={isSubmitting}>
                        <X className="mr-2 h-4 w-4" /> Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Update Details
                    </Button>
                </DialogFooter>
            </form>
        </FormProvider>
    );
}
