'use client';

import { initializeGenkit } from '@genkit-ai/core';
import { genkit, GenerationUsage, defineAgent, defineModel, prompt, configureGenkit } from '@genkit-ai/core/tools';
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
export { genkit, GenerationUsage, defineAgent, defineModel, prompt };
