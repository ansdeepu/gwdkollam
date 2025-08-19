// This file is machine-generated - edit with care!

'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating documentation from code.
 *
 * - generateDocumentation - An async function that takes code as input and returns generated documentation.
 * - GenerateDocumentationInput - The input type for the generateDocumentation function.
 * - GenerateDocumentationOutput - The return type for the generateDocumentation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateDocumentationInputSchema = z.object({
  code: z.string().describe('The code to generate documentation for.'),
});

export type GenerateDocumentationInput = z.infer<
  typeof GenerateDocumentationInputSchema
>;

const GenerateDocumentationOutputSchema = z.object({
  documentation: z.string().describe('The generated documentation.'),
});

export type GenerateDocumentationOutput = z.infer<
  typeof GenerateDocumentationOutputSchema
>;

export async function generateDocumentation(
  input: GenerateDocumentationInput
): Promise<GenerateDocumentationOutput> {
  return generateDocumentationFlow(input);
}

const generateDocumentationPrompt = ai.definePrompt({
  name: 'generateDocumentationPrompt',
  input: {schema: GenerateDocumentationInputSchema},
  output: {schema: GenerateDocumentationOutputSchema},
  prompt: `You are an AI documentation generator. Generate documentation for the following code:\n\n Code: {{{code}}} \n\n Documentation:`, // Removed line breaks for brevity
});

const generateDocumentationFlow = ai.defineFlow(
  {
    name: 'generateDocumentationFlow',
    inputSchema: GenerateDocumentationInputSchema,
    outputSchema: GenerateDocumentationOutputSchema,
  },
  async input => {
    const {output} = await generateDocumentationPrompt(input);
    return output!;
  }
);
