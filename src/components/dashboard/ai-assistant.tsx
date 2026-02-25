"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowDown, ArrowUp, Bot, Loader2, Minus, Zap, Shuffle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
  onReactionModeChange 
}: AIAssistantProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<PlasmaOptimizationSuggestionOutput | null>(null);
  const [isAutoPilotOn, setIsAutoPilotOn] = useState(false);
  const { toast } = useToast();

  const stableProps = useRef({ 
    telemetryHistory, 
    settings, 
    onTemperatureChange, 
    onConfinementChange, 
    onReactionModeChange,
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
      toast, 
      setIsLoading, 
      setSuggestion, 
      setIsAutoPilotOn 
    };
  }, [telemetryHistory, settings, onTemperatureChange, onConfinementChange, onReactionModeChange, toast]);

  useEffect(() => {
    if (!isAutoPilotOn) return;

    const runAutoPilotCycle = async () => {
      const { 
        telemetryHistory: currentHistory, 
        settings: currentSettings, 
        onTemperatureChange: currentOnTempChange, 
        onConfinementChange: currentOnConfChange,
        onReactionModeChange: currentOnModeChange,
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

        // Se a IA decidir trocar o combustível
        if (result.recommendedReactionMode !== currentSettings.reactionMode) {
          currentToast({
            title: "Troca de Combustível",
            description: `IA alternando para modo ${result.recommendedReactionMode}: ${result.reactionModeReason}`,
          });
          currentOnModeChange(result.recommendedReactionMode);
          // Reinicia o ciclo após a troca
          return;
        }

        const tempAdjustment = 5;
        const confinementAdjustment = 0.05;

        let newTemp = currentSettings.temperature;
        if (result.temperatureRecommendation === 'increase') newTemp += tempAdjustment;
        else if (result.temperatureRecommendation === 'decrease') newTemp -= tempAdjustment;

        let newConfinement = currentSettings.confinement;
        if (result.confinementRecommendation === 'increase') newConfinement += confinementAdjustment;
        else if (result.confinementRecommendation === 'decrease') newConfinement -= confinementAdjustment;

        const finalTemp = Math.max(0, Math.min(200, newTemp));
        const finalConfinement = parseFloat(Math.max(0, Math.min(1, newConfinement)).toFixed(2));

        currentOnTempChange(finalTemp);
        currentOnConfChange(finalConfinement);
      } catch (error) {
        currentToast({
          variant: "destructive",
          title: "Erro no Piloto Automático",
          description: "Perda de conexão com a IA.",
        });
        currentSetIsAutoPilotOn(false);
      } finally {
        currentSetIsLoading(false);
      }
    };

    runAutoPilotCycle();
    const intervalId = setInterval(runAutoPilotCycle, 10000); // Aumentado para 10s para estabilidade
    return () => clearInterval(intervalId);
  }, [isAutoPilotOn]);


  const handleGetSuggestion = async () => {
    setIsLoading(true);
    try {
      if (telemetryHistory.length < 3) {
        toast({
            title: "Dados Insuficientes",
            description: "Aguarde o reator estabilizar para análise.",
        });
        setIsLoading(false);
        return;
      }
      const result = await getAIConfigurationSuggestion({
        history: telemetryHistory,
        reactionMode: settings.reactionMode,
      });
      setSuggestion(result);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro no Assistente",
        description: "Não foi possível obter a sugestão.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-3">
        <div className="space-y-0.5">
          <Label htmlFor="autopilot-switch" className="text-xs font-bold flex items-center gap-2 text-primary">
            <Zap className="h-3 w-3 fill-primary" />
            PILOTO AUTOMÁTICO
          </Label>
          <p className="text-[10px] text-muted-foreground italic">IA controla Temperatura, Confinamento e Ciclo.</p>
        </div>
        <Switch
          id="autopilot-switch"
          checked={isAutoPilotOn}
          onCheckedChange={setIsAutoPilotOn}
          disabled={isLoading && !isAutoPilotOn}
        />
      </div>

      <Button onClick={handleGetSuggestion} disabled={isLoading || isAutoPilotOn} variant="secondary" className="w-full h-9 text-xs">
        {isLoading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Bot className="mr-2 h-3 w-3" />}
        Análise Estratégica
      </Button>

      {suggestion && (
        <div className="rounded-lg border bg-card p-3 space-y-3 shadow-inner">
          <div className="flex items-center justify-between border-b pb-2">
            <span className="text-[10px] font-bold uppercase text-muted-foreground">Sistema de Decisão IA</span>
            <Badge variant="outline" className="text-[8px] h-4 uppercase">
              Modo Atual: {settings.reactionMode}
            </Badge>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <div className="mt-0.5">{recommendationIcons[suggestion.temperatureRecommendation]}</div>
              <div className="space-y-0.5 text-[11px]">
                <p className="font-bold text-orange-400 uppercase">Temperatura</p>
                <p className="text-muted-foreground leading-tight">{suggestion.temperatureReason}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <div className="mt-0.5">{recommendationIcons[suggestion.confinementRecommendation]}</div>
              <div className="space-y-0.5 text-[11px]">
                <p className="font-bold text-blue-400 uppercase">Confinamento</p>
                <p className="text-muted-foreground leading-tight">{suggestion.confinementReason}</p>
              </div>
            </div>

            <div className="flex items-start gap-2 border-t pt-2">
              <div className="mt-0.5 text-purple-400"><Shuffle className="h-3 w-3" /></div>
              <div className="space-y-0.5 text-[11px]">
                <p className="font-bold text-purple-400 uppercase">Ciclo de Combustível</p>
                <p className="text-muted-foreground leading-tight">
                  Recomendado: <span className="font-bold text-foreground">{suggestion.recommendedReactionMode}</span>
                </p>
                <p className="text-[10px] italic leading-tight text-muted-foreground/80">{suggestion.reactionModeReason}</p>
              </div>
            </div>
          </div>
          
          <div className="pt-2 border-t">
            <p className="text-[11px] font-semibold text-foreground leading-relaxed italic">
              "{suggestion.overallInsight}"
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
