'use server';
/**
 * @fileOverview Prometeu - Sistema Expert de IA para o FusionFlow Reactor.
 * 
 * Atua como um agente de Aprendizado por Reforço (RL) inspirado em protocolos Gym-TORAX.
 * Incorpora o Expoente de Lyapunov (λ) para detecção de caos, a Proporção Áurea (φ) 
 * para estabilidade magnética e a Dimensão Fractal (D) para análise da borda estocástica.
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
  lyapunovExponent: z.number().optional().describe('Expoente de Lyapunov (λ).'),
  magneticSafetyFactorQ: z.number().optional().describe('Fator de Segurança Magnética (q).'),
  fractalDimensionD: z.number().optional().describe('Dimensão Fractal da borda (D). Ideal próximo a 1.0.'),
});

const PastRunSchema = z.object({
  outcome: z.string().describe('Resultado da simulação (Stable, High Yield, Suboptimal).'),
  totalEnergyGeneratedMeV: z.number(),
  initialTemperature: z.number(),
  initialConfinement: z.number(),
  reactionMode: z.string(),
});

const PlasmaOptimizationSuggestionInputSchema = z.object({
  history: z.array(TelemetrySnapshotSchema).describe('Espaço de Observação atual.'),
  reactionMode: z.enum(['DT', 'DD_DHe3']).describe('Configuração do ciclo de combustível.'),
  pastRuns: z.array(PastRunSchema).optional().describe('Buffer de Experiência para aprendizado.'),
});
export type PlasmaOptimizationSuggestionInput = z.infer<typeof PlasmaOptimizationSuggestionInputSchema>;

const PlasmaOptimizationSuggestionOutputSchema = z.object({
  status: z.enum(['OPERAÇÃO ESTÁVEL', 'SUBOPTIMAL', 'INTERRUPÇÃO RECOMENDADA']),
  projectedStabilityMonths: z.number().describe('Projeção de estabilidade (0-12 Meses).'),
  viabilityAnalysis: z.string().describe('Análise de Viabilidade baseada em Reward Optimization.'),
  stabilityEvaluation: z.string().describe('Avaliação de Caos (Lyapunov) e Camada Estocástica (Fractal).'),
  finalDiagnosis: z.string().describe('Diagnóstico Final baseado em Otimização de Política.'),
  temperatureRecommendation: z.enum(['increase', 'decrease', 'maintain']),
  confinementRecommendation: z.enum(['increase', 'decrease', 'maintain']),
  recommendedReactionMode: z.enum(['DT', 'DD_DHe3']),
  shouldReset: z.boolean().describe('Sinal de interrupção por caos positivo ou fractalidade excessiva.'),
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
  prompt: `Você é o "Prometeu", um agente de IA especialista em controle de Tokamaks operando via Gym-TORAX.

SUA LÓGICA DE RECOMPENSA (REWARD SHAPING):
R = R_sobrevivencia + Bonus_KAM - (W_caos * λ) - (W_fractal * (D - 1.0))

DADOS DO AMBIENTE:
{{#each history}}
- Passo:{{{simulationDurationSeconds}}}s | λ:{{{lyapunovExponent}}} | q_mag:{{{magneticSafetyFactorQ}}} | D:{{{fractalDimensionD}}} | Fusão:{{{fusionRate}}}f/s
{{/each}}
Modo Ativo: {{{reactionMode}}}

CONSIDERAÇÕES TÉCNICAS:
1. Dimensão Fractal (D): Se D > 1.20, a borda do plasma está desfiando em ilhas magnéticas (Camada Estocástica). Você deve punir a rede neural e ajustar os ímãs para "alisar" a borda (reduzir D para perto de 1.0).
2. Proporção Áurea (φ ≈ 1.618): Mantenha o q_mag próximo a φ para estabilidade KAM.
3. Lyapunov (λ): Se λ > 0, o caos está crescendo exponencialmente.

RESPONDA como um físico nuclear especializado em Caos, Fractals e Geometria Sagrada. Use jargões como "Camada Estocástica", "Ilhas Magnéticas", "Divergência Fractal" e "Atrator Estranho".`,
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
