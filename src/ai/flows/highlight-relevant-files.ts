'use server';

/**
 * @fileOverview This file defines a Genkit flow to intelligently highlight files
 *   that are likely relevant to the user based on their content and recent interactions.
 *
 * - highlightRelevantFiles - A function that takes a file's content and user interactions
 *     and returns a boolean indicating whether the file should be highlighted.
 * - HighlightRelevantFilesInput - The input type for the highlightRelevantFiles function.
 * - HighlightRelevantFilesOutput - The return type for the highlightRelevantFiles function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const HighlightRelevantFilesInputSchema = z.object({
  fileContent: z.string().describe('The content of the file to be analyzed.'),
  userInteractions: z
    .string()
    .describe(
      'A summary of recent user interactions, such as search queries, file views, and edits.'
    ),
});
export type HighlightRelevantFilesInput = z.infer<
  typeof HighlightRelevantFilesInputSchema
>;

const HighlightRelevantFilesOutputSchema = z.object({
  shouldHighlight: z
    .boolean()
    .describe(
      'Whether the file should be highlighted based on its content and user interactions.'
    ),
  reason: z
    .string()
    .optional()
    .describe('The reason why the file should or should not be highlighted.'),
});
export type HighlightRelevantFilesOutput = z.infer<
  typeof HighlightRelevantFilesOutputSchema
>;

export async function highlightRelevantFiles(
  input: HighlightRelevantFilesInput
): Promise<HighlightRelevantFilesOutput> {
  return highlightRelevantFilesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'highlightRelevantFilesPrompt',
  input: {schema: HighlightRelevantFilesInputSchema},
  output: {schema: HighlightRelevantFilesOutputSchema},
  prompt: `You are an AI assistant that determines whether a file should be highlighted to a user based on its content and their recent interactions.

  Here is the file content:
  {{fileContent}}

  Here is a summary of the user's recent interactions:
  {{userInteractions}}

  Based on this information, determine if the file is likely to be relevant to the user. Return a JSON object with a boolean value for "shouldHighlight". If the file should be highlighted, also include a "reason" field explaining why. Otherwise, the "reason" field is optional.

  Consider the following:
  - Does the file content relate to the user's recent search queries?
  - Has the user recently viewed or edited similar files?
  - Does the file content match the user's current projects or tasks?
  `,
});

const highlightRelevantFilesFlow = ai.defineFlow(
  {
    name: 'highlightRelevantFilesFlow',
    inputSchema: HighlightRelevantFilesInputSchema,
    outputSchema: HighlightRelevantFilesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

