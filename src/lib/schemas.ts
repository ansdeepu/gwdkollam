// src/lib/schemas.ts
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
export type ArsStatus = typeof arsStatusOptions[number];


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
import type { SiteDetailFormData } from './schemas/DataEntrySchema';

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

import { DataEntryFormData, applicationTypeDisplayMap, SitePurpose } from './schemas/DataEntrySchema';
type ReportableEntry = (DataEntryFormData | ArsEntryFormData) & { [key: string]: any };

export const reportableFields: Array<{ id: string; label: string; accessor: (entry: ReportableEntry) => any, purpose?: SitePurpose[], arsApplicable?: boolean, arsOnly?: boolean }> = [
  // === Main File Details ===
  { id: 'fileNo', label: 'File No.', accessor: (entry) => entry.fileNo, arsApplicable: true },
  { id: 'applicantName', label: 'Applicant Name', accessor: (entry) => (entry as DataEntryFormData).applicantName, arsApplicable: false },
  { id: 'phoneNo', label: 'Phone No.', accessor: (entry) => (entry as DataEntryFormData).phoneNo, arsApplicable: false },
  { id: 'applicationType', label: 'Application Type', accessor: (entry) => (entry as DataEntryFormData).applicationType ? applicationTypeDisplayMap[(entry as DataEntryFormData).applicationType!] : undefined, arsApplicable: false },
  { id: 'fileStatus', label: 'File Status', accessor: (entry) => (entry as DataEntryFormData).fileStatus, arsApplicable: false },
  { id: 'fileRemarks', label: 'File Remarks', accessor: (entry) => (entry as DataEntryFormData).remarks, arsApplicable: false },
  
  // === Site Details (Individual) ===
  { id: 'siteName', label: 'Site Name', accessor: (entry) => (entry as any).nameOfSite, arsApplicable: true },
  { id: 'sitePurpose', label: 'Site Purpose', accessor: (entry) => (entry as any).purpose || (entry as any).arsTypeOfScheme, arsApplicable: true },
  { id: 'siteLocalSelfGovt', label: 'Local Self Govt.', accessor: (entry) => (entry as any).localSelfGovt, arsApplicable: true },
  { id: 'siteConstituency', label: 'Constituency', accessor: (entry) => (entry as any).constituency, arsApplicable: true },
  { id: 'siteLatitude', label: 'Latitude', accessor: (entry) => (entry as any).latitude, arsApplicable: true },
  { id: 'siteLongitude', label: 'Longitude', accessor: (entry) => (entry as any).longitude, arsApplicable: true },

  // --- Work Implementation Fields ---
  { id: 'siteEstimateAmount', label: 'Site Estimate (₹)', accessor: (entry) => (entry as any).estimateAmount, arsApplicable: true },
  { id: 'siteRemittedAmount', label: 'Site Remitted (₹)', accessor: (entry) => (entry as any).remittedAmount, arsApplicable: false },
  { id: 'siteTsAmount', label: 'TS Amount (₹)', accessor: (entry) => (entry as any).tsAmount, arsApplicable: true },
  { id: 'siteTenderNo', label: 'Tender No.', accessor: (entry) => (entry as any).tenderNo, arsApplicable: false },
  { id: 'siteContractorName', label: 'Contractor', accessor: (entry) => (entry as any).contractorName, arsApplicable: false },
  { id: 'siteSupervisorName', label: 'Supervisor', accessor: (entry) => (entry as any).supervisorName, arsApplicable: true },

  // --- Survey Details ---
  { id: 'surveyRecommendedDiameter', label: 'Survey Ø (mm)', accessor: (entry) => (entry as any).surveyRecommendedDiameter, purpose: ['BWC', 'TWC', 'FPW'] },
  { id: 'surveyRecommendedTD', label: 'Survey TD (m)', accessor: (entry) => (entry as any).surveyRecommendedTD, purpose: ['BWC', 'TWC', 'FPW'] },
  { id: 'surveyRecommendedOB', label: 'Survey OB (m)', accessor: (entry) => (entry as any).surveyRecommendedOB, purpose: ['BWC'] },
  { id: 'surveyRecommendedCasingPipe', label: 'Survey Casing (m)', accessor: (entry) => (entry as any).surveyRecommendedCasingPipe, purpose: ['BWC', 'FPW'] },
  { id: 'surveyRecommendedPlainPipe', label: 'Survey Plain Pipe (m)', accessor: (entry) => (entry as any).surveyRecommendedPlainPipe, purpose: ['TWC'] },
  { id: 'surveyRecommendedSlottedPipe', label: 'Survey Slotted Pipe (m)', accessor: (entry) => (entry as any).surveyRecommendedSlottedPipe, purpose: ['TWC'] },
  { id: 'surveyRecommendedMsCasingPipe', label: 'Survey MS Casing (m)', accessor: (entry) => (entry as any).surveyRecommendedMsCasingPipe, purpose: ['TWC'] },
  { id: 'surveyLocation', label: 'Survey Location', accessor: (entry) => (entry as any).surveyLocation, purpose: ['BWC', 'TWC', 'FPW'] },
  
  // --- Drilling Details (Actuals) ---
  { id: 'drillingDiameter', label: 'Actual Ø (mm)', accessor: (entry) => (entry as any).diameter, purpose: ['BWC', 'TWC', 'FPW', 'BW Dev', 'TW Dev', 'FPW Dev'] },
  { id: 'drillingPilotDepth', label: 'Pilot Drilling (m)', accessor: (entry) => (entry as any).pilotDrillingDepth, purpose: ['TWC'] },
  { id: 'drillingTotalDepth', label: 'Actual TD (m)', accessor: (entry) => (entry as any).totalDepth, purpose: ['BWC', 'TWC', 'FPW', 'BW Dev', 'TW Dev', 'FPW Dev'] },
  { id: 'drillingOB', label: 'Actual OB (m)', accessor: (entry) => (entry as any).surveyOB, purpose: ['BWC'] },
  { id: 'drillingCasingPipe', label: 'Actual Casing (m)', accessor: (entry) => (entry as any).casingPipeUsed, purpose: ['BWC', 'FPW'] },
  { id: 'drillingOuterCasing', label: 'Outer Casing (m)', accessor: (entry) => (entry as any).outerCasingPipe, purpose: ['BWC', 'TWC'] },
  { id: 'drillingInnerCasing', label: 'Inner Casing (m)', accessor: (entry) => (entry as any).innerCasingPipe, purpose: ['BWC'] },
  { id: 'drillingPlainPipe', label: 'Plain Pipe (m)', accessor: (entry) => (entry as any).surveyPlainPipe, purpose: ['TWC'] },
  { id: 'drillingSlottedPipe', label: 'Slotted Pipe (m)', accessor: (entry) => (entry as any).surveySlottedPipe, purpose: ['TWC'] },
  { id: 'drillingYield', label: 'Yield (LPH)', accessor: (entry) => (entry as any).yieldDischarge, purpose: ['BWC', 'TWC', 'FPW', 'BW Dev', 'TW Dev', 'FPW Dev', 'MWSS', 'MWSS Ext', 'Pumping Scheme', 'MWSS Pump Reno'] },
  { id: 'drillingZoneDetails', label: 'Zone Details (m)', accessor: (entry) => (entry as any).zoneDetails, purpose: ['BWC', 'TWC'] },
  { id: 'drillingWaterLevel', label: 'Static Water Level (m)', accessor: (entry) => (entry as any).waterLevel, purpose: ['BWC', 'TWC', 'FPW', 'BW Dev', 'TW Dev', 'FPW Dev', 'HPS', 'HPR'] },
  { id: 'drillingRigType', label: 'Type of Rig', accessor: (entry) => (entry as any).typeOfRig, purpose: ['BWC', 'TWC', 'FPW'] },

  // --- Scheme Details ---
  { id: 'schemePumpDetails', label: 'Pump Details', accessor: (entry) => (entry as any).pumpDetails, purpose: ['MWSS', 'MWSS Ext', 'Pumping Scheme', 'MWSS Pump Reno'] },
  { id: 'schemeTankCapacity', label: 'Tank Capacity (L)', accessor: (entry) => (entry as any).waterTankCapacity, purpose: ['MWSS', 'MWSS Ext', 'Pumping Scheme', 'MWSS Pump Reno'] },
  { id: 'schemeTapConnections', label: '# Taps', accessor: (entry) => (entry as any).noOfTapConnections, purpose: ['MWSS', 'MWSS Ext', 'Pumping Scheme', 'MWSS Pump Reno'] },
  { id: 'schemeBeneficiaries', label: '# Beneficiaries', accessor: (entry) => (entry as any).noOfBeneficiary, arsApplicable: true },
  
  // --- ARS Fields ---
  { id: 'arsStructures', label: 'ARS # Structures', accessor: (entry) => (entry as any).arsNumberOfStructures, arsOnly: true },
  { id: 'arsStorage', label: 'ARS Storage (m³)', accessor: (entry) => (entry as any).arsStorageCapacity, arsOnly: true },
  { id: 'arsFillings', label: 'ARS # Fillings', accessor: (entry) => (entry as any).arsNumberOfFillings, arsOnly: true },

  // --- Work Status ---
  { id: 'siteWorkStatus', label: 'Work Status', accessor: (entry) => (entry as any).workStatus || (entry as any).arsStatus, arsApplicable: true },
  { id: 'siteCompletionDate', label: 'Completion Date', accessor: (entry) => formatDateHelper((entry as any).dateOfCompletion), arsApplicable: true },
  { id: 'siteTotalExpenditure', label: 'Site Expenditure (₹)', accessor: (entry) => (entry as any).totalExpenditure, arsApplicable: true },
  
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
    renewalDate: optionalDateSchema,
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

export const arsWorkStatusOptions = [
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

// Vehicle Management Schemas
export const rcStatusOptions = ["Active", "Cancelled", "Garaged"] as const;
export type RCStatus = typeof rcStatusOptions[number];

export const DepartmentVehicleSchema = z.object({
    id: z.string().optional(),
    registrationNumber: z.string().min(1, "Registration Number is required."),
    model: z.string().optional(),
    chassisNo: z.string().optional(),
    typeOfVehicle: z.string().optional(),
    vehicleClass: z.string().optional(),
    registrationDate: optionalDateSchema,
    rcStatus: z.enum(rcStatusOptions).optional(),
    fuelConsumptionRate: z.string().optional(),
    fitnessExpiry: optionalDateSchema,
    taxExpiry: optionalDateSchema,
    insuranceExpiry: optionalDateSchema,
    pollutionExpiry: optionalDateSchema,
    fuelTestExpiry: optionalDateSchema,
});
export type DepartmentVehicle = z.infer<typeof DepartmentVehicleSchema>;

export const HiredVehicleSchema = z.object({
    id: z.string().optional(),
    registrationNumber: z.string().min(1, "Registration Number is required."),
    model: z.string().optional(),
    agreementValidity: optionalDateSchema,
    vehicleClass: z.string().optional(),
    registrationDate: optionalDateSchema,
    rcStatus: z.enum(rcStatusOptions).optional(),
    hireCharges: optionalNumber(),
    fitnessExpiry: optionalDateSchema,
    taxExpiry: optionalDateSchema,
    insuranceExpiry: optionalDateSchema,
    pollutionExpiry: optionalDateSchema,
    permitExpiry: optionalDateSchema,
});
export type HiredVehicle = z.infer<typeof HiredVehicleSchema>;

export const rigStatusOptions = ["Active", "Garaged"] as const;
export type RigStatus = typeof rigStatusOptions[number];

export const RigCompressorSchema = z.object({
    id: z.string().optional(),
    typeOfRigUnit: z.string().min(1, "Type of Rig Unit is required."),
    status: z.enum(rigStatusOptions).default('Active').optional(),
    fuelConsumption: z.string().optional(),
    rigVehicleRegNo: z.string().optional(),
    compressorVehicleRegNo: z.string().optional(),
    supportingVehicleRegNo: z.string().optional(),
    compressorDetails: z.string().optional(),
    remarks: z.string().optional(),
});
export type RigCompressor = z.infer<typeof RigCompressorSchema>;
