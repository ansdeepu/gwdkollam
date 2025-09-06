
// src/app/dashboard/data-entry/page.tsx
"use client";
import DataEntryFormComponent from "@/components/shared/DataEntryForm";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert, Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useAuth, type UserProfile } from "@/hooks/useAuth";
import { useFileEntries } from "@/hooks/useFileEntries";
import { useStaffMembers } from "@/hooks/useStaffMembers";
import { useMemo, useEffect, useState } from "react";
import type { DataEntryFormData, StaffMember, UserRole } from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";
import { usePendingUpdates } from "@/hooks/usePendingUpdates";
import { isValid, parse, format, parseISO } from 'date-fns';
import { usePageHeader } from "@/hooks/usePageHeader";

const safeParseDate = (dateValue: any): Date | null => {
  if (!dateValue) return null;
  if (dateValue instanceof Date) return dateValue;
  // Handle Firestore Timestamps which are objects with seconds/nanoseconds
  if (typeof dateValue === 'object' && dateValue !== null && typeof dateValue.seconds === 'number') {
    return new Date(dateValue.seconds * 1000);
  }
  if (typeof dateValue === 'string') {
    // Try ISO format first
    let parsed = parseISO(dateValue);
    if (isValid(parsed)) return parsed;
    // Then try dd/MM/yyyy
    parsed = parse(dateValue, 'dd/MM/yyyy', new Date());
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
    noOfBeneficiary: "", dateOfCompletion: undefined, typeOfRig: undefined,
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
  const fileNoToEdit = searchParams.get("fileNo");
  const approveUpdateId = searchParams.get("approveUpdateId");
  
  const { user, isLoading: authIsLoading, fetchAllUsers } = useAuth();
  const { fetchEntryForEditing } = useFileEntries();
  const { staffMembers, isLoading: staffIsLoading } = useStaffMembers();
  const { getPendingUpdateById } = usePendingUpdates();
  const { toast } = useToast();
  const { setHeader } = usePageHeader();

  const [pageData, setPageData] = useState<PageData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  const processDataForForm = (data: any): any => {
    const transform = (obj: any): any => {
        if (obj === null || obj === undefined) return obj;

        if (Array.isArray(obj)) {
            return obj.map(transform);
        }

        if (typeof obj === 'object') {
            const newObj: { [key: string]: any } = {};
            for (const key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    const value = obj[key];
                    if (key.toLowerCase().includes('date')) {
                        const date = safeParseDate(value);
                        newObj[key] = date && isValid(date) ? format(date, 'yyyy-MM-dd') : "";
                    } else {
                        newObj[key] = transform(value);
                    }
                }
            }
            return newObj;
        }
        return obj;
    };
    return transform(data);
  };

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
                  let mergedData = JSON.parse(JSON.stringify(originalEntry));
                  const updatedSitesMap = new Map(pendingUpdate.updatedSiteDetails.map(site => [site.nameOfSite, site]));
                  
                  mergedData.siteDetails = mergedData.siteDetails?.map((originalSite: any) => {
                      if (updatedSitesMap.has(originalSite.nameOfSite)) {
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
            initialData: processDataForForm(dataForForm),
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

    setHeader(title, description); // Update the main header
  }, [fileNoToEdit, user, approveUpdateId, setHeader]);


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
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Access Denied</h1>
        <p className="text-muted-foreground">
          You do not have permission to create new file entries. This action is restricted to Editors.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
