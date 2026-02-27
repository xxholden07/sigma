
"use client";

import { useState, useEffect, useRef } from "react";
import { Bot, Loader2, Zap, Activity, ShieldAlert, Target, TrendingUp, Info, BrainCircuit, Trophy } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { getAIConfigurationSuggestion } from "@/lib/actions";
import type { PlasmaOptimizationSuggestionOutput } from "@/ai/flows/plasma-optimization-suggestion";
import type { ReactionMode, SimulationRun, TelemetrySnapshot } from "@/lib/simulation-types";

interface AIAssistantProps {
  telemetryHistory: TelemetrySnapshot[];
  settings: {
    temperature: number;
    confinement: number;
    reactionMode: ReactionMode;
  };
  currentReward: number;
  pastRuns?: SimulationRun[];
  onTemperatureChange: (value: number) => void;
  onConfinementChange: (value: number) => void;
  onReactionModeChange: (mode: ReactionMode) => void;
  onReset: () => void;
  onStartIgnition: () => void;
  isSimulating: boolean;
}

export function AIAssistant({ 
  telemetryHistory, 
  settings, 
  currentReward,
  pastRuns = [],
  onTemperatureChange, 
  onConfinementChange,
  onReactionModeChange,
  onReset,
  onStartIgnition,
  isSimulating
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
    onStartIgnition,
    settings,
    telemetryHistory,
    pastRuns,
    isSimulating,
    isAutoPilotOn
  });

  useEffect(() => {
    handlersRef.current = {
      onTemperatureChange,
      onConfinementChange,
      onReactionModeChange,
      onReset,
      onStartIgnition,
      settings,
      telemetryHistory,
      pastRuns,
      isSimulating,
      isAutoPilotOn
    };
  }, [onTemperatureChange, onConfinementChange, onReactionModeChange, onReset, onStartIgnition, settings, telemetryHistory, pastRuns, isSimulating, isAutoPilotOn]);
  
  // Ciclo de Inicialização da IA (Step 0)
  useEffect(() => {
    if (isAutoPilotOn && !isSimulating) {
        const timer = setTimeout(() => {
            const { onTemperatureChange, onConfinementChange, onStartIgnition } = handlersRef.current;
            onTemperatureChange(115);
            onConfinementChange(0.32);
            onStartIgnition();
        }, 1500);
        return () => clearTimeout(timer);
    }
  }, [isAutoPilotOn, isSimulating]);

  // Ciclo de Análise e Recompensa (Agent Step)
  useEffect(() => {
    if (!isSimulating) {
      setSuggestion(null);
      return;
    }

    const runAnalysisCycle = async () => {
      const { 
        telemetryHistory: currentHistory, 
        settings: currentSettings, 
        pastRuns: currentPastRuns,
        onTemperatureChange: currentOnTempChange, 
        onConfinementChange: currentOnConfChange,
        onReactionModeChange: currentOnModeChange,
        onReset: currentOnReset,
        isSimulating: currentIsSimulating,
        isAutoPilotOn: currentIsAutoPilotOn
      } = handlersRef.current;

      if (!currentIsSimulating || currentHistory.length < 5) return;

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

        if (currentIsAutoPilotOn) {
          if (result.shouldReset) {
            currentOnReset();
            return;
          }

          if (result.recommendedReactionMode !== currentSettings.reactionMode) {
            currentOnModeChange(result.recommendedReactionMode);
            return;
          }

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
        }

      } catch (error) {
        // Silencioso
      } finally {
        setIsLoading(false);
      }
    };

    const intervalId = setInterval(runAnalysisCycle, 6000); 
    return () => clearInterval(intervalId);
  }, [isSimulating]);

  const getStatusColor = (status?: string) => {
    if (status === 'OPERAÇÃO ESTÁVEL') return 'text-green-400';
    if (status === 'SUBOPTIMAL') return 'text-yellow-400';
    return 'text-destructive';
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-slate-950/80 p-3 space-y-3 border-primary/20 shadow-2xl">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-primary uppercase tracking-tighter flex items-center gap-1">
            <Trophy className="h-3 w-3 text-amber-400" />
            Reward Score (Gym-TORAX)
          </span>
          <span className={`text-xs font-mono font-bold ${currentReward > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {currentReward.toFixed(2)}
          </span>
        </div>
        <Progress 
          value={Math.min(100, Math.max(0, (currentReward + 50)))} 
          className="h-1 bg-slate-800 [&>div]:bg-amber-400" 
        />
        <div className="flex justify-between text-[8px] font-mono text-muted-foreground uppercase">
          <span>Penalidade Caos</span>
          <span>Bônus KAM</span>
        </div>
      </div>

      <div className="rounded-lg border bg-slate-950/60 p-3 space-y-2 border-primary/20">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-primary uppercase tracking-tighter flex items-center gap-1">
            <Target className="h-3 w-3" />
            Viabilidade Comercial
          </span>
          <span className="text-[10px] font-mono font-bold text-white">{stabilityMonths}/12 Meses</span>
        </div>
        <Progress value={stabilityProgress} className="h-1 bg-slate-800" />
        <TooltipProvider>
          <div className="flex justify-between items-center text-[8px] text-muted-foreground font-mono uppercase">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help flex items-center gap-0.5 hover:text-primary transition-colors">
                  Pulso <Info className="h-2 w-2" />
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[150px] text-[10px] bg-slate-900 border-primary/20">
                Fase experimental inicial. Ignição em curtos períodos.
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help flex items-center gap-0.5 hover:text-primary transition-colors">
                  Escala <Info className="h-2 w-2" />
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[150px] text-[10px] bg-slate-900 border-primary/20">
                Protótipo industrial. Teste de durabilidade longo.
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help flex items-center gap-0.5 hover:text-primary transition-colors">
                  Planta <Info className="h-2 w-2" />
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[150px] text-[10px] bg-slate-900 border-primary/20">
                Usina comercial em regime estacionário.
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 p-3 shadow-[0_0_15px_-3px_rgba(59,130,246,0.3)]">
        <div className="space-y-0.5">
          <Label htmlFor="autopilot-switch" className="text-xs font-bold flex items-center gap-2 text-primary">
            <BrainCircuit className="h-3 w-3" />
            PROMETEU (RL POLICY)
          </Label>
          <p className="text-[10px] text-muted-foreground italic tracking-tight uppercase">Deep Reinforcement Learning</p>
        </div>
        <Switch
          id="autopilot-switch"
          checked={isAutoPilotOn}
          onCheckedChange={setIsAutoPilotOn}
        />
      </div>

      {isLoading && (
        <div className="flex items-center justify-center gap-2 p-2 rounded-md bg-primary/5 border border-primary/10 border-dashed">
          <Loader2 className="h-3 w-3 animate-spin text-primary" />
          <span className="text-[10px] font-bold text-primary uppercase animate-pulse tracking-tighter">Otimizando Gradiente de Política...</span>
        </div>
      )}

      {suggestion && (
        <div className="rounded-lg border bg-card p-4 space-y-4 shadow-2xl relative overflow-hidden border-primary/10 animate-in fade-in duration-500">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary/40" />
          
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Relatório JAX/PlasmaPy</span>
              <Badge variant="outline" className="text-[9px] h-4 uppercase border-primary/30">
                KAM Optimized
              </Badge>
            </div>
            <Separator className="bg-primary/10" />
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Reward Status:</p>
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
                Análise de Lawson:
              </div>
              <p className="text-[11px] leading-relaxed text-slate-300 italic bg-slate-900/40 p-2 rounded border border-white/5">
                {suggestion.viabilityAnalysis}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Caos e Entropia:</p>
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
