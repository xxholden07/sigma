'use server';
/**
 * @fileOverview Assistente de IA para otimização de plasma baseado no Critério de Lawson e Fator Q.
 *
 * - getPlasmaOptimizationSuggestion - Analisa telemetria para projetar viabilidade comercial.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const TelemetrySnapshotSchema = z.object({
  simulationDurationSeconds: z.number().describe('Duração do pulso de teste em segundos.'),
  relativeTemperature: z.number().describe('Temperatura do plasma.'),
  confinement: z.number().describe('Força do campo magnético de confinamento.'),
  fusionRate: z.number().describe('Taxa de fusão (f/s).'),
  totalEnergyGenerated: z.number().describe('Energia total gerada em MeV.'),
  numParticles: z.number().describe('Densidade de partículas no núcleo.'),
  qFactor: z.number().optional().describe('Fator de ganho de energia (Q).'),
});

const PlasmaOptimizationSuggestionInputSchema = z.object({
  history: z.array(TelemetrySnapshotSchema).describe('Histórico de telemetria do pulso atual.'),
  reactionMode: z.enum(['DT', 'DD_DHe3']).describe('Modo de reação ativo.'),
});
export type PlasmaOptimizationSuggestionInput = z.infer<typeof PlasmaOptimizationSuggestionInputSchema>;

const PlasmaOptimizationSuggestionOutputSchema = z.object({
  temperatureRecommendation: z.enum(['increase', 'decrease', 'maintain']),
  temperatureReason: z.string(),
  confinementRecommendation: z.enum(['increase', 'decrease', 'maintain']),
  confinementReason: z.string(),
  recommendedReactionMode: z.enum(['DT', 'DD_DHe3']),
  reactionModeReason: z.string(),
  shouldReset: z.boolean().describe('Decisão de interromper o pulso de teste por instabilidade catastrófica.'),
  resetReason: z.string().optional(),
  projectedStabilityMonths: z.number().describe('Projeção de quantos meses este plasma duraria em regime estacionário (0-12).'),
  scientificInsight: z.string().describe('Análise técnica baseada no Produto Triplo de Fusão.'),
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
  prompt: `Você é o sistema especialista de diagnóstico de um reator de fusão experimental.
Seu papel é analisar os dados de "pulso de teste" e projetar se eles são escaláveis para uma operação comercial de 12 meses.

CRITÉRIOS TÉCNICOS:
1. Produto Triplo: Verifique se a combinação de densidade (numParticles), temperatura e confinamento atende ao Critério de Lawson.
2. Fator Q: Se Q < 1, o reator está consumindo mais energia do que produz. Sugira ajustes para Q > 1.
3. Estabilidade: Se a taxa de fusão oscilar violentamente, a projeção de meses deve cair.
4. Reset Estratégico: Se o plasma entrar em "disrupção" (taxa de fusão cai para zero com alta temperatura), o pulso falhou. Recomende o reset.

Histórico do Pulso:
{{#each history}}
- Pulso:{{{simulationDurationSeconds}}}s | Q:{{{qFactor}}} | Fusão:{{{fusionRate}}}f/s | Partículas:{{{numParticles}}}
{{/each}}

Responda em JSON. Seja técnico e preciso como um físico nuclear brasileiro.`,
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
