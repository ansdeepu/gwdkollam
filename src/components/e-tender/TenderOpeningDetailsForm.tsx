// src/components/e-tender/TenderOpeningDetailsForm.tsx
"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TenderOpeningDetailsSchema, type TenderOpeningDetailsFormData, type Bidder } from "@/lib/schemas/eTenderSchema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, PlusCircle, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { v4 as uuidv4 } from 'uuid';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "../ui/textarea";

interface TenderOpeningDetailsFormProps {
    initialData: Partial<TenderOpeningDetailsFormData>;
    onSubmit: (data: TenderOpeningDetailsFormData) => void;
    onCancel: () => void;
    isSubmitting: boolean;
}

const formatDateForInput = (date: any) => {
    if (!date) return '';
    try { return new Date(date).toISOString().split('T')[0]; } catch (e) { return ''; }
};

const createDefaultBidder = (): Bidder => ({
  id: uuidv4(),
  name: '',
  address: '',
  quotedAmount: undefined,
  securityDepositType: '',
  securityDepositAmount: undefined,
  agreementAmount: undefined,
  additionalSecurityDeposit: undefined,
  dateSelectionNotice: undefined,
});

export default function TenderOpeningDetailsForm({ initialData, onSubmit, onCancel, isSubmitting }: TenderOpeningDetailsFormProps) {
    const form = useForm<TenderOpeningDetailsFormData>({
        resolver: zodResolver(TenderOpeningDetailsSchema),
        defaultValues: {
            ...initialData,
            dateOfOpeningBid: formatDateForInput(initialData.dateOfOpeningBid),
            dateOfTechnicalAndFinancialBidOpening: formatDateForInput(initialData.dateOfTechnicalAndFinancialBidOpening),
            bidders: initialData.bidders?.map(b => ({ ...b, dateSelectionNotice: formatDateForInput(b.dateSelectionNotice) })) || [],
        }
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "bidders"
    });

    return (
        <>
            <DialogHeader className="p-6 pb-4">
                <DialogTitle>Tender Opening Details</DialogTitle>
                <DialogDescription>
                    Enter bidder information and committee member details.
                </DialogDescription>
            </DialogHeader>
            <div className="flex-1 min-h-0">
                <ScrollArea className="h-full px-6 py-4">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField name="noOfTenderers" control={form.control} render={({ field }) => ( <FormItem><FormLabel>No. of Tenderers (Words)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                <FormField name="noOfSuccessfulTenderers" control={form.control} render={({ field }) => ( <FormItem><FormLabel>No. of Successful Tenderers (Words)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                <div className="flex gap-2">
                                <FormField name="quotedPercentage" control={form.control} render={({ field }) => ( <FormItem className="flex-1"><FormLabel>Quoted Percentage (%)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} /></FormControl><FormMessage /></FormItem> )}/>
                                <FormField name="aboveBelow" control={form.control} render={({ field }) => ( <FormItem className="flex-1"><FormLabel>Above/Below</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Above">Above</SelectItem><SelectItem value="Below">Below</SelectItem></SelectContent></Select><FormMessage /></FormItem> )}/>
                                </div>
                                <FormField name="dateOfOpeningBid" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Date of Opening Bid</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                <FormField name="dateOfTechnicalAndFinancialBidOpening" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Date of Technical/Financial Bid Opening</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField name="technicalCommitteeMember1" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Committee Member 1</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                <FormField name="technicalCommitteeMember2" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Committee Member 2</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                <FormField name="technicalCommitteeMember3" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Committee Member 3</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-semibold">Bidders</h3>
                                    <Button type="button" variant="outline" size="sm" onClick={() => append(createDefaultBidder())}><PlusCircle className="mr-2 h-4 w-4" /> Add Bidder</Button>
                                </div>
                                <div className="max-h-[400px] overflow-auto border rounded-lg">
                                <Table>
                                    <TableHeader>
                                    <TableRow>
                                        <TableHead>Bidder Details</TableHead>
                                        <TableHead>Financials</TableHead>
                                        <TableHead>Dates</TableHead>
                                        <TableHead>Action</TableHead>
                                    </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                    {fields.map((field, index) => (
                                        <TableRow key={field.id}>
                                            <TableCell className="align-top">
                                                <FormField name={`bidders.${index}.name`} control={form.control} render={({ field }) => ( <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                                <FormField name={`bidders.${index}.address`} control={form.control} render={({ field }) => ( <FormItem className="mt-2"><FormLabel>Address</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                            </TableCell>
                                            <TableCell className="align-top space-y-2">
                                                <FormField name={`bidders.${index}.quotedAmount`} control={form.control} render={({ field }) => ( <FormItem><FormLabel>Quoted Amount</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} /></FormControl><FormMessage /></FormItem> )}/>
                                                <FormField name={`bidders.${index}.securityDepositType`} control={form.control} render={({ field }) => ( <FormItem><FormLabel>Security Deposit Type</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                                <FormField name={`bidders.${index}.securityDepositAmount`} control={form.control} render={({ field }) => ( <FormItem><FormLabel>Security Deposit Amount</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} /></FormControl><FormMessage /></FormItem> )}/>
                                                <FormField name={`bidders.${index}.agreementAmount`} control={form.control} render={({ field }) => ( <FormItem><FormLabel>Agreement Amount</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} /></FormControl><FormMessage /></FormItem> )}/>
                                                <FormField name={`bidders.${index}.additionalSecurityDeposit`} control={form.control} render={({ field }) => ( <FormItem><FormLabel>Additional Security Deposit</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} /></FormControl><FormMessage /></FormItem> )}/>
                                            </TableCell>
                                            <TableCell className="align-top">
                                                <FormField name={`bidders.${index}.dateSelectionNotice`} control={form.control} render={({ field }) => ( <FormItem><FormLabel>Date - Selection Notice</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                            </TableCell>
                                            <TableCell className="align-top">
                                                <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    </TableBody>
                                </Table>
                                </div>
                            </div>
                            <Button type="submit" className="hidden" />
                        </form>
                    </Form>
                </ScrollArea>
            </div>
            <DialogFooter className="p-6 pt-4 border-t">
                <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
                <Button type="button" onClick={form.handleSubmit(onSubmit)} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Tender Opening Details
                </Button>
            </DialogFooter>
        </>
    );
}
