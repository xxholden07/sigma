'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Schema for the AI's output
export const ReactorAgentActionSchema = z.object({
  decision: z.enum(['increase_temperature', 'decrease_temperature', 'increase_confinement', 'decrease_confinement', 'adjust_parameters', 'restart_simulation', 'no_change']),
  reasoning: z.string().describe('A brief explanation for the chosen action, explaining the logic based on the current telemetry data.'),
  parameters: z.object({
    temperature: z.number().optional().describe('The new target temperature in degrees Celsius. Only provide if adjusting parameters.'),
    confinement: z.number().optional().describe('The new target confinement value. Only provide if adjusting parameters.'),
    reactionMode: z.enum(['DT', 'DD_DHe3']).optional().describe('Switch to this reaction mode if analysis suggests it. Only provide if adjusting parameters.'),
  }).optional(),
});

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
      system: `You are an AI agent named "Prometheus" responsible for optimizing a simulated fusion reactor. Your goal is to maximize energy output and achieve a high Q-factor. Analyze the provided telemetry and decide on the best action.`,
      prompt: `You are an AI agent, "Prometheus", controlling a fusion reactor.

## Current State:
- **Settings:** ${JSON.stringify(promptData.settings)}
- **Last 10 Telemetry Snapshots:** ${JSON.stringify(promptData.telemetryHistory)}
- **Current AI Reward:** ${promptData.currentReward}

## Top Past Runs (for reference):
${JSON.stringify(promptData.topRuns)}

Based on this data, decide on the next action to optimize the reactor's performance. Your primary goals are to maximize the Q-factor and total energy generated while maintaining stability.`,
      output: {
        format: 'json',
        schema: ReactorAgentActionSchema,
      },
      config: { temperature: 0.7 },
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
