
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
import type { DataEntryFormData, StaffMember, UserRole } from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";
import { parseISO, isValid } from 'date-fns';

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
  
  // Start with defaults to ensure all keys are present.
  const defaults = getFormDefaults();
  
  // Create a deep copy of the entry to avoid mutation.
  const entryCopy = JSON.parse(JSON.stringify(entryToEdit));

  const mergedData = {
    ...defaults,
    ...entryCopy,
    remittanceDetails: entryCopy.remittanceDetails && entryCopy.remittanceDetails.length > 0 
      ? entryCopy.remittanceDetails.map((rd: any) => ({...rd, dateOfRemittance: safeParseDate(rd.dateOfRemittance)}))
      : defaults.remittanceDetails, // Fallback to default structure
    paymentDetails: entryCopy.paymentDetails && entryCopy.paymentDetails.length > 0
      ? entryCopy.paymentDetails.map((pd: any) => ({...pd, dateOfPayment: safeParseDate(pd.dateOfPayment)}))
      : defaults.paymentDetails, // Fallback to default structure
    siteDetails: entryCopy.siteDetails && entryCopy.siteDetails.length > 0
      ? entryCopy.siteDetails.map((sd: any) => ({...sd, dateOfCompletion: safeParseDate(sd.dateOfCompletion)}))
      : defaults.siteDetails, // Fallback to default structure
  };

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

  useEffect(() => {
    let isMounted = true;
    const loadAllData = async () => {
      if (!user) return; // Wait for user profile
      setDataLoading(true);
      
      const entryPromise = fileNoToEdit ? fetchEntryForEditing(fileNoToEdit) : Promise.resolve(null);
      
      try {
        const entryResult = await entryPromise;
        let allUsersResult: UserProfile[] = [];
        if (user.role === 'editor') {
          allUsersResult = await fetchAllUsers();
        }

        if (isMounted) {
          if (fileNoToEdit && !entryResult) {
            toast({ title: "Error", description: `File No. ${fileNoToEdit} not found.`, variant: "destructive" });
          }

          let finalEntryData = entryResult;
          // ** NEW: Filter site details if the user is a supervisor **
          if (finalEntryData && user.role === 'supervisor' && user.uid) {
              const assignedSites = finalEntryData.siteDetails?.filter(
                  site => site.supervisorUid === user.uid
              );

              // If supervisor opens a file with no sites assigned to them, treat as not found.
              if (!assignedSites || assignedSites.length === 0) {
                  finalEntryData = null; // Clear the entry data
                  toast({
                      title: "Access Restricted",
                      description: "You do not have any sites assigned to you in this file.",
                      variant: "default"
                  });
              } else {
                  finalEntryData = {
                      ...finalEntryData,
                      siteDetails: assignedSites,
                  };
              }
          }
          
          const finalInitialData = mapEntryToFormValues(finalEntryData);
          
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


  const permissions = useMemo(() => {
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
    } else if (user?.role === 'supervisor') {
       if (isCreatingNew) {
         title = "Access Denied";
         description = "Supervisors cannot create new files. Please contact an editor.";
       } else {
          title = "Update Site Details";
          description = `Editing site details for assigned sites within File No: ${fileNoToEdit}.`;
       }
    } else if (isCreatingNew) {
        title = "Access Denied";
        description = "You do not have permission to create new file entries. This action is restricted to Editors.";
    }

    return { title, description };
  }, [fileNoToEdit, user]);

  const supervisorList = useMemo(() => {
    if (!user || !pageData || staffMembers.length === 0) return [];
    
    const activeSupervisors = pageData.allUsers
      .filter(u => u.role === 'supervisor' && u.isApproved && u.staffId)
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
  
  const isSupervisorCreatingNew = user?.role === 'supervisor' && !fileNoToEdit;
  const isViewerCreatingNew = user?.role === 'viewer' && !fileNoToEdit;

  if (isSupervisorCreatingNew || isViewerCreatingNew) {
     return (
      <div className="space-y-6 p-6 text-center">
        <ShieldAlert className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{permissions.title}</h1>
        <p className="text-muted-foreground">
          {permissions.description}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        {!fileNoToEdit ? <FilePlus2 className="h-8 w-8 text-primary" /> : <Edit className="h-8 w-8 text-primary" />}
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {permissions.title}
        </h1>
      </div>
      <p className="text-muted-foreground">
        {permissions.description}
      </p>

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
