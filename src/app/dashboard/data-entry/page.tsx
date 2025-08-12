
// src/app/dashboard/data-entry/page.tsx
"use client";
import DataEntryFormComponent from "@/components/shared/DataEntryForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FilePlus2, Edit, ShieldAlert, Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useAuth, type UserProfile } from "@/hooks/useAuth";
import { useFileEntries } from "@/hooks/useFileEntries";
import { useStaffMembers } from "@/hooks/useStaffMembers";
import { useMemo, useEffect, useState } from "react";
import type { DataEntryFormData, StaffMember, UserRole, SiteWorkStatus, PendingUpdate } from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";
import { usePendingUpdates } from "@/hooks/usePendingUpdates";
import { isValid } from 'date-fns';

const safeParseDate = (dateValue: any): Date | null => {
  if (!dateValue) return null;
  if (dateValue instanceof Date) return dateValue;
  if (typeof dateValue === 'string' || typeof dateValue === 'number') {
    const parsed = new Date(dateValue);
    if (isValid(parsed)) return parsed;
  }
  return null;
};

// Helper function to create default form values, ensuring consistency.
const mapEntryToFormValues = (entryToEdit?: DataEntryFormData | null): DataEntryFormData => {
    // A safe, deep-cloned default structure.
    const getFormDefaults = (): DataEntryFormData => ({
      fileNo: "", applicantName: "", phoneNo: "", applicationType: undefined,
      estimateAmount: undefined, assignedSupervisorUids: [],
      remittanceDetails: [{ amountRemitted: undefined, dateOfRemittance: undefined, remittedAccount: undefined }],
      totalRemittance: 0, 
      siteDetails: [{
        nameOfSite: "", latitude: undefined, longitude: undefined, purpose: undefined,
        estimateAmount: undefined, remittedAmount: undefined, siteConditions: undefined, accessibleRig: undefined, tsAmount: undefined,
        additionalAS: 'No',
        tenderNo: "", diameter: undefined, totalDepth: undefined, casingPipeUsed: "",
        outerCasingPipe: "", innerCasingPipe: "", yieldDischarge: "", zoneDetails: "",
        waterLevel: "", drillingRemarks: "", pumpDetails: "", waterTankCapacity: "", noOfTapConnections: undefined,
        noOfBeneficiary: "", dateOfCompletion: null, typeOfRig: undefined,
        contractorName: "", supervisorUid: null, supervisorName: null, totalExpenditure: undefined,
        workStatus: undefined, workRemarks: "",
        surveyOB: "", surveyLocation: "", surveyPlainPipe: "", surveySlottedPipe: "",
        surveyRemarks: "", surveyRecommendedDiameter: "", surveyRecommendedTD: "",
        surveyRecommendedOB: "", surveyRecommendedCasingPipe: "", surveyRecommendedPlainPipe: "",
        surveyRecommendedSlottedPipe: "", surveyRecommendedMsCasingPipe: "",
        arsNumberOfStructures: undefined, arsStorageCapacity: undefined, arsNumberOfFillings: undefined,
        pilotDrillingDepth: "", pumpingLineLength: "", deliveryLineLength: "",
      }],
      paymentDetails: [{ 
        dateOfPayment: undefined, paymentAccount: undefined, revenueHead: undefined,
        contractorsPayment: undefined, gst: undefined, incomeTax: undefined, kbcwb: undefined,
        refundToParty: undefined, totalPaymentPerEntry: 0, paymentRemarks: "",
       }], 
      totalPaymentAllEntries: 0, overallBalance: 0,
      fileStatus: undefined, remarks: "",
    });

  if (!entryToEdit) return getFormDefaults();
  
  // Start with a deep copy of defaults to ensure all keys are present.
  const defaults = getFormDefaults();
  const mergedData = JSON.parse(JSON.stringify(defaults));

  // Merge the editable entry into the default structure.
  Object.assign(mergedData, entryToEdit);
  
  // Ensure nested arrays are correctly initialized and dates are parsed.
  mergedData.remittanceDetails = (entryToEdit.remittanceDetails && entryToEdit.remittanceDetails.length > 0)
    ? entryToEdit.remittanceDetails.map((rd: any) => ({ ...rd, dateOfRemittance: safeParseDate(rd.dateOfRemittance) }))
    : defaults.remittanceDetails;

  mergedData.paymentDetails = (entryToEdit.paymentDetails && entryToEdit.paymentDetails.length > 0)
    ? entryToEdit.paymentDetails.map((pd: any) => ({ ...pd, dateOfPayment: safeParseDate(pd.dateOfPayment) }))
    : defaults.paymentDetails;

  mergedData.siteDetails = (entryToEdit.siteDetails && entryToEdit.siteDetails.length > 0)
    ? entryToEdit.siteDetails.map((sd: any) => ({ ...sd, dateOfCompletion: safeParseDate(sd.dateOfCompletion) }))
    : defaults.siteDetails;

  return mergedData;
};


interface PageData {
  initialData: DataEntryFormData;
  allUsers: UserProfile[]; // Keep for supervisor list generation
}

export default function DataEntryPage() {
  const searchParams = useSearchParams();
  const fileNoToEdit = searchParams.get("fileNo");
  
  const { user, isLoading: authIsLoading, fetchAllUsers } = useAuth();
  const { fetchEntryForEditing } = useFileEntries();
  const { staffMembers, isLoading: staffIsLoading } = useStaffMembers();
  const { toast } = useToast();

  const [pageData, setPageData] = useState<PageData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [pageTitle, setPageTitle] = useState("Data Entry");
  const [pageDescription, setPageDescription] = useState("Loading...");

  useEffect(() => {
    let isMounted = true;
    const loadAllData = async () => {
      if (!user) return; // Wait for user profile
      setDataLoading(true);
      
      const entryPromise = fileNoToEdit ? fetchEntryForEditing(fileNoToEdit) : Promise.resolve(null);
      
      try {
        const [entryResult] = await Promise.all([entryPromise]);
        
        let allUsersResult: UserProfile[] = [];
        if (user.role === 'editor') {
          allUsersResult = await fetchAllUsers();
        }

        if (isMounted) {
          if (fileNoToEdit && !entryResult) {
            toast({ title: "Error", description: `File No. ${fileNoToEdit} not found.`, variant: "destructive" });
          }
          
          const finalInitialData = mapEntryToFormValues(entryResult);
          
          setPageData({
            initialData: finalInitialData,
            allUsers: allUsersResult,
          });
        }
      } catch (error) {
        console.error("Error loading data for form:", error);
        toast({ title: "Error Loading Data", description: "Could not load all required data. Please try again.", variant: "destructive" });
        if(isMounted) {
           setPageData({
            initialData: mapEntryToFormValues(null),
            allUsers: [],
          });
        }
      } finally {
        if(isMounted) setDataLoading(false);
      }
    };

    if (!authIsLoading) {
      loadAllData();
    }
    
    return () => { isMounted = false; };
  }, [fileNoToEdit, authIsLoading, user, fetchEntryForEditing, fetchAllUsers, toast]);

  useEffect(() => {
    let title = "View File Data";
    let description = `Viewing details for File No: ${fileNoToEdit}. You are in read-only mode.`;
    const isCreatingNew = !fileNoToEdit;

    if (user?.role === 'editor') {
      if (isCreatingNew) {
        title = "New File Data Entry";
        description = "Use this form to input new work orders, project updates, or other relevant data for the Ground Water Department.";
      } else {
        title = "Edit File Data";
        description = `Editing details for File No: ${fileNoToEdit}. Please make your changes and submit.`;
      }
    } else if (isCreatingNew) {
      title = "Access Denied";
      description = "You do not have permission to create new file entries. This action is restricted to Editors.";
    }

    setPageTitle(title);
    setPageDescription(description);
  }, [fileNoToEdit, user]);


  const supervisorList = useMemo(() => {
    if (!user || !pageData || staffMembers.length === 0) return [];
    
    const activeSupervisors = pageData.allUsers
      .filter(u => u.role === 'editor' && u.isApproved && u.staffId)
      .map(userProfile => {
        const staffInfo = staffMembers.find(s => s.id === userProfile.staffId && s.status === 'Active');
        if (staffInfo) {
          return {
            ...staffInfo,
            uid: userProfile.uid,
            name: staffInfo.name,
          };
        }
        return null;
      })
      .filter((s): s is (StaffMember & { uid: string; name: string }) => s !== null);

    return activeSupervisors.sort((a, b) => a.name.localeCompare(b.name));
  }, [pageData, staffMembers, user]);
  
  const isLoading = authIsLoading || staffIsLoading || dataLoading;

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading file data...</p>
      </div>
    );
  }
  
  const isViewerCreatingNew = user?.role === 'viewer' && !fileNoToEdit;

  if (isViewerCreatingNew) {
     return (
      <div className="space-y-6 p-6 text-center">
        <ShieldAlert className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{pageTitle}</h1>
        <p className="text-muted-foreground">
          {pageDescription}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {pageData && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>{!fileNoToEdit ? "File Data Entry Form" : "File Data Form"}</CardTitle>
            <CardDescription>
              {!fileNoToEdit
                  ? "Please fill in all compulsory fields accurately."
                  : `File No: ${fileNoToEdit}`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
             <DataEntryFormComponent
                key={fileNoToEdit || 'new-entry'} 
                fileNoToEdit={fileNoToEdit || undefined}
                initialData={pageData.initialData}
                supervisorList={supervisorList}
                userRole={user?.role}
             />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
