// src/lib/schemas/eTenderSchema.ts
import { z } from 'zod';

const optionalDateSchema = z.preprocess((val) => (val ? new Date(val as string) : null), z.date().optional().nullable());
const optionalDateTimeSchema = z.preprocess((val) => (val ? new Date(val as string) : null), z.date().optional().nullable());
const optionalNumberSchema = z.preprocess((val) => (val === "" || val === null || val === undefined ? undefined : Number(val)), z.number().optional());

export const eTenderStatusOptions = [
    "Tender Process",
    "Selection Notice Issued",
    "Work Order Issued",
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
    eTenderNo: z.string().min(1, "eTender No. is required."),
    tenderDate: z.union([z.string(), z.date()]).refine(val => val, { message: "Tender Date is required." }),
    fileNo: z.string().min(1, "File No. is required."),
    nameOfWork: z.string().min(1, "Name of Work is required."),
    nameOfWorkMalayalam: z.string().optional(),
    location: z.string().min(1, "Location is required."),
    estimateAmount: z.number().min(0, "Tender Amount cannot be negative."),
    tenderFormFee: z.number().min(0, "Tender Form Fee cannot be negative."),
    emd: z.number().min(0, "EMD cannot be negative."),
    periodOfCompletion: z.number().int().min(1, "Period of Completion must be at least 1 day."),
    dateTimeOfReceipt: z.union([z.string(), z.date()]).refine(val => val, { message: "Last Date & Time of Receipt is required." }),
    dateTimeOfOpening: z.union([z.string(), z.date()]).refine(val => val, { message: "Date & Time of Opening Tender is required." }),
    tenderType: z.enum(['Work', 'Purchase']).optional(),
});
export type BasicDetailsFormData = z.infer<typeof BasicDetailsSchema>;

export const corrigendumTypeOptions = ["Date Extension", "Cancel", "Retender"] as const;
export type CorrigendumType = typeof corrigendumTypeOptions[number];

export const CorrigendumSchema = z.object({
    id: z.string(),
    corrigendumType: z.enum(corrigendumTypeOptions).optional(),
    corrigendumDate: optionalDateSchema,
    reason: z.string().optional(),
    lastDateOfReceipt: optionalDateTimeSchema,
    dateOfOpeningTender: optionalDateTimeSchema,
});
export type Corrigendum = z.infer<typeof CorrigendumSchema>;


export const BidderSchema = z.object({
    id: z.string(),
    name: z.string().min(1, "Bidder name is required."),
    address: z.string().optional(),
    quotedAmount: optionalNumberSchema,
    quotedPercentage: optionalNumberSchema,
    aboveBelow: z.enum(['Above', 'Below']).optional(),
    status: z.enum(['Accepted', 'Rejected']).optional(),
});
export type Bidder = z.infer<typeof BidderSchema>;

export const committeeMemberDesignations: Designation[] = [
    "Assistant Executive Engineer",
    "Assistant Engineer",
    "Master Driller",
    "Senior Driller",
];

export const TenderOpeningDetailsSchema = z.object({
    dateOfOpeningBid: z.string().optional().nullable(),
    dateOfTechnicalAndFinancialBidOpening: z.string().optional().nullable(),
    technicalCommitteeMember1: z.string().optional(),
    technicalCommitteeMember2: z.string().optional(),
    technicalCommitteeMember3: z.string().optional(),
});
export type TenderOpeningDetailsFormData = z.infer<typeof TenderOpeningDetailsSchema>;


export const WorkOrderDetailsSchema = z.object({
    agreementDate: z.string().optional().nullable(),
    nameOfAssistantEngineer: z.string().optional(),
    nameOfSupervisor: z.string().optional(),
    supervisorPhoneNo: z.string().optional(),
    dateWorkOrder: z.string().optional().nullable(),
});
export type WorkOrderDetailsFormData = z.infer<typeof WorkOrderDetailsSchema>;

export const SelectionNoticeDetailsSchema = z.object({
    selectionNoticeDate: z.string().optional().nullable(),
    performanceGuaranteeAmount: optionalNumberSchema,
    additionalPerformanceGuaranteeAmount: optionalNumberSchema,
    stampPaperAmount: optionalNumberSchema,
});
export type SelectionNoticeDetailsFormData = z.infer<typeof SelectionNoticeDetailsSchema>;

// Merge all schemas first
const MergedSchema = BasicDetailsSchema
    .merge(TenderOpeningDetailsSchema)
    .merge(WorkOrderDetailsSchema)
    .merge(SelectionNoticeDetailsSchema)
    .extend({
        corrigendums: z.array(CorrigendumSchema).optional(),
        bidders: z.array(BidderSchema).optional(),
        presentStatus: z.enum(eTenderStatusOptions).optional(),
    });

// Apply superRefine to the final merged schema
export const E_tenderSchema = MergedSchema.superRefine((data, ctx) => {
    // No custom validation needed here now
});

export type E_tenderFormData = z.infer<typeof E_tenderSchema>;
