'use server';

import { highlightRelevantFiles, HighlightRelevantFilesInput, HighlightRelevantFilesOutput } from '@/ai/flows/highlight-relevant-files';

export async function analyzeFile(
  data: HighlightRelevantFilesInput
): Promise<{ success: boolean; data?: HighlightRelevantFilesOutput; error?: string }> {
  try {
    const result = await highlightRelevantFiles(data);
    return { success: true, data: result };
  } catch (error) {
    console.error("Error in analyzeFile action:", error);
    // In a real app, you might want to log this error to a service
    return { success: false, error: 'Failed to communicate with the AI service. Please try again later.' };
  }
}
