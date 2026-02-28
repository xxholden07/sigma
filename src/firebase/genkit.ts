'use client';

import { initializeGenkit, GenerationUsage, defineAgent, defineModel, prompt, configureGenkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

let genkitInitialized = false;

export function useGenkit(isClient: boolean) {
  if (isClient && !genkitInitialized) {
    configureGenkit({
      plugins: [
        googleAI(),
      ],
      logLevel: 'warn',
      enableTracingAndMetrics: true,
    });
    genkitInitialized = true;
  }
}

// Re-export core Genkit functions so components don't have to import them directly.
export { GenerationUsage, defineAgent, defineModel, prompt };
