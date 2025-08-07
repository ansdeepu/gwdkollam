
// src/app/dashboard/report-format-suggestion/page.tsx
import CustomReportBuilder from "@/components/ai/ReportFormatSuggester"; 
import { Settings2 } from "lucide-react"; 

export default function CustomReportBuilderPage() { 
  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Select the data fields you want to include in your report. The system will fetch the relevant data from the GWD Kollam database and generate a table for you to view and download.
      </p>
      
      <CustomReportBuilder />
    </div>
  );
}
