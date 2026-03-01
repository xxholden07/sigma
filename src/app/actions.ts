'use server';

import { ai } from '@/ai/genkit';
import { ReactorAgentActionSchema } from '@/lib/ai-schemas';

/**
 * This is the Server Action. The client will call this function.
 * It runs exclusively on the server.
 */
export async function generateReactorAnalysis(promptData: {
  telemetryHistory: any[];
  settings: any;
  currentReward: number;
  topRuns: any[];
}) {
  try {
    const response = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      system: `You are "Prometheus", an AI agent optimizing a fusion reactor simulation.

## YOUR DECISIONS:
- "adjust_parameters": Change temperature/confinement. MUST include "parameters" with exact values.
- "restart_simulation": Reset the simulation to try new parameters from scratch.
- "no_change": Keep current settings (use sparingly, only if truly optimal).

## WHEN TO RESTART (restart_simulation):
- Q-factor stuck at 0.00 for multiple readings
- Fusion rate at 0 for extended period
- Shield integrity dropping below 80%
- Lyapunov exponent > 0.5 (chaotic instability)
- No improvement after 3+ parameter adjustments
- Current parameters clearly not working

## PARAMETER RANGES:
- temperature: 50-200 (higher = more energy but less stable)
- confinement: 0.1-1.0 (higher = better containment but harder to sustain)

## STRATEGY:
1. If Q-factor is 0 and fusion rate is 0, something is wrong - consider restart
2. Gradually adjust parameters, don't make huge jumps
3. Learn from top historical runs - use similar parameters
4. Balance stability (low Lyapunov) with output (high Q-factor)

Be decisive. If things aren't working, RESTART rather than endlessly tweaking.`,
      prompt: `Current reactor state:

**Settings:** 
- Temperature: ${promptData.settings.temperature}
- Confinement: ${promptData.settings.confinement}
- Reaction Mode: ${promptData.settings.reactionMode}

**Key Metrics (from latest telemetry):**
${promptData.telemetryHistory.length > 0 ? (() => {
  const latest = promptData.telemetryHistory[promptData.telemetryHistory.length - 1];
  return `- Q-Factor: ${latest.qFactor?.toFixed(2) ?? 'N/A'}
- Fusion Rate: ${latest.fusionRate ?? 'N/A'} f/s
- Shield Integrity: ${(latest.shieldIntegrity * 100)?.toFixed(1) ?? 'N/A'}%
- Lyapunov Exponent: ${latest.lyapunovExponent?.toFixed(3) ?? 'N/A'}
- Plasma Temperature: ${latest.plasmaTemperature?.toFixed(0) ?? 'N/A'}`;
})() : 'No telemetry data yet'}

**Recent Telemetry Trend (last 5 readings):**
${JSON.stringify(promptData.telemetryHistory.slice(-5).map(t => ({
  qFactor: t.qFactor?.toFixed(2),
  fusionRate: t.fusionRate,
  shield: (t.shieldIntegrity * 100)?.toFixed(0) + '%'
})), null, 2)}

**Current AI Reward Score:** ${promptData.currentReward}

**Top Historical Runs (best performances):**
${JSON.stringify(promptData.topRuns.slice(0, 3).map(r => ({
  score: r.score,
  settings: r.settings
})), null, 2)}

Analyze and decide the next action. If Q-factor and fusion rate are stuck at 0, consider restarting with different parameters.`,
      output: {
        format: 'json',
        schema: ReactorAgentActionSchema,
      },
      config: { temperature: 0.5 },
    });

    const analysis = response.output;
    const usage = response.usage;

    // Return serializable data to the client
    return {
      analysis,
      usage,
    };
  } catch (error) {
    console.error("Error in generateReactorAnalysis:", error);
    // It's important to return a structured error or null
    return { error: 'Failed to get analysis from AI.' };
  }
}
