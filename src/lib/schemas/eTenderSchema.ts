// src/lib/schemas/eTenderSchema.ts
import { z } from 'zod';

const optionalNumberSchema = z.preprocess(
    (val) => {
        if (val === "" || val === null || val === undefined) return null;
        const num = Number(val);
        return isNaN(num) ? val : num;
    }, 
    z.number({ invalid_type_error: "Must be a valid number." }).min(0, "Cannot be negative.").nullable().optional()
);

const optionalStringSchema = z.string().optional().nullable();


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
    eTenderNo: optionalStringSchema,
    tenderDate: z.any().optional().nullable(),
    fileNo: optionalStringSchema,
    fileNo2: optionalStringSchema,
    fileNo3: optionalStringSchema,
    fileNo4: optionalStringSchema,
    nameOfWork: optionalStringSchema,
    nameOfWorkMalayalam: optionalStringSchema,
    location: optionalStringSchema,
    estimateAmount: optionalNumberSchema,
    tenderFormFee: optionalNumberSchema,
    emd: optionalNumberSchema,
    periodOfCompletion: optionalNumberSchema,
    dateTimeOfReceipt: z.any().optional().nullable(),
    dateTimeOfOpening: z.any().optional().nullable(),
    tenderType: z.enum(['Work', 'Purchase']).optional().nullable(),
    detailedEstimateUrl: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')).nullable(),
    // Descriptions for historical context
    tenderFeeDescription: optionalStringSchema,
    emdDescription: optionalStringSchema,
});
export type BasicDetailsFormData = z.infer<typeof BasicDetailsSchema>;

export const corrigendumTypeOptions = ["Date Extension", "Cancel", "Retender"] as const;
export type CorrigendumType = typeof corrigendumTypeOptions[number];

export const CorrigendumSchema = z.object({
    id: z.string(),
    corrigendumType: z.enum(corrigendumTypeOptions).optional().nullable(),
    corrigendumDate: z.any().optional().nullable(),
    reason: optionalStringSchema,
    lastDateOfReceipt: z.any().optional().nullable(),
    dateOfOpeningTender: z.any().optional().nullable(),
});
export type Corrigendum = z.infer<typeof CorrigendumSchema>;

export const RetenderDetailsSchema = z.object({
    id: z.string(),
    retenderDate: z.any().optional().nullable(),
    lastDateOfReceipt: z.any().optional().nullable(),
    dateOfOpeningTender: z.any().optional().nullable(),
});
export type RetenderDetails = z.infer<typeof RetenderDetailsSchema>;


export const NewBidderSchema = z.object({
  name: z.string().min(1, "Bidder Name is required."),
  address: optionalStringSchema,
  phoneNo: optionalStringSchema,
  secondaryPhoneNo: optionalStringSchema,
  email: z.string().email({ message: "Please enter a valid email." }).optional().or(z.literal('')).nullable(),
  order: z.number().optional(),
});
export type NewBidderFormData = z.infer<typeof NewBidderSchema>;


export const BidderSchema = NewBidderSchema.extend({
  id: z.string(),
  quotedAmount: optionalNumberSchema,
  quotedPercentage: optionalNumberSchema,
  aboveBelow: z.enum(['Above', 'Below']).optional().nullable(),
  status: z.enum(['Accepted', 'Rejected']).optional().nullable(),
  remarks: optionalStringSchema,
  // Deprecated fields - keep for compatibility if needed
  securityDepositType: optionalStringSchema,
  securityDepositAmount: optionalNumberSchema,
  agreementAmount: optionalNumberSchema,
  additionalSecurityDeposit: optionalNumberSchema,
  dateSelectionNotice: z.any().optional().nullable(),
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
    technicalCommitteeMember1: z.string().optional().nullable(),
    technicalCommitteeMember2: z.string().optional().nullable(),
    technicalCommitteeMember3: z.string().optional().nullable(),
});
export type TenderOpeningDetailsFormData = z.infer<typeof TenderOpeningDetailsSchema>;


export const WorkOrderDetailsSchema = z.object({
    agreementDate: z.any().optional().nullable(),
    nameOfAssistantEngineer: optionalStringSchema,
    dateWorkOrder: z.any().optional().nullable(),
    // Supervisor 1
    supervisor1Id: optionalStringSchema,
    supervisor1Name: optionalStringSchema,
    supervisor1Phone: optionalStringSchema,
    // Supervisor 2
    supervisor2Id: optionalStringSchema,
    supervisor2Name: optionalStringSchema,
    supervisor2Phone: optionalStringSchema,
    // Supervisor 3
    supervisor3Id: optionalStringSchema,
    supervisor3Name: optionalStringSchema,
    supervisor3Phone: optionalStringSchema,
});
export type WorkOrderDetailsFormData = z.infer<typeof WorkOrderDetailsSchema>;

export const SelectionNoticeDetailsSchema = z.object({
    selectionNoticeDate: z.any().optional().nullable(),
    performanceGuaranteeAmount: optionalNumberSchema,
    additionalPerformanceGuaranteeAmount: optionalNumberSchema,
    stampPaperAmount: optionalNumberSchema,
    agreedPercentage: optionalNumberSchema,
    agreedAmount: optionalNumberSchema,
    // Descriptions for historical context
    performanceGuaranteeDescription: optionalStringSchema,
    additionalPerformanceGuaranteeDescription: optionalStringSchema,
    stampPaperDescription: optionalStringSchema,
});
export type SelectionNoticeDetailsFormData = z.infer<typeof SelectionNoticeDetailsSchema>;

// This is the main schema for the entire form
export const E_tenderSchema = z.object({
    id: z.string().optional(),
    eTenderNo: optionalStringSchema,
    tenderDate: z.any().optional().nullable(),
    fileNo: optionalStringSchema,
    fileNo2: optionalStringSchema,
    fileNo3: optionalStringSchema,
    fileNo4: optionalStringSchema,
    nameOfWork: optionalStringSchema,
    nameOfWorkMalayalam: optionalStringSchema,
    location: optionalStringSchema,
    estimateAmount: optionalNumberSchema,
    tenderFormFee: optionalNumberSchema,
    emd: optionalNumberSchema,
    periodOfCompletion: optionalNumberSchema,
    dateTimeOfReceipt: z.any().optional().nullable(),
    dateTimeOfOpening: z.any().optional().nullable(),
    tenderType: z.enum(['Work', 'Purchase']).optional().nullable(),
    detailedEstimateUrl: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')).nullable(),
    
    corrigendums: z.array(CorrigendumSchema).optional(),
    retenders: z.array(RetenderDetailsSchema).optional(),
    bidders: z.array(BidderSchema).optional(),
    
    dateOfOpeningBid: z.any().optional().nullable(),
    dateOfTechnicalAndFinancialBidOpening: z.any().optional().nullable(),
    technicalCommitteeMember1: optionalStringSchema,
    technicalCommitteeMember2: optionalStringSchema,
    technicalCommitteeMember3: optionalStringSchema,
    
    selectionNoticeDate: z.any().optional().nullable(),
    performanceGuaranteeAmount: optionalNumberSchema,
    additionalPerformanceGuaranteeAmount: optionalNumberSchema,
    stampPaperAmount: optionalNumberSchema,
    agreedPercentage: optionalNumberSchema,
    agreedAmount: optionalNumberSchema,
    
    agreementDate: z.any().optional().nullable(),
    dateWorkOrder: z.any().optional().nullable(),
    nameOfAssistantEngineer: optionalStringSchema,
    
    // Supervisor 1
    supervisor1Id: optionalStringSchema,
    supervisor1Name: optionalStringSchema,
    supervisor1Phone: optionalStringSchema,
    // Supervisor 2
    supervisor2Id: optionalStringSchema,
    supervisor2Name: optionalStringSchema,
    supervisor2Phone: optionalStringSchema,
    // Supervisor 3
    supervisor3Id: optionalStringSchema,
    supervisor3Name: optionalStringSchema,
    supervisor3Phone: optionalStringSchema,

    presentStatus: z.enum(eTenderStatusOptions).optional().nullable(),
    remarks: optionalStringSchema,
    
    // Historical Descriptions
    tenderFeeDescription: optionalStringSchema,
    emdDescription: optionalStringSchema,
    performanceGuaranteeDescription: optionalStringSchema,
    additionalPerformanceGuaranteeDescription: optionalStringSchema,
    stampPaperDescription: optionalStringSchema,
    
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
    nameOfSupervisor: optionalStringSchema,
    supervisorPhoneNo: optionalStringSchema,
});

export type E_tenderFormData = z.infer<typeof E_tenderSchema>;
