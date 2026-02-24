"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Bot, Loader2, Minus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
}

const recommendationIcons = {
  increase: <ArrowUp className="h-5 w-5 text-green-400" />,
  decrease: <ArrowDown className="h-5 w-5 text-orange-400" />,
  maintain: <Minus className="h-5 w-5 text-gray-400" />,
};

export function AIAssistant({ telemetryHistory }: AIAssistantProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<PlasmaOptimizationSuggestionOutput | null>(null);
  const { toast } = useToast();

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
          <CardDescription>Get plasma optimization tips.</CardDescription>
        </div>
        <Bot className="h-6 w-6 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={handleGetSuggestion} disabled={isLoading} className="w-full">
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
          {isLoading ? "Analyzing..." : "Get Suggestion"}
        </Button>
        {suggestion && (
          <Card className="bg-secondary">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Optimization Report</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="space-y-2">
                {renderRecommendation("Temperature", suggestion.temperatureRecommendation, suggestion.temperatureReason)}
                {renderRecommendation("Confinement", suggestion.confinementRecommendation, suggestion.confinementReason)}
              </div>
              <div>
                <h4 className="font-semibold mb-2">Overall Insight:</h4>
                <p className="text-muted-foreground">{suggestion.overallInsight}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}
