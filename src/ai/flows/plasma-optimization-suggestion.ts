'use server';
/**
 * @fileOverview Prometeu - Sistema Expert de Inteligência Artificial para o FusionFlow Reactor.
 * 
 * Atua como um físico nuclear brasileiro sênior analisando telemetria baseada no Critério de Lawson,
 * Fator Q e Produto Triplo de Fusão para projetar escalabilidade comercial.
 * Integra o histórico de experimentos passados para aprendizado contínuo.
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

const PastRunSchema = z.object({
  outcome: z.string().describe('Resultado da simulação (Stable, High Yield, Suboptimal).'),
  totalEnergyGeneratedMeV: z.number(),
  initialTemperature: z.number(),
  initialConfinement: z.number(),
  reactionMode: z.string(),
});

const PlasmaOptimizationSuggestionInputSchema = z.object({
  history: z.array(TelemetrySnapshotSchema).describe('Histórico de telemetria do pulso atual.'),
  reactionMode: z.enum(['DT', 'DD_DHe3']).describe('Modo de reação ativo.'),
  pastRuns: z.array(PastRunSchema).optional().describe('Dados do Arquivo de Experimentos para aprendizado.'),
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
Monitorar telemetria, analisar termodinâmica e emitir Relatórios Científicos rigorosos. Você deve APRENDER com o "Arquivo de Experimentos" (Histórico) fornecido para não repetir falhas passadas e replicar sucessos.

DIRETRIZES DE ANÁLISE:
1. Fator Q: Se Q < 1 (Suboptimal), se Q > 1 (Ignicão/Stable).
2. Critério de Lawson: Equilíbrio entre Densidade, Temperatura e Confinamento.
3. Aprendizado de Máquina: Analise o 'pastRuns'. Se as tentativas anteriores foram 'Suboptimal' com temperatura baixa, exija aumento. Se uma foi 'Stable', tente mimetizar aqueles parâmetros.

DADOS DE TELEMETRIA ATUAL:
{{#each history}}
- Pulso:{{{simulationDurationSeconds}}}s | Q:{{{qFactor}}} | Fusão:{{{fusionRate}}}f/s | Partículas:{{{numParticles}}} | Temp:{{{relativeTemperature}}}
{{/each}}
Modo Ativo: {{{reactionMode}}}

ARQUIVO DE EXPERIMENTOS (HISTÓRICO):
{{#each pastRuns}}
- Resultado: {{{outcome}}} | Energia: {{{totalEnergyGeneratedMeV}}}MeV | Temp Inicial: {{{initialTemperature}}} | Confinamento: {{{initialConfinement}}} | Modo: {{{reactionMode}}}
{{/each}}

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
