
// src/app/dashboard/data-entry/page.tsx
"use client";
import DataEntryFormComponent from "@/components/shared/DataEntryForm";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Loader2, ArrowLeft } from "lucide-react";
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
  
  const isApprovingUpdate = !!(user?.role === 'editor' && approveUpdateId);
  
  const returnPath = useMemo(() => {
    let base = '/dashboard/file-room';
    if (workTypeContext === 'private') base = '/dashboard/private-deposit-works';
    if (isApprovingUpdate) base = '/dashboard/pending-updates';
    
    return pageToReturnTo ? `${base}?page=${pageToReturnTo}` : base;
  }, [workType, isApprovingUpdate, pageToReturnTo]);


  const loadAllData = useCallback(async () => {
    if (!user) {
      if (!authIsLoading) {
        setErrorState("User not authenticated.");
      }
      return;
    }

    setDataLoading(true);
    setErrorState(null);

    try {
        if (!fileIdToEdit) {
            const allUsersResult = (user.role === 'editor') ? await fetchAllUsers() : [];
            setPageData({
                initialData: getFormDefaults(),
                allUsers: allUsersResult,
            });
            return;
        }

        const originalEntry = await fetchEntryForEditing(fileIdToEdit);
        if (!originalEntry) {
            toast({ title: "Error", description: `File not found. It may have been deleted.`, variant: "destructive" });
            router.push('/dashboard');
            return;
        }

        if (user.role === 'supervisor' && !originalEntry.assignedSupervisorUids?.includes(user.uid)) {
            toast({ title: "Permission Denied", description: `You do not have permission to view this file.`, variant: "destructive" });
            router.push('/dashboard');
            return;
        }

        let dataForForm: DataEntryFormData = originalEntry;
        const allUsersResult = await fetchAllUsers();

        if (approveUpdateId) {
            const pendingUpdate = await getPendingUpdateById(approveUpdateId);
            if (pendingUpdate) {
                 if (pendingUpdate.status !== 'pending') {
                    toast({ title: "Update No Longer Pending", description: "This update has already been reviewed.", variant: "default" });
                } else {
                    let mergedData = JSON.parse(JSON.stringify(originalEntry));
                    const updatedSitesMap = new Map(pendingUpdate.updatedSiteDetails.map(site => [site.nameOfSite, site]));
                    
                    mergedData.siteDetails = mergedData.siteDetails?.map((originalSite: any) => {
                        return updatedSitesMap.get(originalSite.nameOfSite) || originalSite;
                    }) || [];
                    dataForForm = mergedData;
                    toast({ title: "Reviewing Update", description: `Loading changes from ${pendingUpdate.submittedByName}. Please review and save.` });
                }
            }
        }
        
        if (user.role === 'supervisor') {
            const hasActivePendingUpdate = await hasPendingUpdateForFile(originalEntry.fileNo, user.uid);
            dataForForm.siteDetails?.forEach(site => {
                if (site.supervisorUid === user.uid) {
                    site.isPending = hasActivePendingUpdate;
                }
            });
        }
        
        setFileNoForHeader(dataForForm.fileNo);
        setPageData({
            initialData: processDataForForm(dataForForm),
            allUsers: allUsersResult,
        });

    } catch (error) {
        console.error("Error loading data for form:", error);
        setErrorState("Could not load all required data.");
        toast({ title: "Error Loading Data", description: "An unexpected error occurred.", variant: "destructive" });
    } finally {
        setDataLoading(false);
    }
  }, [fileIdToEdit, approveUpdateId, user, authIsLoading, fetchEntryForEditing, getPendingUpdateById, fetchAllUsers, hasPendingUpdateForFile, router, toast]);

  useEffect(() => {
    if (!authIsLoading) {
        loadAllData();
    }
  }, [authIsLoading, loadAllData]);

  useEffect(() => {
    let title = "Loading...";
    let description = "Please wait while the page content is loading.";
    const isCreatingNew = !fileIdToEdit;

    if (!dataLoading) {
        if (errorState) {
            title = "Error";
            description = errorState;
        } else if (user?.role === 'editor') {
            if (isCreatingNew) {
                title = workType === 'private'
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
  }, [fileIdToEdit, user, approveUpdateId, setHeader, fileNoForHeader, workType, dataLoading, errorState]);


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
  
  const isDeniedAccess = !isLoading && ((user?.role === 'viewer' && !fileIdToEdit) || (user?.role === 'supervisor' && !fileIdToEdit) || !user);


  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading file data...</p>
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
    // This state occurs if there was an error during data loading (e.g., file not found and redirected)
    // The loading spinner provides a better UX than a brief flash of "Form data could not be loaded".
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Redirecting...</p>
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
                workTypeContext={workType}
                pageToReturnTo={pageToReturnTo}
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
