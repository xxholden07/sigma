"use client";

import { SlidersHorizontal, Thermometer, Magnet, RotateCcw, Flame, Atom } from "lucide-react"; // Adicionado Flame e Atom
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

interface ControlPanelProps {
  settings: {
    temperature: number;
    confinement: number;
    energyThreshold: number; // Novo controle
    initialParticleCount: number; // Novo controle
  };
  onTemperatureChange: (value: number) => void;
  onConfinementChange: (value: number) => void;
  onEnergyThresholdChange: (value: number) => void; // Novo handler
  onInitialParticleCountChange: (value: number) => void; // Novo handler
  onReset: () => void;
}

export function ControlPanel({
  settings,
  onTemperatureChange,
  onConfinementChange,
  onEnergyThresholdChange, // Novo handler
  onInitialParticleCountChange, // Novo handler
  onReset,
}: ControlPanelProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="space-y-1.5">
          <CardTitle className="text-lg font-headline">Controls</CardTitle>
          <CardDescription>Adjust reactor parameters.</CardDescription>
        </div>
        <SlidersHorizontal className="h-6 w-6 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-2">
          <Label htmlFor="temperature" className="flex items-center gap-2">
            <Thermometer className="h-4 w-4" />
            Relative Temperature
          </Label>
          <div className="flex items-center gap-4">
            <Slider
              id="temperature"
              min={0}
              max={200}
              step={1}
              value={[settings.temperature]}
              onValueChange={(value) => onTemperatureChange(value[0])}
            />
            <span className="text-sm font-semibold w-12 text-right">{settings.temperature}</span>
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="confinement" className="flex items-center gap-2">
            <Magnet className="h-4 w-4" />
            Confinement Strength
          </Label>
          <div className="flex items-center gap-4">
            <Slider
              id="confinement"
              min={0}
              max={1}
              step={0.05}
              value={[settings.confinement]}
              onValueChange={(value) => onConfinementChange(value[0])}
            />
            <span className="text-sm font-semibold w-12 text-right">{settings.confinement.toFixed(2)}</span>
          </div>
        </div>

        {/* Novo Controle: Energy Threshold */}
        <div className="grid gap-2">
          <Label htmlFor="energy-threshold" className="flex items-center gap-2">
            <Flame className="h-4 w-4" />
            Energy Threshold
          </Label>
          <div className="flex items-center gap-4">
            <Slider
              id="energy-threshold"
              min={5}
              max={25}
              step={0.5}
              value={[settings.energyThreshold]}
              onValueChange={(value) => onEnergyThresholdChange(value[0])}
            />
            <span className="text-sm font-semibold w-12 text-right">{settings.energyThreshold.toFixed(1)}</span>
          </div>
        </div>

        {/* Novo Controle: Initial Particle Count */}
        <div className="grid gap-2">
          <Label htmlFor="initial-particle-count" className="flex items-center gap-2">
            <Atom className="h-4 w-4" />
            Initial Particle Count
          </Label>
          <div className="flex items-center gap-4">
            <Slider
              id="initial-particle-count"
              min={10}
              max={200}
              step={10}
              value={[settings.initialParticleCount]}
              onValueChange={(value) => onInitialParticleCountChange(value[0])}
            />
            <span className="text-sm font-semibold w-12 text-right">{settings.initialParticleCount}</span>
          </div>
        </div>

        <Button variant="outline" onClick={onReset} className="w-full">
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset Simulation
        </Button>
      </CardContent>
    </Card>
  );
}
