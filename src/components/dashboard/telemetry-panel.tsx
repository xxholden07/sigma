
"use client";

import { BarChart, Atom, Zap, Gauge, Target, Download, Activity } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

interface TelemetrySnapshot {
  simulationDurationSeconds: number;
  relativeTemperature: number;
  confinement: number;
  fusionRate: number;
  totalEnergyGenerated: number;
  numParticles: number;
  averageKineticEnergy?: number;
}

interface TelemetryPanelProps {
  telemetry: {
    totalEnergyGenerated: number;
    particleCount: number;
    fusionRate: number;
    relativeTemperature: number;
    fusionEfficiency: number;
    averageKineticEnergy: number;
  };
  telemetryHistory: TelemetrySnapshot[];
}

const TelemetryItem = ({ icon, label, value, unit, colorClass }: { icon: React.ReactNode, label: string, value: string | number, unit?: string, colorClass?: string }) => (
    <div className="flex items-center justify-between py-1 border-b border-muted last:border-0">
        <div className="flex items-center gap-2">
            <div className={colorClass}>{icon}</div>
            <span className="text-[11px] text-muted-foreground">{label}</span>
        </div>
        <div className="text-xs font-mono font-bold text-right">
            {value} <span className="text-[10px] font-normal text-muted-foreground">{unit}</span>
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

  return (
    <div className="space-y-4">
      <div className="grid gap-1">
        <TelemetryItem 
            icon={<Gauge className="h-3 w-3" />}
            label="Temp. Atual"
            value={telemetry.relativeTemperature}
            unit="°Rel"
            colorClass="text-orange-500"
        />
        <TelemetryItem 
            icon={<Zap className="h-3 w-3" />}
            label="Energia Acumulada"
            value={telemetry.totalEnergyGenerated.toFixed(1)}
            unit="MeV"
            colorClass="text-yellow-500"
        />
        <TelemetryItem 
            icon={<Atom className="h-3 w-3" />}
            label="Contagem Plasma"
            value={telemetry.particleCount}
            colorClass="text-purple-500"
        />
        <TelemetryItem 
            icon={<Activity className="h-3 w-3" />}
            label="Taxa de Fusão"
            value={telemetry.fusionRate}
            unit="f/s"
            colorClass="text-primary"
        />
        <TelemetryItem
            icon={<BarChart className="h-3 w-3" />}
            label="Energia Cinética Méd."
            value={telemetry.averageKineticEnergy.toFixed(2)}
            unit="MeV"
            colorClass="text-blue-500"
        />
      </div>

      <div className="space-y-2 rounded-lg bg-primary/5 p-3 border border-primary/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-3 w-3 text-green-500" />
            <span className="text-[11px] font-semibold text-muted-foreground uppercase">Eficiência de Fusão</span>
          </div>
          <span className="text-xs font-mono font-bold">{telemetry.fusionEfficiency.toFixed(0)}%</span>
        </div>
        <Progress value={telemetry.fusionEfficiency} className="h-1.5" />
      </div>

      <Button variant="ghost" size="sm" onClick={handleExportData} className="w-full h-8 text-[10px] text-muted-foreground hover:text-foreground">
        <Download className="mr-2 h-3 w-3" /> Exportar Dados da Sessão
      </Button>
    </div>
  );
}
