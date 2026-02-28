
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { TelemetrySnapshot, SimulationSettings, SimulationRun } from '@/lib/simulation-types';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { BotMessageSquare, Sparkles, BookCopy, ArrowRight, BrainCircuit, Activity } from 'lucide-react';
import { useGenkit, generate, GenerationUsage } from '@/firebase/genkit';
import { reactorAgent, ReactorAgentAction } from '@/ai/reactor-agent';
import { Badge } from '@/components/ui/badge';

interface AIAssistantProps {
  telemetryHistory: TelemetrySnapshot[];
  settings: SimulationSettings;
  currentReward: number;
  onTemperatureChange: (temp: number) => void;
  onConfinementChange: (confinement: number) => void;
  onReactionModeChange: (mode: 'DT' | 'DD_DHe3') => void;
  onReset: () => void;
  onStartIgnition: (forceReset?: boolean) => void;
  isSimulating: boolean;
  topRuns: SimulationRun[] | null;
}

export function AIAssistant({
  telemetryHistory,
  settings,
  currentReward,
  onTemperatureChange,
  onConfinementChange,
  onReactionModeChange,
  onReset,
  onStartIgnition,
  isSimulating,
  topRuns,
}: AIAssistantProps) {
  const [autopilot, setAutopilot] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [analysis, setAnalysis] = useState<ReactorAgentAction | null>(null);
  const [usage, setUsage] = useState<GenerationUsage | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useGenkit(isClient);

  const handleToggleAutopilot = (checked: boolean) => {
    setAutopilot(checked);
    if (checked) {
      onStartIgnition(true); // Force reset when autopilot is engaged
    }
  };

  const performAnalysis = useCallback(async () => {
    setIsThinking(true);
    setAnalysis(null);
    try {
      const response = await generate({
        model: reactorAgent,
        prompt: {
          telemetryHistory: telemetryHistory.slice(-10),
          settings,
          currentReward,
          topRuns: topRuns ?? [],
        },
        config: { temperature: 0.7 },
      });

      const action = response.output();
      setAnalysis(action);
      setUsage(response.usage());

      if (autopilot && action) {
        setTimeout(() => {
            if (action.decision === "adjust_parameters") {
                onTemperatureChange(action.parameters.temperature);
                onConfinementChange(action.parameters.confinement);
                if (action.parameters.reactionMode && settings.reactionMode !== action.parameters.reactionMode) {
                    onReactionModeChange(action.parameters.reactionMode);
                }
                // Restart simulation after adjustments
                onStartIgnition(true);
            } else if (action.decision === "restart_simulation") {
                onReset();
            }
        }, 2000); // Wait 2 seconds before applying
      }
    } catch (error) {
      console.error("Error during AI analysis:", error);
    } finally {
      setIsThinking(false);
    }
  }, [telemetryHistory, settings, currentReward, topRuns, autopilot, onTemperatureChange, onConfinementChange, onReactionModeChange, onReset, onStartIgnition]);

  useEffect(() => {
    if (autopilot) {
      const analysisInterval = setInterval(() => {
        // Only run analysis if simulation is active or if it's not active but we want to start it.
        if (isSimulating) {
            performAnalysis();
        }
      }, 10000); // Analyze every 10 seconds

      return () => clearInterval(analysisInterval);
    }
  }, [autopilot, isSimulating, performAnalysis]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
            <BrainCircuit className="h-5 w-5 text-primary" />
            <Label htmlFor="autopilot-switch" className="text-sm font-bold text-foreground">
            Piloto Automático
            </Label>
        </div>
        <Switch
          id="autopilot-switch"
          checked={autopilot}
          onCheckedChange={handleToggleAutopilot}
          aria-label="Toggle Autopilot"
        />
      </div>

      {autopilot && (
        <div className="text-xs text-center text-muted-foreground italic">
          O agente analisará a telemetria a cada 10s e ajustará o reator.
        </div>
      )}

      <Button onClick={performAnalysis} disabled={isThinking || telemetryHistory.length === 0} className="w-full gap-2">
        {isThinking ? (
            <>
                <Sparkles className="h-4 w-4 animate-spin" />
                Analisando Telemetria...
            </>
        ) : (
            <>
                <Sparkles className="h-4 w-4" />
                Forçar Análise do Agente
            </>
        )}
      </Button>

      {analysis && (
        <div className="space-y-3 rounded-lg border border-primary/20 bg-slate-900/50 p-3 text-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <BotMessageSquare className="h-5 w-5 text-primary flex-shrink-0" />
            <p className="font-bold text-primary">Análise do Agente</p>
          </div>
          <p className="text-muted-foreground">
            <span className="font-bold">Decisão:</span> {analysis.reasoning}
          </p>
          {analysis.decision === 'adjust_parameters' && (
            <div className="flex items-center gap-2 text-primary/80">
                <Activity className="h-4 w-4" />
                Ajustando para{' '}
                <Badge variant="outline" className="text-xs">T: {analysis.parameters.temperature}°C</Badge>
                <Badge variant="outline" className="text-xs">C: {analysis.parameters.confinement}</Badge>
                {analysis.parameters.reactionMode && <Badge variant="outline">{analysis.parameters.reactionMode}</Badge>}
            </div>
          )}
          {analysis.decision === 'restart_simulation' && (
             <div className="flex items-center gap-2 text-amber-400/80">
                <ArrowRight className="h-4 w-4" />
                <p>O agente recomendou reiniciar a simulação.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
