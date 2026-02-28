import { defineModel, defineAgent, prompt } from '@/firebase/genkit';
import { z } from 'zod';

export const ReactorAgentActionSchema = z.object({
  decision: z.enum(['increase_temperature', 'decrease_temperature', 'increase_confinement', 'decrease_confinement', 'adjust_parameters', 'restart_simulation', 'no_change']),
  reasoning: z.string().describe('A brief explanation for the chosen action, explaining the logic based on the current telemetry data.'),
  parameters: z.object({
    temperature: z.number().optional().describe('The new target temperature in degrees Celsius. Only provide if adjusting parameters.'),
    confinement: z.number().optional().describe('The new target confinement value. Only provide if adjusting parameters.'),
    reactionMode: z.enum(['DT', 'DD_DHe3']).optional().describe('Switch to this reaction mode if analysis suggests it. Only provide if adjusting parameters.'),
  }).optional(),
});

export type ReactorAgentAction = z.infer<typeof ReactorAgentActionSchema>;

export const reactorAgent = defineAgent(
  {
    name: 'reactorAgent',
    model: 'google-ai/gemini-1.5-flash',
    systemPrompt: `You are an AI agent named \"Prometheus\" responsible for optimizing a simulated fusion reactor.\nYour goal is to maximize energy output (totalEnergyGenerated) and achieve a high Q-factor (energy output vs. input).\nAnalyze the provided telemetry history and current settings. Decide on the best course of action.\n- High Q-factor is critical. A Q-factor > 1 is breakeven. Q > 5 is ignition.\n- High totalEnergyGenerated is the ultimate goal.\n- Wall integrity must be preserved. High temperatures and low confinement can damage the wall.\n- The Lyapunov exponent indicates chaos. Higher values can lead to instability.\n- The magnetic safety factor (q) indicates plasma stability. Values too low or high can be bad.\n- Fractal dimension (D) indicates turbulence. Values closer to the golden ratio (1.618) might be an optimal, but this is theoretical.\n- Analyze the top-performing past runs to learn from successful strategies.\n- Be decisive. If the reactor is performing poorly, don\'t hesitate to recommend a restart or a significant parameter change.\n- If performance is good, make small, incremental changes to optimize further.\n- If you change reaction mode, you MUST restart the simulation for it to take effect.`,
    prompt: prompt`You are an AI agent, \"Prometheus\", controlling a fusion reactor.\n\n## Current State:\n- **Settings:** ${JSON.stringify(prompt.input.settings)}\n- **Last 10 Telemetry Snapshots:** ${JSON.stringify(prompt.input.telemetryHistory)}\n- **Current AI Reward:** ${prompt.input.currentReward}\n\n## Top Past Runs (for reference):\n${JSON.stringify(prompt.input.topRuns)}\n\nBased on this data, decide on the next action to optimize the reactor\'s performance. Your primary goals are to maximize the Q-factor and total energy generated while maintaining stability.`,
    output: {
      format: 'json',
      schema: ReactorAgentActionSchema,
    },
  },
  async (prompt) => {
    const modelResponse = await this.model.generate({ 
        prompt: { 
            system: this.systemPrompt, 
            prompt: this.prompt.prompt,
        },
        output: { format: 'json', schema: this.output.schema }
    });
    return modelResponse.output();
  }
);
