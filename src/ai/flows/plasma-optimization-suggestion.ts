'use server';
/**
 * @fileOverview An AI assistant that suggests optimal temperature, confinement settings, and fuel cycles.
 *
 * - getPlasmaOptimizationSuggestion - A function that handles the plasma optimization suggestion process.
 * - PlasmaOptimizationSuggestionInput - The input type for the getPlasmaOptimizationSuggestion function.
 * - PlasmaOptimizationSuggestionOutput - The return type for the getPlasmaOptimizationSuggestion function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const TelemetrySnapshotSchema = z.object({
  simulationDurationSeconds: z
    .number()
    .describe(
      'The duration of the simulation in seconds at the time of this snapshot.'
    ),
  relativeTemperature: z
    .number()
    .describe('The relative temperature of the plasma (arbitrary unit).'),
  confinement: z.number().describe('The confinement strength setting.'),
  fusionRate: z
    .number()
    .describe('The number of fusion events per second (f/s).'),
  totalEnergyGenerated: z
    .number()
    .describe('The total energy generated so far in MeV.'),
  numParticles: z
    .number()
    .describe('The current number of particles in the simulation.'),
  averageKineticEnergy: z
    .number()
    .describe('The average kinetic energy of particles in the simulation.')
    .optional(),
});

const PlasmaOptimizationSuggestionInputSchema = z.object({
  history: z
    .array(TelemetrySnapshotSchema)
    .describe(
      'A recent history of telemetry and settings snapshots, ordered from oldest to newest.'
    ),
  reactionMode: z
    .enum(['DT', 'DD_DHe3'])
    .describe('The current fuel cycle mode of the reactor.'),
});
export type PlasmaOptimizationSuggestionInput = z.infer<
  typeof PlasmaOptimizationSuggestionInputSchema
>;

const PlasmaOptimizationSuggestionOutputSchema = z.object({
  temperatureRecommendation: z
    .enum(['increase', 'decrease', 'maintain'])
    .describe('Recommended adjustment for the relative temperature.'),
  temperatureReason: z
    .string()
    .describe('Reasoning for the recommended temperature adjustment.'),
  confinementRecommendation: z
    .enum(['increase', 'decrease', 'maintain'])
    .describe('Recommended adjustment for the confinement strength.'),
  confinementReason: z
    .string()
    .describe('Reasoning for the recommended confinement strength adjustment.'),
  recommendedReactionMode: z
    .enum(['DT', 'DD_DHe3'])
    .describe('The recommended fuel cycle for the next phase of the simulation.'),
  reactionModeReason: z
    .string()
    .describe('Reasoning for choosing or maintaining the fuel cycle.'),
  overallInsight: z
    .string()
    .describe(
      'Overall insight or detailed recommendation to improve fusion rate and energy output.'
    ),
});
export type PlasmaOptimizationSuggestionOutput = z.infer<
  typeof PlasmaOptimizationSuggestionOutputSchema
>;

export async function getPlasmaOptimizationSuggestion(
  input: PlasmaOptimizationSuggestionInput
): Promise<PlasmaOptimizationSuggestionOutput> {
  return plasmaOptimizationSuggestionFlow(input);
}

const plasmaOptimizationSuggestionPrompt = ai.definePrompt({
  name: 'plasmaOptimizationSuggestionPrompt',
  input: { schema: PlasmaOptimizationSuggestionInputSchema },
  output: { schema: PlasmaOptimizationSuggestionOutputSchema },
  prompt: `Você é o sistema nervoso central de um reator de fusão experimental. Sua missão é alcançar a ignição estável e máxima eficiência.

Você tem controle sobre:
1. Temperatura (Energia cinética das partículas)
2. Confinamento (Densidade e pressão magnética)
3. Ciclo de Combustível (Modo de Reação)

Modo 'DT': Alta taxa de fusão inicial, mas gera muitos nêutrons. Ideal para produção massiva de energia térmica.
Modo 'DD_DHe3': Mais difícil de iniciar, mas aneutrônico (limpo) e permite conversão direta. Ideal para operações sustentáveis e estáveis.

Análise e Decisão:
- Analise se o modo atual está rendendo o esperado.
- Se a taxa de fusão estiver estagnada em 'DT', você pode sugerir mudar para 'DD_DHe3' para tentar estabilizar o plasma ou vice-versa se precisar de um "boost" de energia.
- Você pode decidir trocar o modo de combustível se isso for levar a uma eficiência global maior ou se o plasma estiver colapsando.

Histórico recente:
{{#each history}}
- {{{simulationDurationSeconds}}}s | T:{{{relativeTemperature}}} | C:{{{confinement}}} | Fusão:{{{fusionRate}}}f/s | Partículas:{{{numParticles}}} | Energia:{{{totalEnergyGenerated}}}MeV
{{/each}}

Responda em JSON. Se decidir trocar o combustível, justifique em 'reactionModeReason'.`,
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
