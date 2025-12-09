

import { z } from 'zod';
import { format, parse, isValid } from 'date-fns';

export * from './schemas/DataEntrySchema';
export * from './schemas/eTenderSchema';

const toDateOrNull = (value: any): Date | null => {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date && !isNaN(value.getTime())) return value;
  if (typeof value === 'object' && value !== null && typeof value.seconds === 'number') {
    try {
      const ms = value.seconds * 1000 + (value.nanoseconds ? Math.round(value.nanoseconds / 1e6) : 0);
      const d = new Date(ms);
      if (!isNaN(d.getTime())) return d;
    } catch { /* fallthrough */ }
  }
  if (typeof value === 'number' && isFinite(value)) {
    const ms = value < 1e12 ? value * 1000 : value;
    const d = new Date(ms);
    if (!isNaN(d.getTime())) return d;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return null;
    const iso = Date.parse(trimmed);
    if (!isNaN(iso)) return new Date(iso);
    const ymd = /^(\d{4})-(\d{2})-(\d{2})$/;
    const ymdMatch = trimmed.match(ymd);
    if (ymdMatch) {
      const [_, y, m, d] = ymdMatch;
      const dt = new Date(Number(y), Number(m) - 1, Number(d));
      if (!isNaN(dt.getTime())) return dt;
    }
    const dmy = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const dmyMatch = trimmed.match(dmy);
    if (dmyMatch) {
      const [_, dd, mm, yyyy] = dmyMatch;
      const dt = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
      if (!isNaN(dt.getTime())) return dt;
    }
    try {
      const fallback = new Date(trimmed);
      if (!isNaN(fallback.getTime())) return fallback;
    } catch { /* ignore */ }
  }
  return null;
};

const optionalDateSchema = z.preprocess((val) => (val ? toDateOrNull(val) : null), z.date().nullable().optional());

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

// Helper for robust optional numeric fields
const optionalNumber = (errorMessage: string = "Must be a valid number.") =>
  z.preprocess((val) => {
    if (val === null || val === undefined || val === "") return undefined;
    if (typeof val === 'string' && isNaN(Number(val))) return undefined;
    return val;
}, z.coerce.number({ invalid_type_error: errorMessage }).min(0, "Cannot be negative.").optional());

// ARS Schemas
export const arsStatusOptions = [
    "Proposal Submitted", 
    "AS & TS Issued", 
    "Tendered", 
    "Selection Notice Issued", 
    "Work Order Issued", 
    "Work Initiated", 
    "Work in Progress", 
    "Work Failed", 
    "Work Completed", 
    "Bill Prepared", 
    "Payment Completed"
] as const;


export const arsTypeOfSchemeOptions = [
  "Dugwell Recharge",
  "Borewell Recharge",
  "Recharge Pit",
  "Check Dam",
  "Sub-Surface Dyke",
  "Pond Renovation",
  "Percolation Ponds",
] as const;

import { SiteDetailSchema, fileStatusOptions, constituencyOptions } from './schemas/DataEntrySchema';

export const ArsEntrySchema = z.object({
  fileNo: z.string().min(1, 'File No. is required.'),
  nameOfSite: z.string().min(1, 'Name of Site is required.'),
  localSelfGovt: z.string().optional(),
  constituency: z.preprocess((val) => (val === "" || val === null ? undefined : val), z.enum(constituencyOptions).optional()),
  arsTypeOfScheme: z.enum(arsTypeOfSchemeOptions).optional(),
  arsBlock: z.string().optional(),
  latitude: optionalNumber(),
  longitude: optionalNumber(),
  arsNumberOfStructures: optionalNumber(),
  arsStorageCapacity: optionalNumber(),
  arsNumberOfFillings: optionalNumber(),
  estimateAmount: optionalNumber(),
  arsAsTsDetails: z.string().optional(),
  tsAmount: optionalNumber(),
  arsSanctionedDate: optionalDateSchema,
  arsTenderedAmount: optionalNumber(),
  arsAwardedAmount: optionalNumber(),
  arsStatus: z.enum(arsStatusOptions, { required_error: "ARS status is required." }),
  dateOfCompletion: optionalDateSchema,
  totalExpenditure: optionalNumber(),
  noOfBeneficiary: z.string().optional(),
  workRemarks: z.string().optional(),
  supervisorUid: z.string().optional().nullable(),
  supervisorName: z.string().optional().nullable(),
  isPending: z.boolean().optional(),
}).superRefine((data, ctx) => {
    if ((data.arsStatus === 'Work Completed' || data.arsStatus === 'Work Failed') && !data.dateOfCompletion) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Completion Date is required for this status.",
            path: ["dateOfCompletion"],
        });
    }
});
export type ArsEntryFormData = z.infer<typeof ArsEntrySchema>;

// This is the type that includes the ID from Firestore
export type ArsEntry = ArsEntryFormData & { id: string };

// Schema for Pending Updates
export const PendingUpdateFormDataSchema = z.object({
  fileNo: z.string(),
  updatedSiteDetails: z.array(z.union([SiteDetailSchema, ArsEntrySchema])),
  fileLevelUpdates: z.object({
      fileStatus: z.enum(fileStatusOptions).optional(),
      remarks: z.string().optional(),
  }).optional(),
  submittedByUid: z.string(),
  submittedByName: z.string(),
  submittedAt: z.any(), // serverTimestamp()
  status: z.enum(['pending', 'approved', 'rejected', 'supervisor-unassigned']),
  notes: z.string().optional(),
  isArsUpdate: z.boolean().optional(),
  arsId: z.string().optional(),
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
const formatDateHelper = (date: Date | string | null | undefined): string => {
  if (!date) return 'N/A';
  try {
    return format(new Date(date), "dd/MM/yyyy");
  } catch {
    return 'Invalid Date';
  }
};

import { DataEntryFormData, applicationTypeDisplayMap } from './schemas/DataEntrySchema';
export const reportableFields: Array<{ id: string; label: string; accessor: (entry: DataEntryFormData) => string | number | undefined | null }> = [
  // === Main File Details ===
  { id: 'fileNo', label: 'File No.', accessor: (entry) => entry.fileNo },
  { id: 'applicantName', label: 'Applicant Name', accessor: (entry) => entry.applicantName },
  { id: 'phoneNo', label: 'Phone No.', accessor: (entry) => entry.phoneNo },
  { id: 'applicationType', label: 'Application Type', accessor: (entry) => entry.applicationType ? applicationTypeDisplayMap[entry.applicationType] : undefined },
  { id: 'fileStatus', label: 'File Status', accessor: (entry) => entry.fileStatus },
  { id: 'fileRemarks', label: 'File Remarks', accessor: (entry) => entry.remarks },

  // === Remittance Details (Aggregated) ===
  { id: 'firstRemittanceDate', label: 'First Remittance Date', accessor: (entry) => formatDateHelper(entry.remittanceDetails?.[0]?.dateOfRemittance) },
  { id: 'allRemittanceDates', label: 'All Remittance Dates', accessor: (entry) => entry.remittanceDetails?.map(rd => formatDateHelper(rd.dateOfRemittance)).join('; ') || 'N/A' },
  { id: 'totalRemittance', label: 'Total Remittance (₹)', accessor: (entry) => entry.totalRemittance },
  { id: 'remittanceAccounts', label: 'Remittance Accounts', accessor: (entry) => join(entry.remittanceDetails, 'remittedAccount') },

  // === Site Details (Aggregated) ===
  { id: 'allSiteNames', label: 'Site Names', accessor: (entry) => join(entry.siteDetails, 'nameOfSite') },
  { id: 'allLocalSelfGovt', label: 'Local Self Govt (Site)', accessor: (entry) => join(entry.siteDetails, 'localSelfGovt') },
  { id: 'allConstituencies', label: 'Constituency (Site)', accessor: (entry) => join(entry.siteDetails, 'constituency') },
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
  { id: 'allPaymentDates', label: 'Payment Dates', accessor: (entry) => entry.paymentDetails?.map(pd => formatDateHelper(pd.dateOfPayment)).join('; ') || 'N/A' },
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

const dateOrString = z.union([
  z.date(),
  z.string().refine(val => !val || !isNaN(Date.parse(val)), {
    message: "Invalid date format"
  })
]);


export const StaffMemberFormDataSchema = z.object({
  photoUrl: z.string().url({ message: "Please enter a valid image URL." }).optional().or(z.literal("")),
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  designation: z.enum(designationOptions).optional(),
  pen: z.string().min(1, { message: "PEN is required." }),
  dateOfBirth: z.string().optional(),
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
  dateOfBirth: dateOrString.nullable().optional(),
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
export const OwnerInfoSchema = z.object({
  name: z.string().min(1, "Partner name is required."),
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
    "Hand Bore",
    "Filter Point Rig",
    "Calyx Rig",
    "Rotary Rig",
    "DTH Rig",
    "Rotary cum DTH Rig",
] as const;
export type RigType = typeof rigTypeOptions[number];

export const applicationFeeTypes = [
    "Agency Registration",
    "Rig Registration",
] as const;
export type ApplicationFeeType = typeof applicationFeeTypes[number];

export const ApplicationFeeSchema = z.object({
    id: z.string(),
    applicationFeeType: z.enum(applicationFeeTypes).optional(),
    applicationFeeAmount: optionalNumber(),
    applicationFeePaymentDate: optionalDateSchema,
    applicationFeeChallanNo: z.string().optional(),
});
export type ApplicationFee = z.infer<typeof ApplicationFeeSchema>;

export const RigRenewalSchema = z.object({
    id: z.string(),
    renewalDate: z.preprocess((val) => (val ? toDateOrNull(val) : null), z.date({ required_error: "Renewal date is required." })),
    renewalFee: optionalNumber("Renewal fee is required."),
    paymentDate: optionalDateSchema,
    challanNo: z.string().optional(),
    validTill: optionalDateSchema,
});
export type RigRenewal = z.infer<typeof RigRenewalSchema>;

export const RigRegistrationSchema = z.object({
    id: z.string(),
    rigRegistrationNo: z.string().optional(),
    typeOfRig: z.enum(rigTypeOptions).optional(),
    registrationDate: optionalDateSchema,
    registrationFee: optionalNumber(),
    paymentDate: optionalDateSchema,
    challanNo: z.string().optional(),
    additionalRegistrationFee: optionalNumber(),
    additionalPaymentDate: optionalDateSchema,
    additionalChallanNo: z.string().optional(),
    rigVehicle: VehicleDetailsSchema,
    compressorVehicle: VehicleDetailsSchema,
    supportingVehicle: VehicleDetailsSchema,
    compressorDetails: CompressorDetailsSchema,
    generatorDetails: GeneratorDetailsSchema,
    status: z.enum(['Active', 'Cancelled']),
    renewals: z.array(RigRenewalSchema).optional(),
    history: z.array(z.string()).optional(),
    cancellationDate: optionalDateSchema,
    cancellationReason: z.string().optional(),
    // Fields to control visibility of optional sections
    showRigVehicle: z.boolean().optional(),
    showCompressorVehicle: z.boolean().optional(),
    showSupportingVehicle: z.boolean().optional(),
    showCompressorDetails: z.boolean().optional(),
    showGeneratorDetails: z.boolean().optional(),
});
export type RigRegistration = z.infer<typeof RigRegistrationSchema>;

export const AgencyApplicationSchema = z.object({
  id: z.string().optional(),
  fileNo: z.string().optional(),
  agencyName: z.string().min(1, "Agency name & address is required."),
  owner: OwnerInfoSchema,
  partners: z.array(OwnerInfoSchema).optional(),
  
  applicationFees: z.array(ApplicationFeeSchema).optional(),

  // Agency Registration
  agencyRegistrationNo: z.string().optional(),
  agencyRegistrationDate: optionalDateSchema,
  agencyRegistrationFee: optionalNumber(),
  agencyPaymentDate: optionalDateSchema,
  agencyChallanNo: z.string().optional(),
  agencyAdditionalRegFee: optionalNumber(),
  agencyAdditionalPaymentDate: optionalDateSchema,
  agencyAdditionalChallanNo: z.string().optional(),
  
  rigs: z.array(RigRegistrationSchema),
  status: z.enum(['Active', 'Pending Verification']),
  history: z.array(z.string()).optional(),
  remarks: z.string().optional(),
});
export type AgencyApplication = z.infer<typeof AgencyApplicationSchema>;

// Settings Schemas
export interface LsgConstituencyMap {
  id: string;
  name: string; // Name of the Local Self Government
  constituencies: string[]; // Array of associated constituencies
}

    
