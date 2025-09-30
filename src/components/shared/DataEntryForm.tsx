// src/components/shared/DataEntryForm.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, type FieldErrors, FormProvider, useWatch, useFormContext } from "react-hook-form";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Loader2, Trash2, PlusCircle, X, Save, Clock, Edit } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  DataEntrySchema,
  type DataEntryFormData,
  siteWorkStatusOptions,
  sitePurposeOptions,
  type SitePurpose,
  siteDiameterOptions,
  siteTypeOfRigOptions,
  fileStatusOptions,
  remittedAccountOptions,
  paymentAccountOptions,
  type RemittanceDetailFormData,
  type PaymentDetailFormData,
  SiteDetailSchema,
  type SiteDetailFormData,
  applicationTypeOptions,
  applicationTypeDisplayMap,
  type ApplicationType,
  siteConditionsOptions,
  type UserRole,
  rigAccessibilityOptions,
  type SiteWorkStatus,
  constituencyOptions,
  type Constituency,
  type LsgConstituencyMap,
} from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useFileEntries } from "@/hooks/useFileEntries";
import { usePendingUpdates } from "@/hooks/usePendingUpdates";
import type { StaffMember } from "@/lib/schemas";
import type { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../ui/card";
import { getFirestore, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { app } from "@/lib/firebase";
import { useDataStore } from "@/hooks/use-data-store";
import { ScrollArea } from "../ui/scroll-area";

const db = getFirestore(app);

// Helper function to create default form values, ensuring consistency.
const createDefaultRemittanceDetail = (): RemittanceDetailFormData => ({
  amountRemitted: undefined, dateOfRemittance: undefined, remittedAccount: undefined
});
const createDefaultPaymentDetail = (): PaymentDetailFormData => ({
  dateOfPayment: undefined, paymentAccount: undefined, revenueHead: undefined,
  contractorsPayment: undefined, gst: undefined, incomeTax: undefined, kbcwb: undefined,
  refundToParty: undefined, totalPaymentPerEntry: 0, paymentRemarks: "",
});

const createDefaultSiteDetail = (): z.infer<typeof SiteDetailSchema> => ({
  nameOfSite: "",
  localSelfGovt: "",
  constituency: undefined,
  latitude: undefined, longitude: undefined, purpose: undefined,
  estimateAmount: undefined, remittedAmount: undefined, siteConditions: undefined, accessibleRig: undefined, tsAmount: undefined,
  additionalAS: 'No',
  tenderNo: "", diameter: undefined, totalDepth: undefined, casingPipeUsed: "",
  outerCasingPipe: "", innerCasingPipe: "", yieldDischarge: "", zoneDetails: "",
  waterLevel: "", drillingRemarks: "", pumpDetails: "", waterTankCapacity: "", noOfTapConnections: undefined,
  noOfBeneficiary: "", dateOfCompletion: undefined, typeOfRig: undefined,
  contractorName: "", supervisorUid: null, supervisorName: null, totalExpenditure: undefined,
  workStatus: undefined, workRemarks: "",
  surveyOB: "", surveyLocation: "", surveyPlainPipe: "", surveySlottedPipe: "",
  surveyRemarks: "", surveyRecommendedDiameter: "", surveyRecommendedTD: "",
  surveyRecommendedOB: "", surveyRecommendedCasingPipe: "", surveyRecommendedPlainPipe: "", surveyRecommendedSlottedPipe: "", surveyRecommendedMsCasingPipe: "",
  arsTypeOfScheme: undefined, arsPanchayath: undefined, arsBlock: undefined, arsAsTsDetails: undefined, arsSanctionedDate: undefined,
  arsTenderedAmount: undefined, arsAwardedAmount: undefined,
  arsNumberOfStructures: undefined, arsStorageCapacity: undefined, arsNumberOfFillings: undefined, isArsImport: false,
  pilotDrillingDepth: "", pumpingLineLength: "", deliveryLineLength: "",
});

const calculatePaymentEntryTotalGlobal = (payment: PaymentDetailFormData | undefined): number => {
  if (!payment) return 0;
  return (Number(payment.revenueHead) || 0) + (Number(payment.contractorsPayment) || 0) +
         (Number(payment.gst) || 0) + (Number(payment.incomeTax) || 0) +
         (Number(payment.kbcwb) || 0) + (Number(payment.refundToParty) || 0);
};

const PURPOSES_REQUIRING_DIAMETER: SitePurpose[] = ["BWC", "TWC", "FPW", "BW Dev", "TW Dev", "FPW Dev"];
const PURPOSES_REQUIRING_RIG_ACCESSIBILITY: SitePurpose[] = ["BWC", "TWC", "FPW", "BW Dev", "TW Dev", "FPW Dev"];
const FINAL_WORK_STATUSES: SiteWorkStatus[] = ['Work Failed', 'Work Completed', 'Bill Prepared', 'Payment Completed', 'Utilization Certificate Issued'];
const SUPERVISOR_WORK_STATUS_OPTIONS: SiteWorkStatus[] = ["Work Order Issued", "Work in Progress", "Work Initiated", "Work Failed", "Work Completed"];


const getFormattedErrorMessages = (errors: FieldErrors<DataEntryFormData>): string[] => {
  const messages = new Set<string>();

  const processPath = (path: string, index?: number): string => {
    if (path.startsWith('remittanceDetails')) return `Remittance #${(index ?? 0) + 1}`;
    if (path.startsWith('siteDetails')) return `Site #${(index ?? 0) + 1}`;
    if (path.startsWith('paymentDetails')) return `Payment #${(index ?? 0) + 1}`;
    return path;
  };

  function findMessages(obj: any, parentPath: string = "") {
    if (!obj) return;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];
        const newPath = parentPath ? `${parentPath}.${key}` : key;
        
        if (value?.message && typeof value.message === 'string') {
          // For top-level errors, format them nicely
          const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
          messages.add(`${formattedKey}: ${value.message}`);
        } else if (Array.isArray(value)) {
          value.forEach((item, index) => {
            if (item && typeof item === 'object') {
              for (const itemKey in item) {
                if (item[itemKey]?.message) {
                  const pathPrefix = processPath(newPath, index);
                  const formattedItemKey = itemKey.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
                  messages.add(`${pathPrefix} - ${formattedItemKey}: ${item[itemKey].message}`);
                }
              }
            }
          });
        } else if (value && typeof value === 'object') {
          findMessages(value, newPath);
        }
      }
    }
  }

  findMessages(errors);
  return Array.from(messages);
};

const DetailRow = ({ label, value }: { label: string; value: any }) => {
    if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
        return null;
    }
    let displayValue = String(value);
    // Add any specific formatting if needed, e.g., for dates or numbers
    return (
        <div className="text-sm">
            <span className="font-medium text-muted-foreground">{label}:</span> {displayValue}
        </div>
    );
};

interface DataEntryFormProps {
  fileNoToEdit?: string;
  initialData: DataEntryFormData;
  supervisorList: (StaffMember & { uid: string; name: string })[];
  userRole?: UserRole;
  workTypeContext: 'public' | 'private' | null;
}

const PUBLIC_APPLICATION_TYPES = applicationTypeOptions.filter(
  (type) => !type.startsWith("Private_")
);
const PRIVATE_APPLICATION_TYPES = applicationTypeOptions.filter(
  (type) => type.startsWith("Private_")
);

export default function DataEntryFormComponent({ 
  fileNoToEdit,
  initialData,
  supervisorList,
  userRole,
  workTypeContext,
}: DataEntryFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addFileEntry } = useFileEntries();
  const { createPendingUpdate, getPendingUpdateById } = usePendingUpdates();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { allLsgConstituencyMaps } = useDataStore();

  const [dialogState, setDialogState] = useState<{ type: string | null; data: any; index?: number }>({ type: null, data: null });
  const [itemToDelete, setItemToDelete] = useState<{ type: string; index: number } | null>(null);
  
  const isEditor = userRole === 'editor';
  const isSupervisor = userRole === 'supervisor';
  const isViewer = userRole === 'viewer';
  
  const approveUpdateId = searchParams.get("approveUpdateId");
  const isApprovingUpdate = isEditor && !!approveUpdateId;
  const isReadOnly = isViewer || (isSupervisor && !fileNoToEdit);

  const formOptions = useMemo(() => {
    if (workTypeContext === 'private') {
      return PRIVATE_APPLICATION_TYPES;
    }
    if (workTypeContext === 'public') {
      return PUBLIC_APPLICATION_TYPES;
    }
    // If no context or editing, show all
    return applicationTypeOptions;
  }, [workTypeContext]);

  const form = useForm<DataEntryFormData>({
    resolver: zodResolver(DataEntrySchema),
    defaultValues: initialData,
  });

  const { reset: formReset, trigger: formTrigger, getValues: formGetValues, setValue: formSetValue, control, watch } = form;

  // Use JSON.stringify to create a stable dependency for useCallback and useEffect
  const stableInitialDataString = JSON.stringify(initialData);

  useEffect(() => {
    formReset(initialData);
  }, [stableInitialDataString, formReset, initialData]);

  useEffect(() => {
    if (fileNoToEdit) {
      const timer = setTimeout(() => formTrigger(), 500);
      return () => clearTimeout(timer);
    }
  }, [fileNoToEdit, formTrigger, stableInitialDataString]);

  const watchedSiteDetails = useWatch({ control, name: "siteDetails", defaultValue: [] });
  const applicationType = watch("applicationType");
  const isPrivateApplication = useMemo(() => {
    if (!applicationType) return false;
    return [
      'Private_Domestic',
      'Private_Irrigation',
      'Private_Institution',
      'Private_Industry'
    ].includes(applicationType);
  }, [applicationType]);

  useEffect(() => {
    if (userRole === 'editor') {
      (watchedSiteDetails ?? []).forEach((site, index) => {
        if (site.supervisorUid) {
          const supervisorIsActive = supervisorList.some(s => s.uid === site.supervisorUid);
          if (!supervisorIsActive) {
            const supervisorName = site.supervisorName || 'an inactive user';
            const existingRemarks = formGetValues(`siteDetails.${index}.workRemarks`) || "";
            const note = `[System Note: Previous supervisor '${supervisorName}' is now inactive and has been unassigned.]`;
            
            formSetValue(`siteDetails.${index}.supervisorUid`, null);
            formSetValue(`siteDetails.${index}.supervisorName`, null);
            formSetValue(`siteDetails.${index}.workRemarks`, `${existingRemarks}\n${note}`.trim());
            
            toast({
                title: "Supervisor Unassigned",
                description: `Supervisor '${supervisorName}' for Site #${index+1} is inactive and has been automatically unassigned. Please review.`,
                variant: "default",
                duration: 7000
            });
          }
        }
      });
    }
  }, [userRole, supervisorList, watchedSiteDetails, formGetValues, formSetValue, toast]);


  const { fields: siteFields, append: appendSite, remove: removeSite, update: updateSite } = useFieldArray({ control: form.control, name: "siteDetails" });
  const { fields: remittanceFields, append: appendRemittance, remove: removeRemittance, update: updateRemittance } = useFieldArray({ control: form.control, name: "remittanceDetails" });
  const { fields: paymentFields, append: appendPayment, remove: removePayment, update: updatePayment } = useFieldArray({ control: form.control, name: "paymentDetails" });

  const watchedRemittanceDetails = useWatch({ control: form.control, name: "remittanceDetails", defaultValue: [] });
  const watchedPaymentDetails = useWatch({ control: form.control, name: "paymentDetails", defaultValue: [] });
  const watchedTotalEstimate = useWatch({ control, name: 'siteDetails' })
    ?.reduce((sum, site) => sum + (Number(site.estimateAmount) || 0), 0) || 0;


  const onInvalid = (errors: FieldErrors<DataEntryFormData>) => {
    const messages = getFormattedErrorMessages(errors);
    
    if (messages.length > 0) {
      toast({
        title: "Cannot Save File",
        variant: "destructive",
        duration: 8000,
        description: (
          <div className="w-full">
            <p className="font-semibold">Please fix the following errors:</p>
            <ul className="mt-2 list-disc list-inside text-xs space-y-1">
              {messages.slice(0, 5).map((msg, i) => <li key={i}>{msg}</li>)}
            </ul>
            {messages.length > 5 && <p className="mt-2 text-xs font-medium">...and {messages.length - 5} more.</p>}
          </div>
        ),
      });
    } else {
      console.error("Form submission failed with errors, but no messages were extracted.", errors);
      toast({
        title: "Validation Error",
        description: "An unknown validation error occurred. Please review the form for highlighted fields.",
        variant: "destructive",
      });
    }
  };

  async function onValidSubmit(data: DataEntryFormData) {
    if (!user) {
        toast({ title: "Authentication Error", description: "You must be logged in to save.", variant: "destructive" });
        return;
    }
    
    if (userRole !== 'editor' && userRole !== 'supervisor') {
        toast({ title: "Permission Denied", description: "You do not have permission to save file data.", variant: "destructive" });
        return;
    }

    if (userRole === 'supervisor' && !fileNoToEdit) {
        toast({ title: "Permission Denied", description: "Supervisors cannot create new files.", variant: "destructive" });
        return;
    }

    setIsSubmitting(true);

    try {
      if (userRole === 'editor') {
          const supervisorUids = [...new Set(data.siteDetails?.map(s => s.supervisorUid).filter((uid): uid is string => !!uid))];
          const processedPaymentDetails = (data.paymentDetails || []).map(pd => ({ ...pd, totalPaymentPerEntry: calculatePaymentEntryTotalGlobal(pd) }));
          const sumOfAllPayments = processedPaymentDetails.reduce((acc, pd) => acc + (pd.totalPaymentPerEntry || 0), 0);
          const totalRemittance = data.remittanceDetails?.reduce((acc, rd) => acc + (Number(rd.amountRemitted) || 0), 0) || 0;
          
          let payload: DataEntryFormData = {
            ...data,
            assignedSupervisorUids: supervisorUids,
            paymentDetails: processedPaymentDetails,
            totalRemittance: totalRemittance,
            totalPaymentAllEntries: sumOfAllPayments,
            overallBalance: totalRemittance - sumOfAllPayments,
          };
          
          // If we are approving, we need to mark the pending update as 'approved'
          if (isApprovingUpdate && approveUpdateId) {
             const pendingUpdate = await getPendingUpdateById(approveUpdateId);
             if (pendingUpdate) {
                // Here, `payload` is the merged data from the form.
                await addFileEntry(payload, fileNoToEdit); // Save the merged data
                const updateRef = doc(db, 'pendingUpdates', approveUpdateId);
                await updateDoc(updateRef, { status: 'approved', reviewedByUid: user.uid, reviewedAt: serverTimestamp() });
                toast({ title: "Update Approved", description: `Changes for file '${fileNoToEdit}' have been successfully applied.` });
             } else {
                throw new Error("Could not find the pending update to approve.");
             }
          } else {
              await addFileEntry(payload, fileNoToEdit);
              toast({
                  title: fileNoToEdit ? "File Data Updated" : "File Data Submitted",
                  description: `Data for file '${payload.fileNo || "N/A"}' has been successfully ${fileNoToEdit ? 'updated' : 'recorded'}.`,
              });
          }

      } else if (userRole === 'supervisor' && fileNoToEdit) {
          const sitesWithChanges = (data.siteDetails || [])
            .filter(currentSite => {
                if (currentSite.supervisorUid !== user.uid) return false;
                const originalSite = initialData.siteDetails?.find(s => s.nameOfSite === currentSite.nameOfSite);
                if (!originalSite) return false;
                // Check if any supervisor-editable field has changed
                return Object.keys(currentSite).some(key => {
                    const typedKey = key as keyof SiteDetailFormData;
                    const supervisorEditableFields: (keyof SiteDetailFormData)[] = [
                      'latitude', 'longitude', 'drillingRemarks', 'workRemarks', 'workStatus', 'dateOfCompletion', 'totalExpenditure',
                      'diameter', 'pilotDrillingDepth', 'totalDepth', 'casingPipeUsed', 'outerCasingPipe', 'innerCasingPipe',
                      'yieldDischarge', 'zoneDetails', 'waterLevel', 'typeOfRig', 'surveyOB', 'surveyPlainPipe', 'surveySlottedPipe',
                      'pumpDetails', 'pumpingLineLength', 'deliveryLineLength', 'waterTankCapacity', 'noOfTapConnections', 'noOfBeneficiary',
                      'localSelfGovt', 'constituency'
                    ];
                    if (supervisorEditableFields.includes(typedKey)) {
                        const currentValue = currentSite[typedKey] ?? "";
                        const originalValue = originalSite[typedKey] ?? "";
                        return String(currentValue) !== String(originalValue);
                    }
                    return false;
                });
            });

          if (sitesWithChanges.length === 0) {
              toast({ title: "No Changes Detected", description: "You haven't made any changes to your assigned sites." });
              setIsSubmitting(false);
              return;
          }

          await createPendingUpdate(fileNoToEdit, sitesWithChanges, user, {});
          
          toast({
              title: "Update Submitted",
              description: `Your changes for file '${fileNoToEdit}' have been submitted for admin approval.`,
          });
      }

      router.push('/dashboard/file-room');

    } catch (error: any) {
        toast({ title: "Submission Failed", description: error.message, variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  }

  const handleLsgChange = useCallback((lsgName: string, siteIndex: number) => {
    formSetValue(`siteDetails.${siteIndex}.localSelfGovt`, lsgName);
    const map = allLsgConstituencyMaps.find(m => m.name === lsgName);
    const constituencies = map?.constituencies || [];
    
    // Always reset constituency when LSG changes
    formSetValue(`siteDetails.${siteIndex}.constituency`, undefined);
    
    if (constituencies.length === 1) {
      formSetValue(`siteDetails.${siteIndex}.constituency`, constituencies[0] as Constituency);
    }
    // Re-trigger validation to update UI state
    form.trigger(`siteDetails.${siteIndex}.constituency`);
  }, [formSetValue, allLsgConstituencyMaps, form]);

  useEffect(() => {
    (watchedSiteDetails ?? []).forEach((site, index) => {
        const lsgName = site?.localSelfGovt;
        if (!lsgName) return;

        const map = allLsgConstituencyMaps.find(m => m.name === lsgName);
        const constituencies = map?.constituencies || [];
        
        // This effect ensures that if the list of constituencies changes
        // (e.g., due to some other async data load) and there's only one option,
        // it gets auto-selected.
        if (constituencies.length === 1 && site.constituency !== constituencies[0]) {
            formSetValue(`siteDetails.${index}.constituency`, constituencies[0] as Constituency);
        }
    });
  }, [watchedSiteDetails, allLsgConstituencyMaps, formSetValue]);
  
  const sortedLsgMaps = useMemo(() => {
    return [...allLsgConstituencyMaps].sort((a, b) => a.name.localeCompare(b.name));
  }, [allLsgConstituencyMaps]);


  // Dialog management functions
  const openDialog = (type: string, index?: number) => {
    let data;
    if (index !== undefined) {
      if (type === 'remittance') data = form.getValues(`remittanceDetails.${index}`);
      else if (type === 'site') data = form.getValues(`siteDetails.${index}`);
      else if (type === 'payment') data = form.getValues(`paymentDetails.${index}`);
    } else {
      if (type === 'remittance') data = createDefaultRemittanceDetail();
      else if (type === 'site') data = createDefaultSiteDetail();
      else if (type === 'payment') data = createDefaultPaymentDetail();
    }
    setDialogState({ type, data, index });
  };
  const closeDialog = () => setDialogState({ type: null, data: null });

  const handleDialogSave = (formData: any) => {
    const { type, index } = dialogState;
    if (type === 'application') {
      form.setValue('fileNo', formData.fileNo);
      form.setValue('applicantName', formData.applicantName);
      form.setValue('phoneNo', formData.phoneNo);
      form.setValue('secondaryMobileNo', formData.secondaryMobileNo);
      form.setValue('applicationType', formData.applicationType);
    } else if (type === 'remittance') {
      if (index !== undefined) updateRemittance(index, formData);
      else appendRemittance(formData);
    } else if (type === 'site') {
      if (index !== undefined) updateSite(index, formData);
      else appendSite(formData);
    } else if (type === 'payment') {
      if (index !== undefined) updatePayment(index, formData);
      else appendPayment(formData);
    } else if (type === 'finalStatus') {
      form.setValue('fileStatus', formData.fileStatus);
      form.setValue('remarks', formData.remarks);
    }
    closeDialog();
  };

  const handleDeleteClick = (type: string, index: number) => {
    setItemToDelete({ type, index });
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      const { type, index } = itemToDelete;
      if (type === 'remittance') removeRemittance(index);
      else if (type === 'site') removeSite(index);
      else if (type === 'payment') removePayment(index);
      setItemToDelete(null);
      toast({ title: 'Entry Removed' });
    }
  };
  
    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onValidSubmit, onInvalid)} className="space-y-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Application Details</CardTitle>
                        {!isReadOnly && (
                            <Button type="button" variant="outline" size="sm" onClick={() => openDialog('application')}>
                                <Edit className="mr-2 h-4 w-4" /> Edit
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <DetailRow label="File No" value={watch('fileNo')} />
                        <DetailRow label="Applicant" value={watch('applicantName')} />
                        <DetailRow label="Phone No" value={watch('phoneNo')} />
                        <DetailRow label="Secondary Mobile" value={watch('secondaryMobileNo')} />
                        <DetailRow label="Application Type" value={applicationTypeDisplayMap[watch('applicationType') as ApplicationType]} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Remittance Details</CardTitle>
                        {!isReadOnly && (
                            <Button type="button" variant="outline" size="sm" onClick={() => openDialog('remittance')}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Add
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {remittanceFields.map((field, index) => (
                            <div key={field.id} className="flex items-center justify-between p-3 border rounded-lg bg-secondary/20">
                                <div className="grid grid-cols-3 gap-x-4 w-full">
                                    <DetailRow label={`Date #${index + 1}`} value={watch(`remittanceDetails.${index}.dateOfRemittance`)} />
                                    <DetailRow label="Amount" value={watch(`remittanceDetails.${index}.amountRemitted`)} />
                                    <DetailRow label="Account" value={watch(`remittanceDetails.${index}.remittedAccount`)} />
                                </div>
                                {!isReadOnly && (
                                    <div className="flex items-center gap-1 pl-4">
                                        <Button type="button" variant="ghost" size="icon" onClick={() => openDialog('remittance', index)}><Edit className="h-4 w-4"/></Button>
                                        <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteClick('remittance', index)}><Trash2 className="h-4 w-4"/></Button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Site Details</CardTitle>
                        {!isReadOnly && (
                            <Button type="button" variant="outline" size="sm" onClick={() => openDialog('site')}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Site
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent className="space-y-2">
                         {siteFields.map((field, index) => (
                            <div key={field.id} className="flex items-center justify-between p-3 border rounded-lg bg-secondary/20">
                                <div>
                                    <p className="font-semibold">{watch(`siteDetails.${index}.nameOfSite`)}</p>
                                    <p className="text-sm text-muted-foreground">{watch(`siteDetails.${index}.purpose`)} - {watch(`siteDetails.${index}.workStatus`)}</p>
                                </div>
                                {!isReadOnly && (
                                    <div className="flex items-center gap-1 pl-4">
                                        <Button type="button" variant="ghost" size="icon" onClick={() => openDialog('site', index)}><Edit className="h-4 w-4"/></Button>
                                        <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteClick('site', index)}><Trash2 className="h-4 w-4"/></Button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Payment Details</CardTitle>
                         {!isReadOnly && (
                            <Button type="button" variant="outline" size="sm" onClick={() => openDialog('payment')}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Add
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent className="space-y-2">
                         {paymentFields.map((field, index) => (
                            <div key={field.id} className="flex items-center justify-between p-3 border rounded-lg bg-secondary/20">
                                <div className="grid grid-cols-2 gap-x-4 w-full">
                                    <DetailRow label={`Date #${index + 1}`} value={watch(`paymentDetails.${index}.dateOfPayment`)} />
                                    <DetailRow label="Total Paid" value={calculatePaymentEntryTotalGlobal(watch(`paymentDetails.${index}`))} />
                                </div>
                                {!isReadOnly && (
                                    <div className="flex items-center gap-1 pl-4">
                                        <Button type="button" variant="ghost" size="icon" onClick={() => openDialog('payment', index)}><Edit className="h-4 w-4"/></Button>
                                        <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteClick('payment', index)}><Trash2 className="h-4 w-4"/></Button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Final Status & Summary</CardTitle>
                        {!isReadOnly && (
                            <Button type="button" variant="outline" size="sm" onClick={() => openDialog('finalStatus')}>
                                <Edit className="mr-2 h-4 w-4" /> Edit
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DetailRow label="File Status" value={watch('fileStatus')} />
                        <DetailRow label="Remarks" value={watch('remarks')} />
                        <DetailRow label="Total Remittance (₹)" value={(watch('remittanceDetails') ?? []).reduce((acc, curr) => acc + (Number(curr.amountRemitted) || 0), 0).toFixed(2)} />
                        <DetailRow label="Total Payment (₹)" value={(watch('paymentDetails') ?? []).reduce((acc, payment) => acc + calculatePaymentEntryTotalGlobal(payment), 0).toFixed(2)} />
                        <DetailRow label="Balance (₹)" value={((watch('remittanceDetails') ?? []).reduce((acc, curr) => acc + (Number(curr.amountRemitted) || 0), 0) - (watch('paymentDetails') ?? []).reduce((acc, payment) => acc + calculatePaymentEntryTotalGlobal(payment), 0)).toFixed(2)} />
                    </CardContent>
                </Card>


                <div className="flex space-x-4 pt-4">
                    {!isViewer && (
                        <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="mr-2 h-4 w-4" />
                        )}
                        {isSubmitting ? "Saving..." : (fileNoToEdit ? (isApprovingUpdate ? "Approve &amp; Save" : "Save Changes") : "Create File")}
                        </Button>
                    )}
                    <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}><X className="mr-2 h-4 w-4" />Cancel</Button>
                </div>
            </form>
            
            {/* All Dialogs */}
             <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently delete this entry. This action cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </FormProvider>
    );
}
