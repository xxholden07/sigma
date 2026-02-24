"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowDown, ArrowUp, Bot, Loader2, Minus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getAIConfigurationSuggestion } from "@/lib/actions";
import type { PlasmaOptimizationSuggestionOutput } from "@/ai/flows/plasma-optimization-suggestion";

interface TelemetrySnapshot {
  simulationDurationSeconds: number;
  relativeTemperature: number;
  confinement: number;
  fusionRate: number;
  totalEnergyGenerated: number;
  numParticles: number;
}

interface AIAssistantProps {
  telemetryHistory: TelemetrySnapshot[];
  settings: {
    temperature: number;
    confinement: number;
  };
  onTemperatureChange: (value: number) => void;
  onConfinementChange: (value: number) => void;
}

const recommendationIcons = {
  increase: <ArrowUp className="h-5 w-5 text-green-400" />,
  decrease: <ArrowDown className="h-5 w-5 text-orange-400" />,
  maintain: <Minus className="h-5 w-5 text-gray-400" />,
};

export function AIAssistant({ telemetryHistory, settings, onTemperatureChange, onConfinementChange }: AIAssistantProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<PlasmaOptimizationSuggestionOutput | null>(null);
  const [isAutoPilotOn, setIsAutoPilotOn] = useState(false);
  const { toast } = useToast();

  const stableProps = useRef({ telemetryHistory, settings, onTemperatureChange, onConfinementChange, toast, setIsLoading, setSuggestion, setIsAutoPilotOn });
  useEffect(() => {
    stableProps.current = { telemetryHistory, settings, onTemperatureChange, onConfinementChange, toast, setIsLoading, setSuggestion, setIsAutoPilotOn };
  });

  useEffect(() => {
    if (!isAutoPilotOn) {
      return;
    }

    const runAutoPilotCycle = async () => {
      const { 
        telemetryHistory: currentHistory, 
        settings: currentSettings, 
        onTemperatureChange: currentOnTempChange, 
        onConfinementChange: currentOnConfChange,
        toast: currentToast,
        setIsLoading: currentSetIsLoading,
        setSuggestion: currentSetSuggestion,
        setIsAutoPilotOn: currentSetIsAutoPilotOn
      } = stableProps.current;

      if (currentHistory.length < 5) {
        return;
      }

      currentSetIsLoading(true);
      try {
        const result = await getAIConfigurationSuggestion({
          history: currentHistory,
        });
        currentSetSuggestion(result);

        const tempAdjustment = 10;
        const confinementAdjustment = 0.1;

        let newTemp = currentSettings.temperature;
        if (result.temperatureRecommendation === 'increase') {
          newTemp += tempAdjustment;
        } else if (result.temperatureRecommendation === 'decrease') {
          newTemp -= tempAdjustment;
        }

        let newConfinement = currentSettings.confinement;
        if (result.confinementRecommendation === 'increase') {
          newConfinement += confinementAdjustment;
        } else if (result.confinementRecommendation === 'decrease') {
          newConfinement -= confinementAdjustment;
        }

        const finalTemp = Math.max(0, Math.min(200, newTemp));
        const finalConfinement = parseFloat(Math.max(0, Math.min(1, newConfinement)).toFixed(2));

        currentOnTempChange(finalTemp);
        currentOnConfChange(finalConfinement);

        currentToast({
          title: "Piloto Automático Ajustado",
          description: `Temp: ${finalTemp}, Confinamento: ${finalConfinement}.`,
        });
      } catch (error) {
        currentToast({
          variant: "destructive",
          title: "Erro no Piloto Automático",
          description: "Não foi possível obter a sugestão. Desativando.",
        });
        currentSetIsAutoPilotOn(false);
      } finally {
        currentSetIsLoading(false);
      }
    };

    runAutoPilotCycle();
    const intervalId = setInterval(runAutoPilotCycle, 5000);

    return () => clearInterval(intervalId);
  }, [isAutoPilotOn]);


  const handleGetSuggestion = async () => {
    setIsLoading(true);
    setSuggestion(null);
    try {
      if (telemetryHistory.length === 0) {
        toast({
            variant: "default",
            title: "Not enough data",
            description: "Let the simulation run for a few seconds before getting a suggestion.",
        });
        setIsLoading(false);
        return;
      }
      const result = await getAIConfigurationSuggestion({
        history: telemetryHistory,
      });
      setSuggestion(result);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "AI Assistant Error",
        description: "Could not retrieve optimization suggestions. Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderRecommendation = (
    title: string,
    recommendation: "increase" | "decrease" | "maintain" | undefined,
    reason: string | undefined
  ) => (
    <div className="flex items-start space-x-4 rounded-lg bg-background p-3">
      <div className="flex-shrink-0">{recommendation && recommendationIcons[recommendation]}</div>
      <div className="flex-1 space-y-1">
        <p className="font-semibold text-sm capitalize">{title}</p>
        <p className="text-sm text-muted-foreground">{reason || "No specific reason provided."}</p>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="space-y-1.5">
          <CardTitle className="text-lg font-headline">AI Assistant</CardTitle>
          <CardDescription>Otimização manual ou automática.</CardDescription>
        </div>
        <Bot className="h-6 w-6 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2 rounded-lg border p-3">
          <div className="flex-1 space-y-1">
            <Label htmlFor="autopilot-switch" className="font-semibold">
              Piloto Automático
            </Label>
            <p className="text-xs text-muted-foreground">
              Deixe a IA ajustar os parâmetros para atingir a fusão.
            </p>
          </div>
          <Switch
            id="autopilot-switch"
            checked={isAutoPilotOn}
            onCheckedChange={setIsAutoPilotOn}
            disabled={isLoading && !isAutoPilotOn}
          />
        </div>
        <Button onClick={handleGetSuggestion} disabled={isLoading || isAutoPilotOn} className="w-full">
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
          {isLoading ? "Analisando..." : "Obter Sugestão"}
        </Button>
        {suggestion && (
          <Card className="bg-secondary">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Relatório de Otimização</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="space-y-2">
                {renderRecommendation("Temperatura", suggestion.temperatureRecommendation, suggestion.temperatureReason)}
                {renderRecommendation("Confinamento", suggestion.confinementRecommendation, suggestion.confinementReason)}
              </div>
              <div>
                <h4 className="font-semibold mb-2">Análise Geral:</h4>
                <p className="text-muted-foreground">{suggestion.overallInsight}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}
