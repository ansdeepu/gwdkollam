
// src/app/dashboard/report-format-suggestion/page.tsx
import CustomReportBuilder from "@/components/ai/ReportFormatSuggester"; 
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function CustomReportBuilderPage() { 
  const router = useRouter();

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>
      <CustomReportBuilder />
    </div>
  );
}
