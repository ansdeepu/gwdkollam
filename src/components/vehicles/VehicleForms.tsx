
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
import { DepartmentVehicleSchema, HiredVehicleSchema, RigCompressorSchema, rcStatusOptions, rigStatusOptions } from "@/lib/schemas";
import type { DepartmentVehicle, HiredVehicle, RigCompressor } from "@/lib/schemas";
import { ScrollArea } from "../ui/scroll-area";
import { format, isValid } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";


const safeParseDate = (dateValue: any): Date | null => {
  if (!dateValue) return null;
  if (dateValue instanceof Date) return dateValue;
  if (typeof dateValue === 'object' && dateValue !== null && typeof (dateValue as any).seconds === 'number') {
    return new Date((dateValue as any).seconds * 1000);
  }
  if (typeof dateValue === 'string') {
    const parsed = new Date(dateValue);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return null;
};

const formatDateForInput = (date: any): string => {
    if (!date) return '';
    const d = safeParseDate(date);
    if (d && isValid(d)) {
        return format(d, 'yyyy-MM-dd');
    }
    return '';
};

interface FormProps<T> {
    initialData: T | null;
    onFormSubmit: (data: T) => Promise<void>;
    onClose: () => void;
}

export function DepartmentVehicleForm({ initialData, onFormSubmit, onClose }: FormProps<DepartmentVehicle>) {
    const form = useForm<DepartmentVehicle>({
        resolver: zodResolver(DepartmentVehicleSchema),
        defaultValues: {
            registrationNumber: initialData?.registrationNumber || '',
            model: initialData?.model || '',
            typeOfVehicle: initialData?.typeOfVehicle || '',
            vehicleClass: initialData?.vehicleClass || '',
            rcStatus: initialData?.rcStatus || undefined,
            fuelConsumptionRate: initialData?.fuelConsumptionRate || '',
            registrationDate: formatDateForInput(initialData?.registrationDate),
            fitnessExpiry: formatDateForInput(initialData?.fitnessExpiry),
            taxExpiry: formatDateForInput(initialData?.taxExpiry),
            insuranceExpiry: formatDateForInput(initialData?.insuranceExpiry),
            pollutionExpiry: formatDateForInput(initialData?.pollutionExpiry),
            fuelTestExpiry: formatDateForInput(initialData?.fuelTestExpiry),
        } as any,
    });

    const handleSubmit = async (data: DepartmentVehicle) => {
        const payload = { ...initialData, ...data };
        await onFormSubmit(payload);
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField name="registrationNumber" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Registration Number</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage/></FormItem> )}/>
                        <FormField name="model" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Model</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage/></FormItem> )}/>
                        <FormField name="typeOfVehicle" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Type of Vehicle</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage/></FormItem> )}/>
                        <FormField name="vehicleClass" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Vehicle Class</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage/></FormItem> )}/>
                        <FormField name="registrationDate" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Registration Date</FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ''}/></FormControl><FormMessage/></FormItem> )}/>
                         <FormField
                            name="rcStatus"
                            control={form.control}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>RC Status</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {rcStatusOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField name="fuelConsumptionRate" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Fuel Consumption Rate</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage/></FormItem> )}/>
                    </div>
                    <div className="space-y-2 pt-4 border-t">
                        <h4 className="font-medium text-sm text-primary">Certificate Validity</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField name="fitnessExpiry" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Fitness</FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ''} /></FormControl><FormMessage/></FormItem> )}/>
                            <FormField name="taxExpiry" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Tax</FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ''} /></FormControl><FormMessage/></FormItem> )}/>
                            <FormField name="insuranceExpiry" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Insurance</FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ''} /></FormControl><FormMessage/></FormItem> )}/>
                            <FormField name="pollutionExpiry" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Pollution</FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ''} /></FormControl><FormMessage/></FormItem> )}/>
                            <FormField name="fuelTestExpiry" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Fuel Test</FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ''} /></FormControl><FormMessage/></FormItem> )}/>
                        </div>
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

export function HiredVehicleForm({ initialData, onFormSubmit, onClose }: FormProps<HiredVehicle>) {
    const form = useForm<HiredVehicle>({
        resolver: zodResolver(HiredVehicleSchema),
        defaultValues: {
            registrationNumber: initialData?.registrationNumber || '',
            model: initialData?.model || '',
            vehicleClass: initialData?.vehicleClass || '',
            rcStatus: initialData?.rcStatus || '',
            fuelConsumption: initialData?.fuelConsumption || '',
            hireCharges: initialData?.hireCharges || undefined,
            agreementValidity: formatDateForInput(initialData?.agreementValidity),
            registrationDate: formatDateForInput(initialData?.registrationDate),
            fitnessExpiry: formatDateForInput(initialData?.fitnessExpiry),
            taxExpiry: formatDateForInput(initialData?.taxExpiry),
            insuranceExpiry: formatDateForInput(initialData?.insuranceExpiry),
            pollutionExpiry: formatDateForInput(initialData?.pollutionExpiry),
        } as any,
    });

    const handleSubmit = async (data: HiredVehicle) => {
        const payload = { ...initialData, ...data };
        await onFormSubmit(payload);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)}>
                <DialogHeader className="p-6 pb-4">
                    <DialogTitle>{initialData ? 'Edit' : 'Add'} Hired Vehicle</DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] px-6">
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField name="registrationNumber" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Registration Number</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage/></FormItem> )}/>
                            <FormField name="model" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Model</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage/></FormItem> )}/>
                             <FormField name="agreementValidity" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Agreement Validity</FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ''} /></FormControl><FormMessage/></FormItem> )}/>
                            <FormField name="vehicleClass" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Vehicle Class</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage/></FormItem> )}/>
                            <FormField name="registrationDate" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Registration Date</FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ''} /></FormControl><FormMessage/></FormItem> )}/>
                            <FormField
                                name="rcStatus"
                                control={form.control}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>RC Status</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                {rcStatusOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField name="hireCharges" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Hire Charges</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage/></FormItem> )}/>
                            <FormField name="fuelConsumption" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Fuel Consumption</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage/></FormItem> )}/>
                        </div>
                        <div className="space-y-2 pt-4 border-t">
                            <h4 className="font-medium text-sm text-primary">Certificate Validity</h4>
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField name="fitnessExpiry" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Fitness</FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ''} /></FormControl><FormMessage/></FormItem> )}/>
                                <FormField name="taxExpiry" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Tax</FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ''} /></FormControl><FormMessage/></FormItem> )}/>
                                <FormField name="insuranceExpiry" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Insurance</FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ''} /></FormControl><FormMessage/></FormItem> )}/>
                                <FormField name="pollutionExpiry" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Pollution</FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ''} /></FormControl><FormMessage/></FormItem> )}/>
                            </div>
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

export function RigCompressorForm({ initialData, onFormSubmit, onClose }: FormProps<RigCompressor>) {
    const form = useForm<RigCompressor>({
        resolver: zodResolver(RigCompressorSchema),
        defaultValues: initialData || {
            typeOfRigUnit: '',
            registrationNumber: '',
            compressorDetails: '',
            fuelConsumption: '',
            remarks: '',
            status: 'Active',
        },
    });

    const handleSubmit = async (data: RigCompressor) => {
        const payload = { ...initialData, ...data };
        await onFormSubmit(payload);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)}>
                <DialogHeader className="p-6 pb-4">
                    <DialogTitle>{initialData ? 'Edit' : 'Add'} Rig & Compressor Unit</DialogTitle>
                </DialogHeader>
                <div className="p-6 pt-0 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField name="typeOfRigUnit" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Type of Rig Unit</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage/></FormItem> )}/>
                        <FormField name="registrationNumber" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Registration Number</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage/></FormItem> )}/>
                        <FormField name="status" control={form.control} render={({ field }) => ( 
                            <FormItem>
                                <FormLabel>Status</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {rigStatusOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <FormMessage/>
                            </FormItem>
                        )}/>
                        <FormField name="fuelConsumption" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Fuel Consumption</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage/></FormItem> )}/>
                        <FormField name="compressorDetails" control={form.control} render={({ field }) => ( <FormItem className="md:col-span-2"><FormLabel>Compressor Details</FormLabel><FormControl><Textarea {...field} value={field.value ?? ''} /></FormControl><FormMessage/></FormItem> )}/>
                        <FormField name="remarks" control={form.control} render={({ field }) => ( <FormItem className="md:col-span-2"><FormLabel>Remarks</FormLabel><FormControl><Textarea {...field} value={field.value ?? ''} /></FormControl><FormMessage/></FormItem> )}/>
                    </div>
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
