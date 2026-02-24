'use server';

import {
  getPlasmaOptimizationSuggestion,
  type PlasmaOptimizationSuggestionInput,
  type PlasmaOptimizationSuggestionOutput,
} from '@/ai/flows/plasma-optimization-suggestion';

export async function getAIConfigurationSuggestion(
  input: PlasmaOptimizationSuggestionInput
): Promise<PlasmaOptimizationSuggestionOutput> {
  try {
    const suggestion = await getPlasmaOptimizationSuggestion(input);
    return suggestion;
  } catch (error) {
    console.error('Error getting AI suggestion:', error);
    throw new Error('Failed to get AI suggestion from the model.');
  }
}
