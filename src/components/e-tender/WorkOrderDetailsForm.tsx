// src/components/e-tender/WorkOrderDetailsForm.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { WorkOrderDetailsSchema, type WorkOrderDetailsFormData } from "@/lib/schemas/eTenderSchema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface WorkOrderDetailsFormProps {
    initialData: Partial<WorkOrderDetailsFormData>;
    onSubmit: (data: WorkOrderDetailsFormData) => void;
    onCancel: () => void;
    isSubmitting: boolean;
}

const formatDateForInput = (date: any) => {
    if (!date) return '';
    try { return new Date(date).toISOString().split('T')[0]; } catch (e) { return ''; }
};

export default function WorkOrderDetailsForm({ initialData, onSubmit, onCancel, isSubmitting }: WorkOrderDetailsFormProps) {
    const form = useForm<WorkOrderDetailsFormData>({
        resolver: zodResolver(WorkOrderDetailsSchema),
        defaultValues: {
            ...initialData,
            agreementDate: formatDateForInput(initialData.agreementDate),
            dateWorkOrder: formatDateForInput(initialData.dateWorkOrder),
        }
    });

    return (
        <>
            <DialogHeader className="p-6 pb-4">
                <DialogTitle>Work / Supply Order Details</DialogTitle>
                <DialogDescription>
                    Enter details related to the agreement and staff assignments.
                </DialogDescription>
            </DialogHeader>
            <div className="flex-1 min-h-0">
                <ScrollArea className="h-full px-6 py-4">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField name="agreementDate" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Agreement Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            <FormField name="nameOfAssistantEngineer" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Name of Assistant Engineer</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            <FormField name="nameOfSupervisor" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Name of Supervisor</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            <FormField name="supervisorPhoneNo" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Supervisor Phone No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            <FormField name="dateWorkOrder" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Date - Work / Supply Order</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            <Button type="submit" className="hidden" />
                        </form>
                    </Form>
                </ScrollArea>
            </div>
            <DialogFooter className="p-6 pt-4 border-t">
                <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
                <Button type="button" onClick={form.handleSubmit(onSubmit)} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Work Order Details
                </Button>
            </DialogFooter>
        </>
    );
}
