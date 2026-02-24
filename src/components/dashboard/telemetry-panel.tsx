"use client";

import { BarChart, Atom, Zap, Gauge, Target } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface TelemetryPanelProps {
  telemetry: {
    totalEnergyGenerated: number;
    particleCount: number;
    fusionRate: number;
    relativeTemperature: number;
    fusionEfficiency: number;
  };
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


export function TelemetryPanel({ telemetry }: TelemetryPanelProps) {
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
      </CardContent>
    </Card>
  );
}
