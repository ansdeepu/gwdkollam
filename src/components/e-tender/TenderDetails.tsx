
// src/components/e-tender/TenderDetails.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useTenderData } from './TenderDataContext';
import { useE_tenders } from '@/hooks/useE_tenders';
import { useRouter } from 'next/navigation';
import { useForm, FormProvider, useFieldArray, FormField } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { E_tenderSchema, type E_tenderFormData, type Bidder } from '@/lib/schemas/eTenderSchema';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Loader2, Save, Edit, PlusCircle, Trash2, FileText, Building, GitBranch, FolderOpen, ScrollText, Download } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { formatDateForInput, formatDateSafe } from './utils';

import CorrigendumDetailsForm from './CorrigendumDetailsForm';
import TenderOpeningDetailsForm from './TenderOpeningDetailsForm';
import WorkOrderDetailsForm from './WorkOrderDetailsForm';
import { FormItem, FormLabel, FormControl, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';

type ModalType = 'corrigendum' | 'opening' | 'workOrder' | null;

const DetailRow = ({ label, value }: { label: string; value: any }) => {
    if (value === null || value === undefined || value === '') {
        return null;
    }
    return (
        <div>
            <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
            <dd className="text-sm font-semibold">{String(value)}</dd>
        </div>
    );
};


export default function TenderDetails() {
    const router = useRouter();
    const { tender, updateTender } = useTenderData();
    const { addTender, updateTender: saveTenderToDb } = useE_tenders();
    const [activeModal, setActiveModal] = useState<ModalType>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<E_tenderFormData>({
        resolver: zodResolver(E_tenderSchema),
        defaultValues: {
            ...tender,
            tenderDate: formatDateForInput(tender.tenderDate),
            lastDateOfReceipt: formatDateForInput(tender.lastDateOfReceipt),
            dateOfOpeningTender: formatDateForInput(tender.dateOfOpeningTender),
            corrigendumDate: formatDateForInput(tender.corrigendumDate),
            dateTimeOfReceipt: formatDateForInput(tender.dateTimeOfReceipt),
            dateTimeOfOpening: formatDateForInput(tender.dateTimeOfOpening),
            dateOfOpeningBid: formatDateForInput(tender.dateOfOpeningBid),
            agreementDate: formatDateForInput(tender.agreementDate),
            dateWorkOrder: formatDateForInput(tender.dateWorkOrder),
            bidders: tender.bidders?.map(b => ({ ...b, dateSelectionNotice: formatDateForInput(b.dateSelectionNotice) })) || [],
        },
    });

    const { fields: bidderFields, append: appendBidder, remove: removeBidder } = useFieldArray({
        control: form.control,
        name: "bidders"
    });
    
     const handleFinalSave = async () => {
        const isValid = await form.trigger();
        if (!isValid) {
            toast({ title: "Validation Error", description: "Please check all fields for errors.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            const currentTenderData = form.getValues();
            if (tender.id === 'new') {
                const newTenderId = await addTender(currentTenderData);
                toast({ title: "Tender Created", description: "The new e-Tender has been created and saved." });
                router.replace(`/dashboard/e-tender/${newTenderId}`);
            } else {
                await saveTenderToDb(tender.id, currentTenderData);
                toast({ title: "All Changes Saved", description: "All tender details have been successfully updated." });
                router.push('/dashboard/e-tender');
            }
        } catch (error: any) {
            toast({ title: "Error Saving Changes", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };


    useEffect(() => {
        form.reset({
            ...tender,
            tenderDate: formatDateForInput(tender.tenderDate),
            lastDateOfReceipt: formatDateForInput(tender.lastDateOfReceipt),
            dateOfOpeningTender: formatDateForInput(tender.dateOfOpeningTender),
            corrigendumDate: formatDateForInput(tender.corrigendumDate),
            dateTimeOfReceipt: formatDateForInput(tender.dateTimeOfReceipt),
            dateTimeOfOpening: formatDateForInput(tender.dateTimeOfOpening),
            dateOfOpeningBid: formatDateForInput(tender.dateOfOpeningBid),
            agreementDate: formatDateForInput(tender.agreementDate),
            dateWorkOrder: formatDateForInput(tender.dateWorkOrder),
            bidders: tender.bidders?.map(b => ({ ...b, dateSelectionNotice: formatDateForInput(b.dateSelectionNotice) })) || [],
        });
    }, [tender, form]);

    const handleSave = async (data: Partial<E_tenderFormData>) => {
        updateTender(data);
        toast({ title: "Details Updated Locally", description: "Click 'Save All Changes' to persist." });
        setActiveModal(null);
    };
    
    const pdfReports = [
        "Notice Inviting Tender (NIT)", "Tender Form", "Corrigendum", "Bid Opening Summary",
        "Technical Summary", "Financial Summary", "Selection Notice", "Work / Supply Order",
        "Work Agreement", "Tender Status Summary"
    ];
    
    return (
        <FormProvider {...form}>
            <div className="space-y-6">
                <Card>
                    <CardContent className="pt-6">
                        <Accordion type="single" collapsible defaultValue="basic-details" className="w-full space-y-4">
                            
                            {/* Basic Details Accordion */}
                            <AccordionItem value="basic-details" className="border rounded-lg">
                                <AccordionTrigger className="p-4 text-lg font-semibold text-primary data-[state=closed]:hover:bg-secondary/20">
                                    <div className="flex justify-between items-center w-full">
                                        <span className="flex items-center gap-3"><Building className="h-5 w-5"/>Basic Details</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="p-6 pt-0">
                                    <div className="space-y-4 pt-4 border-t">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FormField name="eTenderNo" control={form.control} render={({ field }) => ( <FormItem><FormLabel>eTender No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                            <FormField name="tenderDate" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Tender Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                        </div>
                                        <FormField name="fileNo" control={form.control} render={({ field }) => ( <FormItem><FormLabel>File No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                        <FormField name="nameOfWork" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Name of Work</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                        <FormField name="nameOfWorkMalayalam" control={form.control} render={({ field }) => ( <FormItem><FormLabel>വർക്കിന്റെ പേര് (Name of Work in Malayalam)</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                        <FormField name="location" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Location</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <FormField name="estimateAmount" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Estimate Amount (Rs.)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} /></FormControl><FormMessage /></FormItem> )}/>
                                            <FormField name="tenderFormFee" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Tender Form Fee (Rs.)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.valueAsNumber)}/></FormControl><FormMessage /></FormItem> )}/>
                                            <FormField name="emd" control={form.control} render={({ field }) => ( <FormItem><FormLabel>EMD (Rs.)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.valueAsNumber)}/></FormControl><FormMessage /></FormItem> )}/>
                                        </div>
                                        <FormField name="periodOfCompletion" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Period of Completion (Days)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.valueAsNumber)}/></FormControl><FormMessage /></FormItem> )}/>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FormField name="lastDateOfReceipt" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Last Date of Receipt</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                            <FormField name="timeOfReceipt" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Time of Receipt</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FormField name="dateOfOpeningTender" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Date of Opening Tender</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                            <FormField name="timeOfOpeningTender" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Time of Opening Tender</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                            
                            {/* Corrigendum Details Accordion */}
                            <AccordionItem value="corrigendum-details" className="border rounded-lg">
                               <AccordionTrigger className="p-4 text-lg font-semibold text-primary data-[state=closed]:hover:bg-secondary/20">
                                    <div className="flex justify-between items-center w-full">
                                        <span className="flex items-center gap-3"><GitBranch className="h-5 w-5"/>Corrigendum Details</span>
                                        <Button type="button" size="sm" variant="outline" className="mr-4" onClick={(e) => { e.stopPropagation(); setActiveModal('corrigendum'); }}><Edit className="h-4 w-4 mr-2"/>Edit</Button>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="p-6 pt-0">
                                     <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 pt-4 border-t">
                                        <DetailRow label="New Date & Time of Receipt" value={formatDateSafe(form.watch('dateTimeOfReceipt'), true)} />
                                        <DetailRow label="New Date & Time of Opening" value={formatDateSafe(form.watch('dateTimeOfOpening'), true)} />
                                        <DetailRow label="Corrigendum Date" value={formatDateSafe(form.watch('corrigendumDate'))} />
                                        <DetailRow label="No. of Bids Received" value={form.watch('noOfBids')} />
                                     </dl>
                                </AccordionContent>
                            </AccordionItem>
                            
                            {/* Tender Opening Accordion */}
                             <AccordionItem value="opening-details" className="border rounded-lg">
                               <AccordionTrigger className="p-4 text-lg font-semibold text-primary data-[state=closed]:hover:bg-secondary/20">
                                    <div className="flex justify-between items-center w-full">
                                        <span className="flex items-center gap-3"><FolderOpen className="h-5 w-5"/>Tender Opening Details</span>
                                        <Button type="button" size="sm" variant="outline" className="mr-4" onClick={(e) => { e.stopPropagation(); setActiveModal('opening'); }}><Edit className="h-4 w-4 mr-2"/>Edit</Button>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="p-6 pt-0">
                                     <dl className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-3 pt-4 border-t">
                                        <DetailRow label="No. of Tenderers" value={form.watch('noOfTenderers')} />
                                        <DetailRow label="No. of Successful Tenderers" value={form.watch('noOfSuccessfulTenderers')} />
                                        <DetailRow label="Quoted Percentage" value={form.watch('quotedPercentage') ? `${form.watch('quotedPercentage')}% ${form.watch('aboveBelow') || ''}` : 'N/A'} />
                                        <DetailRow label="Date of Opening Bid" value={formatDateSafe(form.watch('dateOfOpeningBid'))} />
                                        <DetailRow label="Date of Tech/Fin Bid Opening" value={formatDateSafe(form.watch('dateOfTechnicalAndFinancialBidOpening'))} />
                                        <div className="md:col-span-3 border-t pt-2 mt-2">
                                            <DetailRow label="Committee Members" value={[form.watch('technicalCommitteeMember1'), form.watch('technicalCommitteeMember2'), form.watch('technicalCommitteeMember3')].filter(Boolean).join(', ')} />
                                        </div>
                                     </dl>
                                     <div className="mt-4 pt-4 border-t">
                                        <h4 className="font-semibold text-base mb-2">Bidders ({bidderFields.length})</h4>
                                        {bidderFields.map((bidder, index) => (
                                            <div key={bidder.id} className="p-3 border rounded-md mb-2 bg-secondary/30">
                                                <h5 className="font-bold text-sm">{bidder.name}</h5>
                                                <dl className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-1 mt-1 text-xs">
                                                    <DetailRow label="Quoted Amount" value={bidder.quotedAmount?.toLocaleString('en-IN')} />
                                                    <DetailRow label="Agreement Amount" value={bidder.agreementAmount?.toLocaleString('en-IN')} />
                                                    <DetailRow label="Selection Notice Date" value={formatDateSafe(bidder.dateSelectionNotice)} />
                                                </dl>
                                            </div>
                                        ))}
                                     </div>
                                </AccordionContent>
                            </AccordionItem>
                            
                            {/* Work Order Accordion */}
                             <AccordionItem value="work-order-details" className="border rounded-lg">
                               <AccordionTrigger className="p-4 text-lg font-semibold text-primary data-[state=closed]:hover:bg-secondary/20">
                                    <div className="flex justify-between items-center w-full">
                                        <span className="flex items-center gap-3"><ScrollText className="h-5 w-5"/>Work Order Details</span>
                                        <Button type="button" size="sm" variant="outline" className="mr-4" onClick={(e) => { e.stopPropagation(); setActiveModal('workOrder'); }}><Edit className="h-4 w-4 mr-2"/>Edit</Button>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="p-6 pt-0">
                                     <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 pt-4 border-t">
                                         <DetailRow label="Agreement Date" value={formatDateSafe(form.watch('agreementDate'))} />
                                         <DetailRow label="Date - Work / Supply Order" value={formatDateSafe(form.watch('dateWorkOrder'))} />
                                         <DetailRow label="Assistant Engineer" value={form.watch('nameOfAssistantEngineer')} />
                                         <DetailRow label="Supervisor" value={form.watch('nameOfSupervisor')} />
                                         <DetailRow label="Supervisor Phone" value={form.watch('supervisorPhoneNo')} />
                                     </dl>
                                </AccordionContent>
                            </AccordionItem>

                        </Accordion>
                    </CardContent>
                    <CardFooter className="flex justify-end">
                        <Button type="button" onClick={handleFinalSave} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save All Changes
                        </Button>
                    </CardFooter>
                </Card>
                
                 <Card>
                    <CardHeader>
                        <CardTitle>PDF Reports Generation</CardTitle>
                        <CardDescription>Generate and download PDF documents for this tender.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {pdfReports.map((reportName) => (
                            <Button key={reportName} variant="outline" className="justify-start">
                                <Download className="mr-2 h-4 w-4" />
                                {reportName}
                            </Button>
                        ))}
                    </CardContent>
                     <CardFooter>
                        <p className="text-xs text-muted-foreground">PDF generation functionality is currently a placeholder.</p>
                    </CardFooter>
                </Card>


                {/* Dialogs for Editing */}
                 <Dialog open={activeModal === 'corrigendum'} onOpenChange={(isOpen) => !isOpen && setActiveModal(null)}>
                    <DialogContent className="max-w-xl flex flex-col p-0">
                        <CorrigendumDetailsForm 
                            form={form}
                            onSubmit={handleSave}
                            onCancel={() => setActiveModal(null)}
                            isSubmitting={isSubmitting}
                        />
                    </DialogContent>
                </Dialog>
                 <Dialog open={activeModal === 'opening'} onOpenChange={(isOpen) => !isOpen && setActiveModal(null)}>
                    <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0">
                        <TenderOpeningDetailsForm
                            form={form}
                            onSubmit={handleSave}
                            onCancel={() => setActiveModal(null)}
                            isSubmitting={isSubmitting}
                        />
                    </DialogContent>
                </Dialog>
                <Dialog open={activeModal === 'workOrder'} onOpenChange={(isOpen) => !isOpen && setActiveModal(null)}>
                    <DialogContent className="max-w-xl flex flex-col p-0">
                        <WorkOrderDetailsForm
                            form={form}
                            onSubmit={handleSave}
                            onCancel={() => setActiveModal(null)}
                            isSubmitting={isSubmitting}
                        />
                    </DialogContent>
                </Dialog>
            </div>
        </FormProvider>
    );
}

    