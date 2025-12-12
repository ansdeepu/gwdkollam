// src/components/vehicles/VehicleForms.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Save, X } from "lucide-react";
import { DepartmentVehicleSchema, HiredVehicleSchema, RigCompressorSchema } from "@/lib/schemas";
import type { DepartmentVehicle, HiredVehicle, RigCompressor } from "@/lib/schemas";
import { ScrollArea } from "../ui/scroll-area";
import { formatDateForInput, toDateOrNull } from '../e-tender/utils';

interface FormProps<T> {
    initialData: T | null;
    onSubmit: (data: T) => Promise<void>;
    onClose: () => void;
}

export function DepartmentVehicleForm({ initialData, onSubmit, onClose }: FormProps<DepartmentVehicle>) {
    const form = useForm<DepartmentVehicle>({
        resolver: zodResolver(DepartmentVehicleSchema),
        defaultValues: {
            ...initialData,
            registrationDate: formatDateForInput(initialData?.registrationDate),
            fitnessExpiry: formatDateForInput(initialData?.fitnessExpiry),
            taxExpiry: formatDateForInput(initialData?.taxExpiry),
            insuranceExpiry: formatDateForInput(initialData?.insuranceExpiry),
            pollutionExpiry: formatDateForInput(initialData?.pollutionExpiry),
        } as any,
    });

    const handleSubmit = async (data: DepartmentVehicle) => {
        await onSubmit(data);
        onClose();
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)}>
                <DialogHeader className="p-6 pb-4">
                    <DialogTitle>{initialData ? 'Edit' : 'Add'} Department Vehicle</DialogTitle>
                    <DialogDescription>Fill in the details for the vehicle.</DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] px-6">
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <FormField name="registrationNumber" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Registration Number</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem> )}/>
                        <FormField name="model" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Model</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem> )}/>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField name="typeOfVehicle" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Type of Vehicle</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem> )}/>
                        <FormField name="vehicleClass" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Vehicle Class</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem> )}/>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <FormField name="registrationDate" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Registration Date</FormLabel><FormControl><Input type="date" {...field}/></FormControl><FormMessage/></FormItem> )}/>
                        <FormField name="rcStatus" control={form.control} render={({ field }) => ( <FormItem><FormLabel>RC Status</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem> )}/>
                    </div>
                    <div className="space-y-2 pt-4 border-t">
                        <h4 className="font-medium text-sm">Certificate Validity</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField name="fitnessExpiry" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Fitness</FormLabel><FormControl><Input type="date" {...field}/></FormControl><FormMessage/></FormItem> )}/>
                            <FormField name="taxExpiry" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Tax</FormLabel><FormControl><Input type="date" {...field}/></FormControl><FormMessage/></FormItem> )}/>
                            <FormField name="insuranceExpiry" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Insurance</FormLabel><FormControl><Input type="date" {...field}/></FormControl><FormMessage/></FormItem> )}/>
                            <FormField name="pollutionExpiry" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Pollution</FormLabel><FormControl><Input type="date" {...field}/></FormControl><FormMessage/></FormItem> )}/>
                        </div>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <FormField name="fuelConsumptionRate" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Fuel Consumption Rate</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem> )}/>
                    </div>
                </div>
                </ScrollArea>
                <DialogFooter className="p-6 pt-4">
                    <Button type="button" variant="outline" onClick={onClose} disabled={form.formState.isSubmitting}>Cancel</Button>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2 h-4 w-4" />}
                        Save
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    );
}

export function HiredVehicleForm({ initialData, onSubmit, onClose }: FormProps<HiredVehicle>) {
    const form = useForm<HiredVehicle>({
        resolver: zodResolver(HiredVehicleSchema),
        defaultValues: {
            ...initialData,
            agreementValidity: formatDateForInput(initialData?.agreementValidity),
            registrationDate: formatDateForInput(initialData?.registrationDate),
            fitnessExpiry: formatDateForInput(initialData?.fitnessExpiry),
            taxExpiry: formatDateForInput(initialData?.taxExpiry),
            insuranceExpiry: formatDateForInput(initialData?.insuranceExpiry),
            pollutionExpiry: formatDateForInput(initialData?.pollutionExpiry),
        } as any,
    });

    const handleSubmit = async (data: HiredVehicle) => {
        await onSubmit(data);
        onClose();
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)}>
                <DialogHeader className="p-6 pb-4">
                    <DialogTitle>{initialData ? 'Edit' : 'Add'} Hired Vehicle</DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] px-6">
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField name="registrationNumber" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Registration Number</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem> )}/>
                            <FormField name="model" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Model</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem> )}/>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <FormField name="agreementValidity" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Agreement Validity</FormLabel><FormControl><Input type="date" {...field}/></FormControl><FormMessage/></FormItem> )}/>
                            <FormField name="vehicleClass" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Vehicle Class</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem> )}/>
                        </div>
                         <div className="grid grid-cols-2 gap-4">
                            <FormField name="registrationDate" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Registration Date</FormLabel><FormControl><Input type="date" {...field}/></FormControl><FormMessage/></FormItem> )}/>
                            <FormField name="rcStatus" control={form.control} render={({ field }) => ( <FormItem><FormLabel>RC Status</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem> )}/>
                        </div>
                        <div className="space-y-2 pt-4 border-t">
                            <h4 className="font-medium text-sm">Certificate Validity</h4>
                             <div className="grid grid-cols-2 gap-4">
                                <FormField name="fitnessExpiry" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Fitness</FormLabel><FormControl><Input type="date" {...field}/></FormControl><FormMessage/></FormItem> )}/>
                                <FormField name="taxExpiry" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Tax</FormLabel><FormControl><Input type="date" {...field}/></FormControl><FormMessage/></FormItem> )}/>
                                <FormField name="insuranceExpiry" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Insurance</FormLabel><FormControl><Input type="date" {...field}/></FormControl><FormMessage/></FormItem> )}/>
                                <FormField name="pollutionExpiry" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Pollution</FormLabel><FormControl><Input type="date" {...field}/></FormControl><FormMessage/></FormItem> )}/>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField name="hireCharges" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Hire Charges</FormLabel><FormControl><Input type="number" {...field}/></FormControl><FormMessage/></FormItem> )}/>
                            <FormField name="fuelConsumption" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Fuel Consumption</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem> )}/>
                        </div>
                    </div>
                </ScrollArea>
                <DialogFooter className="p-6 pt-4">
                    <Button type="button" variant="outline" onClick={onClose} disabled={form.formState.isSubmitting}>Cancel</Button>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2 h-4 w-4" />}
                        Save
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    );
}

export function RigCompressorForm({ initialData, onSubmit, onClose }: FormProps<RigCompressor>) {
    const form = useForm<RigCompressor>({
        resolver: zodResolver(RigCompressorSchema),
        defaultValues: initialData || {},
    });

    const handleSubmit = async (data: RigCompressor) => {
        await onSubmit(data);
        onClose();
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)}>
                <DialogHeader className="p-6 pb-4">
                    <DialogTitle>{initialData ? 'Edit' : 'Add'} Rig & Compressor Unit</DialogTitle>
                </DialogHeader>
                 <div className="p-6 pt-0 space-y-4">
                    <FormField name="typeOfRigUnit" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Type of Rig Unit</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem> )}/>
                    <FormField name="registrationNumber" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Registration Number</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem> )}/>
                    <FormField name="compressorDetails" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Compressor Details</FormLabel><FormControl><Textarea {...field}/></FormControl><FormMessage/></FormItem> )}/>
                    <FormField name="fuelConsumption" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Fuel Consumption</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem> )}/>
                    <FormField name="remarks" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Remarks</FormLabel><FormControl><Textarea {...field}/></FormControl><FormMessage/></FormItem> )}/>
                </div>
                <DialogFooter className="p-6 pt-4">
                    <Button type="button" variant="outline" onClick={onClose} disabled={form.formState.isSubmitting}>Cancel</Button>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2 h-4 w-4" />}
                        Save
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    );
}
