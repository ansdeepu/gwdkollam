// src/lib/schemas/eTenderSchema.ts
import { z } from 'zod';

const optionalDateSchema = z.preprocess((val) => (val ? new Date(val as string) : undefined), z.date().optional());
const optionalNumberSchema = z.preprocess((val) => (val === "" || val === null || val === undefined ? undefined : Number(val)), z.number().optional());

export const BasicDetailsSchema = z.object({
    eTenderNo: z.string().min(1, "eTender No. is required."),
    tenderDate: z.string().min(1, "Tender Date is required."),
    fileNo: z.string().min(1, "File No. is required."),
    nameOfWork: z.string().min(1, "Name of Work is required."),
    nameOfWorkMalayalam: z.string().optional(),
    location: z.string().min(1, "Location is required."),
    estimateAmount: z.number().min(0, "Estimate Amount cannot be negative."),
    tenderFormFee: z.number().min(0, "Tender Form Fee cannot be negative."),
    emd: z.number().min(0, "EMD cannot be negative."),
    periodOfCompletion: z.number().int().min(1, "Period of Completion must be at least 1 day."),
    lastDateOfReceipt: z.string().min(1, "Last Date of Receipt is required."),
    timeOfReceipt: z.string().min(1, "Time of Receipt is required."),
    dateOfOpeningTender: z.string().min(1, "Date of Opening Tender is required."),
    timeOfOpeningTender: z.string().min(1, "Time of Opening Tender is required."),
});
export type BasicDetailsFormData = z.infer<typeof BasicDetailsSchema>;

export const CorrigendumDetailsSchema = z.object({
    dateTimeOfReceipt: optionalDateSchema,
    dateTimeOfOpening: optionalDateSchema,
    corrigendumDate: optionalDateSchema,
    noOfBids: z.string().optional(),
});
export type CorrigendumDetailsFormData = z.infer<typeof CorrigendumDetailsSchema>;

export const BidderSchema = z.object({
    id: z.string(),
    name: z.string().min(1, "Bidder name is required."),
    address: z.string().optional(),
    quotedAmount: optionalNumberSchema,
    securityDepositType: z.string().optional(),
    securityDepositAmount: optionalNumberSchema,
    agreementAmount: optionalNumberSchema,
    additionalSecurityDeposit: optionalNumberSchema,
    dateSelectionNotice: optionalDateSchema,
});
export type Bidder = z.infer<typeof BidderSchema>;

export const TenderOpeningDetailsSchema = z.object({
    noOfTenderers: z.string().optional(),
    noOfSuccessfulTenderers: z.string().optional(),
    quotedPercentage: optionalNumberSchema,
    aboveBelow: z.enum(['Above', 'Below']).optional(),
    dateOfOpeningBid: optionalDateSchema,
    dateOfTechnicalAndFinancialBidOpening: optionalDateSchema,
    technicalCommitteeMember1: z.string().optional(),
    technicalCommitteeMember2: z.string().optional(),
    technicalCommitteeMember3: z.string().optional(),
    bidders: z.array(BidderSchema).optional(),
});
export type TenderOpeningDetailsFormData = z.infer<typeof TenderOpeningDetailsSchema>;

export const WorkOrderDetailsSchema = z.object({
    agreementDate: optionalDateSchema,
    nameOfAssistantEngineer: z.string().optional(),
    nameOfSupervisor: z.string().optional(),
    supervisorPhoneNo: z.string().optional(),
    dateWorkOrder: optionalDateSchema,
});
export type WorkOrderDetailsFormData = z.infer<typeof WorkOrderDetailsSchema>;

// Merge all schemas first
const MergedSchema = BasicDetailsSchema.merge(CorrigendumDetailsSchema)
    .merge(TenderOpeningDetailsSchema)
    .merge(WorkOrderDetailsSchema);

// Apply superRefine to the final merged schema
export const E_tenderSchema = MergedSchema.superRefine((data, ctx) => {
    const hasAnyTenderOpeningData =
        !!data.noOfTenderers ||
        !!data.noOfSuccessfulTenderers ||
        !!data.aboveBelow ||
        !!data.dateOfOpeningBid ||
        !!data.dateOfTechnicalAndFinancialBidOpening ||
        !!data.technicalCommitteeMember1 ||
        !!data.technicalCommitteeMember2 ||
        !!data.technicalCommitteeMember3 ||
        (data.bidders && data.bidders.length > 0);

    if (hasAnyTenderOpeningData && (data.quotedPercentage === undefined || data.quotedPercentage === null || isNaN(data.quotedPercentage))) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Quoted Percentage is required when other tender opening details are provided.",
            path: ["quotedPercentage"],
        });
    }
});

export type E_tenderFormData = z.infer<typeof E_tenderSchema>;