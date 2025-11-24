
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
import { Loader2, Save, Edit, PlusCircle, Trash2, FileText, Building, GitBranch, FolderOpen, ScrollText, Download, Users, Bell, ArrowLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { toDateOrNull, formatDateSafe } from './utils';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';
import { isValid, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

import BasicDetailsForm from './BasicDetailsForm';
import TenderOpeningDetailsForm from './TenderOpeningDetailsForm';
import BidderForm from './BidderForm';
import WorkOrderDetailsForm from './WorkOrderDetailsForm';
import SelectionNoticeForm from './SelectionNoticeForm';
import CorrigendumForm from './CorrigendumForm';
import { useDataStore } from '@/hooks/use-data-store';
import PdfReportDialogs from './pdf/PdfReportDialogs'; 
import { Textarea } from '../ui/textarea';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';


type ModalType = 'basic' | 'opening' | 'bidders' | 'addBidder' | 'editBidder' | 'workOrder' | 'selectionNotice' | 'addCorrigendum' | 'editCorrigendum' | null;


const DetailRow = ({ label, value, subValue, isCurrency = false, align = 'left' }: { label: string; value: any; subValue?: string; isCurrency?: boolean, align?: 'left' | 'center' | 'right' }) => {
    if (value === null || value === undefined || value === '' || (typeof value === 'number' && isNaN(value))) {
        return null;
    }

    let displayValue = String(value);

    // Custom formatting for specific labels
    if (label.toLowerCase().includes('date')) {
        const isTimeIncluded = label.toLowerCase().includes('time');
        const isReceipt = label.toLowerCase().includes('receipt');
        const isOpening = label.toLowerCase().includes('opening') && label !== 'Date of Opening Bid' && label !== 'Date of Tech/Fin Bid Opening';
        
        // This combines all logic into one call
        const formatted = formatDateSafe(value, isTimeIncluded || isOpening, isReceipt, isOpening);

        if (formatted === 'N/A' && value) {
            displayValue = String(value);
        } else if (formatted !== 'N/A') {
            displayValue = formatted;
        } else {
            return null;
        }
    } else if (typeof value === 'number') {
        if (isCurrency) {
            displayValue = `Rs. ${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        } else {
            displayValue = value.toLocaleString('en-IN');
        }
    }

    return (
        <div className={cn(align === 'center' && 'text-center')}>
            <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
            <dd className={cn(
                "text-sm font-semibold",
                label.toLowerCase().includes('malayalam') && "text-xs",
            )}>
              {displayValue}
              {subValue && <span className="text-xs text-muted-foreground ml-1">({subValue})</span>}
            </dd>
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
    const [isClearSelectionNoticeConfirmOpen, setIsClearSelectionNoticeConfirmOpen] = useState(false);


    const form = useForm<E_tenderFormData>({
        resolver: zodResolver(E_tenderSchema),
        defaultValues: tender,
    });

    const { control, getValues, setValue, handleSubmit: handleFormSubmit, watch } = form;
    const { fields: bidderFields, append: appendBidder, update: updateBidder, remove: removeBidder } = useFieldArray({ control, name: "bidders" });
    const { fields: corrigendumFields, append: appendCorrigendum, update: updateCorrigendum, remove: removeCorrigendum } = useFieldArray({ control, name: "corrigendums" });

    const handleFinalSave = async () => {
        setIsSubmitting(true);
        try {
            await handleSave(getValues(), true);
            toast({ title: "Tender Saved", description: "All changes have been saved." });
            router.push('/dashboard/e-tender');
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSave = async (data: Partial<E_tenderFormData>, isFinalSave = false) => {
        setIsSubmitting(true);
        try {
            const currentData = getValues();
            const updatedData = { ...currentData, ...data };
            
            const dataForSave = {
              ...updatedData,
              tenderDate: toDateOrNull(updatedData.tenderDate),
              dateTimeOfReceipt: toDateOrNull(updatedData.dateTimeOfReceipt),
              dateTimeOfOpening: toDateOrNull(updatedData.dateTimeOfOpening),
              dateOfOpeningBid: toDateOrNull(updatedData.dateOfOpeningBid),
              dateOfTechnicalAndFinancialBidOpening: toDateOrNull(updatedData.dateOfTechnicalAndFinancialBidOpening),
              selectionNoticeDate: toDateOrNull(updatedData.selectionNoticeDate),
              agreementDate: toDateOrNull(updatedData.agreementDate),
              dateWorkOrder: toDateOrNull(updatedData.dateWorkOrder),
              corrigendums: (updatedData.corrigendums || []).map(c => ({
                  ...c,
                  corrigendumDate: toDateOrNull(c.corrigendumDate),
                  lastDateOfReceipt: toDateOrNull(c.lastDateOfReceipt),
                  dateOfOpeningTender: toDateOrNull(c.dateOfOpeningTender),
              }))
            };

            if (tender.id === 'new') {
                const newTenderId = await addTender(dataForSave);
                toast({ title: "Tender Created", description: "The new e-Tender has been saved. You can now edit other sections." });
                if (!isFinalSave) {
                    router.replace(`/dashboard/e-tender/${newTenderId}`, { scroll: false });
                }
            } else {
                await saveTenderToDb(tender.id, dataForSave);
                updateTender(dataForSave);
                if (!isFinalSave) {
                   toast({ title: "Details Saved", description: "Your changes have been saved to the database." });
                }
            }
        } catch (error: any) {
            console.error("Save Error:", error);
            toast({ title: "Error Saving", description: error.message || "An unknown error occurred.", variant: "destructive" });
            throw error;
        } finally {
            setIsSubmitting(false);
            if (!isFinalSave) {
               setActiveModal(null);
            }
        }
    };


    useEffect(() => {
        form.reset(tender);
    }, [tender, form]);

    const handleBidderSave = (bidderData: Bidder) => {
        if (activeModal === 'addBidder') {
            appendBidder(bidderData);
        } else if (activeModal === 'editBidder' && modalData?.index !== undefined) {
            updateBidder(modalData.index, bidderData);
        }
        handleSave({ bidders: getValues('bidders') });
        setActiveModal(null);
        setModalData(null);
    };
    
    const handleCorrigendumSave = (corrigendumData: Corrigendum) => {
        if (activeModal === 'addCorrigendum') {
            appendCorrigendum(corrigendumData);
        } else if (activeModal === 'editCorrigendum' && modalData?.index !== undefined) {
            updateCorrigendum(modalData.index, corrigendumData);
        }
        handleSave({ corrigendums: getValues('corrigendums') });
        setActiveModal(null);
        setModalData(null);
    };

    const handleEditCorrigendumClick = (corrigendum: Corrigendum, index: number) => {
        setModalData({ ...corrigendum, index });
        setActiveModal('editCorrigendum');
    };
    
    const handleClearOpeningDetails = async () => {
        const clearedData = {
            dateOfOpeningBid: null,
            dateOfTechnicalAndFinancialBidOpening: null,
            technicalCommitteeMember1: undefined,
            technicalCommitteeMember2: undefined,
            technicalCommitteeMember3: undefined,
        };
        await handleSave(clearedData);
        toast({ title: "Opening Details Cleared", description: "The details have been cleared and saved." });
        setIsClearOpeningDetailsConfirmOpen(false);
    };
    
    const handleClearSelectionNotice = async () => {
        const clearedData = {
            selectionNoticeDate: null,
            performanceGuaranteeAmount: undefined,
            additionalPerformanceGuaranteeAmount: undefined,
            stampPaperAmount: undefined,
            performanceGuaranteeDescription: undefined,
            stampPaperDescription: undefined,
        };
        await handleSave(clearedData);
        toast({ title: "Selection Notice Cleared", description: "The details have been cleared and saved." });
        setIsClearSelectionNoticeConfirmOpen(false);
    };
    
    const watchedBasicFields = watch([
        'eTenderNo', 'tenderDate', 'fileNo', 'nameOfWork', 'nameOfWorkMalayalam',
        'location', 'estimateAmount', 'tenderFormFee', 'emd', 'periodOfCompletion',
        'dateTimeOfReceipt', 'dateTimeOfOpening', 'tenderType'
    ]);

    const hasAnyBasicData = useMemo(() => {
        return watchedBasicFields.some(v => v);
    }, [watchedBasicFields]);

    const hasAnyCorrigendumData = corrigendumFields.length > 0;
    
    const committeeMemberNames = [
        watch('technicalCommitteeMember1'),
        watch('technicalCommitteeMember2'),
        watch('technicalCommitteeMember3')
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
        return watch('dateOfOpeningBid') || watch('dateOfTechnicalAndFinancialBidOpening') || committeeMemberDetails.length > 0;
    }, [watch, committeeMemberDetails]);
    
    const sortedBidderFields = React.useMemo(() => {
        return [...bidderFields].sort((a, b) => {
            const amountA = a.quotedAmount ?? Infinity;
            const amountB = b.quotedAmount ?? Infinity;
            return amountA - amountB;
        });
    }, [bidderFields]);

    const hasAnyBidderData = useMemo(() => {
        return bidderFields.length > 0;
    }, [bidderFields]);

    const watchedSelectionNoticeFields = watch(['selectionNoticeDate', 'performanceGuaranteeAmount', 'additionalPerformanceGuaranteeAmount', 'stampPaperAmount']);
    const hasAnySelectionNoticeData = useMemo(() => {
        return watchedSelectionNoticeFields.some(v => v);
    }, [watchedSelectionNoticeFields]);
    
    const assistantEngineerName = watch('nameOfAssistantEngineer');

    const assistantEngineerDesignation = useMemo(() => allStaffMembers.find(s => s.name === assistantEngineerName)?.designation, [assistantEngineerName, allStaffMembers]);
    
    const supervisor1Name = watch('supervisor1Name');
    const supervisor2Name = watch('supervisor2Name');
    const supervisor3Name = watch('supervisor3Name');
    const supervisor1Designation = useMemo(() => allStaffMembers.find(s => s.name === supervisor1Name)?.designation, [supervisor1Name, allStaffMembers]);
    const supervisor2Designation = useMemo(() => allStaffMembers.find(s => s.name === supervisor2Name)?.designation, [supervisor2Name, allStaffMembers]);
    const supervisor3Designation = useMemo(() => allStaffMembers.find(s => s.name === supervisor3Name)?.designation, [supervisor3Name, allStaffMembers]);

    const watchedWorkOrderFields = watch(['agreementDate', 'dateWorkOrder', 'nameOfAssistantEngineer', 'supervisor1Name', 'supervisor2Name', 'supervisor3Name']);
    const hasAnyWorkOrderData = useMemo(() => {
        return watchedWorkOrderFields.some(v => v);
    }, [watchedWorkOrderFields]);


    const tenderType = watch('tenderType');
    const workOrderTitle = tenderType === 'Purchase' ? 'Supply Order Details' : 'Work Order Details';
    
    const tenderFormFeeValue = watch('tenderFormFee');
    const displayTenderFormFee = useMemo(() => {
        if (tenderFormFeeValue === undefined || tenderFormFeeValue === null) return null;
        const fee = Number(tenderFormFeeValue);
        if (isNaN(fee) || fee <= 0) return 'Rs. 0.00';
        const gst = fee * 0.18;
        return `Rs. ${fee.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} & Rs. ${gst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (GST 18%)`;
    }, [tenderFormFeeValue]);

    const l1Bidder = useMemo(() => {
        if (!bidderFields || bidderFields.length === 0) return null;
        const validBidders = bidderFields.filter(b => typeof b.quotedAmount === 'number' && b.quotedAmount > 0);
        if (validBidders.length === 0) return null;
        return validBidders.reduce((lowest, current) => 
            (current.quotedAmount! < lowest.quotedAmount!) ? current : lowest
        );
    }, [bidderFields]);


    return (
        <FormProvider {...form}>
            <div className="space-y-6">
                <Card>
                    <CardHeader className="p-4 flex flex-row justify-end">
                        <Button variant="destructive" onClick={() => router.back()}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back
                        </Button>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="space-y-4">
                            <Card className="border rounded-lg bg-blue-500/5 border-blue-500/20">
                                <CardHeader className="flex flex-row justify-between items-center p-4">
                                    <div className="flex items-center gap-3">
                                        <Building className="h-5 w-5 text-primary"/>
                                        <CardTitle className="text-lg font-semibold text-primary">Basic Details</CardTitle>
                                    </div>
                                    <Button type="button" size="sm" variant="outline" className="bg-white" onClick={() => setActiveModal('basic')}><Edit className="h-4 w-4 mr-2"/>Edit</Button>
                                </CardHeader>
                                {hasAnyBasicData ? (
                                    <CardContent className="p-6 pt-0">
                                        <div className="space-y-6 pt-4">
                                            <div className="space-y-2">
                                                <h4 className="text-sm font-medium text-muted-foreground">Tender Identification</h4>
                                                <div className="p-4 border rounded-md bg-slate-50 grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-4">
                                                    <DetailRow label="eTender No." value={watch('eTenderNo')} />
                                                    <DetailRow label="Tender Date" value={watch('tenderDate')} align="center" />
                                                    <DetailRow label="File No." value={watch('fileNo') ? `GKT/${watch('fileNo')}` : null} />
                                                </div>
                                            </div>
                                             <div className="space-y-2">
                                                <h4 className="text-sm font-medium text-muted-foreground">Work & Location</h4>
                                                <div className="p-4 border rounded-md bg-slate-50 space-y-4">
                                                    <DetailRow label="Name of Work" value={watch('nameOfWork')} />
                                                    <DetailRow label="Name of Work (in Malayalam)" value={watch('nameOfWorkMalayalam')} />
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-4 pt-2">
                                                        <DetailRow label="Location" value={watch('location')} />
                                                        <DetailRow label="Period of Completion (Days)" value={watch('periodOfCompletion')} />
                                                        <DetailRow label="Type of Tender" value={watch('tenderType')} />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <h4 className="text-sm font-medium text-muted-foreground">Financial Details</h4>
                                                <div className="p-4 border rounded-md bg-slate-50 grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-4">
                                                    <DetailRow label="Tender Amount (Rs.)" value={watch('estimateAmount')} isCurrency />
                                                    <DetailRow label="Tender Fee (Rs.)" value={displayTenderFormFee} />
                                                    <DetailRow label="EMD (Rs.)" value={watch('emd')} isCurrency/>
                                                </div>
                                            </div>
                                             <div className="space-y-2">
                                                <h4 className="text-sm font-medium text-muted-foreground">Key Dates</h4>
                                                <div className="p-4 border rounded-md bg-slate-50 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                                                    <DetailRow label="Last Date & Time of Receipt" value={watch('dateTimeOfReceipt')} />
                                                    <DetailRow label="Date & Time of Opening" value={watch('dateTimeOfOpening')} />
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                ) : (
                                    <CardContent>
                                        <p className="text-sm text-muted-foreground text-center py-4">No basic details have been added.</p>
                                    </CardContent>
                                )}
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
                                                         <div className="absolute top-2 right-2 flex items-center gap-1">
                                                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditCorrigendumClick(corrigendum, index)}><Edit className="h-4 w-4"/></Button>
                                                            <Button type="button" variant="ghost" size="icon" className="text-destructive h-7 w-7" onClick={() => removeCorrigendum(index)}><Trash2 className="h-4 w-4"/></Button>
                                                         </div>
                                                         <h4 className="text-sm font-semibold text-primary mb-2">Corrigendum No. {index + 1}</h4>
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
                                                <Button type="button" size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); setIsClearOpeningDetailsConfirmOpen(true); }}><Trash2 className="h-4 w-4"/></Button>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="p-6 pt-0">
                                        {hasAnyOpeningData ? (
                                            <div className="space-y-4 pt-4 border-t">
                                                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                                                    <DetailRow label="Date of Opening Bid" value={watch('dateOfOpeningBid')} />
                                                    <DetailRow label="Date of Tech/Fin Bid Opening" value={watch('dateOfTechnicalAndFinancialBidOpening')} />
                                                </dl>
                                                <div className="space-y-2">
                                                    <h4 className="font-semibold">Committee Members:</h4>
                                                    {committeeMemberDetails.length > 0 ? (
                                                        <ol className="list-decimal list-inside text-sm space-y-1">
                                                          {committeeMemberDetails.map((member, i) => (
                                                            <li key={i}>
                                                              <span className="font-semibold">{member.name}</span>
                                                              <span className="text-muted-foreground"> ({member.designation})</span>
                                                            </li>
                                                          ))}
                                                        </ol>
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
                                                {sortedBidderFields.map((bidder, index) => {
                                                    const originalIndex = bidderFields.findIndex(field => field.id === bidder.id);
                                                    return (
                                                        <div key={bidder.id} className="p-3 border rounded-md bg-secondary/30 relative">
                                                            <div className="flex items-start justify-between mb-2">
                                                                <div className="flex items-center gap-2">
                                                                    <h5 className="font-bold text-sm">Bidder #{index + 1}: {bidder.name}</h5>
                                                                    {bidder.id === l1Bidder?.id && <Badge className="bg-green-600 text-white">L1</Badge>}
                                                                    {bidder.status && <Badge variant={bidder.status === 'Accepted' ? 'default' : 'destructive'} className="mt-1">{bidder.status}</Badge>}
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setModalData({ ...bidder, index: originalIndex }); setActiveModal('editBidder'); }}><Edit className="h-4 w-4"/></Button>
                                                                    <Button type="button" variant="ghost" size="icon" className="text-destructive h-7 w-7" onClick={() => removeBidder(originalIndex)}><Trash2 className="h-4 w-4"/></Button>
                                                                </div>
                                                            </div>
                                                            <p className="text-xs text-muted-foreground">{bidder.address}</p>
                                                            <dl className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-1 mt-2 text-xs">
                                                                <DetailRow label="Quoted Amount" value={bidder.quotedAmount} isCurrency/>
                                                                <DetailRow label="Quoted Percentage" value={bidder.quotedPercentage ? `${bidder.quotedPercentage}% ${bidder.aboveBelow || ''}`: ''} />
                                                            </dl>
                                                        </div>
                                                    )
                                                })}
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
                                            <div className="flex items-center gap-2 mr-4">
                                                {hasAnySelectionNoticeData ? (
                                                    <>
                                                        <Button type="button" size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setActiveModal('selectionNotice'); }}><Edit className="h-4 w-4 mr-2"/>Edit</Button>
                                                        <Button type="button" size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); setIsClearSelectionNoticeConfirmOpen(true); }}><Trash2 className="h-4 w-4"/></Button>
                                                    </>
                                                ) : (
                                                    <Button type="button" size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setActiveModal('selectionNotice'); }}><PlusCircle className="h-4 w-4 mr-2"/>Add</Button>
                                                )}
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="p-6 pt-0">
                                        {hasAnySelectionNoticeData ? (
                                             <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 pt-4 border-t">
                                                 <DetailRow label="Selection Notice Date" value={watch('selectionNoticeDate')} />
                                                 <DetailRow label="Performance Guarantee Amount" value={watch('performanceGuaranteeAmount')} isCurrency />
                                                 <DetailRow label="Additional Performance Guarantee Amount" value={watch('additionalPerformanceGuaranteeAmount')} isCurrency />
                                                 <DetailRow label="Stamp Paper required" value={watch('stampPaperAmount')} isCurrency />
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
                                            <Button type="button" size="sm" variant="outline" className="mr-4" onClick={(e) => { e.stopPropagation(); setActiveModal('workOrder'); }}><Edit className="h-4 w-4 mr-2"/>Edit</Button>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="p-6 pt-0">
                                        {hasAnyWorkOrderData ? (
                                             <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 pt-4 border-t">
                                                 <DetailRow label="Agreement Date" value={watch('agreementDate')} />
                                                 <DetailRow label="Date - Work / Supply Order" value={watch('dateWorkOrder')} />
                                                 <DetailRow label="Measurer" value={watch('nameOfAssistantEngineer')} subValue={assistantEngineerDesignation} />
                                                 <DetailRow label="Supervisor 1" value={watch('supervisor1Name')} subValue={supervisor1Designation} />
                                                 <DetailRow label="Supervisor 2" value={watch('supervisor2Name')} subValue={supervisor2Designation} />
                                                 <DetailRow label="Supervisor 3" value={watch('supervisor3Name')} subValue={supervisor3Designation} />
                                             </dl>
                                        ) : (
                                             <p className="text-sm text-muted-foreground text-center py-4">No work order details have been added.</p>
                                        )}
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </div>
                        
                         <Card className="mt-4">
                            <CardContent className="p-4 space-y-4">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <h3 className="text-lg font-semibold flex items-center gap-3 text-primary"><FileText className="h-5 w-5"/>Present Status</h3>
                                    <div className="w-full sm:w-[250px]">
                                        <FormField
                                            name="presentStatus"
                                            control={control}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <Select onValueChange={(value) => { field.onChange(value); updateTender({ presentStatus: value as any }); }} value={field.value || undefined}>
                                                        <FormControl><SelectTrigger className="w-full"><SelectValue placeholder="Select current status" /></SelectTrigger></FormControl>
                                                        <SelectContent>{eTenderStatusOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>
                                <FormField
                                    name="remarks"
                                    control={control}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Remarks</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    {...field}
                                                    value={field.value ?? ""}
                                                    onChange={(e) => {
                                                        field.onChange(e);
                                                        updateTender({ remarks: e.target.value });
                                                    }}
                                                    placeholder="Add any remarks about the current status..."
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </CardContent>
                        </Card>
                        
                         <div className="mt-6 flex flex-col items-center gap-6">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button type="button" size="lg" onClick={handleFinalSave} disabled={isSubmitting}>
                                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                            Save All Changes & Exit
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Persists all locally made changes to the database and returns to the list.</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>

                             <PdfReportDialogs />
                        </div>
                    </CardContent>
                </Card>

                <Dialog open={activeModal === 'basic'} onOpenChange={(isOpen) => !isOpen && setActiveModal(null)}>
                    <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
                        <BasicDetailsForm onSubmit={handleSave} onCancel={() => setActiveModal(null)} isSubmitting={isSubmitting} />
                    </DialogContent>
                </Dialog>
                <Dialog open={activeModal === 'opening'} onOpenChange={(isOpen) => !isOpen && setActiveModal(null)}>
                    <DialogContent className="max-w-2xl flex flex-col p-0">
                        <TenderOpeningDetailsForm initialData={getValues()} onSubmit={handleSave} onCancel={() => setActiveModal(null)} isSubmitting={isSubmitting}/>
                    </DialogContent>
                </Dialog>
                <Dialog open={activeModal === 'addBidder' || activeModal === 'editBidder'} onOpenChange={() => { setActiveModal(null); setModalData(null); }}>
                    <DialogContent className="max-w-3xl flex flex-col p-0">
                        <BidderForm
                           onSubmit={handleBidderSave}
                           onCancel={() => { setActiveModal(null); setModalData(null); }}
                           isSubmitting={isSubmitting}
                           initialData={modalData}
                           tenderAmount={getValues('estimateAmount')}
                        />
                    </DialogContent>
                </Dialog>
                <Dialog open={activeModal === 'addCorrigendum' || activeModal === 'editCorrigendum'} onOpenChange={(isOpen) => !isOpen && setActiveModal(null)}>
                    <DialogContent className="max-w-3xl flex flex-col p-0">
                        <CorrigendumForm onSubmit={handleCorrigendumSave} onCancel={() => { setActiveModal(null); setModalData(null); }} isSubmitting={isSubmitting} initialData={modalData} />
                    </DialogContent>
                </Dialog>
                <Dialog open={activeModal === 'selectionNotice'} onOpenChange={(isOpen) => !isOpen && setActiveModal(null)}>
                    <DialogContent className="max-w-2xl flex flex-col p-0">
                        <SelectionNoticeForm onSubmit={handleSave} onCancel={() => setActiveModal(null)} isSubmitting={isSubmitting} l1Amount={l1Bidder?.quotedAmount} />
                    </DialogContent>
                </Dialog>
                <Dialog open={activeModal === 'workOrder'} onOpenChange={(isOpen) => !isOpen && setActiveModal(null)}>
                    <DialogContent className="max-w-5xl flex flex-col p-0">
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
                
                <AlertDialog open={isClearSelectionNoticeConfirmOpen} onOpenChange={setIsClearSelectionNoticeConfirmOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>This will clear all selection notice details. This action cannot be undone until you save all changes.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleClearSelectionNotice}>Yes, Clear</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </FormProvider>
    );
}
