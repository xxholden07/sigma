'use client';

import { useState, useEffect, useCallback } from 'react';
import type { TelemetrySnapshot, SimulationSettings, SimulationRun } from '@/lib/simulation-types';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { BotMessageSquare, Sparkles, BrainCircuit, Activity, ArrowRight, RotateCcw, Pause } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { generateReactorAnalysis } from '@/app/actions';
import type { ReactorAgentAction } from '@/lib/ai-schemas';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AILogEntry {
  timestamp: Date;
  action: ReactorAgentAction;
  applied: boolean;
}

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
  const [actionLog, setActionLog] = useState<AILogEntry[]>([]);
  const [cycleCount, setCycleCount] = useState(0);

  const handleToggleAutopilot = (checked: boolean) => {
    setAutopilot(checked);
    if (checked) {
      setActionLog([]); // Clear log when starting
      setCycleCount(0);
      // Start simulation immediately
      onStartIgnition(true);
      // Run first analysis after a short delay to let simulation start
      setTimeout(() => {
        performAnalysis();
      }, 500);
    }
  };

  const getDecisionIcon = (decision: string) => {
    switch (decision) {
      case 'adjust_parameters': return <Activity className="h-3 w-3 text-blue-400" />;
      case 'restart_simulation': return <RotateCcw className="h-3 w-3 text-amber-400" />;
      case 'no_change': return <Pause className="h-3 w-3 text-green-400" />;
      default: return <Activity className="h-3 w-3" />;
    }
  };

  const getDecisionLabel = (decision: string) => {
    switch (decision) {
      case 'adjust_parameters': return 'AJUSTE';
      case 'restart_simulation': return 'RESET';
      case 'no_change': return 'MANTER';
      default: return decision.toUpperCase();
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
      setCycleCount(prev => prev + 1);

      // Add to action log
      const logEntry: AILogEntry = {
        timestamp: new Date(),
        action,
        applied: autopilot,
      };
      setActionLog(prev => [logEntry, ...prev].slice(0, 20)); // Keep last 20 entries

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
          // Only call onStartIgnition(true) which handles reset internally
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
    if (autopilot) {
      // Run analysis periodically when autopilot is on
      const analysisInterval = setInterval(() => {
        // Only analyze if simulation is running
        if (isSimulating) {
          performAnalysis();
        }
      }, 3000);
      return () => clearInterval(analysisInterval);
    }
  }, [autopilot, isSimulating, performAnalysis]);

  return (
    <div className="space-y-4">
        {/* Autopilot Toggle */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-primary/10 to-cyan-500/5 border border-primary/20">
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <BrainCircuit className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <Label htmlFor="autopilot-switch" className="text-sm font-bold text-white">Piloto Automático</Label>
                  <p className="text-[9px] text-muted-foreground">Agente Prometheus</p>
                </div>
            </div>
            <Switch id="autopilot-switch" checked={autopilot} onCheckedChange={handleToggleAutopilot} />
        </div>

        {/* Stats when active */}
        {autopilot && (
            <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/40 rounded-xl p-3 text-center border border-white/5">
                    <div className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold">Ciclos</div>
                    <div className="text-2xl font-black text-primary tabular-nums">{cycleCount}</div>
                </div>
                <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/40 rounded-xl p-3 text-center border border-white/5">
                    <div className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold">Status</div>
                    <div className="text-2xl font-black">
                        {isThinking ? (
                            <span className="text-amber-400 flex items-center justify-center gap-1">
                                <Sparkles className="h-5 w-5 animate-spin" />
                            </span>
                        ) : (
                            <span className="text-green-400">ATIVO</span>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* Status message or manual button */}
        {autopilot ? (
            <div className={`text-xs text-center p-3 rounded-xl border transition-all ${isThinking ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-green-500/10 border-green-500/20 text-green-400'}`}>
                {isThinking ? (
                    <span className="flex items-center justify-center gap-2 font-medium"><Sparkles className="h-3.5 w-3.5 animate-spin" />Processando telemetria...</span>
                ) : (
                    <span className="flex items-center justify-center gap-2"><Activity className="h-3.5 w-3.5" />IA monitorando (3s)</span>
                )}
            </div>
        ) : (
            <Button onClick={performAnalysis} disabled={isThinking || telemetryHistory.length === 0} className="w-full h-11 gap-2 font-bold">
                {isThinking ? (<><Sparkles className="h-4 w-4 animate-spin" />Analisando...</>) : (<><Sparkles className="h-4 w-4" />Solicitar Análise</>)}
            </Button>
        )}

        {/* Current Analysis */}
        {analysis && (
            <div className="space-y-3 rounded-xl border border-primary/30 bg-gradient-to-br from-slate-900/80 to-primary/5 p-4 text-xs animate-in fade-in shadow-lg">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/20">
                      <BotMessageSquare className="h-4 w-4 text-primary" />
                    </div>
                    <p className="font-bold text-white">Última Decisão</p>
                    <Badge 
                      variant="outline" 
                      className={`ml-auto text-[9px] font-black uppercase px-2 border-0 ${
                        analysis.decision === 'adjust_parameters' ? 'bg-blue-500/20 text-blue-400' :
                        analysis.decision === 'restart_simulation' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-green-500/20 text-green-400'
                      }`}
                    >
                        {getDecisionLabel(analysis.decision)}
                    </Badge>
                </div>
                <p className="text-muted-foreground leading-relaxed text-[11px]">{analysis.reasoning}</p>
                {analysis.decision === 'adjust_parameters' && analysis.parameters && (
                    <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                        <Activity className="h-3.5 w-3.5 text-blue-400" />
                        <span className="text-blue-400 font-medium">Aplicando:</span>
                        <Badge className="bg-blue-500/20 text-blue-300 border-0 text-[10px]">T: {analysis.parameters.temperature}</Badge>
                        <Badge className="bg-cyan-500/20 text-cyan-300 border-0 text-[10px]">C: {analysis.parameters.confinement?.toFixed(2)}</Badge>
                    </div>
                )}
            </div>
        )}

        {/* Action Log */}
        {autopilot && actionLog.length > 0 && (
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                    <Activity className="h-3 w-3" />
                    <span>Histórico de Ações</span>
                    <span className="ml-auto text-primary">{actionLog.length}</span>
                </div>
                <ScrollArea className="h-36 rounded-xl border border-white/10 bg-slate-900/50">
                    <div className="p-2 space-y-1">
                        {actionLog.map((entry, i) => (
                            <div key={i} className={`flex items-center gap-2 text-[10px] py-1.5 px-2 rounded-lg transition-colors ${i === 0 ? 'bg-primary/10' : 'hover:bg-white/5'}`}>
                                <div className="p-1 rounded bg-slate-800">
                                  {getDecisionIcon(entry.action.decision)}
                                </div>
                                <span className="text-muted-foreground font-mono text-[9px]">
                                    {entry.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </span>
                                <span className="flex-1 truncate font-medium">
                                    {entry.action.decision === 'adjust_parameters' && entry.action.parameters ? (
                                        <span className="text-blue-400">
                                            T:{entry.action.parameters.temperature} C:{entry.action.parameters.confinement?.toFixed(2)}
                                        </span>
                                    ) : entry.action.decision === 'restart_simulation' ? (
                                        <span className="text-amber-400">Reiniciando</span>
                                    ) : entry.action.decision === 'no_change' ? (
                                        <span className="text-green-400">Mantendo</span>
                                    ) : (
                                        <span className="text-slate-400">{entry.action.decision}</span>
                                    )}
                                </span>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>
        )}
    </div>
  );
}
