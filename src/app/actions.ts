'use server';

import { generateDocumentation } from '@/ai/flows/generate-documentation';

export async function generateDocsAction(code: string) {
  if (!code) {
    return { error: 'No code provided.' };
  }

  try {
    const result = await generateDocumentation({ code });
    if (result.documentation) {
      return { documentation: result.documentation };
    }
    return { error: 'Failed to generate documentation.' };
  } catch (error) {
    console.error('Documentation generation error:', error);
    return { error: 'An unexpected error occurred while generating documentation. Please try again later.' };
  }
}
