// src/lib/schemas/eTenderSchema.ts
import { z } from 'zod';

const optionalNumberSchema = z.preprocess((val) => (val === "" || val === null || val === undefined ? undefined : Number(val)), z.number().optional());

export const eTenderStatusOptions = [
    "Tender Process",
    "Bid Opened",
    "Retender",
    "Tender Cancelled",
    "Selection Notice Issued",
    "Work Order Issued",
    "Supply Order Issued",
] as const;
export type E_tenderStatus = typeof eTenderStatusOptions[number];

export const designationOptions = [
    "Executive Engineer",
    "Senior Hydrogeologist",
    "Assistant Executive Engineer",
    "Hydrogeologist",
    "Assistant Engineer",
    "Junior Hydrogeologist",
    "Junior Geophysicist",
    "Master Driller",
    "Senior Driller",
    "Driller",
    "Driller Mechanic",
    "Drilling Assistant",
    "Compressor Driver",
    "Pump Operator",
    "Driver, HDV",
    "Driver, LDV",
    "Senior Clerk",
    "L D Typist",
    "U D Typist",
    "Tracer",
    "Lascar",
    "Office Attendant",
    "Watcher",
    "PTS",
] as const;
export type Designation = typeof designationOptions[number];

export const BasicDetailsSchema = z.object({
    eTenderNo: z.string().optional(),
    tenderDate: z.any().optional().nullable(),
    fileNo: z.string().optional(),
    nameOfWork: z.string().optional(),
    nameOfWorkMalayalam: z.string().optional(),
    location: z.string().optional(),
    estimateAmount: optionalNumberSchema,
    tenderFormFee: optionalNumberSchema,
    emd: optionalNumberSchema,
    periodOfCompletion: optionalNumberSchema,
    dateTimeOfReceipt: z.any().optional().nullable(),
    dateTimeOfOpening: z.any().optional().nullable(),
    tenderType: z.enum(['Work', 'Purchase']).optional(),
    // Descriptions for historical context
    tenderFeeDescription: z.string().optional(),
    emdDescription: z.string().optional(),
});
export type BasicDetailsFormData = z.infer<typeof BasicDetailsSchema>;

export const corrigendumTypeOptions = ["Date Extension", "Cancel", "Retender"] as const;
export type CorrigendumType = typeof corrigendumTypeOptions[number];

export const CorrigendumSchema = z.object({
    id: z.string(),
    corrigendumType: z.enum(corrigendumTypeOptions).optional(),
    corrigendumDate: z.any().optional().nullable(),
    reason: z.string().optional(),
    lastDateOfReceipt: z.any().optional().nullable(),
    dateOfOpeningTender: z.any().optional().nullable(),
});
export type Corrigendum = z.infer<typeof CorrigendumSchema>;


export const BidderSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  address: z.string().optional(),
  phoneNo: z.string().optional(),
  secondaryPhoneNo: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  quotedAmount: optionalNumberSchema,
  quotedPercentage: optionalNumberSchema,
  aboveBelow: z.enum(['Above', 'Below']).optional(),
  status: z.enum(['Accepted', 'Rejected']).optional(),
  order: z.number().optional(),
});
export type Bidder = z.infer<typeof BidderSchema>;

export const committeeMemberDesignations: Designation[] = [
    "Assistant Executive Engineer",
    "Assistant Engineer",
    "Master Driller",
    "Senior Driller",
];

export const TenderOpeningDetailsSchema = z.object({
    dateOfOpeningBid: z.any().optional().nullable(),
    dateOfTechnicalAndFinancialBidOpening: z.any().optional().nullable(),
    technicalCommitteeMember1: z.string().optional(),
    technicalCommitteeMember2: z.string().optional(),
    technicalCommitteeMember3: z.string().optional(),
});
export type TenderOpeningDetailsFormData = z.infer<typeof TenderOpeningDetailsSchema>;


export const WorkOrderDetailsSchema = z.object({
    agreementDate: z.any().optional().nullable(),
    nameOfAssistantEngineer: z.string().optional(),
    dateWorkOrder: z.any().optional().nullable(),
    // Supervisor 1
    supervisor1Id: z.string().optional().nullable(),
    supervisor1Name: z.string().optional().nullable(),
    supervisor1Phone: z.string().optional().nullable(),
    // Supervisor 2
    supervisor2Id: z.string().optional().nullable(),
    supervisor2Name: z.string().optional().nullable(),
    supervisor2Phone: z.string().optional().nullable(),
    // Supervisor 3
    supervisor3Id: z.string().optional().nullable(),
    supervisor3Name: z.string().optional().nullable(),
    supervisor3Phone: z.string().optional().nullable(),
});
export type WorkOrderDetailsFormData = z.infer<typeof WorkOrderDetailsSchema>;

export const SelectionNoticeDetailsSchema = z.object({
    selectionNoticeDate: z.any().optional().nullable(),
    performanceGuaranteeAmount: optionalNumberSchema,
    additionalPerformanceGuaranteeAmount: optionalNumberSchema,
    stampPaperAmount: optionalNumberSchema,
    // Descriptions for historical context
    performanceGuaranteeDescription: z.string().optional(),
    additionalPerformanceGuaranteeDescription: z.string().optional(),
    stampPaperDescription: z.string().optional(),
});
export type SelectionNoticeDetailsFormData = z.infer<typeof SelectionNoticeDetailsSchema>;

// This is the main schema for the entire form
export const E_tenderSchema = z.object({
    id: z.string().optional(),
    eTenderNo: z.string().optional(),
    tenderDate: z.any().optional().nullable(),
    fileNo: z.string().optional(),
    nameOfWork: z.string().optional(),
    nameOfWorkMalayalam: z.string().optional(),
    location: z.string().optional(),
    estimateAmount: optionalNumberSchema,
    tenderFormFee: optionalNumberSchema,
    emd: optionalNumberSchema,
    periodOfCompletion: optionalNumberSchema,
    dateTimeOfReceipt: z.any().optional().nullable(),
    dateTimeOfOpening: z.any().optional().nullable(),
    tenderType: z.enum(['Work', 'Purchase']).optional(),
    
    corrigendums: z.array(CorrigendumSchema).optional(),
    bidders: z.array(BidderSchema).optional(),
    
    dateOfOpeningBid: z.any().optional().nullable(),
    dateOfTechnicalAndFinancialBidOpening: z.any().optional().nullable(),
    technicalCommitteeMember1: z.string().optional(),
    technicalCommitteeMember2: z.string().optional(),
    technicalCommitteeMember3: z.string().optional(),
    
    selectionNoticeDate: z.any().optional().nullable(),
    performanceGuaranteeAmount: optionalNumberSchema,
    additionalPerformanceGuaranteeAmount: optionalNumberSchema,
    stampPaperAmount: optionalNumberSchema,
    
    agreementDate: z.any().optional().nullable(),
    dateWorkOrder: z.any().optional().nullable(),
    nameOfAssistantEngineer: z.string().optional(),
    
    // Supervisor 1
    supervisor1Id: z.string().optional().nullable(),
    supervisor1Name: z.string().optional().nullable(),
    supervisor1Phone: z.string().optional().nullable(),
    // Supervisor 2
    supervisor2Id: z.string().optional().nullable(),
    supervisor2Name: z.string().optional().nullable(),
    supervisor2Phone: z.string().optional().nullable(),
    // Supervisor 3
    supervisor3Id: z.string().optional().nullable(),
    supervisor3Name: z.string().optional().nullable(),
    supervisor3Phone: z.string().optional().nullable(),

    presentStatus: z.enum(eTenderStatusOptions).optional(),
    remarks: z.string().optional(),
    
    // Historical Descriptions
    tenderFeeDescription: z.string().optional(),
    emdDescription: z.string().optional(),
    performanceGuaranteeDescription: z.string().optional(),
    additionalPerformanceGuaranteeDescription: z.string().optional(),
    stampPaperDescription: z.string().optional(),
    
    // Deprecated fields that may exist in old data
    lastDateOfReceipt: z.any().optional(),
    timeOfReceipt: z.any().optional(),
    dateOfOpeningTender: z.any().optional(),
    timeOfOpeningTender: z.any().optional(),
    noOfBids: z.any().optional(),
    noOfTenderers: z.any().optional(),
    noOfSuccessfulTenderers: z.any().optional(),
    quotedPercentage: z.any().optional(),
    aboveBelow: z.any().optional(),
    nameOfSupervisor: z.string().optional(),
    supervisorPhoneNo: z.string().optional(),
});

export type E_tenderFormData = z.infer<typeof E_tenderSchema>;
