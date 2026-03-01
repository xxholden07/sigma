'use client';

import { useState, useEffect, useCallback } from 'react';
import type { TelemetrySnapshot, SimulationSettings, SimulationRun } from '@/lib/simulation-types';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { BotMessageSquare, Sparkles, BrainCircuit, Activity, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { generateReactorAnalysis } from '@/app/actions';
import type { ReactorAgentAction } from '@/lib/ai-schemas';

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
      const result = await generateReactorAnalysis({
        telemetryHistory: telemetryHistory.slice(-10),
        settings,
        currentReward,
        topRuns: topRuns ?? [],
      });

      if (result.error || !result.analysis) {
        throw new Error(result.error || 'No analysis returned');
      }

      const action = result.analysis;
      setAnalysis(action);

      if (autopilot && action) {
        // Aplicar ação imediatamente para o piloto automático
        if (action.decision === "adjust_parameters" && action.parameters) {
          const newTemp = action.parameters.temperature ?? settings.temperature;
          const newConf = action.parameters.confinement ?? settings.confinement;
          
          console.log(`[Prometheus] Ajustando: T=${newTemp}, C=${newConf}`);
          onTemperatureChange(newTemp);
          onConfinementChange(newConf);
          
          if (action.parameters.reactionMode && settings.reactionMode !== action.parameters.reactionMode) {
            onReactionModeChange(action.parameters.reactionMode);
          }
        } else if (action.decision === "restart_simulation") {
          console.log(`[Prometheus] Reiniciando simulação`);
          onReset();
          onStartIgnition(true);
        } else {
          console.log(`[Prometheus] Mantendo parâmetros atuais`);
        }
      }
    } catch (error) {
      console.error("Error during AI analysis:", error);
    } finally {
      setIsThinking(false);
    }
  }, [telemetryHistory, settings, currentReward, topRuns, autopilot, onTemperatureChange, onConfinementChange, onReactionModeChange, onReset, onStartIgnition]);

  useEffect(() => {
    if (autopilot && isSimulating) {
      const analysisInterval = setInterval(performAnalysis, 3000);
      return () => clearInterval(analysisInterval);
    }
  }, [autopilot, isSimulating, performAnalysis]);

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <BrainCircuit className="h-5 w-5 text-primary" />
                <Label htmlFor="autopilot-switch" className="text-sm font-bold text-foreground">Piloto Automático</Label>
            </div>
            <Switch id="autopilot-switch" checked={autopilot} onCheckedChange={handleToggleAutopilot} />
        </div>

        {autopilot ? (
            <div className="text-xs text-center text-muted-foreground italic p-2 rounded-md bg-primary/10 border border-primary/20">
                {isThinking ? (
                    <span className="flex items-center justify-center gap-2"><Sparkles className="h-3 w-3 animate-spin" />Analisando telemetria...</span>
                ) : (
                    "IA ativa. Analisando a cada 3s."
                )}
            </div>
        ) : (
            <Button onClick={performAnalysis} disabled={isThinking || telemetryHistory.length === 0} className="w-full gap-2">
                {isThinking ? (<><Sparkles className="h-4 w-4 animate-spin" />Analisando...</>) : (<><Sparkles className="h-4 w-4" />Solicitar Análise</>)}
            </Button>
        )}

        {analysis && (
            <div className="space-y-3 rounded-lg border border-primary/20 bg-slate-900/50 p-3 text-xs animate-in fade-in">
                <div className="flex items-center gap-2">
                    <BotMessageSquare className="h-5 w-5 text-primary flex-shrink-0" />
                    <p className="font-bold text-primary">Análise do Agente</p>
                </div>
                <p className="text-muted-foreground"><span className="font-bold">Decisão:</span> {analysis.reasoning}</p>
                {analysis.decision === 'adjust_parameters' && analysis.parameters && (
                    <div className="flex items-center gap-2 text-primary/80">
                        <Activity className="h-4 w-4" />
                        Ajustando para {' '}
                        <Badge variant="outline">T: {analysis.parameters.temperature}°C</Badge>
                        <Badge variant="outline">C: {analysis.parameters.confinement}</Badge>
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
