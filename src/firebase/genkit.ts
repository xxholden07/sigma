'use client';

import { configureGenkit } from '@google-cloud/genkit';
import { googleAI } from '@google-cloud/genkit-google-ai';
import { GenerationUsage, defineAgent, defineModel, prompt } from '@google-cloud/genkit/ai';

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
