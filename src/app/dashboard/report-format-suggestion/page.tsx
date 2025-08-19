
// src/app/dashboard/report-format-suggestion/page.tsx
import CustomReportBuilder from "@/components/ai/ReportFormatSuggester"; 
import { Settings2 } from "lucide-react"; 

export default function CustomReportBuilderPage() { 
  return (
    <div className="space-y-6">
      <CustomReportBuilder />
    </div>
  );
}

    