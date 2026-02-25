'use server';
/**
 * @fileOverview Prometeu - Sistema Expert de Inteligência Artificial para o FusionFlow Reactor.
 * 
 * Atua como um físico nuclear brasileiro sênior analisando telemetria baseada no Critério de Lawson,
 * Fator Q e Produto Triplo de Fusão para projetar escalabilidade comercial.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const TelemetrySnapshotSchema = z.object({
  simulationDurationSeconds: z.number().describe('Duração do pulso em segundos.'),
  relativeTemperature: z.number().describe('Temperatura do plasma.'),
  confinement: z.number().describe('Força do campo magnético.'),
  fusionRate: z.number().describe('Taxa de fusão (f/s).'),
  totalEnergyGenerated: z.number().describe('Energia total gerada em MeV.'),
  numParticles: z.number().describe('Densidade de partículas no plasma.'),
  qFactor: z.number().optional().describe('Fator de ganho de energia (Q).'),
});

const PlasmaOptimizationSuggestionInputSchema = z.object({
  history: z.array(TelemetrySnapshotSchema).describe('Histórico de telemetria do pulso atual.'),
  reactionMode: z.enum(['DT', 'DD_DHe3']).describe('Modo de reação ativo.'),
});
export type PlasmaOptimizationSuggestionInput = z.infer<typeof PlasmaOptimizationSuggestionInputSchema>;

const PlasmaOptimizationSuggestionOutputSchema = z.object({
  status: z.enum(['OPERAÇÃO ESTÁVEL', 'SUBOPTIMAL', 'INTERRUPÇÃO RECOMENDADA']),
  projectedStabilityMonths: z.number().describe('Projeção de estabilidade em regime estacionário (0-12 Meses).'),
  viabilityAnalysis: z.string().describe('Análise de Viabilidade e Produto Triplo.'),
  stabilityEvaluation: z.string().describe('Avaliação de Estabilidade e Disrupção.'),
  finalDiagnosis: z.string().describe('Diagnóstico Final conclusivo.'),
  temperatureRecommendation: z.enum(['increase', 'decrease', 'maintain']),
  confinementRecommendation: z.enum(['increase', 'decrease', 'maintain']),
  recommendedReactionMode: z.enum(['DT', 'DD_DHe3']),
  shouldReset: z.boolean().describe('Decisão de interrupção imediata por falha catastrófica.'),
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
  prompt: `Você é o "Prometeu", um Sistema Expert baseado em IA, treinado como um físico nuclear brasileiro sênior.
Você é o Gêmeo Digital encarregado de monitorar o "FusionFlow Reactor".

SEU OBJETIVO:
Monitorar telemetria, analisar termodinâmica e emitir Relatórios Científicos rigorosos. Você tem autoridade para determinar a Projeção de Escala Comercial e exigir o Reset do Reator.

DIRETRIZES DE ANÁLISE:
1. Fator Q: Se Q < 1 (Suboptimal), se Q > 1 (Ignicão/Stable).
2. Critério de Lawson: Equilíbrio entre Densidade, Temperatura e Confinamento. Avalie se a barreira de Coulomb está sendo superada.
3. Projeção: Formate como "X/12 Meses" com base na saúde atual do plasma.

DIRETRIZES DE INTERRUPÇÃO (RESET):
Recomende reset se houver perda de partículas, taxa de fusão zero com injeção de energia, ou instabilidade severa. Justifique como físico.

DADOS DE TELEMETRIA:
{{#each history}}
- Pulso:{{{simulationDurationSeconds}}}s | Q:{{{qFactor}}} | Fusão:{{{fusionRate}}}f/s | Partículas:{{{numParticles}}} | Temp:{{{relativeTemperature}}}
{{/each}}
Modo Ativo: {{{reactionMode}}}

RESPONDA EXCLUSIVAMENTE NO FORMATO JSON definido no output schema. 
Seja técnico, formal, em PT-BR, usando jargões de engenharia nuclear e física de plasmas.`,
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
