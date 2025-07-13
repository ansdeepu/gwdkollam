'use server';

/**
 * @fileOverview Provides suggestions for improvements and optimizations based on best practices for injected code and UI components.
 *
 * - suggestImprovements - A function that takes code and UI components as input and returns suggestions for improvements.
 * - SuggestImprovementsInput - The input type for the suggestImprovements function.
 * - SuggestImprovementsOutput - The return type for the suggestImprovements function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestImprovementsInputSchema = z.object({
  code: z.string().describe('The code to analyze.'),
  uiComponents: z.string().describe('The UI components to analyze.'),
});
export type SuggestImprovementsInput = z.infer<typeof SuggestImprovementsInputSchema>;

const SuggestImprovementsOutputSchema = z.object({
  suggestions: z.array(
    z.string().describe('Suggestions for improvements and optimizations.')
  ).describe('A list of suggestions for improving the provided code and UI components.'),
});
export type SuggestImprovementsOutput = z.infer<typeof SuggestImprovementsOutputSchema>;

export async function suggestImprovements(input: SuggestImprovementsInput): Promise<SuggestImprovementsOutput> {
  return suggestImprovementsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestImprovementsPrompt',
  input: {schema: SuggestImprovementsInputSchema},
  output: {schema: SuggestImprovementsOutputSchema},
  prompt: `You are a senior software engineer reviewing code and UI components.

  Provide a list of suggestions for improvements and optimizations based on best practices for the following code and UI components.
  Focus on identifying potential performance bottlenecks, security vulnerabilities, accessibility issues, and areas where the code can be simplified or made more readable.
  Be concise and specific in your suggestions.

  Code:
  {{code}}

  UI Components:
  {{uiComponents}}
  `,
});

const suggestImprovementsFlow = ai.defineFlow(
  {
    name: 'suggestImprovementsFlow',
    inputSchema: SuggestImprovementsInputSchema,
    outputSchema: SuggestImprovementsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
