// src/app/dashboard/help/page.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle, LifeBuoy } from "lucide-react";

export default function HelpPage() {
  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Find answers to frequently asked questions and get help with the dashboard.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions (FAQ)</CardTitle>
          <CardDescription>Common questions about using the GWD Kollam Dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>How do I reset my password?</AccordionTrigger>
              <AccordionContent>
                You can change your password from your Profile page. Click on your name in the top-right corner of the header, select "Profile", and use the "Change Password" form. If you have forgotten your password entirely, please contact the administrator for a reset.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>Why can't I edit a file entry?</AccordionTrigger>
              <AccordionContent>
                Editing permissions are based on user roles. 'Editor' roles can create and edit all parts of a file entry. 'Supervisor' roles can only edit specific fields on sites that are assigned to them and are still active. 'Viewer' roles have read-only access and cannot make any changes.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger>What does 'Pending Approval' mean on my user account?</AccordionTrigger>
              <AccordionContent>
                For security, all new user accounts must be manually approved by an administrator with an 'Editor' role. If your account is pending approval, you will not be able to log in. Please contact the administrator to have your account activated.
              </AccordionContent>
            </AccordionItem>
             <AccordionItem value="item-4">
              <AccordionTrigger>How do supervisors submit updates?</AccordionTrigger>
              <AccordionContent>
                Supervisors can edit their assigned sites through the File Manager. After making changes, clicking the "Save Changes" button will submit their updates to an administrator for review. The changes will not be applied to the main file until an admin approves them from the "Pending Updates" page.
              </AccordionContent>
            </AccordionItem>
             <AccordionItem value="item-5">
              <AccordionTrigger>Where can I find reports?</AccordionTrigger>
              <AccordionContent>
                The "Reports" page in the navigation menu allows you to generate custom, filterable reports. The Dashboard also provides an at-a-glance overview of key metrics, and clicking on many of the numbers will open a detailed view.
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
