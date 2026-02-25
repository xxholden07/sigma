"use client";

import { useState, useEffect, useRef } from "react";
import { Bot, Loader2, Zap, Activity, ShieldAlert, FlaskConical, Target, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { getAIConfigurationSuggestion } from "@/lib/actions";
import type { PlasmaOptimizationSuggestionOutput } from "@/ai/flows/plasma-optimization-suggestion";
import type { ReactionMode, SimulationRun } from "@/lib/simulation-types";

interface TelemetrySnapshot {
  simulationDurationSeconds: number;
  relativeTemperature: number;
  confinement: number;
  fusionRate: number;
  totalEnergyGenerated: number;
  numParticles: number;
  qFactor?: number;
}

interface AIAssistantProps {
  telemetryHistory: TelemetrySnapshot[];
  settings: {
    temperature: number;
    confinement: number;
    reactionMode: ReactionMode;
  };
  pastRuns?: SimulationRun[];
  onTemperatureChange: (value: number) => void;
  onConfinementChange: (value: number) => void;
  onReactionModeChange: (mode: ReactionMode) => void;
  onReset: () => void;
}

export function AIAssistant({ 
  telemetryHistory, 
  settings, 
  pastRuns = [],
  onTemperatureChange, 
  onConfinementChange,
  onReactionModeChange,
  onReset
}: AIAssistantProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<PlasmaOptimizationSuggestionOutput | null>(null);
  const [isAutoPilotOn, setIsAutoPilotOn] = useState(false);
  const { toast } = useToast();

  const stabilityMonths = suggestion?.projectedStabilityMonths || 0;
  const stabilityProgress = (stabilityMonths / 12) * 100;

  const handlersRef = useRef({
    onTemperatureChange,
    onConfinementChange,
    onReactionModeChange,
    onReset,
    settings,
    telemetryHistory,
    pastRuns
  });

  useEffect(() => {
    handlersRef.current = {
      onTemperatureChange,
      onConfinementChange,
      onReactionModeChange,
      onReset,
      settings,
      telemetryHistory,
      pastRuns
    };
  }, [onTemperatureChange, onConfinementChange, onReactionModeChange, onReset, settings, telemetryHistory, pastRuns]);
  
  useEffect(() => {
    if (!isAutoPilotOn) return;

    const runAutoPilotCycle = async () => {
      const { 
        telemetryHistory: currentHistory, 
        settings: currentSettings, 
        pastRuns: currentPastRuns,
        onTemperatureChange: currentOnTempChange, 
        onConfinementChange: currentOnConfChange,
        onReactionModeChange: currentOnModeChange,
        onReset: currentOnReset
      } = handlersRef.current;

      // Se não houver telemetria suficiente, aguarda um pouco mais
      if (currentHistory.length < 5) return;

      setIsLoading(true);
      try {
        const result = await getAIConfigurationSuggestion({
          history: currentHistory.slice(-10),
          reactionMode: currentSettings.reactionMode,
          pastRuns: currentPastRuns.slice(0, 5).map(r => ({
            outcome: r.outcome,
            totalEnergyGeneratedMeV: r.totalEnergyGeneratedMeV,
            initialTemperature: r.initialTemperature,
            initialConfinement: r.initialConfinement,
            reactionMode: r.reactionMode,
          }))
        });
        
        setSuggestion(result);

        if (result.shouldReset) {
          toast({
            title: "Prometeu: Reinício Estratégico",
            description: "Condições suboptimais detectadas. Iniciando nova tentativa de ignição...",
            variant: "destructive",
          });
          currentOnReset();
          return;
        }

        if (result.recommendedReactionMode !== currentSettings.reactionMode) {
          toast({
            title: "Prometeu: Alternando Ciclo",
            description: `Transição estratégica para modo ${result.recommendedReactionMode}.`,
          });
          currentOnModeChange(result.recommendedReactionMode);
          return;
        }

        // Ajustes incrementais baseados na recomendação da IA
        const tempStep = 10;
        const confStep = 0.05;

        if (result.temperatureRecommendation === 'increase') {
           currentOnTempChange(Math.min(200, currentSettings.temperature + tempStep));
        } else if (result.temperatureRecommendation === 'decrease') {
           currentOnTempChange(Math.max(0, currentSettings.temperature - tempStep));
        }

        if (result.confinementRecommendation === 'increase') {
           currentOnConfChange(parseFloat(Math.min(1, currentSettings.confinement + confStep).toFixed(2)));
        } else if (result.confinementRecommendation === 'decrease') {
           currentOnConfChange(parseFloat(Math.max(0, currentSettings.confinement - confStep).toFixed(2)));
        }

      } catch (error) {
        console.error("Autopilot error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    // Ciclo mais rápido de 5 segundos para maior autonomia
    const intervalId = setInterval(runAutoPilotCycle, 5000);
    return () => clearInterval(intervalId);
  }, [isAutoPilotOn, toast]);

  const handleGetSuggestion = async () => {
    setIsLoading(true);
    try {
      if (telemetryHistory.length < 3) {
        toast({ title: "Dados Insuficientes", description: "O plasma ainda não estabilizou para análise do Prometeu." });
        setIsLoading(false);
        return;
      }
      const result = await getAIConfigurationSuggestion({
        history: telemetryHistory.slice(-10),
        reactionMode: settings.reactionMode,
        pastRuns: pastRuns.slice(0, 5).map(r => ({
          outcome: r.outcome,
          totalEnergyGeneratedMeV: r.totalEnergyGeneratedMeV,
          initialTemperature: r.initialTemperature,
          initialConfinement: r.initialConfinement,
          reactionMode: r.reactionMode,
        }))
      });
      setSuggestion(result);
    } catch (error) {
      toast({ variant: "destructive", title: "Erro de Comunicação", description: "Falha ao conectar com o sistema Prometeu." });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status?: string) => {
    if (status === 'OPERAÇÃO ESTÁVEL') return 'text-green-400';
    if (status === 'SUBOPTIMAL') return 'text-yellow-400';
    return 'text-destructive';
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-slate-950/60 p-3 space-y-2 border-primary/20">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-primary uppercase tracking-tighter flex items-center gap-1">
            <Target className="h-3 w-3" />
            Viabilidade Comercial
          </span>
          <span className="text-[10px] font-mono font-bold text-white">{stabilityMonths}/12 Meses</span>
        </div>
        <Progress value={stabilityProgress} className="h-1 bg-slate-800" />
        <div className="flex justify-between items-center text-[8px] text-muted-foreground font-mono uppercase">
          <span>Pulso</span>
          <span>Escala</span>
          <span>Planta</span>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 p-3">
        <div className="space-y-0.5">
          <Label htmlFor="autopilot-switch" className="text-xs font-bold flex items-center gap-2 text-primary">
            <Bot className="h-3 w-3" />
            PROMETEU (AUTO)
          </Label>
          <p className="text-[10px] text-muted-foreground italic tracking-tight">Análise em ciclo contínuo.</p>
        </div>
        <Switch
          id="autopilot-switch"
          checked={isAutoPilotOn}
          onCheckedChange={setIsAutoPilotOn}
          disabled={isLoading && !isAutoPilotOn}
        />
      </div>

      {!isAutoPilotOn && (
        <Button onClick={handleGetSuggestion} disabled={isLoading} variant="secondary" className="w-full h-9 text-xs font-bold transition-all">
          {isLoading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <FlaskConical className="mr-2 h-3 w-3" />}
          SOLICITAR RELATÓRIO CIENTÍFICO
        </Button>
      )}

      {isAutoPilotOn && isLoading && (
        <div className="flex items-center justify-center gap-2 p-2 rounded-md bg-primary/5 border border-primary/10 border-dashed">
          <Loader2 className="h-3 w-3 animate-spin text-primary" />
          <span className="text-[10px] font-bold text-primary uppercase animate-pulse">Otimizando Parâmetros...</span>
        </div>
      )}

      {suggestion && (
        <div className="rounded-lg border bg-card p-4 space-y-4 shadow-2xl relative overflow-hidden border-primary/10">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary/40" />
          
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Relatório Científico</span>
              <Badge variant="outline" className="text-[9px] h-4 uppercase border-primary/30">
                Modo {settings.reactionMode}
              </Badge>
            </div>
            <Separator className="bg-primary/10" />
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Status IA:</p>
                <div className="flex items-center gap-1.5">
                   <div className={`h-2 w-2 rounded-full animate-pulse ${suggestion.status === 'OPERAÇÃO ESTÁVEL' ? 'bg-green-400' : 'bg-yellow-400'}`} />
                   <p className={`text-[10px] font-black tracking-tight ${getStatusColor(suggestion.status)}`}>
                    {suggestion.status}
                  </p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Projeção:</p>
                <p className="text-xs font-mono font-bold text-white">{suggestion.projectedStabilityMonths}/12 Meses</p>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase">
                <TrendingUp className="h-3 w-3" />
                Viabilidade & Produto Triplo:
              </div>
              <p className="text-[11px] leading-relaxed text-slate-300 italic bg-slate-900/40 p-2 rounded border border-white/5">
                {suggestion.viabilityAnalysis}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Estabilidade & Disrupção:</p>
              <p className="text-[11px] leading-relaxed text-slate-300">
                {suggestion.stabilityEvaluation}
              </p>
            </div>

            <div className="pt-2 border-t border-primary/10">
              <div className="flex gap-2 items-start">
                {suggestion.shouldReset ? <ShieldAlert className="h-4 w-4 text-destructive shrink-0 mt-0.5" /> : <Activity className="h-4 w-4 text-primary shrink-0 mt-0.5" />}
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Diagnóstico Final:</p>
                  <p className="text-[11px] font-bold text-foreground leading-snug">
                    {suggestion.finalDiagnosis}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
