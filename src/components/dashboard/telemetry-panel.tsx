"use client";

import { BarChart, Atom, Zap, Gauge, Target, Download } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button"; // Importar o componente Button

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
    averageKineticEnergy: number; // Adicionado aqui para exibição no painel
  };
  telemetryHistory: TelemetrySnapshot[]; // Adicionado prop para o histórico
}

const TelemetryItem = ({ icon, label, value, unit }: { icon: React.ReactNode, label: string, value: string | number, unit?: string }) => (
    <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
            <div className="text-muted-foreground">{icon}</div>
            <span className="text-sm text-muted-foreground">{label}</span>
        </div>
        <div className="font-semibold text-right">
            {value} <span className="text-xs text-muted-foreground">{unit}</span>
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
        a.download = `simulacao_fusao_telemetria_${new Date().toISOString()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="space-y-1.5">
          <CardTitle className="text-lg font-headline">Telemetry</CardTitle>
          <CardDescription>Live reactor data.</CardDescription>
        </div>
        <BarChart className="h-6 w-6 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-4">
        <TelemetryItem 
            icon={<Gauge className="h-4 w-4" />}
            label="Temperature"
            value={telemetry.relativeTemperature}
            unit="°"
        />
        <TelemetryItem 
            icon={<Zap className="h-4 w-4" />}
            label="Total Energy"
            value={telemetry.totalEnergyGenerated.toFixed(1)}
            unit="MeV"
        />
        <TelemetryItem 
            icon={<Atom className="h-4 w-4" />}
            label="Particle Count"
            value={telemetry.particleCount}
        />
        <TelemetryItem 
            icon={<Zap className="h-4 w-4 text-primary" />}
            label="Fusion Rate"
            value={telemetry.fusionRate}
            unit="f/s"
        />
        <TelemetryItem
            icon={<BarChart className="h-4 w-4" />}
            label="Avg Kinetic Energy"
            value={telemetry.averageKineticEnergy.toFixed(2)}
            unit="unit"
        />
        <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="text-muted-foreground">
                        <Target className="h-4 w-4 text-green-500" />
                    </div>
                    <span className="text-sm text-muted-foreground">Fusion Efficiency</span>
                </div>
                <div className="font-semibold text-right">
                    {telemetry.fusionEfficiency.toFixed(0)}%
                </div>
            </div>
            <Progress value={telemetry.fusionEfficiency} className="h-2" />
        </div>
        <Button onClick={handleExportData} className="w-full mt-4">
            <Download className="mr-2 h-4 w-4" /> Exportar Dados
        </Button>
      </CardContent>
    </Card>
  );
}
