// src/components/e-tender/TenderDetails.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useTenderData } from './TenderDataContext';
import { useE_tenders } from '@/hooks/useE_tenders';
import { useRouter } from 'next/navigation';
import { useForm, FormProvider, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { E_tenderSchema, type E_tenderFormData, type Bidder, type Corrigendum, eTenderStatusOptions } from '@/lib/schemas/eTenderSchema';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, Save, Edit, PlusCircle, Trash2, FileText, Building, GitBranch, FolderOpen, ScrollText, Download, Users, Bell } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { toDateOrNull, formatDateSafe, formatDateForInput } from './utils';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';
import { isValid, parseISO } from 'date-fns';

import BasicDetailsForm from './BasicDetailsForm';
import TenderOpeningDetailsForm from './TenderOpeningDetailsForm';
import BidderForm from './BidderForm';
import WorkOrderDetailsForm from './WorkOrderDetailsForm';
import SelectionNoticeForm from './SelectionNoticeForm';
import CorrigendumForm from './CorrigendumForm';
import { useDataStore } from '@/hooks/use-data-store';

type ModalType = 'basic' | 'opening' | 'bidders' | 'addBidder' | 'editBidder' | 'workOrder' | 'selectionNotice' | 'addCorrigendum' | 'editCorrigendum' | null;

const DetailRow = ({ label, value }: { label: string; value: any }) => {
    if (value === null || value === undefined || value === '' || (typeof value === 'number' && isNaN(value))) {
        return null;
    }

    let displayValue = String(value);

    if ((label.toLowerCase().includes('date') || label.toLowerCase().includes('time')) && !label.toLowerCase().includes('period')) {
        const formatted = formatDateSafe(value, label.toLowerCase().includes('time'));
        if (formatted === 'N/A' && value) {
           displayValue = String(value);
        } else if (formatted !== 'N/A') {
            displayValue = formatted;
        } else {
            return null;
        }
    } else if (typeof value === 'number') {
        displayValue = value.toLocaleString('en-IN');
    }

    return (
        <div>
            <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
            <dd className={cn("text-sm font-semibold", label.toLowerCase().includes('malayalam') && "text-xs")}>{displayValue}</dd>
        </div>
    );
};


export default function TenderDetails() {
    const router = useRouter();
    const { tender, updateTender } = useTenderData();
    const { addTender, updateTender: saveTenderToDb } = useE_tenders();
    const { allStaffMembers } = useDataStore();
    const [activeModal, setActiveModal] = useState<ModalType>(null);
    const [modalData, setModalData] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeAccordion, setActiveAccordion] = useState<string>("basic-details");
    const [isClearOpeningDetailsConfirmOpen, setIsClearOpeningDetailsConfirmOpen] = useState(false);


    const form = useForm<E_tenderFormData>({
        resolver: zodResolver(E_tenderSchema),
        defaultValues: tender,
    });

    const { control, getValues, setValue, handleSubmit: handleFormSubmit } = form;
    const { fields: bidderFields, append: appendBidder, update: updateBidder, remove: removeBidder } = useFieldArray({ control, name: "bidders" });
    const { fields: corrigendumFields, append: appendCorrigendum, update: updateCorrigendum, remove: removeCorrigendum } = useFieldArray({ control, name: "corrigendums" });

    const handleFinalSave = async () => {
      setIsSubmitting(true);
      try {
          const currentTenderData = getValues();
          const dataForSave = {
              ...currentTenderData,
              tenderDate: toDateOrNull(currentTenderData.tenderDate),
              dateTimeOfReceipt: toDateOrNull(currentTenderData.dateTimeOfReceipt),
              dateTimeOfOpening: toDateOrNull(currentTenderData.dateTimeOfOpening),
              dateOfOpeningBid: toDateOrNull(currentTenderData.dateOfOpeningBid),
              dateOfTechnicalAndFinancialBidOpening: toDateOrNull(currentTenderData.dateOfTechnicalAndFinancialBidOpening),
              selectionNoticeDate: toDateOrNull(currentTenderData.selectionNoticeDate),
              agreementDate: toDateOrNull(currentTenderData.agreementDate),
              dateWorkOrder: toDateOrNull(currentTenderData.dateWorkOrder),
              corrigendums: (currentTenderData.corrigendums || []).map(c => ({
                  ...c,
                  corrigendumDate: toDateOrNull(c.corrigendumDate),
                  lastDateOfReceipt: toDateOrNull(c.lastDateOfReceipt),
                  dateOfOpeningTender: toDateOrNull(c.dateOfOpeningTender),
              }))
          };

          if (tender.id === 'new') {
              const newTenderId = await addTender(dataForSave);
              toast({ title: "Tender Created", description: "The new e-Tender has been created and saved." });
              router.replace(`/dashboard/e-tender/${newTenderId}`);
          } else {
              await saveTenderToDb(tender.id, dataForSave);
              toast({ title: "All Changes Saved", description: "All tender details have been successfully updated." });
              router.push('/dashboard/e-tender');
          }
      } catch (error: any) {
          console.error("Save Error:", error);
          toast({ title: "Error Saving Changes", description: error.message || "An unknown error occurred.", variant: "destructive" });
      } finally {
          setIsSubmitting(false);
      }
    };

    useEffect(() => {
        form.reset(tender);
    }, [tender, form]);

    const handleSave = (data: Partial<E_tenderFormData>) => {
        const currentData = form.getValues();
        const updatedData = { ...currentData, ...data };
        updateTender(updatedData);
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
        setActiveModal(null);
        setModalData(null);
    };
    
    const handleCorrigendumSave = (corrigendumData: Corrigendum) => {
        if (activeModal === 'addCorrigendum') {
            appendCorrigendum(corrigendumData);
            toast({ title: "Corrigendum Added Locally" });
        } else if (activeModal === 'editCorrigendum' && modalData?.index !== undefined) {
            updateCorrigendum(modalData.index, corrigendumData);
            toast({ title: "Corrigendum Updated Locally" });
        }
        setActiveModal(null);
        setModalData(null);
    };

    const handleEditCorrigendumClick = (corrigendum: Corrigendum, index: number) => {
        setModalData({
            ...corrigendum,
            index,
            corrigendumDate: corrigendum.corrigendumDate ? formatDateForInput(corrigendum.corrigendumDate) : null,
            lastDateOfReceipt: corrigendum.lastDateOfReceipt ? formatDateForInput(corrigendum.lastDateOfReceipt, true) : null,
            dateOfOpeningTender: corrigendum.dateOfOpeningTender ? formatDateForInput(corrigendum.dateOfOpeningTender, true) : null,
        });
        setActiveModal('editCorrigendum');
    };
    
    const handleClearOpeningDetails = () => {
        const clearedData = {
            dateOfOpeningBid: null,
            dateOfTechnicalAndFinancialBidOpening: null,
            technicalCommitteeMember1: undefined,
            technicalCommitteeMember2: undefined,
            technicalCommitteeMember3: undefined,
        };
        updateTender(clearedData);
        toast({ title: "Opening Details Cleared", description: "The details have been cleared locally. Save all changes to make it permanent." });
        setIsClearOpeningDetailsConfirmOpen(false);
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

    const hasAnyCorrigendumData = corrigendumFields.length > 0;
    
    const committeeMemberNames = [
        form.watch('technicalCommitteeMember1'),
        form.watch('technicalCommitteeMember2'),
        form.watch('technicalCommitteeMember3')
    ].filter(Boolean);

    const committeeMemberDetails = useMemo(() => {
        return committeeMemberNames.map(name => {
            const staff = allStaffMembers.find(s => s.name === name);
            return {
                name,
                designation: staff?.designation || 'N/A'
            };
        });
    }, [committeeMemberNames, allStaffMembers]);

    const hasAnyOpeningData = useMemo(() => {
        return form.watch('dateOfOpeningBid') || form.watch('dateOfTechnicalAndFinancialBidOpening') || committeeMemberDetails.length > 0;
    }, [form, committeeMemberDetails]);
    
    const hasAnyBidderData = useMemo(() => {
        return bidderFields.length > 0;
    }, [bidderFields]);

    const hasAnySelectionNoticeData = useMemo(() => {
        const values = form.watch(['selectionNoticeDate', 'performanceGuaranteeAmount', 'additionalPerformanceGuaranteeAmount', 'stampPaperAmount']);
        return values.some(v => v);
    }, [form]);

    const hasAnyWorkOrderData = useMemo(() => {
        const values = form.watch(['agreementDate', 'dateWorkOrder', 'nameOfAssistantEngineer', 'nameOfSupervisor', 'supervisorPhoneNo']);
        return values.some(v => v);
    }, [form]);

    const tenderType = form.watch('tenderType');
    const workOrderTitle = tenderType === 'Purchase' ? 'Supply Order Details' : 'Work Order Details';
    
    const tenderFormFeeValue = form.watch('tenderFormFee');
    const displayTenderFormFee = tenderFormFeeValue !== undefined && tenderFormFeeValue > 0 
        ? `${tenderFormFeeValue.toLocaleString('en-IN')} + GST`
        : tenderFormFeeValue;

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
                                        <div className="space-y-4 pt-4">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-4">
                                                <DetailRow label="eTender No." value={form.watch('eTenderNo')} />
                                                <DetailRow label="Tender Date" value={form.watch('tenderDate')} />
                                                <DetailRow label="File No." value={form.watch('fileNo')} />
                                            </div>
                                            <div className="md:col-span-3 pt-2"><DetailRow label="Name of Work" value={form.watch('nameOfWork')} /></div>
                                            <div className="md:col-span-3 pt-2"><DetailRow label="Name of Work (in Malayalam)" value={form.watch('nameOfWorkMalayalam')} /></div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-4 pt-2">
                                                <DetailRow label="Location" value={form.watch('location')} />
                                                <DetailRow label="Period of Completion (Days)" value={form.watch('periodOfCompletion')} />
                                                <DetailRow label="Type of Tender" value={form.watch('tenderType')} />
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-4 pt-2">
                                                <DetailRow label="Tender Amount (Rs.)" value={form.watch('estimateAmount')} />
                                                <DetailRow label="Tender Form Fee (Rs.)" value={displayTenderFormFee} />
                                                <DetailRow label="EMD (Rs.)" value={form.watch('emd')} />
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 pt-2">
                                                <DetailRow label="Last Date & Time of Receipt" value={form.watch('dateTimeOfReceipt')} />
                                                <DetailRow label="Date & Time of Opening" value={form.watch('dateTimeOfOpening')} />
                                            </div>
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
                                            <span className="flex items-center gap-3"><GitBranch className="h-5 w-5"/>Corrigendum Details ({corrigendumFields.length})</span>
                                            <Button type="button" size="sm" variant="outline" className="mr-4" onClick={(e) => { e.stopPropagation(); setActiveModal('addCorrigendum'); }}><PlusCircle className="h-4 w-4 mr-2"/>Add Corrigendum</Button>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="p-6 pt-0">
                                       {hasAnyCorrigendumData ? (
                                            <div className="mt-4 pt-4 border-t space-y-2">
                                                {corrigendumFields.map((corrigendum, index) => (
                                                    <div key={corrigendum.id} className="p-4 border rounded-md bg-secondary/30 relative group">
                                                         <h4 className="text-sm font-semibold text-primary mb-2">Corrigendum No. {index + 1}</h4>
                                                         <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditCorrigendumClick(corrigendum, index)}><Edit className="h-4 w-4"/></Button>
                                                            <Button type="button" variant="ghost" size="icon" className="text-destructive h-7 w-7" onClick={() => removeCorrigendum(index)}><Trash2 className="h-4 w-4"/></Button>
                                                         </div>
                                                         <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3 mt-1">
                                                            <DetailRow label="Type" value={corrigendum.corrigendumType} />
                                                            <DetailRow label="Date" value={corrigendum.corrigendumDate} />
                                                            <DetailRow label="Reason" value={corrigendum.reason} />
                                                            <DetailRow label="New Last Date & Time" value={corrigendum.lastDateOfReceipt} />
                                                            <DetailRow label="New Opening Date & Time" value={corrigendum.dateOfOpeningTender} />
                                                         </dl>
                                                    </div>
                                                ))}
                                            </div>
                                         ) : (
                                            <p className="text-sm text-muted-foreground text-center py-4">No corrigendums have been added.</p>
                                         )}
                                    </AccordionContent>
                                </AccordionItem>
                                
                                <AccordionItem value="opening-details" className="border rounded-lg">
                                    <AccordionTrigger className="p-4 text-lg font-semibold text-primary data-[state=closed]:hover:bg-secondary/20">
                                        <div className="flex justify-between items-center w-full">
                                            <span className="flex items-center gap-3"><FolderOpen className="h-5 w-5"/>Tender Opening Details</span>
                                            <div className="flex items-center gap-2 mr-4">
                                                <Button type="button" size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setActiveModal('opening'); }}><Edit className="h-4 w-4 mr-2"/>Edit</Button>
                                                <Button type="button" size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); setIsClearOpeningDetailsConfirmOpen(true); }}><Trash2 className="h-4 w-4 mr-2"/>Delete</Button>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="p-6 pt-0">
                                        {hasAnyOpeningData ? (
                                            <div className="space-y-4 pt-4 border-t">
                                                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                                                    <DetailRow label="Date of Opening Bid" value={form.watch('dateOfOpeningBid')} />
                                                    <DetailRow label="Date of Tech/Fin Bid Opening" value={form.watch('dateOfTechnicalAndFinancialBidOpening')} />
                                                </dl>
                                                <div className="space-y-2">
                                                    <h4 className="font-semibold">Committee Members:</h4>
                                                    {committeeMemberDetails.length > 0 ? (
                                                        <ul className="list-inside">
                                                            {committeeMemberDetails.map((member, i) => 
                                                                <li key={i} className="text-sm">
                                                                    <span className="font-semibold">{i+1}. {member.name}</span>
                                                                    <span className="text-muted-foreground"> ({member.designation})</span>
                                                                </li>
                                                            )}
                                                        </ul>
                                                    ) : (
                                                        <p className="text-sm text-muted-foreground">No committee members assigned.</p>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                             <p className="text-sm text-muted-foreground text-center py-4">No tender opening details have been added.</p>
                                        )}
                                    </AccordionContent>
                                </AccordionItem>

                                
                                <AccordionItem value="bidders-details" className="border rounded-lg">
                                   <AccordionTrigger className="p-4 text-lg font-semibold text-primary data-[state=closed]:hover:bg-secondary/20">
                                        <div className="flex justify-between items-center w-full">
                                            <span className="flex items-center gap-3"><Users className="h-5 w-5"/>Bidders ({bidderFields.length})</span>
                                            <Button type="button" size="sm" variant="outline" className="mr-4" onClick={(e) => { e.stopPropagation(); setModalData(null); setActiveModal('addBidder'); }}><PlusCircle className="h-4 w-4 mr-2"/>Add Bidder</Button>
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
                                                            {bidder.status && <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", bidder.status === 'Accepted' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800')}>{bidder.status}</span>}
                                                        </div>
                                                        <dl className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-1 mt-1 text-xs">
                                                            <DetailRow label="Quoted Amount" value={bidder.quotedAmount} />
                                                            <DetailRow label="Quoted Percentage" value={bidder.quotedPercentage ? `${bidder.quotedPercentage}% ${bidder.aboveBelow || ''}`: ''} />
                                                        </dl>
                                                    </div>
                                                ))}
                                            </div>
                                         ) : (
                                            <p className="text-sm text-muted-foreground text-center py-4">No bidders have been added.</p>
                                         )}
                                    </AccordionContent>
                                </AccordionItem>

                                <AccordionItem value="selection-notice-details" className="border rounded-lg">
                                   <AccordionTrigger className="p-4 text-lg font-semibold text-primary data-[state=closed]:hover:bg-secondary/20">
                                        <div className="flex justify-between items-center w-full">
                                            <span className="flex items-center gap-3"><Bell className="h-5 w-5"/>Selection Notice Details</span>
                                            <Button type="button" size="sm" variant="outline" className="mr-4" onClick={(e) => { e.stopPropagation(); setActiveModal('selectionNotice'); }}><Edit className="h-4 w-4 mr-2"/>Add</Button>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="p-6 pt-0">
                                        {hasAnySelectionNoticeData ? (
                                             <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 pt-4 border-t">
                                                 <DetailRow label="Selection Notice Date" value={form.watch('selectionNoticeDate')} />
                                                 <DetailRow label="Performance Guarantee Amount" value={form.watch('performanceGuaranteeAmount')} />
                                                 <DetailRow label="Additional Performance Guarantee Amount" value={form.watch('additionalPerformanceGuaranteeAmount')} />
                                                 <DetailRow label="Stamp Paper required" value={form.watch('stampPaperAmount')} />
                                             </dl>
                                        ) : (
                                             <p className="text-sm text-muted-foreground text-center py-4">No selection notice details have been added.</p>
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
                                                 <DetailRow label="Agreement Date" value={form.watch('agreementDate')} />
                                                 <DetailRow label="Date - Work / Supply Order" value={form.watch('dateWorkOrder')} />
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
                                                    <Select onValueChange={(value) => { field.onChange(value); updateTender({ presentStatus: value as any }); }} value={field.value}>
                                                        <FormControl><SelectTrigger><SelectValue placeholder="Select current status" /></SelectTrigger></FormControl>
                                                        <SelectContent>{form.watch('presentStatus') && <SelectItem value={form.watch('presentStatus')!}>{form.watch('presentStatus')}</SelectItem>}{eTenderStatusOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
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
                        <BasicDetailsForm onSubmit={handleSave} onCancel={() => setActiveModal(null)} isSubmitting={isSubmitting}/>
                    </DialogContent>
                </Dialog>
                <Dialog open={activeModal === 'opening'} onOpenChange={(isOpen) => !isOpen && setActiveModal(null)}>
                    <DialogContent className="max-w-2xl flex flex-col p-0">
                        <TenderOpeningDetailsForm initialData={form.getValues()} onSubmit={handleSave} onCancel={() => setActiveModal(null)} isSubmitting={isSubmitting}/>
                    </DialogContent>
                </Dialog>
                <Dialog open={activeModal === 'addBidder' || activeModal === 'editBidder'} onOpenChange={() => { setActiveModal(null); setModalData(null); }}>
                    <DialogContent className="max-w-3xl flex flex-col p-0">
                        <BidderForm onSubmit={handleBidderSave} onCancel={() => { setActiveModal(null); setModalData(null); }} isSubmitting={isSubmitting} initialData={modalData} />
                    </DialogContent>
                </Dialog>
                <Dialog open={activeModal === 'addCorrigendum' || activeModal === 'editCorrigendum'} onOpenChange={() => { setActiveModal(null); setModalData(null); }}>
                    <DialogContent className="max-w-3xl flex flex-col p-0">
                        <CorrigendumForm onSubmit={handleCorrigendumSave} onCancel={() => { setActiveModal(null); setModalData(null); }} isSubmitting={isSubmitting} initialData={modalData} />
                    </DialogContent>
                </Dialog>
                <Dialog open={activeModal === 'selectionNotice'} onOpenChange={(isOpen) => !isOpen && setActiveModal(null)}>
                    <DialogContent className="max-w-2xl flex flex-col p-0">
                        <SelectionNoticeForm initialData={tender} onSubmit={handleSave} onCancel={() => setActiveModal(null)} isSubmitting={isSubmitting}/>
                    </DialogContent>
                </Dialog>
                <Dialog open={activeModal === 'workOrder'} onOpenChange={(isOpen) => !isOpen && setActiveModal(null)}>
                    <DialogContent className="max-w-xl flex flex-col p-0">
                        <WorkOrderDetailsForm initialData={tender} onSubmit={handleSave} onCancel={() => setActiveModal(null)} isSubmitting={isSubmitting} tenderType={tenderType}/>
                    </DialogContent>
                </Dialog>
                
                <AlertDialog open={isClearOpeningDetailsConfirmOpen} onOpenChange={setIsClearOpeningDetailsConfirmOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>This will clear all tender opening details, including dates and committee members. This action cannot be undone until you save all changes.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleClearOpeningDetails}>Yes, Clear</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </FormProvider>
    );
}
