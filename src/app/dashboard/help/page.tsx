// src/app/dashboard/help/page.tsx
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { HelpCircle, User, Users, Edit, Eye, ClipboardList, Search, Settings, BarChart3, FileText, FolderOpen } from "lucide-react";

export default function HelpPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <HelpCircle className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Help & Documentation
        </h1>
      </div>
      <p className="text-muted-foreground">
        Welcome to the GWD Kollam Dashboard. This guide provides instructions on how to use the application effectively.
      </p>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>User Roles & Permissions</CardTitle>
          <CardDescription>
            The dashboard has three types of user roles, each with different permissions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start space-x-4 p-4 border rounded-lg">
            <Users className="h-6 w-6 text-primary mt-1" />
            <div>
              <h3 className="font-semibold">Editor (Administrator)</h3>
              <p className="text-sm text-muted-foreground">
                Editors have full access to all features, including creating new files, editing all fields, managing staff and users, and approving updates from supervisors.
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-4 p-4 border rounded-lg">
            <Edit className="h-6 w-6 text-orange-500 mt-1" />
            <div>
              <h3 className="font-semibold">Supervisor</h3>
              <p className="text-sm text-muted-foreground">
                Supervisors can view files and update the status and details of sites specifically assigned to them. They cannot create new files or edit main file details. Their updates must be approved by an Editor.
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-4 p-4 border rounded-lg">
            <Eye className="h-6 w-6 text-gray-500 mt-1" />
            <div>
              <h3 className="font-semibold">Viewer</h3>
              <p className="text-sm text-muted-foreground">
                Viewers have read-only access to most of the data. They cannot create, edit, or delete any information.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Accordion type="single" collapsible className="w-full space-y-2">
        <AccordionItem value="dashboard-overview" className="border rounded-lg bg-card">
          <AccordionTrigger className="p-4 text-lg font-semibold text-primary hover:no-underline">
            <div className="flex items-center gap-3"><ClipboardList /> Dashboard Overview</div>
          </AccordionTrigger>
          <AccordionContent className="p-6 pt-0 border-t mt-2">
            <div className="space-y-2 text-muted-foreground">
              <p>The main dashboard provides a real-time summary of all activities and data within the system.</p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li><strong>File Status Overview:</strong> See the total number of files and their distribution across different statuses.</li>
                <li><strong>Files by Age:</strong> Tracks how long files have been in the system based on their last remittance date.</li>
                <li><strong>Work Status by Service:</strong> A table showing the breakdown of different work types (BWC, TWC, etc.) by their current status.</li>
                <li><strong>Finance Overview:</strong> A summary of financial transactions across different accounts. You can filter this by date.</li>
                <li><strong>Notice Board:</strong> Displays important updates and birthday reminders for staff.</li>
              </ul>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="data-entry" className="border rounded-lg bg-card">
          <AccordionTrigger className="p-4 text-lg font-semibold text-primary hover:no-underline">
             <div className="flex items-center gap-3"><Edit /> File Data Entry & Updates</div>
          </AccordionTrigger>
          <AccordionContent className="p-6 pt-0 border-t mt-2">
             <div className="space-y-2 text-muted-foreground">
                <h4 className="font-semibold text-foreground">For Editors:</h4>
                <ul className="list-disc list-inside space-y-1 pl-2">
                    <li>To create a new file, navigate to the "File Data Entry" page from the sidebar.</li>
                    <li>Fill in all compulsory fields, marked with a red asterisk (*).</li>
                    <li>You can add multiple sites, remittance details, and payment entries within a single file using the "Add" buttons.</li>
                    <li>To edit an existing file, find it in the "File Manager" and click the edit icon.</li>
                </ul>
                <h4 className="font-semibold text-foreground mt-4">For Supervisors:</h4>
                <ul className="list-disc list-inside space-y-1 pl-2">
                    <li>You cannot create new files.</li>
                    <li>To update a site assigned to you, find the file in the "File Manager" and click the edit icon.</li>
                    <li>You will only be able to edit specific fields related to the work status and progress of the site(s) assigned to you.</li>
                    <li>After saving, your changes will be sent to an Editor for approval via the "Pending Updates" page.</li>
                </ul>
             </div>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="file-manager" className="border rounded-lg bg-card">
          <AccordionTrigger className="p-4 text-lg font-semibold text-primary hover:no-underline">
             <div className="flex items-center gap-3"><FolderOpen /> File Manager</div>
          </AccordionTrigger>
          <AccordionContent className="p-6 pt-0 border-t mt-2">
             <div className="space-y-2 text-muted-foreground">
              <p>The File Manager is the central repository for all file entries.</p>
               <ul className="list-disc list-inside space-y-1 pl-2">
                    <li>Use the search bar at the top to quickly find any file by searching for any detail associated with it (e.g., File No, Applicant Name, Site Name, Status).</li>
                    <li>Click the eye icon to view the complete details of a file in a pop-up dialog.</li>
                    <li>Click the edit icon to open the file in the Data Entry form to make changes.</li>
                    <li>Editors can use the trash icon to permanently delete a file entry.</li>
                </ul>
             </div>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="reports" className="border rounded-lg bg-card">
          <AccordionTrigger className="p-4 text-lg font-semibold text-primary hover:no-underline">
             <div className="flex items-center gap-3"><FileText /> Reports</div>
          </AccordionTrigger>
          <AccordionContent className="p-6 pt-0 border-t mt-2">
             <div className="space-y-2 text-muted-foreground">
                <p>The Reports section allows you to generate detailed tables based on various filters.</p>
                <ul className="list-disc list-inside space-y-1 pl-2">
                    <li>Use the filters at the top to narrow down your data. You can filter by date ranges, status, application type, and more.</li>
                    <li>The table will update automatically as you apply filters.</li>
                    <li>You can export the generated report to an Excel file using the "Export Excel" button.</li>
                    <li>The "Report Builders" page provides a tool to create fully custom reports by selecting the specific data columns you need.</li>
                </ul>
             </div>
          </AccordionContent>
        </AccordionItem>

      </Accordion>
    </div>
  );
}
