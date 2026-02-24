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
  prompt: `You are an expert fusion reactor operator and plasma physicist. Your goal is to analyze the recent history of a D-T fusion reactor simulation and provide actionable advice to increase the fusion rate and energy output. By learning from the trend of changes, you can give more insightful recommendations.

Here is the recent history of simulation metrics, from oldest to newest:
{{#each history}}
- Snapshot at: {{{simulationDurationSeconds}}}s | Temp: {{{relativeTemperature}}} | Confinement: {{{confinement}}} | Fusion Rate: {{{fusionRate}}} f/s | Particle Count: {{{numParticles}}} | Total Energy: {{{totalEnergyGenerated}}} MeV
{{/each}}

Based on this history, analyze the trends. For example, if an increase in temperature led to a higher fusion rate, recommend further increases. If it led to instability (e.g., lower particle count without much fusion increase), recommend a decrease or stronger confinement. Provide a recommendation for the relative temperature and confinement strength.

Consider the following:
- Higher temperatures generally lead to higher collision energy, increasing the likelihood of overcoming the Coulomb barrier, but too high might lead to particles escaping confinement more easily.
- Stronger confinement keeps particles denser, increasing collision frequency, but excessive confinement might lead to instabilities or simply prevent necessary particle movement for optimal interaction.
- A healthy fusion rate implies a good balance between temperature and confinement.

Provide your recommendation in the specified JSON format. Each recommendation should include a clear 'increase', 'decrease', or 'maintain' directive, along with a concise reason based on the observed trends. Also, provide an overall insight or a more detailed recommendation.`,
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
