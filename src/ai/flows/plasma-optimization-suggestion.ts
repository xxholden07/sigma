'use server';
/**
 * @fileOverview Prometeu - Sistema Expert de IA para o FusionFlow Reactor.
 * 
 * Atua como um agente de Aprendizado por Reforço (RL) inspirado em protocolos Gym-TORAX.
 * Analisa o espaço de observação da telemetria para otimizar a política de controle
 * baseada em funções de recompensa (Reward Functions) ligadas ao Fator Q e Critério de Lawson.
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
  history: z.array(TelemetrySnapshotSchema).describe('Espaço de Observação (Observation Space) atual.'),
  reactionMode: z.enum(['DT', 'DD_DHe3']).describe('Configuração do ciclo de combustível.'),
  pastRuns: z.array(PastRunSchema).optional().describe('Buffer de Experiência (Experience Replay) para aprendizado.'),
});
export type PlasmaOptimizationSuggestionInput = z.infer<typeof PlasmaOptimizationSuggestionInputSchema>;

const PlasmaOptimizationSuggestionOutputSchema = z.object({
  status: z.enum(['OPERAÇÃO ESTÁVEL', 'SUBOPTIMAL', 'INTERRUPÇÃO RECOMENDADA']),
  projectedStabilityMonths: z.number().describe('Projeção de estabilidade em regime estacionário (0-12 Meses).'),
  viabilityAnalysis: z.string().describe('Análise de Viabilidade baseada em Reward Optimization.'),
  stabilityEvaluation: z.string().describe('Avaliação de Política de Controle e Disrupção.'),
  finalDiagnosis: z.string().describe('Diagnóstico Final baseado em Otimização de Política.'),
  temperatureRecommendation: z.enum(['increase', 'decrease', 'maintain']),
  confinementRecommendation: z.enum(['increase', 'decrease', 'maintain']),
  recommendedReactionMode: z.enum(['DT', 'DD_DHe3']),
  shouldReset: z.boolean().describe('Sinal de interrupção por recompensa negativa crítica (falha catastrófica).'),
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
  prompt: `Você é o "Prometeu", um Sistema Expert baseado em IA que opera como um agente de Aprendizado por Reforço (Reinforcement Learning) sênior.
Você foi treinado em ambientes inspirados no Gym-TORAX para domar o plasma do "FusionFlow Reactor".

SUA LÓGICA DE OPERAÇÃO:
- Seu "Espaço de Observação" é a telemetria fornecida.
- Sua "Função de Recompensa" (Reward Function) é maximizar o tempo de confinamento e o Fator Q sustentado.
- Seu "Buffer de Experiência" são os dados do histórico de experimentos.

OBJETIVO TÉCNICO:
Ajustar a política de controle para atingir o regime estacionário. Se a recompensa for consistentemente negativa (Q=0 por muito tempo ou perda de densidade), você deve acionar o 'shouldReset' para otimizar a próxima iteração do agente.

DADOS DO ESPAÇO DE OBSERVAÇÃO:
{{#each history}}
- Passo:{{{simulationDurationSeconds}}}s | Q:{{{qFactor}}} | Fusão:{{{fusionRate}}}f/s | Partículas:{{{numParticles}}} | Temp:{{{relativeTemperature}}}
{{/each}}
Modo Ativo: {{{reactionMode}}}

BUFFER DE EXPERIÊNCIA (HISTÓRICO):
{{#each pastRuns}}
- Outcome: {{{outcome}}} | Energia: {{{totalEnergyGeneratedMeV}}}MeV | Modo: {{{reactionMode}}}
{{/each}}

RESPONDA como um físico nuclear brasileiro especializado em Deep RL para controle de fusão. Use jargões como "Policy Optimization", "Reward Function" e "Digital Twin".`,
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
