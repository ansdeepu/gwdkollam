
import { z } from 'zod';
import { format } from 'date-fns';

export const LoginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});
export type LoginFormData = z.infer<typeof LoginSchema>;

export const RegisterSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match.",
  path: ['confirmPassword'],
});
export type RegisterFormData = z.infer<typeof RegisterSchema>;

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

// Schema for new user creation by an admin
export const NewUserByAdminSchema = z.object({
  designation: z.enum(designationOptions, { required_error: "Please select a designation." }),
  staffId: z.string({ required_error: "Please select a staff member." }).min(1, "Please select a staff member."),
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});
export type NewUserByAdminFormData = z.infer<typeof NewUserByAdminSchema>;

export const userRoleOptions = ['editor', 'supervisor', 'viewer'] as const;
export type UserRole = typeof userRoleOptions[number];

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


export const remittedAccountOptions = [
  "SBI",
  "STSB",
  "RevenueHead",
] as const;
export type RemittedAccount = typeof remittedAccountOptions[number];

export const paymentAccountOptions = [
  "SBI",
  "STSB",
] as const;
export type PaymentAccount = typeof paymentAccountOptions[number];


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
  "Land Dispute",
  "Inaccessible to Other Rigs",
  "Work Disputes and Conflicts",
  "Accessible to Dept. Rig",
  "Accessible to Private Rig",
] as const;
export type SiteConditions = typeof siteConditionsOptions[number];

export const rigAccessibilityOptions = [
  'Accessible to Dept. Rig',
  'Accessible to Private Rig',
  'Inaccessible to Other Rigs',
  'Land Dispute',
] as const;
export type RigAccessibility = typeof rigAccessibilityOptions[number];

// Helper for robust optional numeric fields
const optionalNumber = (errorMessage: string = "Must be a valid number.") =>
  z.preprocess((val) => {
    if (val === null || val === undefined || val === "") return undefined;
    if (typeof val === 'string' && isNaN(Number(val))) return undefined;
    return val;
}, z.coerce.number({ invalid_type_error: errorMessage }).min(0, "Cannot be negative.").optional());

const optionalDate = z.preprocess((val) => {
  if (!val) return undefined;
  if (typeof val === 'string' || val instanceof Date) {
    const date = new Date(val);
    return isNaN(date.getTime()) ? undefined : date;
  }
  return undefined;
}, z.date().optional().nullable());


export const constituencyOptions = [
    "Chadayamangalam",
    "Chathannoor",
    "Chavara",
    "Eravipuram",
    "Kollam",
    "Kottarakkara",
    "Kundara",
    "Kunnathur",
    "Pathanapuram",
    "Punalur"
] as const;
export type Constituency = typeof constituencyOptions[number];

const PURPOSES_REQUIRING_DIAMETER: SitePurpose[] = ["BWC", "TWC", "FPW", "BW Dev", "TW Dev", "FPW Dev"];

export const SiteDetailSchema = z.object({
  nameOfSite: z.string().min(1, "Name of Site is required."),
  constituency: z.enum(constituencyOptions).optional(),
  latitude: optionalNumber("Latitude must be a valid number."),
  longitude: optionalNumber("Longitude must be a valid number."),
  purpose: z.enum(sitePurposeOptions, { required_error: "Purpose is required."}),
  estimateAmount: optionalNumber("Estimate Amount must be a valid number."),
  remittedAmount: optionalNumber("Remitted Amount must be a valid number."),
  siteConditions: z.preprocess((val) => (val === "" || val === null ? undefined : val), z.enum(siteConditionsOptions).optional()),
  accessibleRig: z.preprocess((val) => (val === "" || val === null ? undefined : val), z.enum(rigAccessibilityOptions).optional()),
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
  pumpDetails: z.string().optional().nullable(),
  pumpingLineLength: z.string().optional().nullable(),
  deliveryLineLength: z.string().optional().nullable(),
  waterTankCapacity: z.string().optional().nullable(),
  noOfTapConnections: optionalNumber("Tap Connections must be a valid number."),
  noOfBeneficiary: z.string().optional().nullable(),
  dateOfCompletion: optionalDate,
  typeOfRig: z.preprocess((val) => (val === "" || val === null ? undefined : val), z.enum(siteTypeOfRigOptions).optional()),
  contractorName: z.string().optional(),
  supervisorUid: z.string().optional().nullable(),
  supervisorName: z.string().optional().nullable(),
  totalExpenditure: optionalNumber("Total Expenditure must be a valid number."),
  workStatus: z.enum(siteWorkStatusOptions, { required_error: "Work Status is required."}),
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
  arsSanctionedDate: optionalDate,
  arsTenderedAmount: optionalNumber("Tendered Amount must be a valid number."),
  arsAwardedAmount: optionalNumber("Awarded Amount must be a valid number."),
  arsNumberOfStructures: optionalNumber("Number of Structures must be a valid number."),
  arsStorageCapacity: optionalNumber("Storage Capacity must be a valid number."),
  arsNumberOfFillings: optionalNumber("Number of Fillings must be a valid number."),
  isArsImport: z.boolean().optional(),

}).superRefine((data, ctx) => {
    const finalStatuses: SiteWorkStatus[] = ['Work Completed', 'Work Failed', 'Bill Prepared', 'Payment Completed', 'Utilization Certificate Issued'];
    if (data.workStatus && finalStatuses.includes(data.workStatus) && !data.dateOfCompletion) {
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

export const RemittanceDetailSchema = z.object({
  amountRemitted: optionalNumber("Amount Remitted must be a valid number."),
  dateOfRemittance: optionalDate,
  remittedAccount: z.preprocess((val) => (val === "" || val === null ? undefined : val), z.enum(remittedAccountOptions).optional()),
}).superRefine((data, ctx) => {
    if (data.amountRemitted && data.amountRemitted > 0) {
        if (!data.dateOfRemittance) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "is required when an amount is entered.",
                path: ["dateOfRemittance"],
            });
        }
        if (!data.remittedAccount) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "is required when an amount is entered.",
                path: ["remittedAccount"],
            });
        }
    }
});
export type RemittanceDetailFormData = z.infer<typeof RemittanceDetailSchema>;

export const PaymentDetailSchema = z.object({
  dateOfPayment: optionalDate,
  paymentAccount: z.preprocess((val) => (val === "" || val === null ? undefined : val), z.enum(paymentAccountOptions).optional()),
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

    if (hasAnyAmount) {
        if (!data.dateOfPayment) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "is required when any payment amount is entered.",
                path: ["dateOfPayment"],
            });
        }
        if (!data.paymentAccount) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "is required when any payment amount is entered.",
                path: ["paymentAccount"],
            });
        }
    }
});
export type PaymentDetailFormData = z.infer<typeof PaymentDetailSchema>;

export const DataEntrySchema = z.object({
  id: z.string().optional(),
  fileNo: z.string().min(1, "File No. is required."),
  applicantName: z.string().min(1, "Name & Address of Institution / Applicant is required."),
  phoneNo: z.string().optional(),
  constituency: z.enum(constituencyOptions).optional(),
  applicationType: z.enum(applicationTypeOptions, { required_error: "Type of Application is required."}).optional(),
  estimateAmount: optionalNumber("Estimate Amount must be a valid number."),
  assignedSupervisorUids: z.array(z.string()).optional(),

  remittanceDetails: z.array(RemittanceDetailSchema)
    .max(10, "You can add a maximum of 10 remittance details.")
    .optional(),
  totalRemittance: z.coerce.number().optional(),

  siteDetails: z.array(SiteDetailSchema).optional(),

  paymentDetails: z.array(PaymentDetailSchema)
    .max(10, "You can add a maximum of 10 payment entries.")
    .optional(),
  totalPaymentAllEntries: z.coerce.number().optional(),
  overallBalance: z.coerce.number().optional(),

  fileStatus: z.enum(fileStatusOptions, { required_error: "File Status is required."}),
  remarks: z.string().optional(),
});
export type DataEntryFormData = z.infer<typeof DataEntrySchema>;

// Schema for Pending Updates
export const PendingUpdateFormDataSchema = z.object({
  fileNo: z.string(),
  updatedSiteDetails: z.array(SiteDetailSchema),
  submittedByUid: z.string(),
  submittedByName: z.string(),
  submittedAt: z.any(), // serverTimestamp()
  status: z.enum(['pending', 'approved', 'rejected']),
});
export type PendingUpdateFormData = z.infer<typeof PendingUpdateFormDataSchema>;

export const PendingUpdateSchema = PendingUpdateFormDataSchema.extend({
  id: z.string(),
  submittedAt: z.date(),
  reviewedByUid: z.string().optional(),
  reviewedAt: z.date().optional(),
});
export type PendingUpdate = z.infer<typeof PendingUpdateSchema>;


// Helper function to join values from an array of objects
const join = (arr: any[] | undefined, key: string, separator: string = '; '): string => {
  if (!arr || arr.length === 0) return 'N/A';
  return arr.map(item => item[key] || 'N/A').join(separator);
};

// Helper function to sum values from an array of objects
const sum = (arr: any[] | undefined, key: string): number => {
  if (!arr) return 0;
  return arr.reduce((acc, item) => acc + (Number(item[key]) || 0), 0);
};

// Helper function to format dates from an array of objects
const formatDate = (date: Date | string | null | undefined): string => {
  if (!date) return 'N/A';
  try {
    return format(new Date(date), "dd/MM/yyyy");
  } catch {
    return 'Invalid Date';
  }
};

export const reportableFields: Array<{ id: string; label: string; accessor: (entry: DataEntryFormData) => string | number | undefined | null }> = [
  // === Main File Details ===
  { id: 'fileNo', label: 'File No.', accessor: (entry) => entry.fileNo },
  { id: 'applicantName', label: 'Applicant Name', accessor: (entry) => entry.applicantName },
  { id: 'phoneNo', label: 'Phone No.', accessor: (entry) => entry.phoneNo },
  { id: 'applicationType', label: 'Application Type', accessor: (entry) => entry.applicationType ? applicationTypeDisplayMap[entry.applicationType] : undefined },
  { id: 'fileStatus', label: 'File Status', accessor: (entry) => entry.fileStatus },
  { id: 'fileRemarks', label: 'File Remarks', accessor: (entry) => entry.remarks },

  // === Remittance Details (Aggregated) ===
  { id: 'firstRemittanceDate', label: 'First Remittance Date', accessor: (entry) => formatDate(entry.remittanceDetails?.[0]?.dateOfRemittance) },
  { id: 'allRemittanceDates', label: 'All Remittance Dates', accessor: (entry) => entry.remittanceDetails?.map(rd => formatDate(rd.dateOfRemittance)).join('; ') || 'N/A' },
  { id: 'totalRemittance', label: 'Total Remittance (₹)', accessor: (entry) => entry.totalRemittance },
  { id: 'remittanceAccounts', label: 'Remittance Accounts', accessor: (entry) => join(entry.remittanceDetails, 'remittedAccount') },

  // === Site Details (Aggregated) ===
  { id: 'allSiteNames', label: 'Site Names', accessor: (entry) => join(entry.siteDetails, 'nameOfSite') },
  { id: 'allSitePurposes', label: 'Site Purposes', accessor: (entry) => join(entry.siteDetails, 'purpose') },
  { id: 'allSiteWorkStatuses', label: 'Site Work Statuses', accessor: (entry) => join(entry.siteDetails, 'workStatus') },
  { id: 'allSiteSupervisors', label: 'Site Supervisors', accessor: (entry) => [...new Set(entry.siteDetails?.map(s => s.supervisorName).filter(Boolean))].join('; ') || 'N/A' },
  { id: 'allContractors', label: 'Contractor Names', accessor: (entry) => [...new Set(entry.siteDetails?.map(s => s.contractorName).filter(Boolean))].join('; ') || 'N/A' },
  { id: 'allSiteCompletionDates', label: 'Site Completion Dates', accessor: (entry) => join(entry.siteDetails, 'dateOfCompletion', '; ') },
  { id: 'allTenderNos', label: 'Tender Nos.', accessor: (entry) => join(entry.siteDetails, 'tenderNo') },
  { id: 'allTypeOfRigs', label: 'Types of Rig', accessor: (entry) => join(entry.siteDetails, 'typeOfRig') },

  // === Financial Summary (Aggregated) ===
  { id: 'totalSiteEstimate', label: 'Total Site Estimate (₹)', accessor: (entry) => sum(entry.siteDetails, 'estimateAmount') },
  { id: 'totalSiteExpenditure', label: 'Total Site Expenditure (₹)', accessor: (entry) => sum(entry.siteDetails, 'totalExpenditure') },
  { id: 'totalPayment', label: 'Total Payment (₹)', accessor: (entry) => entry.totalPaymentAllEntries },
  { id: 'overallBalance', label: 'Overall Balance (₹)', accessor: (entry) => entry.overallBalance },
  
  // === Payment Details (Aggregated) ===
  { id: 'allPaymentDates', label: 'Payment Dates', accessor: (entry) => entry.paymentDetails?.map(pd => formatDate(pd.dateOfPayment)).join('; ') || 'N/A' },
  { id: 'totalContractorPayment', label: 'Total Contractor Payment (₹)', accessor: (entry) => sum(entry.paymentDetails, 'contractorsPayment') },
  { id: 'totalGst', label: 'Total GST (₹)', accessor: (entry) => sum(entry.paymentDetails, 'gst') },
  { id: 'totalIncomeTax', label: 'Total Income Tax (₹)', accessor: (entry) => sum(entry.paymentDetails, 'incomeTax') },
  { id: 'totalKbcwb', label: 'Total KBCWB (₹)', accessor: (entry) => sum(entry.paymentDetails, 'kbcwb') },
  { id: 'totalRefundToParty', label: 'Total Refund to Party (₹)', accessor: (entry) => sum(entry.paymentDetails, 'refundToParty') },
  { id: 'totalRevenueHead', label: 'Total to Revenue Head (₹)', accessor: (entry) => sum(entry.paymentDetails, 'revenueHead') },
];


export const CustomReportBuilderSchema = z.object({
  selectedHeadingIds: z.array(z.string()).min(1, { message: 'Please select at least one heading to include in the report.' }),
});
export type CustomReportBuilderData = z.infer<typeof CustomReportBuilderSchema>;

export const ReportFormatSuggestionSchema = z.object({
  dataDescription: z.string().min(10, { message: 'Data description must be at least 10 characters.' }),
  reportGoal: z.string().min(10, { message: 'Report goal must be at least 10 characters.' }),
});
export type ReportFormatSuggestionData = z.infer<typeof ReportFormatSuggestionSchema>;

// Notice Board Schemas
export const NoticeFormDataSchema = z.object({
  title: z.string().min(5, { message: "Title must be at least 5 characters." }).max(100, { message: "Title cannot exceed 100 characters." }),
  content: z.string().min(10, { message: "Content must be at least 10 characters." }).max(5000, { message: "Content cannot exceed 5000 characters." }),
});
export type NoticeFormData = z.infer<typeof NoticeFormDataSchema>;

export const NoticeSchema = NoticeFormDataSchema.extend({
  id: z.string(),
  createdAt: z.date(),
  postedByUid: z.string(),
  postedByName: z.string(),
});
export type Notice = z.infer<typeof NoticeSchema>;

// Establishment / Staff Schemas
export const staffStatusOptions = ["Active", "Transferred", "Retired"] as const;
export type StaffStatusType = typeof staffStatusOptions[number];

export const StaffMemberFormDataSchema = z.object({
  photoUrl: z.string().url({ message: "Please enter a valid image URL." }).optional().or(z.literal("")),
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  designation: z.enum(designationOptions, { required_error: "Designation is required." }),
  pen: z.string().min(1, { message: "PEN is required." }),
  dateOfBirth: z.date({ required_error: "Date of Birth is required." }),
  phoneNo: z.string().regex(/^\d{10}$/, { message: "Phone number must be 10 digits." }).optional().or(z.literal("")),
  roles: z.string().optional(),
  status: z.enum(staffStatusOptions).default('Active'),
  remarks: z.string().optional().default(""), 
});
export type StaffMemberFormData = z.infer<typeof StaffMemberFormDataSchema>;

export const StaffMemberSchema = StaffMemberFormDataSchema.extend({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  status: z.enum(staffStatusOptions).default('Active'), 
  remarks: z.string().optional().default(""),
});
export type StaffMember = z.infer<typeof StaffMemberSchema>;

// GWD Rates Schemas
export const GwdRateItemFormDataSchema = z.object({
  itemName: z.string().min(1, 'Item name is required.'),
  rate: z.coerce.number({ invalid_type_error: 'Rate must be a number.'}).min(0, 'Rate cannot be negative.'),
});
export type GwdRateItemFormData = z.infer<typeof GwdRateItemFormDataSchema>;

export const GwdRateItemSchema = GwdRateItemFormDataSchema.extend({
  id: z.string(),
  order: z.number().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type GwdRateItem = z.infer<typeof GwdRateItemSchema>;

export const UpdatePasswordSchema = z.object({
  currentPassword: z.string().min(1, { message: "Current password is required." }),
  newPassword: z.string().min(6, { message: "New password must be at least 6 characters." }),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "New passwords don't match.",
  path: ["confirmPassword"],
});
export type UpdatePasswordFormData = z.infer<typeof UpdatePasswordSchema>;

// Agency Registration Schemas
const OwnerInfoSchema = z.object({
  name: z.string().min(1, "Owner name is required."),
  address: z.string().optional(),
  mobile: z.string().optional(),
  secondaryMobile: z.string().optional(),
});
export type OwnerInfo = z.infer<typeof OwnerInfoSchema>;

const VehicleDetailsSchema = z.object({
  type: z.string().optional(),
  regNo: z.string().optional(),
  chassisNo: z.string().optional(),
  engineNo: z.string().optional(),
}).optional();

const CompressorDetailsSchema = z.object({
  model: z.string().optional(),
  capacity: z.string().optional(),
}).optional();

const GeneratorDetailsSchema = z.object({
  model: z.string().optional(),
  capacity: z.string().optional(),
  type: z.string().optional(),
  engineNo: z.string().optional(),
}).optional();

export const rigTypeOptions = [
    "DTH",
    "DTH Cum Rotary",
    "Filter Point",
    "Others",
] as const;
export type RigType = typeof rigTypeOptions[number];

export const RigRenewalSchema = z.object({
    id: z.string(),
    renewalDate: optionalDate.refine(val => val !== undefined, { message: "Renewal date is required." }),
    renewalFee: optionalNumber("Renewal fee is required."),
    paymentDate: optionalDate,
    challanNo: z.string().optional(),
    validTill: optionalDate,
});
export type RigRenewal = z.infer<typeof RigRenewalSchema>;

export const RigRegistrationSchema = z.object({
    id: z.string(),
    rigRegistrationNo: z.string().optional(),
    typeOfRig: z.enum(rigTypeOptions).optional(),
    registrationDate: optionalDate,
    registrationFee: optionalNumber(),
    paymentDate: optionalDate,
    challanNo: z.string().optional(),
    rigVehicle: VehicleDetailsSchema,
    compressorVehicle: VehicleDetailsSchema,
    supportingVehicle: VehicleDetailsSchema,
    compressorDetails: CompressorDetailsSchema,
    generatorDetails: GeneratorDetailsSchema,
    status: z.enum(['Active', 'Cancelled']),
    renewals: z.array(RigRenewalSchema).optional(),
    history: z.array(z.string()).optional(),
    cancellationDate: optionalDate,
    cancellationReason: z.string().optional(),
});
export type RigRegistration = z.infer<typeof RigRegistrationSchema>;

export const AgencyApplicationSchema = z.object({
  id: z.string().optional(),
  fileNo: z.string().optional(),
  agencyName: z.string().min(1, "Agency name & address is required."),
  owner: OwnerInfoSchema,
  partners: z.array(OwnerInfoSchema).optional(),
  agencyRegistrationNo: z.string().optional(),
  agencyRegistrationDate: optionalDate,
  agencyRegistrationFee: optionalNumber(),
  agencyPaymentDate: optionalDate,
  agencyChallanNo: z.string().optional(),
  rigs: z.array(RigRegistrationSchema),
  status: z.enum(['Active', 'Pending Verification']),
  history: z.array(z.string()).optional(),
});
export type AgencyApplication = z.infer<typeof AgencyApplicationSchema>;

// ARS Schemas
export const arsWorkStatusOptions = [
  "Proposal Submitted",
  "AS & TS Issued",
  "Tendered",
  "Selection Notice Issued",
  "Work Order Issued",
  "Work Initiated",
  "Work in Progress",
  "Work Completed",
  "Bill Prepared",
  "Payment Completed",
] as const;

export const arsTypeOfSchemeOptions = [
  "Dugwell Recharge(RWH)",
  "Borewell Recharge(RWH)",
  "Recharge Pit(RWH)",
  "Check Dam",
  "Sub-Surface Dyke",
  "Pond Renovation",
  "Percolation Ponds",
] as const;

export const ArsEntrySchema = z.object({
  fileNo: z.string().min(1, 'File No. is required.'),
  nameOfSite: z.string().min(1, 'Name of Site is required.'),
  constituency: z.enum(constituencyOptions).optional(),
  arsTypeOfScheme: z.enum(arsTypeOfSchemeOptions).optional(),
  arsPanchayath: z.string().optional(),
  arsBlock: z.string().optional(),
  latitude: optionalNumber(),
  longitude: optionalNumber(),
  arsNumberOfStructures: optionalNumber(),
  arsStorageCapacity: optionalNumber(),
  arsNumberOfFillings: optionalNumber(),
  estimateAmount: optionalNumber(),
  arsAsTsDetails: z.string().optional(),
  tsAmount: optionalNumber(),
  arsSanctionedDate: optionalDate,
  arsTenderedAmount: optionalNumber(),
  arsAwardedAmount: optionalNumber(),
  workStatus: z.enum(arsWorkStatusOptions, { required_error: "Present status is required." }),
  dateOfCompletion: optionalDate,
  totalExpenditure: optionalNumber(),
  noOfBeneficiary: z.string().optional(),
  workRemarks: z.string().optional(),
  supervisorUid: z.string().optional().nullable(),
  supervisorName: z.string().optional().nullable(),
});
export type ArsEntryFormData = z.infer<typeof ArsEntrySchema>;

// This is the type that includes the ID from Firestore
export type ArsEntry = ArsEntryFormData & { id: string };
