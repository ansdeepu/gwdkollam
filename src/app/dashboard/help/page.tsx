
// src/app/dashboard/help/page.tsx
"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { usePageHeader } from "@/hooks/usePageHeader";
import { useEffect, useState } from "react";
import { format } from "date-fns";

const HelpCircle = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
);
const LifeBuoy = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="4.93" x2="9.17" y1="4.93" y2="9.17"/><line x1="14.83" x2="19.07" y1="14.83" y2="19.07"/><line x1="14.83" x2="19.07" y1="9.17" y2="4.93"/><line x1="4.93" x2="9.17" y1="19.07" y2="14.83"/></svg>
);
const Building = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect width="16" height="20" x="4" y="2" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>
);
const Server = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect width="20" height="8" x="2" y="2" rx="2" ry="2"/><rect width="20" height="8" x="2" y="14" rx="2" ry="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/></svg>
);
const LayoutDashboard = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
);
const ScrollText = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M8 21h12a2 2 0 0 0 2-2v-2h-3"/><path d="M22 16V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12.5a3.5 3.5 0 0 0 3.5 3.5H16"/><path d="M16 16.5a3.5 3.5 0 0 1-3.5 3.5V16h-1"/><path d="M11 19v-2.5a3.5 3.5 0 0 1 3.5-3.5H16"/></svg>
);
const ImageUp = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M10.3 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10l-3.1-3.1a2 2 0 0 0-2.814.014L6 21"/><path d="m14 19.5 3-3 3 3"/><path d="M17 22v-5.5"/><circle cx="9" cy="9" r="2"/></svg>
);
const Hammer = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m15 12-8.5 8.5c-.83.83-2.17.83-3 0 0 0 0 0 0 0a2.12 2.12 0 0 1 0-3L12 9"/><path d="M17.64 15 22 10.64"/><path d="m20.91 11.7-1.25-1.25c-.6-.6-.93-1.4-.93-2.25v-.86L16.01 4.6a5.56 5.56 0 0 0-3.94-1.64H9l.92.92a2.29 2.29 0 0 1-.17 3.23l-2.48 2.48a2.29 2.29 0 0 1-3.23-.17L2 15h6.83a2 2 0 0 0 1.42-.59L15 12Z"/></svg>
);
const Truck = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M5 18H3c-.6 0-1-.4-1-1V7c0-.6.4-1 1-1h10c.6 0 1 .4 1 1v11"/><path d="M14 9h4l4 4v4c0 .6-.4 1-1 1h-2"/><circle cx="7" cy="18" r="2"/><path d="M15 18H9"/><circle cx="17" cy="18" r="2"/></svg>
);
const Code = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
);
const Bot = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
);
const Palette = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.668 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>
);
const Database = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg>
);


export const dynamic = 'force-dynamic';

export default function HelpPage() {
  const { setHeader } = usePageHeader();
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    setHeader("Help & About", "Find answers to common questions and learn more about the application.");
    setLastUpdated(new Date());
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
              This digital dashboard is designed to streamline the operations of the Ground Water Department, Kollam. It serves as a centralized platform for managing file entries, tracking the progress of various projects, overseeing staff accounts, and generating detailed reports. By digitizing these workflows, the application aims to enhance efficiency, improve data accuracy, and provide a clear, real-time overview of all departmental activities.
            </p>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
           <div className="flex items-center space-x-3">
            <Code className="h-6 w-6 text-primary" />
            <CardTitle>Technology Stack</CardTitle>
          </div>
          <CardDescription>
            This application is built with a modern, high-performance tech stack.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                <Code className="h-6 w-6 text-sky-600"/>
                <div>
                    <h4 className="font-semibold">Next.js (v14) & React (v18)</h4>
                    <p className="text-xs text-muted-foreground">For a fast, server-rendered user interface.</p>
                </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                <Palette className="h-6 w-6 text-teal-600"/>
                <div>
                    <h4 className="font-semibold">Tailwind & ShadCN</h4>
                    <p className="text-xs text-muted-foreground">For modern styling and accessible components.</p>
                </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                 <Database className="h-6 w-6 text-amber-600"/>
                <div>
                    <h4 className="font-semibold">Firebase (v12)</h4>
                    <p className="text-xs text-muted-foreground">Powers the database, authentication, and backend.</p>
                </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                <Bot className="h-6 w-6 text-purple-600"/>
                <div>
                    <h4 className="font-semibold">Genkit AI</h4>
                    <p className="text-xs text-muted-foreground">Drives intelligent features and suggestions.</p>
                </div>
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
                  <li><strong>Editor:</strong> Has full, unrestricted access to all features. Editors can create, edit, and delete all file entries, manage staff and user accounts, approve pending updates from supervisors, and set GWD rates. This role is for administrators.</li>
                  <li><strong>Supervisor:</strong> Has restricted, site-level editing rights. Supervisors can only see and edit their assigned sites from the 'Deposit Works' and 'ARS' pages. Their changes must be approved by an Editor. They cannot create new files or edit file-level details.</li>
                  <li><strong>Viewer:</strong> Has read-only access across the entire application. Viewers can see all data, reports, and user lists but cannot make any changes. This role is for observation and monitoring purposes.</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-11">
                <AccordionTrigger>How do I add a photo for a staff member?</AccordionTrigger>
                <AccordionContent>
                    <div className="space-y-2 text-sm text-muted-foreground">
                        <p className="flex items-start gap-2"><ImageUp className="h-4 w-4 mt-1 shrink-0"/> Direct file uploading is not supported. To add a staff photo, you must use a public URL of an image that is already online.</p>
                        <p>Follow these steps:</p>
                        <ol className="list-decimal pl-6 space-y-1">
                            <li>Upload the staff photo to a public image hosting service (like Imgur or Postimages).</li>
                            <li>Get the "direct link" to the image. This link should end in an image format like `.jpg` or `.png`.</li>
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
                    The relationship between Local Self Governments and Constituencies is managed in the **Settings** page.
                    <ul className="list-disc pl-6 mt-2 space-y-2 text-sm">
                        <li>An Editor can bulk-import an Excel file to define which constituencies belong to each LSG. An LSG can be associated with one or more constituencies.</li>
                        <li>When editing a Site, selecting an LSG will automatically filter the "Constituency" dropdown to show only relevant options.</li>
                        <li>If an LSG is associated with only **one** constituency, the "Constituency" field will be automatically selected and disabled to ensure data accuracy.</li>
                    </ul>
                </AccordionContent>
            </AccordionItem>
             <AccordionItem value="item-12">
              <AccordionTrigger>What is the e-Tender module for?</AccordionTrigger>
              <AccordionContent>
                The e-Tender module is a complete system for managing the tendering process electronically.
                 <ul className="list-disc pl-6 mt-2 space-y-2 text-sm">
                  <li><strong>Tender Creation:</strong> Editors can create new tenders, inputting all basic details, financial information, and key dates.</li>
                  <li><strong>Bidder Management:</strong> Add and manage bidders for each tender, including their quoted amounts and status.</li>
                  <li><strong>Automated Fee Calculation:</strong> Tender Fees and EMD are automatically calculated based on the tender amount and type (Work or Purchase).</li>
                  <li><strong>PDF Generation:</strong> The system can generate all necessary documents, such as the Notice Inviting Tender (NIT), Selection Notices, and Work/Supply Orders, with all data pre-filled.</li>
                  <li><strong>Status Tracking:</strong> The present status of each tender can be updated throughout its lifecycle, from "Tender Process" to "Work Order Issued".</li>
                 </ul>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-13">
              <AccordionTrigger>What is the Vehicle & Rig Management page for?</AccordionTrigger>
              <AccordionContent>
                The Vehicle & Rig Management page is a centralized module for tracking all vehicles and heavy machinery operated by the department. It is divided into three main sections:
                <ul className="list-disc pl-6 mt-2 space-y-2 text-sm">
                  <li><strong>Department Vehicles:</strong> Manages vehicles owned by the department. Tracks details like model, registration, and expiry dates for fitness, tax, insurance, and pollution certificates.</li>
                  <li><strong>Hired Vehicles:</strong> Manages vehicles hired from external agencies. Tracks agreement validity, hire charges, and certificate expiries.</li>
                  <li><strong>Rig & Compressor Units:</strong> Manages departmental rigs, compressors, and their associated vehicles.</li>
                </ul>
                The module also includes an "Expiry Alerts" feature to proactively notify about certificates that are expired or expiring soon.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-5">
              <AccordionTrigger>How do supervisors submit updates?</AccordionTrigger>
              <AccordionContent>
                Supervisors can edit their assigned sites through the 'Deposit Works' or 'ARS' pages by clicking the "Edit" button on a file. After making changes to the site-specific fields and clicking "Save Changes", the update is submitted for review. It does not change the data directly. An Editor must then go to the "Pending Actions" page to approve or reject the submission. The site will be locked from further edits by the supervisor until the update is reviewed.
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
                  <li><strong>Deposit Works:</strong> Found in the "File Room", this section is for all standard departmental projects like Borewell Construction (BWC), Tube Well Construction (TWC), etc. It uses a comprehensive data entry form that handles all aspects of these complex files.</li>
                  <li><strong>ARS (Artificial Recharge Schemes):</strong> This is a dedicated module for managing ARS projects like check dams and recharge pits. It has its own simplified data entry form and a bulk Excel import/export feature specifically tailored for ARS data. ARS entries are managed separately and will not appear in the main Deposit Works list.</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-9">
              <AccordionTrigger>What are the 'Rig Registration' and 'GWD Rates' pages for?</AccordionTrigger>
              <AccordionContent>
                 <ul className="list-disc pl-6 mt-2 space-y-2 text-sm">
                   <li><strong>Rig Registration:</strong> This module is for managing the registration and renewal of all drilling rigs operated by private agencies. It tracks agency details, owner information, and the status of each individual rig, including its registration validity and renewal history.</li>
                   <li><strong>GWD Rates:</strong> This page serves as a master list for all standard departmental items and their approved rates (e.g., drilling rates per meter). This data is planned to be used for automated estimate generation in the future.</li>
                 </ul>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-7">
              <AccordionTrigger>How can I export data to Excel?</AccordionTrigger>
              <AccordionContent>
                On pages like Establishment, ARS, GWD Rates, and Reports, you will find an "Export Excel" button. Clicking this button will generate and download an XLSX file containing the data currently visible on that page. If you have applied any filters (like a date range or search term), the exported file will only contain the filtered results.
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
        <CardContent className="space-y-2">
           <p className="text-sm">
            <strong>Administrator Contact:</strong> 8547650853
          </p>
           {lastUpdated && (
            <p className="text-xs text-muted-foreground">
              Help page last updated: {format(lastUpdated, 'dd MMM yyyy, hh:mm a')}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
      
    