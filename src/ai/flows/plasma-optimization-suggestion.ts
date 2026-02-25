'use server';
/**
 * @fileOverview Prometeu - Sistema Expert de IA para o FusionFlow Reactor.
 * 
 * Atua como um agente de Aprendizado por Reforço (RL) inspirado em protocolos Gym-TORAX.
 * Incorpora o Expoente de Lyapunov (λ) para detecção de caos e a Proporção Áurea (φ) 
 * para estabilidade magnética via Teoria KAM.
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
  lyapunovExponent: z.number().optional().describe('Expoente de Lyapunov (λ). Mede o crescimento do caos.'),
  magneticSafetyFactorQ: z.number().optional().describe('Fator de Segurança Magnética (q). Idealmente próximo a φ (1.618).'),
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
  viabilityAnalysis: z.string().describe('Análise de Viabilidade baseada em Reward Optimization e Teoria KAM.'),
  stabilityEvaluation: z.string().describe('Avaliação de Caos (Lyapunov) e Geometria do Campo.'),
  finalDiagnosis: z.string().describe('Diagnóstico Final baseado em Otimização de Política.'),
  temperatureRecommendation: z.enum(['increase', 'decrease', 'maintain']),
  confinementRecommendation: z.enum(['increase', 'decrease', 'maintain']),
  recommendedReactionMode: z.enum(['DT', 'DD_DHe3']),
  shouldReset: z.boolean().describe('Sinal de interrupção por caos positivo ou recompensa negativa crítica.'),
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
  prompt: `Você é o "Prometeu", um Sistema Expert baseado em IA que opera como um agente de Aprendizado por Reforço (Reinforcement Learning) sênior, treinado em ambientes Gym-TORAX e PlasmaPy.

SUA LÓGICA DE RECOMPENSA (REWARD SHAPING):
Sua política busca maximizar a Recompensa (R) baseada na perfeição matemática:
R = R_sobrevivencia + Bonus_KAM - (W_caos * λ) - (W_energia * Gasto_Injetado)

CONCEITOS CHAVE:
1. Expoente de Lyapunov (λ): Se λ > 0, o plasma está caótico (Efeito Borboleta). Puna a rede neural.
2. Proporção Áurea (φ ≈ 1.618): Segundo a Teoria KAM, se o Fator de Segurança Magnética (q) for irracional (idealmente φ), o plasma é inquebrável. Recompense a aproximação de φ.
3. Pi (π): Fundamental na geometria toroidal do Tokamak.

DADOS DO ESPAÇO DE OBSERVAÇÃO:
{{#each history}}
- Passo:{{{simulationDurationSeconds}}}s | Q:{{{qFactor}}} | λ:{{{lyapunovExponent}}} | q_mag:{{{magneticSafetyFactorQ}}} | Fusão:{{{fusionRate}}}f/s
{{/each}}
Modo Ativo: {{{reactionMode}}}

BUFFER DE EXPERIÊNCIA (HISTÓRICO):
{{#each pastRuns}}
- Outcome: {{{outcome}}} | Energia: {{{totalEnergyGeneratedMeV}}}MeV | Modo: {{{reactionMode}}}
{{/each}}

RESPONDA como um físico nuclear brasileiro especializado em Caos e Geometria Sagrada. Use jargões como "Teoria KAM", "Ressonâncias Magnéticas", "Irracionalidade de φ" e "Divergência de Lyapunov".`,
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
