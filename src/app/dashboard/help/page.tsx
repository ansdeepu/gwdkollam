// src/app/dashboard/help/page.tsx
"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle, LifeBuoy, Building, Server, LayoutDashboard, ScrollText, MapPin, ImageUp } from "lucide-react";
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
            <AccordionItem value="item-8">
              <AccordionTrigger>What do the 'Important Updates' and 'Notice Board' cards on the Dashboard show?</AccordionTrigger>
              <AccordionContent className="space-y-4">
                 <div>
                    <h4 className="font-medium text-foreground mb-1 flex items-center gap-2"><ScrollText className="h-4 w-4" />Important Updates</h4>
                    <p className="text-sm text-muted-foreground">This card is an automated "To-Do" list that highlights files needing attention. It scans for files with statuses like "To be Tendered," "TS Pending," etc. For Supervisors, it also shows any updates that an admin has rejected, so they can be corrected. The list auto-scrolls, and you can pause it by hovering over it.</p>
                 </div>
                 <div>
                    <h4 className="font-medium text-foreground mb-1 flex items-center gap-2"><LayoutDashboard className="h-4 w-4" />Notice Board</h4>
                    <p className="text-sm text-muted-foreground">This card shows birthday reminders for staff members. It displays today's birthdays and a scrolling list of upcoming birthdays for the rest of the month. You can click on a birthday notice to see a celebratory message.</p>
                 </div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-1">
              <AccordionTrigger>What are the different user roles?</AccordionTrigger>
              <AccordionContent>
                There are three main roles in this application, each with different permissions:
                <ul className="list-disc pl-6 mt-2 space-y-2 text-sm">
                  <li><strong>Editor:</strong> Has full, unrestricted access to all features. Editors can create, edit, and delete all file entries (Deposit Works, ARS, Rig Registrations), manage staff and user accounts, approve pending updates from supervisors, and set GWD rates. This role is for administrators.</li>
                  <li><strong>Supervisor:</strong> Has restricted, site-level editing rights. Supervisors can only see and edit their assigned sites from the 'Deposit Works' and 'ARS' pages. Their changes must be approved by an Editor. They cannot create new files, edit file-level details like applicant name, or manage other users.</li>
                  <li><strong>Viewer:</strong> Has read-only access across the entire application. Viewers can see all data, reports, and user lists but cannot make any changes. This role is for observation and monitoring purposes.</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-11">
                <AccordionTrigger>How do I add a photo for a staff member?</AccordionTrigger>
                <AccordionContent>
                    <div className="space-y-2 text-sm text-muted-foreground">
                        <p className="flex items-start gap-2"><ImageUp className="h-4 w-4 mt-1 shrink-0"/> Direct file uploading is not supported in this application. To add a staff photo, you must use a public URL of an image that is already online.</p>
                        <p>Follow these steps:</p>
                        <ol className="list-decimal pl-6 space-y-1">
                            <li>Upload the staff photo to a public image hosting service (like Imgur, Postimages, or a public Google Photos link).</li>
                            <li>Get the "direct link" to the image. This link should end in an image format like `.jpg`, `.png`, or `.jpeg`.</li>
                            <li>Go to the **Establishment** page and click "Edit" on the desired staff member.</li>
                            <li>Paste the direct image URL into the "Staff Photo URL" field.</li>
                            <li>A preview of the image will appear. If it looks correct, save the form.</li>
                        </ol>
                    </div>
                </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-10">
                <AccordionTrigger>How does the Local Self Govt (LSG) and Constituency mapping work?</AccordionTrigger>
                <AccordionContent>
                    The relationship between Local Self Governments (Panchayaths, Municipalities, Corporations) and Legislative Assembly Constituencies (LACs) is managed in the **Settings** page.
                    <ul className="list-disc pl-6 mt-2 space-y-2 text-sm">
                        <li>An Editor can bulk-import an Excel file to define which constituencies belong to each LSG. An LSG can be associated with one or more constituencies.</li>
                        <li>When editing a Site in the Data Entry forms, selecting an LSG will automatically filter the "Constituency" dropdown to show only relevant options.</li>
                        <li>If an LSG is associated with only **one** constituency, the "Constituency" field will be automatically selected and disabled to ensure data accuracy.</li>
                    </ul>
                </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-5">
              <AccordionTrigger>How do supervisors submit updates?</AccordionTrigger>
              <AccordionContent>
                Supervisors can edit their assigned sites through the 'Deposit Works' or 'ARS' pages by clicking the "Edit" button on a file. After making changes to the site-specific fields and clicking "Save Changes", the update is submitted for review. It does not change the data directly. An Editor must then go to the "Pending Updates" page to approve or reject the submission. The site will be locked from further edits by the supervisor until the update is reviewed.
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
                The application separates projects into two main categories for specialized management:
                 <ul className="list-disc pl-6 mt-2 space-y-2 text-sm">
                  <li><strong>Deposit Works:</strong> Found in the "File Room", this section is for all standard departmental projects like Borewell Construction (BWC), Tube Well Construction (TWC), Mini Water Supply Schemes (MWSS), etc. It uses a comprehensive data entry form that handles all aspects of these complex files.</li>
                  <li><strong>ARS (Artificial Recharge Schemes):</strong> This is a dedicated module for managing ARS projects like check dams and recharge pits. It has its own simplified data entry form and a bulk Excel import/export feature specifically tailored for ARS data. ARS entries are managed separately and will not appear in the main Deposit Works list.</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-9">
              <AccordionTrigger>What are the 'Rig Registration' and 'GWD Rates' pages for?</AccordionTrigger>
              <AccordionContent>
                 <ul className="list-disc pl-6 mt-2 space-y-2 text-sm">
                   <li><strong>Rig Registration:</strong> This module is for managing the registration and renewal of all drilling rigs operated by private agencies. It tracks agency details, owner information, and the status of each individual rig, including its registration validity and renewal history.</li>
                   <li><strong>GWD Rates:</strong> This page serves as a master list for all standard departmental items and their approved rates (e.g., drilling rates per meter for different diameters). This data is planned to be used for automated estimate generation in the future.</li>
                 </ul>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-7">
              <AccordionTrigger>How can I export data to Excel?</AccordionTrigger>
              <AccordionContent>
                On pages like Establishment, ARS, GWD Rates, and Reports, you will find an "Export Excel" button. Clicking this button will generate and download an XLSX file containing the data currently visible on that page. If you have applied any filters (like a date range or search term), the exported file will only contain the filtered results. This allows you to create customized data exports.
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
