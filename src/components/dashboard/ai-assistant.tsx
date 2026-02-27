
"use client";

import type { TelemetrySnapshot, ReactionMode, SimulationRun } from "@/lib/simulation-types";
import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Bot, Lightbulb, Zap, Thermometer, Gauge, Sparkles, BrainCircuit } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

interface AIAssistantProps {
  telemetryHistory: TelemetrySnapshot[];
  settings: { temperature: number; confinement: number; reactionMode: ReactionMode };
  currentReward: number;
  onTemperatureChange: (temp: number) => void;
  onConfinementChange: (confinement: number) => void;
  onReactionModeChange: (mode: ReactionMode) => void;
  onReset: () => void;
  onStartIgnition: () => void;
  isSimulating: boolean;
  topRuns?: SimulationRun[];
}

const AUTOPILOT_INTERVAL = 2000; // AI makes decisions every 2 seconds

export function AIAssistant({
  telemetryHistory,
  settings,
  onTemperatureChange,
  onConfinementChange,
  isSimulating,
  onStartIgnition,
  topRuns,
}: AIAssistantProps) {
  const [autopilot, setAutopilot] = useState(false);
  const [aiAction, setAiAction] = useState<string>("Aguardando dados.");
  const autopilotIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const learnedInsights = useMemo(() => {
    if (!topRuns || topRuns.length < 3) {
        return null;
    }

    // Filter for runs that have the required data to prevent NaN issues
    const validRuns = topRuns.filter(run => 
        typeof run.initialTemperature === 'number' && 
        typeof run.initialConfinement === 'number'
    );

    if (validRuns.length < 3) return null;

    const top3ValidRuns = validRuns.slice(0, 3);
    const avgTemp = top3ValidRuns.reduce((acc, run) => acc + run.initialTemperature, 0) / top3ValidRuns.length;
    const avgConfinement = top3ValidRuns.reduce((acc, run) => acc + run.initialConfinement, 0) / top3ValidRuns.length;

    return {
        temperature: avgTemp,
        confinement: avgConfinement,
    }
  }, [topRuns]);

  useEffect(() => {
    if (autopilot && isSimulating) {
      autopilotIntervalRef.current = setInterval(() => {
        const lastSnapshot = telemetryHistory[telemetryHistory.length - 1];
        if (!lastSnapshot) {
          setAiAction("Dados de telemetria insuficientes.");
          return;
        }

        const { qFactor, fusionRate, magneticSafetyFactorQ, relativeTemperature } = lastSnapshot;
        let actionDescription = "";

        // Rule-based decision making, now with learned insights!
        if (learnedInsights && qFactor < 0.8) {
            const targetTemp = learnedInsights.temperature;
            onTemperatureChange(targetTemp);
            actionDescription = `Q-factor baixo. Ajustando para temperatura ótima aprendida (${targetTemp.toFixed(0)}%).`;
        } else if (qFactor < 0.5 && relativeTemperature < 90) {
          const newTemp = Math.min(settings.temperature + 5, 100);
          onTemperatureChange(newTemp);
          actionDescription = `Q-factor baixo (${qFactor.toFixed(2)}). Aumentando temperatura para ${newTemp}.`;
        } else if (qFactor > 1.5 && fusionRate > 10) {
            const newConfinement = Math.min(settings.confinement + 0.05, 1.0);
            onConfinementChange(newConfinement);
            actionDescription = `Reação estável. Otimizando confinamento para ${newConfinement.toFixed(2)}.`;
        } else if (magneticSafetyFactorQ < 1.5) {
            const newConfinement = Math.max(settings.confinement - 0.1, 0.1);
            onConfinementChange(newConfinement);
            actionDescription = `Instabilidade magnética (q=${magneticSafetyFactorQ.toFixed(2)}). Reduzindo confinamento.`;
        } else if (relativeTemperature > 95) {
            const newTemp = Math.max(settings.temperature - 5, 70);
            onTemperatureChange(newTemp);
            actionDescription = "Temperatura crítica. Reduzindo para evitar danos.";
        } else {
          actionDescription = "Monitorando. Reator em estado nominal.";
        }
        
        setAiAction(actionDescription);

      }, AUTOPILOT_INTERVAL);
    } else {
      if (autopilotIntervalRef.current) {
        clearInterval(autopilotIntervalRef.current);
      }
    }

    return () => {
      if (autopilotIntervalRef.current) {
        clearInterval(autopilotIntervalRef.current);
      }
    };
  }, [autopilot, isSimulating, telemetryHistory, onTemperatureChange, onConfinementChange, settings, learnedInsights]);

  const handleToggleAutopilot = () => {
      if (!autopilot && !isSimulating) {
          onStartIgnition();
      }
      setAutopilot(prev => !prev);
      setAiAction(autopilot ? "Piloto automático desativado." : "Piloto automático ativado. Assumindo controle...")
  };

  return (
    <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between">
            <div className="flex flex-col">
                <h3 className="font-bold flex items-center gap-2"><Bot className="h-5 w-5" /> Status do Agente</h3>
                <p className="text-xs text-muted-foreground italic mt-1">{aiAction}</p>
            </div>
            <Badge variant={autopilot ? 'default' : 'outline'} className={`transition-all ${autopilot ? 'bg-green-500/20 text-green-400' : ''}`}>
                {autopilot ? "ATIVO" : "INATIVO"}
            </Badge>
        </div>

      <Button onClick={handleToggleAutopilot}>
        <Sparkles className="h-4 w-4 mr-2" />
        {autopilot ? "Desativar Piloto Automático" : "Ativar Piloto Automático"}
      </Button>

        {learnedInsights && (
            <div className="p-3 bg-sky-950/70 rounded-lg border border-sky-400/30">
                <h4 className="font-bold text-sm flex items-center gap-2 text-sky-300"><BrainCircuit className="h-5 w-5"/>Insight Aprendido</h4>
                <p className="text-xs text-muted-foreground mt-1">
                    Com base nas melhores simulações, uma temperatura inicial em torno de <span className="font-bold text-sky-400">{learnedInsights.temperature.toFixed(0)}%</span> e um confinamento de <span className="font-bold text-sky-400">{learnedInsights.confinement.toFixed(2)}</span> parecem ser ideais.
                </p>
            </div>
        )}
    </div>
  );
}
