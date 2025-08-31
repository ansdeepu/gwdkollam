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
  suggestedFields: z.array(z.string()).describe('An array of the field IDs that should be included in the report.'),
});
export type SuggestReportFormatOutput = z.infer<typeof SuggestReportFormatOutputSchema>;


export async function suggestReportFormat(input: SuggestReportFormatInput): Promise<SuggestReportFormatOutput> {
  const result = await suggestReportFormatFlow(input);
  return result;
}

const availableFieldsPrompt = `
Here is a list of all available fields that can be included in the report. Each item has a unique 'id' and a descriptive 'label'.

${JSON.stringify(reportableFields, null, 2)}
`;


const suggestReportFormatFlow = ai.defineFlow(
  {
    name: 'suggestReportFormatFlow',
    inputSchema: SuggestReportFormatInputSchema,
    outputSchema: SuggestReportFormatOutputSchema,
  },
  async (input) => {
    const prompt = await ai.generate({
      prompt: `
        You are an expert data analyst for a government ground water department. Your task is to select the most relevant columns for a report based on the user's request.

        Analyze the user's request below and select the most appropriate field IDs from the list of available fields.

        User's Request:
        - What data are they looking for? "${input.dataDescription}"
        - What is their goal for this report? "${input.reportGoal}"

        Available Fields:
        ${availableFieldsPrompt}

        Instructions:
        1. Read the user's request carefully to understand their intent.
        2. From the "Available Fields" list, identify the 'id' of each field that directly addresses the user's request.
        3. Prioritize fields that are explicitly mentioned or strongly implied by the request.
        4. Do not include fields that are irrelevant to the request.
        5. Return only an array of the selected field IDs in the 'suggestedFields' property.
      `,
      model: 'googleai/gemini-1.5-flash-latest',
      output: {
        schema: SuggestReportFormatOutputSchema,
      },
    });

    return prompt.output ?? { suggestedFields: [] };
  }
);
