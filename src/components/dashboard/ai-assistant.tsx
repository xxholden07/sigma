"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowDown, ArrowUp, Bot, Loader2, Minus, Zap, Shuffle, RotateCcw, Activity } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { getAIConfigurationSuggestion } from "@/lib/actions";
import type { PlasmaOptimizationSuggestionOutput } from "@/ai/flows/plasma-optimization-suggestion";
import type { ReactionMode } from "@/lib/simulation-types";

interface TelemetrySnapshot {
  simulationDurationSeconds: number;
  relativeTemperature: number;
  confinement: number;
  fusionRate: number;
  totalEnergyGenerated: number;
  numParticles: number;
  averageKineticEnergy?: number;
  qFactor?: number;
}

interface AIAssistantProps {
  telemetryHistory: TelemetrySnapshot[];
  settings: {
    temperature: number;
    confinement: number;
    reactionMode: ReactionMode;
  };
  onTemperatureChange: (value: number) => void;
  onConfinementChange: (value: number) => void;
  onReactionModeChange: (mode: ReactionMode) => void;
  onReset: () => void;
}

const recommendationIcons = {
  increase: <ArrowUp className="h-3 w-3 text-green-400" />,
  decrease: <ArrowDown className="h-3 w-3 text-orange-400" />,
  maintain: <Minus className="h-3 w-3 text-gray-400" />,
};

export function AIAssistant({ 
  telemetryHistory, 
  settings, 
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

  const stableProps = useRef({ 
    telemetryHistory, 
    settings, 
    onTemperatureChange, 
    onConfinementChange, 
    onReactionModeChange,
    onReset,
    toast, 
    setIsLoading, 
    setSuggestion, 
    setIsAutoPilotOn 
  });
  
  useEffect(() => {
    stableProps.current = { 
      telemetryHistory, 
      settings, 
      onTemperatureChange, 
      onConfinementChange, 
      onReactionModeChange,
      onReset,
      toast, 
      setIsLoading, 
      setSuggestion, 
      setIsAutoPilotOn 
    };
  }, [telemetryHistory, settings, onTemperatureChange, onConfinementChange, onReactionModeChange, onReset, toast]);

  useEffect(() => {
    if (!isAutoPilotOn) return;

    const runAutoPilotCycle = async () => {
      const { 
        telemetryHistory: currentHistory, 
        settings: currentSettings, 
        onTemperatureChange: currentOnTempChange, 
        onConfinementChange: currentOnConfChange,
        onReactionModeChange: currentOnModeChange,
        onReset: currentOnReset,
        toast: currentToast,
        setIsLoading: currentSetIsLoading,
        setSuggestion: currentSetSuggestion,
        setIsAutoPilotOn: currentSetIsAutoPilotOn
      } = stableProps.current;

      if (currentHistory.length < 5) return;

      currentSetIsLoading(true);
      try {
        const result = await getAIConfigurationSuggestion({
          history: currentHistory,
          reactionMode: currentSettings.reactionMode,
        });
        currentSetSuggestion(result);

        if (result.shouldReset) {
          currentToast({
            title: "Interrupção de Pulso",
            description: `A IA detectou colapso iminente: ${result.resetReason}`,
          });
          currentOnReset();
          return;
        }

        if (result.recommendedReactionMode !== currentSettings.reactionMode) {
          currentToast({
            title: "Troca de Combustível",
            description: `Otimizando Produto Triplo para modo ${result.recommendedReactionMode}`,
          });
          currentOnModeChange(result.recommendedReactionMode);
          return;
        }

        const tempAdjustment = 10;
        const confinementAdjustment = 0.08;

        let newTemp = currentSettings.temperature;
        if (result.temperatureRecommendation === 'increase') newTemp += tempAdjustment;
        else if (result.temperatureRecommendation === 'decrease') newTemp -= tempAdjustment;

        let newConfinement = currentSettings.confinement;
        if (result.confinementRecommendation === 'increase') newConfinement += confinementAdjustment;
        else if (result.confinementRecommendation === 'decrease') newConfinement -= confinementAdjustment;

        currentOnTempChange(Math.max(0, Math.min(200, newTemp)));
        currentOnConfChange(parseFloat(Math.max(0, Math.min(1, newConfinement)).toFixed(2)));
      } catch (error) {
        currentSetIsAutoPilotOn(false);
      } finally {
        currentSetIsLoading(false);
      }
    };

    runAutoPilotCycle();
    const intervalId = setInterval(runAutoPilotCycle, 15000);
    return () => clearInterval(intervalId);
  }, [isAutoPilotOn]);

  const handleGetSuggestion = async () => {
    setIsLoading(true);
    try {
      if (telemetryHistory.length < 3) {
        toast({ title: "Dados Insuficientes", description: "Aguarde a ignição para análise escalar." });
        setIsLoading(false);
        return;
      }
      const result = await getAIConfigurationSuggestion({
        history: telemetryHistory,
        reactionMode: settings.reactionMode,
      });
      setSuggestion(result);
    } catch (error) {
      toast({ variant: "destructive", title: "Erro de Análise", description: "Falha ao processar Critério de Lawson." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-slate-900/40 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-primary uppercase tracking-tighter">Projeção de Escala Comercial</span>
          <span className="text-[10px] font-mono font-bold text-white">{stabilityMonths}/12 Meses</span>
        </div>
        <Progress value={stabilityProgress} className="h-1 bg-slate-800" />
        <p className="text-[8px] text-muted-foreground italic text-center leading-tight">
          Viabilidade estimada baseada no Produto Triplo (Densidade x Temp x Tempo).
        </p>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-3">
        <div className="space-y-0.5">
          <Label htmlFor="autopilot-switch" className="text-xs font-bold flex items-center gap-2 text-primary">
            <Zap className="h-3 w-3 fill-primary" />
            SISTEMA EXPERT
          </Label>
          <p className="text-[10px] text-muted-foreground italic">Ajuste autônomo de parâmetros.</p>
        </div>
        <Switch
          id="autopilot-switch"
          checked={isAutoPilotOn}
          onCheckedChange={setIsAutoPilotOn}
          disabled={isLoading && !isAutoPilotOn}
        />
      </div>

      <Button onClick={handleGetSuggestion} disabled={isLoading || isAutoPilotOn} variant="secondary" className="w-full h-9 text-xs">
        {isLoading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Activity className="mr-2 h-3 w-3" />}
        Análise de Viabilidade
      </Button>

      {suggestion && (
        <div className="rounded-lg border bg-card p-3 space-y-3 shadow-inner">
          <div className="flex items-center justify-between border-b pb-2">
            <span className="text-[10px] font-bold uppercase text-muted-foreground">Relatório Científico</span>
            <Badge variant="outline" className="text-[8px] h-4 uppercase">{settings.reactionMode}</Badge>
          </div>
          
          <div className="space-y-3">
            {!suggestion.shouldReset ? (
              <>
                <div className="flex items-start gap-2">
                  <div className="mt-0.5">{recommendationIcons[suggestion.temperatureRecommendation]}</div>
                  <div className="space-y-0.5 text-[11px]">
                    <p className="font-bold text-orange-400 uppercase">Ajuste Térmico</p>
                    <p className="text-muted-foreground leading-tight">{suggestion.temperatureReason}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <div className="mt-0.5">{recommendationIcons[suggestion.confinementRecommendation]}</div>
                  <div className="space-y-0.5 text-[11px]">
                    <p className="font-bold text-blue-400 uppercase">Campo Magnético</p>
                    <p className="text-muted-foreground leading-tight">{suggestion.confinementReason}</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-start gap-2 bg-destructive/10 p-2 rounded border border-destructive/20">
                <RotateCcw className="h-4 w-4 text-destructive mt-0.5" />
                <div className="space-y-0.5 text-[11px]">
                  <p className="font-bold text-destructive uppercase">Interrupção Recomendada</p>
                  <p className="text-muted-foreground leading-tight">{suggestion.resetReason}</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="pt-2 border-t">
            <p className="text-[11px] font-semibold text-foreground leading-relaxed italic">
              "{suggestion.scientificInsight}"
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
