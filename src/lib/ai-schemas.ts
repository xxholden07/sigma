import { z } from 'zod';

// Schema for the AI's output - simplified for better action handling
export const ReactorAgentActionSchema = z.object({
  decision: z.enum(['adjust_parameters', 'restart_simulation', 'no_change']),
  reasoning: z.string().describe('A brief explanation for the chosen action, explaining the logic based on the current telemetry data.'),
  parameters: z.object({
    temperature: z.number().describe('The target temperature (50-200). Required for adjust_parameters.'),
    confinement: z.number().describe('The target confinement (0.1-1.0). Required for adjust_parameters.'),
    reactionMode: z.enum(['DT', 'DD_DHe3']).optional().describe('Switch to this reaction mode if analysis suggests it.'),
  }).optional().describe('Required when decision is adjust_parameters'),
});

export type ReactorAgentAction = z.infer<typeof ReactorAgentActionSchema>;
