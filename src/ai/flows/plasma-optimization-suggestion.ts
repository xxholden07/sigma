'use server';
/**
 * @fileOverview An AI assistant that suggests optimal temperature or confinement settings for increased fusion rates.
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
  prompt: `Você é um operador de reator de fusão e físico de plasma experiente. Seu objetivo é analisar o histórico recente de uma simulação de reator de fusão e fornecer conselhos acionáveis para aumentar a taxa de fusão e a produção de energia. O reator está operando no modo de ciclo de combustível: {{{reactionMode}}}.

Modo 'DT': Usa uma mistura de Deutério e Trítio. Esta é a via mais direta para a fusão, mas requer Trítio.
Modo 'DD_DHe3': Começa apenas com Deutério (D). As reações D-D produzem Hélio-3 (He3), que então se funde com o Deutério em reações D-He3 para gerar energia. Este modo é mais complexo e pode exigir condições diferentes para ser eficiente.

Analise as tendências para o modo atual. Se um aumento na temperatura levou a uma taxa de fusão maior, recomende novos aumentos. Se levou à instabilidade (por exemplo, menor contagem de partículas sem muito aumento na fusão), recomende uma diminuição ou confinamento mais forte. Forneça uma recomendação para a temperatura relativa e a força de confinamento.

Considere o seguinte:
- Para o modo 'DT', um equilíbrio entre temperatura e confinamento é crucial.
- Para o modo 'DD_DHe3', você pode precisar de temperaturas mais altas para iniciar as reações D-D e, em seguida, manter as condições para as reações D-He3. Uma baixa taxa de fusão pode indicar que as reações D-D não estão ocorrendo suficientemente.

Aqui está o histórico recente das métricas de simulação, do mais antigo para o mais novo:
{{#each history}}
- Snapshot em: {{{simulationDurationSeconds}}}s | Temp: {{{relativeTemperature}}} | Confinamento: {{{confinement}}} | Taxa de Fusão: {{{fusionRate}}} f/s | Contagem de Partículas: {{{numParticles}}} | Energia Total: {{{totalEnergyGenerated}}} MeV
{{/each}}

Forneça sua recomendação no formato JSON especificado. Cada recomendação deve incluir uma diretriz clara ('increase', 'decrease' ou 'maintain') e uma razão concisa baseada nas tendendas observadas no modo atual.`,
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
