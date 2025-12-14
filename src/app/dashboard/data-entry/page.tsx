// src/app/dashboard/data-entry/page.tsx
"use client";
import DataEntryFormComponent from "@/components/shared/DataEntryForm";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth, type UserProfile } from "@/hooks/useAuth";
import { useFileEntries } from "@/hooks/useFileEntries";
import { useStaffMembers } from "@/hooks/useStaffMembers";
import { useMemo, useEffect, useState, useCallback } from "react";
import type { DataEntryFormData, StaffMember, UserRole } from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";
import { usePendingUpdates } from "@/hooks/usePendingUpdates";
import { isValid, parse, format, parseISO } from 'date-fns';
import { usePageHeader } from "@/hooks/usePageHeader";
import { useDataStore } from "@/hooks/use-data-store";

export const dynamic = 'force-dynamic';

const Loader2 = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
);
const ShieldAlert = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
);
const ArrowLeft = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
);

const toDateOrNull = (value: any): Date | null => {
  if (!value) return null;
  if (value instanceof Date && isValid(value)) return value;
  // Handle Firestore Timestamp objects
  if (value && typeof value.seconds === 'number' && typeof value.nanoseconds === 'number') {
    const date = new Date(value.seconds * 1000 + value.nanoseconds / 1000000);
    return isValid(date) ? date : null;
  }
  if (typeof value === 'string') {
    // Try ISO format first, as it's a common machine-readable format
    let parsedDate = parseISO(value);
    if (isValid(parsedDate)) return parsedDate;

    // Then handle 'dd/MM/yyyy' for manual entries
    parsedDate = parse(value, 'dd/MM/yyyy', new Date());
    if (isValid(parsedDate)) return parsedDate;
  }
  return null;
};

// This function now recursively processes the data and formats dates to 'yyyy-MM-dd' or ""
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
          // Check for keys that are likely to be dates
          if (key.toLowerCase().includes('date')) {
            const date = toDateOrNull(value);
            // Format to the string 'yyyy-MM-dd' or an empty string
            newObj[key] = date && isValid(date) ? format(date, 'yyyy-MM-dd') : "";
          } else {
            // Recursively transform nested objects
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


// Helper function to create default form values, ensuring consistency.
const getFormDefaults = (): DataEntryFormData => ({
  fileNo: "", applicantName: "", phoneNo: "", secondaryMobileNo: "",
  applicationType: undefined,
  constituency: undefined,
  estimateAmount: undefined, assignedSupervisorUids: [],
  remittanceDetails: [], // Starts empty
  totalRemittance: 0, 
  siteDetails: [], // Starts empty
  paymentDetails: [], // Starts empty
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
  const fileIdToEdit = searchParams.get("id");
  const approveUpdateId = searchParams.get("approveUpdateId");
  const workType = searchParams.get("workType") as 'public' | 'private' | null;
  const pageToReturnTo = searchParams.get('page');
  
  const { user, isLoading: authIsLoading, fetchAllUsers } = useAuth();
  const { fetchEntryForEditing } = useFileEntries();
  const { staffMembers, isLoading: staffIsLoading } = useStaffMembers();
  const { getPendingUpdateById, hasPendingUpdateForFile } = usePendingUpdates();
  const { toast } = useToast();
  const { setHeader } = usePageHeader();
  
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [fileNoForHeader, setFileNoForHeader] = useState<string | null>(null);
  const [isFormDisabledForSupervisor, setIsFormDisabledForSupervisor] = useState(false);
  
  const isApprovingUpdate = !!(user?.role === 'editor' && approveUpdateId);
  
  const returnPath = useMemo(() => {
    let base = '/dashboard/file-room';
    if (workTypeContext === 'private') base = '/dashboard/private-deposit-works';
    if (isApprovingUpdate) base = '/dashboard/pending-updates';
    
    return pageToReturnTo ? `${base}?page=${pageToReturnTo}` : base;
  }, [workTypeContext, isApprovingUpdate, pageToReturnTo]);

  useEffect(() => {
    const loadAllData = async () => {
        setDataLoading(true);
        setErrorState(null);

        if (authIsLoading) return;
        if (!user) {
            setErrorState("You must be logged in to view this page.");
            setDataLoading(false);
            return;
        }

        try {
            const allUsersResult = (user.role === 'editor') ? await fetchAllUsers() : [];

            if (!fileIdToEdit) {
                setPageData({ initialData: getFormDefaults(), allUsers: allUsersResult });
                return;
            }

            const originalEntry = await fetchEntryForEditing(fileIdToEdit);

            if (!originalEntry) {
                setErrorState("Could not find the requested file. It may have been deleted or you may not have permission.");
                return;
            }

            if (user.role === 'supervisor' && user.uid) {
                const hasPending = await hasPendingUpdateForFile(originalEntry.fileNo, user.uid);
                if (hasPending) {
                    setIsFormDisabledForSupervisor(true);
                    toast({ title: "Edits Locked", description: "This file has a pending update and cannot be edited until reviewed by an admin.", duration: 6000 });
                }
            }
            
            let dataForForm: DataEntryFormData = originalEntry;

            if (isApprovingUpdate && approveUpdateId) {
                const pendingUpdate = await getPendingUpdateById(approveUpdateId);
                if (pendingUpdate) {
                    let mergedData = JSON.parse(JSON.stringify(originalEntry));
                    const updatedSitesMap = new Map(pendingUpdate.updatedSiteDetails.map(site => [site.nameOfSite, site]));
                    
                    mergedData.siteDetails = mergedData.siteDetails?.map((originalSite: any) => updatedSitesMap.get(originalSite.nameOfSite) || originalSite) || [];
                    dataForForm = mergedData;
                    toast({ title: "Reviewing Update", description: `Loading changes from ${pendingUpdate.submittedByName}. Please review and save.` });
                }
            }

            setFileNoForHeader(dataForForm.fileNo);
            setPageData({ initialData: processDataForForm(dataForForm), allUsers: allUsersResult });

        } catch (error) {
            console.error("Error loading data for form:", error);
            setErrorState("Could not load all required data.");
            toast({ title: "Error Loading Data", description: "An unexpected error occurred.", variant: "destructive" });
        } finally {
            setDataLoading(false);
        }
    };
    
    loadAllData();
  }, [fileIdToEdit, approveUpdateId, user, authIsLoading, fetchAllUsers, fetchEntryForEditing, getPendingUpdateById, toast, isApprovingUpdate, hasPendingUpdateForFile]);

  useEffect(() => {
    let title = "Loading...";
    let description = "Please wait while the page content is loading.";
    const isCreatingNew = !fileIdToEdit;

    if (!dataLoading) {
        if (errorState) {
            title = "Error Loading File";
            description = errorState;
        } else if (user?.role === 'editor') {
            if (isCreatingNew) {
                title = workTypeContext === 'private'
                    ? "New File Data Entry - Private Deposit"
                    : "New File Data Entry - Deposit Work";
                description = "Use this form to input new work orders, project updates, or other relevant data for the Ground Water Department.";
            } else if (approveUpdateId) {
                title = "Approve Pending Updates";
                description = `Reviewing and approving updates for File No: ${fileNoForHeader}. Click "Save Changes" to finalize.`;
            } else if (fileNoForHeader) {
                title = "Edit File Data";
                description = `Editing details for File No: ${fileNoForHeader}. Please make your changes and submit.`;
            } else if (fileIdToEdit) {
                 title = "Error Loading File";
                 description = "Could not find the requested file. It may have been deleted.";
            }
        } else if (user?.role === 'supervisor') {
           if (isCreatingNew) {
             title = "Access Denied";
             description = "Supervisors cannot create new files.";
           } else if (fileNoForHeader) {
             title = "Edit Assigned Site Details";
             description = `Editing assigned sites for File No: ${fileNoForHeader}. Submit your changes for approval.`;
           } else if (fileIdToEdit) {
               title = "Error Loading File";
               description = "Could not find the requested file. You may not have permission to view it.";
           }
        } else if (user?.role === 'viewer') {
            if (fileNoForHeader) {
                title = "View File Data";
                description = `Viewing details for File No: ${fileNoForHeader}. You are in read-only mode.`;
            } else if (isCreatingNew) {
                 title = "Access Denied";
                 description = "You do not have permission to create new file entries. This action is restricted to Editors.";
            } else if(fileIdToEdit) {
                 title = "Error Loading File";
                 description = "Could not find the requested file. It may have been deleted.";
            }
        }
    }
    
    setHeader(title, description);
  }, [fileIdToEdit, user, approveUpdateId, setHeader, fileNoForHeader, workTypeContext, dataLoading, errorState]);


  const supervisorList = useMemo(() => {
    if (!user || !pageData || staffIsLoading) return [];
    
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
  }, [pageData, staffMembers, user, staffIsLoading]);
  
  const isLoading = authIsLoading || dataLoading;
  
  const isDeniedAccess = !isLoading && ((user?.role === 'viewer' && !fileIdToEdit) || (user?.role === 'supervisor' && !fileIdToEdit) || !user);

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading file data...</p>
      </div>
    );
  }

  if (errorState) {
    return (
        <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
            <div className="space-y-6 p-6 text-center">
                <ShieldAlert className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Error Loading File</h1>
                <p className="text-muted-foreground">{errorState}</p>
                 <Button variant="outline" onClick={() => router.back()}>Go Back</Button>
            </div>
             {isApprovingUpdate && <p className="text-sm text-muted-foreground animate-pulse">Redirecting...</p>}
        </div>
    );
  }
  
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
  
  if (!pageData && fileIdToEdit) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Finalizing...</p>
      </div>
    );
  }


  return (
    <div className="space-y-6">
       {fileIdToEdit && (
        <div className="flex justify-end mb-4">
            <Button variant="destructive" size="sm" onClick={() => router.push(returnPath)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
            </Button>
        </div>
       )}
      <Card className="shadow-lg">
        <CardContent className="p-6">
          {pageData && pageData.initialData ? (
             <DataEntryFormComponent
                key={approveUpdateId || fileIdToEdit || 'new-entry'} 
                fileNoToEdit={fileNoForHeader ?? undefined}
                initialData={pageData.initialData}
                supervisorList={supervisorList}
                userRole={user?.role}
                workTypeContext={workTypeContext}
                pageToReturnTo={pageToReturnTo}
                isFormDisabled={isFormDisabledForSupervisor}
             />
          ) : (
            <div className="flex h-64 items-center justify-center">
              <p className="text-muted-foreground">Form data could not be loaded or you do not have permission.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
