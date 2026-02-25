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
    .describe('The average kinetic energy of particles in the simulation.').optional(), // Adicionado o campo de energia cinética média
});

const PlasmaOptimizationSuggestionInputSchema = z.object({
  history: z
    .array(TelemetrySnapshotSchema)
    .describe(
      'A recent history of telemetry and settings snapshots, ordered from oldest to newest.'
    ),
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
  prompt: `Você é um operador de reator de fusão e físico de plasma experiente. Seu objetivo é analisar o histórico recente de uma simulação de reator de fusão D-T e fornecer conselhos acionáveis para aumentar a taxa de fusão e a produção de energia. Ao aprender com a tendência das mudanças, você pode dar recomendações mais perspicazes.

Aqui está o histórico recente das métricas de simulação, do mais antigo para o mais novo:
{{#each history}}
- Snapshot em: {{{simulationDurationSeconds}}}s | Temp: {{{relativeTemperature}}} | Confinamento: {{{confinement}}} | Taxa de Fusão: {{{fusionRate}}} f/s | Contagem de Partículas: {{{numParticles}}} | Energia Total: {{{totalEnergyGenerated}}} MeV | Energia Cinética Média: {{{averageKineticEnergy}}} (unidade arbitrária)
{{/each}}

Com base neste histórico, analise as tendências. Por exemplo, se um aumento na temperatura levou a uma taxa de fusão maior, recomende novos aumentos, **explicando o impacto positivo observado na taxa de fusão ou energia total**. Se levou à instabilidade (por exemplo, menor contagem de partículas sem muito aumento na fusão), recomende uma diminuição ou confinamento mais forte, **justificando com o impacto negativo observado**. Forneça uma recomendação para a temperatura relativa e a força de confinamento.

Considere o seguinte:
- Temperaturas mais altas geralmente levam a maior energia de colisão, aumentando a probabilidade de superar a barreira de Coulomb, mas muito altas podem fazer com que as partículas escapem do confinamento mais facilmente.
- O confinamento mais forte mantém as partículas mais densas, aumentando a frequência de colisão, mas o confinamento excessivo pode levar a instabilidades ou simplesmente impedir o movimento necessário das partículas para uma interação ideal.
- Uma taxa de fusão saudável implica um bom equilíbrio entre temperatura e confinamento.

Forneça sua recomendação no formato JSON especificado. Cada recomendação deve incluir uma diretriz clara de 'increase', 'decrease' ou 'maintain', juntamente com uma razão concisa baseada nas tendências observadas, **mencionando explicitamente as mudanças numéricas na taxa de fusão ou energia total se elas influenciarem sua decisão**. Além disso, forneça uma visão geral ou uma recomendação mais detalhada.`,
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
