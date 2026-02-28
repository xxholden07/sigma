'use client';

import { initializeGenkit, GenerationUsage, defineAgent, defineModel, prompt, configureGenkit } from '@genkit-ai/core';
import { googleAI } from '@genkit-ai/google-ai';
import { googleCloud } from '@genkit-ai/google-cloud';

let genkitInitialized = false;

export function useGenkit(isClient: boolean) {
  if (isClient && !genkitInitialized) {
    configureGenkit({
      plugins: [
        googleAI(),
        googleCloud(),
      ],
      logLevel: 'warn',
      enableTracingAndMetrics: true,
    });
    genkitInitialized = true;
  }
}

// Re-export core Genkit functions so components don't have to import them directly.
export { GenerationUsage, defineAgent, defineModel, prompt };
