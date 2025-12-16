

import { z } from 'zod';
import { format, parse, isValid } from 'date-fns';

// Helper for robust optional numeric fields
export const optionalNumber = (errorMessage: string = "Must be a valid number.") =>
  z.preprocess((val) => {
    if (val === null || val === undefined || val === "") return undefined;
    if (typeof val === 'string' && isNaN(Number(val))) return undefined;
    return val;
}, z.coerce.number({ invalid_type_error: errorMessage }).min(0, "Cannot be negative.").optional());

// Use 'yyyy-MM-dd' for native date pickers
const nativeDateSchema = z.preprocess(
  (val) => (val === "" ? undefined : val), // Treat empty string as undefined
  z.string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)) || val === '', { message: "Invalid date" }) // Allow empty string
);

export const applicationTypeOptions = [
  "Private_Domestic",
  "Private_Irrigation",
  "Private_Institution",
  "Private_Industry",
  "LSGD",
  "Government_Institution",
  "Government_Water_Authority",
  "Government_PMKSY",
  "Government_Others",
  "Collector_MPLAD",
  "Collector_MLASDF",
  "Collector_MLA_Asset_Development_Fund",
  "Collector_DRW",
  "Collector_SC/ST",
  "Collector_ARWSS",
  "Collector_Others",
  "GWBDWS",
  "Other_Schemes",
] as const;
export type ApplicationType = typeof applicationTypeOptions[number];

export const applicationTypeDisplayMap = Object.fromEntries(
  applicationTypeOptions.map(option => [option, option.replace(/_/g, " ")])
) as Record<ApplicationType, string>;

export const constituencyOptions = [
    "Chadayamangalam",
    "Chathannoor",
    "Chavara",
    "Eravipuram",
    "Kollam",
    "Kottarakkara",
    "Kundara",
    "Kunnathur",
    "Karunagappally",
    "Pathanapuram",
    "Punalur"
] as const;
export type Constituency = typeof constituencyOptions[number];


export const remittedAccountOptions = [
  "SBI",
  "STSB",
  "Revenue Head",
  "Plan Fund",
] as const;
export type RemittedAccount = typeof remittedAccountOptions[number];

export const RemittanceDetailSchema = z.object({
  amountRemitted: optionalNumber("Amount Remitted must be a valid number."),
  dateOfRemittance: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.string().min(1, "Date of remittance is required.")
  ),
  remittedAccount: z.enum(remittedAccountOptions, { required_error: "Account is required." }),
  remittanceRemarks: z.string().optional(),
}).superRefine((data, ctx) => {
    // If an amount or account is present, date is strictly required.
    const hasAnyValue = (data.amountRemitted && data.amountRemitted > 0) || (data.remittanceRemarks && data.remittanceRemarks.trim() !== '');

    if (hasAnyValue && (!data.dateOfRemittance || !data.remittedAccount)) {
        if (!data.dateOfRemittance) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "is required when any other remittance detail is entered.",
                path: ["dateOfRemittance"],
            });
        }
        if (!data.remittedAccount) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "is required when any other remittance detail is entered.",
                path: ["remittedAccount"],
            });
        }
    }
});
export type RemittanceDetailFormData = z.infer<typeof RemittanceDetailSchema>;


export const paymentAccountOptions = [
  "SBI",
  "STSB",
  "Plan Fund",
] as const;
export type PaymentAccount = typeof paymentAccountOptions[number];

export const PaymentDetailSchema = z.object({
  dateOfPayment: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.string().min(1, "Date of payment is required.")
  ),
  paymentAccount: z.enum(paymentAccountOptions, { required_error: "Payment Account is required."}),
  revenueHead: optionalNumber("Revenue Head must be a valid number."),
  contractorsPayment: optionalNumber("Contractor's Payment must be a valid number."),
  gst: optionalNumber("GST must be a valid number."),
  incomeTax: optionalNumber("Income Tax must be a valid number."),
  kbcwb: optionalNumber("KBCWB must be a valid number."),
  refundToParty: optionalNumber("Refund to Party must be a valid number."),
  totalPaymentPerEntry: z.coerce.number().optional(),
  paymentRemarks: z.string().optional(),
}).superRefine((data, ctx) => {
    const hasAnyAmount =
        (data.revenueHead && data.revenueHead > 0) ||
        (data.contractorsPayment && data.contractorsPayment > 0) ||
        (data.gst && data.gst > 0) ||
        (data.incomeTax && data.incomeTax > 0) ||
        (data.kbcwb && data.kbcwb > 0) ||
        (data.refundToParty && data.refundToParty > 0);

    if (!hasAnyAmount && !data.paymentRemarks?.trim()) {
         ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "At least one payment amount or a remark is required.",
            path: ["contractorsPayment"], // Attach error to a field
        });
    }
});
export type PaymentDetailFormData = z.infer<typeof PaymentDetailSchema>;


export const siteWorkStatusOptions = [
  "Under Process",
  "Addl. AS Awaited",
  "To be Refunded",
  "Awaiting Dept. Rig",
  "To be Tendered",
  "TS Pending",
  "Tendered",
  "Selection Notice Issued",
  "Work Order Issued",
  "Work Initiated",
  "Work in Progress",
  "Work Failed",
  "Work Completed",
  "Bill Prepared",
  "Payment Completed",
  "Utilization Certificate Issued",
] as const;
export type SiteWorkStatus = typeof siteWorkStatusOptions[number];

export const fileStatusOptions = [
  "File Under Process",
  "Rig Accessibility Inspection",
  "Technical Sanction",
  "Tender Process",
  "Work Initiated",
  "Fully Completed",
  "Partially Completed",
  "Completed Except Disputed",
  "Partially Completed Except Disputed",
  "Fully Disputed",
  "To be Refunded",
  "Bill Preparation",
  "Payments",
  "Utilization Certificate",
  "File Closed",
] as const;
export type FileStatus = typeof fileStatusOptions[number];


export const sitePurposeOptions = [
  "BWC",
  "TWC",
  "FPW",
  "BW Dev",
  "TW Dev",
  "FPW Dev",
  "MWSS",
  "MWSS Ext",
  "Pumping Scheme",
  "MWSS Pump Reno",
  "HPS",
  "HPR",
  "ARS",
] as const;
export type SitePurpose = typeof sitePurposeOptions[number];

export const siteDiameterOptions = [
  "110 mm (4.5”)",
  "150 mm (6”)",
  "200 mm (8”)",
] as const;
export type SiteDiameter = typeof siteDiameterOptions[number];

export const siteTypeOfRigOptions = [
  "Rotary 7",
  "Rotary 8",
  "DTH Rig",
  "DTH Rig, W&S",
  "Other Dept Rig",
  "Filter Point Rig",
  "Private Rig",
] as const;
export type SiteTypeOfRig = typeof siteTypeOfRigOptions[number];

export const siteConditionsOptions = [
  'Accessible to Dept. Rig',
  'Accessible to Private Rig',
  'Inaccessible to Other Rigs',
  'Land Dispute',
  'Work Disputes and Conflicts',
] as const;
export type SiteConditions = typeof siteConditionsOptions[number];

const PURPOSES_REQUIRING_DIAMETER: SitePurpose[] = ["BWC", "TWC", "FPW", "BW Dev", "TW Dev", "FPW Dev"];
const FINAL_WORK_STATUSES: SiteWorkStatus[] = ['Work Failed', 'Work Completed'];

export const SiteDetailSchema = z.object({
  nameOfSite: z.string().min(1, "Name of Site is required."),
  localSelfGovt: z.string().optional(),
  constituency: z.preprocess((val) => (val === "" || val === null ? undefined : val), z.enum(constituencyOptions).optional()),
  latitude: optionalNumber("Latitude must be a valid number."),
  longitude: optionalNumber("Longitude must be a valid number."),
  purpose: z.enum(sitePurposeOptions, { required_error: "Purpose is required." }),
  estimateAmount: optionalNumber("Estimate Amount must be a valid number."),
  remittedAmount: optionalNumber("Remitted Amount must be a valid number."),
  siteConditions: z.preprocess((val) => (val === "" || val === null ? undefined : val), z.enum(siteConditionsOptions).optional()),
  accessibleRig: z.string().optional().nullable(),
  tsAmount: optionalNumber("TS Amount must be a valid number."),
  additionalAS: z.enum(['Yes', 'No']).optional().nullable().default('No'),
  tenderNo: z.string().optional(),
  diameter: z.preprocess((val) => (val === "" || val === null ? undefined : val), z.enum(siteDiameterOptions).optional()),
  pilotDrillingDepth: z.string().optional().nullable(),
  totalDepth: optionalNumber("Total Depth must be a valid number."),
  casingPipeUsed: z.string().optional().nullable(),
  outerCasingPipe: z.string().optional().nullable(),
  innerCasingPipe: z.string().optional().nullable(),
  yieldDischarge: z.string().optional().nullable(),
  zoneDetails: z.string().optional().nullable(),
  waterLevel: z.string().optional().nullable(),
  drillingRemarks: z.string().optional().nullable().default(""),
  developingRemarks: z.string().optional().nullable().default(""), // Added this line
  pumpDetails: z.string().optional().nullable(),
  pumpingLineLength: z.string().optional().nullable(),
  deliveryLineLength: z.string().optional().nullable(),
  waterTankCapacity: z.string().optional().nullable(),
  noOfTapConnections: optionalNumber("Tap Connections must be a valid number."),
  noOfBeneficiary: z.string().optional().nullable(),
  dateOfCompletion: nativeDateSchema.optional().nullable(),
  typeOfRig: z.preprocess((val) => (val === "" || val === null || val === '_clear_' ? undefined : val), z.enum(siteTypeOfRigOptions).optional()),
  contractorName: z.string().optional(),
  supervisorUid: z.string().optional().nullable(),
  supervisorName: z.string().optional().nullable(),
  supervisorDesignation: z.string().optional().nullable(),
  totalExpenditure: optionalNumber("Total Expenditure must be a valid number."),
  workStatus: z.enum(siteWorkStatusOptions, { required_error: "Work Status is required." }),
  workRemarks: z.string().optional().nullable().default(""),

  // Survey fields (Actuals)
  surveyOB: z.string().optional().nullable(),
  surveyLocation: z.string().optional().nullable(),
  surveyPlainPipe: z.string().optional().nullable(),
  surveySlottedPipe: z.string().optional().nullable(),

  // Survey Details (Recommended)
  surveyRemarks: z.string().optional().nullable(),
  surveyRecommendedDiameter: z.string().optional().nullable(),
  surveyRecommendedTD: z.string().optional().nullable(),
  surveyRecommendedOB: z.string().optional().nullable(),
  surveyRecommendedCasingPipe: z.string().optional().nullable(),
  surveyRecommendedPlainPipe: z.string().optional().nullable(),
  surveyRecommendedSlottedPipe: z.string().optional().nullable(),
  surveyRecommendedMsCasingPipe: z.string().optional().nullable(),

  // ARS specific fields
  arsTypeOfScheme: z.string().optional().nullable(),
  arsPanchayath: z.string().optional().nullable(),
  arsBlock: z.string().optional().nullable(),
  arsAsTsDetails: z.string().optional().nullable(),
  arsSanctionedDate: nativeDateSchema,
  arsTenderedAmount: optionalNumber("Tendered Amount must be a valid number."),
  arsAwardedAmount: optionalNumber("Awarded Amount must be a valid number."),
  arsNumberOfStructures: optionalNumber("Number of Structures must be a valid number."),
  arsStorageCapacity: optionalNumber("Storage Capacity must be a valid number."),
  arsNumberOfFillings: optionalNumber("Number of Fillings must be a valid number."),
  isArsImport: z.boolean().optional(),
  isPending: z.boolean().optional(), // Internal state, not part of form

}).superRefine((data, ctx) => {
    if (data.workStatus && FINAL_WORK_STATUSES.includes(data.workStatus as SiteWorkStatus) && !data.dateOfCompletion) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `is required when status is '${data.workStatus}'.`,
            path: ["dateOfCompletion"],
        });
    }
    if (data.purpose && PURPOSES_REQUIRING_DIAMETER.includes(data.purpose as SitePurpose) && !data.diameter) {
         ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "is required for this purpose.",
            path: ["diameter"],
        });
    }
});
export type SiteDetailFormData = z.infer<typeof SiteDetailSchema>;


export const DataEntrySchema = z.object({
  id: z.string().optional(),
  fileNo: z.string().min(1, "File No. is required."),
  applicantName: z.string().min(1, "Name & Address of Institution / Applicant is required."),
  phoneNo: z.string().optional(),
  secondaryMobileNo: z.string().optional(),
  applicationType: z.enum(applicationTypeOptions).optional(),
  constituency: z.preprocess((val) => (val === "" || val === null ? undefined : val), z.enum(constituencyOptions).optional()),
  estimateAmount: optionalNumber("Estimate Amount must be a valid number."),
  assignedSupervisorUids: z.array(z.string()).optional(),

  remittanceDetails: z.array(RemittanceDetailSchema)
    .min(1, "At least one remittance detail is required.")
    .max(10, "You can add a maximum of 10 remittance details."),
  totalRemittance: z.coerce.number().optional(),

  siteDetails: z.array(SiteDetailSchema).optional(),

  paymentDetails: z.array(PaymentDetailSchema)
    .max(10, "You can add a maximum of 10 payment entries.")
    .optional(),
  totalPaymentAllEntries: z.coerce.number().optional(),
  overallBalance: z.coerce.number().optional(),

  fileStatus: z.enum(fileStatusOptions).optional(),
  remarks: z.string().optional(),
}).superRefine((data, ctx) => {
    if (!data.fileStatus) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "File Status is required.",
            path: ["fileStatus"],
        });
    }
    if (!data.applicationType) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Application Type is required.",
            path: ["applicationType"],
        });
    }
});
export type DataEntryFormData = z.infer<typeof DataEntrySchema>;
