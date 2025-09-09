// src/app/dashboard/help/page.tsx
"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle, LifeBuoy, Building, Server } from "lucide-react";
import { usePageHeader } from "@/hooks/usePageHeader";
import { useEffect } from "react";

export const dynamic = 'force-dynamic';

export default function HelpPage() {
  const { setHeader } = usePageHeader();
  useEffect(() => {
    setHeader("Help & About", "Find answers to common questions and learn more about the application.");
  }, [setHeader]);

  return (
    <div className="space-y-6">
       <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <Building className="h-6 w-6 text-primary" />
            <CardTitle>About the Ground Water Department</CardTitle>
          </div>
          <CardDescription>
            An overview of the department and the purpose of this application.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold text-foreground mb-2">Ground Water Department, Kollam</h3>
            <p className="text-sm text-muted-foreground">
              The Ground Water Department is the state-level agency entrusted with the development, management, conservation, and regulation of precious ground water resources. The department provides technical guidance for various schemes, including well construction, groundwater recharge projects, and water supply systems for both government and private sectors. Its key services involve hydrogeological surveys, drilling, and monitoring to ensure the sustainable use of groundwater for drinking, agriculture, and industrial purposes.
            </p>
          </div>
           <div className="pt-4 border-t">
            <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2"><Server className="h-4 w-4" /> Purpose of This Web Application</h3>
            <p className="text-sm text-muted-foreground">
              This digital dashboard is designed to streamline the operations of the Ground Water Department, Kollam. It serves as a centralized platform for managing file entries, tracking the progress of various projects from application to completion, overseeing staff and user accounts, and generating detailed reports. By digitizing these workflows, the application aims to enhance efficiency, improve data accuracy, and provide a clear, real-time overview of all departmental activities.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions (FAQ)</CardTitle>
          <CardDescription>Common questions about using the GWD Kollam Dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>What are the different user roles?</AccordionTrigger>
              <AccordionContent>
                There are three main roles in this application, each with different permissions:
                <ul className="list-disc pl-6 mt-2 space-y-2 text-sm">
                  <li><strong>Editor:</strong> Has full, unrestricted access to all features. Editors can create, edit, and delete all file entries (Deposit Works, ARS, Rig Registrations), manage staff and user accounts, approve pending updates from supervisors, and set GWD rates. This role is for administrators.</li>
                  <li><strong>Supervisor:</strong> Has restricted, site-level editing rights. Supervisors can only see files where they are assigned to at least one site. They can edit their assigned sites (if the work status is ongoing), but their changes must be approved by an Editor. They cannot create new files or edit file-level details.</li>
                  <li><strong>Viewer:</strong> Has read-only access across the entire application. Viewers can see all data, reports, and user lists but cannot make any changes. This role is for observation and monitoring purposes.</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-5">
              <AccordionTrigger>How do supervisors submit updates?</AccordionTrigger>
              <AccordionContent>
                Supervisors can edit their assigned sites through the 'Deposit Works' or 'ARS' pages. After making changes, clicking "Save Changes" submits the update for review. It does not change the data directly. An Editor must approve the submission from the "Pending Updates" page. The site will be locked from further edits by the supervisor until the update is approved or rejected.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger>Why can't I edit a file or site?</AccordionTrigger>
              <AccordionContent>
                Editing permissions are based on your role:
                 <ul className="list-disc pl-6 mt-2 space-y-1 text-sm">
                  <li><strong>Editors</strong> can edit anything.</li>
                  <li><strong>Supervisors</strong> can only edit sites they are assigned to, and only if the site's work status is "Work Order Issued", "Work Initiated", or "Work in Progress". If an update has already been submitted, the site is locked until an Editor reviews it.</li>
                   <li><strong>Viewers</strong> cannot edit anything.</li>
                </ul>
                 If you believe you should have editing rights, please contact an administrator.
              </AccordionContent>
            </AccordionItem>
             <AccordionItem value="item-6">
              <AccordionTrigger>What is the difference between 'Deposit Works' and 'ARS'?</AccordionTrigger>
              <AccordionContent>
                The two pages manage different types of work:
                 <ul className="list-disc pl-6 mt-2 space-y-1 text-sm">
                  <li><strong>Deposit Works:</strong> This is for all standard departmental work files (BWC, TWC, MWSS, etc.). All data entry and management for these projects happen here.</li>
                  <li><strong>ARS:</strong> This page is exclusively for managing Artificial Recharge Scheme sites. It has a dedicated data entry form and bulk Excel import functionality tailored for ARS projects. ARS data is kept separate and will not appear in the main Deposit Works files.</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-7">
              <AccordionTrigger>How can I export data to Excel?</AccordionTrigger>
              <AccordionContent>
                On pages with an "Export Excel" button (like Establishment, ARS, and Reports), clicking this button will generate and download an XLSX file containing the data currently displayed or filtered on that page. The pop-up dialogs on the Dashboard and other pages also have an export button to download the specific details you are viewing.
              </AccordionContent>
            </AccordionItem>
              <AccordionItem value="item-4">
              <AccordionTrigger>What does 'Pending Approval' mean on my user account?</AccordionTrigger>
              <AccordionContent>
                For security, all new user accounts must be manually approved by an Editor. If your account is pending approval, you will not be able to log in. Please contact the administrator to have your account activated.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>How do I reset my password?</AccordionTrigger>
              <AccordionContent>
                You can change your password from your Profile page. Click on your name in the sidebar at the bottom-left, select "Profile", and use the "Change Password" form. If you have forgotten your password entirely, please contact the administrator for a reset.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
      
      <Card className="mt-6 border-primary/20 bg-primary/5">
        <CardHeader>
           <div className="flex items-center space-x-3">
            <LifeBuoy className="h-6 w-6 text-primary" />
            <CardTitle>Contact for Support</CardTitle>
          </div>
          <CardDescription>
            If you encounter technical issues or have questions not covered in the FAQ, please contact the administrator.
          </CardDescription>
        </CardHeader>
        <CardContent>
           <p className="text-sm">
            <strong>Administrator Contact:</strong> 8547650853
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
