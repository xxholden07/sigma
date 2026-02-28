'use server';

import { configureGenkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { defineAgent, generate } from 'genkit/ai';
import { z } from 'zod';

// Configure Genkit to run on the server
configureGenkit({
  plugins: [googleAI()],
  logLevel: 'warn',
  enableTracingAndMetrics: false, // Disable tracing for serverless environment for now
});

// Schema for the AI's output, moved here from the old agent file
export const ReactorAgentActionSchema = z.object({
  decision: z.enum(['increase_temperature', 'decrease_temperature', 'increase_confinement', 'decrease_confinement', 'adjust_parameters', 'restart_simulation', 'no_change']),
  reasoning: z.string().describe('A brief explanation for the chosen action, explaining the logic based on the current telemetry data.'),
  parameters: z.object({
    temperature: z.number().optional().describe('The new target temperature in degrees Celsius. Only provide if adjusting parameters.'),
    confinement: z.number().optional().describe('The new target confinement value. Only provide if adjusting parameters.'),
    reactionMode: z.enum(['DT', 'DD_DHe3']).optional().describe('Switch to this reaction mode if analysis suggests it. Only provide if adjusting parameters.'),
  }).optional(),
});

// The Agent, defined here on the server
const reactorAgent = defineAgent(
  {
    name: 'reactorAgent',
    model: 'gemini-1.5-flash',
    systemPrompt: `You are an AI agent named \"Prometheus\" responsible for optimizing a simulated fusion reactor. Your goal is to maximize energy output and achieve a high Q-factor. Analyze the provided telemetry and decide on the best action.`,
    output: {
      format: 'json',
      schema: ReactorAgentActionSchema,
    },
  },
);

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
    const response = await generate({
      model: reactorAgent,
      prompt: `You are an AI agent, \"Prometheus\", controlling a fusion reactor.\n\n## Current State:\n- **Settings:** ${JSON.stringify(promptData.settings)}\n- **Last 10 Telemetry Snapshots:** ${JSON.stringify(promptData.telemetryHistory)}\n- **Current AI Reward:** ${promptData.currentReward}\n\n## Top Past Runs (for reference):\n${JSON.stringify(promptData.topRuns)}\n\nBased on this data, decide on the next action to optimize the reactor\'s performance. Your primary goals are to maximize the Q-factor and total energy generated while maintaining stability.`,
      config: { temperature: 0.7 },
    });

    const analysis = response.output();
    const usage = response.usage();

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
