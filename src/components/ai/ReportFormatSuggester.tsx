
// src/components/ai/ReportFormatSuggester.tsx
"use client";
import React, { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ReportFormatSuggestionSchema, type ReportFormatSuggestionData, reportableFields } from '@/lib/schemas';
import { suggestReportFormat } from '@/ai/flows/report-suggester-flow';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Wand2, CheckSquare, Square, FileDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { useFileEntries } from '@/hooks/useFileEntries';

export default function CustomReportBuilder() {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedFields, setSuggestedFields] = useState<string[]>([]);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const { toast } = useToast();
  const { fileEntries } = useFileEntries();

  const form = useForm<ReportFormatSuggestionData>({
    resolver: zodResolver(ReportFormatSuggestionSchema),
    defaultValues: {
      dataDescription: '',
      reportGoal: '',
    },
  });

  const handleSuggestionSubmit = async (data: ReportFormatSuggestionData) => {
    setIsLoading(true);
    setSuggestedFields([]);
    setSelectedFields([]);
    try {
      const result = await suggestReportFormat(data);
      if (result.suggestedFields && result.suggestedFields.length > 0) {
        const validFields = result.suggestedFields.filter(fieldId => reportableFields.some(f => f.id === fieldId));
        setSuggestedFields(validFields);
        setSelectedFields(validFields); // Pre-select all suggested fields
        toast({ title: 'Suggestions Ready!', description: 'Review the suggested fields below.' });
      } else {
        toast({ title: 'No Suggestions', description: 'The AI could not determine a set of fields. Please try a different description.' });
      }
    } catch (error: any) {
      console.error(error);
      toast({ title: 'Error', description: error.message || 'Failed to get suggestions.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckboxChange = (fieldId: string) => {
    setSelectedFields(prev =>
      prev.includes(fieldId) ? prev.filter(id => id !== fieldId) : [...prev, fieldId]
    );
  };
  
  const handleExportExcel = () => {
    if (selectedFields.length === 0) {
      toast({ title: "No Fields Selected", description: "Please select at least one field to export.", variant: "destructive" });
      return;
    }
    
    const selectedFieldObjects = reportableFields.filter(f => selectedFields.includes(f.id));
    const headers = selectedFieldObjects.map(f => f.label);
    
    const dataForExport = fileEntries.map(entry => {
      const row: Record<string, any> = {};
      selectedFieldObjects.forEach(field => {
        row[field.label] = field.accessor(entry);
      });
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataForExport, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "CustomReport");
    const fileName = `Custom_Report_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    toast({ title: "Export Successful", description: `Downloaded report as ${fileName}` });
  };


  return (
    <>
      <CardHeader>
        <CardTitle>AI-Assisted Report Builder</CardTitle>
        <CardDescription>
          Describe the data you need and the purpose of your report. The AI will suggest a set of columns for you to export.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(handleSuggestionSubmit)} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="dataDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>What data are you looking for?</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="e.g., 'All files related to BWC that are currently in progress, including their financial details.'" rows={4} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reportGoal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>What is the goal of this report?</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="e.g., 'To create a summary for a monthly review meeting about ongoing well construction projects.'" rows={4} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="mr-2 h-4 w-4" />
              )}
              {isLoading ? 'Thinking...' : 'Suggest Report Format'}
            </Button>
          </form>
        </FormProvider>

        {suggestedFields.length > 0 && (
          <div className="pt-8 border-t">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h3 className="text-lg font-semibold">Suggested Report Columns</h3>
                    <p className="text-sm text-muted-foreground">Select the columns you want to include in your Excel export.</p>
                </div>
                <Button onClick={handleExportExcel} disabled={selectedFields.length === 0}>
                    <FileDown className="mr-2 h-4 w-4" />
                    Export Selected ({selectedFields.length})
                </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {suggestedFields.map(fieldId => {
                const field = reportableFields.find(f => f.id === fieldId);
                if (!field) return null;
                return (
                  <div
                    key={field.id}
                    className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-secondary/50 cursor-pointer"
                    onClick={() => handleCheckboxChange(field.id)}
                  >
                    <Checkbox
                      id={field.id}
                      checked={selectedFields.includes(field.id)}
                      onCheckedChange={() => handleCheckboxChange(field.id)}
                    />
                    <label
                      htmlFor={field.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {field.label}
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </>
  );
}
