// src/components/e-tender/TenderDetails.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useTenderData } from './TenderDataContext';
import { useE_tenders } from '@/hooks/useE_tenders';
import { useRouter } from 'next/navigation';
import { useForm, FormProvider, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { E_tenderSchema, type E_tenderFormData, type Bidder, eTenderStatusOptions } from '@/lib/schemas/eTenderSchema';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Loader2, Save, Edit, PlusCircle, Trash2, FileText, Building, GitBranch, FolderOpen, ScrollText, Download, Users } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { formatDateForInput, formatDateSafe } from './utils';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

import BasicDetailsForm from './BasicDetailsForm';
import CorrigendumDetailsForm from './CorrigendumDetailsForm';
import TenderOpeningDetailsForm from './TenderOpeningDetailsForm';
import ManageBiddersForm from './ManageBiddersForm';
import BidderForm from './BidderForm';
import WorkOrderDetailsForm from './WorkOrderDetailsForm';


type ModalType = 'basic' | 'corrigendum' | 'opening' | 'bidders' | 'addBidder' | 'editBidder' | 'workOrder' | null;

const DetailRow = ({ label, value }: { label: string; value: any }) => {
    if (value === null || value === undefined || value === '' || (typeof value === 'number' && isNaN(value))) {
        return null;
    }

    let displayValue = String(value);

    if (label.toLowerCase().includes('date')) {
        const formatted = formatDateSafe(value, label.toLowerCase().includes('time'));
        if (formatted === 'N/A') return null; 
        displayValue = formatted;
    } else if (typeof value === 'number') {
        displayValue = value.toLocaleString('en-IN');
    }

    return (
        <div>
            <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
            <dd className={cn("text-sm font-semibold", label === "വർക്കിന്റെ പേര്" && "text-xs")}>{displayValue}</dd>
        </div>
    );
};


export default function TenderDetails() {
    const router = useRouter();
    const { tender, updateTender } = useTenderData();
    const { addTender, updateTender: saveTenderToDb } = useE_tenders();
    const [activeModal, setActiveModal] = useState<ModalType>(null);
    const [modalData, setModalData] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeAccordion, setActiveAccordion] = useState<string>("basic-details");


    const form = useForm<E_tenderFormData>({
        resolver: zodResolver(E_tenderSchema),
        defaultValues: {
            ...tender,
            tenderDate: formatDateForInput(tender.tenderDate),
            dateTimeOfReceipt: formatDateForInput(tender.dateTimeOfReceipt, true),
            dateTimeOfOpening: formatDateForInput(tender.dateTimeOfOpening, true),
            corrigendumDate: formatDateForInput(tender.corrigendumDate),
            dateOfOpeningBid: formatDateForInput(tender.dateOfOpeningBid),
            dateOfTechnicalAndFinancialBidOpening: formatDateForInput(tender.dateOfTechnicalAndFinancialBidOpening),
            agreementDate: formatDateForInput(tender.agreementDate),
            dateWorkOrder: formatDateForInput(tender.dateWorkOrder),
            bidders: tender.bidders?.map(b => ({...b, dateSelectionNotice: formatDateForInput(b.dateSelectionNotice)})) || []
        },
    });

    const { fields: bidderFields, append: appendBidder, update: updateBidder, remove: removeBidder } = useFieldArray({
        control: form.control,
        name: "bidders"
    });
    
    const handleFinalSave = async () => {
      const isValid = await form.trigger();
      if (!isValid) {
          toast({ title: "Validation Error", description: "Please check all fields for errors.", variant: "destructive" });
          const errorField = Object.keys(form.formState.errors)[0] as keyof E_tenderFormData;
          if (errorField) {
              const sectionMap: Record<string, string> = {
                  eTenderNo: 'basic-details', tenderDate: 'basic-details', fileNo: 'basic-details', nameOfWork: 'basic-details', location: 'basic-details', estimateAmount: 'basic-details', tenderFormFee: 'basic-details', emd: 'basic-details', periodOfCompletion: 'basic-details', dateTimeOfReceipt: 'basic-details', dateTimeOfOpening: 'basic-details', nameOfWorkMalayalam: 'basic-details',
                  corrigendumDate: 'corrigendum-details', noOfBids: 'corrigendum-details',
                  noOfTenderers: 'opening-details', noOfSuccessfulTenderers: 'opening-details', quotedPercentage: 'opening-details', aboveBelow: 'opening-details', dateOfOpeningBid: 'opening-details', dateOfTechnicalAndFinancialBidOpening: 'opening-details', technicalCommitteeMember1: 'opening-details', technicalCommitteeMember2: 'opening-details', technicalCommitteeMember3: 'opening-details',
                  bidders: 'bidders-details',
                  agreementDate: 'work-order-details', nameOfAssistantEngineer: 'work-order-details', nameOfSupervisor: 'work-order-details', supervisorPhoneNo: 'work-order-details', dateWorkOrder: 'work-order-details',
              };
              
              const section = sectionMap[errorField] || (String(errorField).startsWith('bidders') ? 'bidders-details' : null);
              if (section) {
                  setActiveAccordion(section);
              }
          }
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
        const processedTender = {
            ...tender,
            tenderDate: formatDateForInput(tender.tenderDate),
            dateTimeOfReceipt: formatDateForInput(tender.dateTimeOfReceipt, true),
            dateTimeOfOpening: formatDateForInput(tender.dateTimeOfOpening, true),
            corrigendumDate: formatDateForInput(tender.corrigendumDate),
            dateOfOpeningBid: formatDateForInput(tender.dateOfOpeningBid),
            dateOfTechnicalAndFinancialBidOpening: formatDateForInput(tender.dateOfTechnicalAndFinancialBidOpening),
            agreementDate: formatDateForInput(tender.agreementDate),
            dateWorkOrder: formatDateForInput(tender.dateWorkOrder),
            bidders: tender.bidders?.map(b => ({...b, dateSelectionNotice: formatDateForInput(b.dateSelectionNotice)})) || []
        };
        form.reset(processedTender);
    }, [tender, form]);

    const handleSave = (data: Partial<E_tenderFormData>) => {
        const currentData = form.getValues();
        const updatedData = { ...currentData, ...data };
        updateTender(updatedData);
        form.reset(updatedData);
        toast({ title: "Details Updated Locally", description: "Click 'Save All Changes' to persist." });
        setActiveModal(null);
    };

    const handleBidderSave = (bidderData: Bidder) => {
        if (activeModal === 'addBidder') {
            appendBidder(bidderData);
            toast({ title: "Bidder Added Locally" });
        } else if (activeModal === 'editBidder' && modalData?.index !== undefined) {
            updateBidder(modalData.index, bidderData);
            toast({ title: "Bidder Updated Locally" });
        }
        form.reset(form.getValues());
        setActiveModal(null);
        setModalData(null);
    };
    
    const pdfReports = [
        "Notice Inviting Tender (NIT)", "Tender Form", "Corrigendum", "Bid Opening Summary",
        "Technical Summary", "Financial Summary", "Selection Notice", "Work / Supply Order",
        "Work Agreement", "Tender Status Summary"
    ];
    
    const watchedFields = form.watch([
        'eTenderNo', 'tenderDate', 'fileNo', 'nameOfWork', 'nameOfWorkMalayalam',
        'location', 'estimateAmount', 'tenderFormFee', 'emd', 'periodOfCompletion',
        'dateTimeOfReceipt', 'dateTimeOfOpening', 'tenderType'
    ]);

    const hasAnyBasicData = useMemo(() => {
        return watchedFields.some(v => v);
    }, [watchedFields]);

    const hasAnyCorrigendumData = useMemo(() => {
        const values = form.watch(['corrigendumDate', 'noOfBids']);
        return values.some(v => v);
    }, [form]);
    
    const hasAnyOpeningData = useMemo(() => {
        const values = form.watch(['noOfTenderers', 'noOfSuccessfulTenderers', 'quotedPercentage', 'aboveBelow', 'dateOfOpeningBid', 'dateOfTechnicalAndFinancialBidOpening', 'technicalCommitteeMember1', 'technicalCommitteeMember2', 'technicalCommitteeMember3']);
        return values.some(v => v);
    }, [form]);
    
    const hasAnyBidderData = useMemo(() => {
        return bidderFields.length > 0;
    }, [bidderFields]);

    const hasAnyWorkOrderData = useMemo(() => {
        const values = form.watch(['agreementDate', 'dateWorkOrder', 'nameOfAssistantEngineer', 'nameOfSupervisor', 'supervisorPhoneNo']);
        return values.some(v => v);
    }, [form]);

    const tenderType = form.watch('tenderType');
    const workOrderTitle = tenderType === 'Purchase' ? 'Supply Order Details' : 'Work Order Details';

    return (
        <FormProvider {...form}>
            <div className="space-y-6">
                <Card>
                    <CardContent className="pt-6">
                        <div className="space-y-4">
                            <Card className="border rounded-lg">
                                <CardHeader className="flex flex-row justify-between items-center p-4">
                                    <div className="flex items-center gap-3">
                                        <Building className="h-5 w-5 text-primary"/>
                                        <CardTitle className="text-lg font-semibold text-primary">Basic Details</CardTitle>
                                    </div>
                                    <Button type="button" size="sm" variant="outline" onClick={() => setActiveModal('basic')}><Edit className="h-4 w-4 mr-2"/>Edit</Button>
                                </CardHeader>
                                <CardContent className="p-6 pt-0">
                                    {hasAnyBasicData ? (
                                        <div className="space-y-4 pt-4 border-t">
                                            <dl className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-4">
                                                <DetailRow label="eTender No." value={form.watch('eTenderNo')} />
                                                <DetailRow label="Type of Tender" value={form.watch('tenderType')} />
                                                <DetailRow label="File No." value={form.watch('fileNo')} />
                                                <DetailRow label="Tender Date" value={form.watch('tenderDate')} />
                                                
                                                <div className="md:col-span-3"><DetailRow label="Name of Work" value={form.watch('nameOfWork')} /></div>
                                                <div className="md:col-span-3"><DetailRow label="വർക്കിന്റെ പേര്" value={form.watch('nameOfWorkMalayalam')} /></div>
                                                
                                                <DetailRow label="Location" value={form.watch('location')} />
                                                <DetailRow label="Tender Amount (Rs.)" value={form.watch('estimateAmount')} />
                                                <DetailRow label="Period of Completion (Days)" value={form.watch('periodOfCompletion')} />

                                                <div className="md:col-span-3 border-t pt-4 mt-2 grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-4">
                                                    <DetailRow label="Tender Form Fee (Rs.)" value={form.watch('tenderFormFee')} />
                                                    <DetailRow label="EMD (Rs.)" value={form.watch('emd')} />
                                                </div>

                                                <div className="md:col-span-3 border-t pt-4 mt-2 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                                                    <DetailRow label="Last Date & Time of Receipt" value={form.watch('dateTimeOfReceipt')} />
                                                    <DetailRow label="Date & Time of Opening" value={form.watch('dateTimeOfOpening')} />
                                                </div>
                                            </dl>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground text-center py-4">No basic details have been added.</p>
                                    )}
                                </CardContent>
                            </Card>

                            <Accordion type="single" collapsible value={activeAccordion} onValueChange={setActiveAccordion} className="w-full space-y-4">
                                <AccordionItem value="corrigendum-details" className="border rounded-lg">
                                   <AccordionTrigger className="p-4 text-lg font-semibold text-primary data-[state=closed]:hover:bg-secondary/20">
                                        <div className="flex justify-between items-center w-full">
                                            <span className="flex items-center gap-3"><GitBranch className="h-5 w-5"/>Corrigendum Details</span>
                                            <Button type="button" size="sm" variant="outline" className="mr-4" onClick={(e) => { e.stopPropagation(); setActiveModal('corrigendum'); }}><Edit className="h-4 w-4 mr-2"/>Add</Button>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="p-6 pt-0">
                                         {hasAnyCorrigendumData ? (
                                            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 pt-4 border-t">
                                                <DetailRow label="Corrigendum Date" value={formatDateSafe(form.watch('corrigendumDate'))} />
                                                <DetailRow label="No. of Bids Received" value={form.watch('noOfBids')} />
                                            </dl>
                                         ) : (
                                            <p className="text-sm text-muted-foreground text-center py-4">No corrigendum details have been added.</p>
                                         )}
                                    </AccordionContent>
                                </AccordionItem>
                                
                                 <AccordionItem value="opening-details" className="border rounded-lg">
                                   <AccordionTrigger className="p-4 text-lg font-semibold text-primary data-[state=closed]:hover:bg-secondary/20">
                                        <div className="flex justify-between items-center w-full">
                                            <span className="flex items-center gap-3"><FolderOpen className="h-5 w-5"/>Tender Opening Details</span>
                                            <Button type="button" size="sm" variant="outline" className="mr-4" onClick={(e) => { e.stopPropagation(); setActiveModal('opening'); }}><Edit className="h-4 w-4 mr-2"/>Add</Button>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="p-6 pt-0">
                                        {hasAnyOpeningData ? (
                                            <dl className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-3 pt-4 border-t">
                                                <DetailRow label="No. of Tenderers" value={form.watch('noOfTenderers')} />
                                                <DetailRow label="No. of Successful Tenderers" value={form.watch('noOfSuccessfulTenderers')} />
                                                <DetailRow label="Quoted Percentage" value={form.watch('quotedPercentage') ? `${form.watch('quotedPercentage')}% ${form.watch('aboveBelow') || ''}` : ''} />
                                                <DetailRow label="Date of Opening Bid" value={formatDateSafe(form.watch('dateOfOpeningBid'))} />
                                                <DetailRow label="Date of Tech/Fin Bid Opening" value={formatDateSafe(form.watch('dateOfTechnicalAndFinancialBidOpening'))} />
                                                <div className="md:col-span-3 border-t pt-2 mt-2">
                                                    <DetailRow label="Committee Members" value={[form.watch('technicalCommitteeMember1'), form.watch('technicalCommitteeMember2'), form.watch('technicalCommitteeMember3')].filter(Boolean).join(', ')} />
                                                </div>
                                            </dl>
                                        ) : (
                                             <p className="text-sm text-muted-foreground text-center py-4">No tender opening details have been added.</p>
                                        )}
                                    </AccordionContent>
                                </AccordionItem>
                                
                                 <AccordionItem value="bidders-details" className="border rounded-lg">
                                   <AccordionTrigger className="p-4 text-lg font-semibold text-primary data-[state=closed]:hover:bg-secondary/20">
                                        <div className="flex justify-between items-center w-full">
                                            <span className="flex items-center gap-3"><Users className="h-5 w-5"/>Bidders ({bidderFields.length})</span>
                                            <Button type="button" size="sm" variant="outline" className="mr-4" onClick={(e) => { e.stopPropagation(); setActiveModal('addBidder'); }}><PlusCircle className="h-4 w-4 mr-2"/>Add Bidder</Button>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="p-6 pt-0">
                                         {hasAnyBidderData ? (
                                            <div className="mt-4 pt-4 border-t space-y-2">
                                                {bidderFields.map((bidder, index) => (
                                                    <div key={bidder.id} className="p-3 border rounded-md bg-secondary/30 relative group">
                                                        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setModalData({ ...bidder, index }); setActiveModal('editBidder'); }}><Edit className="h-4 w-4"/></Button>
                                                            <Button type="button" variant="ghost" size="icon" className="text-destructive h-7 w-7" onClick={() => removeBidder(index)}><Trash2 className="h-4 w-4"/></Button>
                                                        </div>
                                                        <div className="flex justify-between items-start">
                                                            <h5 className="font-bold text-sm">{bidder.name}</h5>
                                                        </div>
                                                        <dl className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-1 mt-1 text-xs">
                                                            <DetailRow label="Quoted Amount" value={bidder.quotedAmount} />
                                                            <DetailRow label="Agreement Amount" value={bidder.agreementAmount} />
                                                            <DetailRow label="Selection Notice Date" value={formatDateSafe(bidder.dateSelectionNotice)} />
                                                        </dl>
                                                    </div>
                                                ))}
                                            </div>
                                         ) : (
                                            <p className="text-sm text-muted-foreground text-center py-4">No bidders have been added.</p>
                                         )}
                                    </AccordionContent>
                                </AccordionItem>
                                
                                 <AccordionItem value="work-order-details" className="border rounded-lg">
                                   <AccordionTrigger className="p-4 text-lg font-semibold text-primary data-[state=closed]:hover:bg-secondary/20">
                                        <div className="flex justify-between items-center w-full">
                                            <span className="flex items-center gap-3"><ScrollText className="h-5 w-5"/>{workOrderTitle}</span>
                                            <Button type="button" size="sm" variant="outline" className="mr-4" onClick={(e) => { e.stopPropagation(); setActiveModal('workOrder'); }}><Edit className="h-4 w-4 mr-2"/>Add</Button>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="p-6 pt-0">
                                        {hasAnyWorkOrderData ? (
                                             <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 pt-4 border-t">
                                                 <DetailRow label="Agreement Date" value={formatDateSafe(form.watch('agreementDate'))} />
                                                 <DetailRow label="Date - Work / Supply Order" value={formatDateSafe(form.watch('dateWorkOrder'))} />
                                                 <DetailRow label="Assistant Engineer" value={form.watch('nameOfAssistantEngineer')} />
                                                 <DetailRow label="Supervisor" value={form.watch('nameOfSupervisor')} />
                                                 <DetailRow label="Supervisor Phone" value={form.watch('supervisorPhoneNo')} />
                                             </dl>
                                        ) : (
                                             <p className="text-sm text-muted-foreground text-center py-4">No work order details have been added.</p>
                                        )}
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </div>

                        <Card className="mt-4">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between gap-4">
                                    <h3 className="text-lg font-semibold flex items-center gap-3 text-primary"><FileText className="h-5 w-5"/>Present Status</h3>
                                    <div className="w-full max-w-sm">
                                        <FormField
                                            name="presentStatus"
                                            control={form.control}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                                        <SelectContent>{eTenderStatusOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
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


                <Dialog open={activeModal === 'basic'} onOpenChange={(isOpen) => !isOpen && setActiveModal(null)}>
                    <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
                        <BasicDetailsForm
                            onSubmit={handleSave}
                            onCancel={() => setActiveModal(null)}
                            isSubmitting={isSubmitting}
                        />
                    </DialogContent>
                </Dialog>
                 <Dialog open={activeModal === 'corrigendum'} onOpenChange={(isOpen) => !isOpen && setActiveModal(null)}>
                    <DialogContent className="max-w-xl flex flex-col p-0">
                        <CorrigendumDetailsForm 
                            initialData={tender}
                            onSubmit={handleSave}
                            onCancel={() => setActiveModal(null)}
                            isSubmitting={isSubmitting}
                        />
                    </DialogContent>
                </Dialog>
                 <Dialog open={activeModal === 'opening'} onOpenChange={(isOpen) => !isOpen && setActiveModal(null)}>
                    <DialogContent className="max-w-2xl flex flex-col p-0">
                        <TenderOpeningDetailsForm
                            initialData={tender}
                            onSubmit={handleSave}
                            onCancel={() => setActiveModal(null)}
                            isSubmitting={isSubmitting}
                        />
                    </DialogContent>
                </Dialog>
                <Dialog open={activeModal === 'bidders'} onOpenChange={(isOpen) => !isOpen && setActiveModal(null)}>
                    <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0">
                        <ManageBiddersForm
                            form={form}
                            onSubmit={handleSave}
                            onCancel={() => setActiveModal(null)}
                            isSubmitting={isSubmitting}
                        />
                    </DialogContent>
                </Dialog>
                <Dialog open={activeModal === 'addBidder' || activeModal === 'editBidder'} onOpenChange={() => { setActiveModal(null); setModalData(null); }}>
                    <DialogContent className="max-w-3xl h-[90vh] flex flex-col p-0">
                        <BidderForm 
                            onSubmit={handleBidderSave}
                            onCancel={() => { setActiveModal(null); setModalData(null); }}
                            isSubmitting={isSubmitting}
                            initialData={modalData}
                        />
                    </DialogContent>
                </Dialog>
                <Dialog open={activeModal === 'workOrder'} onOpenChange={(isOpen) => !isOpen && setActiveModal(null)}>
                    <DialogContent className="max-w-xl flex flex-col p-0">
                        <WorkOrderDetailsForm
                            initialData={tender}
                            onSubmit={handleSave}
                            onCancel={() => setActiveModal(null)}
                            isSubmitting={isSubmitting}
                            tenderType={tenderType}
                        />
                    </DialogContent>
                </Dialog>
            </div>
        </FormProvider>
    );
}
