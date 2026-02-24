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

const PlasmaOptimizationSuggestionInputSchema = z.object({
  relativeTemperature: z
    .number()
    .describe('The current relative temperature of the plasma (arbitrary unit).'),
  totalEnergyGenerated: z
    .number()
    .describe('The total energy generated so far in MeV.'),
  numParticles: z
    .number()
    .describe('The current number of particles in the simulation.'),
  simulationDurationSeconds: z
    .number()
    .describe('The duration of the simulation in seconds since it started or last reset. Used to infer fusion rate.'),
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
    .describe('Overall insight or detailed recommendation to improve fusion rate and energy output.'),
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
  prompt: `You are an expert fusion reactor operator and plasma physicist. Your goal is to analyze the current simulation state of a D-T fusion reactor and provide actionable advice to increase the fusion rate and energy output.\n\nHere are the current simulation metrics:\n- Relative Temperature: {{{relativeTemperature}}} (arbitrary unit)\n- Total Energy Generated: {{{totalEnergyGenerated}}} MeV\n- Number of Particles: {{{numParticles}}}\n- Simulation Duration: {{{simulationDurationSeconds}}} seconds\n\nBased on these metrics, provide a recommendation for the relative temperature and confinement strength. For confinement strength, assume it's a parameter that can be adjusted to either increase or decrease the force pulling particles towards the center.\n\nConsider the following:\n- Higher temperatures generally lead to higher collision energy, increasing the likelihood of overcoming the Coulomb barrier, but too high might lead to particles escaping confinement more easily.\n- Stronger confinement keeps particles denser, increasing collision frequency, but excessive confinement might lead to instabilities or simply prevent necessary particle movement for optimal interaction.\n- A healthy fusion rate implies a good balance between temperature and confinement.\n- If total energy is low relative to simulation duration, fusion rate is low.\n\nProvide your recommendation in the specified JSON format. Each recommendation should include a clear 'increase', 'decrease', or 'maintain' directive, along with a concise reason. Also, provide an overall insight or a more detailed recommendation.`,
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
