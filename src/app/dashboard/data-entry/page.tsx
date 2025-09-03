// src/app/dashboard/data-entry/page.tsx
"use client";
import DataEntryFormComponent from "@/components/shared/DataEntryForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FilePlus2, Edit, ShieldAlert, Loader2, ArrowLeft } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth, type UserProfile } from "@/hooks/useAuth";
import { useFileEntries } from "@/hooks/useFileEntries";
import { useStaffMembers } from "@/hooks/useStaffMembers";
import { useMemo, useEffect, useState } from "react";
import type { DataEntryFormData, StaffMember, UserRole, SiteWorkStatus, PendingUpdate, Constituency } from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";
import { usePendingUpdates } from "@/hooks/usePendingUpdates";
import { isValid } from 'date-fns';
import { Button } from "@/components/ui/button";

const safeParseDate = (dateValue: any): Date | null => {
  if (!dateValue) return null;
  if (dateValue instanceof Date) return dateValue;
  // Handle Firestore Timestamps which are objects with seconds/nanoseconds
  if (typeof dateValue === 'object' && dateValue !== null && typeof dateValue.seconds === 'number') {
    return new Date(dateValue.seconds * 1000);
  }
  if (typeof dateValue === 'string' || typeof dateValue === 'number') {
    const parsed = new Date(dateValue);
    if (isValid(parsed)) return parsed;
  }
  return null;
};

// Helper function to create default form values, ensuring consistency.
const getFormDefaults = (): DataEntryFormData => ({
  fileNo: "", applicantName: "", phoneNo: "", applicationType: undefined,
  constituency: undefined,
  estimateAmount: undefined, assignedSupervisorUids: [],
  remittanceDetails: [{ amountRemitted: undefined, dateOfRemittance: undefined, remittedAccount: undefined }],
  totalRemittance: 0, 
  siteDetails: [{
    nameOfSite: "", constituency: undefined, latitude: undefined, longitude: undefined, purpose: undefined,
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
    arsTypeOfScheme: undefined, arsPanchayath: undefined, arsBlock: undefined, arsAsTsDetails: undefined, arsSanctionedDate: undefined,
    arsTenderedAmount: undefined, arsAwardedAmount: undefined,
    arsNumberOfStructures: undefined, arsStorageCapacity: undefined, arsNumberOfFillings: undefined, isArsImport: false,
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


interface PageData {
  initialData: DataEntryFormData;
  allUsers: UserProfile[]; // Keep for supervisor list generation
}

export default function DataEntryPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const fileNoToEdit = searchParams.get("fileNo");
  const approveUpdateId = searchParams.get("approveUpdateId");
  
  const { user, isLoading: authIsLoading, fetchAllUsers } = useAuth();
  const { fetchEntryForEditing } = useFileEntries();
  const { staffMembers, isLoading: staffIsLoading } = useStaffMembers();
  const { getPendingUpdateById } = usePendingUpdates();
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
      const pendingUpdatePromise = approveUpdateId ? getPendingUpdateById(approveUpdateId) : Promise.resolve(null);
      
      try {
        const [originalEntry, pendingUpdate] = await Promise.all([entryPromise, pendingUpdatePromise]);
        
        let allUsersResult: UserProfile[] = [];
        if (user.role === 'editor' || user.role === 'viewer') {
          allUsersResult = await fetchAllUsers();
        }

        if (isMounted) {
          if (fileNoToEdit && !originalEntry) {
            toast({ title: "Error", description: `File No. ${fileNoToEdit} not found or you do not have permission to view it.`, variant: "destructive" });
          }

          let dataForForm: DataEntryFormData;

          if (approveUpdateId && pendingUpdate && originalEntry) {
              if (pendingUpdate.status !== 'pending') {
                  toast({ title: "Update No Longer Pending", description: "This update has already been reviewed.", variant: "default" });
                  dataForForm = originalEntry;
              } else {
                  // This is the new, more robust merging logic.
                  // 1. Create a deep copy of the original entry to modify.
                  let mergedData = JSON.parse(JSON.stringify(originalEntry));

                  // 2. Prepare the supervisor's updates by parsing dates correctly first.
                  const processedSupervisorUpdates = pendingUpdate.updatedSiteDetails.map(updatedSite => {
                      return {
                          ...updatedSite,
                          dateOfCompletion: safeParseDate(updatedSite.dateOfCompletion),
                      };
                  });
                  
                  // 3. Create a map for easy lookup of the processed updates.
                  const updatedSitesMap = new Map(
                    processedSupervisorUpdates.map(site => [site.nameOfSite, site])
                  );
                  
                  // 4. Intelligently merge the processed updates into the original site details.
                  mergedData.siteDetails = mergedData.siteDetails?.map((originalSite: any) => {
                      if (updatedSitesMap.has(originalSite.nameOfSite)) {
                          // Merge only the fields from the update into the original site data.
                          const updatedSiteData = updatedSitesMap.get(originalSite.nameOfSite)!;
                          return { ...originalSite, ...updatedSiteData };
                      }
                      return originalSite;
                  }) || [];

                  dataForForm = mergedData; 

                  toast({ title: "Reviewing Update", description: `Loading changes from ${pendingUpdate.submittedByName}. Please review and save.` });
              }
          } else {
            dataForForm = originalEntry || getFormDefaults();
          }
          
          setPageData({
            initialData: dataForForm,
            allUsers: allUsersResult,
          });
        }
      } catch (error) {
        console.error("Error loading data for form:", error);
        toast({ title: "Error Loading Data", description: "Could not load all required data. Please try again.", variant: "destructive" });
        if(isMounted) {
           setPageData({
            initialData: getFormDefaults(),
            allUsers: [],
          });
        }
      } finally {
        if(isMounted) setDataLoading(false);
      }
    };

    if (!authIsLoading && user) { // Ensure user object is available before loading
      loadAllData();
    }
    
    return () => { isMounted = false; };
  }, [fileNoToEdit, approveUpdateId, authIsLoading, user, fetchEntryForEditing, getPendingUpdateById, fetchAllUsers, toast]);

  useEffect(() => {
    let title = "View File Data";
    let description = `Viewing details for File No: ${fileNoToEdit}. You are in read-only mode.`;
    const isCreatingNew = !fileNoToEdit;

    if (user?.role === 'editor') {
      if (isCreatingNew) {
        title = "New File Data Entry";
        description = "Use this form to input new work orders, project updates, or other relevant data for the Ground Water Department.";
      } else if (approveUpdateId) {
        title = "Approve Pending Updates";
        description = `Reviewing and approving updates for File No: ${fileNoToEdit}. Click "Save Changes" to finalize.`;
      }
      else {
        title = "Edit File Data";
        description = `Editing details for File No: ${fileNoToEdit}. Please make your changes and submit.`;
      }
    } else if (user?.role === 'supervisor') {
       if (isCreatingNew) {
         title = "Access Denied";
         description = "Supervisors cannot create new files.";
       } else {
         title = "Edit Assigned Site Details";
         description = `Editing assigned sites for File No: ${fileNoToEdit}. Submit your changes for approval.`;
       }
    } else if (isCreatingNew) {
      title = "Access Denied";
      description = "You do not have permission to create new file entries. This action is restricted to Editors.";
    }

    setPageTitle(title);
    setPageDescription(description);
  }, [fileNoToEdit, user, approveUpdateId]);


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
  
  const isDeniedAccess = (user?.role === 'viewer' && !fileNoToEdit) || (user?.role === 'supervisor' && !fileNoToEdit);

  if (isDeniedAccess) {
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
      <div className="sticky top-0 z-10 -mx-6 -mt-6 mb-4 bg-background/80 p-6 backdrop-blur-md border-b">
        <div className="flex justify-between items-start">
          <div>
              <h1 className="text-3xl font-bold tracking-tight">{pageTitle}</h1>
              <p className="text-muted-foreground">{pageDescription}</p>
          </div>
          <Button variant="destructive" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
          </Button>
        </div>
      </div>
      <Card className="shadow-lg">
        <CardContent className="pt-6">
          {pageData ? (
             <DataEntryFormComponent
                key={approveUpdateId || fileNoToEdit || 'new-entry'} 
                fileNoToEdit={fileNoToEdit || undefined}
                initialData={pageData.initialData}
                supervisorList={supervisorList}
                userRole={user?.role}
             />
          ) : (
            <div className="flex h-64 items-center justify-center">
              <p className="text-muted-foreground">Form data could not be loaded.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
