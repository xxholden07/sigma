'use server';

import { ai } from '@/ai/genkit';
import { ReactorAgentActionSchema } from '@/lib/ai-schemas';

/**
 * This is the Server Action. The client will call this function.
 * It runs exclusively on the server.
 */
export async function generateReactorAnalysis(promptData: {
  telemetryHistory: any[];
  settings: any;
  currentReward: number;
  topRuns: any[];
}) {
  try {
    const response = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      system: `You are "Prometheus", an AI agent optimizing a fusion reactor. 

Your ONLY valid decisions are:
- "adjust_parameters": Change temperature and/or confinement. You MUST provide the "parameters" object with specific values.
- "restart_simulation": Restart if the reactor is unstable or failing.
- "no_change": Keep current settings if they're optimal.

When choosing "adjust_parameters", ALWAYS provide concrete numerical values:
- temperature: number between 50-200
- confinement: number between 0.1-1.0

Goals: Maximize Q-factor (energy out / energy in), maximize fusion rate, maintain stability.`,
      prompt: `Current reactor state:

**Settings:** 
- Temperature: ${promptData.settings.temperature}
- Confinement: ${promptData.settings.confinement}
- Reaction Mode: ${promptData.settings.reactionMode}

**Recent Telemetry (last readings):**
${JSON.stringify(promptData.telemetryHistory.slice(-5), null, 2)}

**Current AI Reward:** ${promptData.currentReward}

**Top Historical Runs:**
${JSON.stringify(promptData.topRuns.slice(0, 3), null, 2)}

Analyze and decide the next action. If adjusting parameters, provide EXACT values for temperature and confinement.`,
      output: {
        format: 'json',
        schema: ReactorAgentActionSchema,
      },
      config: { temperature: 0.5 },
    });

    const analysis = response.output;
    const usage = response.usage;

    // Return serializable data to the client
    return {
      analysis,
      usage,
    };
  } catch (error) {
    console.error("Error in generateReactorAnalysis:", error);
    // It's important to return a structured error or null
    return { error: 'Failed to get analysis from AI.' };
  }
}
