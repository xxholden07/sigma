'use server';
/**
 * @fileOverview An AI assistant that suggests optimal temperature, confinement settings, fuel cycles and decides on reactor resets.
 *
 * - getPlasmaOptimizationSuggestion - A function that handles the plasma optimization suggestion process.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const TelemetrySnapshotSchema = z.object({
  simulationDurationSeconds: z.number().describe('The duration of the simulation in seconds.'),
  relativeTemperature: z.number().describe('The relative temperature of the plasma.'),
  confinement: z.number().describe('The confinement strength setting.'),
  fusionRate: z.number().describe('The number of fusion events per second (f/s).'),
  totalEnergyGenerated: z.number().describe('The total energy generated so far in MeV.'),
  numParticles: z.number().describe('The current number of particles.'),
  averageKineticEnergy: z.number().optional(),
});

const PlasmaOptimizationSuggestionInputSchema = z.object({
  history: z.array(TelemetrySnapshotSchema).describe('Recent history of telemetry snapshots.'),
  reactionMode: z.enum(['DT', 'DD_DHe3']).describe('The current fuel cycle mode.'),
});
export type PlasmaOptimizationSuggestionInput = z.infer<typeof PlasmaOptimizationSuggestionInputSchema>;

const PlasmaOptimizationSuggestionOutputSchema = z.object({
  temperatureRecommendation: z.enum(['increase', 'decrease', 'maintain']),
  temperatureReason: z.string(),
  confinementRecommendation: z.enum(['increase', 'decrease', 'maintain']),
  confinementReason: z.string(),
  recommendedReactionMode: z.enum(['DT', 'DD_DHe3']),
  reactionModeReason: z.string(),
  shouldReset: z.boolean().describe('Whether the AI recommends a full reactor reset to clear unstable plasma or start a new strategic phase.'),
  resetReason: z.string().optional().describe('Reasoning if a reset is recommended.'),
  overallInsight: z.string().describe('Strategy to achieve the 12-month stability goal.'),
});
export type PlasmaOptimizationSuggestionOutput = z.infer<typeof PlasmaOptimizationSuggestionOutputSchema>;

export async function getPlasmaOptimizationSuggestion(
  input: PlasmaOptimizationSuggestionInput
): Promise<PlasmaOptimizationSuggestionOutput> {
  return plasmaOptimizationSuggestionFlow(input);
}

const plasmaOptimizationSuggestionPrompt = ai.definePrompt({
  name: 'plasmaOptimizationSuggestionPrompt',
  input: { schema: PlasmaOptimizationSuggestionInputSchema },
  output: { schema: PlasmaOptimizationSuggestionOutputSchema },
  prompt: `Você é o sistema de controle de IA de um reator de fusão.
OBJETIVO CRÍTICO: Manter a estabilidade por 12 meses (120 segundos de simulação).

Análise Estratégica:
1. Avalie se o plasma está saudável. Se a taxa de fusão cair muito ou se a temperatura/confinamento estiverem em níveis perigosos sem retorno, você pode decidir REINICIAR o reator (shouldReset: true).
2. Você pode alternar entre 'DT' (Alta Energia) e 'DD_DHe3' (Estabilidade Aneutrônica) para alcançar o objetivo de 12 meses.
3. Se o reator estiver perto de colapsar, um reset estratégico é melhor do que uma falha catastrófica.

Histórico recente:
{{#each history}}
- {{{simulationDurationSeconds}}}s | Fusão:{{{fusionRate}}}f/s | Partículas:{{{numParticles}}} | Energia:{{{totalEnergyGenerated}}}MeV
{{/each}}

Responda em JSON. Priorize a continuidade e estabilidade.`,
});

const plasmaOptimizationSuggestionFlow = ai.defineFlow(
  {
    name: 'plasmaOptimizationSuggestionFlow',
    inputSchema: PlasmaOptimizationSuggestionInputSchema,
    outputSchema: PlasmaOptimizationSuggestionOutputSchema,
  },
  async (input) => {
    const { output } = await plasmaOptimizationSuggestionPrompt(input);
    return output!;
  }
);
