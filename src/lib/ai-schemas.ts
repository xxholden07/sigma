import { z } from 'zod';

// Schema for the AI's output - simplified for better action handling
export const ReactorAgentActionSchema = z.object({
  decision: z.enum(['adjust_parameters', 'restart_simulation', 'no_change']),
  reasoning: z.string().describe('Explicação breve da ação escolhida baseada na telemetria atual.'),
  parameters: z.object({
    temperature: z.number().min(10).max(300).describe('Temperatura do plasma (10-300). Para D-T ideal: 60-100. Para D-D: 150-250.'),
    confinement: z.number().min(0.1).max(1.5).describe('Campo magnético em Tesla (0.1-1.5). Maior = melhor confinamento.'),
    reactionMode: z.enum(['DT', 'DD_DHe3']).optional().describe('Trocar modo de reação se necessário.'),
  }).optional().describe('OBRIGATÓRIO quando decision é adjust_parameters'),
});

export type ReactorAgentAction = z.infer<typeof ReactorAgentActionSchema>;
