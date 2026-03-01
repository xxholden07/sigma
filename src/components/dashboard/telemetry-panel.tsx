
"use client";

import { Gauge, Zap, Activity, TrendingDown, Star, Download, Shield, Target, Waves } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";
import type { TelemetrySnapshot } from "@/lib/simulation-types";

interface TelemetryPanelProps {
  telemetry: {
    totalEnergyGenerated: number;
    particleCount: number;
    fusionRate: number;
    relativeTemperature: number;
    fusionEfficiency: number;
    averageKineticEnergy: number;
    qFactor: number;
    lyapunovExponent: number;
    magneticSafetyFactorQ: number;
    wallIntegrity: number;
    aiReward: number;
    fractalDimensionD: number;
  };
  telemetryHistory: TelemetrySnapshot[];
}

const Sparkline = ({ data, dataKey, color }: { data: any[], dataKey: string, color: string }) => (
  <div className="h-6 w-16">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <YAxis hide domain={['auto', 'auto']} />
        <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  </div>
);

const TelemetryItem = ({ 
  icon, 
  label, 
  value, 
  unit, 
  colorClass, 
  status,
  history,
  historyKey
}: { 
  icon: React.ReactNode, 
  label: string, 
  value: string | number, 
  unit?: string, 
  colorClass?: string,
  status?: 'ok' | 'danger' | 'warning',
  history?: any[],
  historyKey?: string
}) => (
    <div className="flex flex-col py-2.5 px-2 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors rounded">
        <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
                <div className={`p-1 rounded ${colorClass} bg-current/10`}>{icon}</div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
            </div>
            <div className="flex items-center gap-2">
                {history && historyKey && <Sparkline data={history} dataKey={historyKey} color={status === 'danger' ? '#f87171' : status === 'warning' ? '#fbbf24' : '#60a5fa'} />}
                {status && (
                    <Badge 
                        variant="outline" 
                        className={`text-[8px] h-5 px-1.5 uppercase font-black border-0 ${
                            status === 'ok' ? 'bg-green-500/20 text-green-400' : 
                            status === 'danger' ? 'bg-red-500/20 text-red-400 animate-pulse' : 
                            'bg-amber-500/20 text-amber-400'
                        }`}
                    >
                        {status === 'ok' ? 'OK' : status === 'danger' ? 'PERIGO' : 'ALERTA'}
                    </Badge>
                )}
            </div>
        </div>
        <div className="text-base font-mono font-black flex items-baseline gap-1 pl-7">
            <span className="text-white">{value}</span>
            {unit && <span className="text-[9px] font-normal text-muted-foreground">{unit}</span>}
        </div>
    </div>
);

export function TelemetryPanel({ telemetry, telemetryHistory }: TelemetryPanelProps) {
    const handleExportData = () => {
        const dataStr = JSON.stringify(telemetryHistory, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `telemetria_reator_${new Date().toISOString()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const getTempStatus = (temp: number) => {
        if (temp < 80) return 'danger';
        if (temp > 180) return 'warning';
        return 'ok';
    };

    const getLyapunovStatus = (lambda: number) => {
        if (lambda > 0.5) return 'danger';
        if (lambda > 0) return 'warning';
        return 'ok';
    };

    const getFractalStatus = (d: number) => {
        if (d > 1.25) return 'danger';
        if (d > 1.10) return 'warning';
        return 'ok';
    };

  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-lg bg-slate-900/60 p-3 border border-white/5 shadow-inner">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Shield className={`h-3 w-3 ${telemetry.wallIntegrity < 30 ? 'text-red-500 animate-pulse' : 'text-blue-400'}`} />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Integridade da Blindagem</span>
          </div>
          <span className={`text-xs font-mono font-bold ${telemetry.wallIntegrity < 30 ? 'text-red-500' : 'text-white'}`}>
            {telemetry.wallIntegrity.toFixed(1)}%
          </span>
        </div>
        <Progress 
            value={telemetry.wallIntegrity} 
            className={`h-1.5 bg-slate-800 ${telemetry.wallIntegrity < 30 ? '[&>div]:bg-red-500' : '[&>div]:bg-blue-500'}`} 
        />
        <p className="text-[8px] text-muted-foreground italic uppercase text-right">Ataque de Nêutrons Ativo (Ciclo D-T)</p>
      </div>

      <div className="grid gap-0.5 rounded-lg border border-white/5 bg-slate-900/40 p-2">
        <TelemetryItem 
            icon={<Gauge className="h-3 w-3" />}
            label="Temp. Atual"
            value={telemetry.relativeTemperature}
            unit="°Rel"
            colorClass="text-orange-500"
            status={getTempStatus(telemetry.relativeTemperature)}
        />
        <TelemetryItem 
            icon={<TrendingDown className="h-3 w-3" />}
            label="Expoente Lyapunov (λ)"
            value={telemetry.lyapunovExponent.toFixed(3)}
            colorClass="text-red-400"
            status={getLyapunovStatus(telemetry.lyapunovExponent)}
            history={telemetryHistory}
            historyKey="lyapunovExponent"
        />
        <TelemetryItem 
            icon={<Waves className="h-3 w-3" />}
            label="Dimensão Fractal (D)"
            value={telemetry.fractalDimensionD.toFixed(3)}
            unit="Borda"
            colorClass="text-cyan-400"
            status={getFractalStatus(telemetry.fractalDimensionD)}
            history={telemetryHistory}
            historyKey="fractalDimensionD"
        />
        <TelemetryItem 
            icon={<Star className="h-3 w-3" />}
            label="Segurança Magnética (q)"
            value={telemetry.magneticSafetyFactorQ.toFixed(3)}
            unit="φ=1.618"
            colorClass="text-amber-400"
            history={telemetryHistory}
            historyKey="magneticSafetyFactorQ"
        />
        <TelemetryItem 
            icon={<Activity className="h-3 w-3" />}
            label="Taxa de Fusão"
            value={telemetry.fusionRate}
            unit="f/s"
            colorClass="text-primary"
            history={telemetryHistory}
            historyKey="fusionRate"
        />
        <TelemetryItem
            icon={<Target className="h-3 w-3" />}
            label="Fator Q (Ganho)"
            value={telemetry.qFactor.toFixed(2)}
            colorClass="text-green-500"
            status={telemetry.qFactor >= 1.0 ? 'ok' : 'warning'}
        />
      </div>

      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleExportData} 
        className="w-full h-10 text-[10px] font-bold text-primary hover:text-white hover:bg-primary/20 border-primary/30 hover:border-primary/50 transition-all gap-2 group"
      >
        <Download className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" /> 
        EXPORTAR DATASET JAX/TORAX
      </Button>
    </div>
  );
}
