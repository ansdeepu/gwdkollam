// src/ai/flows/report-suggester-flow.ts
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { reportableFields } from '@/lib/schemas';

const SuggestReportFormatInputSchema = z.object({
  dataDescription: z.string().describe('A natural language description of the data the user wants to see in the report.'),
  reportGoal: z.string().describe('A natural language description of what the user wants to accomplish with this report.'),
});
export type SuggestReportFormatInput = z.infer<typeof SuggestReportFormatInputSchema>;

const SuggestReportFormatOutputSchema = z.object({
  reasoning: z.string().describe("A brief explanation of why the suggested fields were chosen, based on the user's request."),
  suggestedFields: z.array(z.string()).describe('An array of the field IDs that should be included in the report, chosen from the available fields list.'),
});
export type SuggestReportFormatOutput = z.infer<typeof SuggestReportFormatOutputSchema>;


export async function suggestReportFormat(input: SuggestReportFormatInput): Promise<SuggestReportFormatOutput> {
  const result = await suggestReportFormatFlow(input);
  return result;
}

const availableFieldsJson = JSON.stringify(
  reportableFields.map(field => ({ id: field.id, label: field.label })),
  null,
  2
);

const suggestReportFormatFlow = ai.defineFlow(
  {
    name: 'suggestReportFormatFlow',
    inputSchema: SuggestReportFormatInputSchema,
    outputSchema: SuggestReportFormatOutputSchema,
  },
  async (input) => {
    const prompt = `
      You are an expert data analyst for a government ground water department.
      Your task is to analyze a user's request for a report and select the most relevant data fields from a provided list.

      Here is the user's request:
      - Data Description: "${input.dataDescription}"
      - Report Goal: "${input.reportGoal}"

      Here is the list of available fields you can choose from:
      ${availableFieldsJson}

      Based on the user's request, please perform the following steps:
      1.  Analyze the data description and report goal to understand the user's intent.
      2.  Think step-by-step about which of the available fields are most relevant to fulfilling the user's goal.
      3.  Provide a brief 'reasoning' for your field selection.
      4.  Return a 'suggestedFields' array containing only the 'id' strings of the fields you have chosen.
    `;

    const result = await ai.generate({
      prompt: prompt,
      model: 'googleai/gemini-1.5-flash-latest',
      output: {
        schema: SuggestReportFormatOutputSchema,
      },
    });

    return result.output ?? { reasoning: "Could not generate a response.", suggestedFields: [] };
  }
);